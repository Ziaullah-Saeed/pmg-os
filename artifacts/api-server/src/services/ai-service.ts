import OpenAI from "openai";
import { db, aiRunsTable } from "@workspace/db";
import { chargeWallet, isDummyMode, getToolCost } from "./wallet-service";
import { shouldAiAct } from "./ai-mode-service";
import { createNotification } from "./notification-service";
import { getCachedResult, setCachedResult, categorizeAICall } from "./cache-intelligence";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

export async function callAI(params: {
  systemPrompt: string;
  userPrompt: string;
  workflowKey: string;
  tool: string;
  domain: string;
  action: string;
  entityType?: string;
  entityId?: number;
}): Promise<{ result: string; confidence: number; runId: number }> {
  const modeCheck = await shouldAiAct(params.workflowKey, undefined, params.entityType, params.entityId);
  if (!modeCheck.canAct) {
    await createNotification({
      type: "human_required",
      severity: "warning",
      title: "Human Action Required",
      message: `AI blocked for "${params.action}": ${modeCheck.reason}`,
      domain: params.domain,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: "ai_system",
    });
    throw new Error(`AI_BLOCKED: ${modeCheck.reason}`);
  }

  const cacheCategory = categorizeAICall({ workflowKey: params.workflowKey, tool: params.tool, domain: params.domain, action: params.action });
  if (cacheCategory && !isDummyMode()) {
    const cached = await getCachedResult({
      category: cacheCategory,
      domain: params.domain,
      input: { systemPrompt: params.systemPrompt, userPrompt: params.userPrompt, tool: params.tool },
    });

    if (cached.hit) {
      await chargeWallet({
        tool: params.tool,
        domain: params.domain,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        cached: true,
        description: `Cache hit: ${params.tool}`,
      });

      const [run] = await db.insert(aiRunsTable).values({
        runType: params.tool,
        status: "cached",
        prompt: params.userPrompt.slice(0, 2000),
        output: (typeof cached.result === "string" ? cached.result : JSON.stringify(cached.result)).slice(0, 2000),
        model: "cache",
        tokensUsed: 0,
        durationMs: 0,
        confidenceScore: cached.confidence ?? 85,
        domain: params.domain,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: JSON.stringify({ cached: true, cacheId: cached.cacheId, category: cacheCategory }),
      }).returning();

      return {
        result: typeof cached.result === "string" ? cached.result : JSON.stringify(cached.result),
        confidence: cached.confidence ?? 85,
        runId: run.id,
      };
    }
  }

  const { getDummyResponse } = await import("./testing-service");
  const dummyResult = getDummyResponse(params.tool, { prompt: params.userPrompt });

  if (dummyResult === null && !isDummyMode()) {
    const chargeResult = await chargeWallet({
      tool: params.tool,
      domain: params.domain,
      action: params.action,
      workflow: params.workflowKey,
      entityType: params.entityType,
      entityId: params.entityId,
    });

    if (!chargeResult.success) {
      throw new Error("WALLET_INSUFFICIENT: " + ("error" in chargeResult ? chargeResult.error : ""));
    }
  }

  let knowledgeContext = "";
  try {
    const { getSemanticContext } = await import("./embedding-service");
    const contextQuery = `${params.action} ${params.domain} ${params.userPrompt.slice(0, 200)}`;
    knowledgeContext = await getSemanticContext(contextQuery, params.domain, 5);
  } catch {
    try {
      const { getRecentKnowledgeContext } = await import("./knowledge-service");
      knowledgeContext = await getRecentKnowledgeContext(params.domain, 5);
    } catch {}
  }

  const enrichedSystemPrompt = knowledgeContext
    ? `${params.systemPrompt}\n\n--- Institutional Memory (Knowledge Base Context) ---\n${knowledgeContext}\n--- End Knowledge Context ---\nUse the above institutional memory to inform your response when relevant.`
    : params.systemPrompt;

  const startTime = Date.now();
  let result = "";
  let confidence = 0;
  let status = "completed" as string;
  let errorMsg: string | undefined;

  if (dummyResult !== null || isDummyMode()) {
    result = dummyResult ?? `[DUMMY] AI response for ${params.action}`;
    confidence = 85;
    status = "completed";
  } else {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: enrichedSystemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      result = response.choices[0]?.message?.content ?? "";
      confidence = estimateConfidence(result);
    } catch (err: any) {
      status = "failed";
      errorMsg = err.message;
      result = "";
      confidence = 0;
    }
  }

  const durationMs = Date.now() - startTime;

  const [run] = await db.insert(aiRunsTable).values({
    runType: params.tool,
    status,
    prompt: params.userPrompt.slice(0, 2000),
    output: result ? result.slice(0, 2000) : null,
    model: MODEL,
    tokensUsed: result.length,
    durationMs,
    confidenceScore: confidence,
    domain: params.domain,
    entityType: params.entityType,
    entityId: params.entityId,
    error: errorMsg,
  }).returning();

  if (status === "failed") {
    throw new Error(`AI_CALL_FAILED: ${errorMsg}`);
  }

  if (confidence < 50) {
    await createNotification({
      type: "low_confidence",
      severity: "error",
      title: "Low Confidence AI Result — Human Takeover",
      message: `${params.action} returned ${confidence}% confidence — human takeover required`,
      domain: params.domain,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: "ai_system",
      metadata: { runId: run.id, confidence, handoffTier: "LOW" },
    });
  } else if (confidence < 80) {
    await createNotification({
      type: "medium_confidence",
      severity: "warning",
      title: "Medium Confidence AI Result — Review Recommended",
      message: `${params.action} returned ${confidence}% confidence — review recommended`,
      domain: params.domain,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: "ai_system",
      metadata: { runId: run.id, confidence, handoffTier: "MEDIUM" },
    });
  }

  if (cacheCategory && status === "completed" && confidence >= 60) {
    setCachedResult({
      category: cacheCategory,
      domain: params.domain,
      input: { systemPrompt: params.systemPrompt, userPrompt: params.userPrompt, tool: params.tool },
      result,
      confidence,
      originalCost: getToolCost(params.tool),
    }).catch(() => {});
  }

  if (status === "completed" && confidence >= 60) {
    import("./memory-service").then(({ ingestAiOutput }) => {
      ingestAiOutput({
        tool: params.tool,
        domain: params.domain,
        action: params.action,
        prompt: params.userPrompt,
        result,
        confidence,
        runId: run.id,
        entityType: params.entityType,
        entityId: params.entityId,
      }).catch(() => {});
    }).catch(() => {});
  }

  return { result, confidence, runId: run.id };
}

