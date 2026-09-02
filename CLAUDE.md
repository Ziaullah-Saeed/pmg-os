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
- 2026-08-21 — Enrichment-cascade v2 (diagnosis + provenance). **Root cause of "PDL charged but no data":** the user's PDL plan returns emails/phones as BOOLEAN availability flags (`true`/`false`), not values — so `firstEmail`/phone iterated a boolean → threw AFTER PDL billed the credit → the route's silent `catch {}` hid it. Also the connection test hit PDL's paid `/person/enrich` with a real `profile` → billed (the "2 credits used" with no enrich run). Fixes: (1) defensive `asStr`/`asArr` coercion in `pdl-service.ts` (booleans → null, no crash) + `emailLocked`/`phoneLocked` flags surfaced; (2) connection test now sends a param-less request → PDL 400 (missing params, FREE), verified live; (3) PDL errors logged + returned (`pdlErrors`), no longer swallowed; (4) cascade reordered — free website scan runs BEFORE paid steps AND again AFTER (Apollo redacts the org domain, so PDL often supplies the website the first scan lacked); idempotent skip when complete. **Per-field provenance:** new `enrichment_sources` JSONB on contacts+companies (ALTER TABLE), each step tags fields ("apollo"/"pdl"/"website"); `buildFieldSources` (`services/field-sources.ts`) flattens to Lead/Opportunity `fieldSources` (spec+regen); `ContactChannels` renders a small source chip per field. Provider/display choices were user-selected via AskUserQuestion. ⚠️ PDL socials (LinkedIn/X/Facebook) DO return on the plan; emails/phones need a PDL contact-data/PII plan. See [[enrichment-cascade]]. Both apps build green.
- 2026-08-18 — Built multi-source enrichment cascade (email · phone · website · ALL socials) surfaced on every list. `POST /api/apollo/enrich` now runs 3 fill-empty-only steps: **Apollo** (email/phone) → **People Data Labs** (`services/pdl-service.ts`, connection-gated provider `pdl`; no-op until key pasted) → **free website scan** (`services/website-enrichment-service.ts`, harvests IG/YT/TikTok/office-phone from the company site — the only source B2B providers lack). Added company social cols + contact `twitter_url` via ALTER TABLE; added website/socials/companyPhone to `Lead`+`Opportunity`+`Company`+`Contact` (spec+regen) + both selects; NEW `components/contact-channels.tsx` renders channels on outreach list/dialog + CRM card + deal panel; NEW `PdlConnectionCard` in Settings. Provider choice (PDL + website-scan combo) + phone policy were user-selected via AskUserQuestion. User go-live: paste PDL key (free 100/mo tier). ⚠️ After schema edits run `npx tsc -b lib/db lib/api-zod lib/api-client-react --force` or api-server sees stale column types. See [[enrichment-cascade]]. Both apps build green.
- 2026-08-08 — Investor-demo hardening of Outreach + CRM (full sweep). (1) **Last name**: Apollo `api_search` redacts `last_name`, so imported contacts had empty last names everywhere downstream; `enrichContacts` now backfills first/last name from the `bulk_match` person echo (only when ours is empty) — fixes CRM/pipeline/lead cards after reveal. (2) **Reveal spinner**: per-row `revealingId`/`revealingAll` state replaces the shared `apolloEnrich.isPending` so only the clicked row spins. (3) **CRM deal contact**: `autoCreateDealForLead` now inherits the lead's `companyId`/`contactId`; opportunities+communications routes select full `contactName` (was `firstName` only) and Opportunity gained `contactEmail`/`contactPhone` (OpenAPI+codegen) → shown in `DealDetailPanel`. (4) Purged fakes: removed the `setTimeout` fake-Enrich (now real Apollo enrich), the Compose fabricated-draft-on-error, lead-dialog `email`/`phone`→`contactEmail`/`contactPhone` drift. (5) Rewired the three fabricated tabs to real data + honest empty states: **Social** unified inbox → `/communications` (inbound) with real channel-connection status from integrations + real reply persistence; **Follow-ups** → `/tasks`; **Analytics** → live comm/lead/task metrics (best-practices relabeled "General guidance"). Both packages build green. Residual (left, calls real AI endpoint): StrategyTab hardcoded fallback when AI returns empty.
- 2026-08-29 — **Apollo full-fidelity capture + rich prospect UI.** The pipeline was discarding most of Apollo's payload. Now capture-and-surface everything. **KEY FINDING (resolves the old §10↔§2 conflict):** the connected 22-char key answers BOTH `api_search` and `bulk_match` (200, not 403) — but `api_search` **redacts the org fields** (domain, revenue, employees, technologies, keywords, socials all empty on this plan). The richness lives in `bulk_match` (enrichment): it echoes the FULL person + `organization` (verified email+status, department, location, work phone, company website/phone/LinkedIn/employees/revenue/funding/technologies/keywords). So `enrichContacts` now fill-empty-updates BOTH the contact AND its company from the match (provenance-tagged "apollo"), reusing `fillEmptyCompanyById`+`normalizeOrganization`. `normalizePerson`/`NormalizedPerson` widened too (helps higher plans + fixtures). PDL adds company employees/size opportunistically. **Schema (ALTER TABLE, push still blocked):** contacts +`email_status,work_phone,department,location`; companies +`keywords,technologies,employee_count,funding`. **Contract:** Lead+Opportunity gained contactTitle/seniority/department/emailStatus/workPhone/contactLocation/industry/subIndustry/companySize/employeeCount/revenue/funding/keywords/technologies (spec+regen, both selects). **UI:** NEW `components/prospect-card.tsx` (verified badge, title·seniority·department, company·industry·size·revenue, tech chips, ContactChannels) replaces the inline pipeline card; detail dialog gained CompanyFacts + tech/keyword chips; live search results show revenue/socials/tech. NO CSV importer (user: "users never give a CSV — find/prepare data via Apollo+PDL+webscan"). Verified live end-to-end (search→import→enrich, 1 credit, real fields persisted, rows cleaned up); both builds green, 0 new tsc errors. See [[enrichment-cascade]].
- 2026-08-30 — **Prospect Finder UX overhaul + import fix.** (1) **Apollo `api_search` returns EMPTY pagination metadata on this plan** (`total_entries`/`per_page`/`total_pages` all blank — verified live) → Prev/Next was dead and the user was stuck on page 1 seeing the same top results every search ("duplicate/repeated prospects", "can only search 25", "not all importable" = re-imports skip as `already_imported`). Fix: the working lever is **`per_page`** — added a result-count selector (10/20/30/50/100) driving it; dropped the broken pager. (2) **Two-list UX → one:** the whole Find-Prospects experience (filters + count + detailed results + import) now lives in a focused **Dialog**; the page shows a SINGLE pipeline list (`ProspectCard`) + a post-import enroll bar. (3) **Dedup + hide already-in-pipeline:** results dedupe by `apolloId` and hide prospects already imported (matched via new `externalCrmId` on the Lead contract — spec+regen; route already selected it), so re-search never re-surfaces them; "Select all N" selects only importable-new. (4) **Removed the annoying bottom phone checkbox** — phone capture is now always-on (`revealPhone=true`; free for known numbers, async mobile only fires when `APOLLO_WEBHOOK_URL` is set). Reveal now happens on the pipeline card, not in search results. Both builds green, 0 new tsc errors.
- 2026-08-31 — **Prospect Finder simplified to a one-step flow (supersedes the 2026-08-30 dialog).** User: "make it as simple as possible — no dialogs, search imports directly to the pipeline, select which to enrich & move to CRM." So: (1) the search dialog is now an **inline collapsible panel** (`showFinder` → `GlassCard`, no `Dialog`); (2) **Search = search + import in one action** (`handleFindProspects`: `apolloSearch` → on success `apolloImport(data.people)` → invalidate leads) — NO intermediate results list; matches land straight in the pipeline (backend skips already-imported by `externalCrmId`), panel shows a one-line summary; (3) **bulk actions on selected pipeline prospects** replace the old per-result flow — the pipeline select-all header gained **Enrich N** (`handleBulkEnrich` → `apolloEnrich` on selected contactIds), **Move to CRM** (`handleBulkMoveCrm` → PATCH qualified), **Enroll** (seq picker → `apolloEnroll`), **Delete**; (4) removed all search-results-selection state/handlers (`apolloResult`/`selectedIds`/`importedMap`/`toggleSelect`/`handleImportSelected`/`handleReveal`/`handleRevealAll`/`handleEnroll`/`revealPhone` toggle) and the enroll bar. Net: fewer clicks, one list, no modals; all functionality kept (search, import, enrich, move-to-CRM, enroll, delete). NOTE: direct-import fires auto-score per new lead (wallet-gated) — a big search imports many at once. pmg-os builds green, 0 new tsc errors.
- 2026-09-01 — **⚠️ DEPLOYMENT GOTCHA (root of repeated "nothing changed / it's wrong" reports): the user runs the app via DOCKER at http://localhost:3200 (`pmg-os-web` nginx serving the baked Vite build + `pmg-os-api` bundle), NOT the Vite dev server.** Editing source + `pnpm build`/typecheck does NOT change the running app — the containers keep the OLD images. Sessions 3–5 of Apollo work were all invisible to the user for this reason. **FIX + RULE: after ANY `artifacts/*` or `lib/*` change, run `docker compose up -d --build` (rebuilds migrate/api/web; layer-cached so no npm re-download) so it reaches :3200, then hard-refresh (Ctrl+Shift+R) to drop the cached JS bundle.** Verified this session: rebuilt all three images → web bundle has the inline-panel code, api bundle has `orgToCompanyValues`/`email_status`/`employee_count`, `migrate` hit the data-loss guard and ABORTED without pushing (`user_sessions` + 4454 embeddings intact — the 8 new columns were already applied via `ALTER TABLE`), live login + `/api/apollo/search` (200, live) confirmed through :3200. Pipeline currently has 0 leads.

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
