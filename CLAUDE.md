# CLAUDE.md — PMG Group OS

> Persistent session bootstrap. Loaded automatically. Keep tight; anything derivable from source code does not belong here.

---

## SECTION 1 — Project Identity

- **What:** PMG Group OS, an AI-native business operating system for PMG Group LLC, a digital marketing agency serving the cybersecurity / IT sector exclusively.
- **Core promise:** *"Generate 20 ready-to-close deals in your first month."*
- **Stack:** pnpm monorepo · React 19 + Vite (frontend) · Express 5 (backend) · PostgreSQL + Drizzle ORM · TailwindCSS v4 + shadcn/ui + Framer Motion (glassmorphic dark UI: Crimson / Navy / Gold).
- **My role (the user):** Sole full-stack developer + founder. Treat me as the architect — I know the codebase. Accelerate, don't lecture.
- **Sections (6 + Settings):** Outreach · CRM · Marketing · Production · Admin · Finance · Settings.
- **Agents:** 32 PhD-level agents, all on `gpt-4o-mini` via Replit AI Integrations proxy, governed by tri-mode (AI Autonomous / Hybrid / Human Controlled).
- **Status (2026-08-05):** "Make Everything Real" COMPLETE — all sections + Settings real; Apollo build done; Legal & Compliance + AI video-guide walkthroughs wired. Remaining: real guide video, optional integration wiring, polish. Detail in §3.

---

## SECTION 2 — Architecture Map

**Monorepo (pnpm workspaces — see [pnpm-workspace.yaml](pnpm-workspace.yaml))**

Workspace globs: `artifacts/*` · `lib/*` · `lib/integrations/*` · `scripts`. The `lib/integrations/*` glob currently matches no packages (directory does not exist) — reserved for future per-integration packages.

| Path | Package | Purpose |
|---|---|---|
| [artifacts/pmg-os/](artifacts/pmg-os/) | `@workspace/pmg-os` | React 19 frontend (Vite) |
| [artifacts/api-server/](artifacts/api-server/) | `@workspace/api-server` | Express 5 API on :8080, all routes under `/api` |
| [artifacts/mockup-sandbox/](artifacts/mockup-sandbox/) | — | Throwaway UI mockup playground |
| [artifacts/pmg-walkthrough/](artifacts/pmg-walkthrough/) | — | Onboarding / walkthrough surface |
| [lib/db/](lib/db/) | `@workspace/db` | Drizzle schema + PG pool. Schemas: [lib/db/src/schema/](lib/db/src/schema/) |
| [lib/api-spec/](lib/api-spec/) | `@workspace/api-spec` | OpenAPI source of truth + Orval config |
| [lib/api-client-react/](lib/api-client-react/) | `@workspace/api-client-react` | **Generated** TanStack Query hooks |
| [lib/api-zod/](lib/api-zod/) | `@workspace/api-zod` | **Generated** Zod schemas |
| [scripts/](scripts/) | `@workspace/scripts` | One-off TS scripts (run via `tsx`); includes `post-merge.sh` |

**Frontend** ([artifacts/pmg-os/src/](artifacts/pmg-os/src/)): `pages/` (one big file per route), `components/`, `hooks/`, `lib/`. Router is **wouter** (not React Router). `SidebarLayout` wraps every authenticated page — global AI mode toggle, wallet display, notification bell, global search live there.

**Backend** ([artifacts/api-server/src/](artifacts/api-server/src/)): `routes/` (40+ route files, one per resource), `services/` (40+ service files including `agent-registry.ts`, `agent-executor.ts`, `ai-service.ts`, `wallet-service.ts`, `ai-mode-service.ts`, `event-bus.ts`, `integration-hub-service.ts`), `middleware/` (auth/RBAC).

**Auth & RBAC:** session cookies (`pmg.sid`), sessions in PG `user_sessions`. Roles: `super_admin > admin > manager > user`. Permission map in [artifacts/api-server/src/middleware/auth.ts](artifacts/api-server/src/middleware/auth.ts) (`PERMISSION_MAP` + `ROUTE_DOMAIN_MAP`).

