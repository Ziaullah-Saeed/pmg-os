import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

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
  return n;
}

export async function getNotifications(limit = 50) {
  return db.select().from(notificationsTable)
    .where(eq(notificationsTable.isDismissed, false))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);
}

export async function getUnreadCount() {
  const rows = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.isRead, false), eq(notificationsTable.isDismissed, false)));
  return rows.length;
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
