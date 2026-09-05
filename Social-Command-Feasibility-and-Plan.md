# Social Command — Feasibility Study & Implementation Plan

> **Purpose:** Clear the vision for the Outreach → **Social Command** feature so you can make funding, provider, and risk decisions with eyes open. Research only — **nothing implemented**.
> **Date:** 2026-09-05 · **Author:** Claude (research pass) · **Status:** Decision document

---

## 0. TL;DR — Read This First

You want two distinct things under "Social Command," and they have **very different feasibility**:

1. **Unified inbound social inbox** — capture *everyone who messages or interacts with the client* (DMs, comments, likes, reactions, mentions, website form fills) across LinkedIn, Facebook, Instagram, WhatsApp, X, and the website — into **one threaded conversation history per person**, even when that person touched you in 5 different places.
2. **Interaction → deal** — turn a comment / like / DM / form fill into a scored lead that flows into the existing CRM pipeline.

**The honest verdict, by channel:**

| Channel | Read DMs | Read comments/likes | Reply | Legit path exists? | Verdict |
|---|:---:|:---:|:---:|:---:|---|
| **WhatsApp** | ✅ | n/a | ✅ | ✅ Official (Cloud API) | 🟢 **Build first. Best channel.** |
| **Website form** | ✅ | n/a | ✅ | ✅ First-party | 🟢 **Nearly done already** (webhook receiver exists) |
| **Facebook Page / Messenger** | ✅ | ✅ | ✅ | ✅ Official (needs App Review) | 🟢 **Build. Fully legit.** |
| **Instagram (Business)** | ✅ | ✅ | ✅ | ✅ Official (needs App Review) | 🟢 **Build. Comment→DM is a killer feature.** |
| **Facebook / IG Lead Ads** | n/a | n/a | n/a | ✅ Official webhook | 🟢 **Cheap win** (scope already scaffolded) |
| **X / Twitter** | ⚠️ | ⚠️ | ⚠️ | ✅ Official but pay-per-use, capped | 🟡 **Defer / minimal.** Cost & caps hurt ROI. |
| **LinkedIn (personal DMs + post comments/likes)** | ❌ officially | ❌ officially | ❌ officially | ⚠️ Only via gray-market (ToS violation, ban risk) | 🔴 **The hard one. See §3.** |
| **LinkedIn (Company Page comments)** | n/a | ⚠️ gated partner | ⚠️ | ✅ Community Management API (1–4 wk review) | 🟡 **Partial, gated.** |

**The single most important finding:** the channel your cyber/IT buyers live on — **LinkedIn personal DMs and post engagement — has NO compliant API.** LinkedIn permanently blocks third-party access to member inboxes, and comment/reaction read is restricted to a handful of vetted partners. The *only* way to deliver "see who commented/liked/messaged me on LinkedIn and reply from PMG OS" is a **gray-market provider that drives the member's real session (e.g. Unipile), which violates LinkedIn's User Agreement and carries real account-ban risk** — and 2026 enforcement is faster and harsher than ever. This isn't a build problem; it's a policy wall. §3 lays out your three options.

**My recommendation (detailed in §11):** Build a **legit Meta-first core** (WhatsApp + Messenger + Instagram + Lead Ads + website) that covers the majority of inbound and is 100% compliant, then offer **LinkedIn as an opt-in, client-consented, "your account / your risk" connection via Unipile** — because there is no other way, and it's where the money is. Treat X as a "nice later."

---

## 1. What You Asked For (restated)

> The Social Command lets a *client* connect their own social accounts — LinkedIn, Facebook, Twitter/X, WhatsApp, and more — and converts people who **interact** (comment, like, DM, reply, fill a website form) into managed relationships and, ultimately, **deals**. All conversation history for a given person must be visible **in one place inside PMG OS**, even when the conversation is spread across LinkedIn, Facebook, the website contact form, etc.

Two mental models to keep separate:

- **Prospect Finder (Apollo/PDL)** = *outbound*. You go find strangers who match an ICP and reach out cold.
- **Social Command** = *inbound*. Warm humans who already raised their hand (they messaged, commented, liked, or filled a form) get captured, unified, scored, and converted.

Social Command is the **higher-intent** half of the funnel. A person who comments "how much?" on a LinkedIn post is worth 20 cold Apollo leads.

---

## 2. What Already Exists in PMG OS (we are extending, not starting from zero)

