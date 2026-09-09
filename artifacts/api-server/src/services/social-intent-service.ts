import {
  db,
  conversationsTable,
  messagesTable,
  socialInteractionsTable,
  contactsTable,
  leadsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { subscribe, emit, type EventPayload } from "./event-bus";
import { isDummyMode } from "./wallet-service";
import { shouldAiAct } from "./ai-mode-service";
import { callAI } from "./ai-service";
import { executeOrQueue, registerActionExecutor } from "./mode-action-service";
import { sendConversationReply } from "./social-providers-service";
import { createNotification } from "./notification-service";
import { broadcast } from "./websocket-service";

// ---------------------------------------------------------------------------
// Social Command — Phase 4: intent → deal.
//
// Subscribes to the canonical events emitted by `social-ingest-service`
// (`social.message.received`, `social.interaction.received`) and turns raw
// inbound engagement into a scored, actionable signal:
//
//   1. INTENT SCORE — a deterministic keyword heuristic runs ALWAYS (free, never
//      breaks, works in dummy mode). When real AI is on AND the mode allows, the
//      heuristic is REFINED by a wallet-billed AI classification. Scores persist
//      on the message / interaction and roll up to the conversation, so the
//      Phase-5 inbox intent chips reflect real warmth.
//
//   2. HIGH-INTENT → LEAD — a conversation scoring >= HIGH_INTENT that isn't
//      already converted is pushed to the pipeline through `executeOrQueue`
//      (tri-mode: Auto creates immediately, Hybrid/Human queue an approval).
//
//   3. AI REPLY DRAFT — for a warm inbound message, an AI-drafted reply is
//      stored on the conversation (surfaced in the inbox) and routed through
//      `executeOrQueue` as a "send reply" action (Auto sends when the channel is
//      send-capable, Hybrid/Human queue it for approval). Drafting only runs
//      with real AI on — we never fabricate a draft in dummy mode.
//
// Everything is best-effort and mode-safe: a blocked mode, dummy mode, a wallet
// block, or an unparseable model response degrades to the heuristic and never
// throws out of an event handler.
// ---------------------------------------------------------------------------

const REPLY_MIN_INTENT = 50; // draft a reply at/above this warmth
const HIGH_INTENT = 70; // convert the conversation to a pipeline lead at/above this

const STRONG_KEYWORDS = [
  "pricing", "price", "cost", "quote", "how much", "budget", "demo", "trial",
  "buy", "purchase", "order", "sign up", "signup", "get started", "onboard",
  "proposal", "contract", "invoice", "book a call", "schedule", "meeting",
  "interested", "ready", "subscribe", "hire", "engage", "when can we",
];
const MEDIUM_KEYWORDS = [
  "info", "information", "details", "learn more", "question", "help", "how do",
  "what is", "can you", "does it", "support", "availability", "features",
  "compare", "case study", "reference", "how does",
];
const POSITIVE_WORDS = ["thanks", "thank you", "great", "interested", "love", "awesome", "appreciate", "perfect", "excellent", "yes please", "sounds good"];
const NEGATIVE_WORDS = ["not interested", "unsubscribe", "stop", "cancel", "refund", "complaint", "angry", "terrible", "worst", "spam", "wrong number", "no thanks"];

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function heuristicSentiment(text: string): "positive" | "neutral" | "negative" {
  const t = (text ?? "").toLowerCase();
  if (NEGATIVE_WORDS.some((w) => t.includes(w))) return "negative";
  if (POSITIVE_WORDS.some((w) => t.includes(w))) return "positive";
  return "neutral";
}

/** Deterministic intent for an inbound DM/message. Always available. */
function heuristicMessageIntent(body: string | null | undefined): { score: number; sentiment: "positive" | "neutral" | "negative" } {
  const t = (body ?? "").toLowerCase().trim();
  let score = t ? 42 : 30; // any inbound hand-raise is at least lukewarm
  if (STRONG_KEYWORDS.some((k) => t.includes(k))) score = 82;
  else if (MEDIUM_KEYWORDS.some((k) => t.includes(k))) score = 58;
  if (t.includes("?")) score += 8;
  const sentiment = heuristicSentiment(t);
  if (sentiment === "negative") score = Math.min(score, 25);
  return { score: clamp(score), sentiment };
}

/** Deterministic intent for a non-DM engagement (like/comment/mention/...). */
function heuristicInteractionIntent(type: string, content: string | null | undefined): { score: number; sentiment: "positive" | "neutral" | "negative" } {
  const t = (type ?? "").toLowerCase();
  const c = (content ?? "").toLowerCase();
  let base: number;
  if (t.includes("comment") || t.includes("reply")) base = STRONG_KEYWORDS.some((k) => c.includes(k)) ? 78 : 55;
  else if (t.includes("mention")) base = 55;
  else if (t.includes("share")) base = 45;
  else if (t.includes("follow")) base = 30;
  else if (t.includes("reaction")) base = 22;
  else if (t.includes("like")) base = 20;
  else base = 25;
  return { score: clamp(base), sentiment: heuristicSentiment(c) };
}

/**
 * AI refinement of an intent score. Best-effort: returns null in dummy mode, a
 * blocked/human mode, a wallet block, or on any unparseable response — the
 * caller then keeps the deterministic heuristic. Pre-checks the mode gate so we
 * never emit a "Human Action Required" notification for a background classifier.
 */
async function aiRefineIntent(params: { kind: "message" | "interaction"; text: string; channel: string; contactName?: string | null }): Promise<{ score: number; sentiment: string } | null> {
  if (isDummyMode()) return null;
  if (!params.text || !params.text.trim()) return null;
  try {
    const gate = await shouldAiAct("social_intent", undefined, undefined, undefined);
    if (!gate.canAct) return null;
  } catch {
    /* fall through and attempt — callAI re-checks */
  }
  try {
    const { result } = await callAI({
      systemPrompt: `You score inbound social/messaging engagement for PMG Group LLC (a cybersecurity/IT marketing agency) by buying intent. Higher = closer to a sales conversation. A pricing/demo/"how much"/booking request is HIGH; a general question is MEDIUM; a like/emoji/greeting is LOW; an unsubscribe/complaint/wrong-number is very low.
Return EXACTLY this format, nothing else:
SCORE: <integer 0-100>
SENTIMENT: <positive|neutral|negative>`,
      userPrompt: `Channel: ${params.channel}
Type: ${params.kind}
From: ${params.contactName ?? "unknown"}
Content: ${params.text.slice(0, 600)}`,
      workflowKey: "social_intent",
      tool: "ai-score-social-intent",
      domain: "outreach",
      action: "score_social_intent",
    });
    const scoreMatch = result.match(/SCORE:\s*(\d+)/i);
    const sentMatch = result.match(/SENTIMENT:\s*(positive|neutral|negative)/i);
    if (!scoreMatch) return null;
    return { score: clamp(parseInt(scoreMatch[1], 10)), sentiment: sentMatch ? sentMatch[1].toLowerCase() : "neutral" };
  } catch {
    return null;
  }
}

/**
 * AI-draft a reply to a warm inbound message. Best-effort + mode-gated like the
 * scorer; returns null when it can't (dummy / blocked / unparseable) so no
 * fabricated draft is ever surfaced.
 */
async function aiDraftReply(params: { channel: string; message: string; contactName?: string | null; company?: string | null }): Promise<string | null> {
  if (isDummyMode()) return null;
  if (!params.message || !params.message.trim()) return null;
  try {
    const gate = await shouldAiAct("social_reply", undefined, undefined, undefined);
    if (!gate.canAct) return null;
  } catch {
    /* fall through */
  }
  try {
    const { result } = await callAI({
      systemPrompt: `You draft short, friendly, professional replies to inbound ${params.channel} messages for PMG Group LLC, a cybersecurity/IT marketing agency. Be concise (2-4 sentences), answer the person's question, and move toward a call/next step without being pushy. Write only the reply text — no preamble, no signature block.`,
      userPrompt: `Reply to this inbound ${params.channel} message from ${params.contactName ?? "a prospect"}${params.company ? ` at ${params.company}` : ""}:\n"${params.message.slice(0, 600)}"`,
      workflowKey: "social_reply",
      tool: "ai-draft-social-reply",
      domain: "outreach",
      action: "draft_social_reply",
    });
    const draft = (result ?? "").trim();
    return draft && !draft.startsWith("[DUMMY]") ? draft : null;
  } catch {
    return null;
  }
}

/** Create a pipeline lead from a high-intent conversation. Idempotent on convertedLeadId. */
async function convertConversationToLead(params: { conversationId: number; contactId: number | null; platform: string; score: number }): Promise<{ leadId: number; created: boolean }> {
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.conversationId));
  if (!conv) throw new Error("Conversation not found");
  if (conv.convertedLeadId) return { leadId: conv.convertedLeadId, created: false };

  const contactId = params.contactId ?? conv.contactId ?? undefined;
  const [contact] = contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, contactId))
    : [undefined as any];

  const [lead] = await db.insert(leadsTable).values({
    companyId: contact?.companyId ?? conv.companyId ?? undefined,
    contactId: contactId,
    source: params.platform,
    status: "new",
    priority: params.score >= 80 ? "high" : "medium",
    channelSource: params.platform,
    fitScore: params.score,
    createdByMode: "ai_autonomous",
    notes: `High-intent inbound ${params.platform} conversation (intent ${params.score}).`,
  } as any).returning();

  await db.update(conversationsTable).set({ convertedLeadId: lead.id }).where(eq(conversationsTable.id, params.conversationId));

  await emit("lead.created", {
    entityType: "lead",
    entityId: lead.id,
    domain: "crm",
    actor: "social_intent",
    actorType: "system",
    data: { source: params.platform, channel: params.platform, conversationId: params.conversationId, inbound: true, intentScore: params.score },
  });

  broadcast("social_conversation_converted", { conversationId: params.conversationId, leadId: lead.id });
  return { leadId: lead.id, created: true };
}

