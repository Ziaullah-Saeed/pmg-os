import { pgTable, text, serial, integer, timestamp, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const channelsTable = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  platform: text("platform").notNull(),
  category: text("category").notNull().default("inbound"),
  status: text("status").notNull().default("disconnected"),
  isActive: boolean("is_active").notNull().default(false),
  integrationMode: text("integration_mode").notNull().default("manual"),
  config: jsonb("config"),
  credentials: jsonb("credentials"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  autoSync: boolean("auto_sync").notNull().default(false),
  syncFrequencyMinutes: integer("sync_frequency_minutes").default(60),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  totalLeads: integer("total_leads").notNull().default(0),
  totalConversions: integer("total_conversions").notNull().default(0),
  monthlyLeads: integer("monthly_leads").notNull().default(0),
  conversionRate: real("conversion_rate").default(0),
  ownerType: text("owner_type").notNull().default("pmg"),
  clientId: integer("client_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const channelSourcesTable = pgTable("channel_sources", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channelsTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull(),
  externalId: text("external_id"),
  url: text("url"),
  status: text("status").notNull().default("active"),
  config: jsonb("config"),
  leadsGenerated: integer("leads_generated").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const attributionEventsTable = pgTable("attribution_events", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  contactId: integer("contact_id"),
  channelId: integer("channel_id").references(() => channelsTable.id, { onDelete: "set null" }),
  sourceId: integer("source_id").references(() => channelSourcesTable.id, { onDelete: "set null" }),
  touchpointType: text("touchpoint_type").notNull(),
  touchpointPosition: text("touchpoint_position").notNull().default("middle"),
  sessionId: text("session_id"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  landingPage: text("landing_page"),
  conversionPage: text("conversion_page"),
  metadata: jsonb("metadata"),
  creditWeight: real("credit_weight").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelFormsTable = pgTable("channel_forms", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channelsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  formType: text("form_type").notNull().default("contact"),
  status: text("status").notNull().default("active"),
  fields: jsonb("fields"),
  styling: jsonb("styling"),
  targetUrl: text("target_url"),
  embedCode: text("embed_code"),
  submissions: integer("submissions").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  ownerType: text("owner_type").notNull().default("pmg"),
  clientId: integer("client_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const landingPagesTable = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channelsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug"),
  url: text("url"),
  pageType: text("page_type").notNull().default("landing"),
  status: text("status").notNull().default("draft"),
  formId: integer("form_id").references(() => channelFormsTable.id, { onDelete: "set null" }),
  template: text("template"),
  content: jsonb("content"),
  visits: integer("visits").notNull().default(0),
  submissions: integer("submissions").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  conversionRate: real("conversion_rate").default(0),
  ownerType: text("owner_type").notNull().default("pmg"),
  clientId: integer("client_id"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const manualImportsTable = pgTable("manual_imports", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channelsTable.id, { onDelete: "set null" }),
  importType: text("import_type").notNull().default("csv"),
  entityType: text("entity_type").notNull(),
  status: text("status").notNull().default("pending"),
  fileName: text("file_name"),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successRows: integer("success_rows").default(0),
  errorRows: integer("error_rows").default(0),
  skippedRows: integer("skipped_rows").default(0),
  fieldMapping: jsonb("field_mapping"),
  errors: jsonb("errors"),
  reconciliationStatus: text("reconciliation_status"),
  reconciliationNotes: text("reconciliation_notes"),
  importedBy: text("imported_by"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channelsTable.$inferSelect;

export const insertChannelSourceSchema = createInsertSchema(channelSourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChannelSource = z.infer<typeof insertChannelSourceSchema>;
export type ChannelSource = typeof channelSourcesTable.$inferSelect;

export const insertAttributionEventSchema = createInsertSchema(attributionEventsTable).omit({ id: true, createdAt: true });
export type InsertAttributionEvent = z.infer<typeof insertAttributionEventSchema>;
export type AttributionEvent = typeof attributionEventsTable.$inferSelect;

export const insertChannelFormSchema = createInsertSchema(channelFormsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChannelForm = z.infer<typeof insertChannelFormSchema>;
export type ChannelForm = typeof channelFormsTable.$inferSelect;

export const insertLandingPageSchema = createInsertSchema(landingPagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type LandingPage = typeof landingPagesTable.$inferSelect;

export const insertManualImportSchema = createInsertSchema(manualImportsTable).omit({ id: true, createdAt: true });
export type InsertManualImport = z.infer<typeof insertManualImportSchema>;
export type ManualImport = typeof manualImportsTable.$inferSelect;
