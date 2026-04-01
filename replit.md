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
*   **Core Engine:** Features a "Real AI OS" with services for wallet management, AI integrations, dual-mode AI operation, state machines, CRM lead routing, knowledge library, notification system, and RBAC.
*   **Wallet System:** Tracks per-action costs for AI operations, allowing auto-deduction and funding via API, with a full transaction history.
*   **AI Integration:** Utilizes OpenAI via Replit AI Integrations proxy for tasks such as `enrichLead()`, `scoreLead()`, `generateOutreachDraft()`, `summarizeRecord()`, `generateReport()`, and `suggestNextAction()`. All AI calls are logged and charged to the wallet, respecting the current AI mode.
*   **Dual-Mode System:** Supports "AI Autonomous" (24/7 AI operation), "Hybrid" (AI with human review for low confidence), and "Human Controlled" (manual control with optional AI-generated guides). Global toggles and per-workflow overrides are available.
*   **State Machines:** Manages the lifecycle of key entities (Lead, Opportunity, Approval, Asset, Contract, Task) with defined state transitions.
*   **RBAC Middleware:** Implements role-based access control with a hierarchy (super\_admin → admin → manager → user) to secure sensitive API routes.
*   **Global Search:** Provides cross-entity search functionality accessible via a `⌘K` shortcut on the frontend.
*   **Automation Rules Engine:** Allows for configurable Trigger → Action rules to orchestrate tools and automate workflows.
*   **DnD Pipeline (CRM):** Enables drag-and-drop functionality for managing deals within pipeline stages.
*   **Entity Forms & Edit Drawers:** Standardized forms for creating and editing various entities (Lead, Opportunity, Company, Contact, Task, Campaign) with CSV export capabilities.
*   **Agent Simulation Engine:** Simulates background agent activity, records AI runs, charges the wallet, and provides activity feeds and recommendations.
*   **Quality Management:** Dedicated page for managing quality issues, setting quality gates, and tracking quality scores.
*   **Admin SOP Management:** Provides an administration interface for managing Standard Operating Procedures with search, filtering, and detailed views.
*   **UI Components:** Key frontend components include `AiModeToggle`, `WalletDisplay`, `NotificationBell`, and various `Create*Form` components that leverage AI for auto-enrichment and scoring.
*   **API Routes:** Comprehensive set of RESTful API endpoints for managing core engine functionalities and CRUD operations across all entities.

**Domains (11 Modules):**
The system is organized into 11 distinct modules: Command Center, Intelligence, Outreach, Marketing, Production, CRM Pipeline, Communications, Execution, Finance & Legal, Reports & Archive, and System. Each module focuses on a specific business function, offering tailored features and workflows.

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Node.js:** v24
*   **Package Manager:** pnpm
*   **TypeScript:** v5.9
*   **Frontend Libraries:** React 19, Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion
*   **API Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Validation:** Zod (`zod/v4`), `drizzle-zod`
*   **API Codegen:** Orval (from OpenAPI spec)
*   **Build Tool:** esbuild
*   **AI Service:** OpenAI via Replit AI Integrations proxy (gpt-4o-mini)
*   **CRM Integration:** GoHighLevel
*   **Drag-and-Drop:** @dnd-kit
*   **Date Parsing:** Custom `parseDate()` utility in `artifacts/api-server/src/lib/parse-date.ts`