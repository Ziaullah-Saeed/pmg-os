import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobQueueTable = pgTable("job_queue", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").default({}),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  result: jsonb("result"),
  domain: text("domain"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobQueueSchema = createInsertSchema(jobQueueTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobQueue = z.infer<typeof insertJobQueueSchema>;
export type JobQueue = typeof jobQueueTable.$inferSelect;
