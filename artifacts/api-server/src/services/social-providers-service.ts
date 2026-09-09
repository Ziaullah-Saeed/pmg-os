import { db, socialAccountsTable, leadsTable, conversationsTable, contactsTable, channelIdentitiesTable, messagesTable, syncLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import { ingestMessage, type InboundMessageEvent } from "./social-ingest-service";
import { emit } from "./event-bus";
import { broadcast } from "./websocket-service";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";

// ---------------------------------------------------------------------------
// Social Command — provider adapters (Phase 1 + WhatsApp Phase 2 shell).
//
// Each inbound source speaks its own payload shape. This file is the thin
// translation layer that turns a raw provider webhook into the canonical
// `InboundMessageEvent`/`InboundInteractionEvent` and hands it to the ingest
// pipeline (`social-ingest-service.ts`) — which owns identity resolution,
// threading, dedup, and event-bus/ws signals.
//
// Everything here is ENV-GATED and inert until credentials are present, so it
// ships dark and lights up the moment the user pastes keys into `.env`:
//   • Website form   — first-party, always on (no external creds needed).
//   • Meta Lead Ads  — needs META_VERIFY_TOKEN + META_APP_SECRET (+ a Page token to fetch answers).
//   • WhatsApp Cloud — needs WHATSAPP_VERIFY_TOKEN/APP_SECRET (inbound) + ACCESS_TOKEN/PHONE_NUMBER_ID (outbound).
//
// No secret is ever returned to a caller; `getSocialProvidersStatus()` reports
// only booleans so the UI can show an honest connected/not-connected state.
// ---------------------------------------------------------------------------

const DEFAULT_GRAPH_VERSION = "v21.0";

export type MetaConfig = {
  appSecret: string | null;
  verifyToken: string | null;
  pageAccessToken: string | null;
  graphVersion: string;
};

export type WhatsAppConfig = {
  appSecret: string | null;
  verifyToken: string | null;
  accessToken: string | null;
  phoneNumberId: string | null;
  graphVersion: string;
};

export function getMetaConfig(): MetaConfig {
  return {
    appSecret: process.env.META_APP_SECRET?.trim() || null,
    verifyToken: process.env.META_VERIFY_TOKEN?.trim() || null,
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN?.trim() || null,
    graphVersion: process.env.META_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION,
  };
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const meta = getMetaConfig();
  return {
    // WhatsApp can reuse the same Meta app secret/verify token, or set its own.
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || meta.appSecret,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || meta.verifyToken,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION?.trim() || meta.graphVersion,
  };
}

export function getWebsiteFormSecret(): string | null {
  return process.env.WEBSITE_FORM_SECRET?.trim() || null;
}

/** Booleans only — never leaks secret values. Powers the honest Settings state. */
export function getSocialProvidersStatus() {
  const meta = getMetaConfig();
  const wa = getWhatsAppConfig();
  return {
    websiteForm: { configured: true, secretProtected: !!getWebsiteFormSecret() },
    metaLeadAds: {
      inboundConfigured: !!(meta.verifyToken && meta.appSecret),
      canFetchAnswers: !!meta.pageAccessToken,
    },
    whatsapp: {
      inboundConfigured: !!(wa.verifyToken && wa.appSecret),
      outboundConfigured: !!(wa.accessToken && wa.phoneNumberId),
    },
  };
}

// --- Signature + subscription verification ---------------------------------

/**
 * Verify Meta's `X-Hub-Signature-256` over the RAW request body.
 * Mirrors the integration-hub convention: if no app secret is configured we
 * allow the request (so the user can test with ngrok before wiring the secret),
 * but we log that it was unverified.
 */
export function verifyMetaSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined, appSecret: string | null): { ok: boolean; verified: boolean; reason?: string } {
  if (!appSecret) return { ok: true, verified: false, reason: "no_app_secret" };
  if (!rawBody) return { ok: false, verified: false, reason: "no_raw_body" };
  if (!signatureHeader) return { ok: false, verified: false, reason: "no_signature" };
  const sig = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  if (sig.length !== expected.length) return { ok: false, verified: false, reason: "length_mismatch" };
  const match = timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  return { ok: match, verified: match, reason: match ? undefined : "signature_mismatch" };
}

/**
 * Meta/WhatsApp webhook subscription handshake (GET):
 * echo `hub.challenge` iff `hub.verify_token` matches EITHER configured token.
 */
