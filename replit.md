# PMG Group OS — v3.0 Rebuild

> ⚠️ **SUPERSEDED (2026-08-05).** This is a historical build log. The live session bootstrap is **[CLAUDE.md](CLAUDE.md)** — use it for current architecture, conventions, and status. Since this doc was written: all sections were wired to real data (the "Make Everything Real" initiative — no more fake/dummy data), the Apollo lead-gen integration was completed (go-live pending), and the Legal & Compliance agent + a text video-guide endpoint were built (UI/video surfaces still pending). The "dummy data" and "canned AI" descriptions below are **out of date**.

## Overview

PMG Group OS is an AI-native business operating system for PMG Group LLC, a niche digital marketing agency serving exclusively cybersecurity and IT sector companies. Core promise: "Generate 20 ready-to-close deals in your first month."

**Rebuild Status:** The system has been redesigned from a complex 11-domain/112-agent system into a clean 6-section/32-agent streamlined system. The blueprint is in `PMG-OS-FINAL-BLUEPRINT-v3.md`.

## Architecture (v3.0)

### 6 Sections (replacing old 11 domains)
1. **Outreach** — Prospect discovery, Social Command Center, strategy, message composition, follow-ups, analytics (6 agents)
2. **CRM** — Lead qualification, deal intelligence, call coaching, proposals, CRM sync (5 agents)
3. **Marketing** — Content strategy, advertising, SEO, campaign orchestration, competitor intelligence (5 agents)
4. **Production** — Client onboarding, creative direction, image/video gen, documents, brand kit, content library, QA (8 agents)
5. **Admin** — Operations management, knowledge base, executive briefing, system evolution (4 agents)
6. **Finance** — Billing & revenue, contracts & expenses (2 agents)
7. **Settings** — AI modes, wallet, users & roles, channels, integrations, API keys
+ 2 Cross-System agents: Legal & Compliance, Video Guide System

### 32 PhD-Level Agents (replacing old 112)
All agents use Claude as primary AI engine. Zero AI fluff, human tone only.

### Build Progress
- **Session 1 (COMPLETE):** Foundation cleanup, new 6-section sidebar, Dashboard, Settings, Outreach (fully functional), 32 agent registry, placeholder pages for CRM/Marketing/Production/Admin/Finance
- **Session 2 (COMPLETE):** Full CRM section — 5 tabs: Pipeline (kanban board, deal creation, stage progression, deal health, notes), Lead Qualification (5-dimension scoring, tier filtering Hot/Warm/Cold/Disqualified, convert/disqualify actions), Call Intelligence (pre-call prep, coaching cards with objection responses, transcript upload), Proposals (pricing tiers Starter/Growth/Enterprise, lifecycle tracking Draft→Sent→Viewed→Accepted/Rejected), CRM Sync (GHL main + partner sub-account, HubSpot, sync logs, routing config)
- **Session 3 (COMPLETE):** Full Marketing section — 5 tabs: Content Strategy (calendar, channel schedule, brand voice, repurposing engine), Campaigns (CRUD with DB, search/filter, launch/pause/resume, AI optimization), SEO & Growth (keyword rankings, audit report), Orchestrator (funnel visualization, sprint timeline, budget allocation), Competitor Intel (3 competitors, battle cards, market gaps). API hooks added: useListCampaigns, useUpdateCampaignMut, useDeleteCampaignMut.
- **Session 4 (COMPLETE):** Production (8 tabs), Admin (4 tabs), Finance (2 tabs) — all fully built.
  - **Production:** Client Onboarding (7-step checklist, 3 demo clients), Marketing Audit (6-area scoring, prioritized fix plan), Creative Production (image/video/document types with AI tools), Lead Generator (qualified leads with scores, PMG 20-lead promise tracker), Reporting (monthly performance, ROI summary, progress charts), Client CRM Sync (GHL main + sub-account, HubSpot, sync activity, field mapping), Content Library (searchable asset table with type/status filters), Quality Review (review queue with scoring, 5 quality checks)
  - **Admin:** Operations (team workload, task board with source/priority/assignee), Knowledge Base (searchable docs, 4 categories, auto-learning from wins/losses), Executive Briefing (morning briefing with urgent/priorities/wins, weekly metrics), System Evolution (tech update scanner, approve/explore/skip workflow)
  - **Finance:** Billing & Revenue (invoice table with lifecycle, client profitability analysis), Contracts & Expenses (contract tracking with renewal alerts, expense breakdown by category, monthly P&L, revenue forecasting scenarios)
- **Session 5 (COMPLETE):** Full AI Integration — 32 AI endpoints wired to gpt-4o-mini via Replit AI Integrations, 36 frontend hooks, all AI buttons visible in every mode (removed isHuman gates), AiResultPanel component renders AI responses inline with copy/collapse/close controls. Integration endpoints for LinkedIn, GHL, Google Ads, Stripe.
- **Session 6 (IN PROGRESS):** Section 0 (Global Layout) bug fixes from user testing:
  - Global Search: Fixed broken routes (`task`→`/admin`, `document`→`/admin` instead of non-existent `/execution`, `/reports`)
  - Notifications: Click now navigates to relevant section (expanded domain→route map covers all backend domains)
  - AI Mode Banner: `ModeIndicatorBanner` now renders globally in sidebar layout main content area (shows in Hybrid/Human modes on all pages)
  - Wallet: Added "Withdraw" button (decrease balance) and "Change Payment Method" with 4 payment options; backend updated to handle negative amounts
  - Logout: Added confirmation dialog ("Sign Out?" with Cancel/Sign Out buttons)
  - Video Guide: Enhanced with animated step visuals, clickable progress bar, auto-play with proper interval cleanup
