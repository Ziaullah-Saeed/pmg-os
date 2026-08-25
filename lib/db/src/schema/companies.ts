import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  subIndustry: text("sub_industry"),
  website: text("website"),
  // Company-level contact + social channels. Populated by the website-scan
  // enrichment (footer/contact-page harvest) and paid providers (PDL/Apollo).
  // Nullable so companies from other paths are never mislabeled.
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  youtubeUrl: text("youtube_url"),
  tiktokUrl: text("tiktok_url"),
  // Per-field enrichment provenance, e.g. { website: "pdl", instagramUrl: "website" }.
  enrichmentSources: jsonb("enrichment_sources").$type<Record<string, string>>(),
  size: text("size"),
  revenue: text("revenue"),
  location: text("location"),
  status: text("status").notNull().default("prospect"),
  fitScore: integer("fit_score"),
  painPoints: text("pain_points"),
  notes: text("notes"),
  externalCrmId: text("external_crm_id"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companiesTable.$inferSelect;
