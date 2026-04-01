import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("draft"),
  lifecycleStage: text("lifecycle_stage").notNull().default("generated"),
  content: text("content"),
  previewUrl: text("preview_url"),
  finalUrl: text("final_url"),
  version: integer("version").notNull().default(1),
  parentId: integer("parent_id"),
  domain: text("domain"),
  campaignId: integer("campaign_id"),
  createdBy: text("created_by"),
  reviewedBy: text("reviewed_by"),
  approvedBy: text("approved_by"),
  rejectionReason: text("rejection_reason"),
  reviewNotes: text("review_notes"),
  tags: text("tags"),
  metadata: jsonb("metadata"),
  generatedByAi: text("generated_by_ai").default("no"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
