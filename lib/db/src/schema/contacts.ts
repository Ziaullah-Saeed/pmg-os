import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  // Email-verification signal from the provider ("valid" | "verified" | "likely"
  // | "catch-all" | "unavailable"). Drives the "Verified" badge. Nullable.
  emailStatus: text("email_status"),
  // Person's direct/mobile number lives on `phone`; the office/work-direct line
  // (Apollo "Work Direct Phone") is captured separately here. Nullable.
  phone: text("phone"),
  workPhone: text("work_phone"),
  title: text("title"),
  role: text("role"),
  // Apollo "Departments" (e.g. "C-Suite", "Master Sales"). Nullable.
  department: text("department"),
  // Person city/state/country joined into one display string. The company HQ is
  // on `companies.location`; a contact can sit elsewhere. Nullable.
  location: text("location"),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  isDecisionMaker: boolean("is_decision_maker").notNull().default(false),
  authorityLevel: text("authority_level"),
  linkedinUrl: text("linkedin_url"),
  // Person-level X/Twitter handle (paid providers like PDL return it; the
  // website scan only yields company-level socials). Nullable.
  twitterUrl: text("twitter_url"),
  // Per-field enrichment provenance, e.g. { email: "apollo", twitterUrl: "pdl" }.
  // Lets the UI tag each value with the provider that supplied it. Nullable.
  enrichmentSources: jsonb("enrichment_sources").$type<Record<string, string>>(),
  status: text("status").notNull().default("active"),
  // Contact-data lifecycle, set by lead-gen import (Apollo). Nullable so contacts
  // from other paths are not mislabeled. Values: "missing_contact" (imported,
  // email not yet revealed), "enriched" (email revealed via Apollo), "sample"
  // (fixture/sample data — never a verified live address).
  contactStatus: text("contact_status"),
  notes: text("notes"),
  externalCrmId: text("external_crm_id"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
