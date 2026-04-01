import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  content: text("content"),
  templateId: text("template_id"),
  reviewStatus: text("review_status").notNull().default("pending"),
  requiresHumanReview: text("requires_human_review").notNull().default("no"),
  reviewedBy: text("reviewed_by"),
  approvedBy: text("approved_by"),
  signerName: text("signer_name"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  effectiveDate: timestamp("effective_date", { withTimezone: true }),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  renewalDate: timestamp("renewal_date", { withTimezone: true }),
  metadata: jsonb("metadata"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
