# PMG Group OS

## Overview

PMG Group OS is an AI-native enterprise business operating system for PMG Group LLC (cybersecurity/IT services agency). Built as a pnpm workspace monorepo using TypeScript. The system covers 11 integrated domains with a dark-first design using Crimson (#DC2626) accents and Navy Blue (#1E3A5F) foundation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite + TailwindCSS + shadcn/ui + Recharts
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

1. **Command Center** (`/`) - 4-tab executive control surface (Executive, Operations, System Health, Exceptions), KPI cards, Revenue Projection chart, Pipeline by Stage pie chart, top deals, stale deal detection, quick actions
2. **Intelligence** (`/intelligence`) - 4-tab (Company Intelligence, Decision Maker Map, ICP Analysis, Competitor Watch), ICP Builder dialog, company detail modal, fit scoring, pain point analysis, authority mapping
3. **Outreach** (`/outreach`) - 3-tab (Lead Pipeline, Outbound Sequences, Qualification), lead detail modal, create lead form, qualification checklists, CRM handoff, filterable lead pipeline with priority-color borders
4. **Marketing** (`/marketing`) - 4-tab (Campaigns, Analytics, Content Calendar, SEO & Topics), campaign cards with budget bars, performance chart, content calendar, topic clustering, create campaign dialog
5. **Production** (`/production`) - 3-tab (Asset Queue, Kanban Board, Version History), 6-stage lifecycle (Generate→Preview→Review→Revise→Approve→Finalize), asset detail modal with stage progression, create asset dialog
6. **CRM Pipeline** (`/crm`) - Dual PMG/Client tabs, kanban board (5 stages), deal detail modal with timeline, create deal dialog, stage transition buttons, stale deal detection
7. **Communications** (`/communications`) - 4-tab (Communication Log, Mode A: AI-Led Calling, Mode B: AI-Guided Cold Call, Mode C: Meeting Support), coaching sidebar, call queue, disposition mapping, meeting AI co-pilot
8. **Execution** (`/execution`) - 3-tab (Kanban, List View, Approvals), 4-column kanban (Pending/In Progress/Completed/Blocked), task detail modal with checklists, approval routing
9. **Finance & Legal** (`/finance`) - 4-tab (Financial Overview, Invoices, Quotations, Legal), Revenue vs Expenses chart, expense breakdown, invoice/quotation management, legal templates (NDA/MSA/SOW/DPA), create invoice dialog
10. **Reports & Archive** (`/reports`) - 2-tab (Reports, Document Archive), executive + operational reports with AI summary, searchable/filterable document repository
11. **System** (`/system`) - 4-tab (System Overview, Permissions, Audit Trail, Integrations), 11-module status grid, RBAC with 4 roles + permission matrix, audit log, integration management panel

## UI Libraries

- framer-motion (page transitions, hover effects)
- recharts (charts and data visualization)
- shadcn/ui (Card, Badge, Tabs, Dialog, Select, Input, Label, Button, Progress, Textarea, Checkbox)

## Database Schema (9 tables)

- companies, contacts, leads, opportunities, activities, campaigns, tasks, documents, communications

## Design

- Dark-first theme forced via `class="dark"` on HTML element
- Crimson red primary: `0 72% 51%`
- Navy blue cards: `214 65% 11%`
- Deep background: `222 47% 5%`
- Font: Inter (Google Fonts)

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
- CRUD for: companies, contacts, leads, opportunities, activities, campaigns, tasks, documents, communications

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/` use `@workspace/api-zod` for validation and `@workspace/db` for persistence.

### `artifacts/pmg-os` (`@workspace/pmg-os`)

React + Vite frontend. Pages in `src/pages/`, shared layout in `src/components/layout/`. Uses `@workspace/api-client-react` for data fetching.

### `lib/db` (`@workspace/db`)

Drizzle ORM with PostgreSQL. Schema files in `src/schema/`. Production migrations handled by Replit on publish.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen config. Generates into `api-client-react` and `api-zod`.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client.

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas for request/response validation.
