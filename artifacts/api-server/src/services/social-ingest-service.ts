import {
  db,
  conversationsTable,
  messagesTable,
  socialInteractionsTable,
  contactsTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { resolveIdentity, type IdentityInput } from "./identity-service";
import { emit } from "./event-bus";
import { broadcast } from "./websocket-service";

// ---------------------------------------------------------------------------
// Social ingest — the normalization layer for Social Command.
//
// Each provider adapter (WhatsApp Cloud API, Meta Messenger/Instagram, the
// website form webhook, later Unipile/LinkedIn) speaks its own payload shape.
// Rather than let those shapes leak into the database, every adapter maps its
// payload to ONE of the canonical events below and hands it to `ingestMessage`
// / `ingestInteraction`. Those functions do the shared work: identity
// resolution, thread find-or-create, idempotent persistence, conversation
// roll-ups, and firing the event-bus + websocket signals that Phase 4
// (intent → deal) subscribes to.
//
// Nothing here calls AI or the wallet — scoring/replies are downstream so the
// ingest path stays fast and cheap. Ingestion is idempotent: re-delivered
// webhooks (same external id) are skipped, not duplicated.
//
// (Distinct from `channel-manager.ts`, which owns lead-attribution *channels*
// CRUD; this file owns the inbound message/engagement pipeline.)
// ---------------------------------------------------------------------------

/** The person on the other end, in provider-neutral form. */
export type ActorInput = IdentityInput;

export type InboundMessageEvent = {
  platform: string;
  direction: "inbound" | "outbound";
  actor: ActorInput;
  externalMessageId?: string | null;
  socialAccountId?: number | null;
  body?: string | null;
  attachments?: Array<{ type?: string; url?: string; name?: string; mime?: string }> | null;
  externalTimestamp?: Date | null;
  sentByMode?: string | null;
  performedBy?: string | null;
  ownerType?: string;
  clientId?: number | null;
};

export type InboundInteractionEvent = {
  platform: string;
  type: string; // like | comment | reaction | mention | follow | share | reply
  actor: ActorInput;
  externalId?: string | null;
  socialAccountId?: number | null;
  postId?: string | null;
  postUrl?: string | null;
  content?: string | null;
  externalParentId?: string | null;
  externalTimestamp?: Date | null;
  ownerType?: string;
  clientId?: number | null;
};

export type IngestMessageResult = {
  conversationId: number;
  messageId: number;
  contactId: number;
  deduped: boolean;
  conversationCreated: boolean;
};

export type IngestInteractionResult = {
  interactionId: number;
  contactId: number;
  deduped: boolean;
};

const ACTIVE_STATUSES = ["open", "snoozed"];

async function findOrCreateConversation(params: {
  contactId: number;
  platform: string;
  ownerType?: string;
  clientId?: number | null;
}): Promise<{ id: number; created: boolean }> {
  // One person = one live thread, regardless of channel — this is what makes
  // the history "unified across places". Reuse the most recent active thread;
  // only start a new one if none is open.
  const [active] = await db.select().from(conversationsTable)
    .where(and(
      eq(conversationsTable.contactId, params.contactId),
      inArray(conversationsTable.status, ACTIVE_STATUSES),
    ))
    .orderBy(desc(conversationsTable.lastMessageAt))
    .limit(1);
  if (active) return { id: active.id, created: false };

  const [contact] = await db.select({ companyId: contactsTable.companyId })
    .from(contactsTable).where(eq(contactsTable.id, params.contactId));

  const [created] = await db.insert(conversationsTable).values({
    contactId: params.contactId,
    companyId: contact?.companyId ?? undefined,
    primaryChannel: params.platform,
    status: "open",
    ownerType: params.ownerType ?? "pmg",
    clientId: params.clientId ?? undefined,
  }).returning();
  return { id: created.id, created: true };
}

/**
 * Ingest a single message (inbound OR outbound) into the unified inbox.
 * Idempotent per (channel, externalMessageId).
 */
export async function ingestMessage(event: InboundMessageEvent): Promise<IngestMessageResult> {
  const resolved = await resolveIdentity({ ...event.actor, socialAccountId: event.socialAccountId ?? event.actor.socialAccountId, ownerType: event.ownerType, clientId: event.clientId });

  // Dedup re-delivered webhooks.
  if (event.externalMessageId) {
    const [dupe] = await db.select().from(messagesTable).where(and(
      eq(messagesTable.channel, event.platform),
      eq(messagesTable.externalMessageId, event.externalMessageId),
    ));
    if (dupe) {
      return { conversationId: dupe.conversationId, messageId: dupe.id, contactId: resolved.contactId, deduped: true, conversationCreated: false };
    }
  }

  const conversation = await findOrCreateConversation({
    contactId: resolved.contactId,
    platform: event.platform,
    ownerType: event.ownerType,
    clientId: event.clientId,
  });

  const ts = event.externalTimestamp ?? new Date();

  const [message] = await db.insert(messagesTable).values({
    conversationId: conversation.id,
    contactId: resolved.contactId,
    channel: event.platform,
    direction: event.direction,
    externalMessageId: event.externalMessageId ?? undefined,
    socialAccountId: event.socialAccountId ?? undefined,
    channelIdentityId: resolved.channelIdentityId,
    body: event.body ?? undefined,
    attachments: event.attachments ?? undefined,
    status: event.direction === "inbound" ? "received" : "sent",
    sentByMode: event.sentByMode ?? undefined,
    performedBy: event.performedBy ?? undefined,
    externalTimestamp: ts,
  }).returning();

  // Roll up conversation state.
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversation.id));
  const patch: Record<string, unknown> = {
    lastMessageAt: ts,
    lastMessagePreview: (event.body ?? "").slice(0, 140) || undefined,
    lastDirection: event.direction,
  };
  if (event.direction === "inbound") {
    patch.unreadCount = (conv?.unreadCount ?? 0) + 1;
    if (!conv?.firstInboundAt) patch.firstInboundAt = ts;
  } else {
    // First reply after an inbound = SLA first-response timestamp.
    if (!conv?.firstResponseAt && conv?.firstInboundAt) patch.firstResponseAt = ts;
  }
  await db.update(conversationsTable).set(patch).where(eq(conversationsTable.id, conversation.id));

  const busEvent = event.direction === "inbound" ? "social.message.received" : "social.message.sent";
  await emit(busEvent, {
    entityType: "conversation",
    entityId: conversation.id,
    domain: "outreach",
    actor: event.platform,
    actorType: "system",
    data: {
      messageId: message.id,
      contactId: resolved.contactId,
      channel: event.platform,
      direction: event.direction,
      preview: (event.body ?? "").slice(0, 140),
      newContact: resolved.created,
    },
  });
  broadcast("social_message", {
    conversationId: conversation.id,
    messageId: message.id,
    contactId: resolved.contactId,
    channel: event.platform,
    direction: event.direction,
  });

  return { conversationId: conversation.id, messageId: message.id, contactId: resolved.contactId, deduped: false, conversationCreated: conversation.created };
}

