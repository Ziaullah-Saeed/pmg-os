import { pgTable, text, serial, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { companiesTable } from "./companies";
import { leadsTable } from "./leads";
import { opportunitiesTable } from "./opportunities";

// A threaded conversation with one person, potentially spanning multiple
// channels (a prospect who DMs on LinkedIn, then replies on WhatsApp, then
// fills the website form belongs to ONE conversation via the resolved contact).
// This is the unit the unified inbox renders. Individual messages hang off it
// in `messages`; non-DM engagement (likes/comments) lives in `social_interactions`.
export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  // Resolved person. Nullable: a brand-new inbound may arrive before identity
  // resolution completes.
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  subject: text("subject"),
  // The channel where the thread is most active / started: whatsapp | facebook |
  // instagram | linkedin | x | website | email.
  primaryChannel: text("primary_channel"),
  // open | snoozed | closed | spam
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: text("assigned_to"),
  unreadCount: integer("unread_count").notNull().default(0),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  // inbound | outbound — direction of the most recent message.
  lastDirection: text("last_direction"),
  // SLA timers: when the person first reached out, and when we first replied.
  firstInboundAt: timestamp("first_inbound_at", { withTimezone: true }),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  // Rolled-up AI intent (0-100) + sentiment for the thread.
  intentScore: integer("intent_score"),
  sentiment: text("sentiment"),
  // Pipeline linkage once the conversation converts.
  convertedLeadId: integer("converted_lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
  convertedOpportunityId: integer("converted_opportunity_id").references(() => opportunitiesTable.id, { onDelete: "set null" }),
  ownerType: text("owner_type").notNull().default("pmg"),
  clientId: integer("client_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  contactIdx: index("conversations_contact_idx").on(t.contactId),
  statusIdx: index("conversations_status_idx").on(t.status),
  lastMessageIdx: index("conversations_last_message_idx").on(t.lastMessageAt),
  clientIdx: index("conversations_client_idx").on(t.clientId),
}));

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
