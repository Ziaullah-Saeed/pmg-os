# Task Routing Matrix

> Decision table for routing incoming requests to the right subagent(s). Read top-to-bottom; first match wins. The CLAUDE.md §9 table is a one-screen summary of this file; this file holds the deeper "first files" detail and step sequences.

## Routing rules — fast lookup

| Request shape | Primary subagent | Skills (Tier 2) | First files to read |
|---|---|---|---|
| Fix a UI bug in any section | `frontend-page-agent`. Spawn `audit-hunter` first if the symptom matches a known anti-pattern (false success, fake data, blank fields). | `react-vite`, `diagnostics` | The page file under `artifacts/pmg-os/src/pages/`, `use-api.ts`, the route handler the failing call hits, the service it calls. |
| Fix a 500 / data bug | `api-endpoint-agent`; consider `ai-pattern-agent` if the failing path calls `callAI`. | `diagnostics`, `validation` | Route file, service, DB schema for any table touched, the request-shape Zod schema. |
| Add a new AI agent (e.g. Legal & Compliance) | Sequential: `ai-pattern-agent` (register) → `db-schema-agent` (only if new tables) → `api-endpoint-agent` (handler) → `api-contract-agent` (spec) → `frontend-page-agent` (UI). | `ai-integrations-openai`, `workflows`, `threat_modeling` | `agent-registry.ts`, `tool-registry.ts`, an existing agent of similar shape for style, then layer-by-layer. |
| Add a new tab to an existing page | `frontend-page-agent`. Coordinate with `api-endpoint-agent` only if new endpoints are needed. | `react-vite` | The target page file, sibling tabs for style, `use-api.ts`. |
| Refactor `wallet-service`, `ai-service`, or `ai-mode-service` | `ai-pattern-agent`, read-heavy first pass before any edit. | `ai-integrations-openai`, `diagnostics` | All five core service files, `TOOL_COSTS` consumers (grep), `ai_runs` schema. **Flip `dummyMode` to false locally before testing**, or behavior will lie. |
| Schema change | `db-schema-agent`. Grep every consumer of any renamed symbol before editing. | `database` (deep) | Target schema file, `lib/db/src/schema/index.ts`, `lib/api-spec/openapi.yaml` (if the column is in the spec). |
| Add or change an endpoint that needs a generated hook | `api-contract-agent` first (spec) → `api-endpoint-agent` (handler) → `frontend-page-agent` (wire). | `validation` | `openapi.yaml`, an existing similar path for style, the planned handler location. |
| Wire a real lead-source integration (Apollo / Hunter / Clearbit) | Parallel after design alignment: `api-endpoint-agent` (handler) + `api-contract-agent` (spec). | `integrations`, `external_apis`, `environment-secrets` | `integration-hub-service.ts` (existing CSV+webhook scaffolding), `guide-endpoints.ts` (the current LLM-fakes-leads path that must be replaced), `openapi.yaml`. |
| Build the Video Guide System | Mostly `frontend-page-agent`; `api-endpoint-agent` only if guide state persists server-side. | `react-vite` | `SidebarLayout` and any existing video guide spike noted in replit.md Session 6. |
| Audit a section for anti-patterns | `audit-hunter` (read-only, returns a findings list; never fixes). | none | `.claude/anti-patterns.md` first, then the target section's pages, routes, services. |
| Pre-merge sweep of a branch | `audit-hunter` first → then `frontend-page-agent` / `api-endpoint-agent` / `ai-pattern-agent` for each P0/P1 fix in turn. | `code_review`, `security_scan` | The list of files changed in the branch. |
| Deploy to production | **No custom subagent.** Sequential inline gates: confirm `dummyMode` off; confirm `.env` has no dev secrets; confirm DB migration state; run typecheck and build. | `deployment`, `security_scan`, `environment-secrets` | `testing-service.ts:6`, `wallet-service.ts:11`, `.env`, build output. |
| `/review` a PR | The slash command spawns its own pipeline. Do not also spawn custom subagents in parallel. | `code_review` | n/a — defer to skill. |
| `/security-review` | Same — slash command runs the pipeline. | `security_scan` | n/a. |
| Plan an architectural change | Native `Plan` subagent. Its output then routes to one or more custom subagents. | none | n/a — Plan handles its own context. |
| "Where is X defined" / "which files use Y" | Native `Explore`. Do not use a custom subagent for read-only lookups. | none | n/a. |
| "Explain how X works" | **No subagent.** Read CLAUDE.md first, then the canonical source. | Whichever Tier 2 skill X maps to | The source file(s) for X. |

## Spawn threshold (reminder)

Spawn a custom subagent when **two or more** are true:

1. Predicted work touches 5+ files or crosses 2+ packages.
2. The work needs deep exploration (10+ files read) before editing.
3. Output would pollute main context (long file dumps, repeated grep results).
4. The task is independently parallelizable.

Otherwise: handle inline.

## Step sequences (the harder cases)

### Add a new AI agent (worked example: Legal & Compliance)

1. **Main thread:** sketch the agent's domain, capabilities, and where its output renders. Confirm with user.
2. **`ai-pattern-agent`:** register in `agent-registry.ts`; add tools to `tool-registry.ts`; add entries to `TOOL_COSTS`; pick the wallet pool.
3. **`db-schema-agent`** (if new tables): e.g. `compliance_checks`, `legal_review_queue`. Include `createdByMode`.
4. **`api-contract-agent`:** add paths to `openapi.yaml` (`/api/legal/checks`, etc.), run codegen.
5. **`api-endpoint-agent`:** implement handlers, wire `shouldAiAct` + wallet + `callAI`.
6. **`frontend-page-agent`:** new section or tab; render via `AiResultPanel`; respect mode visibility.
7. **`audit-hunter`** before merge: scan the new files.
8. **Main thread:** append a Decisions Log line in CLAUDE.md §8 (e.g. "2026-MM-DD — added Legal & Compliance as 33rd agent in `system` wallet pool — to close the pending-work gap").

### Wire a real lead-source integration (worked example: Hunter.io)

1. **Main thread:** confirm provider choice, key handling, rate-limit budget. Confirm with user.
2. **`api-contract-agent`** (parallel with 3): add `/api/leads/import-from-hunter` path to `openapi.yaml`.
3. **`api-endpoint-agent`** (parallel with 2): implement using `integration-hub-service.ts` scaffolding; secrets via `.env`; emit through `event-bus.ts`.
4. **`db-schema-agent`** only if a `lead_sources` audit table is added.
5. **`frontend-page-agent`:** replace the current LLM-faking-leads button on Production / Outreach; preserve `createdByMode` labeling.
6. **`audit-hunter`:** scan `guide-endpoints.ts` to confirm the LLM-prospect anti-pattern is removed.
7. **Main thread:** update CLAUDE.md §3 to strike through the "no real lead-source integration" known issue.

### Refactor `wallet-service`

1. **Main thread:** name the goal (e.g. "make `dummyMode` env-gated; consolidate to one helper").
2. **`ai-pattern-agent`** (read-only first pass): grep every `dummyMode` reference; report the consolidation surface.
3. **Main thread:** approve the surface.
4. **`ai-pattern-agent`** (edit pass): make the change.
5. **`audit-hunter`:** verify only one `dummyMode = ` definition remains in source.
6. **Main thread:** update CLAUDE.md §3 (known issue → resolved) and §8 (decision log).
