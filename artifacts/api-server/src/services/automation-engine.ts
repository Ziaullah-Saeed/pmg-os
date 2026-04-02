import { db, automationRulesTable, tasksTable, leadsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { subscribe, type EventPayload } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";

type ActionConfig = Record<string, unknown>;

async function executeAction(actionType: string, config: ActionConfig, payload: EventPayload): Promise<void> {
  switch (actionType) {
    case "notification": {
      await createNotification({
        type: "automation",
        severity: (config.severity as string) ?? "info",
        title: (config.title as string) ?? "Automation Triggered",
        message: (config.message as string) ?? `Action triggered for ${payload.entityType} #${payload.entityId}`,
        domain: payload.domain ?? "system",
        entityType: payload.entityType,
        entityId: payload.entityId,
        actor: "automation_engine",
      });
      break;
    }
    case "create_task": {
      const [task] = await db.insert(tasksTable).values({
        title: (config.title as string) ?? `Auto-task for ${payload.entityType} #${payload.entityId}`,
        description: (config.description as string) ?? "",
        domain: (config.domain as string) ?? payload.domain ?? "command_center",
        priority: (config.priority as string) ?? "medium",
        assignedTo: config.assignedTo as string | undefined,
        entityType: payload.entityType,
        entityId: payload.entityId,
      }).returning();
      broadcast("task_created", { taskId: task.id, title: task.title });
      break;
    }
    case "set_priority": {
      if (payload.entityType === "lead" && payload.entityId) {
        await db.update(leadsTable)
          .set({ priority: (config.priority as string) ?? "high" })
          .where(eq(leadsTable.id, payload.entityId));
      }
      break;
    }
    case "ai_enrich": {
      try {
        if (payload.entityType === "lead" && payload.entityId) {
          const { enrichLead } = await import("./ai-service");
          const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, payload.entityId));
          if (lead) {
            const { companiesTable } = await import("@workspace/db");
            const companyName = lead.companyId
              ? (await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, lead.companyId)))[0]?.name
              : undefined;
            await enrichLead({ id: lead.id, name: companyName ?? `Lead #${lead.id}`, source: lead.source });
          }
        }
      } catch (e) {
        console.error("[AutomationEngine] ai_enrich failed:", e);
      }
      break;
    }
    case "ai_score": {
      try {
        if (payload.entityType === "lead" && payload.entityId) {
          const { scoreLead } = await import("./ai-service");
          const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, payload.entityId));
          if (lead) {
            const { companiesTable } = await import("@workspace/db");
            const companyName = lead.companyId
              ? (await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, lead.companyId)))[0]?.name
              : undefined;
            await scoreLead({ id: lead.id, name: companyName ?? `Lead #${lead.id}`, source: lead.source });
          }
        }
      } catch (e) {
        console.error("[AutomationEngine] ai_score failed:", e);
      }
      break;
    }
    case "route_lead": {
      if (payload.entityType === "lead" && payload.entityId) {
        const destination = (config.destination as string) ?? "internal";
        await db.update(leadsTable)
          .set({ status: destination === "hold" ? "hold" : "routed" })
          .where(eq(leadsTable.id, payload.entityId));
      }
      break;
    }
    case "ghl_sync": {
      try {
        if (payload.entityType === "lead" && payload.entityId) {
          const { pushLeadToGHL } = await import("./ghl-service");
          const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, payload.entityId));
          if (lead) {
            const { companiesTable } = await import("@workspace/db");
            const companyName = lead.companyId
              ? (await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, lead.companyId)))[0]?.name
              : undefined;
            await pushLeadToGHL({ id: lead.id, name: companyName ?? `Lead #${lead.id}`, company: companyName, source: lead.source });
          }
        }
      } catch (e) {
        console.error("[AutomationEngine] ghl_sync failed:", e);
      }
      break;
    }
    case "send_email": {
      await createNotification({
        type: "email_queued",
        severity: "info",
        title: "Email Queued",
        message: `Email action triggered for ${payload.entityType} #${payload.entityId}`,
        domain: payload.domain ?? "outreach",
        entityType: payload.entityType,
        entityId: payload.entityId,
        actor: "automation_engine",
      });
      break;
    }
    case "update_field": {
      console.log(`[AutomationEngine] update_field: ${JSON.stringify(config)} on ${payload.entityType} #${payload.entityId}`);
      break;
    }
    case "archive": {
      console.log(`[AutomationEngine] archive: ${payload.entityType} #${payload.entityId}`);
      break;
    }
    default:
      console.warn(`[AutomationEngine] Unknown action type: ${actionType}`);
  }
}

