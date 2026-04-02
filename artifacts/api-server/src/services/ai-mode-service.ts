import { db, aiModeSettingsTable, leadsTable, opportunitiesTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { cacheGet, cacheSet, cacheInvalidatePattern, TTL } from "./cache-service";
import { broadcast } from "./websocket-service";

export type AiMode = "ai_autonomous" | "hybrid" | "human_controlled";

const DEFAULT_WORKFLOW_MODES: Record<string, { mode: AiMode; description: string }> = {
  "lead_scoring": { mode: "ai_autonomous", description: "Lead Scoring & Enrichment" },
  "lead_routing": { mode: "ai_autonomous", description: "CRM Lead Routing" },
  "outreach_draft": { mode: "ai_autonomous", description: "Outreach Message Drafting" },
  "outreach_send": { mode: "hybrid", description: "Outreach Send Approval" },
  "proposal_generation": { mode: "hybrid", description: "Proposal Generation" },
  "proposal_approval": { mode: "human_controlled", description: "Proposal Final Approval" },
  "contract_approval": { mode: "human_controlled", description: "Contract Approval" },
  "financial_approval": { mode: "human_controlled", description: "Financial Actions" },
  "reporting": { mode: "ai_autonomous", description: "Report Generation" },
  "task_creation": { mode: "ai_autonomous", description: "Task Auto-Creation" },
  "pipeline_monitoring": { mode: "ai_autonomous", description: "Pipeline Risk Detection" },
  "content_generation": { mode: "hybrid", description: "Content Creation" },
  "closing_conversation": { mode: "human_controlled", description: "Deal Closing" },
  "sensitive_communication": { mode: "human_controlled", description: "Sensitive Communication" },
  "transcript_analysis": { mode: "ai_autonomous", description: "Transcript Processing & Analysis" },
  "call_sentiment": { mode: "ai_autonomous", description: "Call Sentiment Analysis" },
  "objection_detection": { mode: "ai_autonomous", description: "Objection Detection" },
  "followup_generation": { mode: "hybrid", description: "Follow-Up Draft Generation" },
  "meeting_booking": { mode: "hybrid", description: "Meeting Booking" },
  "asset_generation": { mode: "hybrid", description: "Asset Generation (Production Studio)" },
  "asset_review": { mode: "ai_autonomous", description: "AI Asset Review & Quality Check" },
  "design_brief": { mode: "ai_autonomous", description: "Design Brief Generation" },
  "asset_finalization": { mode: "human_controlled", description: "Asset Finalization & Publication" },
  "invoice_lifecycle": { mode: "hybrid", description: "Invoice Lifecycle Management" },
  "expense_approval": { mode: "human_controlled", description: "Expense Approval Workflow" },
  "contract_review": { mode: "ai_autonomous", description: "AI Contract Review & Risk Detection" },
  "contract_generation": { mode: "hybrid", description: "AI Contract Generation" },
  "quality_enforcement": { mode: "ai_autonomous", description: "Quality Checkpoint Enforcement" },
  "sop_enforcement": { mode: "ai_autonomous", description: "SOP Compliance Enforcement" },
  "overdue_detection": { mode: "ai_autonomous", description: "Overdue Invoice Detection" },
};

export async function getGlobalMode(): Promise<AiMode> {
  const cached = cacheGet<AiMode>("ai_mode:global");
  if (cached) return cached;
  const rows = await db.select().from(aiModeSettingsTable)
    .where(and(eq(aiModeSettingsTable.scope, "global"), eq(aiModeSettingsTable.workflowKey, "global")));
  const mode = rows.length === 0 ? "ai_autonomous" : rows[0].mode as AiMode;
  cacheSet("ai_mode:global", mode, TTL.AI_RESPONSE);
  return mode;
}

export async function setGlobalMode(mode: AiMode): Promise<void> {
  const existing = await db.select().from(aiModeSettingsTable)
    .where(and(eq(aiModeSettingsTable.scope, "global"), eq(aiModeSettingsTable.workflowKey, "global")));
  if (existing.length === 0) {
    await db.insert(aiModeSettingsTable).values({ scope: "global", workflowKey: "global", mode });
  } else {
    await db.update(aiModeSettingsTable).set({ mode }).where(eq(aiModeSettingsTable.id, existing[0].id));
  }
  cacheInvalidatePattern("ai_mode:");
  broadcast("mode_change", { scope: "global", mode });
}

export async function getWorkflowModes() {
  const cached = cacheGet<any[]>("ai_mode:workflows");
  if (cached) return cached;

  const dbRows = await db.select().from(aiModeSettingsTable).where(eq(aiModeSettingsTable.scope, "workflow"));
  const overrides: Record<string, AiMode> = {};
  for (const r of dbRows) {
    if (r.workflowKey) overrides[r.workflowKey] = r.mode as AiMode;
  }

  const result = Object.entries(DEFAULT_WORKFLOW_MODES).map(([key, def]) => ({
    workflowKey: key,
    mode: overrides[key] ?? def.mode,
    description: def.description,
    isOverridden: key in overrides,
  }));
  cacheSet("ai_mode:workflows", result, TTL.AI_RESPONSE);
  return result;
}

export async function setWorkflowMode(workflowKey: string, mode: AiMode): Promise<void> {
  const existing = await db.select().from(aiModeSettingsTable)
    .where(and(eq(aiModeSettingsTable.scope, "workflow"), eq(aiModeSettingsTable.workflowKey, workflowKey)));
  if (existing.length === 0) {
    await db.insert(aiModeSettingsTable).values({ scope: "workflow", workflowKey, mode });
  } else {
    await db.update(aiModeSettingsTable).set({ mode }).where(eq(aiModeSettingsTable.id, existing[0].id));
  }
  cacheInvalidatePattern("ai_mode:");
  broadcast("mode_change", { scope: "workflow", workflowKey, mode });
}

export async function setRecordOverride(entityType: string, entityId: number, mode: AiMode | null): Promise<void> {
  if (entityType === "lead") {
    await db.update(leadsTable).set({ aiModeOverride: mode }).where(eq(leadsTable.id, entityId));
  } else if (entityType === "opportunity") {
    await db.update(opportunitiesTable).set({ aiModeOverride: mode }).where(eq(opportunitiesTable.id, entityId));
  }
  cacheInvalidatePattern(`ai_mode:record:${entityType}:${entityId}`);
  broadcast("mode_change", { scope: "record", entityType, entityId, mode });
}

export async function getActiveOverrides(): Promise<any[]> {
  const overrides: any[] = [];
  const leadRows = await db.select({ id: leadsTable.id, aiModeOverride: leadsTable.aiModeOverride })
    .from(leadsTable).where(isNotNull(leadsTable.aiModeOverride));
  for (const row of leadRows) {
    if (row.aiModeOverride) overrides.push({ entityType: "lead", entityId: row.id, mode: row.aiModeOverride });
  }
  const oppRows = await db.select({ id: opportunitiesTable.id, aiModeOverride: opportunitiesTable.aiModeOverride })
    .from(opportunitiesTable).where(isNotNull(opportunitiesTable.aiModeOverride));
  for (const row of oppRows) {
    if (row.aiModeOverride) overrides.push({ entityType: "opportunity", entityId: row.id, mode: row.aiModeOverride });
  }
  return overrides;
}

async function getRecordOverride(entityType: string, entityId: number): Promise<AiMode | null> {
  const cacheKey = `ai_mode:record:${entityType}:${entityId}`;
  const cached = cacheGet<AiMode | null>(cacheKey);
  if (cached !== undefined) return cached;

  let override: string | null = null;
  if (entityType === "lead") {
    const [row] = await db.select({ aiModeOverride: leadsTable.aiModeOverride }).from(leadsTable).where(eq(leadsTable.id, entityId));
    override = row?.aiModeOverride || null;
  } else if (entityType === "opportunity") {
    const [row] = await db.select({ aiModeOverride: opportunitiesTable.aiModeOverride }).from(opportunitiesTable).where(eq(opportunitiesTable.id, entityId));
    override = row?.aiModeOverride || null;
  }

  cacheSet(cacheKey, override as AiMode | null, TTL.AI_RESPONSE);
  return override as AiMode | null;
}

export async function shouldAiAct(workflowKey: string, confidence?: number, entityType?: string, entityId?: number): Promise<{
  canAct: boolean;
  mode: AiMode;
  reason: string;
  source: "record" | "workflow" | "global";
}> {
  if (entityType && entityId) {
    const recordMode = await getRecordOverride(entityType, entityId);
    if (recordMode) {
      if (recordMode === "human_controlled") {
        return { canAct: false, mode: "human_controlled", reason: `Record-level override: ${entityType} #${entityId} is Human Controlled`, source: "record" };
      }
      if (recordMode === "hybrid" && confidence !== undefined && confidence < 70) {
        return { canAct: false, mode: "hybrid", reason: `Record-level hybrid: confidence ${confidence}% below threshold`, source: "record" };
      }
      return { canAct: true, mode: recordMode, reason: `Record-level override: AI authorized (${recordMode})`, source: "record" };
    }
  }

  const globalMode = await getGlobalMode();
  if (globalMode === "human_controlled") {
    return { canAct: false, mode: "human_controlled", reason: "Global mode is Human Controlled", source: "global" };
  }

  const workflows = await getWorkflowModes();
  const wf = workflows.find(w => w.workflowKey === workflowKey);
  const effectiveMode = wf?.mode ?? globalMode;

  if (effectiveMode === "human_controlled") {
    return { canAct: false, mode: "human_controlled", reason: `Workflow "${workflowKey}" requires human control`, source: "workflow" };
  }

  if (effectiveMode === "hybrid" && confidence !== undefined && confidence < 70) {
    return { canAct: false, mode: "hybrid", reason: `Confidence ${confidence}% below threshold for hybrid mode`, source: "workflow" };
  }

  return { canAct: true, mode: effectiveMode, reason: "AI authorized to act", source: "workflow" };
}