**Realtime:** WebSocket on the same HTTP port via `websocket-service.ts`; frontend subscribes through `use-websocket.ts` and patches TanStack Query cache.

---

## SECTION 3 — Current State

- **Sessions 1–9 + "Make Everything Real" COMPLETE (2026-08-05).** All sections (Outreach · CRM · Marketing · Production · Admin · Finance · Dashboard) + Settings (10 tabs) show **real data + honest empty/disabled states**; both packages build green. All 32 AI endpoints on `gpt-4o-mini`; leads/opportunities stamp `createdByMode` + render `ModeBadge` (red=Auto, blue=Hybrid, gold=Human).
- **Apollo lead-gen COMPLETE** (phases 1–5; replaces the old fake LLM "prospecting"). Only **user go-live** remains: DB holds a free-plan key that 403s on search/enrich — upgrade to Basic+ (~$59/mo), paste key in Settings. See [[apollo-integration]].
- **Legal & Compliance UI + Video-Guide AI walkthroughs BUILT.** Settings → Legal & Compliance tab is real (Compliance Checker `/legal/check-compliance`, Opt-Out CRUD `/opt-out`, Channel Health `/channel-health`); contract tools left to Finance. `VideoGuideOverlay` ([sidebar-layout.tsx](artifacts/pmg-os/src/components/layout/sidebar-layout.tsx)) has an "AI Guide" toggle → `/video/get-guide`. Detail in §8 + [[make-everything-real-handoff]].
- **NOT built:** actual guide **video** generation (needs external video/voice APIs — Runway/ElevenLabs). Other integrations (Hunter, HubSpot, GHL, Stripe, Zoom) honestly labeled "planned / not connected"; CSV+webhook ingestion exists in `integration-hub-service.ts` but is not surfaced in UI.
- **Tech debt (non-blocking):** `ai_autonomous` ↔ `ai_auto` shim in `use-ai-mode-context.tsx` (use `isAuto`/`isHybrid`/`isHuman`).
- **Demo creds:** `shershah_nawabi@pmggroup-llc.com` / `PMGAdmin2024!`
- Fixed issues (env-gated dummyMode, purged false-success toasts, real wallet/health/integration data, `audience` payload, dashboard field drift, Apollo lead source): see [PMG-OS-Claude-Audit-Report.md](PMG-OS-Claude-Audit-Report.md) + §8.

---

## SECTION 4 — Conventions

- **API contract:** [lib/api-spec/openapi.yaml](lib/api-spec/openapi.yaml) is the single source of truth. **Never hand-edit** files under `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`. Edit the spec, re-run codegen.
- **Two frontend hook sources:**
  - Generated CRUD hooks from `@workspace/api-client-react`.
  - Hand-written hooks in [artifacts/pmg-os/src/hooks/use-api.ts](artifacts/pmg-os/src/hooks/use-api.ts) for wallet, AI-mode, auth, and anything not in the OpenAPI spec.
- **DB:** edit schema files in [lib/db/src/schema/](lib/db/src/schema/), then `pnpm --filter @workspace/db push`. Backend imports `db`, `pool`, and table objects directly from `@workspace/db` — no build step.
- **AI call pattern:** every AI call goes through `callAI()` in [artifacts/api-server/src/services/ai-service.ts](artifacts/api-server/src/services/ai-service.ts) → checks `shouldAiAct()` in `ai-mode-service.ts` → checks cache → charges wallet (`TOOL_COSTS` map, 4 budget pools: standard / premium / creative / system) → logs to `ai_runs` table.
- **Tri-mode contract:**
  - `ai_autonomous` (a.k.a. `ai_auto`) → AI acts.
  - `hybrid` → AI drafts, human approves.
  - `human_controlled` → AI blocked.
  - Mode resolves at four levels: global → section → agent → record. Frontend reads it via `useAiModeContext()` (`isAuto` / `isHybrid` / `isHuman`).
- **AI UI pattern:** results render inline via `AiResultPanel` (copy / collapse / close controls). AI automation buttons are visible in Auto and Hybrid, **hidden in Human mode** on Production / Admin / Finance pages (Session 9 convention).
- **Mutation feedback:** `useToast` + API `onError` fallback. **Watch for the false-success anti-pattern** above — `onError` must surface real failures, not toast success + insert fake data.
- **Mode labeling:** new leads/opportunities stamp `createdByMode` and render with `ModeBadge`.