function evaluateConditions(conditions: Record<string, unknown>, payload: EventPayload): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;
  const data = payload.data ?? {};
  for (const [key, rule] of Object.entries(conditions)) {
    const value = data[key];
    if (typeof rule === "object" && rule !== null) {
      const ruleObj = rule as Record<string, unknown>;
      if ("gte" in ruleObj && typeof value === "number" && value < (ruleObj.gte as number)) return false;
      if ("lte" in ruleObj && typeof value === "number" && value > (ruleObj.lte as number)) return false;
      if ("eq" in ruleObj && value !== ruleObj.eq) return false;
      if ("neq" in ruleObj && value === ruleObj.neq) return false;
    } else {
      if (value !== rule) return false;
    }
  }
  return true;
}

async function processEvent(event: string, payload: EventPayload): Promise<void> {
  const rules = await db.select().from(automationRulesTable)
    .where(and(
      eq(automationRulesTable.triggerEvent, event),
      eq(automationRulesTable.enabled, true),
    ))
    .orderBy(automationRulesTable.priority);

  for (const rule of rules) {
    try {
      const conditions = (rule.triggerConditions as Record<string, unknown>) ?? {};
      if (!evaluateConditions(conditions, payload)) continue;

      const actions = rule.actions as Array<{ type: string; config: ActionConfig }>;
      for (const action of actions) {
        await executeAction(action.type, action.config, payload);
      }

      await db.update(automationRulesTable).set({
        executionCount: sql`${automationRulesTable.executionCount} + 1`,
        lastExecutedAt: new Date(),
        lastError: null,
      }).where(eq(automationRulesTable.id, rule.id));

      await logAudit({
        eventType: "automation_executed",
        domain: rule.domain ?? "system",
        action: `rule_${rule.id}_executed`,
        description: `Automation rule "${rule.name}" executed for event "${event}"`,
        entityType: payload.entityType,
        entityId: payload.entityId,
        actor: "automation_engine",
        actorType: "system",
        metadata: { ruleId: rule.id, ruleName: rule.name, event, actionsCount: actions.length },
      });
    } catch (err: any) {
      console.error(`[AutomationEngine] Rule "${rule.name}" failed:`, err);
      await db.update(automationRulesTable).set({
        lastError: err.message ?? String(err),
        lastExecutedAt: new Date(),
      }).where(eq(automationRulesTable.id, rule.id));
    }
  }
}

export async function seedDefaultRules(): Promise<void> {
  const [existing] = await db.select({ count: sql<number>`count(*)` }).from(automationRulesTable);
  if (existing && Number(existing.count) > 0) return;

  const defaultRules = [
    {
      name: "Auto-enrich new leads",
      triggerEvent: "lead.created",
      actions: [{ type: "ai_enrich", config: {} }, { type: "ai_score", config: {} }],
      domain: "crm",
      priority: 0,
    },
    {
      name: "Notify on high-score lead",
      triggerEvent: "lead.scored",
      triggerConditions: { fitScore: { gte: 80 } },
      actions: [
        { type: "notification", config: { title: "Hot Lead Detected", severity: "warning" } },
        { type: "set_priority", config: { priority: "high" } },
      ],
      domain: "crm",
      priority: 1,
    },
    {
      name: "Route qualified leads to GHL",
      triggerEvent: "lead.qualified",
      actions: [{ type: "route_lead", config: { destination: "ghl" } }],
      enabled: false,
      domain: "crm",
      priority: 2,
    },
    {
      name: "Auto-archive won deals",
      triggerEvent: "opportunity.won",
      actions: [
        { type: "archive", config: {} },
        { type: "notification", config: { title: "Deal Won!", severity: "success" } },
      ],
      domain: "crm",
      priority: 3,
    },
    {
      name: "Create task on approval submitted",
      triggerEvent: "approval.created",
      actions: [
        { type: "create_task", config: { title: "Review pending approval", domain: "command_center", priority: "high" } },
        { type: "notification", config: { title: "New Approval Request", severity: "info" } },
      ],
      domain: "command_center",
      priority: 4,
    },
  ];

  for (const rule of defaultRules) {
    await db.insert(automationRulesTable).values(rule);
  }
}

export function initAutomationEngine(): void {
  subscribe("*", processEvent);
  seedDefaultRules().catch(console.error);
  console.log("[AutomationEngine] Initialized — listening for all events");
}