export function resolveWebhookChallenge(query: Record<string, unknown>): { challenge: string } | { error: string } {
  const mode = String(query["hub.mode"] ?? "");
  const token = String(query["hub.verify_token"] ?? "");
  const challenge = String(query["hub.challenge"] ?? "");
  const accepted = [getMetaConfig().verifyToken, getWhatsAppConfig().verifyToken].filter(Boolean) as string[];
  if (mode !== "subscribe") return { error: "invalid hub.mode" };
  if (accepted.length === 0) return { error: "no verify token configured" };
  if (!accepted.includes(token)) return { error: "verify token mismatch" };
  return { challenge };
}

// --- social_accounts upsert (honest connected state) -----------------------

async function upsertSocialAccount(params: {
  platform: string;
  provider: string;
  externalAccountId: string;
  displayName?: string;
}): Promise<number> {
  const [existing] = await db.select().from(socialAccountsTable).where(and(
    eq(socialAccountsTable.platform, params.platform),
    eq(socialAccountsTable.externalAccountId, params.externalAccountId),
  ));
  if (existing) {
    await db.update(socialAccountsTable).set({
      status: "connected", isActive: true, webhookSubscribed: true,
      lastSyncAt: new Date(), lastSyncStatus: "receiving",
    }).where(eq(socialAccountsTable.id, existing.id));
    return existing.id;
  }
  const [created] = await db.insert(socialAccountsTable).values({
    platform: params.platform,
    provider: params.provider,
    externalAccountId: params.externalAccountId,
    displayName: params.displayName,
    status: "connected",
    isActive: true,
    webhookSubscribed: true,
    lastSyncAt: new Date(),
    lastSyncStatus: "receiving",
  }).returning();
  return created.id;
}

// --- shared: inbound hand-raise → pipeline lead ----------------------------

/**
 * Turn a resolved inbound conversation into a CRM lead and link it back to the
 * thread, then fire `lead.created` so the existing pipeline scores/routes it.
 * Idempotent: if the conversation is already converted, reuse that lead.
 */
