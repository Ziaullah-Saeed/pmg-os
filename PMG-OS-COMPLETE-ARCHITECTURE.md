# PMG Group OS — Complete System Architecture & Operational Guide

## What Is PMG Group OS?

PMG Group OS is an AI-native enterprise business operating system built for PMG Group LLC (cybersecurity & IT services company). It is designed to automate, assist, or manually control every aspect of running the business — from finding leads to closing deals to generating reports — using a tri-mode AI system where the operator chooses how much AI involvement they want.

**Current Wallet Balance: $360.29** (started at ~$400, ~$40 spent on AI operations during development/testing)

---

## The Big Picture: How It All Connects

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Vite)                    │
│  14 Pages: Dashboard, CRM, Intelligence, Outreach, Marketing,  │
│  Production, Execution, Communications, Finance, Reports,      │
│  System, Agents, Channels, Automation                          │
│                           │                                     │
│                    API Calls (REST)                             │
│                           │                                     │
├───────────────────────────┼─────────────────────────────────────┤
│                    BACKEND (Express/Node.js)                    │
│                           │                                     │
│  ┌────────────┐  ┌────────┴────────┐  ┌──────────────────┐     │
│  │ AUTH LAYER │  │  50+ API ROUTES │  │ WEBSOCKET SERVER │     │
│  │ Session +  │  │  (CRUD for all  │  │ (Real-time push  │     │
│  │ RBAC       │  │   11 domains)   │  │  to frontend)    │     │
│  └────────────┘  └────────┬────────┘  └──────────────────┘     │
│                           │                                     │
│  ┌────────────────────────┼────────────────────────────────┐   │
│  │              CORE ENGINE LAYER                          │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌──────────┐  ┌───────────────────┐  │   │
│  │  │ AI MODE     │  │ WALLET   │  │ EVENT BUS         │  │   │
│  │  │ (Tri-Mode   │  │ (Billing │  │ (Pub/Sub connects │  │   │
│  │  │  Decision   │  │  per AI  │  │  all services     │  │   │
│  │  │  Gate)      │  │  call)   │  │  together)        │  │   │
│  │  └──────┬──────┘  └────┬─────┘  └────────┬──────────┘  │   │
│  │         │              │                  │             │   │
│  │  ┌──────┴──────┐  ┌────┴─────┐  ┌────────┴──────────┐  │   │
│  │  │ AUTOMATION  │  │ AI       │  │ STATE MACHINE     │  │   │
│  │  │ ENGINE      │  │ SERVICE  │  │ (Lead/Opp/Task    │  │   │
│  │  │ (Rules +    │  │ (OpenAI  │  │  lifecycle        │  │   │
│  │  │  Triggers)  │  │  GPT-4o) │  │  enforcement)     │  │   │
│  │  └─────────────┘  └──────────┘  └───────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
├───────────────────────────┼─────────────────────────────────────┤
│                    DATABASE (PostgreSQL)                         │
│                    49 Tables                                    │
│  leads, contacts, companies, opportunities, activities,         │
│  campaigns, tasks, invoices, contracts, expenses, assets,       │
│  knowledge_entries, reports, wallet, wallet_transactions,       │
│  automation_rules, pending_actions, ai_runs, audit_events...   │
└─────────────────────────────────────────────────────────────────┘
                           │
                    EXTERNAL SERVICES
              ┌────────────┼────────────┐
              │            │            │
         GoHighLevel    OpenAI      (Future:
         CRM Sync      GPT-4o-mini  Stripe,
         (Hybrid)      AI Engine    SendGrid,
                                    Twilio)