- **Session 7 (COMPLETE):** Outreach section critical bug fixes:
  - Backend POST /leads now accepts inline firstName/lastName/email/phone/company/title fields and auto-creates company + contact records (leads no longer have null companyName/contactName)
  - Backend PATCH /leads/:id progressive state machine: "Move to CRM" (status=qualified) auto-advances through new→enriched→scored→qualified instead of 400 error
  - Frontend field mapping fixed: uses contactName/companyName from API response (not firstName/lastName which don't exist in API)
  - Helper functions getLeadName(), getLeadCompany(), getLeadInitials() for consistent lead display
  - Strategy tab prospect selector uses correct field names
  - Lead detail dialog shows fitScore, confidenceScore, painPoints, nextAction, bestAngle
- **Session 8 (COMPLETE):** Data reset & realistic dummy AI, mode labeling:
  - All hardcoded demo data cleared to zero state across all 6 sections
  - 40+ realistic cybersecurity dummy AI responses replacing `[DUMMY]` text (enrich, score, prospect, compose, report, contract, SEO audit, etc.)
  - Mode labeling: `createdByMode` field on leads and opportunities tables. Captures current AI mode (ai_auto/hybrid/human) on data creation. `ModeBadge` component displays color-coded badges (red=AI Auto, blue=Hybrid, gold=Human) on leads in Outreach/CRM and deals in Pipeline
- **Session 9 (COMPLETE):** Production, Admin, Finance data population + mode awareness:
  - All three pages rewritten from empty arrays to realistic cybersecurity agency demo data
  - **Production (9 tabs):** Client Onboarding (3 clients with interactive checklist), Marketing Audit (6-area scoring with prioritized fix plan), Creative Production (image/video/doc types with brand kit), Lead Generator (5 scored leads with PMG 20-lead promise), Campaigns & Funnels (3 campaigns with funnel builder + A/B tests), Reporting (monthly performance with ROI), Client CRM Sync (GHL + HubSpot sync activity), Content Library (8 assets searchable/filterable), Quality Review (5-item queue with approve/auto-fix/regenerate)
  - **Admin (4 tabs):** Operations (3 team members, 12 tasks with complete/source/priority), Knowledge Base (24 searchable docs across 4 categories with auto-learning), Executive Briefing (3 urgent items, 4 priorities, 4 wins, 6 weekly metrics), System Evolution (8 tech updates with approve/explore/skip)
  - **Finance (2 tabs):** Billing (8 invoices, 3 clients profitability, $17,500 MRR), Contracts (4 contracts with renewal alerts, 4 expense categories totaling $516/mo, P&L, 4 revenue scenarios with pricing tiers)
  - Mode awareness: ModeIndicator (Bot/Hand) on every tab across all three pages, AI automation buttons hidden in Human mode, consistent cross-page behavior
  - All buttons wired with useToast feedback + API onError fallback pattern
- **Remaining:** Legal & Compliance agent, Video Guide system, final polish

## System Architecture

PMG Group OS is a pnpm workspace monorepo built with TypeScript and Node.js.

**UI/UX:** Cinematic glassmorphic dark-first design with Crimson, Navy Blue, and Golden Yellow palette. React 19, Vite, TailwindCSS, shadcn/ui, Framer Motion.

**Key Technical Components (kept from v2):**
- Session-based authentication with PostgreSQL-backed sessions and RBAC
- Tri-Mode System: AI Autonomous, Hybrid, Human Controlled (global + per-section + per-agent + per-record level)
- Wallet management with budget pools (standard, premium, creative, system)
- State machines, event bus, WebSocket real-time updates
- Job queue with priority and retries
- Integration hub (GHL, HubSpot, Hunter.io, Zoom, Stripe)
- Anti-spam protection across all channels

**Frontend Pages:**
- `/` — Dashboard (Command Center)
- `/outreach` — Outreach section (6 tabs: Prospect Finder, Social Command, Strategy, Compose, Follow-ups, Analytics)
- `/crm` — CRM Pipeline
- `/marketing` — Marketing
- `/production` — Production
- `/admin` — Admin
- `/finance` — Finance
- `/settings` — Settings (6 tabs: AI Modes, Wallet, Users & Roles, Channels, Integrations, API Keys)

**API Server:** Express 5 on port 8080, all routes under `/api`

**Admin Credentials:** `shershah_nawabi@pmggroup-llc.com` / `PMGAdmin2024!`

## External Dependencies

- **Monorepo:** pnpm workspaces
- **Frontend:** React 19, Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion
- **Backend:** Express 5
- **Database:** PostgreSQL (Drizzle ORM)
- **Auth:** bcryptjs, express-session, connect-pg-simple
- **Realtime:** ws (WebSocket)
- **AI:** gpt-4o-mini via Replit AI Integrations (AI_INTEGRATIONS_OPENAI_BASE_URL/KEY), with wallet-based billing, caching, and tri-mode governance
- **Validation:** Zod, drizzle-zod
- **API Codegen:** Orval