/** Persist the AI reply draft onto the conversation so the inbox can surface it. */
async function storeSuggestedReply(conversationId: number, draft: string): Promise<void> {
  const [conv] = await db.select({ metadata: conversationsTable.metadata }).from(conversationsTable).where(eq(conversationsTable.id, conversationId));
  const metadata = { ...((conv?.metadata as Record<string, unknown>) ?? {}), suggestedReply: draft, suggestedReplyAt: new Date().toISOString() };
  await db.update(conversationsTable).set({ metadata }).where(eq(conversationsTable.id, conversationId));
}

async function onMessageReceived(_event: string, payload: EventPayload): Promise<void> {
  const conversationId = payload.entityId;
  const messageId = payload.data?.messageId as number | undefined;
  const channel = (payload.data?.channel as string) ?? "";
  if (!conversationId || !messageId) return;

  const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!message || message.direction !== "inbound") return;
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
  if (!conv) return;
  const [contact] = conv.contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, conv.contactId))
    : [undefined as any];
  const contactName = contact ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() : null;

  // 1. Score (heuristic → AI refine).
  const heur = heuristicMessageIntent(message.body);
  const refined = await aiRefineIntent({ kind: "message", text: message.body ?? "", channel, contactName });
  const score = refined?.score ?? heur.score;
  const sentiment = refined?.sentiment ?? heur.sentiment;

  await db.update(messagesTable).set({ intentScore: score, sentiment }).where(eq(messagesTable.id, messageId));
  await db.update(conversationsTable).set({
    intentScore: Math.max(conv.intentScore ?? 0, score),
    sentiment,
  }).where(eq(conversationsTable.id, conversationId));
  broadcast("social_intent_scored", { conversationId, messageId, score, sentiment });

  // 2. High intent → convert to a pipeline lead (tri-mode gated), if not already.
  if (score >= HIGH_INTENT && !conv.convertedLeadId) {
    await executeOrQueue({
      actionType: "social_convert",
      workflowKey: "social_convert", // unregistered → follows global mode (Auto acts, Hybrid/Human queue)
      entityType: "conversation",
      entityId: conversationId,
      title: `Convert high-intent ${channel} conversation to lead`,
      description: `${contactName ?? "A prospect"} scored ${score} intent on ${channel}. Create a qualified pipeline lead?`,
      confidence: score,
      aiRecommendation: "Create a qualified lead from this conversation",
      aiParts: "Scores inbound intent, detects high buying signal, creates the lead + fires pipeline scoring/routing",
      humanParts: "Confirm the conversation is a real prospect before it enters the pipeline",
      metadata: { conversationId, contactId: conv.contactId, platform: channel, score },
      executeAction: async () => convertConversationToLead({ conversationId, contactId: conv.contactId, platform: channel, score }),
    }).catch((err) => console.error("[SocialIntent] convert failed:", err?.message));
  }

  // 3. Warm inbound → AI-draft a reply (real AI only) and route it tri-mode.
  if (score >= REPLY_MIN_INTENT) {
    const draft = await aiDraftReply({ channel, message: message.body ?? "", contactName, company: null });
    if (draft) {
      await storeSuggestedReply(conversationId, draft);
      await executeOrQueue({
        actionType: "social_reply",
        workflowKey: "social_reply", // unregistered → follows global mode
        entityType: "conversation",
        entityId: conversationId,
        title: `Reply to ${contactName ?? "prospect"} on ${channel}`,
        description: `AI drafted a reply to a warm inbound ${channel} message (intent ${score}).`,
        confidence: score,
        aiRecommendation: draft,
        aiParts: "Reads the inbound message, drafts a concise on-brand reply, sends it on the channel",
        humanParts: "Review/edit the draft and approve the send",
        metadata: { conversationId, draft, channel },
        executeAction: async () => {
          const r = await sendConversationReply({ conversationId, body: draft, performedBy: "ai_social_agent" });
          if (!r.ok) throw new Error(r.error ?? "send failed");
          return r;
        },
      }).catch((err) => console.error("[SocialIntent] reply failed:", err?.message));
    }
  }
}

