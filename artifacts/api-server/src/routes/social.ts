import { Router, type IRouter } from "express";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import {
  db,
  conversationsTable,
  messagesTable,
  socialInteractionsTable,
  socialAccountsTable,
  channelIdentitiesTable,
  contactsTable,
  companiesTable,
} from "@workspace/db";
import { getSessionUser } from "../middleware/auth";
import { listIdentitiesForContact, identityStats } from "../services/identity-service";
import { getSocialProvidersStatus, sendConversationReply } from "../services/social-providers-service";

// Social Command read/verify API (Phase 0). Serves the unified inbox data layer:
// conversations, their messages, non-DM interactions, connected accounts, and a
// contact's cross-channel identities. Typed OpenAPI hooks are deferred to the
// Phase 5 UI work — until then these are hand-written routes (the same
// precedent as the hand-written hooks in the frontend's use-api.ts).
//
// Everything returns REAL rows from the new tables. Until a provider is
// connected in a later phase, these lists are simply empty — an honest empty
// state, never fabricated sample data.

const router: IRouter = Router();

const contactNameSql = sql<string>`COALESCE(NULLIF(TRIM(CONCAT(${contactsTable.firstName}, ' ', ${contactsTable.lastName})), ''), ${contactsTable.firstName})`.as("contact_name");

// GET /social/conversations — inbox list, newest activity first.
router.get("/social/conversations", async (req, res): Promise<void> => {
  const conditions = [];
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const channel = typeof req.query.channel === "string" ? req.query.channel : undefined;
  const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
  if (status) conditions.push(eq(conversationsTable.status, status));
  if (channel) conditions.push(eq(conversationsTable.primaryChannel, channel));
  if (clientId !== undefined && !Number.isNaN(clientId)) conditions.push(eq(conversationsTable.clientId, clientId));

  const rows = await db
    .select({
      id: conversationsTable.id,
      contactId: conversationsTable.contactId,
      contactName: contactNameSql,
      companyId: conversationsTable.companyId,
      companyName: companiesTable.name,
      subject: conversationsTable.subject,
      primaryChannel: conversationsTable.primaryChannel,
      status: conversationsTable.status,
      priority: conversationsTable.priority,
      assignedTo: conversationsTable.assignedTo,
      unreadCount: conversationsTable.unreadCount,
      lastMessageAt: conversationsTable.lastMessageAt,
      lastMessagePreview: conversationsTable.lastMessagePreview,
      lastDirection: conversationsTable.lastDirection,
      firstInboundAt: conversationsTable.firstInboundAt,
      firstResponseAt: conversationsTable.firstResponseAt,
      intentScore: conversationsTable.intentScore,
      sentiment: conversationsTable.sentiment,
      convertedLeadId: conversationsTable.convertedLeadId,
      convertedOpportunityId: conversationsTable.convertedOpportunityId,
      clientId: conversationsTable.clientId,
      createdAt: conversationsTable.createdAt,
    })
    .from(conversationsTable)
    .leftJoin(contactsTable, eq(conversationsTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(conversationsTable.companyId, companiesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(conversationsTable.lastMessageAt));
  res.json(rows);
});

// GET /social/conversations/:id — thread detail + all messages (oldest first).
router.get("/social/conversations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [conversation] = await db
    .select({
      id: conversationsTable.id,
      contactId: conversationsTable.contactId,
      contactName: contactNameSql,
      companyId: conversationsTable.companyId,
      companyName: companiesTable.name,
      subject: conversationsTable.subject,
      primaryChannel: conversationsTable.primaryChannel,
      status: conversationsTable.status,
      priority: conversationsTable.priority,
      assignedTo: conversationsTable.assignedTo,
      unreadCount: conversationsTable.unreadCount,
      lastMessageAt: conversationsTable.lastMessageAt,
      firstInboundAt: conversationsTable.firstInboundAt,
      firstResponseAt: conversationsTable.firstResponseAt,
      intentScore: conversationsTable.intentScore,
      sentiment: conversationsTable.sentiment,
      convertedLeadId: conversationsTable.convertedLeadId,
      convertedOpportunityId: conversationsTable.convertedOpportunityId,
      clientId: conversationsTable.clientId,
      metadata: conversationsTable.metadata,
      createdAt: conversationsTable.createdAt,
    })
    .from(conversationsTable)
    .leftJoin(contactsTable, eq(conversationsTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(conversationsTable.companyId, companiesTable.id))
    .where(eq(conversationsTable.id, id));
  if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.externalTimestamp), asc(messagesTable.id));

  res.json({ ...conversation, messages });
});

