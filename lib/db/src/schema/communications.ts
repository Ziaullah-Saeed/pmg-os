import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { companiesTable } from "./companies";
import { opportunitiesTable } from "./opportunities";

export const communicationsTable = pgTable("communications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  direction: text("direction").notNull(),
  subject: text("subject"),
  summary: text("summary"),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  opportunityId: integer("opportunity_id").references(() => opportunitiesTable.id, { onDelete: "set null" }),
  duration: integer("duration"),
  outcome: text("outcome"),
  nextSteps: text("next_steps"),
  sentiment: text("sentiment"),
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  performedBy: text("performed_by"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommunicationSchema = createInsertSchema(communicationsTable).omit({ id: true, createdAt: true });
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communicationsTable.$inferSelect;
