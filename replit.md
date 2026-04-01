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

## Domains (11 Modules)

1. **Command Center** (`/`) - Cross-domain dashboard with KPIs, pipeline chart, activity feed
2. **Intelligence** (`/intelligence`) - Company tracking, contact mapping, fit scoring
3. **Outreach** (`/outreach`) - Lead pipeline, scoring, pain points, next actions
4. **Marketing** (`/marketing`) - Campaign management with budget tracking, impressions, conversions
5. **Production** (`/production`) - Asset queue, document status tracking
6. **CRM Pipeline** (`/crm`) - Kanban board with discovery/qualification/proposal/negotiation stages
7. **Communications** (`/communications`) - Call logs, meetings, emails with sentiment analysis
8. **Execution** (`/execution`) - Task management with priority and status tracking
9. **Finance & Legal** (`/finance`) - Revenue analysis, weighted projections, legal documents
10. **Reports & Archive** (`/reports`) - Document repository with tagging and categories
11. **System** (`/system`) - Health monitoring, module status, platform info

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
