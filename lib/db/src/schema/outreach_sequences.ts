import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outreachSequencesTable = pgTable("outreach_sequences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("draft"),
  channel: text("channel").notNull(),
  steps: jsonb("steps"),
  targetAudience: text("target_audience"),
  totalEnrolled: integer("total_enrolled").default(0),
  totalResponded: integer("total_responded").default(0),
  totalConverted: integer("total_converted").default(0),
  cadenceRules: jsonb("cadence_rules"),
  safetyControls: jsonb("safety_controls"),
  owner: text("owner"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOutreachSequenceSchema = createInsertSchema(outreachSequencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOutreachSequence = z.infer<typeof insertOutreachSequenceSchema>;
export type OutreachSequence = typeof outreachSequencesTable.$inferSelect;
