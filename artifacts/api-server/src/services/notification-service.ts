import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { broadcast } from "./websocket-service";

export async function createNotification(params: {
  type: string;
  severity?: string;
  title: string;
  message: string;
  domain?: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}) {
  const [n] = await db.insert(notificationsTable).values({
    type: params.type,
    severity: params.severity ?? "info",
    title: params.title,
    message: params.message,
    domain: params.domain,
    entityType: params.entityType,
    entityId: params.entityId,
    actionUrl: params.actionUrl,
    actor: params.actor ?? "system",
    metadata: params.metadata,
  }).returning();
  broadcast("notification", { id: n.id, type: n.type, severity: n.severity, title: n.title, message: n.message });
  return n;
}

export async function getNotifications(limit = 50) {
  return db.select().from(notificationsTable)
    .where(eq(notificationsTable.isDismissed, false))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);
}

export async function getUnreadCount() {
  const [result] = await db.select({ value: count() }).from(notificationsTable)
    .where(and(eq(notificationsTable.isRead, false), eq(notificationsTable.isDismissed, false)));
  return result?.value ?? 0;
}

export async function markRead(id: number) {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
}

export async function markAllRead() {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.isRead, false));
}

export async function dismiss(id: number) {
  await db.update(notificationsTable).set({ isDismissed: true }).where(eq(notificationsTable.id, id));
}
