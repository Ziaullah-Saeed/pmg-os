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
- **Pending work:** Legal & Compliance agent · Video Guide System · final polish.

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

- **Sessions 1–9 COMPLETE.** Outreach (6 tabs), CRM (5 tabs), Marketing (5 tabs), Production (9 tabs), Admin (4 tabs), Finance (2 tabs), Dashboard, Settings (6 tabs) — all built with realistic cybersecurity-themed dummy data.
- Session 5 wired all 32 AI endpoints to `gpt-4o-mini`; Session 8 added `createdByMode` on leads/opportunities and the `ModeBadge` component (red=AI Auto, blue=Hybrid, gold=Human).
- **NOT built:** Legal & Compliance agent · Video Guide System · final polish pass.
- **Known issues** (from [PMG-OS-Claude-Audit-Report.md](PMG-OS-Claude-Audit-Report.md), May 2026 — re-verify before acting):
  - `dummyMode = true` hardcoded in `testing-service.ts:6` AND `wallet-service.ts:11` → all AI calls return canned text, wallet never charges.
  - "False success" toast anti-pattern across 5 pages (marketing/production/admin/finance/dashboard): `onError` toasts success and injects fabricated fallback data — user can't tell when something failed.
  - Hardcoded constants posing as live data: Finance invoices/contracts/P&L, Admin operations/briefing, Production demo leads, Settings status badges, dashboard recent leads.
  - `targetAudience` vs `audience` payload mismatch in marketing ads → ad targeting silently dropped.
  - Dashboard recent-leads reads `firstName/lastName` but API returns `contactName/companyName`.
  - AI-mode vocabulary drift: `ai_autonomous` vs `ai_auto` with a translation shim in `use-ai-mode-context.tsx`.
  - No real lead-source integration (Apollo / Hunter / Clearbit / ZoomInfo). "Generate Leads" just prompts the LLM. CSV+webhook ingestion exists in `integration-hub-service.ts` but is not wired to UI.
- **Demo creds:** `shershah_nawabi@pmggroup-llc.com` / `PMGAdmin2024!`

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

# Local Postgres (maps to :5433)
docker compose up -d
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

- 2026-05-30 — Adopted this CLAUDE.md as the persistent session bootstrap; replaced minimal earlier version — so Claude is context-aware without re-reading replit.md every session.
- 2026-05-30 — Adopted the `.claude/` agentic architecture (6 custom subagents, anti-pattern catalog, tri-mode skill, tiered skill index) and tracked it in git — so the architecture is portable and self-documenting.
- 2026-05-30 — Deferred adopting a test runner — "always verify" gate is `pnpm typecheck` + `pnpm build` until further notice.

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