---

## SECTION 5 — Quick Reference (load on demand)

```bash
# Install
pnpm install

# Typecheck (libs first, then apps)
pnpm typecheck

# Build everything
pnpm build

# Frontend dev (port in artifacts/pmg-os/vite.config.ts)
pnpm --filter @workspace/pmg-os dev

# Backend: build then start
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start

# DB: push schema → Postgres
pnpm --filter @workspace/db push

# API codegen (after editing openapi.yaml)
pnpm --filter @workspace/api-spec codegen
```

**Run the WHOLE app in Docker (one command)** — Postgres + schema push + API + web, no local Node/pnpm needed:

```bash
./run.ps1                 # Windows: build + start, opens http://localhost:5173
./run.sh                  # macOS/Linux/Git-Bash equivalent
docker compose up -d --build   # the raw command run.ps1/run.sh wrap
# subcommands: down | logs | restart | rebuild | status
```

- **App → http://localhost:5173** (nginx serves the Vite build + proxies `/api` → api). Login with the demo creds below (auto-seeded on boot by `seedDefaultAdmin`).
- **Zero-config:** boots with no `.env`; **AI runs in dummy mode** (`AI_DUMMY_MODE=true`) so there's no key/cost. For real AI, copy `.env.docker.example` → `.env` (next to compose), set `AI_DUMMY_MODE=false` + a real key.
- Files: [Dockerfile](Dockerfile) (`base`/`build-web`/`web`/`api`) · [docker-compose.yml](docker-compose.yml) · [nginx.conf](artifacts/pmg-os/nginx.conf) · [.dockerignore](.dockerignore). Gotchas (full rationale in §8): image strips win32-only native-binary `overrides` from its copy of `pnpm-workspace.yaml` (committed file untouched) so pnpm installs linux binaries; `api` stage keeps `node_modules` (lazy `import()` deps); `migrate` runs `drizzle-kit push` with stdin closed (safe on fresh + populated DBs); reuses `pgdata` volume.

```bash
# DB-only (legacy dev workflow — run api/web natively with pnpm):
docker compose up -d postgres
```

**API server env** ([artifacts/api-server/.env](artifacts/api-server/.env)):

```
DATABASE_URL=postgresql://pmg_user:pmg_secret@localhost:5433/pmg_os
PORT=8080
SESSION_SECRET=pmg-os-dev-secret-change-in-production
AI_INTEGRATIONS_OPENAI_BASE_URL=<replit-ai-base-url>
AI_INTEGRATIONS_OPENAI_API_KEY=<replit-ai-key>
```

No test runner is configured yet. If you add one, update this section.

---

## SECTION 6 — Skill Index (tiered)

Project-specific skills live under [.claude/skills/](.claude/skills/). Generic skills live under [.local/skills/](.local/skills/). Three tiers:

### Tier 1 — Inlined in this file (never re-read as files)

These patterns appear in every change. Their canonical statement IS §4 above. If a Tier 1 fact ever changes, update §4 **before** anything else.

- **pnpm workspace conventions** — see §2, §5.
- **Drizzle push workflow** — see §4 DB block.
- **Tri-mode + wallet + dummyMode contract** — see §4 AI block. Full deep-dive at [.claude/skills/pmg-tri-mode-pattern/SKILL.md](.claude/skills/pmg-tri-mode-pattern/SKILL.md) (Tier 2 trigger below).

### Tier 2 — Triggered (load on keyword match)

Read the skill file when the trigger fires.

