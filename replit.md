# PMG Group OS

## Overview

PMG Group OS is an AI-native enterprise business operating system for PMG Group LLC, a cybersecurity and IT services agency. This monorepo integrates 11 core business domains to provide a comprehensive solution for managing operations, client relations, and internal workflows. Its purpose is to enhance efficiency, automate tasks, and provide intelligent insights across various business functions, leveraging AI for critical operations like lead enrichment, scoring, and report generation. The project aims to consolidate disparate business processes into a unified, intelligent platform, supporting growth and operational excellence.

## User Preferences

I prefer iterative development, with a focus on delivering working software incrementally. Please ask before making major architectural changes or introducing new dependencies. I prefer clear and concise explanations, avoiding overly technical jargon where possible. For code, I appreciate well-structured, readable TypeScript with a preference for functional patterns when appropriate.

## System Architecture

PMG Group OS is built as a pnpm workspace monorepo using TypeScript and Node.js.

**UI/UX Decisions:**
The system features a cinematic glassmorphic dark-first design. The primary color palette includes Crimson (#DC2626), Navy Blue (#1E3A5F), and Golden Yellow. The frontend utilizes React 19 with Vite, TailwindCSS, shadcn/ui, Recharts, and Framer Motion for a modern, responsive user experience.

**Technical Implementations & Design Choices:**

*   **Monorepo Structure:** Organizes `api-server`, `pmg-os` (React frontend), and `mockup-sandbox` within the `artifacts` directory, alongside shared libraries for `api-spec`, `api-client-react`, `api-zod`, and `db`.
*   **Authentication & Sessions:** Session-based authentication using `express-session` with `connect-pg-simple` (PostgreSQL-backed sessions). Frontend uses `AuthProvider` context.
*   **Permission Enforcement:** Backend middleware enforces role-based access control with a hierarchical permission system (super_admin > admin > manager > user).
*   **Core Engine:** Features services for wallet management, AI integrations, a tri-mode AI operation system, state machines, CRM lead routing, knowledge library, notification system, and RBAC.
*   **Wallet System:** Tracks per-action costs for AI operations with auto-deduction, funding via API, transaction history, and low-balance alerts.
*   **AI Integration:** Utilizes OpenAI via Replit AI Integrations proxy for tasks like lead enrichment, scoring, outreach draft generation, summarization, report generation, and action suggestions. All AI calls are logged and charged to the wallet, respecting the current AI mode.
*   **Tri-Mode System (AI/Hybrid/Human):** Supports "AI Autonomous" (fully automated), "Hybrid" (AI auto-executes high-confidence actions, queues low-confidence for review), and "Human Controlled" (everything queued for human review). Global, per-workflow, and record-level overrides are available.
*   **Pending Actions Queue:** Stores actions requiring human review/approval, accessible via API and WebSocket.
*   **Mode-Aware Engines:** Automated engines (e.g., automation rules, task assignment, lead routing) use `executeOrQueue()` to adapt behavior based on the active AI mode and confidence levels.
*   **Record-Level Mode Overrides:** Allows specific records (leads, opportunities) to override global and workflow AI mode settings.
*   **Cache Layer:** In-memory LRU cache with TTL for expensive operations and frequently accessed data.
*   **WebSocket/Realtime:** WebSocket server for live push events such as notifications, wallet updates, and lead updates, with frontend auto-reconnection.
*   **File Upload & Storage:** Multer-based file uploads to local storage with API endpoints for management and a 25MB limit.
*   **Audit Service:** Logs important actions (auth, CRUD, mode changes, wallet operations) to an `audit_events` table without interrupting core processes.
*   **State Machines:** Manages lifecycles for entities like Lead, Opportunity, Approval, Asset, Contract, and Task with defined transitions.
*   **Global Search:** Provides cross-entity search functionality via a `⌘K` shortcut.
*   **Event Bus:** Cross-domain event system (`emit`/`subscribe`) for typed events (e.g., `lead.created`, `task.completed`), supporting wildcard subscribers and an event log.
*   **Automation Rules Engine:** DB-backed configurable Trigger → Action rules that listen to the event bus and execute actions based on conditions.
*   **Approval Workflow State Machine:** Enforces real state transitions for approvals (draft → pending → approved/rejected/revision_requested) with notifications and task creation for revisions.
*   **Scheduled Jobs (Cron):** `node-cron`-based scheduler with DB-tracked jobs for recurring tasks like stale deal checks and sequence advancement.
*   **Outreach Sequence Execution Engine:** Manages step-by-step contact enrollment in outreach sequences, respecting cadences and safety controls.
*   **Task Auto-Assignment Router:** Event-driven auto-assignment of tasks based on domain-role mapping and round-robin selection.
*   **Lead Lifecycle:** Manages the full lead lifecycle from capture to close, with events fired for each transition.
*   **Activity Timeline:** Records and displays a cross-domain timeline of 22 event types related to entities.
*   **Pipeline Engine:** Auto-updates opportunity probabilities on stage changes, detects stale deals, and automates notifications.
*   **Lead Routing Engine:** Score-based auto-routing of leads (HOT, WARM, COLD) with round-robin assignment and notifications.
*   **DnD Pipeline (CRM):** Drag-and-drop functionality for managing deals within pipeline stages.
*   **Entity Forms & Edit Drawers:** Standardized forms for entity creation and editing, with CSV export.
*   **Agent Simulation Engine:** Simulates background agent activity, records AI runs, and charges the wallet.
*   **Quality Management:** Dedicated page for managing quality issues and tracking quality scores.
*   **Admin SOP Management:** Interface for managing Standard Operating Procedures.
*   **UI Components:** Key frontend components like `AiModeToggle`, `WalletDisplay`, `NotificationBell`, and various forms leveraging AI.
*   **API Routes:** Comprehensive RESTful API endpoints for core functionalities and CRUD operations.

**Domains (11 Modules):** Command Center, Intelligence, Outreach, Marketing, Production, CRM Pipeline, Communications, Execution, Finance & Legal, Reports & Archive, and System.

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Node.js:** v24
*   **TypeScript:** v5.9
*   **Frontend:** React 19, Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion
*   **API Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Auth:** bcryptjs, express-session, connect-pg-simple
*   **WebSocket:** ws
*   **File Upload:** multer
*   **Scheduler:** node-cron
*   **Validation:** Zod (`zod/v4`), `drizzle-zod`
*   **API Codegen:** Orval
*   **AI Service:** OpenAI via Replit AI Integrations proxy
*   **CRM Integration:** GoHighLevel
*   **Drag-and-Drop:** @dnd-kit