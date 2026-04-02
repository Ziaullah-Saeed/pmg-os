import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduledJobsTable = pgTable("scheduled_jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  cronExpression: text("cron_expression").notNull(),
  jobType: text("job_type").notNull(),
  config: jsonb("config").default({}),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status"),
  lastRunError: text("last_run_error"),
  lastRunDurationMs: integer("last_run_duration_ms"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  totalRuns: integer("total_runs").notNull().default(0),
  totalFailures: integer("total_failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScheduledJobSchema = createInsertSchema(scheduledJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScheduledJob = z.infer<typeof insertScheduledJobSchema>;
export type ScheduledJob = typeof scheduledJobsTable.$inferSelect;
