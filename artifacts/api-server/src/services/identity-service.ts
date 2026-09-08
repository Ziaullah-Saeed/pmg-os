import {
  db,
  contactsTable,
  companiesTable,
  channelIdentitiesTable,
  conversationsTable,
  messagesTable,
  socialInteractionsTable,
} from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { checkDuplicatesOnCreate } from "./dedup-service";
import { logAudit } from "./audit-service";

// ---------------------------------------------------------------------------
// Identity resolution for Social Command.
//
// Every inbound social signal (a WhatsApp message, a Messenger DM, a LinkedIn
// comment, a website form fill) carries a per-platform identity. This service
// maps that identity to a single canonical `contact`, so one human's activity
// across LinkedIn + Facebook + WhatsApp + the website collapses into ONE
// unified conversation history.
//
// Resolution order:
//   1. Known identity  — we've seen this (platform, externalUserId) before →
//      reuse its contact (and refresh display fields).
//   2. Exact match     — email or phone matches an existing contact → link
//      (confidence 1, verified) — this is the auto-merge path.
//   3. New contact     — create a fresh contact + identity, then fire the
//      existing dedup check to raise a *suggested* (name + company) merge for a
//      human, without blocking ingestion.
// ---------------------------------------------------------------------------

export type IdentityInput = {
  platform: string;
  externalUserId: string;
  handle?: string | null;
  displayName?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  // Resolution hints — any that the platform gives us.
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  // Provenance / tenancy.
  socialAccountId?: number | null;
  ownerType?: string;
  clientId?: number | null;
};

export type ResolvedIdentity = {
  contactId: number;
  channelIdentityId: number;
  created: boolean;
  matchedBy: "existing_identity" | "email" | "phone" | "linkedin" | "new_contact";
};

function splitName(input: IdentityInput): { firstName: string; lastName: string } {
  if (input.firstName || input.lastName) {
    return { firstName: (input.firstName ?? "").trim() || "Unknown", lastName: (input.lastName ?? "").trim() };
  }
  const display = (input.displayName ?? input.handle ?? "").trim();
  if (!display) return { firstName: "Unknown", lastName: "" };
  const parts = display.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function findOrCreateCompany(name: string): Promise<number> {
  const [existing] = await db.select().from(companiesTable).where(ilike(companiesTable.name, name));
  if (existing) return existing.id;
  const [created] = await db.insert(companiesTable).values({
    name,
    industry: "Unknown",
    status: "prospect",
  }).returning();
  return created.id;
}

async function refreshIdentityDisplay(identityId: number, input: IdentityInput): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.handle) patch.handle = input.handle;
  if (input.displayName) patch.displayName = input.displayName;
  if (input.profileUrl) patch.profileUrl = input.profileUrl;
  if (input.avatarUrl) patch.avatarUrl = input.avatarUrl;
  if (input.socialAccountId) patch.socialAccountId = input.socialAccountId;
  if (Object.keys(patch).length > 0) {
    await db.update(channelIdentitiesTable).set(patch).where(eq(channelIdentitiesTable.id, identityId));
  }
}

async function createIdentity(params: {
  contactId: number;
  input: IdentityInput;
  confidence: number;
  verified: boolean;
}): Promise<number> {
  const [identity] = await db.insert(channelIdentitiesTable).values({
    contactId: params.contactId,
    platform: params.input.platform,
    externalUserId: params.input.externalUserId,
    handle: params.input.handle ?? undefined,
    displayName: params.input.displayName ?? undefined,
    profileUrl: params.input.profileUrl ?? undefined,
    avatarUrl: params.input.avatarUrl ?? undefined,
    confidence: params.confidence,
    verified: params.verified,
    socialAccountId: params.input.socialAccountId ?? undefined,
    ownerType: params.input.ownerType ?? "pmg",
    clientId: params.input.clientId ?? undefined,
  }).returning();
  return identity.id;
}

/**
 * Resolve an inbound platform identity to a canonical contact, creating the
 * contact and/or the identity link as needed. Idempotent per identity: calling
 * it twice for the same (platform, externalUserId) returns the same contact.
 */