async function createLeadFromSocial(params: {
  contactId: number;
  conversationId: number;
  platform: string;
  source: string;
  summary?: string | null;
}): Promise<number> {
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.conversationId));
  if (conv?.convertedLeadId) return conv.convertedLeadId;

  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, params.contactId));

  const [lead] = await db.insert(leadsTable).values({
    companyId: contact?.companyId ?? undefined,
    contactId: params.contactId,
    source: params.source,
    status: "new",
    priority: "medium",
    channelSource: params.platform,
    notes: params.summary ?? undefined,
  }).returning();

  await db.update(conversationsTable).set({ convertedLeadId: lead.id }).where(eq(conversationsTable.id, params.conversationId));

  await emit("lead.created", {
    entityType: "lead",
    entityId: lead.id,
    domain: "crm",
    actor: params.platform,
    actorType: "system",
    data: { source: params.source, channel: params.platform, conversationId: params.conversationId, inbound: true },
  });

  await createNotification({
    type: "social_lead_captured",
    severity: "info",
    title: `New ${params.platform} lead`,
    message: `Inbound ${params.platform} hand-raise captured as a lead${contact ? ` — ${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trimEnd() : ""}.`,
    domain: "crm",
    entityType: "lead",
    entityId: lead.id,
    actor: params.platform,
  }).catch(() => {});

  return lead.id;
}

// --- Website form (Phase 1) -------------------------------------------------

export type WebsiteFormPayload = Record<string, unknown>;

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** First-party website contact/lead form → threaded conversation + pipeline lead. */
export async function handleWebsiteFormSubmission(payload: WebsiteFormPayload): Promise<{ processed: boolean; conversationId?: number; leadId?: number; contactId?: number; error?: string }> {
  const email = pickString(payload, ["email", "email_address", "Email"]);
  const phone = pickString(payload, ["phone", "phone_number", "Phone"]);
  const fullName = pickString(payload, ["name", "full_name", "fullName", "Name"]);
  const firstName = pickString(payload, ["first_name", "firstName"]);
  const lastName = pickString(payload, ["last_name", "lastName"]);
  const company = pickString(payload, ["company", "company_name", "organization", "Company"]);
  const message = pickString(payload, ["message", "comments", "notes", "inquiry", "Message"]);
  const formName = pickString(payload, ["form_name", "formName", "form"]) ?? "Website form";
  const pageUrl = pickString(payload, ["page_url", "pageUrl", "url", "source_url"]);

  if (!email && !phone && !fullName && !firstName) {
    return { processed: false, error: "Form submission has no identifiable contact fields (name/email/phone)" };
  }

  // Stable per-person external id so re-submissions thread to the same contact.
  const externalUserId = email ?? phone ?? `web:${Date.now()}`;

  const summaryLines = [
    message && `Message: ${message}`,
    company && `Company: ${company}`,
    pageUrl && `Page: ${pageUrl}`,
  ].filter(Boolean) as string[];
  const body = message ?? `${formName} submission`;

  const result = await ingestMessage({
    platform: "website",
    direction: "inbound",
    actor: {
      platform: "website",
      externalUserId,
      displayName: fullName,
      firstName,
      lastName,
      email,
      phone,
      companyName: company,
    },
    body: [body, ...summaryLines.filter(l => !l.startsWith("Message:"))].join("\n").trim() || body,
    externalTimestamp: new Date(),
  });

  const leadId = await createLeadFromSocial({
    contactId: result.contactId,
    conversationId: result.conversationId,
    platform: "website",
    source: "website_form",
    summary: summaryLines.join(" · ") || body,
  });

  return { processed: true, conversationId: result.conversationId, leadId, contactId: result.contactId };
}

// --- Meta Lead Ads (Phase 1) ------------------------------------------------

type LeadgenValue = { leadgen_id?: string; form_id?: string; page_id?: string; ad_id?: string; created_time?: number };

async function fetchLeadgenAnswers(leadgenId: string, pageToken: string, graphVersion: string): Promise<{ field_data?: Array<{ name: string; values: string[] }>; created_time?: string; error?: string }> {
  try {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${leadgenId}`);
    url.searchParams.set("fields", "field_data,created_time,ad_id,form_id");
    url.searchParams.set("access_token", pageToken);
    const res = await fetch(url.toString());
    const json = await res.json() as any;
    if (!res.ok) return { error: `Graph ${res.status}: ${JSON.stringify(json?.error ?? json).slice(0, 200)}` };
    return json;
  } catch (err: any) {
    return { error: err?.message ?? "leadgen fetch failed" };
  }
}

function parseLeadFieldData(fields: Array<{ name: string; values: string[] }>): {
  email?: string; phone?: string; fullName?: string; firstName?: string; lastName?: string; company?: string; title?: string; summary: string;
} {
  const map = new Map<string, string>();
  for (const f of fields) map.set(f.name.toLowerCase(), (f.values ?? []).join(", "));
  const get = (...keys: string[]) => { for (const k of keys) { const v = map.get(k); if (v) return v; } return undefined; };
  const summary = fields.map(f => `${f.name}: ${(f.values ?? []).join(", ")}`).join("\n");
  return {
    email: get("email", "work_email"),
    phone: get("phone_number", "phone", "work_phone_number"),
    fullName: get("full_name", "name"),
    firstName: get("first_name"),
    lastName: get("last_name"),
    company: get("company_name", "company"),
    title: get("job_title", "title"),
    summary,
  };
}

async function handleLeadgen(value: LeadgenValue): Promise<{ processed: boolean; leadId?: number; conversationId?: number; error?: string }> {
  const meta = getMetaConfig();
  if (!value.leadgen_id) return { processed: false, error: "missing leadgen_id" };
  if (!meta.pageAccessToken) {
    // Honest: we received the notification but can't fetch answers without a Page token.
    return { processed: false, error: "META_PAGE_ACCESS_TOKEN not configured — cannot fetch lead answers" };
  }

  const fetched = await fetchLeadgenAnswers(value.leadgen_id, meta.pageAccessToken, meta.graphVersion);
  if (fetched.error || !fetched.field_data) return { processed: false, error: fetched.error ?? "no field_data returned" };

  const parsed = parseLeadFieldData(fetched.field_data);
  const socialAccountId = value.page_id
    ? await upsertSocialAccount({ platform: "facebook", provider: "meta", externalAccountId: value.page_id })
    : undefined;

  const result = await ingestMessage({
    platform: "facebook_lead",
    direction: "inbound",
    actor: {
      platform: "facebook_lead",
      externalUserId: parsed.email ?? parsed.phone ?? `fb_lead:${value.leadgen_id}`,
      displayName: parsed.fullName,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
      companyName: parsed.company,
    },
    body: parsed.summary,
    externalMessageId: `leadgen:${value.leadgen_id}`,
    socialAccountId,
    externalTimestamp: fetched.created_time ? new Date(fetched.created_time) : new Date(),
  });

  const leadId = await createLeadFromSocial({
    contactId: result.contactId,
    conversationId: result.conversationId,
    platform: "facebook_lead",
    source: "facebook_lead",
    summary: parsed.summary,
  });

  return { processed: true, leadId, conversationId: result.conversationId };
}

