# PMG GROUP OS — Complete Testing Checklist
### Based on Blueprint v2 + v3 | 6 Sections · 32 Agents · 3 AI Modes

---

## HOW TO USE THIS CHECKLIST

**Login:** `shershah_nawabi@pmggroup-llc.com` / `PMGAdmin2024!`

For every item below:
- ✅ = Works as expected
- ⚠️ = Partially works / cosmetic issue
- ❌ = Broken / missing / does nothing
- 🔲 = Not yet tested

**Test each item in all 3 AI modes** (change in Settings → AI Modes):
- **AI Autonomous** — No banner, all AI buttons visible, agents run automatically
- **Hybrid** — Yellow banner, AI/Human/Review badges on items, confidence-based auto/queue
- **Human Controlled** — Blue banner, collapsible Workflow Guide, some AI buttons hidden

---

## 0. LOGIN & GLOBAL LAYOUT

| # | Test | Expected | Status |
|---|------|----------|--------|
| 0.1 | Login with admin credentials | Redirects to Dashboard | 🔲 |
| 0.2 | Sidebar shows 6 sections + Settings | Outreach, CRM, Marketing, Production, Admin, Finance, Settings | 🔲 |
| 0.3 | Sidebar section grouping | Revenue Engine (Outreach, CRM), Growth (Marketing, Production), Operations (Admin, Finance) | 🔲 |
| 0.4 | Global Search (top bar) | Opens search overlay, finds items across sections | 🔲 |
| 0.5 | Notification Bell (top bar) | Shows notification dropdown with recent items | 🔲 |
| 0.6 | Wallet Display (top bar) | Shows current balance ($355.02 in dummy mode) | 🔲 |
| 0.7 | AI Mode Toggle (top bar) | Shows current mode, can switch between 3 modes | 🔲 |
| 0.8 | Video Guide [?] button per section | Each sidebar section has a guide button, clicking opens walkthrough overlay | 🔲 |
| 0.9 | Logout | Returns to login screen | 🔲 |

---

## 1. DASHBOARD

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1.1 | Dashboard loads | Shows KPI overview cards | 🔲 |
| 1.2 | KPI cards display | Active Leads, Pipeline Value, Conversion Rate, Revenue metrics | 🔲 |
| 1.3 | Quick Actions section | Buttons to jump to key actions (Find Prospects, Create Content, etc.) | 🔲 |
| 1.4 | Pipeline Summary | Visual pipeline with deal stages and counts | 🔲 |
| 1.5 | Recent Leads | List of recently added leads with status | 🔲 |
| 1.6 | System Status | Agent status, API health indicators | 🔲 |

---

## 2. OUTREACH (6 Agents)

### Tab: Prospect Finder (Agent 1 — Prospect Intelligence)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.1 | "Find Prospects" button | Calls AI, returns ranked list of cybersecurity/IT companies | 🔲 |
| 2.2 | Prospect cards display | Each card shows: company name, fit score, accessibility score, contact info | 🔲 |
| 2.3 | "Plan Approach" button per prospect | Triggers Agent 3 → strategy card appears | 🔲 |
| 2.4 | "Save as Lead" button per prospect | Saves prospect to DB as a real lead in CRM | 🔲 |
| 2.5 | "Save All to CRM" bulk button | Saves all prospects; individual buttons sync to "Saved" state | 🔲 |
| 2.6 | Loading spinners during AI calls | Spinner shown while AI is processing | 🔲 |
| 2.7 | Error handling | Toast notification if AI call fails | 🔲 |

### Tab: Social Command Center (Agent 2)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.8 | Unified inbox view | Shows messages from all connected channels | 🔲 |
| 2.9 | Message classification | Hot Lead 🔥 / Warm 🟡 / Cold ❄️ / Spam 🚫 labels | 🔲 |
| 2.10 | Response draft per message | AI-prepared draft visible for each incoming message | 🔲 |
| 2.11 | "Send" button per message | Marks message as sent, starts tracking | 🔲 |
| 2.12 | "Move to CRM" button | Appears on positive responses; creates lead in CRM (triggers Agent 7) | 🔲 |
| 2.13 | Channel performance stats | Which channel brings most leads at lowest cost | 🔲 |

