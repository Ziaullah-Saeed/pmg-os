import { db, knowledgeEntriesTable } from "@workspace/db";
import { eq, sql, count, desc } from "drizzle-orm";
import { addKnowledgeEntry } from "./knowledge-service";

export const KNOWLEDGE_CATEGORIES = [
  "strategy",
  "sales_knowledge",
  "marketing_knowledge",
  "sop",
  "workflow",
  "meeting_transcript",
  "objection_pattern",
  "successful_response",
  "ai_output",
  "correction",
  "approval",
  "rejection",
  "campaign_lesson",
  "performance_data",
  "failure_case",
  "deal_intelligence",
  "lead_intelligence",
  "legal_intelligence",
  "finance_intelligence",
  "reporting",
  "competitive",
  "market_research",
] as const;

export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];

export async function ingestAiOutput(params: {
  tool: string;
  domain: string;
  action: string;
  prompt: string;
  result: string;
  confidence: number;
  runId: number;
  entityType?: string;
  entityId?: number;
}): Promise<void> {
  if (params.confidence < 60 || params.result.length < 50) return;

  const category = mapActionToCategory(params.action, params.domain);
  const subcategory = `ai_${params.tool.replace(/^ai-/, "")}`;

  try {
    await addKnowledgeEntry({
      category,
      subcategory,
      title: `AI Output: ${formatActionTitle(params.action)} (${params.domain})`,
      content: params.result.slice(0, 3000),
      source: `ai:${params.tool}`,
      sourceDomain: params.domain,
      sourceEntityType: params.entityType,
      sourceEntityId: params.entityId,
      tags: ["ai_output", params.tool, params.domain, params.action],
      confidence: params.confidence,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest AI output:", err);
  }
}

export async function ingestCorrection(params: {
  originalRunId: number;
  originalOutput: string;
  correctedOutput: string;
  correctedBy: string;
  domain: string;
  entityType?: string;
  entityId?: number;
  reason?: string;
}): Promise<void> {
  try {
    await addKnowledgeEntry({
      category: "correction",
      subcategory: "human_correction",
      title: `Correction: ${params.domain} output corrected by ${params.correctedBy}`,
      content: `Original AI Output:\n${params.originalOutput.slice(0, 1000)}\n\nCorrected Output:\n${params.correctedOutput.slice(0, 1000)}\n\nReason: ${params.reason ?? "Not specified"}`,
      source: `correction:run_${params.originalRunId}`,
      sourceDomain: params.domain,
      sourceEntityType: params.entityType,
      sourceEntityId: params.entityId,
      tags: ["correction", "human_feedback", params.domain],
      confidence: 95,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest correction:", err);
  }
}

export async function ingestApproval(params: {
  entityType: string;
  entityId: number;
  domain: string;
  approvedBy: string;
  details: string;
}): Promise<void> {
  try {
    await addKnowledgeEntry({
      category: "approval",
      subcategory: `approved_${params.entityType}`,
      title: `Approved: ${params.entityType} #${params.entityId} (${params.domain})`,
      content: params.details.slice(0, 3000),
      source: `approval:${params.approvedBy}`,
      sourceDomain: params.domain,
      sourceEntityType: params.entityType,
      sourceEntityId: params.entityId,
      tags: ["approval", params.entityType, params.domain],
      confidence: 90,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest approval:", err);
  }
}

export async function ingestRejection(params: {
  entityType: string;
  entityId: number;
  domain: string;
  rejectedBy: string;
  reason: string;
  details: string;
}): Promise<void> {
  try {
    await addKnowledgeEntry({
      category: "rejection",
      subcategory: `rejected_${params.entityType}`,
      title: `Rejected: ${params.entityType} #${params.entityId} — ${params.reason}`,
      content: `Rejection reason: ${params.reason}\n\nDetails:\n${params.details.slice(0, 2000)}`,
      source: `rejection:${params.rejectedBy}`,
      sourceDomain: params.domain,
      sourceEntityType: params.entityType,
      sourceEntityId: params.entityId,
      tags: ["rejection", "feedback", params.entityType, params.domain],
      confidence: 90,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest rejection:", err);
  }
}

export async function ingestMeetingTranscript(params: {
  title: string;
  transcript: string;
  attendees: string[];
  domain: string;
  entityType?: string;
  entityId?: number;
  keyTakeaways?: string;
}): Promise<void> {
  try {
    await addKnowledgeEntry({
      category: "meeting_transcript",
      subcategory: "meetings",
      title: params.title,
      content: `Attendees: ${params.attendees.join(", ")}\n\n${params.keyTakeaways ? `Key Takeaways:\n${params.keyTakeaways}\n\n` : ""}Transcript:\n${params.transcript.slice(0, 4000)}`,
      source: "meeting",
      sourceDomain: params.domain,
      sourceEntityType: params.entityType,
      sourceEntityId: params.entityId,
      tags: ["meeting", "transcript", params.domain],
      confidence: 80,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest meeting transcript:", err);
  }
}

export async function ingestSOP(params: {
  title: string;
  content: string;
  domain: string;
  version?: string;
  createdBy?: string;
}): Promise<void> {
  try {
    await addKnowledgeEntry({
      category: "sop",
      subcategory: "standard_operating_procedure",
      title: params.title,
      content: params.content.slice(0, 5000),
      source: params.createdBy ? `manual:${params.createdBy}` : "manual",
      sourceDomain: params.domain,
      tags: ["sop", params.domain, ...(params.version ? [`v${params.version}`] : [])],
      confidence: 95,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest SOP:", err);
  }
}

export async function ingestCampaignLesson(params: {
  campaignName: string;
  domain: string;
  outcome: "success" | "partial" | "failure";
  lesson: string;
  metrics?: Record<string, unknown>;
  entityId?: number;
}): Promise<void> {
  const category = params.outcome === "failure" ? "failure_case" : "campaign_lesson";
  try {
    await addKnowledgeEntry({
      category,
      subcategory: `campaign_${params.outcome}`,
      title: `Campaign ${params.outcome === "failure" ? "Failure" : "Lesson"}: ${params.campaignName}`,
      content: `Outcome: ${params.outcome}\n\nLesson:\n${params.lesson}\n\n${params.metrics ? `Metrics:\n${JSON.stringify(params.metrics, null, 2)}` : ""}`,
      source: "campaign_analysis",
      sourceDomain: params.domain,
      sourceEntityType: "campaign",
      sourceEntityId: params.entityId,
      tags: ["campaign", params.outcome, params.domain],
      confidence: 85,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest campaign lesson:", err);
  }
}

export async function ingestObjectionPattern(params: {
  objection: string;
  response: string;
  outcome: "won" | "lost" | "pending";
  domain: string;
  entityType?: string;
  entityId?: number;
}): Promise<void> {
  const category = params.outcome === "won" ? "successful_response" : "objection_pattern";
  try {
    await addKnowledgeEntry({
      category,
      subcategory: params.outcome === "won" ? "winning_responses" : "objection_handling",
      title: `${params.outcome === "won" ? "Winning Response" : "Objection"}: ${params.objection.slice(0, 80)}`,
      content: `Objection: ${params.objection}\n\nResponse: ${params.response}\n\nOutcome: ${params.outcome}`,
      source: "sales_interaction",
      sourceDomain: params.domain,
      sourceEntityType: params.entityType,
      sourceEntityId: params.entityId,
      tags: [params.outcome === "won" ? "successful_response" : "objection", params.outcome, params.domain],
      confidence: params.outcome === "won" ? 90 : 75,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest objection pattern:", err);
  }
}

export async function ingestPerformanceData(params: {
  title: string;
  domain: string;
  metrics: Record<string, unknown>;
  period: string;
  analysis?: string;
}): Promise<void> {
  try {
    await addKnowledgeEntry({
      category: "performance_data",
      subcategory: `${params.domain}_metrics`,
      title: params.title,
      content: `Period: ${params.period}\n\nMetrics:\n${JSON.stringify(params.metrics, null, 2)}\n\n${params.analysis ? `Analysis:\n${params.analysis}` : ""}`,
      source: "performance_tracking",
      sourceDomain: params.domain,
      tags: ["performance", "metrics", params.domain, params.period],
      confidence: 90,
    });
  } catch (err) {
    console.error("[Memory] Failed to ingest performance data:", err);
  }
}

export async function getKnowledgeStats(): Promise<{
  totalEntries: number;
  activeEntries: number;
  categoryCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  recentCount: number;
  totalUsageCount: number;
  topUsed: Array<{ id: number; title: string; usageCount: number; category: string }>;
}> {
  const [totalResult] = await db.select({ count: count() }).from(knowledgeEntriesTable);
  const [activeResult] = await db.select({ count: count() }).from(knowledgeEntriesTable)
    .where(eq(knowledgeEntriesTable.isActive, true));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentResult] = await db.select({ count: count() }).from(knowledgeEntriesTable)
    .where(sql`${knowledgeEntriesTable.createdAt} >= ${sevenDaysAgo}`);

  const categoryResult = await db.execute(sql`
    SELECT category, COUNT(*) as cnt FROM knowledge_entries WHERE is_active = true GROUP BY category ORDER BY cnt DESC
  `);
  const categoryCounts: Record<string, number> = {};
  const catRows = Array.isArray(categoryResult) ? categoryResult : (categoryResult as any).rows ?? [];
  for (const row of catRows) {
    categoryCounts[(row as any).category] = Number((row as any).cnt);
  }

  const sourceResult = await db.execute(sql`
    SELECT 
      CASE 
        WHEN source LIKE 'ai:%' THEN 'ai_generated'
        WHEN source LIKE 'event:%' THEN 'auto_event'
        WHEN source LIKE 'correction:%' THEN 'correction'
        WHEN source LIKE 'approval:%' THEN 'approval'
        WHEN source LIKE 'rejection:%' THEN 'rejection'
        WHEN source LIKE 'manual:%' OR source = 'manual' THEN 'manual'
        ELSE 'other'
      END as source_type,
      COUNT(*) as cnt
    FROM knowledge_entries WHERE is_active = true GROUP BY source_type ORDER BY cnt DESC
  `);
  const sourceCounts: Record<string, number> = {};
  const srcRows = Array.isArray(sourceResult) ? sourceResult : (sourceResult as any).rows ?? [];
  for (const row of srcRows) {
    sourceCounts[(row as any).source_type] = Number((row as any).cnt);
  }

  const [usageResult] = await db.select({
    total: sql<number>`coalesce(sum(${knowledgeEntriesTable.usageCount}), 0)`,
  }).from(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.isActive, true));

  const topUsed = await db.select({
    id: knowledgeEntriesTable.id,
    title: knowledgeEntriesTable.title,
    usageCount: knowledgeEntriesTable.usageCount,
    category: knowledgeEntriesTable.category,
  }).from(knowledgeEntriesTable)
    .where(eq(knowledgeEntriesTable.isActive, true))
    .orderBy(desc(knowledgeEntriesTable.usageCount))
    .limit(10);

  return {
    totalEntries: totalResult?.count ?? 0,
    activeEntries: activeResult?.count ?? 0,
    categoryCounts,
    sourceCounts,
    recentCount: recentResult?.count ?? 0,
    totalUsageCount: Number(usageResult?.total ?? 0),
    topUsed,
  };
}

function mapActionToCategory(action: string, domain: string): KnowledgeCategory {
  const actionMap: Record<string, KnowledgeCategory> = {
    enrich_lead: "lead_intelligence",
    score_lead: "lead_intelligence",
    generate_outreach_draft: "sales_knowledge",
    summarize_record: "reporting",
    generate_report: "reporting",
    suggest_next_action: "strategy",
    generate_icp: "market_research",
    analyze_competitors: "competitive",
    segment_market: "market_research",
  };
  if (actionMap[action]) return actionMap[action];

  const domainMap: Record<string, KnowledgeCategory> = {
    crm: "sales_knowledge",
    marketing: "marketing_knowledge",
    finance: "finance_intelligence",
    legal: "legal_intelligence",
    outreach: "sales_knowledge",
    system: "reporting",
  };
  return domainMap[domain] ?? "ai_output";
}

function formatActionTitle(action: string): string {
  return action.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
