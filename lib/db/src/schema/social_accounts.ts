import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { integrationsTable } from "./integrations";

// A single client-connected social account (one WhatsApp number, one Facebook
// Page, one Instagram business profile, one LinkedIn member, one website form
// source, ...). This is the tenant-scoped connection record for Social Command.
//
// Distinct from `channels` (which models lead-attribution channels with
// conversion counters): `social_accounts` stores the platform-specific account
// identifiers + credential linkage needed to send/receive messages and read
// engagement. Multi-tenant from day one via ownerType/clientId (null clientId =
// PMG-owned), matching the `channels` convention.
export const socialAccountsTable = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  // Platform this account lives on: whatsapp | facebook | instagram | linkedin |
  // x | website | email.
  platform: text("platform").notNull(),
  // How the connection is made: meta_cloud (WhatsApp Cloud API) | meta (Graph
  // API for FB/IG) | unipile (LinkedIn/aggregator) | webhook (website form) |
  // manual. Drives which adapter in channel-manager handles it.
  provider: text("provider").notNull(),
  // Provider account id: WhatsApp Phone Number ID, Facebook Page ID, IG business
  // user id, LinkedIn member URN, or a website form slug. Nullable until connected.
  externalAccountId: text("external_account_id"),
  displayName: text("display_name"),
  // Human-facing handle: @page, phone number, linkedin vanity, etc.
  handle: text("handle"),
  status: text("status").notNull().default("disconnected"),
  isActive: boolean("is_active").notNull().default(false),
  // Optional link to the shared OAuth/api-key record in integration-hub (the
  // Meta app credentials, the Unipile key). Per-account tokens (e.g. a Page
  // access token) live in `credentials` below.
  integrationId: integer("integration_id").references(() => integrationsTable.id, { onDelete: "set null" }),
  credentials: jsonb("credentials"),
  // Platform-specific config: { wabaId, phoneNumberId } (WhatsApp),
  // { pageId, igUserId } (Meta), { verifyToken }, etc.
  config: jsonb("config"),
  webhookSubscribed: boolean("webhook_subscribed").notNull().default(false),
  ownerType: text("owner_type").notNull().default("pmg"),
  // Tenant scope. Null = PMG-owned; otherwise the client whose account this is.
  // Bare integer (no FK), matching `channels.clientId`.
  clientId: integer("client_id"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  platformIdx: index("social_accounts_platform_idx").on(t.platform),
  clientIdx: index("social_accounts_client_idx").on(t.clientId),
}));

export const insertSocialAccountSchema = createInsertSchema(socialAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccountsTable.$inferSelect;
