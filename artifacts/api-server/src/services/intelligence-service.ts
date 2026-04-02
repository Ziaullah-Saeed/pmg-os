import OpenAI from "openai";
import { db, aiRunsTable, companiesTable, opportunitiesTable, leadsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { chargeWallet } from "./wallet-service";
import { shouldAiAct } from "./ai-mode-service";
import { createNotification } from "./notification-service";
import { getSemanticContext } from "./embedding-service";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

async function callIntelligenceAI(params: {
  systemPrompt: string;
  userPrompt: string;
  tool: string;
  action: string;
}): Promise<{ result: string; confidence: number; runId: number }> {
  const modeCheck = await shouldAiAct("intelligence", undefined);
  if (!modeCheck.canAct) {
    throw new Error(`AI_BLOCKED: ${modeCheck.reason}`);
  }

  await chargeWallet({ tool: params.tool, domain: "intelligence", action: params.action });

  const startTime = Date.now();
  let result = "", confidence = 0, status = "completed" as string, errorMsg: string | undefined;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    result = response.choices[0]?.message?.content ?? "";
    const hasStructure = result.includes("\n") || result.includes("•") || result.includes("-");
    confidence = Math.min(95, 50 + (result.length > 100 ? 10 : 0) + (result.length > 300 ? 10 : 0) + (hasStructure ? 15 : 0) + (!result.includes("uncertain") ? 10 : 0));
  } catch (err: any) {
    status = "failed";
    errorMsg = err.message;
  }

  const [run] = await db.insert(aiRunsTable).values({
    runType: params.tool,
    status,
    prompt: params.userPrompt.slice(0, 2000),
    output: result ? result.slice(0, 2000) : null,
    model: MODEL,
    tokensUsed: result.length,
    durationMs: Date.now() - startTime,
    confidenceScore: confidence,
    domain: "intelligence",
    error: errorMsg,
  }).returning();

  if (status === "failed") throw new Error(`AI_CALL_FAILED: ${errorMsg}`);
  return { result, confidence, runId: run.id };
}

export async function generateICP(params?: {
  industry?: string;
  customContext?: string;
}): Promise<{ icp: string; confidence: number; runId: number }> {
  const wonDeals = await db.select().from(opportunitiesTable)
    .where(eq(opportunitiesTable.stage, "closed_won"))
    .orderBy(desc(opportunitiesTable.updatedAt))
    .limit(20);

  const companies = await db.select().from(companiesTable)
    .orderBy(desc(companiesTable.updatedAt))
    .limit(30);

  const knowledgeContext = await getSemanticContext("ideal customer profile cybersecurity IT services", "intelligence", 3).catch(() => "");

  const dealData = wonDeals.length > 0
    ? wonDeals.map(d => `- ${d.title}: $${d.value ?? 0}, stage: ${d.stage}`).join("\n")
    : "No closed-won deals yet. Build ICP from industry knowledge.";

  const companyData = companies.length > 0
    ? companies.map(c => `- ${c.name}: ${c.industry ?? "N/A"}, size: ${c.size ?? "N/A"}`).join("\n")
    : "";

  const { result, confidence, runId } = await callIntelligenceAI({
    systemPrompt: `You are a strategic market intelligence AI for PMG Group LLC, a cybersecurity and IT services company. Build a comprehensive Ideal Customer Profile (ICP) based on data from won deals, existing customers, and market trends.

Return a structured ICP with these sections:
1. FIRMOGRAPHICS: Industry verticals, company size (employees/revenue), geography, growth stage
2. TECHNOGRAPHICS: Tech stack indicators, security maturity level, cloud adoption
3. PAIN_POINTS: Top 5 pain points that drive purchases
4. BUDGET: Typical budget ranges, procurement patterns, fiscal year timing
5. DECISION_MAKERS: Key titles, buying committee structure, champion vs. blocker roles
6. DISQUALIFIERS: Red flags that indicate bad fit
7. SCORING_WEIGHTS: Weight each factor 1-10 for lead scoring
8. IDEAL_ENGAGEMENT: Best channels, messaging themes, sales cycle length`,
    userPrompt: `Build an ICP for PMG Group based on:

Won Deals:\n${dealData}

Customer Companies:\n${companyData}

${knowledgeContext ? `Knowledge Base Context:\n${knowledgeContext}` : ""}
${params?.industry ? `Focus Industry: ${params.industry}` : ""}
${params?.customContext ? `Additional Context: ${params.customContext}` : ""}`,
    tool: "ai-icp-generation",
    action: "generate_icp",
  });

  return { icp: result, confidence, runId };
}

