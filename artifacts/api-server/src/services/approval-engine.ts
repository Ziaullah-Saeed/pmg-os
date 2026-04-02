import { db, approvalsTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { emit } from "./event-bus";
import { subscribe } from "./event-bus";
import { validateTransition } from "./state-machine";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";

export async function transitionApproval(params: {
  approvalId: number;
  newStatus: string;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; approval?: any }> {
  const [existing] = await db.select().from(approvalsTable).where(eq(approvalsTable.id, params.approvalId));
  if (!existing) return { success: false, error: "Approval not found" };

  const validation = await validateTransition({
    entityType: "approval",
    entityId: params.approvalId,
    currentState: existing.status,
    targetState: params.newStatus,
    actor: params.reviewedBy,
  });
  if (!validation.valid) return { success: false, error: validation.error };

  const updateData: Record<string, unknown> = { status: params.newStatus };
  if (params.newStatus === "approved" || params.newStatus === "rejected") {
    updateData.reviewedBy = params.reviewedBy;
    updateData.reviewedAt = new Date();
  }
  if (params.rejectionReason) updateData.rejectionReason = params.rejectionReason;
  if (params.notes) updateData.notes = params.notes;

  const [updated] = await db.update(approvalsTable)
    .set(updateData)
    .where(eq(approvalsTable.id, params.approvalId))
    .returning();

  await logAudit({
    eventType: "approval_transition",
    domain: existing.domain ?? "system",
    action: `approval_${params.newStatus}`,
    description: `Approval #${params.approvalId} transitioned from "${existing.status}" to "${params.newStatus}"`,
    entityType: "approval",
    entityId: params.approvalId,
    actor: params.reviewedBy ?? "system",
    actorType: "human",
    metadata: { previousStatus: existing.status, newStatus: params.newStatus },
  });

  await emit(`approval.${params.newStatus}`, {
    entityType: existing.entityType,
    entityId: existing.entityId,
    domain: existing.domain ?? "system",
    actor: params.reviewedBy ?? "system",
    actorType: "human",
    previousState: existing.status,
    newState: params.newStatus,
    data: {
      approvalId: params.approvalId,
      entityType: existing.entityType,
      entityId: existing.entityId,
      priority: existing.priority,
      rejectionReason: params.rejectionReason,
    },
  });

  return { success: true, approval: updated };
}

function initApprovalEngine(): void {
  subscribe("approval.approved", async (_event, payload) => {
    const data = payload.data ?? {};
    await createNotification({
      type: "approval_approved",
      severity: "success",
      title: `Approved: ${payload.entityType} #${payload.entityId}`,
      message: `${payload.entityType} #${payload.entityId} has been approved by ${payload.actor}`,
      domain: payload.domain ?? "system",
      entityType: payload.entityType,
      entityId: payload.entityId,
      actor: payload.actor ?? "system",
    });
  });

  subscribe("approval.rejected", async (_event, payload) => {
    const data = payload.data ?? {};
    await createNotification({
      type: "approval_rejected",
      severity: "warning",
      title: `Rejected: ${payload.entityType} #${payload.entityId}`,
      message: `${payload.entityType} #${payload.entityId} was rejected. Reason: ${(data.rejectionReason as string) ?? "Not specified"}`,
      domain: payload.domain ?? "system",
      entityType: payload.entityType,
      entityId: payload.entityId,
      actor: payload.actor ?? "system",
    });

    await db.insert(tasksTable).values({
      title: `Revise rejected ${payload.entityType} #${payload.entityId}`,
      description: `Rejection reason: ${(data.rejectionReason as string) ?? "Not specified"}. Please revise and resubmit.`,
      domain: payload.domain ?? "command_center",
      priority: "high",
      entityType: payload.entityType,
      entityId: payload.entityId,
    }).catch(() => {});
  });

  subscribe("approval.revision_requested", async (_event, payload) => {
    await createNotification({
      type: "revision_requested",
      severity: "info",
      title: `Revision Requested: ${payload.entityType} #${payload.entityId}`,
      message: `${payload.entityType} #${payload.entityId} needs revision before re-review`,
      domain: payload.domain ?? "system",
      entityType: payload.entityType,
      entityId: payload.entityId,
      actor: payload.actor ?? "system",
    });
  });

  console.log("[ApprovalEngine] Initialized — listening for approval events");
}

export { initApprovalEngine };