| Skill | Trigger words / contexts |
|---|---|
| [.claude/skills/pmg-tri-mode-pattern/](.claude/skills/pmg-tri-mode-pattern/) | "mode", "wallet", "dummyMode", `callAI`, `shouldAiAct`, `TOOL_COSTS`, editing any of the five AI services |
| [.local/skills/react-vite/](.local/skills/react-vite/) | "Vite", "build broken", "dev server", `vite.config.ts`, React 19 patterns |
| [.local/skills/database/](.local/skills/database/) | "migration", "index", "constraint", "Drizzle relation", non-trivial schema work |
| [.local/skills/ai-integrations-openai/](.local/skills/ai-integrations-openai/) | "gpt-4o-mini", "OpenAI call", prompt tuning |
| [.local/skills/validation/](.local/skills/validation/) | "Zod", "schema mismatch", "400 from server" |
| [.local/skills/code_review/](.local/skills/code_review/) | `/review`, "audit this code" |
| [.local/skills/security_scan/](.local/skills/security_scan/) | `/security-review`, "vulnerability", pre-deploy gate |
| [.local/skills/diagnostics/](.local/skills/diagnostics/) | "stack trace", "500 error", "investigate why X" |
| [.local/skills/integrations/](.local/skills/integrations/) | "GHL", "HubSpot", "Hunter", "Zoom", "webhook" |
| [.local/skills/stripe/](.local/skills/stripe/) | "Stripe", "invoice flow", "subscription", Finance billing |
| [.local/skills/external_apis/](.local/skills/external_apis/) | new third-party API call, retry / rate-limit work |
| [.local/skills/environment-secrets/](.local/skills/environment-secrets/) | ".env", "API key rotation", new `process.env` access |
| [.local/skills/deployment/](.local/skills/deployment/) | "deploy", "production", CI |
| [.local/skills/threat_modeling/](.local/skills/threat_modeling/) | cybersecurity-themed content generation, IT/cyber agent prompts |
| [.local/skills/workflows/](.local/skills/workflows/) | multi-step automation, `automation-engine.ts` work |
| [.local/skills/delegation/](.local/skills/delegation/) | meta — before spawning 3+ subagents in one session |
| [.local/skills/web-search/](.local/skills/web-search/) | "find online", "current best practice for…" |
| [.local/skills/project_tasks/](.local/skills/project_tasks/) | multi-day initiative planning (Legal & Compliance, Video Guide) |
| [.local/skills/skill-authoring/](.local/skills/skill-authoring/) | authoring a new project-specific skill in `.claude/skills/` |

### Tier 3 — Reference-only (grep, never fully read)

Open only to extract a specific snippet: `package-management`, `ai-integrations-anthropic`, `artifacts`, `follow-up-tasks`, `query-integration-data`, `testing` (until a runner is adopted).

### Skills confirmed irrelevant to PMG OS (do not consult)

`agent-inbox`, `ai-integrations-gemini`, `ai-integrations-openrouter`, `canvas`, `clerk-auth`, `data-visualization`, `design`, `design-exploration`, `expo`, `gamestack-js`, `image-search`, `media-generation`, `mobile-ui`, `mockup-extract`, `mockup-graduate`, `mockup-sandbox`, `object-storage`, `post_merge_setup`, `remove-image-background`, `replit-auth`, `replit-docs`, `repl_setup`, `revenuecat`, `slides`, `streamlit`, `video-js`, `whop`.

---

## SECTION 7 — Operating Rules

1. **Read before you change.** Never assume file contents. Use Read/Grep first.
2. **Tight responses.** No re-summarizing diffs the user can already see. End-of-turn = 1–2 sentences.
3. **Architecture questions:** consult this file first, source code second. Never cite training data over the live repo.
4. **Self-correcting:** if a fact here contradicts what you read in the code, flag it and update this file in the same turn.
5. **Decision Log:** when we make an architectural choice, append it to the Decisions Log below. One line. Date it.
6. **Token efficiency:** don't re-read files you already read this session unless they changed.
7. **Do not invent integrations.** The audit found "AI-Discovered Prospects" that were really LLM hallucinations. If a real integration doesn't exist (Apollo, Hunter, Clearbit, etc.), say so — don't pretend.
8. **Dummy mode is real-but-fake.** `dummyMode = true` short-circuits AI calls and wallet billing. When the user reports "the AI gave nonsense", check dummy mode first.
9. **Use the agentic architecture.** When a task matches a row in §9 below, spawn the named subagent. When a task is a bug report or pre-merge sweep, run `audit-hunter` against the target *before* fixing anything. Routing details: [.claude/routing.md](.claude/routing.md).

