# PMG Group OS

## Overview

PMG Group OS is an AI-native enterprise business operating system for PMG Group LLC, a cybersecurity and IT services agency. It aims to unify and intelligentize business operations across 11 core domains: command center, intelligence, outreach, marketing, production, CRM, communications, execution, finance & legal, reports & archive, and system management. The system leverages AI for lead enrichment, scoring, report generation, and multi-tool orchestration to enhance efficiency, automate tasks, and provide intelligent insights for operational excellence and growth.

## User Preferences

I prefer iterative development, with a focus on delivering working software incrementally. Please ask before making major architectural changes or introducing new dependencies. I prefer clear and concise explanations, avoiding overly technical jargon where possible. For code, I appreciate well-structured, readable TypeScript with a preference for functional patterns when appropriate.

## System Architecture

PMG Group OS is a pnpm workspace monorepo built with TypeScript and Node.js.

**UI/UX Decisions:**
The system features a cinematic glassmorphic dark-first design, utilizing a primary color palette of Crimson, Navy Blue, and Golden Yellow. The frontend is developed with React 19, Vite, TailwindCSS, shadcn/ui, Recharts, and Framer Motion.

**Technical Implementations & Design Choices:**

*   **Monorepo Structure:** Organizes `api-server`, `pmg-os` (React frontend), `mockup-sandbox`, and shared libraries.
*   **Authentication & Permissions:** Session-based authentication with PostgreSQL-backed sessions and role-based access control (RBAC).
*   **AI Integration & Tri-Mode System:** Integrates OpenAI via Replit AI Integrations, with a "Tri-Mode System" (AI Autonomous, Hybrid, Human Controlled) for flexible AI operation and confidence-based handoffs.
*   **Core Engine Services:** Includes wallet management, state machines, CRM lead routing, knowledge library, notification system, and an event bus.
*   **Automated Workflow Engines:** Features an Automation Rules Engine, Outreach Sequence Execution Engine, Task Auto-Assignment Router, and a Pipeline Engine.
*   **Data & Realtime:** Utilizes an in-memory LRU cache and WebSocket server for real-time updates. File uploads are handled via Multer.
*   **Global Error Handling:** Comprehensive Express global error handling with structured JSON responses.
*   **Job Queue:** DB-backed background job queue with priority, exponential backoff retries, and a dead-letter queue.
*   **Overlay Engine:** Centralized React overlay manager supporting stacked modals/drawers/sheets/command palette.
*   **Audit Service:** Logs critical actions to an `audit_events` table.
*   **AI Agent & Tool Orchestration:** Manages 112 agents across 11 domains, with 21 mapped to AI tools and chains. Supports multi-tool orchestration with 34 registered tools and 9 chain templates.
*   **Vector Embeddings & Semantic Search:** Knowledge entries are auto-embedded using OpenAI for semantic search.
*   **Communication & Production AI:** Includes AI for structured outreach, communication intelligence, follow-up draft generation, and a Production Studio for asset generation with brand kit enforcement and AI review.
*   **Finance, Legal & Quality:** Implements state machines for invoice/expense approval, AI-powered contract review, and quality checkpoints with SOP enforcement.
*   **Channel Health & Safety:** A channel health service tracks bounce rates, complaint rates, daily send limits, opt-out lists, and cross-sequence collision detection.
*   **Slack Communication Surface:** Routes operational alerts to dedicated Slack channels.
*   **Integration Hub:** Provides a unified layer for third-party integrations (e.g., GoHighLevel, HubSpot, Stripe) with OAuth2, API key auth, webhooks, CSV import, and bidirectional sync.
*   **Reporting & Knowledge Memory:** Offers scheduled/event-triggered reports with AI-powered content, knowledge auto-population, and a permission-aware archive.
*   **Wallet & Cost Control (Phase 7):** Enhanced wallet with balance reservation (reserve/commit/release), per-provider and per-workflow spend tracking with proper daily/monthly reset logic, configurable spend thresholds (daily/monthly limits per provider/workflow/global), anomaly detection, and dummy no-spend mode. Includes an intelligent 8-category semantic cache (reasoning/enrichment/research/report_component/manual_guide/production_asset/crm_summary/outreach_structure) with DB-backed persistence and in-memory L1 LRU that intercepts AI calls to reduce repeated costs. Finance page has a "Wallet & Cost Control" tab with KPI cards, provider/domain spend charts, action ledger, controls (dummy mode toggle, fund wallet), threshold CRUD, and cache statistics.
*   **Channels & Integrations (Phase 8):** Full channel management across 22 channel types covering PMG website, PMG landing pages, client websites, client landing pages, LinkedIn (profile/company/Sales Navigator), Facebook/Meta, Instagram, X/Twitter, YouTube, TikTok, email, phone/SMS, forms, widgets, webinars, calendars/booking, Google Ads, Meta Ads, referrals, and direct. Supports both automatic and manual integration modes. Manual integration includes CSV import/export with field mapping, manual sync triggers, reconciliation, attribution correction, and reconnect flows. DB schema includes `channels`, `channel_sources`, `attribution_events`, `channel_forms`, `landing_pages`, and `manual_imports` tables. Frontend `/channels` page with 4 tabs: Channel Overview (22-card grid with category filters, connect/disconnect/sync), Manual Integration (CSV import with paste, reconciliation, capabilities grid), Attribution (30-day summary chart, attribution models), Forms & Pages (CRUD for forms and landing pages). Credentials/secrets are stripped from API responses.
*   **Testing & Validation:** Features a built-in test harness with a "Dummy Mode" for simulating AI responses.
*   **Operating Mode Pages:** Dedicated dashboards at `/auto`, `/hybrid`, `/human` for AI Autonomous, Hybrid, and Human Manual operating modes, respectively, with real-time data and workflow guides.
*   **User Management & Governance (Phase 9):** Full governance system with 4 role levels (Super Admin, Admin, Manager, User) and granular governance permissions stored as structured JSONB (`governancePermissions`). Covers 11 permission categories: domain access (16 domains), action permissions (CRUD), approval rights, publishing rights, financial visibility, CRM visibility, archive visibility, integration access, AI mode privileges (full/hybrid_only/read_only/none), wallet permissions, and manual integration permissions. Backend `governance-service.ts` handles user creation with bcrypt password hashing, deactivation/reactivation, role changes with hierarchy enforcement (can't assign higher role), governance permission CRUD, and comprehensive audit trail (`user_audit_log` table). Auth middleware enforces domain-based access control using governance permissions (with safe role-based defaults when null). Super Admin controls all permissions. System page "Users & Permissions" tab rebuilt with real API data: user table with role selectors, create user form, inline permission editor with toggle buttons for all 11 categories, governance audit trail with color-coded entries, RBAC reference cards with live user counts, and permission matrix.
*   **Knowledge Library / Memory / Archive (Phase 10):** Self-updating intelligence library storing 22+ content categories: strategy, sales knowledge, marketing knowledge, SOPs, workflows, meeting transcripts, objection patterns, successful responses, AI outputs, corrections, approvals, rejections, campaign lessons, performance data, failure cases, deal/lead/finance/legal intelligence, competitive, market research, and reporting. `memory-service.ts` provides specialized ingestion functions for each content type. `callAI()` automatically injects relevant institutional memory into every AI call via semantic search (OpenAI `text-embedding-3-small`), falling back to keyword context. AI outputs auto-ingested into knowledge base on completion (confidence >= 60). 21 event types in `KNOWLEDGE_EVENT_MAP` auto-populate knowledge from system activity (CRM, deals, leads, campaigns, calls, meetings, tasks, workflows, reports, corrections, approvals, rejections, SOPs, strategy, performance). Knowledge usage tracked and incremented when AI pulls context. Frontend Knowledge Library tab has stats KPIs (total entries, categories, weekly new, AI usage, AI generated, auto events), category distribution with clickable filters, "Add Knowledge" manual entry form, source badges (ai/auto/correction/approval/rejection/manual), AI usage metrics, and full semantic + keyword search. Archive tab with search filtering.
*   **Tool Orchestration Engine:** An 8-step pipeline for orchestrating agents, including provider selection, wallet charging, execution, result processing, confidence checks, archiving, auditing, and reporting. It supports dynamic provider scoring and fallback chains.
*   **Enhanced Agent Registry:** All agents have detailed definitions covering purpose, triggers, tool access, confidence models, output structures, wallet behavior, fallback behavior, and archive behavior.

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Frontend Frameworks:** React 19, Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion
*   **Backend Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Authentication Libraries:** bcryptjs, express-session, connect-pg-simple
*   **Realtime Communication:** ws (WebSocket)
*   **File Uploads:** multer
*   **Job Scheduler:** node-cron
*   **Validation:** Zod (`zod/v4`), `drizzle-zod`
*   **API Codegen:** Orval
*   **AI Service:** OpenAI (via Replit AI Integrations proxy)
*   **CRM/Marketing Integrations:** GoHighLevel
*   **Email Service:** nodemailer (SMTP)
*   **UI Components:** @dnd-kit (for drag-and-drop)