import { pgTable, text, serial, integer, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiRunsTable = pgTable("ai_runs", {
  id: serial("id").primaryKey(),
  runType: text("run_type").notNull(),
  domain: text("domain").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  model: text("model"),
  prompt: text("prompt"),
  output: text("output"),
  status: text("status").notNull().default("completed"),
  confidenceScore: integer("confidence_score"),
  tokensUsed: integer("tokens_used"),
  costEstimate: doublePrecision("cost_estimate"),
  reviewRequired: text("review_required").default("no"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiRunSchema = createInsertSchema(aiRunsTable).omit({ id: true, createdAt: true });
export type InsertAiRun = z.infer<typeof insertAiRunSchema>;
export type AiRun = typeof aiRunsTable.$inferSelect;
