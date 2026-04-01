import { db, aiModeSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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
};

export async function getGlobalMode(): Promise<AiMode> {
  const rows = await db.select().from(aiModeSettingsTable)
    .where(and(eq(aiModeSettingsTable.scope, "global"), eq(aiModeSettingsTable.workflowKey, "global")));
  if (rows.length === 0) return "ai_autonomous";
  return rows[0].mode as AiMode;
}

export async function setGlobalMode(mode: AiMode): Promise<void> {
  const existing = await db.select().from(aiModeSettingsTable)
    .where(and(eq(aiModeSettingsTable.scope, "global"), eq(aiModeSettingsTable.workflowKey, "global")));
  if (existing.length === 0) {
    await db.insert(aiModeSettingsTable).values({ scope: "global", workflowKey: "global", mode });
  } else {
    await db.update(aiModeSettingsTable).set({ mode }).where(eq(aiModeSettingsTable.id, existing[0].id));
  }
}

export async function getWorkflowModes() {
  const dbRows = await db.select().from(aiModeSettingsTable).where(eq(aiModeSettingsTable.scope, "workflow"));
  const overrides: Record<string, AiMode> = {};
  for (const r of dbRows) {
    if (r.workflowKey) overrides[r.workflowKey] = r.mode as AiMode;
  }

  return Object.entries(DEFAULT_WORKFLOW_MODES).map(([key, def]) => ({
    workflowKey: key,
    mode: overrides[key] ?? def.mode,
    description: def.description,
    isOverridden: key in overrides,
  }));
}

export async function setWorkflowMode(workflowKey: string, mode: AiMode): Promise<void> {
  const existing = await db.select().from(aiModeSettingsTable)
    .where(and(eq(aiModeSettingsTable.scope, "workflow"), eq(aiModeSettingsTable.workflowKey, workflowKey)));
  if (existing.length === 0) {
    await db.insert(aiModeSettingsTable).values({ scope: "workflow", workflowKey, mode });
  } else {
    await db.update(aiModeSettingsTable).set({ mode }).where(eq(aiModeSettingsTable.id, existing[0].id));
  }
}

export async function shouldAiAct(workflowKey: string, confidence?: number): Promise<{
  canAct: boolean;
  mode: AiMode;
  reason: string;
}> {
  const globalMode = await getGlobalMode();
  if (globalMode === "human_controlled") {
    return { canAct: false, mode: "human_controlled", reason: "Global mode is Human Controlled" };
  }

  const workflows = await getWorkflowModes();
  const wf = workflows.find(w => w.workflowKey === workflowKey);
  const effectiveMode = wf?.mode ?? globalMode;

  if (effectiveMode === "human_controlled") {
    return { canAct: false, mode: "human_controlled", reason: `Workflow "${workflowKey}" requires human control` };
  }

  if (effectiveMode === "hybrid" && confidence !== undefined && confidence < 70) {
    return { canAct: false, mode: "hybrid", reason: `Confidence ${confidence}% below threshold for hybrid mode` };
  }

  return { canAct: true, mode: effectiveMode, reason: "AI authorized to act" };
}
