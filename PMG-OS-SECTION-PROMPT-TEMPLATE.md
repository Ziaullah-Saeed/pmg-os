# PMG Group OS — Master Section Work Prompt
## Copy this entire prompt and fill in [SECTION NAME] when starting a new section

---

## HOW TO USE THIS

When you're ready to work on a section, paste this entire prompt and replace `[SECTION NAME]` with the section you want (e.g., "Outreach", "CRM", "Finance", "Marketing", "Production", "Admin", "Settings", "Dashboard", "Login & Auth", "Global Layout").

---

## THE PROMPT TO PASTE

---

You are working on **PMG Group OS** — an AI business operating system for PMG Group LLC, a cybersecurity/IT marketing agency.

**Today's section:** `[SECTION NAME]`

---

## SYSTEM CONTEXT

**What this system is:**
A 6-section, 32-agent AI operating system. Core promise: generate 20 ready-to-close deals in the first month. Built for PMG Group to run their entire business — finding clients, closing them, delivering results, invoicing them.

**Tech stack:**
- Frontend: React 19 + Vite + TailwindCSS + shadcn/ui + Framer Motion (`artifacts/pmg-os`)
- Backend: Express 5 + Node.js (`artifacts/api-server`) — all routes under `/api`, port 8080
- Database: PostgreSQL + Drizzle ORM
- AI: Replit AI gateway (already connected at `AI_INTEGRATIONS_OPENAI_BASE_URL`) — dummy mode currently hardcoded ON
- Brand: Crimson, Navy Blue, Golden Yellow. Dark-first glassmorphic design

**Admin login:** `shershah_nawabi@pmggroup-llc.com` / `PMGAdmin2024!`

**AI mode system:** Every section runs in one of 3 modes:
- **AI Autonomous** — agents run automatically, no human approval needed
- **Hybrid** — AI acts, but waits for human approval on low-confidence decisions
- **Human Controlled** — AI is blocked, human does everything manually

**Known system-wide issues to fix as you encounter them:**
1. `dummyModeEnabled = true` is hardcoded in `testing-service.ts` line 6 — all AI returns canned text
2. `dummyMode = true` is hardcoded in `wallet-service.ts` line 11 — duplicate flag
3. Multiple pages use hardcoded arrays instead of real DB queries (Finance, Admin, Production, Marketing)
4. Error handlers across 5 pages fire success toasts on API failures — fix on every page you touch
5. Field name drift: `dashboard.tsx` reads `firstName/lastName` but backend returns `contactName/companyName`
6. `marketing.tsx` sends `targetAudience` but hook expects `audience`
7. Inert buttons in Settings, Finance, Production — connect to real mutations on every page you touch
8. AI mode vocabulary mismatch: `ai_autonomous` vs `ai_auto` used inconsistently

---

## THE 533-ITEM CHECKLIST

This system has a complete 533-item testing checklist. Each item has:
- HOW IT WORKS (what the feature does)
- Behavior in each of the 3 AI modes
- Expected result

The checklist is organized as:
- Section 0: Login & Authentication (items 0.1–0.10)
- Section 1: Global Layout & Navigation (items 1.1–1.15)
- Section 2: Dashboard (items 2.1–2.20)
- Section 3: Outreach — 6 tabs (items 3.1–3.60)
- Section 4: CRM — 5 tabs (items 4.1–4.55)
- Section 5: Marketing — 5 tabs (items 5.1–5.50)
- Section 6: Production — 9 tabs (items 6.1–6.80)
- Section 7: Admin — 4 tabs (items 7.1–7.40)
- Section 8: Finance — 2 tabs (items 8.1–8.30)
- Section 9: Settings — 6 tabs (items 9.1–9.60)
- Section 10–14: AI Modes, cross-system, Legal, Video Guide

---

## BLUEPRINT REFERENCE

