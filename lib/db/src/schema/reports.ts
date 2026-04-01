import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  domain: text("domain").notNull(),
  format: text("format").notNull().default("executive"),
  status: text("status").notNull().default("draft"),
  content: text("content"),
  summary: text("summary"),
  data: jsonb("data"),
  generatedBy: text("generated_by"),
  generationType: text("generation_type").notNull().default("manual"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveryChannel: text("delivery_channel"),
  recipients: text("recipients"),
  period: text("period"),
  tags: text("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
