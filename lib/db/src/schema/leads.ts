import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { contactsTable } from "./contacts";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  source: text("source").notNull(),
  status: text("status").notNull().default("new"),
  priority: text("priority").notNull().default("medium"),
  fitScore: integer("fit_score"),
  confidenceScore: integer("confidence_score"),
  painPoints: text("pain_points"),
  bestAngle: text("best_angle"),
  nextAction: text("next_action"),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  aiModeOverride: text("ai_mode_override"),
  createdByMode: text("created_by_mode"),
  channelSource: text("channel_source"),
  externalCrmId: text("external_crm_id"),
  routingDestination: text("routing_destination").default("pmg"),
  retainCopy: boolean("retain_copy").notNull().default(true),
  routedAt: timestamp("routed_at", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
