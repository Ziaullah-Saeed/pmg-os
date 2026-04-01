import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditEventsTable = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  domain: text("domain").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  action: text("action").notNull(),
  description: text("description").notNull(),
  actor: text("actor"),
  actorType: text("actor_type").notNull().default("human"),
  severity: text("severity").notNull().default("info"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({ id: true, createdAt: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