### Tab: Strategy (Agent 3 — Outreach Strategist)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.14 | Strategy card from "Plan Approach" | Multi-channel sequence plan: Day 1 LinkedIn → Day 3 follow-up → etc. | 🔲 |
| 2.15 | Decision chain mapping | Shows who to contact first: CEO → CTO → Marketing Director | 🔲 |
| 2.16 | "Draft Messages" button | Appears on strategy card; triggers Agent 4 | 🔲 |

### Tab: Compose (Agent 4 — Message Composer)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.17 | Personalized message drafts | AI-written messages per channel (LinkedIn, email, call script) | 🔲 |
| 2.18 | Messages reference prospect details | Not generic — mentions specific company/pain points | 🔲 |
| 2.19 | "Review & Send" buttons per message | Each message has review/send action | 🔲 |
| 2.20 | Tone adaptation | C-Suite = strategic, IT Directors = technical, Marketing = results | 🔲 |
| 2.21 | No forbidden words | No "leverage", "synergy", "cutting-edge", "game-changing" in output | 🔲 |

### Tab: Follow-ups (Agent 5 — Follow-up Engine)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.22 | Follow-up reminders list | Shows upcoming follow-ups with timing | 🔲 |
| 2.23 | "Send Follow-up" button | Drafts follow-up referencing previous touchpoints | 🔲 |
| 2.24 | Escalation logic visible | After 3 LinkedIn attempts → suggests email → then phone | 🔲 |
| 2.25 | Signal detection display | Profile views, email opens trigger "warm" status | 🔲 |
| 2.26 | "Move to CRM" button | Appears when prospect responds positively | 🔲 |

### Tab: Analytics (Agent 6 — Outreach Analytics)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.27 | Outreach metrics dashboard | Reply rates, open rates, acceptance rates per channel | 🔲 |
| 2.28 | Winner/loser identification | "Case study email: 34% reply vs 8% for intro" style insights | 🔲 |
| 2.29 | Team tracking | Who sent what, conversion rates per person | 🔲 |
| 2.30 | Weekly report | Clear actions: "Increase LinkedIn, reduce cold email" | 🔲 |
| 2.31 | "Apply Recommendation" buttons | Updates outreach strategies when clicked | 🔲 |

---

## 3. CRM (5 Agents)

### Tab: Pipeline (Agent 8 — Deal Intelligence)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.1 | Pipeline view loads | Visual pipeline: New Lead → Meeting Set → Discovery → Proposal → Negotiation → Won/Lost | 🔲 |
| 3.2 | Deal cards with health scores | 🟢 Green / 🟡 Yellow / 🔴 Red per deal | 🔲 |
| 3.3 | Drag deals between stages | Can move deals across pipeline stages | 🔲 |
| 3.4 | Risk detection alerts | Shows warnings: "champion silent", "competitor mentioned" | 🔲 |
| 3.5 | Next step recommendations | Specific: "Send ROI calculator to Sarah by Thursday" | 🔲 |
| 3.6 | "Create Proposal" button on deal | Triggers Agent 10 | 🔲 |
| 3.7 | "Mark Won" button | Closes deal, records revenue, shows "Start Onboarding" for Production | 🔲 |
| 3.8 | "Mark Lost" button | Records loss reason | 🔲 |

### Tab: Lead Qualification (Agent 7)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.9 | Lead scoring display | 5 dimensions: Fit (30%), Need (25%), Budget (20%), Timing (15%), Authority (10%) | 🔲 |
| 3.10 | Category labels | 🔥 Hot (80+) / 🟡 Warm (50-79) / ❄️ Cold (20-49) / 🚫 Disqualified (<20) | 🔲 |
| 3.11 | Score reasoning visible | "Scored 87 because: 500-employee cybersec firm, no marketing team..." | 🔲 |
| 3.12 | "Set Meeting" button on hot leads | Triggers Agent 9 prep | 🔲 |
| 3.13 | Warm leads → nurture flow | Routes back to Agent 5 for continued follow-up | 🔲 |