/** Dispatch a Meta Graph webhook (Page leadgen now; Messenger/IG are Phase 3). */
export async function handleMetaWebhook(payload: any): Promise<{ processed: boolean; handled: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let handled = 0, skipped = 0;

  const object = payload?.object;
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.field === "leadgen") {
        const r = await handleLeadgen(change.value ?? {});
        if (r.processed) handled++; else { skipped++; if (r.error) errors.push(r.error); }
      } else {
        // Messenger/Instagram DMs + comments land here once Phase 3 ships.
        skipped++;
      }
    }
    // Messenger delivers under `entry[].messaging[]` — reserved for Phase 3.
    if (Array.isArray(entry?.messaging) && entry.messaging.length) skipped += entry.messaging.length;
  }

  await db.insert(syncLogsTable).values({
    integrationId: "meta_webhook",
    direction: "inbound",
    entityType: `meta:${object ?? "unknown"}`,
    status: errors.length ? "partial" : "processed",
    error: errors.length ? errors.join("; ").slice(0, 500) : undefined,
    payload,
  }).catch(() => {});

  return { processed: handled > 0, handled, skipped, errors };
}

// --- WhatsApp Cloud API (Phase 2) ------------------------------------------

function extractWhatsAppBody(msg: any): { body: string; attachments?: InboundMessageEvent["attachments"] } {
  switch (msg.type) {
    case "text": return { body: msg.text?.body ?? "" };
    case "button": return { body: msg.button?.text ?? "" };
    case "interactive": {
      const i = msg.interactive;
      return { body: i?.button_reply?.title ?? i?.list_reply?.title ?? "[interactive reply]" };
    }
    case "image": case "video": case "audio": case "document": case "sticker": {
      const media = msg[msg.type];
      return {
        body: media?.caption ?? `[${msg.type}]`,
        attachments: [{ type: msg.type, url: media?.id ? `wa-media://${media.id}` : undefined, name: media?.filename, mime: media?.mime_type }],
      };
    }
    case "location": return { body: `[location] ${msg.location?.name ?? ""} ${msg.location?.latitude},${msg.location?.longitude}`.trim() };
    default: return { body: `[${msg.type ?? "message"}]` };
  }
}

/** Parse a WhatsApp Cloud API webhook → ingest each inbound message. */
export async function handleWhatsAppInbound(payload: any): Promise<{ processed: boolean; ingested: number; statuses: number; errors: string[] }> {
  const errors: string[] = [];
  let ingested = 0, statuses = 0;

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== "messages") continue;
      const value = change.value ?? {};
      const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
      const socialAccountId = phoneNumberId
        ? await upsertSocialAccount({ platform: "whatsapp", provider: "meta_cloud", externalAccountId: phoneNumberId, displayName: value?.metadata?.display_phone_number })
        : undefined;

      const nameByWaId = new Map<string, string>();
      for (const c of value?.contacts ?? []) if (c?.wa_id) nameByWaId.set(c.wa_id, c?.profile?.name ?? "");

      for (const msg of value?.messages ?? []) {
        try {
          const { body, attachments } = extractWhatsAppBody(msg);
          const from: string = msg.from;
          const r = await ingestMessage({
            platform: "whatsapp",
            direction: "inbound",
            actor: {
              platform: "whatsapp",
              externalUserId: from,
              handle: from,
              displayName: nameByWaId.get(from) || undefined,
              phone: from.startsWith("+") ? from : `+${from}`,
            },
            externalMessageId: msg.id,
            socialAccountId,
            body,
            attachments,
            externalTimestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
          });
          if (!r.deduped) ingested++;
        } catch (err: any) {
          errors.push(err?.message ?? "message ingest failed");
        }
      }

      // Delivery/read receipts → update our copy's status (best-effort).
      for (const st of value?.statuses ?? []) {
        statuses++;
        if (st?.id && st?.status) {
          await db.update(messagesTable).set({ status: st.status })
            .where(and(eq(messagesTable.channel, "whatsapp"), eq(messagesTable.externalMessageId, st.id)))
            .catch(() => {});
        }
      }
    }
  }

  await db.insert(syncLogsTable).values({
    integrationId: "whatsapp_webhook",
    direction: "inbound",
    entityType: "whatsapp:messages",
    status: errors.length ? "partial" : "processed",
    error: errors.length ? errors.join("; ").slice(0, 500) : undefined,
    payload,
  }).catch(() => {});

  return { processed: ingested > 0 || statuses > 0, ingested, statuses, errors };
}

