import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const integrationsTable = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("disconnected"),
  isActive: boolean("is_active").notNull().default(false),
  config: jsonb("config"),
  credentials: jsonb("credentials"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  syncFrequency: text("sync_frequency"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const syncLogsTable = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  integrationId: text("integration_id").notNull(),
  direction: text("direction").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  externalId: text("external_id"),
  status: text("status").notNull(),
  error: text("error"),
  payload: jsonb("payload"),
  retryCount: integer("retry_count").default(0),
  retriedAt: timestamp("retried_at", { withTimezone: true }),
  routingDestination: text("routing_destination"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIntegrationSchema = createInsertSchema(integrationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrationsTable.$inferSelect;

export const insertSyncLogSchema = createInsertSchema(syncLogsTable).omit({ id: true, createdAt: true });
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogsTable.$inferSelect;
