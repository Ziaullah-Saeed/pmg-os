# Social Command — Build Progress & Handoff

> **In-repo, portable tracker** for the Social Command initiative so any developer (or the same founder on another machine) can pick up where the last session left off. Companion to the vision doc [Social-Command-Feasibility-and-Plan.md](Social-Command-Feasibility-and-Plan.md).
>
> **How to use:** update the Status board + Change log at the end of every working session. Keep it terse. Source of truth for *what happened* is git history + CLAUDE.md §8; this file is the *at-a-glance execution tracker*.

_Last updated: 2026-09-09_

---

## What this is

Outreach → **unified inbound social inbox**: capture everyone who DMs / comments / likes / mentions across LinkedIn, Facebook/Messenger, Instagram, WhatsApp, X, and the website into **one threaded conversation history per person**, then convert high-intent interactions into leads/deals via the existing CRM pipeline.

The literal customer ask: *"clients connect their own social accounts; people who interact with them get managed here, with full conversation history in one place even when it's spread across many platforms."*

---

## Locked decisions (2026-09-09)

| Decision | Choice |
|---|---|
| **Tenancy** | Multi-tenant schema from day one (`ownerType`/`clientId` on all social tables); single-account UI shipped first. |
| **First channel** | Website form + Facebook/IG Lead Ads → WhatsApp (fastest compliant value). |
| **LinkedIn** | Compliant Meta core **now**; LinkedIn later as an opt-in **"Pro"** tier via **Unipile** (gray-market, "your account / your risk"). |
| **WhatsApp** | Direct **Meta Cloud API** (not a BSP). |

⚠️ **Hard constraint:** personal LinkedIn DMs + post comments/likes have **no compliant API**. Official API permanently blocks member inboxes; the only path is Unipile driving the member session = LinkedIn ToS violation + account-ban risk. This is a policy wall, isolated to Phase 6. Full analysis: feasibility doc §3.

---

## Status board

| Phase | Scope | Status | Notes |
|---|---|:---:|---|
| **0** | Foundations: schema · identity resolution · ingest normalization · read API | ✅ **Done** (2026-09-09) | Deployed + smoke-tested live at :3200. Details below. |
| **1** | Website form + FB/IG Lead Ads → conversations | ⬜ Not started | First real data through the pipeline. Website form ~mostly there via existing webhook receiver. |
| **2** | WhatsApp (Meta Cloud API direct) | ⬜ Not started | Needs public webhook URL + WABA credentials. |
| **3** | Messenger + Instagram DMs/comments (+ comment→DM) | ⬜ Not started | Gated by Meta App Review (2–4 wk) — start the review early. |
| **4** | Intent → deal (AI scoring + tri-mode replies) | ⬜ Not started | Subscribes to `social.message.received` / `social.interaction.received`. Wallet-billed. `AI_DUMMY_MODE=false` needed here. |
| **5** | Unified inbox UI (rebuild Social Command tab) | ⬜ Not started | **OpenAPI spec + codegen for the new entities happens here** (deferred from Phase 0 — no consumer yet). |
| **6** | LinkedIn via Unipile (opt-in, risk-gated) | ⬜ Not started | Needs Unipile key + consent/disclaimer gate. |
| **7** | X/Twitter + polish | ⬜ Optional | Pay-per-use/capped; only if demand justifies. |

---

## Phase 0 — Done (details)

### Files added / changed
**Schema (`lib/db/src/schema/`)** — 5 tenant-scoped tables, registered in `schema/index.ts`:
- [social_accounts.ts](lib/db/src/schema/social_accounts.ts) — a client-connected account per platform.
- [channel_identities.ts](lib/db/src/schema/channel_identities.ts) — identity graph: platform id → contact.
- [conversations.ts](lib/db/src/schema/conversations.ts) — threaded conversation (one person, many channels).
- [messages.ts](lib/db/src/schema/messages.ts) — individual messages (external id, attachments, status, SLA).
- [social_interactions.ts](lib/db/src/schema/social_interactions.ts) — likes/comments/reactions/mentions.

**Migration** — [lib/db/src/migrate-social-command.ts](lib/db/src/migrate-social-command.ts) (idempotent `CREATE TABLE IF NOT EXISTS`; `drizzle-kit push` is blocked by a data-loss guard). Script: `pnpm --filter @workspace/db run migrate:social`.

**Services (`artifacts/api-server/src/services/`)**
- [identity-service.ts](artifacts/api-server/src/services/identity-service.ts) — `resolveIdentity()` (known-identity → exact email/phone auto-merge → new contact + reuses `checkDuplicatesOnCreate` for suggested merges), plus `reassignSocialEntities`, `listIdentitiesForContact`, `confirmIdentity`, `identityStats`.
- [social-ingest-service.ts](artifacts/api-server/src/services/social-ingest-service.ts) — canonical `InboundMessageEvent` / `InboundInteractionEvent`; `ingestMessage()` / `ingestInteraction()` do identity resolution, thread find-or-create, idempotent dedup, conversation roll-ups, and emit event-bus + websocket signals. **Every provider adapter in later phases feeds these two functions.**

