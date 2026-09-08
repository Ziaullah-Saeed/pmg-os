import { pgTable, text, serial, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { conversationsTable } from "./conversations";
import { contactsTable } from "./contacts";
import { socialAccountsTable } from "./social_accounts";
import { channelIdentitiesTable } from "./channel_identities";

// An individual message inside a conversation. Unlike the flat `communications`
// activity log, messages carry the provider message id (for idempotent
// ingestion + dedup), attachments, delivery status, and the connected account +
// identity they flowed through — everything a real threaded inbox needs.
export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversationsTable.id, { onDelete: "cascade" }).notNull(),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  // whatsapp | facebook | instagram | linkedin | x | website | email
  channel: text("channel").notNull(),
  // inbound | outbound
  direction: text("direction").notNull(),
  // Provider's message id. Used to dedupe re-delivered webhooks — ingestion
  // skips a (channel, externalMessageId) it has already stored.
  externalMessageId: text("external_message_id"),
  socialAccountId: integer("social_account_id").references(() => socialAccountsTable.id, { onDelete: "set null" }),
  channelIdentityId: integer("channel_identity_id").references(() => channelIdentitiesTable.id, { onDelete: "set null" }),
  body: text("body"),
  // Array of { type, url, name, mime } for media/documents. Nullable.
  attachments: jsonb("attachments"),
  // received | sent | delivered | read | failed
  status: text("status").notNull().default("received"),
  sentiment: text("sentiment"),
  intentScore: integer("intent_score"),
  // Which AI mode produced an outbound message: ai_auto | hybrid | human.
  sentByMode: text("sent_by_mode"),
  performedBy: text("performed_by"),
  // The platform's own timestamp for the message (may differ from createdAt).
  externalTimestamp: timestamp("external_timestamp", { withTimezone: true }),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  conversationIdx: index("messages_conversation_idx").on(t.conversationId),
  externalIdx: index("messages_external_idx").on(t.channel, t.externalMessageId),
}));

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