### Tab: Call Intelligence (Agent 9)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.14 | "Prep for Meeting" / pre-call briefing | Generates full briefing: who they are, pain points, talking points | 🔲 |
| 3.15 | Coaching cards displayed | "If they say X, respond with Y" format | 🔲 |
| 3.16 | Objection handling scripts | Budget, already-have-agency, send-me-info responses | 🔲 |
| 3.17 | "Upload Transcript" button | Upload Zoom transcript → AI analyzes | 🔲 |
| 3.18 | Post-call analysis | Sentiment, decisions, action items, deal stage update, call score | 🔲 |
| 3.19 | Follow-up email draft | Auto-drafted after transcript analysis | 🔲 |
| 3.20 | "Send Follow-up" button | Sends the drafted email | 🔲 |

### Tab: Proposals (Agent 10 — Proposal & Contract)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.21 | "Create Proposal" generates proposal | Customized to prospect's situation with scope, timeline, pricing | 🔲 |
| 3.22 | Pricing tiers shown | Starter ($2,500) / Growth ($5,000) / Enterprise ($10,000) | 🔲 |
| 3.23 | Proposal preview | Full preview before sending | 🔲 |
| 3.24 | "Send Proposal" button | Marks as sent, starts tracking | 🔲 |
| 3.25 | Proposal tracking | Status: Sent → Viewed → Under Review → Accepted → Rejected | 🔲 |
| 3.26 | "Generate Contract" button | Appears after proposal accepted | 🔲 |
| 3.27 | Renewal alerts | 60-day alerts before contract expiration | 🔲 |

### Tab: CRM Sync (Agent 11)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 3.28 | GHL sync status | Shows connection status to GoHighLevel | 🔲 |
| 3.29 | HubSpot sync status | Shows connection status | 🔲 |
| 3.30 | "Partner Close" flag on deals | Flag deal → auto-pushes to GHL sub-account | 🔲 |
| 3.31 | Bidirectional sync indicator | Changes in either system update the other | 🔲 |
| 3.32 | Sync error queue | Retries shown with status | 🔲 |
| 3.33 | "View in GHL" link | Opens deal in GoHighLevel | 🔲 |

---

## 4. MARKETING (5 Agents)

### Tab: Content Strategy (Agent 12 — Content Strategist)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.1 | Content calendar view | Shows planned content across channels | 🔲 |
| 4.2 | Channel breakdown | LinkedIn (3/wk), Facebook/IG (5/wk), Blog (2/mo), X (daily), YouTube (2/mo) | 🔲 |
| 4.3 | "Create Content" button | Opens content creation flow | 🔲 |
| 4.4 | Content preview | Generated content shown with preview | 🔲 |
| 4.5 | "Review" → "Approve" → "Publish" flow | Status changes: Draft → Review → Approved → Published | 🔲 |
| 4.6 | Content repurposing | 1 blog → LinkedIn + social posts + email + video script suggestion | 🔲 |

### Tab: Campaigns (Agent 13 — Advertising)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.7 | "Create Campaign" button | Opens campaign builder for Facebook/LinkedIn/Google/YouTube | 🔲 |
| 4.8 | Campaign package | Shows: copy, targeting, budget, schedule, A/B variations | 🔲 |
| 4.9 | "Review" → "Launch" flow | Team reviews; manual launch only (never auto-publishes) | 🔲 |
| 4.10 | Performance tracking | Cost per lead, cost per meeting, ROAS per platform | 🔲 |
| 4.11 | Budget awareness | Works within $600 campaign budget | 🔲 |

### Tab: SEO & Growth (Agent 14)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.12 | "Run SEO Audit" button | Generates website audit report | 🔲 |
| 4.13 | Keyword research results | Keywords with intent + competition levels | 🔲 |
| 4.14 | Ranked fixes list | Specific tasks ordered by impact | 🔲 |
| 4.15 | "Create Content" per keyword gap | Each gap has button to trigger content creation | 🔲 |
| 4.16 | Ranking/traffic tracking | Shows position and organic traffic trends | 🔲 |

### Tab: Orchestrator (Agent 15 — Campaign Orchestrator)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.17 | "Plan Campaign" button | Creates multi-channel coordinated campaign plan | 🔲 |
| 4.18 | Timeline view | Week 1 awareness → Week 2 engagement → Week 3 conversion | 🔲 |
| 4.19 | Full journey tracking | Impression → visit → form → lead → meeting → client | 🔲 |
| 4.20 | Weekly campaign report | Performance data with recommendations | 🔲 |

