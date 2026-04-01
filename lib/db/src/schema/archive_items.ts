import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const archiveItemsTable = pgTable("archive_items", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id"),
  domain: text("domain").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  content: text("content"),
  summary: text("summary"),
  tags: text("tags"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("active"),
  accessLevel: text("access_level").notNull().default("internal"),
  owner: text("owner"),
  clientId: integer("client_id"),
  retentionPolicy: text("retention_policy"),
  metadata: jsonb("metadata"),
  archivedBy: text("archived_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertArchiveItemSchema = createInsertSchema(archiveItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArchiveItem = z.infer<typeof insertArchiveItemSchema>;
export type ArchiveItem = typeof archiveItemsTable.$inferSelect;
