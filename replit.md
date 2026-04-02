# PMG Group OS

## Overview

PMG Group OS is an AI-native enterprise business operating system for PMG Group LLC, a cybersecurity and IT services agency. Its primary purpose is to unify and intelligentize business operations across 11 core domains, including command center, intelligence, outreach, marketing, production, CRM, communications, execution, finance & legal, reports & archive, and system management. The system leverages AI for critical functions such as lead enrichment, scoring, report generation, and multi-tool orchestration, aiming to significantly enhance efficiency, automate tasks, and provide intelligent insights for operational excellence and growth.

## User Preferences

I prefer iterative development, with a focus on delivering working software incrementally. Please ask before making major architectural changes or introducing new dependencies. I prefer clear and concise explanations, avoiding overly technical jargon where possible. For code, I appreciate well-structured, readable TypeScript with a preference for functional patterns when appropriate.

## System Architecture

PMG Group OS is a pnpm workspace monorepo built with TypeScript and Node.js.

**UI/UX Decisions:**
The system features a cinematic glassmorphic dark-first design, utilizing a primary color palette of Crimson, Navy Blue, and Golden Yellow. The frontend is developed with React 19, Vite, TailwindCSS, shadcn/ui, Recharts, and Framer Motion.

**Technical Implementations & Design Choices:**