### Tab: Competitor Intel (Agent 16)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 4.21 | "Refresh Competitor Analysis" button | Runs competitor scan | 🔲 |
| 4.22 | Competitive battle cards | Talking points against each competitor | 🔲 |
| 4.23 | Gap identification | "No competitor offers lead generation guarantees" | 🔲 |
| 4.24 | Competitor alerts | Notifications on competitor moves | 🔲 |

---

## 5. PRODUCTION (8 Agents)

### Tab: Client Onboarding (Agent 17)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.1 | Onboarding checklist displayed | 7 steps: brand assets, access, audience, services, goals, CRM, partner sync | 🔲 |
| 5.2 | "Complete Step" button per step | Advances progress, unlocks next step | 🔲 |
| 5.3 | Progress bar | Shows completion percentage | 🔲 |
| 5.4 | "Run Marketing Audit" button | Appears after all steps complete; triggers Agent 18 | 🔲 |
| 5.5 | "Generate 90-Day Plan" button | AI creates success plan | 🔲 |

### Tab: Marketing Audit (Agent 18 — Client Marketing Analyst)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.6 | Audit report display | Website, social, ads, email, competitor analysis | 🔲 |
| 5.7 | Prioritized fix-it plan | Ranked by impact, not by ease | 🔲 |
| 5.8 | "Start Fix" buttons per priority | Triggers content creation (Agent 19) or campaign build (Agent 21) | 🔲 |
| 5.9 | Before/after comparison | Monthly progress tracking | 🔲 |

### Tab: Creative Production (Agent 19)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.10 | Asset type selection | Click: Image, Video, Document, Branding — highlights selection | 🔲 |
| 5.11 | Prompt textarea appears | After selecting type, shows description input | 🔲 |
| 5.12 | "Generate" button | Dispatches to correct AI hook (image/video/document) | 🔲 |
| 5.13 | Image generation | Creates social graphics, ad creatives, blog headers, etc. | 🔲 |
| 5.14 | Video generation | Creates social clips, ad videos, explainers | 🔲 |
| 5.15 | Document generation | Creates proposals, case studies, whitepapers, reports | 🔲 |
| 5.16 | Preview in system | Generated content viewable before action | 🔲 |
| 5.17 | Download buttons | Download in specified formats (PNG, MP4, PDF, etc.) | 🔲 |
| 5.18 | "Approve" / "Publish" buttons | Moves content through pipeline | 🔲 |

### Tab: Lead Generator (Agent 20 — Client Lead Generator)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.19 | "Generate Leads" button | AI finds prospects for client's target market | 🔲 |
| 5.20 | Lead list with quality scores | Each lead: company, contact, pain points, score (80+ only) | 🔲 |
| 5.21 | "Push to Client CRM" button | Triggers Agent 23 sync to GHL/HubSpot | 🔲 |
| 5.22 | "Add to PMG Pipeline" button | Sends to CRM Agent 7 | 🔲 |

### Tab: Campaigns & Funnels (Agent 21)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.23 | Campaign list with status | Active / Paused / Draft campaigns shown | 🔲 |
| 5.24 | "Launch" / "Pause" / "Resume" toggle | Changes campaign status with visual indicator | 🔲 |
| 5.25 | "View Funnel" expands inline | Shows step-by-step: Ad → Landing → Form → Nurture → Call | 🔲 |
| 5.26 | Conversion rates per funnel step | Percentage at each stage | 🔲 |
| 5.27 | "Build Campaign" / "Build Funnel" buttons | Creates new campaign or funnel | 🔲 |

### Tab: Reporting (Agent 22 — Client Report)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.28 | "Generate Report" button | Creates performance report for selected client | 🔲 |
| 5.29 | Executive format (1-page) | Top-line numbers for C-suite | 🔲 |
| 5.30 | Detailed format | Full data for marketing managers | 🔲 |
| 5.31 | ROI calculation shown | "$150K pipeline from $5K spend = 30x ROI" style | 🔲 |
| 5.32 | "Send to Client" button | Delivers report | 🔲 |
| 5.33 | Progress vs "20 deals" promise | Tracks against core guarantee | 🔲 |
| 5.34 | PDF export | Report downloadable as PDF | 🔲 |