```

---

## The 11 Operating Domains — What Each Does

### 1. Command Center (Dashboard)
**Page:** `dashboard.tsx` | **Purpose:** Executive control surface

- 6 tabs: Platform Overview, Executive, Operations, System Health, Exceptions, AI Activity
- Shows KPIs from ALL other domains (leads, revenue, pipeline, tasks, wallet)
- Platform Overview shows the full system map (11 domains, 3 modes, 112 agents)
- Real-time data from API endpoints: `/api/dashboard/summary`, `/api/wallet/balance`, `/api/agents`

**What works:** All tabs display real data from the database. Charts show actual records.
**What's missing:** Dashboard charts show monthly revenue as all zeros (no actual revenue transactions yet).

### 2. Intelligence
**Page:** `intelligence.tsx` | **Purpose:** Market research & strategic insight

- Shows companies with AI enrichment capabilities
- AI actions: Generate ICP (Ideal Customer Profile), Competitor Analysis, Market Segmentation
- Uses OpenAI to analyze market data and generate strategic insights
- Stores results in knowledge_entries table

**What works:** ICP generation, competitor analysis, market segments — all call real OpenAI and return real analysis. Results stored in knowledge library.
**What's missing:** AI Enrich button triggers API but result display in the UI needs better feedback (loading/success states).

### 3. Outreach
**Page:** `outreach.tsx` | **Purpose:** Prospecting & pipeline discovery

- Multi-step AI outreach pipeline: Research → Personalize → Draft → Variants
- Lead cards with detail drawers
- Sequence management (email drip campaigns)

**What works:** The AI outreach pipeline endpoint works — researches a prospect via OpenAI, then generates personalized outreach copy. Lead cards open detail drawers.
**What's missing:** Sequence execution engine (the automated drip/cadence runner that sends emails at intervals). No external email delivery (needs SendGrid/SMTP). Sequence enrollment exists in DB but no scheduler triggers sends.

### 4. Marketing
**Page:** `marketing.tsx` | **Purpose:** SEO, brand & discoverability

- Campaign management with CRUD
- Content calendar (static display)
- Channel strategy overview
- SEO metrics display

**What works:** Campaign creation (name, type, channel, budget), campaign listing, campaign detail.
**What's missing:** Content calendar is hardcoded sample data, not from DB. SEO metrics are static. No actual ad platform integrations (Google Ads, Facebook Ads API connections).

### 5. Production Studio
**Page:** `production.tsx` | **Purpose:** Brand & asset generation

- Asset generation (social posts, blog posts, email templates, etc.)
- Uses AI to generate content
- Brand kit integration (colors, fonts, tone of voice)
- Asset lifecycle: draft → review → approved → published

**What works:** Asset creation, AI content generation via OpenAI, brand kit stored in DB, asset status updates.
**What's missing:** Image generation is mocked (no DALL-E/Midjourney integration). No actual publishing to social platforms. Preview/timeline panel is UI-only.

### 6. Execution
**Page:** `execution.tsx` | **Purpose:** Operations & workflow control

- Task management with Kanban/List views
- Task lifecycle: pending → in_progress → completed
- Domain-based task assignment
- Priority levels: low, medium, high, urgent

**What works:** Full task CRUD, status transitions, domain assignment, priority setting. Kanban board displays real tasks from DB.
**What's missing:** No auto-assignment based on agent availability. No SLA tracking or deadline enforcement.

### 7. CRM
**Page:** `crm.tsx` | **Purpose:** Sales, closing & revenue pipeline

- Lead management with scoring, enrichment, routing
- Contact management
- Opportunity pipeline (discovery → qualification → proposal → negotiation → closed_won/lost)
- Company management
- GHL routing, AI Insights, Meetings, Sync Center tabs

**What works:** Full CRUD for leads, contacts, companies, opportunities. State machine enforces valid transitions. AI scoring returns real scores with reasoning. GHL routing infrastructure ready.
**What's missing:** GHL push requires OAuth credentials (not configured). Lead conversion to opportunity is API-ready but UI flow could be smoother.

### 8. Communications
**Page:** `communications.tsx` | **Purpose:** Calling & meeting intelligence

- Communication logging (email, phone, meeting)
- Direction tracking (inbound/outbound)
- Contact/company linking
- Sentiment analysis capability

**What works:** Communication creation with type/direction/subject/body, contact linking. Log Communication modal works.
**What's missing:** No actual phone/VoIP integration. No call recording. Transcript processing is available in AI service but not connected to a real transcription source. No calendar/meeting booking integration.

### 9. Finance & Legal
**Page:** `finance.tsx` | **Purpose:** Administrative & compliance

- 7 tabs: Financial Overview, Wallet & Cost Control, Invoices, Contracts, Expenses, Profitability, Legal & SOPs
- Wallet management: balance, fund, transactions, thresholds, spend analytics
- Invoice CRUD with lifecycle (draft → sent → paid)
- Contract management
- Expense tracking

**What works:** Wallet fully operational (balance tracking, fund addition, transaction logging, spend thresholds, cache hit tracking). Invoice/contract/expense CRUD. Cost control with daily/monthly limits per provider.
**What's missing:** No external payment processing (Stripe/QuickBooks). Profitability calculations use mock data. SOP creation fails (DB schema issue with follow_ups/sops tables).

### 10. Reports & Archive
**Page:** `reports.tsx` | **Purpose:** Documentation & knowledge memory

- Report generation (AI-generated and manual)
- Report types: operational, pipeline, revenue, daily, weekly, monthly
- Archive system for completed records
- Knowledge library with 100+ entries

**What works:** Report creation (manual), AI report generation via OpenAI, knowledge library with auto-ingestion from AI operations and system events. CSV export for leads.
**What's missing:** Scheduled report generation (cron jobs defined but never execute). Archive auto-archival from workflows is limited.

### 11. System Core
**Page:** `system.tsx` | **Purpose:** Governance, permissions & infra

- AI Mode management (switch between 3 modes)
- User management (5 users, 3 roles)
- Module health status
- Integration status dashboard
- Testing framework (62 tests across 12 suites)

**What works:** AI mode switching (all 3 modes), user listing, module status display, test execution with real results.
**What's missing:** User creation from UI, granular permission editing, role assignment UI.

---

## The Three Operating Modes — How They Actually Work

### Mode 1: AI Autonomous
- **What it does:** AI agents can execute ANY action without human approval
- **How it works:** When code calls `shouldAiAct(workflowKey, confidence)`, it returns `{canAct: true}` regardless of confidence level
- **Real behavior tested:** AI scoring, enrichment, report generation all execute immediately
- **Wallet impact:** Every AI call deducts from wallet (typically $0.01-$0.05 per call)

### Mode 2: Hybrid (Default)
- **What it does:** AI proposes actions. High-confidence (>80%) auto-execute. Low-confidence (<50%) require human approval.
- **How it works:** 
  - Confidence >80%: `{canAct: true}` — proceeds automatically
  - Confidence 50-79%: `{canAct: true, requiresReview: true}` — AI executes but flags for review
  - Confidence <50%: `{canAct: false}` — action queued in `pending_actions` table
- **Real behavior tested:** High confidence calls go through, low confidence creates pending actions (31 pending actions in queue)
- **Per-workflow overrides:** Lead scoring is set to "ai_autonomous" even in hybrid mode (always auto-scores)

### Mode 3: Human Controlled
- **What it does:** ALL AI is blocked. Every action requires manual human initiation.
- **How it works:** `shouldAiAct()` always returns `{canAct: false, reason: "Global mode is Human Controlled"}`
- **Real behavior tested:** AI calls return AI_BLOCKED error. Human workflow guides appear in UI.
- **Wallet impact:** No AI charges in this mode

### Mode Decision Flow:
```
Action Request → Check Global Mode
                    │
        ┌───────────┼───────────┐
        │           │           │
   AI Auto     Hybrid      Human
   Always      Check        Always
   Allow       Confidence   Block
                    │
              ┌─────┴─────┐
              │            │
           High (>80%)  Low (<50%)
           Auto-execute  Queue for
                        human review
