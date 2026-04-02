import { db, activitiesTable } from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { subscribe } from "./event-bus";
import type { EventPayload } from "./event-bus";

const EVENT_TO_ACTION: Record<string, string> = {
  "lead.created": "lead_created",
  "lead.scored": "lead_scored",
  "lead.qualified": "lead_qualified",
  "lead.routed": "lead_routed",
  "lead.converted": "lead_converted",
  "lead.closed": "lead_closed",
  "lead.status_changed": "lead_status_changed",
  "opportunity.created": "opportunity_created",
  "opportunity.stage_changed": "opportunity_stage_changed",
  "opportunity.won": "opportunity_won",
  "opportunity.lost": "opportunity_lost",
  "task.created": "task_created",
  "task.completed": "task_completed",
  "task.assigned": "task_assigned",
  "approval.created": "approval_created",
  "approval.approved": "approval_approved",
  "approval.rejected": "approval_rejected",
  "approval.revision_requested": "approval_revision_requested",
  "sequence.contact_enrolled": "sequence_enrolled",
  "sequence.completed": "sequence_completed",
  "automation.rule_executed": "automation_executed",
  "scheduler.job_completed": "scheduler_job_completed",
};

function buildDescription(event: string, payload: EventPayload): string {
  const data = payload.data ?? {};
  const actor = payload.actor ?? "system";

  switch (event) {
    case "lead.created": return `Lead created from source: ${data.source ?? "manual"} by ${actor}`;
    case "lead.scored": return `Lead scored: ${data.fitScore ?? "N/A"}/100`;
    case "lead.qualified": return `Lead qualified by ${actor}`;
    case "lead.routed": return `Lead routed to ${data.destination ?? "internal"} by ${actor}`;
    case "lead.converted": return `Lead converted to opportunity #${data.opportunityId} by ${actor}`;
    case "lead.closed": return `Lead closed as ${data.closeReason ?? "unknown"} by ${actor}`;
    case "lead.status_changed": return `Lead status changed to "${payload.newState}" by ${actor}`;
    case "opportunity.created": return `Deal "${data.title}" created — $${data.value ?? 0}`;
    case "opportunity.stage_changed": return `Deal stage: ${payload.previousState} → ${payload.newState}`;
    case "opportunity.won": return `Deal WON — $${data.value ?? 0}`;
    case "opportunity.lost": return `Deal lost${data.lostReason ? `: ${data.lostReason}` : ""}`;
    case "task.created": return `Task "${data.title}" created`;
    case "task.completed": return `Task "${data.title}" completed by ${actor}`;
    case "approval.created": return `Approval requested for ${payload.entityType} #${payload.entityId}`;
    case "approval.approved": return `Approved by ${actor}`;
    case "approval.rejected": return `Rejected by ${actor}: ${data.rejectionReason ?? "No reason given"}`;
    case "sequence.contact_enrolled": return `${data.contactEmail} enrolled in sequence`;
    case "sequence.completed": return `Sequence completed for ${data.contactEmail}`;
    default: return `${event} — ${actor}`;
  }
}

async function recordActivityFromEvent(event: string, payload: EventPayload): Promise<void> {
  const action = EVENT_TO_ACTION[event];
  if (!action) return;
  if (!payload.entityType && !payload.entityId) return;

  const description = buildDescription(event, payload);

  await db.insert(activitiesTable).values({
    entityType: payload.entityType ?? "system",
    entityId: payload.entityId ?? 0,
    action,
    description,
    performedBy: payload.actor ?? "system",
    metadata: JSON.stringify({
      event,
      domain: payload.domain,
      actorType: payload.actorType,
      previousState: payload.previousState,
      newState: payload.newState,
      ...payload.data,
    }),
  }).catch(err => console.error("[ActivityTimeline] Failed to record:", err));
}

export async function getEntityTimeline(entityType: string, entityId: number, options?: {
  includeRelated?: boolean;
  limit?: number;
}) {
  const limit = options?.limit ?? 100;

  if (!options?.includeRelated) {
    return db.select().from(activitiesTable)
      .where(and(
        eq(activitiesTable.entityType, entityType),
        eq(activitiesTable.entityId, entityId),
      ))
      .orderBy(desc(activitiesTable.createdAt))
      .limit(limit);
  }

  const relatedConditions = [
    and(eq(activitiesTable.entityType, entityType), eq(activitiesTable.entityId, entityId)),
  ];

  if (entityType === "lead") {
    const { opportunitiesTable, tasksTable, approvalsTable } = await import("@workspace/db");
    const opps = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable)
      .where(eq(opportunitiesTable.leadId, entityId));
    for (const opp of opps) {
      relatedConditions.push(and(eq(activitiesTable.entityType, "opportunity"), eq(activitiesTable.entityId, opp.id)));
    }

    const tasks = await db.select({ id: tasksTable.id }).from(tasksTable)
      .where(and(eq(tasksTable.entityType, "lead"), eq(tasksTable.entityId, entityId)));
    for (const task of tasks) {
      relatedConditions.push(and(eq(activitiesTable.entityType, "task"), eq(activitiesTable.entityId, task.id)));
    }
  }

  if (entityType === "opportunity") {
    const { tasksTable } = await import("@workspace/db");
    const tasks = await db.select({ id: tasksTable.id }).from(tasksTable)
      .where(and(eq(tasksTable.entityType, "opportunity"), eq(tasksTable.entityId, entityId)));
    for (const task of tasks) {
      relatedConditions.push(and(eq(activitiesTable.entityType, "task"), eq(activitiesTable.entityId, task.id)));
    }
  }

  return db.select().from(activitiesTable)
    .where(or(...relatedConditions))
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);
}

export function initActivityTimeline(): void {
  const trackedEvents = Object.keys(EVENT_TO_ACTION);
  for (const event of trackedEvents) {
    subscribe(event, recordActivityFromEvent);
  }
  console.log(`[ActivityTimeline] Initialized — tracking ${trackedEvents.length} event types`);
}