Good news — the skeleton is already here. The plan **builds on** these, it doesn't replace them:

| Existing asset | File | What it gives us |
|---|---|---|
| **Channels table** | `lib/db/src/schema/channels.ts` | `platform`, `type`, `category`, `status`, `credentials`, `webhookUrl/Secret`, `autoSync`, per-client `ownerType/clientId`, lead/conversion counters. A connected social account maps cleanly to a `channel` row. |
| **Integrations + OAuth engine** | `integration-hub-service.ts` | Full OAuth2 authorize→token→refresh flow, an API-key path, a **webhook receiver with HMAC signature verify**, sync logging + retry. Already has `linkedin` and `meta` in `SUPPORTED_PROVIDERS` (with scopes) — though the sync body is currently a stub. |
| **Webhook handlers** | `integration-hub-service.ts` | `handleLeadWebhook` / `handleFormSubmission` already turn an inbound form/lead webhook into a `lead` + `contact` + `lead.created` event. `facebook_lead` source is already registered. **Website contact form is basically done.** |
| **Communications log** | `communications.ts` route + schema | The current "Social Command" tab reads inbound rows from here. **Limitation:** it's a *flat activity log* — no threading, no external message IDs, no attachments, no per-channel identity. We'll add a proper threaded model alongside it (§7). |
| **Event bus + agents + pipeline** | `event-bus.ts`, `agent-executor.ts`, `pipeline-engine.ts`, `lead-router.ts` | The rails that turn a `lead.created` event into scoring → routing → opportunity. Social interactions plug straight in. |
| **Tri-mode + wallet** | `ai-service.ts`, `ai-mode-service.ts`, `wallet-service.ts` | AI reply drafting / intent scoring is already governed (Auto / Hybrid / Human) and billed. The "AI drafts, human approves" hybrid mode is *exactly* the right UX for social replies. |
| **Attribution + timeline** | `attribution_events` table, `activity-timeline.ts` | First-touch/multi-touch attribution and a unified per-contact timeline already exist — we feed social touchpoints in. |
| **Opt-out + channel health** | `/opt-out`, `/channel-health` | Compliance plumbing (unsubscribe, per-channel health) already built for Legal & Compliance. |

**The current Social Command tab** (`outreach.tsx` → `SocialCommand`) is an honest placeholder: it filters `communications` for `direction = inbound` and lets you log a reply. It is *not* connected to any real social platform. This plan makes it real.

---

## 3. The LinkedIn Problem (the crux of your decision)

LinkedIn is where cybersecurity/IT decision-makers actually engage — so this is the make-or-break channel. Here is the unvarnished reality as of 2026:

### What the **official** LinkedIn API allows
- **Direct messages: NOT available to third-party developers. Full stop.** Member inboxes are not exposed by any self-serve or partner product for sales/CRM use.
- **Comments / reactions on posts:** the `socialActions` (Comments) endpoint exists, but *reading comments on behalf of a member* is a **restricted permission granted to select partners only**. For most developers it's off-limits.
- **Company Page** posting, comments, and analytics live behind the **Community Management API**, which requires **LinkedIn Partner Program** approval (typically 1–4 weeks of review) and is oriented to *your own* Page, not monitoring arbitrary member engagement.
- **LinkedIn Compliance / Messaging API** (the one that *can* read messages) exists **only** for regulated-industry archiving (the Global Relay / Smarsh world) under enterprise contracts — not accessible to a marketing-agency SaaS.

**Net:** the official API cannot deliver "who DM'd / commented / liked, and let me reply" for a personal LinkedIn profile. It can, with a gated partner approval, do limited Company-Page comment management.

### What the **gray-market** providers do (Unipile, HeyReach, PhantomBuster, LinkedAPI, etc.)
- They connect by **driving the member's real logged-in session** (cookie/session, hosted browser). That *does* unlock the full inbox, comments, reactions, connection activity — the whole thing you want.
- **But it violates LinkedIn's User Agreement** (which prohibits automated access, scraping, and using session cookies), and **the connected account can be restricted or permanently banned.** Unipile itself states it is "not affiliated with LinkedIn" and that use "puts the account whose session it borrows at risk."
- Providers add proxy management + rate limiting to *reduce* the risk. It does **not** eliminate it, and **2026 enforcement escalated** (faster, broader restrictions).