```

---

## The 112 AI Agents — What They Are

The agent registry (`agent-registry.ts`) defines 112 named AI agents distributed across all 11 domains. Each agent is essentially a specialized AI prompt template that:

1. Has a specific role (e.g., "Lead Scoring Agent", "Market Research Agent", "Content Writer Agent")
2. Belongs to a domain (CRM, Intelligence, Marketing, etc.)
3. Has a system prompt that defines its expertise
4. Can be called through the orchestration engine

**How agents work in practice:**
- The `agent-executor.ts` takes an agent name, constructs the appropriate system prompt, and calls OpenAI
- The `orchestration-engine.ts` can chain agents together for multi-step workflows
- Each agent execution is logged in `ai_runs` table and charged to the wallet

**Current reality:** Agents are defined and callable, but most are not automatically triggered by workflows. They need to be explicitly invoked via the Agents page or through automation rules.

---

## The Wallet & Billing System

### How It Works:
```
AI Call → Check Wallet Balance → Check Spend Thresholds → Charge → Log Transaction
                                        │
                                 ┌──────┴──────┐
                                 │             │
                           Under Limit    Over Limit
                           Proceed        Block + Warn
```

### Current State:
- **Balance:** $360.29
- **Total Transactions:** 1700+ (charges + cache hits)
- **Cost per AI call:** ~$0.01-$0.05 (GPT-4o-mini is cheap)
- **Cache hit rate:** 87.7% (saves money by reusing previous AI results)
- **Spend thresholds:** Can set daily/monthly limits per provider or workflow

### Where Money Goes:
| Domain | Spend | What It's For |
|--------|-------|---------------|
| Intelligence | $0.36 | ICP generation, market research |
| Outreach | $0.36 | Prospect research, outreach drafts |
| CRM | $0.25 | Lead scoring, enrichment |
| Production | $0.15 | Content generation |
| Communications | $0.08 | Sentiment analysis |
| Marketing | $0.06 | Campaign insights |
| Reports | $0.04 | Report generation |
| Execution | $0.04 | Task suggestions |

---

## The Automation Engine — How Things Connect

### Event Flow:
```
User creates a lead → API saves to DB → Event Bus emits "lead.created"
                                              │
                                    Automation Engine listens
                                              │
                                    Checks automation_rules table
                                              │
                                    Found rule: "Auto-enrich new leads"
                                              │
                                    Checks AI Mode (Hybrid?)
                                              │
                                    Creates pending_action for human review
                                              │
                                    User approves → AI enriches the lead
                                              │
                                    Result stored in knowledge_entries
