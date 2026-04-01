import { db, auditEventsTable } from "@workspace/db";

export async function logAudit(params: {
  eventType: string;
  domain: string;
  action: string;
  description: string;
  entityType?: string;
  entityId?: number;
  actor?: string;
  actorType?: string;
  severity?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditEventsTable).values({
      eventType: params.eventType,
      domain: params.domain,
      action: params.action,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor ?? "system",
      actorType: params.actorType ?? "system",
      severity: params.severity ?? "info",
      metadata: params.metadata,
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