### Tab: Client CRM Sync (Agent 23)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.35 | Sync status dashboard | Shows per-client sync health | 🔲 |
| 5.36 | GHL sub-account sync | Partner pipeline integration working | 🔲 |
| 5.37 | Error queue with retry | Failed syncs shown with retry option | 🔲 |
| 5.38 | "View in GHL/HubSpot" links | Opens record in external CRM | 🔲 |

### Tab: Quality Review (Agent 24 — Content Quality)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.39 | Content items with quality scores | Ready to Publish / Needs Minor Edits / Needs Rewrite | 🔲 |
| 5.40 | "Approve & Publish" button | Changes badge to green "Published" | 🔲 |
| 5.41 | "Auto-Fix" button | AI fixes minor issues | 🔲 |
| 5.42 | "Regenerate" button | Calls AI to create new version | 🔲 |
| 5.43 | Human tone check | Rejects anything that sounds like AI | 🔲 |
| 5.44 | Brand consistency check | Correct logos, colors, voice | 🔲 |

### Tab: Content Library

| # | Test | Expected | Status |
|---|------|----------|--------|
| 5.45 | Content Library loads | Shows all created assets | 🔲 |
| 5.46 | Status filtering | Filter by: Draft / Review / Approved / Published | 🔲 |
| 5.47 | Type filtering | Filter by: Image / Video / Document / Branding | 🔲 |
| 5.48 | Preview per item | Click to preview content | 🔲 |
| 5.49 | Download per item | Download in available formats | 🔲 |

---

## 6. ADMIN (4 Agents)

### Tab: Operations (Agent 25 — Operations Manager)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 6.1 | Task dashboard loads | Shows task cards with assignments | 🔲 |
| 6.2 | Daily action plans | Specific per-person: "John: call these 5 leads" | 🔲 |
| 6.3 | "Mark Complete" buttons | Task cards can be completed | 🔲 |
| 6.4 | Overdue flagging | Overdue items highlighted | 🔲 |
| 6.5 | Team productivity metrics | Stats per team member | 🔲 |

### Tab: Knowledge Base (Agent 26 — Knowledge & Document)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 6.6 | Knowledge base search | Type question → instant answer | 🔲 |
| 6.7 | SOPs/playbooks/templates list | Organized documents visible | 🔲 |
| 6.8 | Create new document | Add SOPs or training materials | 🔲 |
| 6.9 | Version history | Previous versions accessible | 🔲 |

### Tab: Executive Briefing (Agent 27)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 6.10 | Morning briefing loads | Overnight activity, urgent items, today's priorities | 🔲 |
| 6.11 | Weekly summary view | Pipeline health, team performance, client status, revenue | 🔲 |
| 6.12 | Risk alerts | Overdue tasks, at-risk deals, budget warnings | 🔲 |
| 6.13 | "Go to" buttons per action item | Links to relevant section for each priority | 🔲 |

### Tab: System Evolution (Agent 28)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 6.14 | "What's New" report | Scanned market trends, new AI tools, platform updates | 🔲 |
| 6.15 | "Approve" / "Explore Later" / "Skip" buttons | Each recommendation has decision buttons | 🔲 |
| 6.16 | Approved items → tasks | Approved updates create tasks in Operations | 🔲 |

---

## 7. FINANCE (2 Agents)

### Tab: Billing & Revenue (Agent 29)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 7.1 | "Create Invoice" button | Generates professional invoice | 🔲 |
| 7.2 | Invoice types | One-time, recurring, usage-based options | 🔲 |
| 7.3 | Invoice preview | Full preview before sending | 🔲 |
| 7.4 | "Send Invoice" button | Delivers invoice, starts payment tracking | 🔲 |
| 7.5 | Payment tracking | Draft → Sent → Viewed → Paid → Overdue statuses | 🔲 |
| 7.6 | Overdue reminders | Auto-scheduled at 7, 14, 30 days | 🔲 |
| 7.7 | Revenue dashboard | MRR, revenue per client, growth trend | 🔲 |
| 7.8 | Client profitability | Revenue minus cost to serve | 🔲 |
| 7.9 | AI Wallet management | Balance, spend limits, cost-per-action, alerts | 🔲 |

