import OpenAI from "openai";
import { db, aiRunsTable } from "@workspace/db";
import { chargeWallet } from "./wallet-service";
import { shouldAiAct } from "./ai-mode-service";
import { createNotification } from "./notification-service";

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

  const { getDummyResponse } = await import("./testing-service");
  const dummyResult = getDummyResponse(params.tool, { prompt: params.userPrompt });

  if (dummyResult === null) {
    const chargeResult = await chargeWallet({
      tool: params.tool,
      domain: params.domain,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
    });

    if (!chargeResult.success) {
      throw new Error("WALLET_INSUFFICIENT: " + ("error" in chargeResult ? chargeResult.error : ""));
    }
  }

  const startTime = Date.now();
  let result = "";
  let confidence = 0;
  let status = "completed" as string;
  let errorMsg: string | undefined;

  if (dummyResult !== null) {
    result = dummyResult;
    confidence = 85;
    status = "completed";
  } else {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: params.systemPrompt },
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