async function onInteractionReceived(_event: string, payload: EventPayload): Promise<void> {
  const interactionId = payload.entityId;
  if (!interactionId) return;
  const [interaction] = await db.select().from(socialInteractionsTable).where(eq(socialInteractionsTable.id, interactionId));
  if (!interaction) return;
  const [contact] = interaction.contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, interaction.contactId))
    : [undefined as any];
  const contactName = contact ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() : null;

  const heur = heuristicInteractionIntent(interaction.type, interaction.content);
  const refined = await aiRefineIntent({ kind: "interaction", text: `${interaction.type}: ${interaction.content ?? ""}`, channel: interaction.platform, contactName });
  const score = refined?.score ?? heur.score;
  const sentiment = refined?.sentiment ?? heur.sentiment;

  await db.update(socialInteractionsTable).set({ intentScore: score, sentiment }).where(eq(socialInteractionsTable.id, interactionId));
  broadcast("social_intent_scored", { interactionId, score, sentiment });

  // A high-intent comment/mention is worth flagging for triage (kept as a signal,
  // not auto-converted — the Phase-5 Interactions view has a manual "CRM" action).
  if (score >= HIGH_INTENT) {
    await createNotification({
      type: "social_warm_signal",
      severity: "info",
      title: `Warm ${interaction.platform} signal`,
      message: `${contactName ?? "Someone"} left a high-intent ${interaction.type} on ${interaction.platform} (intent ${score}).`,
      domain: "outreach",
      entityType: "social_interaction",
      entityId: interactionId,
      actor: "social_intent",
    }).catch(() => {});
  }
}