### Tab: Contracts & Expenses (Agent 30)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 7.10 | "Create Contract" button | Drafts service agreement per package (Starter/Growth/Enterprise) | 🔲 |
| 7.11 | Contract lifecycle tracking | Start date, end date, renewal alerts | 🔲 |
| 7.12 | Renewal alerts | 60-day warning before expiration | 🔲 |
| 7.13 | Expense tracking | Tools, ads, AI costs, salaries, subscriptions | 🔲 |
| 7.14 | Monthly P&L report | Revenue vs expenses | 🔲 |
| 7.15 | Revenue forecasting | Based on pipeline + close rates | 🔲 |
| 7.16 | Scenario modeling | "If we close 3 deals, revenue = $X" | 🔲 |
| 7.17 | Upsell suggestions | Based on client performance data | 🔲 |

---

## 8. SETTINGS (10 Tabs)

### General

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.1 | Edit company name/website/industry/timezone | Saves changes | 🔲 |
| 8.2 | Logo upload | Upload and display new logo | 🔲 |
| 8.3 | Brand colors visible | Primary, Background, Text, Accent palette | 🔲 |
| 8.4 | Brand voice config | Tone, terminology, forbidden words, content rules | 🔲 |

### AI Modes

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.5 | Global AI Mode switch | Toggle between AI Autonomous / Hybrid / Human Controlled | 🔲 |
| 8.6 | Per-section overrides | Each section can inherit global or use custom mode | 🔲 |
| 8.7 | Mode change affects all pages | Switching mode changes banners/buttons across app | 🔲 |

### Wallet

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.8 | Balance overview | Current Balance, Monthly Spending, Monthly Budget | 🔲 |
| 8.9 | Budget pools | Standard, Premium, Creative, System categories | 🔲 |
| 8.10 | Spending controls | Auto-pause toggle, threshold alerts, max charge per agent | 🔲 |
| 8.11 | "Fund Wallet" button | Add funds flow | 🔲 |
| 8.12 | Usage history | Past transactions visible | 🔲 |

### Users & Roles

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.13 | Team members list | Shows users with roles | 🔲 |
| 8.14 | "Invite User" button | Add new team member | 🔲 |
| 8.15 | Change role | Dropdown to change: Super Admin / Admin / Manager / Viewer | 🔲 |
| 8.16 | Role permissions enforced | Viewer = read-only; Manager = assigned sections only | 🔲 |

### Channels

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.17 | Channel list with status | Email, LinkedIn, Facebook, X, YouTube, Slack — Connected/Not Connected | 🔲 |
| 8.18 | Connect/disconnect buttons | Toggle channel connections | 🔲 |
| 8.19 | Anti-spam protection | Toggleable rules: daily send limits, randomized cool-down | 🔲 |

### Integrations

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.20 | Integration cards | GHL, HubSpot, Hunter.io, Zoom, Google Analytics, Stripe | 🔲 |
| 8.21 | Connect/configure/test per integration | Each has setup flow | 🔲 |
| 8.22 | GHL sub-account setup | Configure partner pipeline sync | 🔲 |

### API Keys

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.23 | Key input fields | Claude, OpenAI, Runway ML, ElevenLabs, Hunter.io | 🔲 |
| 8.24 | Cost analysis display | Estimated monthly cost based on configured services | 🔲 |

### Legal & Compliance

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.25 | Compliance toggles | CAN-SPAM, GDPR, TCPA, Platform Rate Limits on/off | 🔲 |
| 8.26 | Anti-spam monitoring | Email warm-up, bounce rate, domain reputation status | 🔲 |
| 8.27 | Contract templates | NDA, Terms of Service, DPA, SLA — view/edit | 🔲 |
| 8.28 | Opt-out management | Stats + master opt-out list | 🔲 |

### Notifications

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.29 | Notification categories | Pipeline, Outreach, Production, Finance, System | 🔲 |
| 8.30 | Per-category toggles | In-App / Email / Slack per category | 🔲 |

### System Health

