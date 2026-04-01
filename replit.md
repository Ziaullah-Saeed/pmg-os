# PMG Group OS

## Overview

PMG Group OS is an AI-native enterprise business operating system for PMG Group LLC (cybersecurity/IT services agency). Built as a pnpm workspace monorepo using TypeScript. The system covers 11 integrated domains with a cinematic glassmorphic dark-first design using Crimson (#DC2626) accents, Navy Blue (#1E3A5F) foundation, and Golden Yellow elite highlights.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite + TailwindCSS + shadcn/ui + Recharts + Framer Motion
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations proxy (gpt-4o-mini, no API key needed)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   │   └── src/services/   # Core engine services
│   │       ├── wallet-service.ts     # Wallet balance, charges, funding
│   │       ├── ai-service.ts         # Real AI calls (enrich, score, outreach, reports)
│   │       ├── ai-mode-service.ts    # Global/per-workflow AI mode management
│   │       ├── notification-service.ts # System notifications
│   │       ├── state-machine.ts      # Entity lifecycle state machines
│   │       ├── knowledge-service.ts  # Knowledge library CRUD
│   │       └── ghl-service.ts        # GoHighLevel integration
│   ├── pmg-os/             # React frontend (dark-first enterprise UI)
│   └── mockup-sandbox/     # Design component previews
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── wallet.ts           # wallet + wallet_transactions tables
│           ├── ai_mode_settings.ts # ai_mode_settings + notifications + knowledge_entries tables
│           └── ... (23+ tables total)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Core Engine (Real AI OS — Not a Shell)

### Wallet System
- Per-action cost tracking with configurable tool costs
- Auto-deduction on every AI call
- Fund wallet via API
- Full transaction history

### AI Integration (Real AI via Replit Proxy)
- `enrichLead()` — company profiling, cybersecurity maturity, deal potential
- `scoreLead()` — 0-100 scoring with HOT/WARM/COLD tier
- `generateOutreachDraft()` — personalized outreach per channel
- `summarizeRecord()` — business record summarization
- `generateReport()` — AI-generated domain reports
- `suggestNextAction()` — next-action recommendations
- Every AI call: logged to ai_runs, charged to wallet, respects AI mode

### Dual-Mode System
- **AI Autonomous** (default) — 24/7 autonomous operation
- **Hybrid** — AI + human review for confidence < 70%
- **Human Controlled** — manual control only
- Global toggle + per-workflow overrides (14 workflow types)
- Confidence-based handoff with notification generation

### State Machines
- Lead: new→enriched→scored→qualified→routing→routed→active→closed
- Opportunity: discovery→qualification→proposal→negotiation→closing→won/lost
- Approval: draft→pending→approved/rejected/revision_requested
- Asset: draft→review→approved→published→archived
- Contract: draft→review→negotiation→approved→active→terminated
- Task: pending→in_progress→completed/blocked/cancelled

### CRM Lead Routing
- PMG Internal / GoHighLevel / Both / Hold
- Auto-routing on state transition
- Activity logging per route decision

### Knowledge Library
- Auto-populates from AI enrichments, scoring, reports
- Searchable by category, content, title
- Usage tracking for AI context

### Notification System
- Real-time notifications on state changes, AI actions, errors
- Notification bell in header with unread count
- Mark read/dismiss/mark all read

### RBAC Middleware
- Role hierarchy: super_admin → admin → manager → user
- `requireRole(minRole)` middleware on sensitive routes
- Reads `x-user-role` header (defaults to super_admin in dev)

### Global Search
- Cross-entity search across leads, opportunities, companies, contacts
- Accessible via `GET /api/search?q=`
- Frontend: ⌘K keyboard shortcut in header

### GoHighLevel Integration
- Config panel in System > Integrations tab
- CRM mode selector: PMG Internal / GoHighLevel / Both
- Test connection, save API key/location ID, webhook URL
- Sync engine routes: push to GHL, sync logs, retry

### Automation Rules Engine
- Trigger → Action rules (lead.created → ai_enrich, lead.scored → notification, etc.)
- In-memory rule storage with CRUD API
- Tool orchestration config with 8 connected tools
- Channel intelligence tracking (source attribution)

### DnD Pipeline (CRM)
- Drag-and-drop deal cards between pipeline stages using @dnd-kit
- DraggableDealCard + DroppableColumn components
- Stage advance button in deal drawer
- Proposal status update button

### Entity Forms & Edit Drawers
- Create forms: Lead, Opportunity, Company, Contact, Task, Campaign
- Lead edit drawer with priority/source/notes editing
- CSV export buttons on Reports page (leads + opportunities)

### Intelligence Positioning
- Competitive Advantages, Identified Gaps, Message-Market Fit analysis
- Strategic Differentiation Matrix (PMG vs Traditional MSSPs vs Big 4)
- AI-generated positioning insights

## API Routes

### Core Engine Routes
- `GET /api/wallet/balance` — current wallet balance
- `GET /api/wallet/transactions` — transaction history
- `POST /api/wallet/fund` — add funds
- `GET /api/ai-mode/global` — current AI mode
- `PUT /api/ai-mode/global` — set AI mode
- `GET /api/ai-mode/workflows` — per-workflow modes
- `PUT /api/ai-mode/workflows/:key` — override workflow mode
- `GET /api/notifications` — list notifications
- `GET /api/notifications/unread-count` — unread count
- `PUT /api/notifications/:id/read` — mark read
- `PUT /api/notifications/read-all` — mark all read
- `DELETE /api/notifications/:id` — dismiss
- `POST /api/ai/enrich-lead` — AI lead enrichment
- `POST /api/ai/score-lead` — AI lead scoring
- `POST /api/ai/generate-outreach` — AI outreach draft
- `POST /api/ai/summarize` — AI record summary
- `POST /api/ai/generate-report` — AI report generation
- `POST /api/ai/suggest-action` — AI next action suggestion
- `GET /api/state-machines/:entityType` — get state machine config
- `GET /api/state-machines/:entityType/transitions/:state` — valid transitions
- `GET /api/knowledge` — knowledge library
- `GET /api/knowledge/search?q=` — search knowledge
- `POST /api/knowledge` — add knowledge entry
- `GET /api/dashboard/command-center` — command center data

### CRUD Routes (all entities)
- Companies, Contacts, Leads, Opportunities, Activities, Campaigns, Tasks, Documents, Communications, Approvals, Assets, Contracts, Invoices, etc.
- Leads have additional: `POST /api/leads/:id/route`, `GET /api/leads/:id/activities`, `GET /api/leads/:id/ai-runs`

## Domains (11 Modules)

1. **Command Center** (`/`) — Executive dashboard, real computed KPIs, wallet balance, AI activity
2. **Intelligence** (`/intelligence`) — Company analysis, ICP profiles, competitor watch
3. **Outreach** (`/outreach`) — Lead pipeline, outbound sequences
4. **Marketing** (`/marketing`) — Campaigns, analytics, content calendar
5. **Production** (`/production`) — Asset lifecycle with approval gates
6. **CRM Pipeline** (`/crm`) — Leads tab (with AI enrichment), Pipeline, Client CRM
7. **Communications** (`/communications`) — Communication log, AI-led/guided modes
8. **Execution** (`/execution`) — Task kanban, approvals
9. **Finance & Legal** (`/finance`) — Financial overview, invoices, legal
10. **Reports & Archive** (`/reports`) — AI-generated reports, archive
11. **System** (`/system`) — AI mode settings, integrations, audit

## Frontend Components

### Custom Hooks (`artifacts/pmg-os/src/hooks/use-api.ts`)
Manual React Query hooks for all new engine APIs (wallet, AI mode, notifications, command center, AI actions, state machines, knowledge, lead CRUD/routing)

### Key Components
- `AiModeToggle` — sidebar AI mode selector (3 modes)
- `WalletDisplay` — sidebar wallet balance indicator
- `NotificationBell` — header notification dropdown
- `CreateLeadForm` — modal form that triggers AI auto-enrichment + scoring

## Important Notes

- `parseDate()` from `artifacts/api-server/src/lib/parse-date.ts` for date conversions
- DB push: `pnpm --filter @workspace/db run push`
- API server on port 8080; Dark theme via `class="dark"` on html element
- Non-mutating sorts: `[...arr].sort(...)` not `arr.sort(...)`
- lib/api-zod/src/index.ts only exports `./generated/api` (removed types to fix duplicate conflicts)
- AI env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-provisioned)
- DB lib is composite TS — run `cd lib/db && npx tsc --build` after schema changes