---

## SECTION 8 — Decisions Log

*Append one-liners here. Format: `YYYY-MM-DD — decision — why`.*

- 2026-05-30 — Adopted this CLAUDE.md as persistent session bootstrap — context-aware without re-reading replit.md each session.
- 2026-05-30 — Adopted `.claude/` agentic architecture (6 subagents, anti-pattern catalog, tri-mode skill, tiered skill index), tracked in git — portable + self-documenting.
- 2026-05-30 — Deferred a test runner — verify gate is `pnpm typecheck` + `pnpm build`.
- 2026-08-05 — "Make Everything Real" COMPLETE — every section + Settings wired to real data/honest states; false-success purged; Finance AI drafts persist to `ai_generated_outputs`; unpersistable controls disabled honestly.
- 2026-08-05 — Built real Legal & Compliance UI (Settings) — Compliance Checker (`/legal/check-compliance`, persisted), Opt-Out CRUD (`/opt-out`), Channel Health (`/channel-health`); contract tools left to Finance.
- 2026-08-05 — Wired Video-Guide AI walkthroughs — "AI Guide" toggle in `VideoGuideOverlay` → `/video/get-guide`; actual video generation deferred.
- 2026-08-05 — Added Docker packaging — multi-stage Dockerfile + full-stack compose (postgres+migrate+api+web) + `run.ps1`/`run.sh`. Strips win32 `overrides` for linux build; `api` keeps `node_modules`; migrate push with stdin closed; reuses `pgdata`; AI defaults to dummy mode.
- 2026-08-07 — Fixed Apollo email reveal — `reveal_personal_emails` must be a QUERY param on `bulk_match` (was in the body → ignored → null emails); guard the `email_not_unlocked@…` sentinel. Added opt-in phone capture (sync-only; no `reveal_phone_number` sent — Apollo delivers new mobiles webhook-only) + batch "Reveal all" with an honest "0 emails available" message. See [[apollo-integration]] §2.
- 2026-08-08 — Built Apollo async MOBILE reveal — sends `reveal_phone_number=true&webhook_url` when `APOLLO_WEBHOOK_URL` set; pending map in `sync_logs` (keyed by bulk_match sync `id`); public receiver `POST /api/apollo/phone-webhook` (before `requireAuth`, `?secret=` guard) writes `contacts.phone` + logs the 8-cr spend. No schema change. User must point `APOLLO_WEBHOOK_URL` at a PUBLIC URL (ngrok/prod) — Apollo can't reach localhost. See [[apollo-integration]] §2.
- 2026-08-08 — Fixed Apollo email reveal matching — `enrichContacts` now matches by the exact Apollo person `id` (stored in `contacts.externalCrmId` at import; guarded by 24-hex regex, falls back to name/org) instead of name+org+domain. Root cause: Apollo's `api_search` preview REDACTS `last_name` + org `domain`, so name-matching at enrich time returned null matches → 0 emails. Verified live: id-match reveals verified emails (1 cr); name-match returns null. Separate non-bug: Afghan-bank prospects return `email_status:"unavailable"` (Apollo has no data — not a plan issue). See [[apollo-integration]] §2.
- 2026-08-08 — Made Apollo enrich idempotent + stopped double-charging — `enrichContacts` now SKIPS contacts that already have the requested email/phone (no bulk_match call, 0 credits), NEVER overwrites an existing email with a null reveal, and only bills for genuinely-new emails. Directly addresses "don't re-pay for data we already have." See [[apollo-integration]] §2.
- 2026-08-08 — Surfaced contact email/phone to later stages (CRM) — revealed emails WERE persisted on `contacts.email` but the leads API never selected them, so CRM showed blank. Added `contactEmail`/`contactPhone` to the OpenAPI `Lead` schema → codegen → both `leads.ts` selects → rendered on the CRM lead card. Verified live: `GET /api/leads` returns real emails. Contract change (spec+regen), not a hand-edit of generated files.
- 2026-08-08 — Prospect Finder fixes (Outreach → Prospect Finder). (1) **"Enriched" filter always empty** — the status dropdown compared `lead.status === "enriched"`, a transient state the AI pipeline instantly advances to `scored` (and Apollo reveal updates the *contact*, not the lead). Rebuilt the funnel filter on real data: `enriched`=has `contactEmail`, `scored`=has `fitScore`/`confidenceScore`, `new`=neither. (2) **Delete prospects** — added per-card checkboxes + "Select all" + a bulk "Delete N" bar + a Delete button in the lead dialog, all behind a confirmation Dialog; wired to existing `DELETE /api/leads/:id` (safe: `opportunities.leadId` is `onDelete:set null`, `sequence_enrollments.leadId` has no FK). (3) **Empty sequence dropdown** — added a guided "New Sequence" dialog (explains what a sequence is; builds ≥1 step; creates it **active** so `enrollContact` accepts it) via `useCreateOutreachSequence`, plus a "Create a sequence" affordance when none exist.
- 2026-08-08 — `OutreachSequence.steps` contract: object → **array** (spec `CreateOutreachSequenceBody`/`UpdateOutreachSequenceBody`/`OutreachSequence` `steps: type array/items object`) + codegen. Root cause: the Zod body validated `steps` as `zod.object().passthrough()`, which **rejects arrays**, so any POST of a real step array (what `sequence-engine` reads) 400'd. Contract change (spec+regen), not a generated-file hand-edit.
- 2026-08-08 — **Pinned orval to exact `8.5.3`** (was `^8.5.2` → resolved to 8.12.3 while committed codegen/header was 8.5.3). The mismatch reformatted 140 generated files AND made orval 8.12's split `types/*Body` interfaces collide with the same-named Zod consts. Pinning restores the version that produced the committed output → codegen diff stays minimal.
- 2026-08-08 — **Fixed pre-existing `pnpm typecheck` breakage** in `lib/api-zod/src/index.ts`: dropped `export * from "./generated/types"` (kept `./generated/api`). The two barrels re-export the same `Create*Body`/`Update*Body` names (Zod value vs TS interface) → TS2308 ambiguous-star error that was red at HEAD. Verified all 161 `@workspace/api-zod` imports repo-wide resolve to Zod values in `api.ts`; the `types/` model interfaces are consumed via `@workspace/api-client-react`, not here. NOTE: apps still have unrelated pre-existing typecheck errors (api-server 78, pmg-os 1 — websocket/slack/scheduler/wallet event-type drift), untouched here.
- 2026-08-08 — Investor-demo hardening of Outreach + CRM (full sweep). (1) **Last name**: Apollo `api_search` redacts `last_name`, so imported contacts had empty last names everywhere downstream; `enrichContacts` now backfills first/last name from the `bulk_match` person echo (only when ours is empty) — fixes CRM/pipeline/lead cards after reveal. (2) **Reveal spinner**: per-row `revealingId`/`revealingAll` state replaces the shared `apolloEnrich.isPending` so only the clicked row spins. (3) **CRM deal contact**: `autoCreateDealForLead` now inherits the lead's `companyId`/`contactId`; opportunities+communications routes select full `contactName` (was `firstName` only) and Opportunity gained `contactEmail`/`contactPhone` (OpenAPI+codegen) → shown in `DealDetailPanel`. (4) Purged fakes: removed the `setTimeout` fake-Enrich (now real Apollo enrich), the Compose fabricated-draft-on-error, lead-dialog `email`/`phone`→`contactEmail`/`contactPhone` drift. (5) Rewired the three fabricated tabs to real data + honest empty states: **Social** unified inbox → `/communications` (inbound) with real channel-connection status from integrations + real reply persistence; **Follow-ups** → `/tasks`; **Analytics** → live comm/lead/task metrics (best-practices relabeled "General guidance"). Both packages build green. Residual (left, calls real AI endpoint): StrategyTab hardcoded fallback when AI returns empty.