export async function resolveIdentity(input: IdentityInput): Promise<ResolvedIdentity> {
  // 1. Known identity ------------------------------------------------------
  const [known] = await db.select().from(channelIdentitiesTable).where(and(
    eq(channelIdentitiesTable.platform, input.platform),
    eq(channelIdentitiesTable.externalUserId, input.externalUserId),
  ));
  if (known) {
    await refreshIdentityDisplay(known.id, input);
    return { contactId: known.contactId, channelIdentityId: known.id, created: false, matchedBy: "existing_identity" };
  }

  // 2. Exact match on email / phone / linkedin (auto-merge) ----------------
  let matchedContactId: number | undefined;
  let matchedBy: ResolvedIdentity["matchedBy"] | undefined;

  if (input.email) {
    const [byEmail] = await db.select().from(contactsTable).where(ilike(contactsTable.email, input.email));
    if (byEmail) { matchedContactId = byEmail.id; matchedBy = "email"; }
  }
  if (!matchedContactId && input.phone) {
    const [byPhone] = await db.select().from(contactsTable).where(eq(contactsTable.phone, input.phone));
    if (byPhone) { matchedContactId = byPhone.id; matchedBy = "phone"; }
  }
  if (!matchedContactId && input.platform === "linkedin" && input.profileUrl) {
    const [byLinkedin] = await db.select().from(contactsTable).where(eq(contactsTable.linkedinUrl, input.profileUrl));
    if (byLinkedin) { matchedContactId = byLinkedin.id; matchedBy = "linkedin"; }
  }

  if (matchedContactId && matchedBy) {
    // Backfill any contact fields the platform gave us that we were missing.
    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, matchedContactId));
    const patch: Record<string, unknown> = {};
    if (contact && !contact.email && input.email) patch.email = input.email;
    if (contact && !contact.phone && input.phone) patch.phone = input.phone;
    if (contact && !contact.linkedinUrl && input.platform === "linkedin" && input.profileUrl) patch.linkedinUrl = input.profileUrl;
    if (Object.keys(patch).length > 0) {
      await db.update(contactsTable).set(patch).where(eq(contactsTable.id, matchedContactId));
    }
    const channelIdentityId = await createIdentity({ contactId: matchedContactId, input, confidence: 1, verified: true });
    return { contactId: matchedContactId, channelIdentityId, created: false, matchedBy };
  }

  // 3. New contact ---------------------------------------------------------
  const { firstName, lastName } = splitName(input);
  let companyId: number | undefined;
  if (input.companyName) companyId = await findOrCreateCompany(input.companyName);

  const [contact] = await db.insert(contactsTable).values({
    firstName,
    lastName,
    email: input.email ?? undefined,
    phone: input.phone ?? undefined,
    linkedinUrl: input.platform === "linkedin" ? (input.profileUrl ?? undefined) : undefined,
    twitterUrl: input.platform === "x" ? (input.profileUrl ?? undefined) : undefined,
    companyId,
    status: "active",
    contactStatus: input.email ? "enriched" : "missing_contact",
  }).returning();

  const channelIdentityId = await createIdentity({ contactId: contact.id, input, confidence: 1, verified: true });

  // Fire the existing dedup check — raises a *suggested* (name/company) merge
  // for a human without blocking ingestion.
  checkDuplicatesOnCreate("contact", contact.id).catch(() => {});

  await logAudit({
    eventType: "social_contact_created",
    domain: "outreach",
    action: "resolve_identity",
    description: `New contact #${contact.id} from ${input.platform} (${input.displayName ?? input.handle ?? input.externalUserId})`,
    entityType: "contact",
    entityId: contact.id,
    actor: "identity_service",
    actorType: "system",
    metadata: { platform: input.platform, externalUserId: input.externalUserId, socialAccountId: input.socialAccountId },
  }).catch(() => {});

  return { contactId: contact.id, channelIdentityId, created: true, matchedBy: "new_contact" };
}

/** All platform identities linked to a contact (for the unified contact card). */
export async function listIdentitiesForContact(contactId: number) {
  return db.select().from(channelIdentitiesTable)
    .where(eq(channelIdentitiesTable.contactId, contactId));
}

/**
 * Reassign every Social Command entity from one contact to another. Called by a
 * manual merge so a merged contact keeps its full cross-channel history. Kept
 * here (not in dedup-service) so the social tables stay a Social Command concern.
 */
export async function reassignSocialEntities(fromContactId: number, toContactId: number): Promise<{ identities: number; conversations: number; messages: number; interactions: number }> {
  const idn = await db.update(channelIdentitiesTable).set({ contactId: toContactId }).where(eq(channelIdentitiesTable.contactId, fromContactId)).returning({ id: channelIdentitiesTable.id });
  const conv = await db.update(conversationsTable).set({ contactId: toContactId }).where(eq(conversationsTable.contactId, fromContactId)).returning({ id: conversationsTable.id });
  const msg = await db.update(messagesTable).set({ contactId: toContactId }).where(eq(messagesTable.contactId, fromContactId)).returning({ id: messagesTable.id });
  const inter = await db.update(socialInteractionsTable).set({ contactId: toContactId }).where(eq(socialInteractionsTable.contactId, fromContactId)).returning({ id: socialInteractionsTable.id });

  await logAudit({
    eventType: "social_entities_reassigned",
    domain: "outreach",
    action: "merge_reassign",
    description: `Reassigned Social Command entities from contact #${fromContactId} to #${toContactId}`,
    entityType: "contact",
    entityId: toContactId,
    actor: "identity_service",
    actorType: "system",
    metadata: { fromContactId, toContactId, counts: { identities: idn.length, conversations: conv.length, messages: msg.length, interactions: inter.length } },
  }).catch(() => {});

  return { identities: idn.length, conversations: conv.length, messages: msg.length, interactions: inter.length };
}

/** Flip an identity to human-verified (used when a suggested merge is confirmed). */
export async function confirmIdentity(channelIdentityId: number): Promise<void> {
  await db.update(channelIdentitiesTable)
    .set({ verified: true, confidence: 1 })
    .where(eq(channelIdentitiesTable.id, channelIdentityId));
}

/** Count identities per platform — small helper for dashboards / health. */
export async function identityStats(): Promise<Array<{ platform: string; count: number }>> {
  const rows = await db.select({
    platform: channelIdentitiesTable.platform,
    count: sql<number>`count(*)`,
  }).from(channelIdentitiesTable).groupBy(channelIdentitiesTable.platform);
  return rows.map(r => ({ platform: r.platform, count: Number(r.count) }));
}