export async function analyzeCompetitors(params?: {
  competitors?: string[];
  focusArea?: string;
}): Promise<{ analysis: string; confidence: number; runId: number }> {
  const companies = await db.select().from(companiesTable)
    .orderBy(desc(companiesTable.updatedAt))
    .limit(20);

  const knowledgeContext = await getSemanticContext("competitor analysis cybersecurity market", "intelligence", 3).catch(() => "");

  const { result, confidence, runId } = await callIntelligenceAI({
    systemPrompt: `You are a competitive intelligence AI for PMG Group LLC (cybersecurity/IT services). Analyze the competitive landscape and provide actionable insights.

Return a structured analysis:
1. COMPETITOR_MAP: Key competitors with positioning (name, strengths, weaknesses, market share estimate)
2. POSITIONING_GAPS: Where PMG can differentiate
3. PRICING_LANDSCAPE: Market pricing trends and PMG's position
4. WIN_LOSS_PATTERNS: Why customers choose PMG vs. competitors
5. THREAT_ASSESSMENT: Emerging competitive threats (HIGH/MEDIUM/LOW)
6. OPPORTUNITY_AREAS: Underserved segments or emerging needs
7. RECOMMENDED_ACTIONS: Top 3 strategic moves`,
    userPrompt: `Analyze competitive landscape for PMG Group:

Known Companies in Market:\n${companies.map(c => `- ${c.name}: ${c.industry ?? "N/A"}`).join("\n")}

${params?.competitors?.length ? `Specific Competitors to Analyze:\n${params.competitors.join(", ")}` : ""}
${params?.focusArea ? `Focus Area: ${params.focusArea}` : ""}
${knowledgeContext ? `Knowledge Context:\n${knowledgeContext}` : ""}

PMG Group Services: Penetration Testing, SOC Monitoring, Compliance (HIPAA, PCI-DSS, SOC 2), Managed IT, Incident Response`,
    tool: "ai-competitor-analysis",
    action: "analyze_competitors",
  });

  return { analysis: result, confidence, runId };
}

export async function segmentMarket(params?: {
  criteria?: string;
  icp?: string;
}): Promise<{ segments: string; confidence: number; runId: number }> {
  const leads = await db.select().from(leadsTable)
    .orderBy(desc(leadsTable.updatedAt))
    .limit(50);

  const companies = await db.select().from(companiesTable)
    .orderBy(desc(companiesTable.updatedAt))
    .limit(30);

  const knowledgeContext = await getSemanticContext("market segmentation cybersecurity", "intelligence", 3).catch(() => "");

  const { result, confidence, runId } = await callIntelligenceAI({
    systemPrompt: `You are a market segmentation AI for PMG Group LLC (cybersecurity/IT services). Segment the addressable market into actionable groups.

Return structured segments:
For each segment (create 4-6):
- SEGMENT_NAME
- SIZE_ESTIMATE (TAM)
- FIT_SCORE (1-100)
- KEY_CHARACTERISTICS
- PRIMARY_PAIN_POINTS
- PMG_SOLUTION_FIT (which services align)
- RECOMMENDED_APPROACH
- PRIORITY (HIGH/MEDIUM/LOW)

End with:
PRIORITY_RANKING: Ordered list of segments by opportunity
RESOURCE_ALLOCATION: Suggested % of effort per segment`,
    userPrompt: `Segment the market for PMG Group:

Current Leads (${leads.length}):\n${leads.slice(0, 20).map(l => `- ${l.name}: ${l.company ?? "N/A"}, source: ${l.source ?? "N/A"}, score: ${l.fitScore ?? "N/A"}`).join("\n")}

Companies (${companies.length}):\n${companies.slice(0, 15).map(c => `- ${c.name}: ${c.industry ?? "N/A"}, size: ${c.size ?? "N/A"}`).join("\n")}

${params?.icp ? `ICP Profile:\n${params.icp}` : ""}
${params?.criteria ? `Segmentation Criteria: ${params.criteria}` : ""}
${knowledgeContext ? `Knowledge Context:\n${knowledgeContext}` : ""}`,
    tool: "ai-market-segmentation",
    action: "segment_market",
  });

  return { segments: result, confidence, runId };
}