/** Send a WhatsApp text message via the Cloud API. Gated on outbound config. */
export async function sendWhatsAppMessage(params: { to: string; body: string }): Promise<{ ok: boolean; externalMessageId?: string; error?: string }> {
  const cfg = getWhatsAppConfig();
  if (!cfg.accessToken || !cfg.phoneNumberId) {
    return { ok: false, error: "WhatsApp outbound not configured (set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID)" };
  }
  const to = params.to.replace(/^\+/, "");
  try {
    const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.accessToken}` },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: params.body } }),
    });
    const json = await res.json() as any;
    if (!res.ok) return { ok: false, error: `Graph ${res.status}: ${JSON.stringify(json?.error ?? json).slice(0, 200)}` };
    return { ok: true, externalMessageId: json?.messages?.[0]?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "send failed" };
  }
}

// --- Outbound reply from the unified inbox ---------------------------------

/**
 * Send a reply on the conversation's channel and thread the outbound message.
 * Only WhatsApp is send-capable in this phase; website/lead-ad have no reply
 * API and Messenger/IG arrive in Phase 3 — those return an honest error.
 */
export async function sendConversationReply(params: { conversationId: number; body: string; performedBy?: string }): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.conversationId));
  if (!conv) return { ok: false, error: "Conversation not found" };
  if (!conv.contactId) return { ok: false, error: "Conversation has no contact" };

  // Reply on the channel of the most recent inbound message (fallback: primary).
  const [lastInbound] = await db.select().from(messagesTable)
    .where(and(eq(messagesTable.conversationId, params.conversationId), eq(messagesTable.direction, "inbound")))
    .orderBy(desc(messagesTable.externalTimestamp), desc(messagesTable.id)).limit(1);
  const channel = lastInbound?.channel ?? conv.primaryChannel ?? "";

  if (channel !== "whatsapp") {
    return { ok: false, error: `Replying on "${channel}" isn't supported yet — only WhatsApp is send-capable in this phase.` };
  }

  const [identity] = await db.select().from(channelIdentitiesTable)
    .where(and(eq(channelIdentitiesTable.contactId, conv.contactId), eq(channelIdentitiesTable.platform, "whatsapp")))
    .orderBy(desc(channelIdentitiesTable.id)).limit(1);
  if (!identity) return { ok: false, error: "No WhatsApp identity for this contact" };

  const sent = await sendWhatsAppMessage({ to: identity.externalUserId, body: params.body });
  if (!sent.ok) return { ok: false, error: sent.error };

  const ingested = await ingestMessage({
    platform: "whatsapp",
    direction: "outbound",
    actor: { platform: "whatsapp", externalUserId: identity.externalUserId, handle: identity.handle ?? undefined, displayName: identity.displayName ?? undefined },
    externalMessageId: sent.externalMessageId,
    socialAccountId: identity.socialAccountId,
    body: params.body,
    sentByMode: "human_controlled",
    performedBy: params.performedBy,
    externalTimestamp: new Date(),
  });

  await logAudit({
    eventType: "social_reply_sent",
    domain: "outreach",
    action: "send_reply",
    description: `WhatsApp reply sent on conversation #${params.conversationId}`,
    entityType: "conversation",
    entityId: params.conversationId,
    actor: params.performedBy ?? "system",
    actorType: "human",
    metadata: { channel, externalMessageId: sent.externalMessageId },
  }).catch(() => {});

  broadcast("social_message", { conversationId: params.conversationId, messageId: ingested.messageId, contactId: conv.contactId, channel, direction: "outbound" });
  return { ok: true, messageId: ingested.messageId };
}
