import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pendingActionsTable = pgTable("pending_actions", {
  id: serial("id").primaryKey(),
  actionType: text("action_type").notNull(),
  workflowKey: text("workflow_key").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  options: jsonb("options").notNull().default([]),
  aiRecommendation: text("ai_recommendation"),
  aiParts: text("ai_parts"),
  humanParts: text("human_parts"),
  status: text("status").notNull().default("pending"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedOption: text("resolved_option"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPendingActionSchema = createInsertSchema(pendingActionsTable).omit({ id: true, createdAt: true });
export type InsertPendingAction = z.infer<typeof insertPendingActionSchema>;
export type PendingAction = typeof pendingActionsTable.$inferSelect;
