import { db, automationRulesTable, tasksTable, leadsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { subscribe, type EventPayload } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { executeOrQueue, registerActionExecutor } from "./mode-action-service";

type ActionConfig = Record<string, unknown>;

const ACTION_WORKFLOW_MAP: Record<string, string> = {
  notification: "task_creation",
  create_task: "task_creation",
  set_priority: "lead_scoring",
  ai_enrich: "lead_scoring",
  ai_score: "lead_scoring",
  route_lead: "lead_routing",
  ghl_sync: "lead_routing",
  send_email: "outreach_send",
  update_field: "task_creation",
  archive: "task_creation",
};

const ACTION_MODE_LABELS: Record<string, { aiParts: string; humanParts: string }> = {
  ai_enrich: {
    aiParts: "AI analyzes company data, identifies industry, estimates deal potential, assesses cybersecurity maturity",
    humanParts: "Review enrichment accuracy, validate company details, confirm deal potential estimate",
  },
  ai_score: {
    aiParts: "AI evaluates lead fit score (0-100) based on company profile, budget potential, decision-maker likelihood",
    humanParts: "Review and approve/adjust the AI-generated score before it's applied to the lead",
  },
  create_task: {
    aiParts: "AI determines task title, priority, domain, and optimal assignee based on workload",
    humanParts: "Review task details, confirm or modify assignment, approve task creation",
  },
  set_priority: {
    aiParts: "AI recommends priority level based on lead score, engagement history, and deal potential",
    humanParts: "Review recommendation and confirm or override priority setting",
  },
  route_lead: {
    aiParts: "AI determines routing destination (GHL/internal/hold) based on score tier and availability",
    humanParts: "Review routing decision, confirm destination, select assignee if applicable",
  },
  ghl_sync: {
    aiParts: "AI maps lead fields to GHL format and prepares sync payload",
    humanParts: "Review field mapping, confirm data accuracy, approve sync to GoHighLevel",
  },
  send_email: {
    aiParts: "AI generates personalized email content based on lead profile and engagement context",
    humanParts: "Review email draft, edit content if needed, approve sending",
  },
  notification: {
    aiParts: "System generates notification content automatically",
    humanParts: "N/A — notifications are informational",
  },
};

async function directExecuteAction(actionType: string, config: ActionConfig, payload: EventPayload): Promise<void> {
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
      break;
    }
    case "ai_score": {
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

async function modeAwareExecuteAction(actionType: string, config: ActionConfig, payload: EventPayload, ruleName: string): Promise<void> {
  const workflowKey = ACTION_WORKFLOW_MAP[actionType] ?? "task_creation";
  const modeLabels = ACTION_MODE_LABELS[actionType] ?? { aiParts: "Automated execution", humanParts: "Review and confirm" };

  const options = [
    { id: "approve", label: "Approve & Execute", description: `Execute ${actionType} as AI recommends`, isAiRecommended: true },
    { id: "skip", label: "Skip This Action", description: `Skip ${actionType} for ${payload.entityType} #${payload.entityId}` },
  ];

  if (actionType === "ai_score") {
    options.splice(1, 0, { id: "manual_score", label: "Set Score Manually", description: "Enter a manual score instead of AI scoring" });
  }
  if (actionType === "route_lead") {
    options.splice(1, 0,
      { id: "route_ghl", label: "Route to GHL", description: "Send lead to GoHighLevel" },
      { id: "route_internal", label: "Route Internally", description: "Assign lead to internal team" },
      { id: "route_hold", label: "Hold", description: "Place lead on hold" },
    );
  }
  if (actionType === "set_priority") {
    options.splice(1, 0,
      { id: "priority_critical", label: "Set Critical", description: "Override priority to critical" },
      { id: "priority_high", label: "Set High", description: "Override priority to high" },
      { id: "priority_medium", label: "Set Medium", description: "Override priority to medium" },
    );
  }

  const result = await executeOrQueue({
    actionType: `automation_${actionType}`,
    workflowKey,
    entityType: payload.entityType,
    entityId: payload.entityId,
    title: `${ruleName}: ${actionType}`,
    description: `Automation rule "${ruleName}" wants to execute "${actionType}" on ${payload.entityType} #${payload.entityId}`,
    confidence: 80,
    options,
    aiRecommendation: `Execute ${actionType} as configured by rule "${ruleName}"`,
    aiParts: modeLabels.aiParts,
    humanParts: modeLabels.humanParts,
    metadata: { actionType, config, payload: { entityType: payload.entityType, entityId: payload.entityId, domain: payload.domain, data: payload.data }, ruleName },
    executeAction: async () => {
      await directExecuteAction(actionType, config, payload);
    },
  });

  if (result.queued) {
    console.log(`[AutomationEngine] Action "${actionType}" queued for ${result.mode} review (pending #${result.pendingActionId})`);
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
        await modeAwareExecuteAction(action.type, action.config, payload, rule.name);
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

function registerAutomationExecutors(): void {
  registerActionExecutor("automation_ai_enrich", async (metadata, option) => {
    if (option === "approve" || option === "execute") {
      await directExecuteAction("ai_enrich", metadata.config, metadata.payload);
    }
  });

  registerActionExecutor("automation_ai_score", async (metadata, option) => {
    if (option === "approve" || option === "execute") {
      await directExecuteAction("ai_score", metadata.config, metadata.payload);
    } else if (option === "manual_score" && metadata.payload.entityType === "lead" && metadata.payload.entityId) {
      await db.update(leadsTable).set({ fitScore: 50 }).where(eq(leadsTable.id, metadata.payload.entityId));
      await createNotification({
        type: "manual_score_set",
        severity: "info",
        title: "Manual Score Applied",
        message: `Lead #${metadata.payload.entityId} scored manually — set to 50 (default). Adjust in lead details.`,
        domain: "crm",
        entityType: "lead",
        entityId: metadata.payload.entityId,
        actor: "automation_engine",
      });
    }
  });

  registerActionExecutor("automation_create_task", async (metadata, option) => {
    if (option === "approve") {
      await directExecuteAction("create_task", metadata.config, metadata.payload);
    }
  });

  registerActionExecutor("automation_set_priority", async (metadata, option) => {
    const config = { ...metadata.config };
    if (option.startsWith("priority_")) {
      config.priority = option.replace("priority_", "");
    }
    await directExecuteAction("set_priority", config, metadata.payload);
  });

  registerActionExecutor("automation_route_lead", async (metadata, option) => {
    const config = { ...metadata.config };
    if (option === "route_ghl") config.destination = "ghl";
    else if (option === "route_internal") config.destination = "internal";
    else if (option === "route_hold") config.destination = "hold";
    await directExecuteAction("route_lead", config, metadata.payload);
  });

  registerActionExecutor("automation_ghl_sync", async (metadata, option) => {
    if (option === "approve") {
      await directExecuteAction("ghl_sync", metadata.config, metadata.payload);
    }
  });

  registerActionExecutor("automation_send_email", async (metadata, option) => {
    if (option === "approve") {
      await directExecuteAction("send_email", metadata.config, metadata.payload);
    }
  });

  registerActionExecutor("automation_notification", async (metadata, option) => {
    if (option === "approve") {
      await directExecuteAction("notification", metadata.config, metadata.payload);
    }
  });
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
  registerAutomationExecutors();
  subscribe("*", processEvent);
  seedDefaultRules().catch(console.error);
  console.log("[AutomationEngine] Initialized — tri-mode aware, listening for all events");
}
