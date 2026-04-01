# PMG Group OS

## Overview

PMG Group OS is an AI-native enterprise business operating system designed for PMG Group LLC, a cybersecurity and IT services agency. This monorepo system integrates 11 core business domains, providing a comprehensive solution for managing operations, client relations, and internal workflows. Its purpose is to enhance efficiency, automate tasks, and provide intelligent insights across various business functions, leveraging AI for critical operations like lead enrichment, scoring, and report generation. The project aims to consolidate disparate business processes into a unified, intelligent platform, supporting growth and operational excellence.

## User Preferences

I prefer iterative development, with a focus on delivering working software incrementally. Please ask before making major architectural changes or introducing new dependencies. I prefer clear and concise explanations, avoiding overly technical jargon where possible. For code, I appreciate well-structured, readable TypeScript with a preference for functional patterns when appropriate.

## System Architecture

PMG Group OS is built as a pnpm workspace monorepo using TypeScript (v5.9) and Node.js (v24).

**UI/UX Decisions:**
The system features a cinematic glassmorphic dark-first design. The primary color palette includes Crimson (#DC2626) for accents, Navy Blue (#1E3A5F) as the foundation, and Golden Yellow for elite highlights. The frontend utilizes React 19 with Vite, TailwindCSS, shadcn/ui, Recharts, and Framer Motion for a modern, responsive user experience.

**Technical Implementations & Design Choices:**

*   **Monorepo Structure:** Organizes `api-server`, `pmg-os` (React frontend), and `mockup-sandbox` within the `artifacts` directory, alongside shared libraries for `api-spec`, `api-client-react`, `api-zod`, and `db`.
*   **Authentication & Sessions:** Session-based auth using `express-session` + `connect-pg-simple` (PostgreSQL-backed sessions in `user_sessions` table). Login via `/api/auth/login`, session via cookie `pmg.sid`. Default admin: `shershah@pmggroup.com` / `PMGAdmin2024!`. Passwords hashed with bcryptjs (12 rounds). Frontend uses `AuthProvider` context + `useAuth()` hook. Unauthenticated users see a branded login page.
*   **Permission Enforcement:** Backend middleware (`requireAuth` + `requirePermission`) checks user role + permissions on every route. Permission matrix maps HTTP method + path to required roles/permissions. Role hierarchy: super_admin (100) > admin (75) > manager (50) > user (25). Users with `["*"]` permission bypass all checks.
*   **Core Engine:** Features a "Real AI OS" with services for wallet management, AI integrations, dual-mode AI operation, state machines, CRM lead routing, knowledge library, notification system, and RBAC.
*   **Wallet System:** Tracks per-action costs for AI operations, allowing auto-deduction and funding via API, with a full transaction history. Low-balance ($10) and critical ($2) alerts via notifications.
*   **AI Integration:** Utilizes OpenAI via Replit AI Integrations proxy for tasks such as `enrichLead()`, `scoreLead()`, `generateOutreachDraft()`, `summarizeRecord()`, `generateReport()`, and `suggestNextAction()`. All AI calls are logged and charged to the wallet, respecting the current AI mode.
*   **Dual-Mode System:** Supports "AI Autonomous" (24/7 AI operation), "Hybrid" (AI with human review for low confidence), and "Human Controlled" (manual control with optional AI-generated guides). Global toggles, per-workflow overrides, and **record-level overrides** (per-lead, per-opportunity) are available. Resolution order: record → workflow → global.
*   **Record-Level Mode Overrides:** `aiModeOverride` column on `leads` and `opportunities` tables. Set via `PUT /api/record-mode/:entityType/:entityId`. The `shouldAiAct()` function checks record-level before workflow-level before global.
*   **Cache Layer:** In-memory LRU cache (1000 entries max) with TTL support. `cacheWrap()` for transparent caching of expensive operations. Used for AI mode settings, dashboard data, knowledge entries. Cache stats available at `/api/cache/stats`. Invalidation via pattern matching.
*   **WebSocket/Realtime:** WebSocket server on `/ws` for live push events. Event types: notification, wallet_update, mode_change, lead_update, approval_update, system_alert. Frontend `useWebSocket()` hook auto-reconnects and invalidates React Query caches on events. Broadcasts wired into notification-service, wallet-service, and ai-mode-service.
*   **File Upload & Storage:** Multer-based file upload to `./uploads/` directory. Endpoints: `POST /api/uploads` (single), `POST /api/uploads/multi` (up to 10 files), `GET /api/uploads/files/:filename` (serve), `GET /api/uploads` (list with filters), `DELETE /api/uploads/:id`. 25MB limit, whitelisted MIME types. Records stored in `file_uploads` table.
*   **Audit Service:** `logAudit()` helper logs all important actions (auth, entity CRUD, mode changes, wallet operations) to `audit_events` table. Always wraps in try/catch so it never crashes callers.
*   **State Machines:** Manages the lifecycle of key entities (Lead, Opportunity, Approval, Asset, Contract, Task) with defined state transitions.
*   **Global Search:** Provides cross-entity search functionality accessible via a `⌘K` shortcut on the frontend.
*   **Automation Rules Engine:** Allows for configurable Trigger → Action rules to orchestrate tools and automate workflows.
*   **DnD Pipeline (CRM):** Enables drag-and-drop functionality for managing deals within pipeline stages.
*   **Entity Forms & Edit Drawers:** Standardized forms for creating and editing various entities (Lead, Opportunity, Company, Contact, Task, Campaign) with CSV export capabilities.
*   **Agent Simulation Engine:** Simulates background agent activity, records AI runs, charges the wallet, and provides activity feeds and recommendations.
*   **Quality Management:** Dedicated page for managing quality issues, setting quality gates, and tracking quality scores.
*   **Admin SOP Management:** Provides an administration interface for managing Standard Operating Procedures with search, filtering, and detailed views.
*   **UI Components:** Key frontend components include `AiModeToggle`, `WalletDisplay`, `NotificationBell`, `UserProfile`, login page, and various `Create*Form` components that leverage AI for auto-enrichment and scoring.
*   **API Routes:** Comprehensive set of RESTful API endpoints for managing core engine functionalities and CRUD operations across all entities.

**Domains (11 Modules):**
The system is organized into 11 distinct modules: Command Center, Intelligence, Outreach, Marketing, Production, CRM Pipeline, Communications, Execution, Finance & Legal, Reports & Archive, and System. Each module focuses on a specific business function, offering tailored features and workflows.

## Key Files

*   **Auth:** `artifacts/api-server/src/services/auth-service.ts`, `artifacts/api-server/src/middleware/auth.ts`, `artifacts/api-server/src/routes/auth.ts`
*   **Frontend Auth:** `artifacts/pmg-os/src/hooks/use-auth.tsx`, `artifacts/pmg-os/src/pages/login.tsx`
*   **WebSocket:** `artifacts/api-server/src/services/websocket-service.ts`, `artifacts/pmg-os/src/hooks/use-websocket.ts`
*   **Cache:** `artifacts/api-server/src/services/cache-service.ts`, `artifacts/api-server/src/routes/cache.ts`
*   **Record Mode:** `artifacts/api-server/src/routes/record-mode.ts`
*   **File Uploads:** `artifacts/api-server/src/routes/uploads.ts`
*   **Audit:** `artifacts/api-server/src/services/audit-service.ts`
*   **Wallet:** `artifacts/api-server/src/services/wallet-service.ts`
*   **AI Mode:** `artifacts/api-server/src/services/ai-mode-service.ts`
*   **Notifications:** `artifacts/api-server/src/services/notification-service.ts`

## DB Commands

*   Push schema: `pnpm --filter @workspace/db run push`
*   API server port: 8080

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Node.js:** v24
*   **Package Manager:** pnpm
*   **TypeScript:** v5.9
*   **Frontend Libraries:** React 19, Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion
*   **API Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Auth:** bcryptjs, express-session, connect-pg-simple
*   **WebSocket:** ws
*   **File Upload:** multer
*   **Validation:** Zod (`zod/v4`), `drizzle-zod`
*   **API Codegen:** Orval (from OpenAPI spec)
*   **Build Tool:** esbuild
*   **AI Service:** OpenAI via Replit AI Integrations proxy (gpt-4o-mini)
*   **CRM Integration:** GoHighLevel
*   **Drag-and-Drop:** @dnd-kit
*   **Date Parsing:** Custom `parseDate()` utility in `artifacts/api-server/src/lib/parse-date.ts`
