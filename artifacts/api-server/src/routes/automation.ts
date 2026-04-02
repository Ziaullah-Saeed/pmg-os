import { Router, type IRouter } from "express";
import { db, automationRulesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const triggerTypes = [
  { event: "lead.created", label: "Lead Created" },
  { event: "lead.scored", label: "Lead Scored" },
  { event: "lead.qualified", label: "Lead Qualified" },
  { event: "lead.routed", label: "Lead Routed" },
  { event: "opportunity.created", label: "Deal Created" },
  { event: "opportunity.stage_changed", label: "Deal Stage Changed" },
  { event: "opportunity.won", label: "Deal Won" },
  { event: "opportunity.lost", label: "Deal Lost" },
  { event: "task.created", label: "Task Created" },
  { event: "task.completed", label: "Task Completed" },
  { event: "approval.created", label: "Approval Created" },
  { event: "approval.approved", label: "Approval Approved" },
  { event: "approval.rejected", label: "Approval Rejected" },
  { event: "sequence.contact_enrolled", label: "Sequence Enrollment" },
  { event: "sequence.completed", label: "Sequence Completed" },
  { event: "schedule.daily", label: "Daily Schedule" },
  { event: "schedule.weekly", label: "Weekly Schedule" },
  { event: "scheduler.job_completed", label: "Scheduled Job Completed" },
];

const actionTypes = [
  { type: "ai_enrich", label: "AI Enrich Lead" },
  { type: "ai_score", label: "AI Score Lead" },
  { type: "notification", label: "Send Notification" },
  { type: "set_priority", label: "Set Priority" },
  { type: "route_lead", label: "Route Lead" },
  { type: "archive", label: "Archive Record" },
  { type: "send_email", label: "Send Email" },
  { type: "create_task", label: "Create Task" },
  { type: "update_field", label: "Update Field" },
  { type: "ghl_sync", label: "Sync to GoHighLevel" },
];

const router: IRouter = Router();

router.get("/automation/rules", async (_req, res): Promise<void> => {
  const rules = await db.select().from(automationRulesTable).orderBy(automationRulesTable.priority, desc(automationRulesTable.createdAt));
  res.json({ rules, total: rules.length });
});

router.get("/automation/triggers", async (_req, res): Promise<void> => {
  res.json({ triggers: triggerTypes });
});

router.get("/automation/actions", async (_req, res): Promise<void> => {
  res.json({ actions: actionTypes });
});

router.post("/automation/rules", async (req, res): Promise<void> => {
  const { name, trigger, actions, enabled, description, domain, priority } = req.body;
  if (!name || !trigger?.event || !actions) {
    res.status(400).json({ error: "name, trigger.event, and actions are required" });
    return;
  }

  const [rule] = await db.insert(automationRulesTable).values({
    name,
    description,
    triggerEvent: trigger.event,
    triggerConditions: trigger.conditions ?? {},
    actions,
    enabled: enabled ?? true,
    domain,
    priority: priority ?? 0,
    createdBy: (req as any).session?.userName ?? "system",
  }).returning();

  const formatted = {
    id: String(rule.id),
    name: rule.name,
    trigger: { event: rule.triggerEvent, conditions: rule.triggerConditions },
    actions: rule.actions,
    enabled: rule.enabled,
    createdAt: rule.createdAt.toISOString(),
    executionCount: rule.executionCount,
    lastExecuted: rule.lastExecutedAt?.toISOString() ?? null,
  };
  res.status(201).json(formatted);
});

router.put("/automation/rules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id.replace("rule-", ""));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid rule ID" }); return; }

  const { name, trigger, actions, enabled, description, domain, priority } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (trigger?.event !== undefined) updateData.triggerEvent = trigger.event;
  if (trigger?.conditions !== undefined) updateData.triggerConditions = trigger.conditions;
  if (actions !== undefined) updateData.actions = actions;
  if (enabled !== undefined) updateData.enabled = enabled;
  if (domain !== undefined) updateData.domain = domain;
  if (priority !== undefined) updateData.priority = priority;

  const [updated] = await db.update(automationRulesTable).set(updateData).where(eq(automationRulesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Rule not found" }); return; }

  const formatted = {
    id: String(updated.id),
    name: updated.name,
    trigger: { event: updated.triggerEvent, conditions: updated.triggerConditions },
    actions: updated.actions,
    enabled: updated.enabled,
    createdAt: updated.createdAt.toISOString(),
    executionCount: updated.executionCount,
    lastExecuted: updated.lastExecutedAt?.toISOString() ?? null,
  };
  res.json(formatted);
});

router.put("/automation/rules/:id/toggle", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id.replace("rule-", ""));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid rule ID" }); return; }

  const [existing] = await db.select().from(automationRulesTable).where(eq(automationRulesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Rule not found" }); return; }

  const [updated] = await db.update(automationRulesTable)
    .set({ enabled: !existing.enabled })
    .where(eq(automationRulesTable.id, id))
    .returning();

  const formatted = {
    id: String(updated.id),
    name: updated.name,
    trigger: { event: updated.triggerEvent, conditions: updated.triggerConditions },
    actions: updated.actions,
    enabled: updated.enabled,
    createdAt: updated.createdAt.toISOString(),
    executionCount: updated.executionCount,
    lastExecuted: updated.lastExecutedAt?.toISOString() ?? null,
  };
  res.json(formatted);
});

router.delete("/automation/rules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id.replace("rule-", ""));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid rule ID" }); return; }

  const deleted = await db.delete(automationRulesTable).where(eq(automationRulesTable.id, id));
  res.status(204).send();
});

export default router;