---

## SECTION 9 — Subagent Roster

Six project-specific subagents live under [.claude/agents/](.claude/agents/). Each is invokable via the Agent tool by `subagent_type` (its `name` frontmatter field). Full context packs and output contracts are in the agent files; routing detail is in [.claude/routing.md](.claude/routing.md).

| Subagent | Trigger | First files to read |
|---|---|---|
| [frontend-page-agent](.claude/agents/frontend-page-agent.md) | Edits/refactors under `artifacts/pmg-os/src/pages/` or `components/`; new tab/page; UI bug | target page file, `use-api.ts`, `use-ai-mode-context.tsx`, `.claude/anti-patterns.md` |
| [api-endpoint-agent](.claude/agents/api-endpoint-agent.md) | Routes/services under `artifacts/api-server/src/` (except AI plumbing); auth/RBAC changes | `routes/index.ts`, `middleware/auth.ts`, target route, target service |
| [db-schema-agent](.claude/agents/db-schema-agent.md) | Any change inside `lib/db/src/schema/` | target schema file, `lib/db/src/schema/index.ts`, `drizzle.config.ts` |
| [api-contract-agent](.claude/agents/api-contract-agent.md) | `lib/api-spec/openapi.yaml` edits; codegen drift; new generated hook needed | `openapi.yaml`, Orval config, similar existing path |
| [ai-pattern-agent](.claude/agents/ai-pattern-agent.md) | `ai-service.ts`, `wallet-service.ts`, `ai-mode-service.ts`, `agent-registry.ts`, `agent-executor.ts`, `tool-registry.ts`; new AI tool registration | the five core service files, `TOOL_COSTS` consumers, [.claude/skills/pmg-tri-mode-pattern/SKILL.md](.claude/skills/pmg-tri-mode-pattern/SKILL.md) |
| [audit-hunter](.claude/agents/audit-hunter.md) | "Is this faking it"; pre-merge sweep; section polish — **read-only, returns findings list only** | [.claude/anti-patterns.md](.claude/anti-patterns.md) first, then target file(s) |