The system was designed from `PMG-OS-FINAL-BLUEPRINT-v3.md`. Key rules from the blueprint:
- Claude (Anthropic) is the primary AI engine — human tone, zero AI fluff, zero jargon
- Budget: $300–500/month for APIs, $600/month for ad spend
- Every button must trigger a real action — no dead ends, no orphan buttons
- Every section must work in all 3 AI modes with correct behavior per mode
- Forbidden words in any AI output: "leverage", "synergy", "cutting-edge", "game-changing", "innovative"
- Pricing tiers: Starter $2,500 / Growth $5,000 / Enterprise $10,000

---

## YOUR TASK FOR THIS SESSION — [SECTION NAME]

**Step 1 — Audit**
Go through every checklist item for `[SECTION NAME]`. For each item:
- Read the current code to verify whether it passes or fails
- Mark it: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL / 🔒 BLOCKED (needs API key)
- List the exact file:line causing failures

**Step 2 — Fix all FAILs and PARTIALs**
In this order:
1. Fix error handlers first — no more false success toasts on any button in this section
2. Replace hardcoded arrays with real DB queries (tables already exist in schema)
3. Wire any inert buttons to real mutations
4. Fix field name mismatches
5. Make AI buttons work correctly in all 3 modes (show in AI Auto + Hybrid, hide in Human mode)
6. Ensure dummy mode behavior is consistent — if dummy mode ON, AI returns realistic canned text; if OFF, real AI call fires

**Step 3 — Mode verification**
After fixing, verify each feature behaves correctly in:
- AI Autonomous: action runs automatically, result displays, no approval needed
- Hybrid: action runs, if confidence < 80% goes to Pending Actions queue for approval
- Human Controlled: AI buttons are hidden, user does everything manually

**Step 4 — Report back**
When done, provide:
- Checklist results table: item number | description | status | what was fixed
- List of any BLOCKED items (which API key is needed)
- List of any issues found that affect OTHER sections (so we fix them when we get there)
- Confirmation that the section was tested end-to-end

---

## RULES — DO NOT BREAK THESE

1. **No fake fallbacks.** If an API key is missing, throw a clear error naming the missing key. Do NOT silently return fake data.
2. **No false success.** If an action fails, show a red error toast with what failed. Never show "Success" on a failed operation.
3. **No hardcoded arrays** where a DB table already exists. Query the DB.
4. **Real error logging.** Every failed API call must log: the route, the error message, the request payload.
5. **All 3 modes must work.** Every feature must have correct behavior in AI Autonomous, Hybrid, and Human modes.
6. **Human tone in AI output.** No AI fluff. No forbidden words. Write like a sharp human, not a marketing bot.
7. **Fix what you touch.** If you open a file and see a broken error handler or hardcoded array unrelated to your main task, fix it.
8. **Stop and ask before touching the database schema.** DB changes need migration — flag them instead of doing them silently.

---

## AVAILABLE ENVIRONMENT

**Already connected (no key needed):**
- PostgreSQL database (`DATABASE_URL` set)
- Replit AI gateway for OpenAI (`AI_INTEGRATIONS_OPENAI_BASE_URL` set)
- Session authentication (`SESSION_SECRET` set)

**Not yet connected (need keys — mark items as BLOCKED):**
- Apollo.io → `APOLLO_API_KEY` (lead sourcing)
- Smartlead → `SMARTLEAD_API_KEY` (email sending)
- Stripe → `STRIPE_SECRET_KEY` (invoicing)
- GoHighLevel → `GHL_CLIENT_ID` + `GHL_CLIENT_SECRET` (CRM sync)
- Resend → `RESEND_API_KEY` (system emails)
- Cal.com → `CALCOM_API_KEY` (meeting booking)
- HubSpot → `HUBSPOT_CLIENT_ID` + `HUBSPOT_CLIENT_SECRET`
- LinkedIn → `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`
- Google Ads → `GOOGLE_ADS_CLIENT_ID` + developer token
- Stripe webhook → `STRIPE_WEBHOOK_SECRET`

---

## START

Begin with Step 1 — audit the `[SECTION NAME]` checklist items. Show me what passes and what fails before making any changes. I will confirm before you start fixing.

---
