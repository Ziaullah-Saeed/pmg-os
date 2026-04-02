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
*   **Audit Service:** Logs critical actions to an `audit_events` table for compliance and traceability.
*   **AI Agent & Tool Orchestration:** Manages 112 agents across 11 domains, with 21 mapped to real AI tools and chains. Supports multi-tool orchestration with 34 registered tools and 9 chain templates for complex workflows (e.g., lead qualification, asset production).
*   **Vector Embeddings & Semantic Search:** Knowledge entries are auto-embedded using OpenAI for semantic search capabilities.
*   **Communication & Production AI:** Includes AI-powered features for structured outreach, communication intelligence (transcript processing, sentiment analysis, objection detection), follow-up draft generation, and a comprehensive Production Studio for asset generation with brand kit enforcement and AI review workflows.
*   **Finance, Legal & Quality:** Implements state machines for invoice lifecycle and expense approval workflows, AI-powered contract review and generation, and quality checkpoints with SOP enforcement.
*   **Integration Hub:** Provides a unified layer for third-party integrations (10 connectors like GoHighLevel, HubSpot, Stripe), supporting OAuth2, API key auth, public webhook receivers, CSV import with field mapping, and a bidirectional sync engine.
*   **Reporting & Knowledge Memory:** Offers scheduled and event-triggered reports with AI-powered content generation, knowledge auto-population from business events, and a permission-aware archive with delivery channels (Slack, email).
*   **Testing & Validation:** Features a built-in test harness with a "Dummy Mode" for intercepting AI calls and simulating responses for cost-free testing.

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