**Spawn threshold (reminder).** Spawn a custom subagent when **two or more** are true: 5+ files touched, deep exploration needed, output would pollute main context, work is independently parallelizable. Otherwise inline. For read-only lookups use the native `Explore` subagent, not a custom one.

---

## SECTION 10 — Anti-Pattern Guardrails

Project-defining anti-patterns. Catalog with regex recipes, examples, and fix-by assignments: [.claude/anti-patterns.md](.claude/anti-patterns.md). When working on PMG OS:

| Severity | Pattern | Never do |
|---|---|---|
| P0 | False-success toast in `onError` | Write `toast.success(...)` inside an `onError` handler — surface real failure instead |
| P0 | Hardcoded `dummyMode = true` outside env gate | Add a third `dummyMode` flag; consolidate the existing two |
| P0 | Editing under `lib/api-(client-react\|zod)/src/generated/` | Hand-edit generated files — fix the spec and rerun codegen |
| P0 | `setTimeout` faking async work + success toast | Simulate API calls — call the real endpoint or disable the button |
| P1 | Hardcoded sample/demo arrays in a page | Declare `const sampleLeads = [...]` when the entity has a DB table |
| P1 | Lead field-name drift (`firstName`/`lastName`) | Read `firstName`/`lastName` from a `Lead` — use `contactName`/`companyName` |
| P1 | `targetAudience` ↔ `audience` payload mismatch | Use both interchangeably — pick one and align both sides |
| P1 | Direct mode literal comparison | Compare `mode === 'ai_auto'` outside the shim — use `isAuto` / `isHybrid` / `isHuman` |
| P1 | Hallucinated integration (LLM as lead source) | Present LLM-invented prospects as real data — wire `integration-hub-service.ts` or label "Sample" |
| P1 | Hardcoded "active/healthy" status badges in Settings | Display health without binding to a real endpoint |
| P1 | Email fabrication on lead save (`first@company.com`) | Invent emails — store `null` + `contactStatus: "missing_contact"` |

**Always verify** before claiming done: read the diff, run `pnpm typecheck`, run `pnpm --filter @workspace/<pkg> build` for the affected package. For UI changes: visually verify is **not possible from agent** — say so explicitly.

**Pre-merge / pre-claim "done":** run `audit-hunter` on the changed files. Its findings list is the gate.