**API** — [artifacts/api-server/src/routes/social.ts](artifacts/api-server/src/routes/social.ts), registered in `routes/index.ts`:
`GET /api/social/conversations`, `GET /api/social/conversations/:id` (+messages), `PATCH /api/social/conversations/:id`, `GET/PATCH /api/social/interactions`, `GET /api/social/accounts`, `GET /api/social/contacts/:id/identities`, `GET /api/social/stats`.

**Other** — `websocket-service.ts` `WsEventType` union extended (`social_message`, `social_interaction`); `Dockerfile` fixed (removed invalid `pnpm install --fetch-retries` flag — see gotchas).

### Events emitted (contract for Phase 4)
- `social.message.received` (inbound) / `social.message.sent` (outbound)
- `social.interaction.received`

### Verify Phase 0 on a fresh machine
```bash
# 1. Bring up the stack (Postgres on :5433, app on :3200)
docker compose up -d --build

# 2. Apply the Social Command tables (idempotent; safe to re-run)
#    Needs DATABASE_URL. From repo root, if tsx is available:
DATABASE_URL='postgresql://pmg_user:pmg_secret@localhost:5433/pmg_os' \
  pnpm --filter @workspace/db run migrate:social
#    …or apply the same DDL via psql in the container (see the script for the SQL).

# 3. Confirm the 5 tables exist
docker compose exec -T postgres psql -U pmg_user -d pmg_os -c "\dt social_accounts channel_identities conversations messages social_interactions"

# 4. Smoke-test the API (login → hit the endpoints)
#    demo creds: shershah_nawabi@pmggroup-llc.com / PMGAdmin2024!
curl -s -c /tmp/j -X POST http://localhost:3200/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"shershah_nawabi@pmggroup-llc.com","password":"PMGAdmin2024!"}'
curl -s -b /tmp/j http://localhost:3200/api/social/stats   # → {"conversations":0,...}
```

---

## Environment & credentials needed (by phase)

| When | What | Notes |
|---|---|---|
| Now (Phase 0) | Nothing external | Pure internal plumbing. |
| Phase 1–3 | **Public HTTPS webhook URL** | Meta/WhatsApp can't reach `localhost` (same lesson as `APOLLO_WEBHOOK_URL`). Use ngrok for dev or a prod/staging domain. |
| Phase 1,3 | **Meta Developer app** | App ID/Secret + a Facebook Page + Business Verification (2–4 wk for Advanced Access). |
| Phase 2 | **WhatsApp** | WABA ID + Phone Number ID + permanent token. Meta's free test number works to build. |
| Phase 4 | `AI_DUMMY_MODE=false` | For real intent scoring + reply drafting (wallet-billed). |
| Phase 6 | **Unipile key** + a LinkedIn account | Opt-in Pro tier only. |

Store secrets in `artifacts/api-server/.env` (+ `.env.docker` for the :3200 container), or via Settings → Integrations (`integrations.credentials`).

---

## Dev gotchas (repo-specific)

- **Docker is the running app** at `http://localhost:3200`. After any `artifacts/*` or `lib/*` change, `docker compose up -d --build` then hard-refresh — source edits are invisible until the image is rebuilt.
- **After schema edits**, run `npx tsc -b lib/db lib/api-zod lib/api-client-react --force` or api-server tsc sees stale `@workspace/db` types.
- **`drizzle-kit push` is blocked** by a data-loss guard — new tables go through the `migrate:social` CREATE-TABLE script, not push.
- **`pnpm typecheck` is not green at HEAD** — api-server has ~78 pre-existing errors (websocket/slack/scheduler/wallet event-type drift). Phase 0 added **0 new** errors. Judge new work by "no new errors in changed files," not a clean total.
- **Never hand-edit generated files** under `lib/api-(client-react|zod)/src/generated/` — edit `openapi.yaml`, re-run codegen (orval pinned to 8.5.3). Relevant from Phase 5.
- **Dockerfile:** the base `pnpm install` must NOT pass `--fetch-retries` (newer pnpm removed the flag → build fails); the value lives in the image `.npmrc` instead.

---

## Change log

- **2026-09-09** — Phase 0 shipped: 5 tables + `identity-service` + `social-ingest-service` + `/api/social/*` routes; deployed and smoke-tested live at :3200; Dockerfile `--fetch-retries` fix. Feasibility study + this tracker added. (CLAUDE.md §8.)
