import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const automationRules: Array<{
  id: string;
  name: string;
  trigger: { event: string; conditions: Record<string, unknown> };
  actions: Array<{ type: string; config: Record<string, unknown> }>;
  enabled: boolean;
  createdAt: string;
  executionCount: number;
  lastExecuted: string | null;
}> = [
  {
    id: "rule-1",
    name: "Auto-score new leads",
    trigger: { event: "lead.created", conditions: {} },
    actions: [
      { type: "ai_enrich", config: {} },
      { type: "ai_score", config: {} },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    executionCount: 4,
    lastExecuted: new Date().toISOString(),
  },
  {
    id: "rule-2",
    name: "Notify on high-score lead",
    trigger: { event: "lead.scored", conditions: { fitScore: { gte: 80 } } },
    actions: [
      { type: "notification", config: { title: "Hot Lead Detected", severity: "warning" } },
      { type: "set_priority", config: { priority: "high" } },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    executionCount: 2,
    lastExecuted: new Date().toISOString(),
  },
  {
    id: "rule-3",
    name: "Route qualified leads to GHL",
    trigger: { event: "lead.qualified", conditions: {} },
    actions: [
      { type: "route_lead", config: { destination: "ghl" } },
    ],
    enabled: false,
    createdAt: new Date().toISOString(),
    executionCount: 0,
    lastExecuted: null,
  },
  {
    id: "rule-4",
    name: "Auto-archive won deals",
    trigger: { event: "opportunity.won", conditions: {} },
    actions: [
      { type: "archive", config: {} },
      { type: "notification", config: { title: "Deal Won!", severity: "success" } },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    executionCount: 0,
    lastExecuted: null,
  },
  {
    id: "rule-5",
    name: "Stale deal alert (7+ days)",
    trigger: { event: "schedule.daily", conditions: {} },
    actions: [
      { type: "check_stale_deals", config: { daysThreshold: 7 } },
      { type: "notification", config: { title: "Stale Deal Alert", severity: "warning" } },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
    executionCount: 0,
    lastExecuted: null,
  },
];

const triggerTypes = [
  { event: "lead.created", label: "Lead Created" },
  { event: "lead.scored", label: "Lead Scored" },
  { event: "lead.qualified", label: "Lead Qualified" },
  { event: "lead.routed", label: "Lead Routed" },
  { event: "opportunity.created", label: "Deal Created" },
  { event: "opportunity.stage_changed", label: "Deal Stage Changed" },
  { event: "opportunity.won", label: "Deal Won" },
  { event: "opportunity.lost", label: "Deal Lost" },
  { event: "task.completed", label: "Task Completed" },
  { event: "approval.submitted", label: "Approval Submitted" },
  { event: "schedule.daily", label: "Daily Schedule" },
  { event: "schedule.weekly", label: "Weekly Schedule" },
];

const actionTypes = [
  { type: "ai_enrich", label: "AI Enrich Lead" },
  { type: "ai_score", label: "AI Score Lead" },
  { type: "notification", label: "Send Notification" },
  { type: "set_priority", label: "Set Priority" },
  { type: "route_lead", label: "Route Lead" },
  { type: "archive", label: "Archive Record" },
  { type: "check_stale_deals", label: "Check Stale Deals" },
  { type: "send_email", label: "Send Email" },
  { type: "create_task", label: "Create Task" },
  { type: "update_field", label: "Update Field" },
  { type: "ghl_sync", label: "Sync to GoHighLevel" },
];

const router: IRouter = Router();

router.get("/automation/rules", async (_req, res): Promise<void> => {
  res.json({ rules: automationRules, total: automationRules.length });
});

router.get("/automation/triggers", async (_req, res): Promise<void> => {
  res.json({ triggers: triggerTypes });
});

router.get("/automation/actions", async (_req, res): Promise<void> => {
  res.json({ actions: actionTypes });
});

router.post("/automation/rules", async (req, res): Promise<void> => {
  const { name, trigger, actions, enabled } = req.body;
  const rule = {
    id: `rule-${Date.now()}`,
    name,
    trigger,
    actions,
    enabled: enabled ?? true,
    createdAt: new Date().toISOString(),
    executionCount: 0,
    lastExecuted: null,
  };
  automationRules.push(rule);
  res.status(201).json(rule);
});

router.put("/automation/rules/:id", async (req, res): Promise<void> => {
  const idx = automationRules.findIndex(r => r.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Rule not found" }); return; }
  Object.assign(automationRules[idx], req.body);
  res.json(automationRules[idx]);
});

router.put("/automation/rules/:id/toggle", async (req, res): Promise<void> => {
  const idx = automationRules.findIndex(r => r.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Rule not found" }); return; }
  automationRules[idx].enabled = !automationRules[idx].enabled;
  res.json(automationRules[idx]);
});

router.delete("/automation/rules/:id", async (req, res): Promise<void> => {
  const idx = automationRules.findIndex(r => r.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Rule not found" }); return; }
  automationRules.splice(idx, 1);
  res.status(204).send();
});

export default router;