### Your three LinkedIn options

| Option | What you get | ToS / ban risk | Cost | My take |
|---|---|---|---|---|
| **A. Official only** | Company-Page comment management (gated partner approval). No personal DMs, no personal-post engagement. | None | Free (approval effort) | Safe but delivers ~10% of the vision. Honest, but weak. |
| **B. Gray-market (Unipile)** | The *full* dream: personal DMs, comments, likes, reactions, reply — unified. Also covers WhatsApp/IG/Messenger/X/Telegram/email in the same API. | **Real.** Client's account can be banned. | €49/mo + €5/linked account/mo | The only path to the real feature. Must be **opt-in, consented, risk-disclosed, hard rate-limited.** |
| **C. Hybrid (recommended)** | Ship legit Meta core now; offer LinkedIn via Unipile as an explicit **"connect your own account — at your own risk"** toggle with a signed disclaimer. | Isolated to LinkedIn, client-accepted | Only pay Unipile if a client opts into LinkedIn | Best balance of value, honesty, and legal posture. |

> **Product framing that makes B/C defensible:** the *client* connects *their own* account and *accepts the risk* (just like they would using any LinkedIn automation tool — Dux-Soup, Expandi, HeyReach all operate this way and the market accepts it). PMG OS is the tool; the client is the actor. Put the risk in the ToS, show it at connect time, and rate-limit conservatively. This is the same posture every LinkedIn-automation SaaS runs on.

---

## 4. Suggested Providers

### 4.1 Recommended stack

| Capability | Recommended provider | Why | Auth already scaffolded? |
|---|---|---|---|
| **WhatsApp** | **Meta WhatsApp Business Cloud API** (direct) or a BSP (**360dialog**, Twilio) | Official, robust, full send/receive + webhooks + history. BSP saves infra + eases number onboarding. | `meta` provider exists; add WhatsApp scopes |
| **Facebook Page + Messenger** | **Meta Graph API / Messenger Platform** (direct) | Official DMs + comment read/reply + webhooks. | ✅ `meta` in `SUPPORTED_PROVIDERS` |
| **Instagram (Business/Creator)** | **Meta Instagram Messaging + Graph API** (direct) | Official DMs, comment read, **comment→DM automation**. | ✅ via `meta` |
| **Facebook / IG Lead Ads** | **Meta Lead Ads webhook** (`leads_retrieval`) | Real-time lead capture; scope already listed. | ✅ scope present |
| **Website contact form** | **First-party** (embed widget + existing webhook receiver) | Already handled by `handleFormSubmission`. | ✅ done |
| **LinkedIn (personal)** | **Unipile** (opt-in, see §3) | Only viable path to DMs + engagement; also a fallback aggregator for the others. | Add `unipile` provider |
| **X / Twitter** | **X API v2** (pay-per-use) — *defer* | Works but costly & capped in 2026. Low priority for B2B cyber. | Add later |
| **Email** | Existing (IMAP/Gmail/Outlook) — Unipile can also unify this | Already partially modeled as `communications.type = email`. | Partial |

### 4.2 The "one vendor vs. build-direct" trade-off

**Unipile (aggregator):** one API unifies LinkedIn, WhatsApp, Instagram, Messenger, X, Telegram, Gmail/Outlook/IMAP. **€49/mo up to 10 linked accounts, then ~€3–5/account/mo**, unlimited API calls. Fastest path to *many* channels. **Downsides:** the LinkedIn portion is gray-market (ToS risk); you pay per connected account; you're dependent on their session-health engineering.

