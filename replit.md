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

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   ├── pmg-os/             # React frontend (dark-first enterprise UI)
│   └── mockup-sandbox/     # Design component previews
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Domains (11 Modules) — Full Operational Workspaces

1. **Command Center** (`/`) - 5-tab executive control surface (Executive, Operations, System Health, Exceptions, AI Activity), KPI cards with glow accents, Revenue Projection AreaChart, Pipeline Distribution PieChart, top deals, stale deal detection, quick actions
2. **Intelligence** (`/intelligence`) - 6-tab (Company Intelligence, Decision Maker Map, ICP Analysis, Competitor Watch, Pain Analysis, Positioning), ICP profiles, company detail drawer, fit scoring with ConfidenceMeter, pain point mapping, authority mapping
3. **Outreach** (`/outreach`) - 3-tab (Lead Pipeline, Outbound Sequences, Qualification), lead detail drawer, filterable pipeline, qualification checklists, CRM handoff buttons, confidence scoring
4. **Marketing** (`/marketing`) - 4-tab (Campaigns, Analytics, Content Calendar, SEO & Topics), campaign cards with budget bars, BarChart performance comparison, content calendar, topic clustering with authority scores
5. **Production** (`/production`) - 3-tab (Asset Queue, Kanban Board, Version History), mandatory 6-stage lifecycle (Generate→Preview→Review→Revise→Approve→Finalize), asset detail drawer with stage progression
6. **CRM Pipeline** (`/crm`) - Dual PMG/Client CRM tabs, 4-column kanban board, deal detail drawer with stage progression bar, stale deal detection, Client CRM placeholder (GoHighLevel/HubSpot)
7. **Communications** (`/communications`) - 4-tab (Communication Log, Mode A: AI-Led, Mode B: AI-Guided, Mode C: Meeting), coaching sidebar, call queue, disposition mapping, meeting AI co-pilot with signal detection
8. **Execution** (`/execution`) - 3-tab (Kanban, List View, Approvals), 4-column kanban (Pending/In Progress/Completed/Blocked), task detail drawer with checklists, approval routing
9. **Finance & Legal** (`/finance`) - 4-tab (Financial Overview, Invoices, Quotations, Legal), Revenue vs Expenses BarChart, expense breakdown, invoice/quotation management, legal templates (NDA/MSA/SOW/DPA), legal boundary notice
10. **Reports & Archive** (`/reports`) - 2-tab (Reports, Document Archive), dual Executive + Operational reports with AI summary, searchable/filterable document repository with category/text filtering
11. **System** (`/system`) - 5-tab (System Overview, Permissions, Audit Trail, Integrations, AI Control), 11-module status grid, RBAC with 4 roles + full permission matrix, audit log, integration management, AI mode control center

## Premium UI Component Library

All pages use a consistent premium component library:

- **PageHeader** - Domain title with icon, subtitle, action buttons
- **GlassCard** - Glassmorphic card with blur, inner glow, gradient borders. Variants: default, interactive, alert-warning. Glow options: crimson, blue, success, gold
- **KpiCard** - Executive KPI display with icon, accent colors (crimson, blue, gold, success)
- **PremiumTabs** - Smooth tab system with icons, active state glow
- **StatusBadge** - Semantic status chips (active, pending, draft, critical, success, warning, ai-executed, human-required, human-approved, human-assisted, awaiting-review, manually-completed, ai-recommended)
- **ConfidenceMeter** - Visual percentage bar with color gradient
- **DetailDrawer** - Slide-out panel with backdrop blur, badge support, width variants

## Design System

- Cinematic glassmorphic dark-first theme forced via `class="dark"` on HTML element
- Crimson red primary: `0 72% 51%`
- Navy blue cards: `214 65% 11%`
- Deep background: `222 47% 5%`
- Golden Yellow accent: `45 93% 47%`
- 4-layer depth system: atmosphere, shell, glass surfaces, highlight/AI signal
- Font: Inter (Google Fonts)
- CSS classes: `glass-card`, `glass-surface`, `glass-border`, `btn-premium`, `btn-glass`, `gradient-text-crimson`, `gradient-text-gold`, `kpi-label`, `kpi-value`, `section-header`, `confidence-bar`/`confidence-fill`, `status-dot-active`
- Framer Motion: `motion.div` with `initial/animate/whileHover/layoutId`

## UI Libraries

- framer-motion (page transitions, hover effects)
- recharts (AreaChart, BarChart, PieChart)
- shadcn/ui (Card, Badge, Tabs, Dialog, Select, Input, Label, Button, Progress, Textarea, Checkbox, Skeleton)

## Database Schema (9 core tables + 12 expansion tables)

Core: companies, contacts, leads, opportunities, activities, campaigns, tasks, documents, communications
Expansion: users, roles, permissions, audit_events, approvals, invoices, payments, expenses, contracts, legal_documents, assets, quality_issues, archive_items, ai_runs, integrations, outreach_sequences

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck; JS bundling by esbuild/vite

## Key Commands

- `pnpm run build` — typecheck + build all
- `pnpm run typecheck` — tsc --build --emitDeclarationOnly
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/schemas
- `pnpm --filter @workspace/db run push` — push schema to DB
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/pmg-os run dev` — run frontend

## API Endpoints

All routes prefixed with `/api`:
- `GET /api/healthz` - Health check
- `GET /api/dashboard/summary` - Dashboard KPIs
- `GET /api/dashboard/pipeline` - Pipeline summary
- `GET /api/dashboard/recent-activity` - Recent activities
- CRUD for core: companies, contacts, leads, opportunities, activities, campaigns, tasks, documents, communications
- CRUD for expansion: approvals, assets, audit-events (read/create only), ai-runs (read/create only), archive-items, contracts, invoices, payments (read/create only), expenses, integrations, outreach-sequences, quality-issues, reports, users
- Date fields validated via `parseDate()` helper — returns 400 for invalid dates
- All list endpoints support `?status=`, `?domain=`, `?type=`, `?limit=`, `?offset=` query filters

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/` use `@workspace/api-zod` for validation and `@workspace/db` for persistence.

### `artifacts/pmg-os` (`@workspace/pmg-os`)

React + Vite frontend. Pages in `src/pages/`, shared layout in `src/components/layout/`. Uses `@workspace/api-client-react` for data fetching. Premium components in `src/components/ui/`.

### `lib/db` (`@workspace/db`)

Drizzle ORM with PostgreSQL. Schema files in `src/schema/`. Production migrations handled by Replit on publish.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen config. Generates into `api-client-react` and `api-zod`.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client.

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas for request/response validation.

## Development Notes

- API field names use camelCase: fitScore, painPoints, confidenceScore, isDecisionMaker, authorityLevel, leadsGenerated, targetAudience
- Non-mutating sorts: always use `[...arr].sort(...)` not `arr.sort(...)`
- Dark theme forced via `class="dark"` on html element
- Button patterns: `btn-premium` (crimson gradient), `btn-glass` (glassmorphic)
- All pages: use `max-w-[1600px] mx-auto w-full space-y-6` as root container
- Install packages: `cd artifacts/pmg-os && pnpm add [package]`
- DB push: `pnpm --filter @workspace/db run push`