function estimateConfidence(text: string): number {
  if (!text || text.length < 20) return 30;
  const hasStructure = text.includes("\n") || text.includes("•") || text.includes("-");
  const length = text.length;
  let score = 50;
  if (length > 100) score += 10;
  if (length > 300) score += 10;
  if (hasStructure) score += 15;
  if (!text.includes("I'm not sure") && !text.includes("uncertain")) score += 10;
  return Math.min(score, 95);
}

export async function enrichLead(lead: {
  id: number;
  name: string;
  email?: string | null;
  company?: string | null;
  source?: string | null;
}): Promise<{ enrichment: string; confidence: number; runId: number }> {
  const { result, confidence, runId } = await callAI({
    systemPrompt: `You are a B2B cybersecurity/IT services lead enrichment AI for PMG Group LLC. Analyze the lead and provide:
1. Company profile summary (industry, size, likely tech stack)
2. Cybersecurity maturity assessment (Low/Medium/High)
3. Estimated deal potential ($)
4. Key pain points likely for this type of company
5. Recommended engagement approach
Return as structured text with clear sections.`,
    userPrompt: `Enrich this lead:
Name: ${lead.name}
Email: ${lead.email ?? "N/A"}
Company: ${lead.company ?? "N/A"}
Source: ${lead.source ?? "N/A"}`,
    workflowKey: "lead_scoring",
    tool: "ai-enrich-lead",
    domain: "crm",
    action: "enrich_lead",
    entityType: "lead",
    entityId: lead.id,
  });

  return { enrichment: result, confidence, runId };
}

export async function scoreLead(lead: {
  id: number;
  name: string;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  enrichmentData?: string;
}): Promise<{ score: number; tier: string; reasoning: string; confidence: number; runId: number }> {
  const { result, confidence, runId } = await callAI({
    systemPrompt: `You are a lead scoring AI for PMG Group (cybersecurity/IT services). Score leads 0-100 based on:
- Company fit (cybersecurity needs, IT infrastructure size)
- Budget potential
- Decision-maker likelihood
- Urgency indicators
- Source quality

Return EXACTLY this format (no extra text):
SCORE: [number 0-100]
TIER: [HOT|WARM|COLD]
REASONING: [2-3 sentence explanation]`,
    userPrompt: `Score this lead:
Name: ${lead.name}
Email: ${lead.email ?? "N/A"}
Company: ${lead.company ?? "N/A"}
Source: ${lead.source ?? "N/A"}
${lead.enrichmentData ? `Enrichment: ${lead.enrichmentData}` : ""}`,
    workflowKey: "lead_scoring",
    tool: "ai-score-company",
    domain: "crm",
    action: "score_lead",
    entityType: "lead",
    entityId: lead.id,
  });

  const scoreMatch = result.match(/SCORE:\s*(\d+)/);
  const tierMatch = result.match(/TIER:\s*(\w+)/);
  const reasonMatch = result.match(/REASONING:\s*(.+)/s);

  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
    tier: tierMatch ? tierMatch[1] : "WARM",
    reasoning: reasonMatch ? reasonMatch[1].trim() : result,
    confidence,
    runId,
  };
}

