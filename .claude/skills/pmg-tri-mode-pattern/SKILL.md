---
name: pmg-tri-mode-pattern
description: PMG OS-specific contract for the tri-mode AI system (ai_autonomous / hybrid / human_controlled), the four-level mode resolver (record → agent → section → global), the wallet billing pipeline (TOOL_COSTS + 4 pools), the dummyMode trapdoor, and the ai_auto ↔ ai_autonomous vocabulary drift. Read this whenever you touch ai-service.ts, wallet-service.ts, ai-mode-service.ts, agent-registry.ts, agent-executor.ts, tool-registry.ts, or any frontend code that gates UI on mode.
---

# PMG Tri-Mode + Wallet + dummyMode Contract

This is the contract no source file documents in one place. The shape lives across five services and one frontend context. Reading them individually loses the pipeline.

## The pipeline

Every AI action in PMG OS flows through:

```
caller
  └─> shouldAiAct(mode, section, agent, record)   // ai-mode-service.ts
        └─> cache lookup                           // cache-service.ts, cache-intelligence.ts
              └─> wallet reserve                   // wallet-service.ts (uses TOOL_COSTS)
                    └─> callAI(prompt, opts)       // ai-service.ts
                          └─> log to ai_runs       // lib/db/src/schema/ai_runs.ts
                                └─> wallet commit  // wallet-service.ts
                                      └─> return
```

If any layer is skipped, the system is broken. Examples of "skipped":

- Calling OpenAI directly without `callAI()` → no mode gate, no wallet charge, no audit log.
- Adding a tool without a `TOOL_COSTS` entry → it executes for $0 forever.
- Changing the prompt without changing the cache key → users get stale cached answers.

## The three modes

| Mode (canonical) | Frontend synonym | Behavior |
|---|---|---|
| `ai_autonomous` | `ai_auto` | AI acts automatically. Buttons trigger immediate execution. |
| `hybrid` | `hybrid` | AI drafts, human reviews and approves. Output renders in `AiResultPanel` for confirmation. |
| `human_controlled` | `human_controlled` | AI is blocked. Buttons either hide (Production/Admin/Finance) or surface a "human mode active" tooltip. |

**Vocabulary drift.** `ai_autonomous` is the canonical literal in DB and services. `ai_auto` is used in some frontend code. The translation shim lives in `artifacts/pmg-os/src/hooks/use-ai-mode-context.tsx`. **Outside that file**, code should consume `isAuto` / `isHybrid` / `isHuman` rather than comparing the literal.

## Four-level mode resolution

The active mode is the **first explicit setting** found in this order:

1. **Record** — per-row override (e.g. one specific lead is marked Human even though the section is Auto).
2. **Agent** — per-agent setting (e.g. all calls from the Prospect Finder agent are Hybrid).
3. **Section** — per-section setting (e.g. all of Outreach is Auto).
4. **Global** — the system-wide default visible in the sidebar toggle.

`shouldAiAct()` implements this order. Do not reorder it.

## Wallet pools and TOOL_COSTS

Four budget pools: `standard`, `premium`, `creative`, `system`. Each tool registered in `tool-registry.ts` must have a `TOOL_COSTS` entry mapping it to a pool and a price (e.g. `ai-enrich-lead: $0.05`). When `callAI()` runs:

- It looks up the calling tool in `TOOL_COSTS`.
- Reserves the cost against the pool (rejects if pool balance < cost).
- Commits on success, refunds on failure.
- Logs to the `ai_runs` table for audit.

Adding a tool without a cost entry results in **silent free use** — the call succeeds, no charge, no telemetry shows it. Add the cost first.

The wallet also enforces:
- Low-balance notifications when any pool dips below threshold.
- Anomaly detection on unusual spend patterns.

## The dummyMode trapdoor

**Two flags** currently exist:

- `artifacts/api-server/src/services/testing-service.ts:6` — `dummyMode = true` short-circuits `callAI()` to return canned text from a fixed map.
- `artifacts/api-server/src/services/wallet-service.ts:11` — `dummyMode = true` short-circuits reserve/commit so no charge happens.

Both are hardcoded `true` today. This means:

- **Every AI call returns canned text.** Real AI behavior is not exercised in dev.
- **The wallet never charges.** Spend metrics are zero.
- **Real and dummy behavior diverge silently.** A bug in the real path may not show until production.

When working on this code:

1. **To test real behavior locally**, flip both flags to `false` and ensure `.env` has the Replit AI Integrations credentials.
2. **When you add a new tool**, add a matching dummy response in `testing-service.ts` — otherwise dummy mode returns nothing for the new tool and the diff between modes widens.
3. **When you change real behavior**, ask whether dummy should follow.
4. **The eventual fix** is `process.env.PMG_DUMMY_MODE === 'true'` with a single source of truth. Until then, edit both files in lockstep.

## Frontend integration

Read mode via `useAiModeContext()`:

```ts
const { isAuto, isHybrid, isHuman, mode } = useAiModeContext();
```

`mode` is the canonical literal (`ai_autonomous`). The booleans are the safe API; prefer them.

Mode-driven UI conventions (Session 9):

- AI automation buttons **hidden in Human mode** on Production, Admin, Finance pages.
- In Hybrid, the same buttons surface a "draft" affordance; output renders in `AiResultPanel` with approve/reject.
- A `ModeIndicatorBanner` shows in the sidebar layout when the active mode is Hybrid or Human.
- New rows (leads, opportunities) stamp `createdByMode` and render with `ModeBadge` (red = AI Auto, blue = Hybrid, gold = Human).

## Checklist for any AI-touching change

- [ ] Does the new path go through `callAI()`?
- [ ] Does `shouldAiAct()` gate it?
- [ ] Is there a `TOOL_COSTS` entry?
- [ ] Is the cache key correct for the prompt version?
- [ ] Is there a matching dummy response in `testing-service.ts`?
- [ ] Does the mode resolution order survive (record → agent → section → global)?
- [ ] Are mode literals consumed via `isAuto` / `isHybrid` / `isHuman` and not compared directly?
- [ ] Does the frontend stamp `createdByMode` on new rows?
- [ ] Will the new behavior be visible / hidden correctly in all three modes?

## When the contract changes

If a real edit changes the contract above (e.g. you add a fifth wallet pool, or you collapse the two `dummyMode` flags), update this SKILL.md in the same PR. The skill is the canon when source code is the implementation.
