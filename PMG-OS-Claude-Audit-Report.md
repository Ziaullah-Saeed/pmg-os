# PMG Group OS — System Audit Report

**Prepared for:** Cross-review with Claude
**Date:** May 12, 2026
**Reviewed by:** Claude (via architect tool) on the actual codebase

---

## TL;DR

The app currently behaves like a **demo simulator**, not a working product. In most sections, buttons return canned/static data, errors are silently swallowed and shown as success, and large parts of the UI (Finance, Admin, Production demo leads, Settings status badges) are **hardcoded constants pretending to be live data**.

The user's complaint — *"the entire system gives fake and false data, and lead generation isn't clear where leads come from"* — is technically accurate and applies to far more than just lead generation.

---

## 1. Core Root Causes

| # | File:Line | Issue | Severity |
|---|---|---|---|
| 1 | `artifacts/api-server/src/services/testing-service.ts:6` | `dummyModeEnabled = true` hardcoded — every AI call returns canned text regardless of environment | **P0** |
| 2 | `artifacts/api-server/src/services/wallet-service.ts:11,111-114,136-138,267-282` | Wallet appears to track spend but `dummyMode` bypasses reserve/commit/charge — no real billing happens | **P0** |
| 3 | `artifacts/api-server/src/services/ai-service.ts:82-85, 122-125` | `getDummyResponse` + `isDummyMode()` short-circuit returns dummy text while UI implies live AI work | **P0** |

---

## 2. Findings by Category

### A. FAKE DATA PRESENTED AS REAL

| File:Line | Symptom | Root Cause | Fix |
|---|---|---|---|
| `production.tsx:459-465, 499-500, 544-546` | "Quality Verified Leads" panel shows real-looking companies | Hardcoded `sampleLeads` array + misleading "Verified" copy | Load from API and label demo data clearly |
| `finance.tsx:99-114, 239-280` | Invoices, contracts, P&L forecast appear live | Static arrays — no fetching, no DB calls | Source from backend tables |
| `admin.tsx:115-134, 337-365, 470-479` | Operations workload, executive briefing, system evolution all static | Local constants only | Replace with real query hooks + loading/error states |
| `settings.tsx:554-589, 731-851` | Compliance + API + agent health show "active/healthy" | Hardcoded literals, no telemetry | Bind to real compliance/health endpoints |
| `outreach.tsx:143` | Saved leads get fake emails like `first@company.com` | Email fabrication fallback in save handler | Store `null` + `contactStatus: "missing_contact"` |

### B. BROKEN BUTTONS / NO-OP HANDLERS

| File:Line | Symptom | Fix |
|---|---|---|
| `marketing.tsx:745-751` | "Create Content" for SEO gap fakes work after timeout | Call real content endpoint |
| `production.tsx:821-823` | CRM "Sync Now" always succeeds (just `setTimeout`) | Call real integration sync API |
| `finance.tsx:192-199, 324-329` | Send invoice / Remind / Renew only show toasts — no DB change | Wire to invoice/contract mutations |
| `settings.tsx:303-305, 366-368, 409-410, 724-725` | Connect / Configure / Add Key / Save all inert | Wire to mutation endpoints, disable until valid |

### C. ERROR HANDLING — FALSE SUCCESS TOASTS

The same anti-pattern appears in 5 separate pages: when an API call fails, the `onError` handler still fires a "Generated successfully" toast and inserts fabricated fallback data. The user can never tell when something failed.

| File:Line | Effect |
|---|---|
| `marketing.tsx:68-80, 215-227, 240-249, 736-741, 919-932` | Content/AI errors → success toast + fake fallback content |
| `production.tsx:63-65, 157-159, 164-166, 359-361, 503-505, 717-720, 956-965` | Generate Leads + 6 other actions show success on backend failure |
| `admin.tsx:60-62, 178-180, 280-282, 385-387, 513-515` | "Generated/updated" message regardless of outcome |
| `finance.tsx:154-156, 296-298, 380-382` | False "drafted/analysis complete" on API errors |

**Fix pattern:** split `onError` from `onSuccess`, surface real failure, do not insert fake fallback data.

