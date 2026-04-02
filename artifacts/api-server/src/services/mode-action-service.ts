import { db, pendingActionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { shouldAiAct, type AiMode } from "./ai-mode-service";
import { createNotification } from "./notification-service";
import { broadcast } from "./websocket-service";
import { logAudit } from "./audit-service";

type ActionOption = {
  id: string;
  label: string;
  description?: string;
  isAiRecommended?: boolean;
};

type ModeActionConfig = {
  actionType: string;
  workflowKey: string;
  entityType?: string;
  entityId?: number;
  title: string;
  description: string;
  confidence?: number;
  options?: ActionOption[];
  aiRecommendation?: string;
  aiParts?: string;
  humanParts?: string;
  metadata?: Record<string, unknown>;
  executeAction: (selectedOption?: string) => Promise<any>;
};

type ModeActionResult = {
  executed: boolean;
  queued: boolean;
  pendingActionId?: number;
  mode: AiMode;
  result?: any;
  reason: string;
};

export async function executeOrQueue(config: ModeActionConfig): Promise<ModeActionResult> {
  const modeCheck = await shouldAiAct(
    config.workflowKey,
    config.confidence,
    config.entityType,
    config.entityId
  );

  if (modeCheck.canAct) {
    try {
      const result = await config.executeAction(config.aiRecommendation);
      return {
        executed: true,
        queued: false,
        mode: modeCheck.mode,
        result,
        reason: `Auto-executed in ${modeCheck.mode} mode`,
      };
    } catch (err: any) {
      return {
        executed: false,
        queued: false,
        mode: modeCheck.mode,
        reason: `Execution failed: ${err.message}`,
      };
    }
  }

  const defaultOptions: ActionOption[] = config.options ?? [
    { id: "approve", label: "Approve & Execute", description: "Execute the AI-recommended action", isAiRecommended: true },
    { id: "modify", label: "Modify & Execute", description: "Adjust parameters before executing" },
    { id: "skip", label: "Skip", description: "Skip this action entirely" },
  ];

  const [pending] = await db.insert(pendingActionsTable).values({
    actionType: config.actionType,
    workflowKey: config.workflowKey,
    entityType: config.entityType ?? null,
    entityId: config.entityId ?? null,
    title: config.title,
    description: config.description,
    options: defaultOptions,
    aiRecommendation: config.aiRecommendation ?? null,
    aiParts: config.aiParts ?? null,
    humanParts: config.humanParts ?? null,
    status: "pending",
    metadata: config.metadata ?? {},
  }).returning();

  await createNotification({
    type: "pending_action",
    severity: modeCheck.mode === "human_controlled" ? "warning" : "info",
    title: `Action Requires ${modeCheck.mode === "human_controlled" ? "Manual" : "Review"}: ${config.title}`,
    message: `${config.description}${config.aiRecommendation ? ` — AI recommends: ${config.aiRecommendation}` : ""}`,
    domain: config.workflowKey.split("_")[0] ?? "system",
    entityType: config.entityType,
    entityId: config.entityId,
    actor: "mode_action_service",
    metadata: { pendingActionId: pending.id, mode: modeCheck.mode },
  });

  broadcast("pending_action", {
    id: pending.id,
    actionType: config.actionType,
    title: config.title,
    mode: modeCheck.mode,
    entityType: config.entityType,
    entityId: config.entityId,
  });

  return {
    executed: false,
    queued: true,
    pendingActionId: pending.id,
    mode: modeCheck.mode,
    reason: modeCheck.reason,
  };
}

const actionExecutors = new Map<string, (metadata: any, selectedOption: string) => Promise<any>>();

export function registerActionExecutor(actionType: string, executor: (metadata: any, selectedOption: string) => Promise<any>): void {
  actionExecutors.set(actionType, executor);
}

export async function resolvePendingAction(actionId: number, selectedOption: string, resolvedBy: string): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const [action] = await db.select().from(pendingActionsTable).where(eq(pendingActionsTable.id, actionId));
  if (!action) return { success: false, error: "Pending action not found" };
  if (action.status !== "pending") return { success: false, error: `Action already ${action.status}` };

  const validOptions = (action.options as Array<{ id: string }>) ?? [];
  const validIds = validOptions.map(o => o.id);
  if (validIds.length > 0 && !validIds.includes(selectedOption)) {
    return { success: false, error: `Invalid option "${selectedOption}". Valid options: ${validIds.join(", ")}` };
  }

  if (selectedOption === "skip") {
    await db.update(pendingActionsTable).set({
      status: "skipped",
      resolvedBy,
      resolvedAt: new Date(),
      resolvedOption: selectedOption,
    }).where(eq(pendingActionsTable.id, actionId));

    await logAudit({
      eventType: "pending_action_skipped",
      domain: action.workflowKey.split("_")[0] ?? "system",
      action: "action_skipped",
      description: `Skipped: ${action.title}`,
      entityType: action.entityType ?? undefined,
      entityId: action.entityId ?? undefined,
      actor: resolvedBy,
      actorType: "human",
    });

    return { success: true };
  }

  const executor = actionExecutors.get(action.actionType);
  if (!executor) {
    await db.update(pendingActionsTable).set({
      status: "approved",
      resolvedBy,
      resolvedAt: new Date(),
      resolvedOption: selectedOption,
    }).where(eq(pendingActionsTable.id, actionId));
    return { success: true };
  }

  try {
    const result = await executor(action.metadata, selectedOption);
    await db.update(pendingActionsTable).set({
      status: "completed",
      resolvedBy,
      resolvedAt: new Date(),
      resolvedOption: selectedOption,
    }).where(eq(pendingActionsTable.id, actionId));

    await logAudit({
      eventType: "pending_action_resolved",
      domain: action.workflowKey.split("_")[0] ?? "system",
      action: `action_${selectedOption}`,
      description: `Resolved: ${action.title} → ${selectedOption}`,
      entityType: action.entityType ?? undefined,
      entityId: action.entityId ?? undefined,
      actor: resolvedBy,
      actorType: "human",
    });

    broadcast("pending_action_resolved", { id: actionId, status: "completed", selectedOption });
    return { success: true, result };
  } catch (err: any) {
    await db.update(pendingActionsTable).set({
      status: "failed",
      resolvedBy,
      resolvedAt: new Date(),
      resolvedOption: selectedOption,
      metadata: { ...(action.metadata as object), error: err.message },
    }).where(eq(pendingActionsTable.id, actionId));
    return { success: false, error: err.message };
  }
}

export async function listPendingActions(filters?: {
  status?: string;
  workflowKey?: string;
  entityType?: string;
  limit?: number;
}) {
  const conditions = [];
  if (filters?.status) conditions.push(eq(pendingActionsTable.status, filters.status));
  if (filters?.workflowKey) conditions.push(eq(pendingActionsTable.workflowKey, filters.workflowKey));
  if (filters?.entityType) conditions.push(eq(pendingActionsTable.entityType, filters.entityType));

  return db.select().from(pendingActionsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(pendingActionsTable.createdAt))
    .limit(filters?.limit ?? 50);
}

export async function getPendingCount(): Promise<number> {
  const rows = await db.select().from(pendingActionsTable)
    .where(eq(pendingActionsTable.status, "pending"));
  return rows.length;
}
