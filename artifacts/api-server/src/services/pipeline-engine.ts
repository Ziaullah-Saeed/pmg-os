import { db, opportunitiesTable, automationRulesTable } from "@workspace/db";
import { eq, and, sql, lt } from "drizzle-orm";
import { subscribe, emit } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { executeOrQueue, registerActionExecutor } from "./mode-action-service";

const STAGE_STALE_THRESHOLDS: Record<string, number> = {
  discovery: 14,
  qualification: 10,
  proposal: 7,
  negotiation: 14,
  closing: 5,
};

const STAGE_PROBABILITY: Record<string, number> = {
  discovery: 10,
  qualification: 25,
  proposal: 50,
  negotiation: 75,
  closing: 90,
  won: 100,
  lost: 0,
};

async function directUpdatePipeline(entityId: number, newState: string, data: any, actor: string, previousState?: string): Promise<void> {
  if (STAGE_PROBABILITY[newState] !== undefined) {
    await db.update(opportunitiesTable)
      .set({ probability: STAGE_PROBABILITY[newState] })
      .where(eq(opportunitiesTable.id, entityId));
  }

  if (newState === "won") {
    await db.update(opportunitiesTable)
      .set({ wonAt: new Date() })
      .where(eq(opportunitiesTable.id, entityId));

    await createNotification({
      type: "deal_won",
      severity: "success",
      title: `Deal Won: ${data?.title ?? `Deal #${entityId}`}`,
      message: `Congratulations! ${data?.title ?? "A deal"} worth $${(data?.value ?? 0).toLocaleString()} has been won!`,
      domain: "crm",
      entityType: "opportunity",
      entityId,
      actor,
    });
  }

  if (newState === "lost") {
    await db.update(opportunitiesTable)
      .set({ lostAt: new Date(), lostReason: data?.lostReason ?? null })
      .where(eq(opportunitiesTable.id, entityId));

    await createNotification({
      type: "deal_lost",
      severity: "warning",
      title: `Deal Lost: ${data?.title ?? `Deal #${entityId}`}`,
      message: `${data?.title ?? "A deal"} has been lost. Reason: ${data?.lostReason ?? "Not specified"}`,
      domain: "crm",
      entityType: "opportunity",
      entityId,
      actor,
    });
  }

  await logAudit({
    eventType: "pipeline_transition",
    domain: "crm",
    action: `stage_${previousState ?? "unknown"}_to_${newState}`,
    description: `Deal #${entityId} moved from ${previousState ?? "unknown"} to ${newState}`,
    entityType: "opportunity",
    entityId,
    actor,
    actorType: "system",
    metadata: { previousStage: previousState, newStage: newState, value: data?.value },
  });
}

async function onStageChanged(event: string, payload: any): Promise<void> {
  const { entityId, previousState, newState, data } = { ...payload };
  if (!entityId || !newState) return;

  const isClosingAction = newState === "won" || newState === "lost";
  const workflowKey = isClosingAction ? "closing_conversation" : "pipeline_monitoring";

  const result = await executeOrQueue({
    actionType: "pipeline_transition",
    workflowKey,
    entityType: "opportunity",
    entityId,
    title: `Pipeline: ${data?.title ?? `Deal #${entityId}`} → ${newState}`,
    description: `Deal "${data?.title ?? `#${entityId}`}" transitioning from ${previousState ?? "unknown"} to ${newState}. ${isClosingAction ? `Value: $${(data?.value ?? 0).toLocaleString()}` : `New probability: ${STAGE_PROBABILITY[newState] ?? 0}%`}`,
    confidence: isClosingAction ? 95 : 85,
    options: isClosingAction ? [
      { id: "approve", label: `Confirm ${newState}`, description: `Mark deal as ${newState}`, isAiRecommended: true },
      { id: "revert", label: "Revert Stage", description: `Keep deal in ${previousState ?? "current"} stage` },
      { id: "skip", label: "Cancel", description: "Don't process this transition" },
    ] : [
      { id: "approve", label: `Move to ${newState} (${STAGE_PROBABILITY[newState] ?? 0}%)`, description: "Accept stage transition with auto-probability", isAiRecommended: true },
      { id: "custom_prob", label: "Move with Custom Probability", description: "Set a custom probability instead of default" },
      { id: "skip", label: "Block Transition", description: "Keep deal in current stage" },
    ],
    aiRecommendation: `Process transition to ${newState}${STAGE_PROBABILITY[newState] !== undefined ? ` (probability: ${STAGE_PROBABILITY[newState]}%)` : ""}`,
    aiParts: "AI auto-sets probability based on stage (discovery:10% → closing:90%), triggers won/lost workflows, creates follow-up tasks",
    humanParts: isClosingAction
      ? "Confirm deal closure, verify deal value, approve won/lost status"
      : "Review stage transition, confirm probability percentage, approve pipeline movement",
    metadata: { entityId, previousState, newState, data, actor: payload.actor ?? "system" },
    executeAction: async () => {
      await directUpdatePipeline(entityId, newState, data, payload.actor ?? "system", previousState);
    },
  });

  if (result.queued) {
    console.log(`[PipelineEngine] Transition to ${newState} queued for ${result.mode} review`);
  }
}

async function directStaleDealAlert(deal: any, stage: string, thresholdDays: number): Promise<void> {
  await createNotification({
    type: "stale_pipeline_deal",
    severity: "warning",
    title: `Stale Deal: ${deal.title}`,
    message: `"${deal.title}" has been in ${stage} for ${thresholdDays}+ days. Value: $${(deal.value ?? 0).toLocaleString()}`,
    domain: "crm",
    entityType: "opportunity",
    entityId: deal.id,
    actor: "pipeline_engine",
  });
}

