import { pgTable, text, serial, integer, boolean, real, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { socialAccountsTable } from "./social_accounts";

// The identity graph. Maps a per-platform identity (Messenger PSID, IG-scoped
// user id, WhatsApp phone number, LinkedIn member URN, email, website session)
// to a single resolved `contact`. This is what lets one person's messages from
// LinkedIn + Facebook + the website form + WhatsApp collapse into ONE unified
// conversation history.
//
// `confidence` records how the link was made: 1 = exact match (email/phone) →
// auto-merged; < 1 = suggested (name + company heuristic) awaiting human
// confirmation. `verified` flips true once a human confirms the merge.
export const channelIdentitiesTable = pgTable("channel_identities", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "cascade" }).notNull(),
  // whatsapp | facebook | instagram | linkedin | x | website | email
  platform: text("platform").notNull(),
  // The stable per-platform identifier we key on (PSID, IG id, phone, member
  // URN, email, session id).
  externalUserId: text("external_user_id").notNull(),
  handle: text("handle"),
  displayName: text("display_name"),
  profileUrl: text("profile_url"),
  avatarUrl: text("avatar_url"),
  // 1 = exact/auto-merged; lower = heuristic suggestion.
  confidence: real("confidence").notNull().default(1),
  verified: boolean("verified").notNull().default(false),
  // Which connected account first observed this identity. Nullable.
  socialAccountId: integer("social_account_id").references(() => socialAccountsTable.id, { onDelete: "set null" }),
  ownerType: text("owner_type").notNull().default("pmg"),
  clientId: integer("client_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  // Fast lookup on inbound: "have we seen this platform id before?"
  lookupIdx: index("channel_identities_lookup_idx").on(t.platform, t.externalUserId),
  contactIdx: index("channel_identities_contact_idx").on(t.contactId),
}));

export const insertChannelIdentitySchema = createInsertSchema(channelIdentitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChannelIdentity = z.infer<typeof insertChannelIdentitySchema>;
export type ChannelIdentity = typeof channelIdentitiesTable.$inferSelect;
