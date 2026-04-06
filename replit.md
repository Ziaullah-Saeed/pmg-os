# PMG Group OS — v3.0 Rebuild

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
- **Session 3:** Marketing + Production sections
- **Session 4:** Admin + Finance + Legal + Video Guides + Polish

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
- **AI:** Claude (primary), OpenAI DALL-E 3 (images), Runway ML (video), ElevenLabs (voice), OpenAI GPT-4o (fallback)
- **Validation:** Zod, drizzle-zod
- **API Codegen:** Orval