*   **Monorepo Structure:** Organizes `api-server`, `pmg-os` (React frontend), `mockup-sandbox`, and shared libraries (`api-spec`, `api-client-react`, `api-zod`, `db`).
*   **Authentication & Permissions:** Session-based authentication using `express-session` with PostgreSQL-backed sessions. Role-based access control (RBAC) with a hierarchical permission system is enforced via backend middleware.
*   **AI Integration & Tri-Mode System:** Integrates OpenAI via Replit AI Integrations for various AI tasks. A "Tri-Mode System" (AI Autonomous, Hybrid, Human Controlled) dictates AI operation, allowing global, workflow-specific, and record-level overrides for actions and confidence-based handoffs.
*   **Core Engine Services:** Includes wallet management (for AI costs), state machines for entity lifecycles, CRM lead routing, knowledge library, notification system, and an event bus for cross-domain communication.
*   **Automated Workflow Engines:** Features an Automation Rules Engine (trigger-action rules), Outreach Sequence Execution Engine, Task Auto-Assignment Router, and a Pipeline Engine for CRM deal management.
*   **Data & Realtime:** Utilizes an in-memory LRU cache and a WebSocket server for real-time notifications and updates. File uploads are handled via Multer to local storage.
*   **Global Error Handling:** Express global error handler middleware catches all unhandled route errors with structured JSON responses (error message, request ID, stack in dev). Process-level handlers for uncaughtException and unhandledRejection. 404 handler returns structured path/method info.
*   **Job Queue:** DB-backed background job queue (`job_queue` table) with priority ordering, exponential backoff retries (5s→15s→60s→5m→15m), dead-letter queue for exhausted jobs, periodic processing every 10s. Admin-only API at `/job-queue/stats`, `/job-queue/dead-letter`, `/job-queue/retry/:id`, `/job-queue/purge`.
*   **Overlay Engine:** Centralized React overlay manager (`useOverlay` hook + `OverlayProvider`) supporting stacked modals/drawers/sheets/command palette with Escape key handling, backdrop click dismiss, body scroll lock, and programmatic open/close/closeAll.
*   **RBAC Enforcement:** Fixed `requireRole` middleware to read `session.userRole` (matching auth middleware storage) with fallback to `*` permission detection.
*   **Audit Service:** Logs critical actions to an `audit_events` table for compliance and traceability.
*   **AI Agent & Tool Orchestration:** Manages 112 agents across 11 domains, with 21 mapped to real AI tools and chains. Supports multi-tool orchestration with 34 registered tools and 9 chain templates for complex workflows (e.g., lead qualification, asset production).
*   **Vector Embeddings & Semantic Search:** Knowledge entries are auto-embedded using OpenAI for semantic search capabilities.
*   **Communication & Production AI:** Includes AI-powered features for structured outreach, communication intelligence (transcript processing, sentiment analysis, objection detection), follow-up draft generation, and a comprehensive Production Studio for asset generation with brand kit enforcement and AI review workflows.
*   **Finance, Legal & Quality:** Implements state machines for invoice lifecycle and expense approval workflows, AI-powered contract review and generation, and quality checkpoints with SOP enforcement. Quality gates are enforced as mandatory checks during state transitions — critical/high failures block transitions for leads (data completeness), opportunities (value/close-date), and contracts (content/dates).
*   **Channel Health & Safety:** A channel health service tracks bounce rates, complaint rates, daily send limits (email: 200, SMS: 100, LinkedIn: 50), opt-out lists, and cross-sequence collision detection. The sequence engine enforces these limits before every send.
*   **Slack Communication Surface:** A Slack surface service routes operational alerts to dedicated channels (#deals, #approvals, #ops, #quality, #finance, #legal) for deals, agent errors, quality gate failures, invoices, expenses, and contract reviews.
*   **Integration Hub:** Provides a unified layer for third-party integrations (10 connectors like GoHighLevel, HubSpot, Stripe), supporting OAuth2, API key auth, public webhook receivers, CSV import with field mapping, and a bidirectional sync engine.
*   **Reporting & Knowledge Memory:** Offers scheduled and event-triggered reports with AI-powered content generation, knowledge auto-population from business events, and a permission-aware archive with delivery channels (Slack, email).
*   **Testing & Validation:** Features a built-in test harness with a "Dummy Mode" for intercepting AI calls and simulating responses for cost-free testing.
*   **Operating Mode Pages:** Three dedicated mode pages at `/auto` (AI Autonomous), `/hybrid` (Hybrid), `/human` (Human Manual) providing mode-specific dashboards with real-time data, approval queues, workflow guides, and cross-mode switching. Sidebar includes "Operating Mode" section for direct navigation. Backend supports record-level mode overrides via `PUT/DELETE /ai-mode/record/:entityType/:entityId`, mode check via `GET /ai-mode/check`, and active overrides listing via `GET /ai-mode/overrides`.

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

## Phase 4: CRM + GHL + External Routing (Completed)

Phase 4 makes routing real, sync visible, and ensures PMG never loses visibility after external handoff.

**Schema Changes:**
- `leads`: Added `externalCrmId`, `routingDestination` (pmg/ghl/both/hold), `retainCopy` (always true), `routedAt`, `lastSyncedAt`
- `contacts`, `companies`, `opportunities`: Added `externalCrmId`, `lastSyncedAt`
- `sync_logs`: Added `retryCount`, `retriedAt`, `routingDestination`

**API Enhancements (ghl.ts routes):**
- Field mapping CRUD (`/ghl/field-mapping` GET/PUT)
- Pipeline mapping CRUD (`/ghl/pipeline-mapping` GET/PUT)
- Per-lead routing (`/ghl/route-lead/:id` POST) with retainCopy
- Bulk routing (`/ghl/route-bulk` POST)
- Enhanced sync logs with filtering (`/ghl/sync-logs`)
- Retry queue (`/ghl/retry-queue` GET, `/ghl/retry-all-failed` POST)
- Sync health dashboard (`/ghl/sync-health` GET) with totalSynced, totalFailed, healthScore, status
- Routing summary (`/ghl/routing-summary` GET)
- Note sync, contact sync endpoints
- Legacy `/leads/:id/route` updated to accept `pmg` destination and write routing fields

**Frontend (15 new hooks in use-api.ts):**
- `useGHLFieldMapping`, `useSaveGHLFieldMapping`, `useGHLPipelineMapping`, `useSaveGHLPipelineMapping`
- `useGHLSyncHealth`, `useGHLRoutingSummary`, `useGHLRetryQueue`, `useGHLSyncRetry`
- `useGHLRetryAllFailed`, `useGHLRouteLeadEnhanced`, `useGHLRouteBulk`
- `useGHLSyncNotes`, `useGHLSyncContact`, `useGHLPullContacts`

**System Page (GHL Setup tab) enhancements:**
- Field Mapping editor (PMG → GHL field name mapping with save)
- Pipeline Mapping editor (stage name mapping)
- Sync Health Dashboard with live metrics and sync log viewer
- Retry queue management with per-item and batch retry

**CRM Page enhancements:**
- GHL Routing tab: Real per-lead routing with PMG/GHL/Both/Hold buttons, bulk routing via checkboxes, routing destination badges, "Copy Retained" indicator, GHL external ID display, sync timestamp
- Sync Center tab: Live KPIs (Total Synced, Failed, Health Score, Retry Queue), entity sync status with percentages, full sync log with retry buttons, dedicated retry queue panel

**Security:** `/leads/:id/route` now requires `manager` role via RBAC middleware.