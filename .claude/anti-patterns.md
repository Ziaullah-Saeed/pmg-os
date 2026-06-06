# PMG OS Anti-Pattern Catalog

> Grep-recipe catalog. Queried by the `audit-hunter` subagent. Sourced from the May 2026 audit ([PMG-OS-Claude-Audit-Report.md](../PMG-OS-Claude-Audit-Report.md)). Severity scale: **P0** (breaks trust / live data), **P1** (silent bug / data drift), **P2** (style / drift that will compound).
>
> Each entry includes a regex you can pass to `Grep`, an explanation of why the pattern matters, a real example from the codebase, and the subagent that should fix it.

---

## P0 — False-success toast inside onError

**Regex (multiline-friendly):**
```
onError[\s\S]{0,200}?toast\.(success|info)\(\s*["'`][^"'`]*?(success|generated|drafted|complete|analysis)
```

**Why it matters.** When an API call fails, the user is shown "Generated successfully" and fake fallback content is injected. The user can never tell when something failed. This is the single most-cited audit finding.

**Real examples** (verify before relying on these — files may have changed):
- `artifacts/pmg-os/src/pages/marketing.tsx:68-80, 215-227, 240-249, 736-741, 919-932`
- `artifacts/pmg-os/src/pages/production.tsx:63-65, 157-159, 164-166, 359-361, 503-505, 717-720, 956-965`
- `artifacts/pmg-os/src/pages/admin.tsx:60-62, 178-180, 280-282, 385-387, 513-515`
- `artifacts/pmg-os/src/pages/finance.tsx:154-156, 296-298, 380-382`

**Fix.** Split `onError` from `onSuccess`. In `onError`, call `toast.error(...)` with the real message. Do not insert any fabricated fallback content.

**Fix-by:** `frontend-page-agent`.

---

## P0 — Hardcoded `dummyMode = true` outside an env gate

**Regex:**
```
dummyMode\s*=\s*true
```

**Why it matters.** Two independent `dummyMode` flags exist (`testing-service.ts:6` and `wallet-service.ts:11`). Both are hardcoded `true`. This means every AI call returns canned text and the wallet never charges. The flag must be env-gated with a single source of truth.

**Real examples:**
- `artifacts/api-server/src/services/testing-service.ts:6`
- `artifacts/api-server/src/services/wallet-service.ts:11`

**Fix.** Replace with `process.env.PMG_DUMMY_MODE === 'true'` (or a centralized helper). Surface the active state in a persistent UI banner whenever dummy mode is on.

**Fix-by:** `ai-pattern-agent`.

---

## P0 — Editing under `generated/`

**Regex (file path test, not content):**
```
lib/api-(client-react|zod)/src/generated/
```

**Why it matters.** Codegen overwrites these files. Hand-edits vanish silently on the next `pnpm --filter @workspace/api-spec codegen`. Worse, the spec and the runtime drift in opposite directions until someone notices.

**Real example.** None recorded — this is preventive. Audit `git log -p lib/api-client-react/src/generated/ lib/api-zod/src/generated/` to confirm no hand-edits have slipped in.

**Fix.** Hard refuse. The change belongs in `lib/api-spec/openapi.yaml`, then codegen.

**Fix-by:** `api-contract-agent`.

---

## P0 — `setTimeout` faking async work, followed by success toast

**Regex (multiline):**
```
setTimeout\([\s\S]{0,300}?toast\.(success|info)
```

**Why it matters.** The button looks like it called an API. It didn't. The user sees a success message for work that never happened.

**Real examples:**
- `artifacts/pmg-os/src/pages/marketing.tsx:745-751` — "Create Content" for SEO gap fakes work.
- `artifacts/pmg-os/src/pages/production.tsx:821-823` — CRM "Sync Now" always "succeeds".

**Fix.** Call the real endpoint. If the endpoint doesn't exist, disable the button and label it "coming soon" — do not fake it.

**Fix-by:** `frontend-page-agent` for the button; `api-endpoint-agent` for the missing endpoint.

---

## P1 — Hardcoded sample / demo arrays in a page

**Regex:**
```
const\s+(sample|demo|mock|fake)[A-Z]\w*\s*=\s*\[
```

**Why it matters.** Pages display fabricated lists ("Quality Verified Leads", static invoices, hardcoded operations metrics) styled exactly like live data. The user thinks the system is working when it isn't.

**Real examples:**
- `artifacts/pmg-os/src/pages/production.tsx:459-465` — `sampleLeads`.
- `artifacts/pmg-os/src/pages/finance.tsx:99-114, 239-280` — static invoices, contracts, P&L.
- `artifacts/pmg-os/src/pages/admin.tsx:115-134, 337-365, 470-479` — workload, briefing, evolution.

**Fix.** Replace with a TanStack Query call to the real endpoint. If the endpoint doesn't exist yet, render an explicit empty state with the words "no data yet" — never invent.

**Fix-by:** `frontend-page-agent`; `api-endpoint-agent` if a new endpoint is required.

---

## P1 — Lead field-name drift (`firstName` / `lastName`)

**Regex:**
```
\b(firstName|lastName)\b
```
*(Scope this scan to `artifacts/pmg-os/src/`. The API server may legitimately use these names on `User`.)*

**Why it matters.** The API returns `contactName` and `companyName` on `Lead`. Code reading `firstName` / `lastName` renders blank.

**Real example:**
- `artifacts/pmg-os/src/pages/dashboard.tsx:298-300` — "Recent leads" renders blank.

**Fix.** Use `contactName`, `companyName`. Helpers exist: `getLeadName()`, `getLeadCompany()`, `getLeadInitials()`.

**Fix-by:** `frontend-page-agent`.

---

## P1 — `targetAudience` payload mismatch

**Regex:**
```
targetAudience
```
*(Scope this scan to `artifacts/pmg-os/src/pages/marketing.tsx` and `artifacts/pmg-os/src/hooks/use-api.ts`.)*

**Why it matters.** The hook expects `audience`. Frontend posts `targetAudience`. Field is silently dropped. Ad targeting goes nowhere.

**Real example:**
- `artifacts/pmg-os/src/pages/marketing.tsx:493` ↔ `artifacts/pmg-os/src/hooks/use-api.ts:1850-1853`.

**Fix.** Pick one name and use it both sides. `audience` is the canonical choice unless OpenAPI declares otherwise.

**Fix-by:** `frontend-page-agent`.

---

## P1 — Direct mode literal comparison

**Regex:**
```
['"](ai_auto|ai_autonomous|hybrid|human_controlled)['"]
```
*(Suppress hits inside `use-ai-mode-context.tsx`, `ai-mode-service.ts`, and `lib/db/src/schema/`. Those are the legitimate definers of the literal.)*

**Why it matters.** The `ai_auto` ↔ `ai_autonomous` translation shim lives in `use-ai-mode-context.tsx`. Code outside that file should use `isAuto` / `isHybrid` / `isHuman` from the context, or the resolver from `ai-mode-service.ts`. Direct literals encode one side of the drift and break the other.

**Fix.** Replace with `isAuto` / `isHybrid` / `isHuman` (frontend) or `shouldAiAct()` (backend).

**Fix-by:** `frontend-page-agent` (UI) / `ai-pattern-agent` (backend).

---

## P1 — Hallucinated integration (LLM as lead source)

**Regex (filename match):**
```
guide-endpoints\.ts
```
*(And: grep `callAI` inside any route handler whose name contains `prospect`, `lead`, `find`, or `generate`.)*

**Why it matters.** The audit found "Generate Leads" calls `callAI(prompt)` and presents the LLM's invented company names as "AI-Discovered Prospects" or "Quality Verified Leads". There is no real Apollo / Hunter / Clearbit / ZoomInfo integration. Real ingestion scaffolding exists in `integration-hub-service.ts` (CSV + webhooks) but is not wired to the UI.

**Real example:**
- `artifacts/api-server/src/routes/guide-endpoints.ts:28-41, 354-369` — fabricates leads via LLM prompt.

**Fix.** Wire the button to `integration-hub-service.ts` ingestion, or relabel the surface as "Sample Prospects" so the user knows they're synthetic. The long-term fix is a real provider integration.

**Fix-by:** `api-endpoint-agent` (rewire) + `frontend-page-agent` (relabel).

---

## P1 — Settings status badge hardcoded "active/healthy"

**Regex:**
```
status:\s*['"](active|healthy|connected|ready)['"]
```
*(Scope to `artifacts/pmg-os/src/pages/settings.tsx`.)*

**Why it matters.** Compliance, API, agent health badges show "active/healthy" via hardcoded literals — no telemetry behind them.

**Real example:**
- `artifacts/pmg-os/src/pages/settings.tsx:554-589, 731-851`.

**Fix.** Bind to real health endpoints (`channel-health-service.ts` exists already on the backend).

**Fix-by:** `frontend-page-agent` (bind) + possibly `api-endpoint-agent` (expose endpoint).

---

## P1 — Email fabrication on lead save

**Regex:**
```
@\$\{[^}]*company[^}]*\}
```
*(Plus any literal `first@` fallback in lead save flows.)*

**Why it matters.** The audit found saved leads receiving fake emails like `first@company.com` when the contact had no email. Downstream outreach campaigns then look real but bounce.

**Real example:**
- `artifacts/pmg-os/src/pages/outreach.tsx:143`.

**Fix.** Store `null` and set `contactStatus: "missing_contact"`. Never invent an email.

**Fix-by:** `frontend-page-agent`.

---

## P2 — Two independent `dummyMode` flag definitions

**Regex (count occurrences):**
```
const\s+dummyMode\s*=
```

**Why it matters.** When two flags exist, state drifts. The two known definitions (`testing-service.ts:6` and `wallet-service.ts:11`) can disagree. The long-term fix is a single helper exported from one place.

**Fix.** Consolidate to one source. Until then, when you edit one, audit the other in the same PR.

**Fix-by:** `ai-pattern-agent`.

---

## P2 — Inert button handler (no mutation hook, no fetch)

**Regex (heuristic; expect false positives):**
```
onClick=\{[\s\S]{0,300}?toast\.(success|info)
```
*(Suppress hits where a `useMutation` is called in the handler.)*

**Why it matters.** Settings "Connect" / "Configure" / "Add Key" / "Save", Finance "Send Invoice" / "Remind" / "Renew", and several others fire only a toast — no DB change, no API call. The button looks functional and isn't.

**Real examples:**
- `artifacts/pmg-os/src/pages/settings.tsx:303-305, 366-368, 409-410, 724-725`
- `artifacts/pmg-os/src/pages/finance.tsx:192-199, 324-329`

**Fix.** Wire to a real mutation. Disable until the form is valid. Do not toast success without a mutation.

**Fix-by:** `frontend-page-agent` + `api-endpoint-agent` (if no endpoint exists yet).

---

## Updating this catalog

When `audit-hunter` reports a **New Anti-Pattern Observed**, the main thread evaluates whether to add it here. To add an entry:

1. Confirm at least one real example exists in the current codebase.
2. Write a regex narrow enough to avoid false positives. Document a suppression rule if needed.
3. Assign a severity and a fix-by subagent.
4. Append a new section in the right severity block.
5. Append a one-line entry to CLAUDE.md §10 if the pattern is project-defining (P0/P1 typically); leave P2 patterns here only.