**Direct Meta (build-yourself):** WhatsApp/Messenger/Instagram/FB comments/Lead Ads are all first-class, **fully compliant**, and cheap (you only pay Meta's per-message WhatsApp fees). **Downside:** you build and maintain each integration + pass Meta App Review (stricter in 2026).

**Ready-made inboxes (Bird, Respond.io, Wati, Twilio Flex):** these are *products*, not embeddable SaaS backends. They'd **compete with** PMG OS's own inbox rather than power it. Use them for **inspiration/UX benchmarking**, not as a dependency. (Twilio/Sinch/Infobip are usable as raw WhatsApp/SMS *infrastructure* if you don't want to be a Meta BSP yourself.)

**Recommendation:** **Direct Meta for the compliant core + Unipile only for LinkedIn (and optionally X/Telegram/email as a bonus).** This gives you legitimacy where it's free and coverage where it's impossible otherwise, and isolates all ToS risk to the one channel that has no alternative.

---

## 5. Cost Model (what the client pays)

| Item | Cost | Notes |
|---|---|---|
| Meta app + App Review | **Free** | Cost is *effort* (business verification, screencasts, opt-out flows). 2026 review is strict — budget 2–4 weeks. |
| WhatsApp — service replies (within 24h of user message) | **Free** | All non-template messages in the customer-service window are free. |
| WhatsApp — Click-to-WhatsApp / Page-CTA entry | **Free for 72h** | Big incentive to drive inbound via WhatsApp CTAs. |
| WhatsApp — business-initiated templates | **~$0.025/msg US** (India ~$0.009, Germany ~$0.12) | Per-message since Jul 2025. BSP adds $0.003–0.01/msg markup. Marketing/utility/auth categories priced differently. |
| Unipile (if LinkedIn/aggregator) | **€49/mo + ~€3–5/account/mo** | One "account" = one WhatsApp *or* one LinkedIn *or* one mailbox. Post-paid on peak simultaneous accounts. |
| X / Twitter API | **Pay-per-use:** $0.015/post, $0.005/read (cap 2M reads/mo), no free tier | Enterprise ~$42k/mo. Reason to defer. |
| PMG OS wallet (AI) | Existing `TOOL_COSTS` | Intent scoring + reply drafting bill the wallet like every other AI call. |

**Implication for your pricing:** WhatsApp inbound is nearly free to run; LinkedIn adds a per-account Unipile line item you can pass through or bundle into a higher tier. This is a clean upsell structure ("Social Command Pro = LinkedIn included").

---

## 6. Feasibility of the "Unified History Across Places" Requirement

> *"All conversation history should be available in our platform even if it is in multiple places — LinkedIn, Facebook, website form, and many more."*

**Achievable — this is the highest-value, most defensible part of the vision, and it's fully compliant.** The mechanism is **identity resolution + a threaded conversation model**:

1. Every inbound event (DM, comment, form fill, mention) carries a **platform identity** (LinkedIn URN, Messenger PSID, IG-scoped ID, phone number, email).
2. A **`channel_identities`** table maps each platform identity → a single resolved **`contact`**. Matching rules: exact email/phone match → auto-merge; same name + same company → suggest merge; otherwise create new + allow manual merge.
3. All messages attach to a **`conversation`** which belongs to the resolved contact. The contact's timeline then shows **one unified thread** — "LinkedIn DM → website form → WhatsApp reply → Messenger comment" — regardless of origin.

**How far it goes:** for any channel we can legitimately read (WhatsApp, Messenger, Instagram, website, email — and LinkedIn *if* connected via Unipile), we get the **full history from the moment the account is connected forward.** Deep backfill of *old* history varies: WhatsApp/Meta give limited historical backfill; LinkedIn-via-Unipile can sync existing threads. Set the expectation: **"from connection onward, complete; before connection, best-effort."**

---

## 7. How It Fits PMG OS — Architecture

```
                    ┌─────────────────────── INBOUND SOURCES ───────────────────────┐
  WhatsApp Cloud API   Messenger/IG (Meta)   FB/IG Lead Ads   Website form   LinkedIn (Unipile)   X (later)
        │                    │                     │               │                │
        └──────── webhooks / polling ──────────────┴───────────────┴────────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  channel-manager (new svc)    │  normalizes every provider payload
                    │  extends integration-hub      │  → a canonical InboundEvent
                    └──────────────┬───────────────┘
                                   │
             ┌─────────────────────▼─────────────────────┐
             │  identity resolution (channel_identities)  │  map platform id → contact
             └─────────────────────┬─────────────────────┘
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        ▼                          ▼                            ▼
  conversations/messages    social_interactions           event-bus emit
  (threaded inbox)          (likes/comments/mentions)     "social.message.received"
        │                          │                            │
        └──────────────┬───────────┴──────────────┬─────────────┘
                       ▼                           ▼
             AI intent scoring            tri-mode reply drafting
             (agent-executor,             (Auto = auto-reply,
              wallet-billed)               Hybrid = draft+approve,
                       │                    Human = manual)
                       ▼
              high intent → lead.created → existing pipeline → opportunity → deal
```

Everything downstream of "identity resolution" **already exists**. The new work is the left half: provider adapters, a normalization layer, threading, and identity resolution.

---

## 8. Data Model Changes (proposed — not yet built)

Additive only; nothing destructive. (⚠️ note per §14: `drizzle-kit push` is currently blocked by data-loss drift, so these go in as `ALTER TABLE`/`CREATE TABLE` — the established pattern in this repo.)

| Table | Purpose | Key columns |
|---|---|---|
| **`social_accounts`** *(or reuse `channels`)* | A client-connected account per platform | `platform`, `externalAccountId`, `displayName`, `credentials`, `status`, `clientId`, `connectedVia` (`meta`/`unipile`/`webhook`) |
| **`channel_identities`** | Identity graph: platform handle → contact | `contactId`, `platform`, `externalUserId`, `handle`, `confidence`, `mergedFrom` |
| **`conversations`** | A thread with one person on one-or-more channels | `contactId`, `primaryChannel`, `status` (open/snoozed/closed), `lastMessageAt`, `assignedTo`, `unreadCount`, `firstResponseAt` (SLA) |
| **`messages`** | Individual messages in a conversation | `conversationId`, `channel`, `direction`, `externalMessageId`, `body`, `attachments` (jsonb), `sentiment`, `intentScore`, `sentByMode` |
| **`social_interactions`** | Non-DM engagement (likes, comments, reactions, mentions, follows) | `contactId`, `platform`, `type`, `postId`, `content`, `intentScore`, `convertedToLeadId` |

**Why not just extend `communications`?** The current `communications` table is a flat per-event log (no thread, no external message ID, no attachments, no unread state). Keep it for coarse activity logging, but add `conversations`/`messages` for a *real* inbox. The existing Social Command tab is then re-pointed from `communications` to `conversations`.

**Contract:** new fields surface through the OpenAPI spec → codegen (never hand-edit generated files — CLAUDE.md §4).

---

## 9. Phased Implementation Plan

Estimates assume you (solo) + me. "Effort" is rough engineering days, excluding Meta App Review wall-clock (2–4 wks in parallel).

### Phase 0 — Foundations (2–3 days)
- New schema: `conversations`, `messages`, `channel_identities`, `social_interactions` (+ `social_accounts` or extend `channels`).
- Identity-resolution service (`identity-service.ts`): email/phone exact-match auto-merge, name+company suggest-merge, manual merge endpoint.
- Normalization layer in `channel-manager.ts`: provider payload → canonical `InboundEvent`.
- OpenAPI spec + codegen for the new entities.

### Phase 1 — Website + Lead Ads (1–2 days) — *fastest ROI, lowest risk*
- Website form: embeddable widget + finish the existing webhook receiver path into `conversations`.
- Facebook/IG **Lead Ads**: wire `leads_retrieval` webhook (scope already scaffolded) → contact + conversation + `lead.created`.
- **Ships value in week one, 100% compliant.**

### Phase 2 — WhatsApp (3–4 days) — *best channel*
- Connect WhatsApp Cloud API (direct or via 360dialog BSP).
- Inbound webhook → `messages`; outbound send (session replies free); template management for business-initiated.
- Opt-in capture + 24h-window UI affordance.

### Phase 3 — Messenger + Instagram (4–5 days) — *needs App Review*
- OAuth via existing `meta` provider (add `instagram_business_manage_messages`, `instagram_manage_comments`, `pages_messaging`, `pages_read_engagement`).
- Inbound DMs + **comment read/reply**; **comment→DM automation** (someone comments a keyword → auto-DM). Handle `message_deletions` webhook (must delete our copy).
- Submit Meta App Review + Business Verification **in parallel with Phase 1–2**.

### Phase 4 — Intent → Deal automation (2–3 days)
- Emit `social.message.received` / `social.interaction.received` on the event bus.
- AI intent scoring (agent-executor, wallet-billed): likes = weak, comments = medium, DMs/"how much/pricing/demo" = strong.
- Tri-mode replies: **Auto** = auto-reply + auto-create lead; **Hybrid** = draft reply + suggest lead (human approves); **Human** = surface only. High-intent → `lead.created` → existing pipeline.

### Phase 5 — Unified inbox UI (3–4 days)
- Rebuild Social Command tab: channel-filtered thread list, unified conversation view (all channels for one contact in one thread), reply composer per channel, assignment, snooze/close, unread counts, SLA/first-response timer.
- Per-message source chips (reuse the `ContactChannels` pattern from enrichment work).

### Phase 6 — LinkedIn via Unipile (3–4 days) — *opt-in, risk-gated*
- Add `unipile` provider; hosted-auth connect flow with an explicit **risk disclaimer + consent** gate.
- Sync DMs, comments, reactions, connection activity → `conversations`/`social_interactions`.
- Conservative rate limits; account-health monitoring; kill-switch on restriction detection.

### Phase 7 (optional) — X/Twitter + polish
- X mentions + DMs (pay-per-use, capped) only if demand justifies cost.

**Critical path:** Phase 0 → 1 → 2 delivers a compliant, valuable product in ~1–1.5 weeks of build. Meta App Review is the long pole for Phase 3 — start it day one.

---

## 10. Compliance, Risk & Data Governance

| Area | Requirement | Status in PMG OS |
|---|---|---|
| **Meta App Review** | Advanced Access needs App Review + Business Verification; 2026 bar is high (screencasts, opt-out flows, webhook handling). | New effort. Plan 2–4 wks. |
| **`message_deletions` webhook** | When a user deletes a message, you must delete your stored copy within the retention window. | Must implement in message ingestion. |
| **WhatsApp opt-in** | Users must opt in before business-initiated templates. | Tie to existing `/opt-out` + consent capture. |
| **LinkedIn ToS** | Gray-market = account-ban risk borne by the *client*. | Requires explicit consent gate + disclaimer (§3). |
| **GDPR / CAN-SPAM / CASL** | Right to erasure, unsubscribe, consent records. | `/opt-out` CRUD + `channel-health` already exist; extend to social identities. |
| **Credential storage** | OAuth tokens / session cookies at rest. | `integrations.credentials` (jsonb) — **recommend encryption-at-rest before storing LinkedIn sessions.** |
| **Per-client data isolation** | One client must never see another's conversations. | `channels.ownerType/clientId` exists; enforce in every social query + RBAC. |

---

## 11. My Recommendation

1. **Build the compliant Meta-first core** (Phases 0–5): Website + Lead Ads → WhatsApp → Messenger/Instagram → intent-to-deal → unified inbox. This is legitimate, cheap to run, covers the majority of real inbound, and is a genuinely strong product on its own.
2. **Offer LinkedIn via Unipile as an opt-in "Pro" connection** (Phase 6) with an explicit risk disclaimer and hard rate limits. There is no compliant alternative, it's where cyber/IT buyers are, and framing it as *the client connecting their own account at their own risk* is the industry-standard posture. Make it a paid tier that covers the Unipile per-account cost.
3. **Defer X/Twitter** until a client actually asks — the 2026 pay-per-use pricing and read caps make it poor ROI for B2B cyber.
4. **Lead with the unified timeline** (§6) in your sales narrative — "every conversation with a prospect, everywhere, in one thread" is compliant, hard for competitors to match, and the clearest expression of the "AI-native business OS" promise.

---

## 12. Value-Add Features Worth Considering

Beyond the literal ask, these amplify Social Command and lean on infrastructure you already have:

1. **Comment→DM automation** (IG/FB native): someone comments a keyword ("info", "pricing") → auto-DM with a CTA. Proven top-of-funnel lead magnet; fully compliant on Meta.
2. **AI intent scoring on every interaction** — reuse the agent framework; a "hand-raise heat map" of who's warming up.
3. **AI reply drafting in the client's voice** — Hybrid mode = "AI drafts, you approve" (already the tri-mode pattern). Cuts response time massively.
4. **Social listening / keyword alerts** — monitor mentions of "looking for an MSSP," competitor names, or the client's brand → auto-create a warm lead. (WhatsApp/Meta channels + Unipile for LinkedIn keyword monitoring.)
5. **SLA / first-response-time tracking** — inbound speed is the #1 conversion driver; `conversations.firstResponseAt` + `channel-health` already give you the plumbing.
6. **Social touch attribution** — which social touchpoint sourced a closed deal (the `attribution_events` table already exists — feed it social touchpoints).
7. **"Warm signal" detection** — flag when someone *already in the pipeline* engages on social (a stalled deal's champion liked a post = re-engagement trigger).
8. **WhatsApp broadcast/template campaigns** tied to the existing `outreach_sequences` engine — cheapest high-open-rate channel there is.
9. **Sentiment + churn/upsell detection** on existing-client conversations — turn support chatter into expansion revenue.
10. **Unified contact card** — one screen: enrichment data (Apollo/PDL) + full cross-channel conversation history + pipeline stage + attribution. The definitive "single source of truth per human."

---

## 13. Decisions I Need From You

These forks change the build. (I've marked my recommendation.)

1. **LinkedIn posture** — (A) official-only/limited, (B) full gray-market via Unipile, or **(C) hybrid: Meta core now + LinkedIn as opt-in Pro** ✅ recommended.
2. **Aggregator vs. direct** — **Direct Meta for the compliant core + Unipile only for LinkedIn** ✅ recommended, or Unipile-for-everything (faster, but more ToS surface + per-account cost).
3. **WhatsApp path** — Meta Cloud API direct (cheaper, more infra) vs. a **BSP like 360dialog** (faster onboarding, small per-msg markup). Recommend **BSP to start.**
4. **First channel to ship** — recommend **Website + Lead Ads → WhatsApp** (fastest compliant value) before the App-Review-gated Meta DMs.
5. **X/Twitter** — include a minimal version now, or **defer** ✅ recommended.
6. **Single-client vs. multi-client from day one** — does each *client* connect their own accounts (multi-tenant, `clientId` scoping everywhere), or is this initially PMG's own accounts only? This affects the data model depth in Phase 0.

---

## 14. Repo-Specific Gotchas (so the build goes smoothly)

- **`drizzle-kit push` is blocked** by a data-loss drift guard (see CLAUDE.md §10 / [[apollo-integration]]). New tables/columns go in via `ALTER TABLE` / `CREATE TABLE`, and after schema edits run `npx tsc -b lib/db lib/api-zod lib/api-client-react --force` or api-server sees stale column types.
- **Docker is the running app** at `http://localhost:3200` — after any `artifacts/*` or `lib/*` change, `docker compose up -d --build` then hard-refresh, or the change is invisible (CLAUDE.md §8, 2026-09-01).
- **Never hand-edit generated files** — edit `openapi.yaml`, re-run codegen (orval pinned to 8.5.3).
- **Every AI call** (intent scoring, reply drafting) goes through `callAI()` → `shouldAiAct()` → wallet. Register new tools in `TOOL_COSTS`.
- **No false-success toasts, no fabricated data** — an unconnected channel shows an honest disabled/empty state (CLAUDE.md §10).

---

### Sources
- [Unipile — WhatsApp API guide (2026)](https://www.unipile.com/whatsapp-api-a-complete-guide-to-integration/) · [Unipile — API pricing](https://www.unipile.com/pricing-api/) · [Unipile review (Salesforge)](https://www.salesforge.ai/blog/unipile-review) · [Unipile LinkedIn ToS/ban-risk review (Swarmhit)](https://www.swarmhit.com/blog/unipile-review)
- [LinkedIn Comments API (Microsoft Learn)](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/comments-api) · [Does LinkedIn have an API? What you can/can't do 2026 (social-api.ai)](https://social-api.ai/blog/does-linkedin-have-an-api) · [LinkedIn automation restrictions 2026 (Embers)](https://useembers.com/blog/linkedin-automation-restrictions/)
- [WhatsApp Business Platform pricing (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) · [WhatsApp API pricing 2026 (Blueticks)](https://blueticks.co/blog/whatsapp-business-api-pricing-2026)
- [Instagram Messaging webhooks (Meta)](https://developers.facebook.com/docs/instagram-messaging/webhooks/) · [Instagram Messaging API approval 2026 (Singh)](https://singhamandeep.com/instagram-messaging-api-approval-getting-instagram_business_manage_messages-2026/)
- [X/Twitter API pricing 2026 (Postproxy)](https://postproxy.dev/blog/x-api-pricing-2026/) · [X API cost breakdown 2026 (twitterapi.io)](https://twitterapi.io/blog/x-api-cost-breakdown-2026)
- [Twilio vs MessageBird vs Respond.io (respond.io)](https://respond.io/blog/twilio-vs-messagebird-vs-respondio) · [Best iPaaS 2026 — Paragon/Nango/unified APIs (unified.to)](https://unified.to/blog/best_ipaas_for_saas_integrations_in_2026_paragon_nango_and_the_rise_of_real_time_unified_apis)
