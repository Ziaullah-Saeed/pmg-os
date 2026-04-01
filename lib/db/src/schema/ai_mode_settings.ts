import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const aiModeSettingsTable = pgTable("ai_mode_settings", {
  id: serial("id").primaryKey(),
  scope: text("scope").notNull().default("global"),
  workflowKey: text("workflow_key"),
  mode: text("mode").notNull().default("ai_autonomous"),
  confidenceThreshold: integer("confidence_threshold").notNull().default(70),
  requireHumanAbove: integer("require_human_above"),
  autoApprove: boolean("auto_approve").notNull().default(false),
  description: text("description"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  domain: text("domain"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  actor: text("actor"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeEntriesTable = pgTable("knowledge_entries", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  sourceDomain: text("source_domain"),
  sourceEntityType: text("source_entity_type"),
  sourceEntityId: integer("source_entity_id"),
  tags: jsonb("tags"),
  confidence: integer("confidence"),
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});