/** On Hybrid/Human approval of a queued reply, send the stored draft. */
function registerSocialExecutors(): void {
  registerActionExecutor("social_reply", async (metadata) => {
    const { conversationId, draft } = metadata ?? {};
    if (!conversationId || !draft) throw new Error("Missing reply draft");
    const r = await sendConversationReply({ conversationId, body: draft, performedBy: "human_approved" });
    if (!r.ok) throw new Error(r.error ?? "send failed");
    return r;
  });

  registerActionExecutor("social_convert", async (metadata) => {
    const { conversationId, contactId, platform, score } = metadata ?? {};
    if (!conversationId) throw new Error("Missing conversationId");
    return convertConversationToLead({ conversationId, contactId: contactId ?? null, platform: platform ?? "social", score: score ?? HIGH_INTENT });
  });
}

export function initSocialIntent(): void {
  registerSocialExecutors();
  subscribe("social.message.received", (e, p) => onMessageReceived(e, p).catch((err) => console.error("[SocialIntent] message handler:", err?.message)));
  subscribe("social.interaction.received", (e, p) => onInteractionReceived(e, p).catch((err) => console.error("[SocialIntent] interaction handler:", err?.message)));
  console.log("[SocialIntent] Initialized — tri-mode intent scoring, reply drafting, high-intent conversion");
}

export { heuristicMessageIntent, heuristicInteractionIntent, REPLY_MIN_INTENT, HIGH_INTENT };