```

### Defined Triggers:
- lead.created, lead.scored, lead.qualified, lead.routed
- opportunity.created, opportunity.stage_changed, opportunity.won, opportunity.lost
- task.completed, invoice.paid, campaign.launched
- And more...

### Defined Actions:
- ai_enrich, ai_score, notification, set_priority, route_lead
- archive, send_email, update_field, ghl_sync

### Current State:
- Rules exist in DB and can be created/toggled
- Rules generate pending_actions when triggered (31 pending items exist)
- BUT: The full automated execution chain after approval needs more testing

---

## GoHighLevel (GHL) Integration

### What's Built:
- **OAuth flow:** Authorize, callback, refresh token endpoints
- **Field mapping:** name→firstName, email→email, phone→phone, company→companyName
- **Pipeline mapping:** PMG stages mapped to GHL pipeline stages
- **Bidirectional sync:** Outbound push + inbound webhook handler
- **HMAC webhook verification:** Signature validation for inbound webhooks
- **Sync logging:** All sync attempts recorded with status
- **Retry queue:** Failed syncs queued for retry
- **CRM mode:** Hybrid (AI proposes GHL actions, human approves)

### What's NOT Connected:
- **No live GHL credentials** — OAuth client ID/secret not configured
- Push operations return "GHL not configured"
- The entire infrastructure works but has no real GHL account to talk to
- Once credentials are added, the sync will work

---

## Database — 49 Tables

### Core Business:
`leads`, `contacts`, `companies`, `opportunities`, `activities`, `campaigns`, `tasks`, `communications`

### Finance:
`invoices`, `contracts`, `expenses`, `payments`, `wallet`, `wallet_transactions`, `wallet_spend_thresholds`, `wallet_cache`

### AI & Automation:
`ai_runs`, `ai_mode_settings`, `automation_rules`, `pending_actions`, `knowledge_entries`, `scheduled_jobs`, `job_queue`

### Content & Assets:
`assets`, `documents`, `brand_kits`, `reports`, `archive_items`, `sops`, `notes`, `follow_ups`

### Integrations:
`integrations`, `sync_logs`, `channels`, `channel_sources`, `channel_forms`, `landing_pages`, `manual_imports`, `attribution_events`

### System:
`users`, `user_sessions`, `user_audit_log`, `notifications`, `audit_events`, `quality_issues`, `outreach_sequences`, `sequence_enrollments`, `file_uploads`

---

## What's TRULY Working (Operational)

1. **Authentication & RBAC** — Login, sessions, role-based permissions
2. **Full CRUD across all domains** — Create, read, update, delete records
3. **AI Mode System** — All 3 modes switch and enforce correctly
4. **Wallet Billing** — Balance tracking, charging, thresholds, fund addition
5. **AI Operations** — Lead scoring, enrichment, ICP generation, outreach pipeline, report generation, content generation — all call real OpenAI
6. **State Machine** — Lead/opportunity/task transitions enforced
7. **Event Bus** — Events emit and store on actions
8. **Approval Workflow** — Create, approve, reject approvals
9. **Pending Actions Queue** — Actions queue in hybrid mode, resolvable
10. **Knowledge Library** — 100+ auto-ingested entries from AI ops & events
11. **Cache System** — 87.7% hit rate saves wallet spend
12. **Testing Framework** — 62/62 tests passing across 12 suites
13. **Notifications** — 308+ notifications from system events
14. **Global Search** — Cross-entity search works
15. **CSV Export** — Report export to CSV

## What's Partially Working

1. **Automation Rules** — Rules fire and create pending actions, but end-to-end automated execution chain is incomplete
2. **GHL Integration** — Full infrastructure built, no live credentials
3. **Outreach Sequences** — Schema ready, no execution engine
4. **Scheduled Jobs** — 9 jobs defined, none executing (no cron runner active)
5. **Follow-ups & SOPs** — Routes exist but DB insert fails
6. **AI Enrichment UI feedback** — API works but UI doesn't show result clearly

## What's Not Working

1. **External email/SMS delivery** — No SendGrid/Twilio
2. **External CRM sync** — No live GHL/HubSpot credentials
3. **Image/video generation** — No DALL-E integration
4. **Phone/VoIP** — No calling integration
5. **Payment processing** — No Stripe/QuickBooks
6. **User creation from UI** — API exists but no UI form
7. **Cron job execution** — Jobs defined but never run

---

## File Reference

### Backend Services (48 files)
| Service | Purpose |
|---------|---------|
| `ai-service.ts` | Core AI calls to OpenAI (enrich, score, summarize, generate) |
| `ai-mode-service.ts` | Tri-mode decision gate (autonomous/hybrid/human) |
| `mode-action-service.ts` | Executes or queues actions based on mode |
| `wallet-service.ts` | Billing: charge, fund, thresholds, analytics |
| `automation-engine.ts` | Event-driven rule execution |
| `event-bus.ts` | Pub/sub connecting all services |
| `state-machine.ts` | Entity lifecycle state enforcement |
| `ghl-service.ts` | GoHighLevel CRM integration |
| `knowledge-service.ts` | Knowledge library CRUD + auto-ingestion |
| `confidence-handoff-service.ts` | Confidence-based AI/human handoff |
| `agent-registry.ts` | 112 AI agent definitions |
| `agent-executor.ts` | Runs agents via OpenAI |
| `orchestration-engine.ts` | Multi-agent workflow chains |
| `production-studio-service.ts` | Asset generation |
| `outreach-pipeline-service.ts` | Multi-step prospect research + outreach |
| `intelligence-service.ts` | ICP, competitor analysis, market segments |
| `sequence-engine.ts` | Email sequence management |
| `scheduler-service.ts` | Cron job definitions |
| `job-queue.ts` | Async job processing |
| `notification-service.ts` | User notification creation |
| `audit-service.ts` | Audit event logging |
| `auth-service.ts` | User authentication |
| `cache-service.ts` | Response caching |
| `cache-intelligence.ts` | Smart cache with similarity matching |
| `channel-manager.ts` | Marketing channel management |
| `channel-health-service.ts` | Channel health metrics |
| `communication-intelligence-service.ts` | Call/meeting analysis |
| `creative-providers.ts` | Content generation providers |
| `dedup-service.ts` | Duplicate detection |
| `embedding-service.ts` | Text embeddings for search |
| `finance-legal-service.ts` | Financial calculations |
| `governance-service.ts` | System governance rules |
| `integration-hub-service.ts` | Multi-provider integration management |
| `lead-router.ts` | Lead assignment routing |
| `memory-service.ts` | Persistent memory for AI context |
| `messaging-service.ts` | Message sending with mode awareness |
| `pipeline-engine.ts` | Sales pipeline management |
| `reporting-knowledge-service.ts` | Report + knowledge cross-referencing |
| `slack-surface-service.ts` | Slack integration surface |
| `testing-service.ts` | Test suite execution engine |
| `tool-chain-service.ts` | Multi-tool orchestration |
| `tool-registry.ts` | Available AI tool definitions |
| `websocket-service.ts` | Real-time WebSocket broadcast |
| `booking-service.ts` | Meeting booking |
| `assignment-router.ts` | Task/lead assignment |
| `approval-engine.ts` | Approval workflow engine |
| `activity-timeline.ts` | Activity feed generation |

### Frontend Pages (21 files)
| Page | Route | Domain |
|------|-------|--------|
| `dashboard.tsx` | `/` | Command Center |
| `intelligence.tsx` | `/intelligence` | Intelligence |
| `outreach.tsx` | `/outreach` | Outreach |
| `marketing.tsx` | `/marketing` | Marketing |
| `production.tsx` | `/production` | Production |
| `execution.tsx` | `/execution` | Execution |
| `crm.tsx` | `/crm` | CRM |
| `communications.tsx` | `/communications` | Communications |
| `finance.tsx` | `/finance` | Finance |
| `reports.tsx` | `/reports` | Reports |
| `system.tsx` | `/system` | System Core |
| `agents.tsx` | `/agents` | Agent Orchestration |
| `channels.tsx` | `/channels` | Channels |
| `automation.tsx` | `/automation` | Automation |
| `admin.tsx` | `/admin` | Admin Panel |
| `quality.tsx` | `/quality` | Quality |
| `ai-auto.tsx` | `/ai-auto` | AI Auto Mode View |
| `hybrid.tsx` | `/hybrid` | Hybrid Mode View |
| `human.tsx` | `/human` | Human Mode View |
| `login.tsx` | `/login` | Authentication |
| `not-found.tsx` | `*` | 404 |

### Create Forms (7 files)
| Form | Creates | Required Fields |
|------|---------|----------------|
| `create-lead-form.tsx` | Lead | source (company, contact optional) |
| `create-contact-form.tsx` | Contact | firstName, lastName |
| `create-company-form.tsx` | Company | name |
| `create-opportunity-form.tsx` | Opportunity | title, value |
| `create-task-form.tsx` | Task | title, domain |
| `create-campaign-form.tsx` | Campaign | name, type, channel |
| `create-document-form.tsx` | Document | title, category, type |

---

## How to Use This System Day-to-Day

### Morning Routine:
1. Login → Dashboard → Check Platform Overview for system health
2. Check Pending Actions queue (hybrid mode review items)
3. Review overnight AI activity in AI Activity tab
4. Check wallet balance and spend

### Lead Management:
1. New leads arrive via CRM or manual entry
2. AI auto-scores leads (if in AI Auto or Hybrid mode)
3. High-score leads get AI-enriched with company data
4. Qualified leads can be routed to GHL (when configured)
5. Leads convert to opportunities in the pipeline

### Sales Pipeline:
1. Opportunities move through: Discovery → Qualification → Proposal → Negotiation → Closed
2. State machine enforces valid transitions
3. AI suggests next actions at each stage
4. Activities and notes tracked per opportunity

### Content & Marketing:
1. Create campaigns with budget and channel
2. Use Production Studio to generate AI content
3. Brand kit ensures consistent styling
4. Track channel health metrics

### Finance:
1. Wallet auto-charges for AI operations
2. Set spend thresholds to control costs
3. Create invoices for clients
4. Track expenses and contracts