| # | Test | Expected | Status |
|---|------|----------|--------|
| 8.31 | System status overview | Overall status, active agents, API calls, DB health | 🔲 |
| 8.32 | Agent status list | Each of 32 agents: status, last run, total calls | 🔲 |
| 8.33 | API health monitor | Latency + uptime for Anthropic, OpenAI, etc. | 🔲 |
| 8.34 | Database stats | Live counts: Leads, Contacts, Assets | 🔲 |
| 8.35 | "Run Health Check" button | Triggers system-wide health check | 🔲 |

---

## 9. CROSS-CUTTING FEATURES

### AI Mode Behavior (Test in ALL 3 modes)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 9.1 | AI Autonomous mode | No banner; all AI buttons visible; agents can run automatically | 🔲 |
| 9.2 | Hybrid mode | Yellow banner; AI/Human/Review badges; high-confidence auto-execute, low-confidence queued | 🔲 |
| 9.3 | Human Controlled mode | Blue banner; collapsible Workflow Guide; some AI buttons hidden | 🔲 |
| 9.4 | Mode persists across pages | After switching, all sections reflect the new mode | 🔲 |
| 9.5 | Per-section override | Override one section to different mode; others stay global | 🔲 |

### Wallet / Budget (Dummy Mode)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 9.6 | Wallet stays at $355.02 | Dummy mode keeps balance static | 🔲 |
| 9.7 | Wallet display in header | Shows balance at all times | 🔲 |
| 9.8 | AI calls deduct (or simulate deduction) | Each AI action shows cost | 🔲 |

### Button-to-Button Flow (End-to-End)

| # | Test | Expected | Status |
|---|------|----------|--------|
| 9.9 | Find Prospects → Plan Approach → Draft Messages → Send → Follow-up → Move to CRM | Full Outreach chain works | 🔲 |
| 9.10 | Lead in CRM → Score → Set Meeting → Prep Call → Upload Transcript → Create Proposal → Send → Mark Won | Full CRM chain works | 🔲 |
| 9.11 | Mark Won → Start Onboarding → Run Audit → Create Content → Quality Review → Publish | Full Production chain works | 🔲 |
| 9.12 | Create Invoice → Send → Track Payment → Revenue Dashboard | Finance chain works | 🔲 |
| 9.13 | No dead-end buttons | Every button leads to a next action or clear result | 🔲 |

### Content Standards

| # | Test | Expected | Status |
|---|------|----------|--------|
| 9.14 | AI output uses human tone | No AI-sounding fluff in any generated content | 🔲 |
| 9.15 | Forbidden words not present | No "leverage", "synergy", "cutting-edge", "game-changing" | 🔲 |
| 9.16 | Industry terms used correctly | NIST, SOC 2, SIEM, EDR, MDR, XDR used naturally | 🔲 |

---

## 10. ERROR HANDLING & EDGE CASES

| # | Test | Expected | Status |
|---|------|----------|--------|
| 10.1 | AI call with empty input | Shows validation error, not crash | 🔲 |
| 10.2 | AI call timeout | Shows error toast, not infinite spinner | 🔲 |
| 10.3 | Double-click prevention | Buttons disabled after first click during loading | 🔲 |
| 10.4 | Network error during save | Toast notification, data not lost | 🔲 |
| 10.5 | Refresh page mid-flow | State preserved or gracefully recovered | 🔲 |
| 10.6 | Empty states | All lists/tables show meaningful "no data" message when empty | 🔲 |
| 10.7 | Long AI responses | Content doesn't overflow containers | 🔲 |

---

## TOTAL TEST ITEMS: ~170+

### Priority Order for Testing:
1. **Login & Global Layout** (Section 0) — foundational
2. **AI Mode switching** (Section 9.1-9.5) — affects everything
3. **Outreach full flow** (Section 2) — revenue engine
4. **CRM full flow** (Section 3) — deal pipeline
5. **Production interactive features** (Section 5) — client delivery
6. **Marketing** (Section 4) — growth
7. **Finance** (Section 7) — billing
8. **Admin** (Section 6) — operations
9. **Settings** (Section 8) — configuration
10. **End-to-end chains** (Section 9.9-9.12) — the ultimate test
11. **Error handling** (Section 10) — resilience

---

*Generated from PMG OS Blueprint v2 + v3 | Last updated: Session 5*