export async function checkStalePipelineDeals(): Promise<number> {
  let alertCount = 0;

  for (const [stage, thresholdDays] of Object.entries(STAGE_STALE_THRESHOLDS)) {
    const staleDeals = await db.select().from(opportunitiesTable)
      .where(and(
        eq(opportunitiesTable.stage, stage),
        sql`${opportunitiesTable.updatedAt} < NOW() - INTERVAL '${sql.raw(String(thresholdDays))} days'`,
      ));

    for (const deal of staleDeals) {
      const result = await executeOrQueue({
        actionType: "stale_deal_alert",
        workflowKey: "pipeline_monitoring",
        entityType: "opportunity",
        entityId: deal.id,
        title: `Stale Deal: ${deal.title}`,
        description: `"${deal.title}" stuck in ${stage} for ${thresholdDays}+ days. Value: $${(deal.value ?? 0).toLocaleString()}. Action needed.`,
        confidence: 90,
        options: [
          { id: "approve", label: "Send Alert", description: "Notify team about stale deal", isAiRecommended: true },
          { id: "escalate", label: "Escalate to Manager", description: "Create urgent task for manager review" },
          { id: "close_lost", label: "Mark as Lost", description: "Close this deal as lost" },
          { id: "skip", label: "Ignore", description: "Suppress this alert" },
        ],
        aiRecommendation: `Alert team — deal has been stale in ${stage} for over ${thresholdDays} days`,
        aiParts: "AI detects stale deals by comparing stage duration against per-stage thresholds, generates alert",
        humanParts: "Review stale deal, decide action: alert team, escalate, close deal, or suppress",
        metadata: { dealId: deal.id, dealTitle: deal.title, stage, thresholdDays, value: deal.value },
        executeAction: async () => {
          await directStaleDealAlert(deal, stage, thresholdDays);
        },
      });

      if (result.executed || result.queued) alertCount++;
    }
  }

  return alertCount;
}

function registerPipelineExecutors(): void {
  registerActionExecutor("pipeline_transition", async (metadata, option) => {
    if (option === "approve") {
      await directUpdatePipeline(metadata.entityId, metadata.newState, metadata.data, metadata.actor, metadata.previousState);
    } else if (option === "revert") {
      if (metadata.previousState) {
        await db.update(opportunitiesTable)
          .set({ stage: metadata.previousState })
          .where(eq(opportunitiesTable.id, metadata.entityId));
      }
    } else if (option === "custom_prob") {
      await directUpdatePipeline(metadata.entityId, metadata.newState, metadata.data, metadata.actor, metadata.previousState);
    }
  });

  registerActionExecutor("stale_deal_alert", async (metadata, option) => {
    if (option === "approve") {
      await directStaleDealAlert({ id: metadata.dealId, title: metadata.dealTitle, value: metadata.value }, metadata.stage, metadata.thresholdDays);
    } else if (option === "escalate") {
      const { tasksTable } = await import("@workspace/db");
      await db.insert(tasksTable).values({
        title: `URGENT: Review stale deal — ${metadata.dealTitle}`,
        description: `Deal "${metadata.dealTitle}" has been in ${metadata.stage} for ${metadata.thresholdDays}+ days. Value: $${(metadata.value ?? 0).toLocaleString()}`,
        domain: "crm",
        priority: "critical",
        entityType: "opportunity",
        entityId: metadata.dealId,
      });
    } else if (option === "close_lost") {
      await db.update(opportunitiesTable).set({
        stage: "lost",
        probability: 0,
        lostAt: new Date(),
        lostReason: "Stale — no activity",
      }).where(eq(opportunitiesTable.id, metadata.dealId));
    }
  });
}

async function seedPipelineRules(): Promise<void> {
  const [count] = await db.select({ count: sql<number>`count(*)` }).from(automationRulesTable)
    .where(eq(automationRulesTable.domain, "pipeline"));
  if (Number(count?.count ?? 0) > 0) return;

  const rules = [
    {
      name: "Notify team on deal won",
      triggerEvent: "opportunity.won",
      actions: [
        { type: "notification", config: { title: "Deal Won!", severity: "success", message: "A new deal has been closed!" } },
        { type: "create_task", config: { title: "Onboard new client", domain: "execution", priority: "high" } },
      ],
      domain: "pipeline",
      priority: 0,
    },
    {
      name: "Create follow-up on deal lost",
      triggerEvent: "opportunity.lost",
      actions: [
        { type: "create_task", config: { title: "Post-mortem: analyze lost deal", domain: "crm", priority: "medium" } },
      ],
      domain: "pipeline",
      priority: 1,
    },
    {
      name: "Alert on stage change to negotiation",
      triggerEvent: "opportunity.stage_changed",
      triggerConditions: { stage: "negotiation" },
      actions: [
        { type: "notification", config: { title: "Deal in Negotiation", severity: "info" } },
        { type: "create_task", config: { title: "Prepare contract terms", domain: "crm", priority: "high" } },
      ],
      domain: "pipeline",
      priority: 2,
    },
  ];

  for (const rule of rules) {
    await db.insert(automationRulesTable).values(rule);
  }
}

export function initPipelineEngine(): void {
  registerPipelineExecutors();
  subscribe("opportunity.stage_changed", onStageChanged);
  subscribe("opportunity.won", onStageChanged);
  subscribe("opportunity.lost", onStageChanged);

  seedPipelineRules().catch(console.error);
  console.log("[PipelineEngine] Initialized — tri-mode pipeline monitoring");
}
