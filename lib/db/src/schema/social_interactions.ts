import { pgTable, text, serial, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { channelIdentitiesTable } from "./channel_identities";
import { socialAccountsTable } from "./social_accounts";
import { leadsTable } from "./leads";
import { conversationsTable } from "./conversations";

// Non-DM engagement — likes, comments, reactions, mentions, follows, shares.
// These are the weaker-but-plentiful "hand-raise" signals Social Command scores
// for intent: a like is weak, a comment is medium, a "how much?" comment or a
// mention is strong. High-intent interactions convert into a lead (and often an
// auto-opened conversation via comment→DM).
export const socialInteractionsTable = pgTable("social_interactions", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  channelIdentityId: integer("channel_identity_id").references(() => channelIdentitiesTable.id, { onDelete: "set null" }),
  socialAccountId: integer("social_account_id").references(() => socialAccountsTable.id, { onDelete: "set null" }),
  // whatsapp | facebook | instagram | linkedin | x | website | email
  platform: text("platform").notNull(),
  // like | comment | reaction | mention | follow | share | reply
  type: text("type").notNull(),
  // Provider's interaction id — dedupes re-delivered engagement webhooks.
  externalId: text("external_id"),
  // The post/asset that was engaged with.
  postId: text("post_id"),
  postUrl: text("post_url"),
  // Comment/reply text or reaction emoji. Nullable for a bare like.
  content: text("content"),
  // Provider id of the parent comment when this is a threaded reply.
  externalParentId: text("external_parent_id"),
  intentScore: integer("intent_score"),
  sentiment: text("sentiment"),
  // new | reviewed | converted | ignored
  status: text("status").notNull().default("new"),
  convertedToLeadId: integer("converted_to_lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
  convertedConversationId: integer("converted_conversation_id").references(() => conversationsTable.id, { onDelete: "set null" }),
  ownerType: text("owner_type").notNull().default("pmg"),
  clientId: integer("client_id"),
  // The platform's own timestamp for the interaction.
  externalTimestamp: timestamp("external_timestamp", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  contactIdx: index("social_interactions_contact_idx").on(t.contactId),
  externalIdx: index("social_interactions_external_idx").on(t.platform, t.externalId),
  statusIdx: index("social_interactions_status_idx").on(t.status),
}));

export const insertSocialInteractionSchema = createInsertSchema(socialInteractionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSocialInteraction = z.infer<typeof insertSocialInteractionSchema>;
export type SocialInteraction = typeof socialInteractionsTable.$inferSelect;