/**
 * Ingest a non-DM engagement (like/comment/reaction/mention/...).
 * Idempotent per (platform, externalId).
 */
export async function ingestInteraction(event: InboundInteractionEvent): Promise<IngestInteractionResult> {
  const resolved = await resolveIdentity({ ...event.actor, socialAccountId: event.socialAccountId ?? event.actor.socialAccountId, ownerType: event.ownerType, clientId: event.clientId });

  if (event.externalId) {
    const [dupe] = await db.select().from(socialInteractionsTable).where(and(
      eq(socialInteractionsTable.platform, event.platform),
      eq(socialInteractionsTable.externalId, event.externalId),
    ));
    if (dupe) {
      return { interactionId: dupe.id, contactId: resolved.contactId, deduped: true };
    }
  }

  const [interaction] = await db.insert(socialInteractionsTable).values({
    contactId: resolved.contactId,
    channelIdentityId: resolved.channelIdentityId,
    socialAccountId: event.socialAccountId ?? undefined,
    platform: event.platform,
    type: event.type,
    externalId: event.externalId ?? undefined,
    postId: event.postId ?? undefined,
    postUrl: event.postUrl ?? undefined,
    content: event.content ?? undefined,
    externalParentId: event.externalParentId ?? undefined,
    status: "new",
    ownerType: event.ownerType ?? "pmg",
    clientId: event.clientId ?? undefined,
    externalTimestamp: event.externalTimestamp ?? new Date(),
  }).returning();

  await emit("social.interaction.received", {
    entityType: "social_interaction",
    entityId: interaction.id,
    domain: "outreach",
    actor: event.platform,
    actorType: "system",
    data: {
      contactId: resolved.contactId,
      platform: event.platform,
      type: event.type,
      content: (event.content ?? "").slice(0, 140),
      newContact: resolved.created,
    },
  });
  broadcast("social_interaction", {
    interactionId: interaction.id,
    contactId: resolved.contactId,
    platform: event.platform,
    type: event.type,
  });

  return { interactionId: interaction.id, contactId: resolved.contactId, deduped: false };
}
