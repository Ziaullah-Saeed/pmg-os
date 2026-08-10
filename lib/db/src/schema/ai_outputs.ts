import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Generic store for persisted AI-generated outputs — briefings, tech-evolution
 * scans, SEO audits, competitor analyses, deal coaching, transcript analyses.
 * One row per generated output, discriminated by `kind`; payload in `data`.
 */
export const aiGeneratedOutputsTable = pgTable("ai_generated_outputs", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  data: jsonb("data"),
  status: text("status").notNull().default("generated"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  generatedBy: text("generated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiGeneratedOutputSchema = createInsertSchema(aiGeneratedOutputsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiGeneratedOutput = z.infer<typeof insertAiGeneratedOutputSchema>;
export type AiGeneratedOutput = typeof aiGeneratedOutputsTable.$inferSelect;
