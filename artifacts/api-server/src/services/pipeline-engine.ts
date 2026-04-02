import { db, opportunitiesTable, automationRulesTable } from "@workspace/db";
import { eq, and, sql, lt } from "drizzle-orm";
import { subscribe, emit } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";

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

async function onStageChanged(event: string, payload: any): Promise<void> {
  const { entityId, previousState, newState, data } = { ...payload };
  if (!entityId || !newState) return;

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
      actor: payload.actor ?? "system",
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
      actor: payload.actor ?? "system",
    });
  }

  await logAudit({
    eventType: "pipeline_transition",
    domain: "crm",
    action: `stage_${previousState}_to_${newState}`,
    description: `Deal #${entityId} moved from ${previousState} to ${newState}`,
    entityType: "opportunity",
    entityId,
    actor: payload.actor ?? "system",
    actorType: payload.actorType ?? "human",
    metadata: { previousStage: previousState, newStage: newState, value: data?.value },
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
      alertCount++;
    }
  }

  return alertCount;
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
  subscribe("opportunity.stage_changed", onStageChanged);
  subscribe("opportunity.won", onStageChanged);
  subscribe("opportunity.lost", onStageChanged);

  seedPipelineRules().catch(console.error);
  console.log("[PipelineEngine] Initialized — monitoring deal stage transitions");
}
