import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sequenceEnrollmentsTable = pgTable("sequence_enrollments", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactName: text("contact_name"),
  leadId: integer("lead_id"),
  status: text("status").notNull().default("active"),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  lastStepAt: timestamp("last_step_at", { withTimezone: true }),
  nextStepAt: timestamp("next_step_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  exitReason: text("exit_reason"),
  stepResults: jsonb("step_results").default([]),
  metadata: jsonb("metadata").default({}),
  enrolledBy: text("enrolled_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSequenceEnrollmentSchema = createInsertSchema(sequenceEnrollmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSequenceEnrollment = z.infer<typeof insertSequenceEnrollmentSchema>;
export type SequenceEnrollment = typeof sequenceEnrollmentsTable.$inferSelect;