// ---------------------------------------------------------------------------
// Prospect-search query understanding (Apollo Prospect Finder)
// ---------------------------------------------------------------------------

export interface ProspectQueryInput {
  titles?: string[];
  seniorities?: string[];
  organizationKeywords?: string[];
  locations?: string[];
  keywords?: string | null;
}

export interface NormalizedProspectQuery {
  /** Corrected job titles + common synonyms (→ Apollo person_titles). */
  titles: string[];
  /** Corrected industries/keyword tags (→ Apollo q_organization_keyword_tags).
   *  Stays within the intended industry — never adds an unrelated one. */
  organizationKeywords: string[];
  /** Corrected, Apollo-formatted locations ("City, Country" / "Country"). */
  locations: string[];
  /** Corrected free-text keyword, or null. */
  keywords: string | null;
  /** One-sentence human-readable interpretation for the UI. */
  summary: string;
  /** True when the AI actually changed/corrected the raw input. */
  corrected: boolean;
}

/** Pull the first JSON object out of a model response (tolerates code fences and
 *  stray prose). Returns null on anything unparseable or on a dummy-mode string. */
function extractJsonObject(text: string): any | null {
  if (!text || text.includes("[DUMMY]")) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toStrArray(v: unknown, cap: number): string[] {
  if (!Array.isArray(v)) return [];
  const out = v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return [...new Set(out)].slice(0, cap);
}

/**
 * Correct and structure a raw Prospect Finder query BEFORE it hits Apollo.
 *
 * Apollo does not fix typos — a misspelled industry or an abbreviated country
 * ("US", "Canda", "Cybersecuirty") silently returns nothing or the wrong set.
 * This normalizes titles/industries/locations, fixes spelling, expands common
 * abbreviations, and formats locations the way Apollo expects — WITHOUT ever
 * swapping in a different industry or region than the user intended.
 *
 * Best-effort and mode-safe: returns `null` (caller falls back to the
 * deterministic normalizer) when the outreach section is human-controlled, in
 * dummy mode, when the wallet blocks, or when the model output can't be parsed.
 * Nothing here is fatal to a search.
 */
export async function normalizeProspectQuery(
  input: ProspectQueryInput,
): Promise<NormalizedProspectQuery | null> {
  const hasAny =
    (input.titles?.length ?? 0) > 0 ||
    (input.organizationKeywords?.length ?? 0) > 0 ||
    (input.locations?.length ?? 0) > 0 ||
    !!(input.keywords && input.keywords.trim());
  if (!hasAny) return null;

  // Don't emit a "Human Action Required" notification (or spend) for a search box
  // in human-controlled mode — just fall back to deterministic normalization.
  try {
    const gate = await shouldAiAct("prospect_search", undefined, "lead", undefined);
    if (!gate.canAct) return null;
  } catch {
    /* if the gate check itself fails, still attempt the call below */
  }

  try {
    const { result } = await callAI({
      systemPrompt: `You clean up B2B prospect-search filters before they are sent to Apollo.io. Apollo matches literally and does NOT fix typos.

Given the user's raw filters, return a corrected version as STRICT JSON (no prose, no code fences) with EXACTLY these keys:
{
  "titles": string[],        // corrected job titles + widely-used synonyms (e.g. "CMO" -> ["CMO","Chief Marketing Officer"]). [] if none.
  "industries": string[],    // corrected industry / keyword tags. Fix spelling ("Cybersecuirty"->"Cybersecurity"). Expand an abbreviation to the full industry. You MAY add closely-equivalent terms for the SAME industry (e.g. "Banking" -> ["Banking","Financial Services"]) but NEVER add an unrelated industry. [] if none.
  "locations": string[],     // corrected, Apollo-formatted locations. Fix spelling ("Canda"->"Canada"). Expand abbreviations ("US"->"United States","UK"->"United Kingdom"). Add the country for a bare city ("Kabul"->"Kabul, Afghanistan"). Keep the SAME place the user meant — never change the country. [] if none.
  "keywords": string|null,   // corrected free-text keyword, or null.
  "summary": string,         // ONE short sentence describing the interpreted search, e.g. "CMOs in Blockchain located in Canada".
  "corrected": boolean       // true if you changed anything, false if the input was already clean.
}

Rules: preserve the user's intent exactly. Do not broaden across industries or regions. Do not invent titles/industries/locations the user did not imply. Output JSON only.`,
      userPrompt: `Raw filters:\n${JSON.stringify(
        {
          titles: input.titles ?? [],
          industries: input.organizationKeywords ?? [],
          locations: input.locations ?? [],
          keywords: input.keywords ?? null,
        },
        null,
        2,
      )}`,
      workflowKey: "prospect_search",
      tool: "ai-parse-search",
      domain: "outreach",
      action: "parse_prospect_search",
    });

    const parsed = extractJsonObject(result);
    if (!parsed) return null;

    const titles = toStrArray(parsed.titles, 25);
    const organizationKeywords = toStrArray(parsed.industries, 15);
    const locations = toStrArray(parsed.locations, 15);
    const keywords =
      typeof parsed.keywords === "string" && parsed.keywords.trim()
        ? parsed.keywords.trim()
        : null;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

    // If the model gave us nothing usable, let the caller keep the raw filters.
    if (!titles.length && !organizationKeywords.length && !locations.length && !keywords) {
      return null;
    }

    return {
      titles,
      organizationKeywords,
      locations,
      keywords,
      summary,
      corrected: parsed.corrected === true,
    };
  } catch {
    // AI_BLOCKED / WALLET_INSUFFICIENT / AI_CALL_FAILED / network — fall back.
    return null;
  }
}

export async function generateOutreachDraft(params: {
  leadName: string;
  company?: string;
  context: string;
  channel: string;
}): Promise<{ draft: string; confidence: number; runId: number }> {
  const { result, confidence, runId } = await callAI({
    systemPrompt: `You are an outreach copywriter for PMG Group LLC, a cybersecurity and IT services agency. Write professional, personalized outreach messages. Be concise, value-driven, and avoid being pushy. PMG specializes in: penetration testing, SOC monitoring, compliance (HIPAA, PCI-DSS, SOC 2), managed IT services, and incident response.`,
    userPrompt: `Write a ${params.channel} outreach message for:
Lead: ${params.leadName}
Company: ${params.company ?? "Unknown"}
Context: ${params.context}`,
    workflowKey: "outreach_draft",
    tool: "ai-generate-outreach",
    domain: "outreach",
    action: "generate_outreach_draft",
  });

  return { draft: result, confidence, runId };
}

export async function summarizeRecord(params: {
  entityType: string;
  entityId: number;
  data: Record<string, unknown>;
}): Promise<{ summary: string; confidence: number; runId: number }> {
  const { result, confidence, runId } = await callAI({
    systemPrompt: `You are an AI assistant for PMG Group LLC. Summarize the given business record concisely. Highlight key details, risks, and recommended actions in 3-5 bullet points.`,
    userPrompt: `Summarize this ${params.entityType} record:\n${JSON.stringify(params.data, null, 2)}`,
    workflowKey: "reporting",
    tool: "ai-summarize-record",
    domain: "system",
    action: "summarize_record",
    entityType: params.entityType,
    entityId: params.entityId,
  });

  return { summary: result, confidence, runId };
}

export async function generateReport(params: {
  domain: string;
  reportType: string;
  data: Record<string, unknown>;
}): Promise<{ report: string; confidence: number; runId: number }> {
  const { result, confidence, runId } = await callAI({
    systemPrompt: `You are a business intelligence AI for PMG Group LLC (cybersecurity/IT services). Generate a detailed ${params.reportType} report with:
1. Executive Summary
2. Key Metrics & Trends
3. Risks & Concerns
4. Recommendations
5. Action Items
Use data-driven language and specific numbers from the provided data.`,
    userPrompt: `Generate a ${params.reportType} report for the ${params.domain} domain:\n${JSON.stringify(params.data, null, 2)}`,
    workflowKey: "reporting",
    tool: "ai-generate-report",
    domain: params.domain,
    action: "generate_report",
  });

  return { report: result, confidence, runId };
}

export async function suggestNextAction(params: {
  entityType: string;
  entityId: number;
  currentStage: string;
  data: Record<string, unknown>;
}): Promise<{ suggestion: string; confidence: number; runId: number }> {
  const { result, confidence, runId } = await callAI({
    systemPrompt: `You are an AI business advisor for PMG Group LLC. Based on the entity's current stage and data, suggest the single best next action. Be specific and actionable. Format:
ACTION: [specific action]
REASON: [why]
URGENCY: [HIGH|MEDIUM|LOW]`,
    userPrompt: `Suggest next action for ${params.entityType} (ID: ${params.entityId}):
Current Stage: ${params.currentStage}
Data: ${JSON.stringify(params.data, null, 2)}`,
    workflowKey: "pipeline_monitoring",
    tool: "ai-suggest-action",
    domain: "crm",
    action: "suggest_next_action",
    entityType: params.entityType,
    entityId: params.entityId,
  });

  return { suggestion: result, confidence, runId };
}
