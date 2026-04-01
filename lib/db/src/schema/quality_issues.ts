import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qualityIssuesTable = pgTable("quality_issues", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  domain: text("domain").notNull(),
  issueType: text("issue_type").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  title: text("title").notNull(),
  description: text("description"),
  resolution: text("resolution"),
  reportedBy: text("reported_by"),
  assignedTo: text("assigned_to"),
  resolvedBy: text("resolved_by"),
  metadata: jsonb("metadata"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQualityIssueSchema = createInsertSchema(qualityIssuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQualityIssue = z.infer<typeof insertQualityIssueSchema>;
export type QualityIssue = typeof qualityIssuesTable.$inferSelect;