// PATCH /social/conversations/:id — inbox actions: status, assignee, priority,
// mark read.
router.patch("/social/conversations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const patch: Record<string, unknown> = {};
  const { status, assignedTo, priority, markRead } = req.body ?? {};
  if (typeof status === "string" && ["open", "snoozed", "closed", "spam"].includes(status)) patch.status = status;
  if (typeof assignedTo === "string") patch.assignedTo = assignedTo;
  if (typeof priority === "string") patch.priority = priority;
  if (markRead === true) patch.unreadCount = 0;
  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }

  const [updated] = await db.update(conversationsTable).set(patch).where(eq(conversationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(updated);
});

// GET /social/interactions — non-DM engagement (likes/comments/mentions/...).
router.get("/social/interactions", async (req, res): Promise<void> => {
  const conditions = [];
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  if (status) conditions.push(eq(socialInteractionsTable.status, status));
  if (platform) conditions.push(eq(socialInteractionsTable.platform, platform));
  if (type) conditions.push(eq(socialInteractionsTable.type, type));

  const rows = await db
    .select({
      id: socialInteractionsTable.id,
      contactId: socialInteractionsTable.contactId,
      contactName: contactNameSql,
      platform: socialInteractionsTable.platform,
      type: socialInteractionsTable.type,
      postId: socialInteractionsTable.postId,
      postUrl: socialInteractionsTable.postUrl,
      content: socialInteractionsTable.content,
      intentScore: socialInteractionsTable.intentScore,
      sentiment: socialInteractionsTable.sentiment,
      status: socialInteractionsTable.status,
      convertedToLeadId: socialInteractionsTable.convertedToLeadId,
      convertedConversationId: socialInteractionsTable.convertedConversationId,
      externalTimestamp: socialInteractionsTable.externalTimestamp,
      createdAt: socialInteractionsTable.createdAt,
    })
    .from(socialInteractionsTable)
    .leftJoin(contactsTable, eq(socialInteractionsTable.contactId, contactsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(socialInteractionsTable.externalTimestamp));
  res.json(rows);
});

// PATCH /social/interactions/:id — triage: reviewed / ignored / converted.
router.patch("/social/interactions/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body ?? {};
  if (typeof status !== "string" || !["new", "reviewed", "converted", "ignored"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  const [updated] = await db.update(socialInteractionsTable).set({ status }).where(eq(socialInteractionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Interaction not found" }); return; }
  res.json(updated);
});

// GET /social/accounts — connected accounts (credentials stripped).
router.get("/social/accounts", async (_req, res): Promise<void> => {
  const rows = await db.select({
    id: socialAccountsTable.id,
    platform: socialAccountsTable.platform,
    provider: socialAccountsTable.provider,
    externalAccountId: socialAccountsTable.externalAccountId,
    displayName: socialAccountsTable.displayName,
    handle: socialAccountsTable.handle,
    status: socialAccountsTable.status,
    isActive: socialAccountsTable.isActive,
    webhookSubscribed: socialAccountsTable.webhookSubscribed,
    ownerType: socialAccountsTable.ownerType,
    clientId: socialAccountsTable.clientId,
    lastSyncAt: socialAccountsTable.lastSyncAt,
    lastSyncStatus: socialAccountsTable.lastSyncStatus,
    createdAt: socialAccountsTable.createdAt,
  }).from(socialAccountsTable).orderBy(desc(socialAccountsTable.updatedAt));
  res.json(rows);
});

// GET /social/contacts/:id/identities — a contact's cross-channel identities.
router.get("/social/contacts/:id/identities", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await listIdentitiesForContact(id);
  res.json(rows);
});

// GET /social/providers — which inbound channels are configured (booleans
// only, never secrets). Powers the honest connected/not-connected UI + lets the
// user verify their .env wiring reached the running app.
router.get("/social/providers", (_req, res): void => {
  res.json(getSocialProvidersStatus());
});

// POST /social/conversations/:id/reply — send a reply on the thread's channel.
// Only WhatsApp is send-capable this phase; others return an honest error.
router.post("/social/conversations/:id/reply", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) { res.status(400).json({ error: "Reply body is required" }); return; }
  const result = await sendConversationReply({ conversationId: id, body, performedBy: getSessionUser(req)?.name });
  if (!result.ok) { res.status(422).json(result); return; }
  res.json(result);
});

// GET /social/stats — quick counts for verifying the pipeline / dashboards.
router.get("/social/stats", async (req, res): Promise<void> => {
  const [[conv], [msg], [inter], identities] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(conversationsTable),
    db.select({ count: sql<number>`count(*)` }).from(messagesTable),
    db.select({ count: sql<number>`count(*)` }).from(socialInteractionsTable),
    identityStats(),
  ]);
  res.json({
    conversations: Number(conv?.count ?? 0),
    messages: Number(msg?.count ?? 0),
    interactions: Number(inter?.count ?? 0),
    identitiesByPlatform: identities,
    actor: getSessionUser(req)?.name ?? "system",
  });
});

export default router;