### D. DATA INTEGRITY / DRIFT

| File:Line | Bug |
|---|---|
| `marketing.tsx:493` ↔ `use-api.ts:1850-1853` | Caller sends `targetAudience`, hook expects `audience` — ad targeting silently dropped |
| `dashboard.tsx:298-300` | Recent leads render blank — reads `firstName/lastName` but backend returns `contactName/companyName` |
| `settings.tsx:272-299` | All channels show "Not Connected" even when status is "ready" — UI checks wrong field |

### E. ARCHITECTURAL SMELLS

| Issue | Where | Impact |
|---|---|---|
| Two independent `dummyMode` flags | `testing-service.ts:6` AND `wallet-service.ts:11` | State drift, hard to reason about |
| Two AI mode vocabularies | `use-ai-mode-context.tsx:4, 29-33` uses `ai_autonomous` vs `ai_auto` with translation shim | Bug-prone enum mismatch |
| No real lead data source | `guide-endpoints.ts:28-41, 354-369` | "Generate Leads" only calls `callAI(prompt)` — no Apollo/Hunter/ZoomInfo/LinkedIn integration exists |

---

## 3. Lead Generation Specifically (the user's main complaint)

**Flow today:**
1. User clicks "Find with AI" or "Generate Leads"
2. → `POST /api/outreach/find-prospects` or `POST /api/production/generate-leads`
3. → `callAI()` which is short-circuited by dummy mode → returns hardcoded companies (`ShieldOps Security`, `VaultEdge Cyber`, etc.) from `testing-service.ts:88-97`
4. Even **without** dummy mode, the "real" path just asks GPT-4o-mini to invent companies from a prompt. **There is no integration with any real lead database** anywhere in the codebase.
5. UI shows them under labels like *"AI-Discovered Prospects"* and *"Quality Verified"* — making them look authentic.

**Real ingestion capability EXISTS** (`integration-hub-service.ts:523-586` for CSV + webhooks) but it is **not wired** to the Generate Leads buttons.

---

## 4. Top 10 Files Claude Should Read First

1. `artifacts/api-server/src/services/testing-service.ts`
2. `artifacts/api-server/src/services/wallet-service.ts`
3. `artifacts/api-server/src/services/ai-service.ts`
4. `artifacts/pmg-os/src/pages/settings.tsx`
5. `artifacts/pmg-os/src/pages/production.tsx`
6. `artifacts/pmg-os/src/pages/marketing.tsx`
7. `artifacts/pmg-os/src/pages/admin.tsx`
8. `artifacts/pmg-os/src/pages/finance.tsx`
9. `artifacts/pmg-os/src/pages/dashboard.tsx`
10. `artifacts/pmg-os/src/hooks/use-ai-mode-context.tsx`

---

## 5. Recommended Fix Order

**P0 (do first — restore trust):**
- Make dummy mode opt-in (env-gated), single source of truth.
- Stop fabricating success toasts on errors across all 5 pages.
- Stop fabricating email addresses on lead save.
- Add a persistent "Demo / Synthetic Data" banner whenever dummy mode is on.

**P1 (data layer — make sections real):**
- Wire Finance, Admin, Production demo arrays to real DB queries.
- Fix `targetAudience`/`audience` payload mismatch.
- Fix dashboard recent-leads field name drift.
- Wire Settings Connect/Save/Add Key buttons to real mutations.

**P2 (lead source — when going live):**
- Replace AI-invented prospects with CSV upload + Apollo/Hunter/Clearbit integration.
- Unify AI mode enum (`ai_autonomous` vs `ai_auto`).

---

## 6. Stack Context for Claude

- pnpm monorepo
- Frontend: React 19 + Vite + TailwindCSS + shadcn/ui (`artifacts/pmg-os`)
- Backend: Express 5 (`artifacts/api-server`) on port 8080, all routes under `/api`
- DB: Postgres + Drizzle ORM
- AI: gpt-4o-mini via Replit AI Integrations proxy
- 6 sections: Outreach, CRM, Marketing, Production, Admin, Finance, plus Settings

---

*End of report. Paste this entire document into Claude along with screenshots of any specific screen you want it to investigate.*
