# PMG GROUP OS — Complete Testing & Verification Checklist v2
### Based on Blueprint v2 + v3 | 6 Sections · 32 Agents · 3 AI Modes · 10 Settings Tabs
### 250+ Test Items — Full Deep Verification

---

## HOW TO USE THIS CHECKLIST

**Login:** `shershah_nawabi@pmggroup-llc.com` / `PMGAdmin2024!`

For every item below:
- ✅ = Works as expected
- ⚠️ = Partially works / cosmetic issue
- ❌ = Broken / missing / does nothing
- 🔲 = Not yet tested

**Test each item in all 3 AI modes** (change in Settings → AI Modes):
- **AI Autonomous** — No banner; all AI buttons visible; agents run automatically
- **Hybrid** — Yellow banner; AI/Human/Review badges on items; confidence-based auto/queue
- **Human Controlled** — Blue banner; collapsible Workflow Guide; some AI buttons hidden

**Dummy Mode Notice:** The system runs in dummy/demo mode. All AI endpoint calls return 403. Every mutation button uses `onError` fallback with realistic hardcoded toast messages. Wallet balance stays static. All data is seeded/hardcoded.

---

## SECTION 0: LOGIN & AUTHENTICATION

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 0.1 | Navigate to app root URL | Login page loads without errors | 🔲 |
| 0.2 | Login page shows email + password fields | Both input fields visible and accessible | 🔲 |
| 0.3 | Login page has PMG branding | Logo or "PMG Group" text visible on login | 🔲 |
| 0.4 | Submit empty login form | Validation error shown, no crash | 🔲 |
| 0.5 | Submit wrong email | Error toast or inline error shown | 🔲 |
| 0.6 | Submit wrong password | Error toast or inline error shown | 🔲 |
| 0.7 | Login with valid credentials | Redirects to Dashboard (Command Center) | 🔲 |
| 0.8 | Session persists on page refresh | After login, refreshing does not redirect to login | 🔲 |
| 0.9 | Logout button in sidebar | Clicking logs out and redirects to login | 🔲 |
| 0.10 | Unauthorized API call (logged out) | Returns 401, redirects to login | 🔲 |

---

## SECTION 1: GLOBAL LAYOUT & NAVIGATION

### 1A: Sidebar Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 1.1 | Sidebar renders after login | Sidebar visible on left side | 🔲 |
| 1.2 | Sidebar shows Dashboard link | "Command Center" with LayoutDashboard icon | 🔲 |
| 1.3 | Sidebar shows 6 main sections | Outreach, CRM, Marketing, Production, Admin, Finance | 🔲 |
| 1.4 | Sidebar shows Settings link | Settings gear icon at bottom | 🔲 |
| 1.5 | Sidebar section grouping labels | "Revenue Engine" (Outreach, CRM), "Growth" (Marketing, Production), "Operations" (Admin, Finance) | 🔲 |
| 1.6 | Sidebar collapse/expand toggle | Chevron button collapses sidebar to icon-only mode | 🔲 |
| 1.7 | Collapsed sidebar shows icons only | Section labels hidden, only icons visible | 🔲 |
| 1.8 | Active page highlighted in sidebar | Current page link has distinct styling (border, background) | 🔲 |
| 1.9 | Click each sidebar link | Each navigates to correct page without error | 🔲 |
| 1.10 | Sidebar mobile behavior | On small screens, sidebar becomes hamburger menu (Sheet) | 🔲 |
| 1.11 | Mobile sidebar opens/closes | Sheet opens on hamburger click, closes on selection | 🔲 |
| 1.12 | Logout button visible in sidebar | LogOut icon + "Logout" text at bottom of sidebar | 🔲 |

### 1B: Top Header Bar

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 1.13 | Global Search bar visible | Search input with icon in top header | 🔲 |
| 1.14 | Global Search opens overlay | Clicking search opens search results overlay | 🔲 |
| 1.15 | Global Search returns results | Typing a query returns matching items across sections | 🔲 |
| 1.16 | Notification Bell visible | Bell icon with unread count badge | 🔲 |
| 1.17 | Notification Bell dropdown | Clicking shows dropdown with recent notifications | 🔲 |
| 1.18 | Notification items display | Each notification shows title, description, timestamp | 🔲 |
| 1.19 | "Mark as Read" on notification | Individual notification can be marked read | 🔲 |
| 1.20 | "Mark All Read" button | Clears all unread notification badges | 🔲 |
| 1.21 | Unread count updates | Badge count decreases when notifications are read | 🔲 |
| 1.22 | Wallet Display visible | Shows current wallet balance in header | 🔲 |
| 1.23 | Wallet balance value | Shows dollar amount (e.g., $355.02 or $360.29) | 🔲 |
| 1.24 | AI Mode Toggle visible | Mode indicator in header with current mode label | 🔲 |
| 1.25 | AI Mode Toggle clickable | Clicking opens mode selection dropdown/dialog | 🔲 |
| 1.26 | AI Mode switch from header | Can switch between AI Auto / Hybrid / Human from header | 🔲 |

### 1C: Video Guide System

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 1.27 | [?] button visible per section | Help/guide button shown near each sidebar section | 🔲 |
| 1.28 | Clicking [?] opens guide overlay | Video/walkthrough overlay opens with steps | 🔲 |
| 1.29 | Guide overlay shows step content | Each step: heading, description, visual mockup | 🔲 |
| 1.30 | Guide step navigation | Can navigate forward/backward through steps | 🔲 |
| 1.31 | Guide has play/pause controls | Video playback controls (Play, Pause, Skip) | 🔲 |
| 1.32 | Guide close button | X button closes overlay and returns to page | 🔲 |
| 1.33 | Guide content matches section | Outreach guide shows outreach steps, CRM shows CRM steps, etc. | 🔲 |
| 1.34 | Guide available for all sections | Outreach, CRM, Marketing, Production, Admin, Finance all have guides | 🔲 |

### 1D: Mode Indicator Banner

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 1.35 | AI Autonomous mode — no banner or red banner | No mode restriction banner (AI handles everything) | 🔲 |
| 1.36 | Hybrid mode — yellow/blue banner | Banner indicates "Hybrid Mode — AI prepares, you review" | 🔲 |
| 1.37 | Human mode — blue banner | Banner indicates "Manual Control — AI standby" | 🔲 |
| 1.38 | Banner visible on every page | Mode banner appears on Dashboard, Outreach, CRM, etc. | 🔲 |
| 1.39 | Banner disappears when switching to Auto | Switching to AI Autonomous removes banner or changes it | 🔲 |

---

## SECTION 2: DASHBOARD (Command Center)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 2.1 | Dashboard loads without errors | No console errors, no blank screen | 🔲 |
| 2.2 | Page title "Command Center" | Header shows "Command Center" with subtitle | 🔲 |
| 2.3 | Mode badge in header | Shows current AI mode (AI Autonomous / Hybrid / Manual) | 🔲 |
| 2.4 | KPI Card: Total Leads | Shows count of leads from API | 🔲 |
| 2.5 | KPI Card: Qualified | Shows count of qualified leads | 🔲 |
| 2.6 | KPI Card: Active Deals | Shows active (non-closed) opportunities | 🔲 |
| 2.7 | KPI Card: Won Deals | Shows closed_won opportunity count | 🔲 |
| 2.8 | KPI Card: Revenue | Shows total revenue from won deals (formatted $Xk) | 🔲 |
| 2.9 | KPI Card: Pending Tasks | Shows incomplete task count | 🔲 |
| 2.10 | Quick Actions section visible | Shows 4 action buttons in grid | 🔲 |
| 2.11 | Quick Actions — AI Auto mode | "Find Prospects", "View Pipeline", "Create Content", "Open Settings" | 🔲 |
| 2.12 | Quick Actions — Human mode | "Enter Prospects Manually" replaces "Find Prospects" | 🔲 |
| 2.13 | Quick Action clicks navigate | Each button links to correct page (outreach, crm, production, settings) | 🔲 |
| 2.14 | Quick Actions hover animation | Cards scale on hover (framer-motion) | 🔲 |
| 2.15 | Pipeline Summary card | Shows pipeline stage breakdown with progress bars | 🔲 |
| 2.16 | Pipeline stages listed | New Lead, Meeting Set, Discovery, Proposal, Negotiation, Won | 🔲 |
| 2.17 | Pipeline bar widths | Bar widths proportional to deal count per stage | 🔲 |
| 2.18 | Pipeline animated bars | Bars animate in on load (framer-motion) | 🔲 |
| 2.19 | Top 3 deals shown | Up to 3 deals listed below pipeline bars | 🔲 |
| 2.20 | Deal cards show name + stage + value | Each deal card: title, stage label, dollar amount | 🔲 |
| 2.21 | Deal cards clickable | Clicking a deal navigates to /crm | 🔲 |
| 2.22 | Deal mode badges — AI Auto | "Auto-Advanced" badge on deals | 🔲 |
| 2.23 | Deal mode badges — Hybrid | "Review Required" badge | 🔲 |
| 2.24 | Deal mode badges — Human | Stage name as badge | 🔲 |
| 2.25 | "View All" link to CRM | Pipeline card has "View All" button linking to /crm | 🔲 |
| 2.26 | Empty pipeline state | If no deals: "No deals in pipeline yet" message + "Start Prospecting" button | 🔲 |
| 2.27 | Recent Leads card | Shows up to 5 recent leads | 🔲 |
| 2.28 | Lead items show name + company | Each lead: first/last name, company name | 🔲 |
| 2.29 | Lead mode badges — AI Auto | "AI Routed" badge on leads | 🔲 |
| 2.30 | Lead mode badges — Hybrid | "Needs Review" or "Reviewed" badge | 🔲 |
| 2.31 | Lead mode badges — Human | Status name as badge | 🔲 |
| 2.32 | Lead AI annotation — AI Auto | "All leads auto-scored and routed by AI" text | 🔲 |
| 2.33 | Lead AI annotation — Hybrid | "AI scored — your approval needed" text | 🔲 |
| 2.34 | Lead AI annotation — Human | "Manual tracking — no AI processing" text | 🔲 |
| 2.35 | Lead items clickable | Clicking leads navigates to /outreach | 🔲 |
| 2.36 | "View All" link to Outreach | Recent Leads has "View All" button linking to /outreach | 🔲 |
| 2.37 | Empty leads state | If no leads: "No leads yet — start with Outreach" message | 🔲 |
| 2.38 | System Status card | Shows 6 module status indicators | 🔲 |
| 2.39 | System modules listed | AI Engine, Wallet, Outreach, CRM, Marketing, Production | 🔲 |
| 2.40 | Module status dots | Green (active), pulsing (autonomous/hybrid), yellow (standby) | 🔲 |
| 2.41 | Module status detail text — AI Auto | AI-specific descriptions (e.g., "Full auto — all agents active") | 🔲 |
| 2.42 | Module status detail text — Hybrid | Hybrid descriptions (e.g., "AI + human review") | 🔲 |
| 2.43 | Module status detail text — Human | Manual descriptions (e.g., "Manual only — AI standby") | 🔲 |
| 2.44 | Dashboard responsive layout | Cards reflow on smaller screens (grid cols reduce) | 🔲 |

---

## SECTION 3: OUTREACH (6 Tabs / 6 Agents)

### 3A: Tab Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 3.1 | Outreach page loads | No errors, tab bar visible | 🔲 |
| 3.2 | 6 tabs visible | Prospect Finder, Social Command, Strategy, Compose, Follow-ups, Analytics | 🔲 |
| 3.3 | Default tab selected | Prospect Finder selected on load | 🔲 |
| 3.4 | Clicking each tab | Content switches without errors | 🔲 |
| 3.5 | Active tab styling | Selected tab has distinct border/highlight | 🔲 |
| 3.6 | Tab animation | Content fades/slides in on tab switch (framer-motion) | 🔲 |

### 3B: Prospect Finder (Agent 1)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 3.7 | "Find Prospects" button visible (AI Auto/Hybrid) | AI button shown when not in Human mode | 🔲 |
| 3.8 | "Find Prospects" button hidden (Human) | Button hidden or replaced in Human mode | 🔲 |
| 3.9 | Click "Find Prospects" | Loading state → toast with results (or fallback toast on error) | 🔲 |
| 3.10 | Prospect cards display | Each card: company name, fit score, accessibility score | 🔲 |
| 3.11 | Prospect cards show contact info | Company contact details visible | 🔲 |
| 3.12 | "Plan Approach" button per prospect | Triggers strategy generation → toast | 🔲 |
| 3.13 | "Save as Lead" button per prospect | Saves prospect to CRM → toast confirmation | 🔲 |
| 3.14 | "Save All to CRM" bulk button | Saves all prospects; individual buttons sync to "Saved" state | 🔲 |
| 3.15 | Loading spinners during AI calls | Spinner/loading indicator during processing | 🔲 |
| 3.16 | Error handling toast | If AI call fails, toast notification shows (not a crash) | 🔲 |
| 3.17 | "Create Lead" manual form | Manual entry form for adding a lead (available in Human mode) | 🔲 |

### 3C: Social Command Center (Agent 2)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 3.18 | Unified inbox view loads | Shows messages from all connected channels | 🔲 |
| 3.19 | Message classification labels | Hot Lead 🔥 / Warm 🟡 / Cold ❄️ / Spam 🚫 labels | 🔲 |
| 3.20 | AI-prepared response drafts | Draft visible for each incoming message | 🔲 |
| 3.21 | "Send" button per message | Marks message as sent → toast confirmation | 🔲 |
| 3.22 | "Move to CRM" button | Appears on positive responses → creates lead → toast | 🔲 |
| 3.23 | Channel performance stats | Shows which channel brings most leads | 🔲 |
| 3.24 | Channel icons (LinkedIn, Email, Facebook) | Correct icons displayed per channel message | 🔲 |

### 3D: Strategy (Agent 3)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 3.25 | Strategy cards display | Multi-channel sequence plan (Day 1, Day 3, etc.) | 🔲 |
| 3.26 | Decision chain mapping | Shows contact sequence: CEO → CTO → Marketing Director | 🔲 |
| 3.27 | "Draft Messages" button on strategy | Triggers message composition → toast | 🔲 |
| 3.28 | Strategy gated in Human mode | AI strategy buttons hidden or labeled differently | 🔲 |

### 3E: Compose (Agent 4)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 3.29 | Personalized message drafts display | AI-written messages shown per channel | 🔲 |
| 3.30 | Messages reference prospect details | Company name, pain points mentioned (not generic) | 🔲 |
| 3.31 | "Review & Send" buttons per message | Each message has send action → toast | 🔲 |
| 3.32 | Tone adaptation by role | C-Suite = strategic, IT Directors = technical, Marketing = results | 🔲 |
| 3.33 | No forbidden words in output | No "leverage", "synergy", "cutting-edge", "game-changing" | 🔲 |
| 3.34 | Channel-specific formatting | LinkedIn DM vs Email vs Call Script formatted differently | 🔲 |

### 3F: Follow-ups (Agent 5)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 3.35 | Follow-up reminders list | Shows upcoming follow-ups with timing | 🔲 |
| 3.36 | "Send Follow-up" button | Drafts follow-up referencing previous touchpoints → toast | 🔲 |
| 3.37 | Escalation logic visible | After 3 LinkedIn → suggests email → then phone | 🔲 |
| 3.38 | Signal detection display | Profile views, email opens shown as warm signals | 🔲 |
| 3.39 | "Move to CRM" button | Appears when prospect responds positively → toast | 🔲 |
| 3.40 | Follow-up status tracking | Sent, Pending, Scheduled, Overdue statuses shown | 🔲 |

### 3G: Analytics (Agent 6)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 3.41 | Outreach metrics dashboard | Reply rates, open rates, acceptance rates per channel | 🔲 |
| 3.42 | Winner/loser identification | Insights like "Case study email: 34% reply vs 8% for intro" | 🔲 |
| 3.43 | Team tracking stats | Who sent what, conversion rates per person | 🔲 |
| 3.44 | Weekly report summary | Clear actions: "Increase LinkedIn, reduce cold email" | 🔲 |
| 3.45 | "Apply Recommendation" buttons | Clicking updates strategy → toast | 🔲 |
| 3.46 | Chart/graph rendering | Visual charts render without overflow or errors | 🔲 |

---

## SECTION 4: CRM (5 Tabs / 5 Agents)

### 4A: Tab Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 4.1 | CRM page loads | No errors, tab bar visible | 🔲 |
| 4.2 | 5 tabs visible | Pipeline, Lead Qualification, Call Intelligence, Proposals, CRM Sync | 🔲 |
| 4.3 | Default tab selected | Pipeline selected on load | 🔲 |
| 4.4 | Clicking each tab | Content switches without errors | 🔲 |

### 4B: Pipeline (Agent 8 — Deal Intelligence)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 4.5 | Pipeline view loads | Visual pipeline with stages | 🔲 |
| 4.6 | Pipeline stages shown | New Lead → Meeting Set → Discovery → Proposal → Negotiation → Won/Lost | 🔲 |
| 4.7 | Deal cards render | Cards in each column with deal name, company, value | 🔲 |
| 4.8 | Deal health indicators | 🟢 Healthy / 🟡 Stale / 🔴 At Risk per deal | 🔲 |
| 4.9 | AI Pipeline Review (Sparkle button) | Click triggers AI analysis → toast with insights | 🔲 |
| 4.10 | AI Pipeline Review gated in Human mode | Button hidden when in Human mode | 🔲 |
| 4.11 | Deal detail panel | Clicking a deal opens detail drawer/panel | 🔲 |
| 4.12 | Deal detail shows notes | Contact notes, activity history visible | 🔲 |
| 4.13 | Deal stage progression | Can change deal stage from detail panel | 🔲 |
| 4.14 | Risk detection alerts | Warning badges: "champion silent", "competitor mentioned" | 🔲 |
| 4.15 | Next step recommendations | Specific: "Send ROI calculator to Sarah by Thursday" | 🔲 |
| 4.16 | "Create Proposal" button on deal | Triggers proposal generation → toast | 🔲 |
| 4.17 | "Mark Won" button | Changes stage to closed_won, shows success toast | 🔲 |
| 4.18 | "Mark Lost" button | Changes stage to closed_lost, records reason | 🔲 |
| 4.19 | Pipeline total value display | Shows total pipeline dollar value | 🔲 |

### 4C: Lead Qualification (Agent 7)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 4.20 | Lead scoring display | 5 dimensions: Fit, Need, Budget, Timing, Authority with weights | 🔲 |
| 4.21 | Score weights shown | Fit (30%), Need (25%), Budget (20%), Timing (15%), Authority (10%) | 🔲 |
| 4.22 | Category labels | 🔥 Hot (80+) / 🟡 Warm (50-79) / ❄️ Cold (20-49) / 🚫 Disqualified (<20) | 🔲 |
| 4.23 | Score reasoning visible | Explanation why each score was assigned | 🔲 |
| 4.24 | "Set Meeting" button on hot leads | Triggers meeting prep → toast | 🔲 |
| 4.25 | Warm leads → nurture flow | Shows "Continue Follow-up" or routes to Agent 5 | 🔲 |
| 4.26 | Lead list sortable/filterable | Can sort by score, filter by category | 🔲 |

### 4D: Call Intelligence (Agent 9)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 4.27 | Pre-call briefing generates | "Prep for Meeting" creates full briefing → toast | 🔲 |
| 4.28 | Briefing content | Who they are, pain points, talking points, company research | 🔲 |
| 4.29 | Coaching cards displayed | "If they say X, respond with Y" format | 🔲 |
| 4.30 | Objection handling scripts | Budget, already-have-agency, send-me-info responses | 🔲 |
| 4.31 | "Upload Transcript" button | Upload Zoom transcript for AI analysis | 🔲 |
| 4.32 | Post-call analysis | Sentiment, decisions, action items, deal score | 🔲 |
| 4.33 | Follow-up email draft | Auto-drafted email after transcript analysis | 🔲 |
| 4.34 | "Send Follow-up" button | Sends drafted email → toast | 🔲 |
| 4.35 | Call Intelligence gated in Human mode | AI features hidden or limited | 🔲 |

### 4E: Proposals (Agent 10)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 4.36 | "Create Proposal" generates proposal | Customized with scope, timeline, pricing → toast | 🔲 |
| 4.37 | Pricing tiers displayed | Starter ($2,500) / Growth ($5,000) / Enterprise ($10,000) | 🔲 |
| 4.38 | Proposal preview | Full preview visible before sending | 🔲 |
| 4.39 | "Send Proposal" button | Marks as sent → toast | 🔲 |
| 4.40 | Proposal status tracking | Sent → Viewed → Under Review → Accepted → Rejected | 🔲 |
| 4.41 | "Generate Contract" button | Appears after proposal accepted → toast | 🔲 |
| 4.42 | Renewal alerts | 60-day alerts before contract expiration | 🔲 |

### 4F: CRM Sync (Agent 11)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 4.43 | GHL sync status displayed | Shows connection status to GoHighLevel | 🔲 |
| 4.44 | HubSpot sync status displayed | Shows connection status | 🔲 |
| 4.45 | "Partner Close" flag on deals | Flag deal → auto-pushes to GHL sub-account | 🔲 |
| 4.46 | Bidirectional sync indicator | Changes in either system update the other | 🔲 |
| 4.47 | Sync error queue | Failed syncs shown with retry option | 🔲 |
| 4.48 | "View in GHL" link | Button present (may not open external in demo) | 🔲 |
| 4.49 | Last sync timestamp | Shows "Last sync: X min ago" | 🔲 |

---

## SECTION 5: MARKETING (5 Tabs / 5 Agents)

### 5A: Tab Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 5.1 | Marketing page loads | No errors, tab bar visible | 🔲 |
| 5.2 | 5 tabs visible | Content Strategy, Campaigns, SEO & Growth, Orchestrator, Competitor Intel | 🔲 |
| 5.3 | Default tab selected | Content Strategy on load | 🔲 |
| 5.4 | Clicking each tab | Content switches without errors | 🔲 |

### 5B: Content Strategy (Agent 12)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 5.5 | Content calendar view | Shows planned content across channels | 🔲 |
| 5.6 | Channel breakdown | LinkedIn (3/wk), Facebook/IG (5/wk), Blog (2/mo), X (daily), YouTube (2/mo) | 🔲 |
| 5.7 | "Create Content" / "AI Content Plan" button | Opens content creation flow or generates plan → toast | 🔲 |
| 5.8 | Content preview | Generated content shown with preview | 🔲 |
| 5.9 | "Write" / AI generate button per content | AI drafts content for specific item → toast | 🔲 |
| 5.10 | Content status flow | Draft → Review → Approved → Published visible | 🔲 |
| 5.11 | "Publish" button per content | Changes status to Published → toast | 🔲 |
| 5.12 | Content repurposing indicators | 1 blog → LinkedIn + social posts + email + video suggestion | 🔲 |
| 5.13 | Content generation gated in Human mode | AI creation buttons hidden | 🔲 |

### 5C: Campaigns (Agent 13)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 5.14 | "Create Campaign" button | Opens campaign builder → toast | 🔲 |
| 5.15 | Campaign targets | Facebook / LinkedIn / Google / YouTube options | 🔲 |
| 5.16 | Campaign package display | Copy, targeting, budget, schedule, A/B variations | 🔲 |
| 5.17 | "Review" → "Launch" flow | Manual launch only (never auto-publishes) | 🔲 |
| 5.18 | Performance tracking metrics | Cost per lead, cost per meeting, ROAS per platform | 🔲 |
| 5.19 | Budget awareness | Shows budget limits ($600 campaign budget) | 🔲 |
| 5.20 | Campaign list with statuses | Active / Paused / Draft campaigns listed | 🔲 |

### 5D: SEO & Growth (Agent 14)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 5.21 | "Run SEO Audit" button | Generates website audit report → toast | 🔲 |
| 5.22 | SEO audit scores display | Visual scores for website performance areas | 🔲 |
| 5.23 | Keyword research results | Keywords with intent + competition levels | 🔲 |
| 5.24 | Ranked fixes list | Specific tasks ordered by impact | 🔲 |
| 5.25 | "Create Content" per keyword gap | Each gap has button to trigger content creation → toast | 🔲 |
| 5.26 | Ranking/traffic tracking | Position and organic traffic trends | 🔲 |
| 5.27 | SEO audit gated in Human mode | AI audit button hidden | 🔲 |

### 5E: Orchestrator (Agent 15)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 5.28 | "Plan Campaign" button | Creates multi-channel coordinated plan → toast | 🔲 |
| 5.29 | Timeline view | Week 1 awareness → Week 2 engagement → Week 3 conversion | 🔲 |
| 5.30 | Full journey tracking | Impression → visit → form → lead → meeting → client | 🔲 |
| 5.31 | Weekly campaign report | Performance data with recommendations | 🔲 |

### 5F: Competitor Intel (Agent 16)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 5.32 | "Refresh Competitor Analysis" button | Runs competitor scan → toast | 🔲 |
| 5.33 | Competitive battle cards | Talking points against each competitor | 🔲 |
| 5.34 | Gap identification | "No competitor offers lead generation guarantees" | 🔲 |
| 5.35 | Competitor alerts | Notifications on competitor moves | 🔲 |
| 5.36 | Competitor analysis gated in Human mode | AI scan button hidden | 🔲 |

---

## SECTION 6: PRODUCTION (9 Tabs / 8 Agents)

### 6A: Tab Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.1 | Production page loads | No errors, no runtime crash | 🔲 |
| 6.2 | 9 tabs visible | Client Onboarding, Marketing Audit, Creative Production, Lead Generator, Campaigns & Funnels, Reporting, Integrations, Content Library, Quality Review | 🔲 |
| 6.3 | Default tab selected | Client Onboarding on load | 🔲 |
| 6.4 | Clicking each of 9 tabs | All switch without errors | 🔲 |
| 6.5 | Tab scroll behavior | Tabs scrollable if overflow on small screens | 🔲 |
| 6.6 | ModeIndicator visible | Mode badge in page header | 🔲 |

### 6B: Client Onboarding (Agent 17)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.7 | Onboarding checklist displayed | 7 steps shown | 🔲 |
| 6.8 | Steps listed | Brand assets, access, audience, services, goals, CRM, partner sync | 🔲 |
| 6.9 | "Complete Step" button per step | Advances progress → toast | 🔲 |
| 6.10 | Progress bar | Shows completion percentage | 🔲 |
| 6.11 | Completed steps visual | Checkmark or green highlight on completed steps | 🔲 |
| 6.12 | "Run Marketing Audit" button | Appears after all steps complete → toast | 🔲 |
| 6.13 | "Generate 90-Day Plan" button | AI creates success plan → toast | 🔲 |
| 6.14 | 90-Day Plan gated in Human mode | AI button hidden | 🔲 |

### 6C: Marketing Audit (Agent 18)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.15 | Audit report display | Website, social, ads, email, competitor analysis scores | 🔲 |
| 6.16 | Prioritized fix-it plan | Ranked by impact, not by ease | 🔲 |
| 6.17 | "Start Fix" or "Generate Fix Plan" buttons | Per priority → toast | 🔲 |
| 6.18 | Before/after comparison | Monthly progress tracking indicators | 🔲 |
| 6.19 | "Run Full Audit" AI button | Visible in AI Auto/Hybrid, hidden in Human mode | 🔲 |

### 6D: Creative Production (Agent 19)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.20 | Asset type selection | Click: Image, Video, Document, Branding — highlights selection | 🔲 |
| 6.21 | Selection state visual | Selected type has distinct highlight/border | 🔲 |
| 6.22 | Prompt textarea appears | After selecting type, description input shown | 🔲 |
| 6.23 | "Generate" button | Dispatches to correct AI hook → toast | 🔲 |
| 6.24 | Image format options | Proposals, Case Studies, White Papers, One-Pagers, Pitch Decks | 🔲 |
| 6.25 | ClipboardList icon (Pitch Decks) | Renders correctly without "Illegal constructor" error | 🔲 |
| 6.26 | Document generation result | Preview or description of generated content | 🔲 |
| 6.27 | Download buttons | Download in specified formats (PNG, MP4, PDF) → toast | 🔲 |
| 6.28 | "Approve" / "Publish" buttons | Moves content through pipeline → toast | 🔲 |
| 6.29 | Creative production gated in Human mode | AI generate button hidden | 🔲 |

### 6E: Lead Generator (Agent 20)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.30 | "Generate Leads" button | AI finds prospects for client → toast | 🔲 |
| 6.31 | "Generate Leads" gated in Human mode | Button hidden in manual mode | 🔲 |
| 6.32 | Lead list with quality scores | Each: company, contact, pain points, score (80+) | 🔲 |
| 6.33 | "Push to Client CRM" button | Triggers sync → toast | 🔲 |
| 6.34 | "Add to PMG Pipeline" button | Sends to CRM → toast | 🔲 |

### 6F: Campaigns & Funnels (Agent 21)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.35 | Campaign list with status | Active / Paused / Draft campaigns shown | 🔲 |
| 6.36 | "Launch" / "Pause" / "Resume" toggle | Changes campaign status → toast | 🔲 |
| 6.37 | "View Funnel" expands inline | Step-by-step: Ad → Landing → Form → Nurture → Call | 🔲 |
| 6.38 | Conversion rates per funnel step | Percentage at each stage | 🔲 |
| 6.39 | "Build Campaign" / "Build Funnel" buttons | Creates new campaign/funnel → toast | 🔲 |
| 6.40 | "AI Build Funnel" gated in Human mode | AI funnel button hidden | 🔲 |

### 6G: Reporting (Agent 22)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.41 | "Generate Report" / "Auto-Generate Report" button | Creates performance report → toast | 🔲 |
| 6.42 | Report generation gated in Human mode | AI auto-generate hidden | 🔲 |
| 6.43 | Executive format (1-page) | Top-line numbers for C-suite | 🔲 |
| 6.44 | Detailed format | Full data for marketing managers | 🔲 |
| 6.45 | ROI calculation shown | "$150K pipeline from $5K spend = 30x ROI" style | 🔲 |
| 6.46 | "Send to Client" button | Delivers report → toast | 🔲 |
| 6.47 | Progress vs "20 deals" promise | Tracks against core guarantee | 🔲 |
| 6.48 | PDF export / Download | Report downloadable → toast | 🔲 |

### 6H: Client CRM Sync / Integrations (Agent 23)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.49 | Sync status dashboard | Shows per-client sync health | 🔲 |
| 6.50 | GHL sub-account sync | Partner pipeline integration indicators | 🔲 |
| 6.51 | Error queue with retry | Failed syncs shown with retry option → toast | 🔲 |
| 6.52 | "View in GHL/HubSpot" links | External CRM links present | 🔲 |
| 6.53 | Last sync timestamp | Shows when last sync occurred | 🔲 |

### 6I: Content Library

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.54 | Content Library loads | Shows all created assets | 🔲 |
| 6.55 | Status filtering | Filter by: Draft / Review / Approved / Published | 🔲 |
| 6.56 | Type filtering | Filter by: Image / Video / Document / Branding | 🔲 |
| 6.57 | Preview per item | Click to preview content → toast or modal | 🔲 |
| 6.58 | Download per item | Download in available formats → toast | 🔲 |
| 6.59 | Empty state message | "No assets yet" if library empty | 🔲 |

### 6J: Quality Review (Agent 24)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 6.60 | Content items with quality scores | Ready to Publish / Needs Minor Edits / Needs Rewrite | 🔲 |
| 6.61 | Quality score color coding | Green (ready), yellow (minor edits), red (rewrite) | 🔲 |
| 6.62 | "Approve & Publish" button | Changes badge to green "Published" → toast | 🔲 |
| 6.63 | "Auto-Fix" button | AI fixes minor issues → toast | 🔲 |
| 6.64 | "Auto-Fix" gated in Human mode | Button hidden in manual mode | 🔲 |
| 6.65 | "Regenerate" button | Calls AI to create new version → toast | 🔲 |
| 6.66 | Human tone check indicator | Shows if content sounds AI-generated | 🔲 |
| 6.67 | Brand consistency check | Correct logos, colors, voice indicators | 🔲 |

---

## SECTION 7: ADMIN (4 Tabs / 4 Agents)

### 7A: Tab Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 7.1 | Admin page loads | No errors, tab bar visible | 🔲 |
| 7.2 | 4 tabs visible | Operations, Knowledge Base, Executive Briefing, System Evolution | 🔲 |
| 7.3 | Default tab selected | Operations on load | 🔲 |
| 7.4 | Clicking each tab | Content switches without errors | 🔲 |
| 7.5 | ModeIndicator visible | Mode badge in admin header | 🔲 |

### 7B: Operations (Agent 25)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 7.6 | Task dashboard loads | Shows task cards with assignments | 🔲 |
| 7.7 | Task count displayed | 12 tasks visible | 🔲 |
| 7.8 | Task cards show details | Title, assignee, priority, status per card | 🔲 |
| 7.9 | Task priority indicators | High / Medium / Low with color coding | 🔲 |
| 7.10 | "Mark Complete" button per task | Completes task → toast "Task Completed" | 🔲 |
| 7.11 | Completed task visual change | Completed tasks show checkmark or strikethrough | 🔲 |
| 7.12 | "Auto-Assign" AI button | Redistributes tasks → toast "Tasks Auto-Assigned" | 🔲 |
| 7.13 | "Auto-Assign" gated in Human mode | Button hidden in manual mode | 🔲 |
| 7.14 | "Add Task" button | Creates new task → toast "New Task" | 🔲 |
| 7.15 | Team member assignments shown | 3 team members: Shershah, AI Outreach, AI Content | 🔲 |
| 7.16 | Overdue task flagging | Overdue items highlighted distinctly | 🔲 |

### 7C: Knowledge Base (Agent 26)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 7.17 | Knowledge base loads | Shows 24 documents organized by category | 🔲 |
| 7.18 | Category chips/filters | Clickable category buttons to filter docs | 🔲 |
| 7.19 | Search field | Type query → filters documents | 🔲 |
| 7.20 | Click category → filters results | Only matching documents shown | 🔲 |
| 7.21 | Document cards display | Title, category, date per document | 🔲 |
| 7.22 | "View" button per document | Opens document → toast "Document Opened" | 🔲 |
| 7.23 | "Auto-Update" AI button | Updates knowledge base → toast "Knowledge Base Updated" | 🔲 |
| 7.24 | "Auto-Update" gated in Human mode | Button hidden in manual mode | 🔲 |
| 7.25 | Document count per category | Shows number of docs in each category | 🔲 |

### 7D: Executive Briefing (Agent 27)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 7.26 | Morning briefing loads | Displays executive briefing content | 🔲 |
| 7.27 | Urgent items section | 3 urgent items shown (e.g., "Invoice Overdue", "Contract Expiring") | 🔲 |
| 7.28 | Today's priorities section | 4 priorities listed | 🔲 |
| 7.29 | Recent wins section | 4 wins displayed | 🔲 |
| 7.30 | Key metrics display | 6 business metrics shown | 🔲 |
| 7.31 | "Go to" action buttons per item | Each urgent/priority item has action button → toast | 🔲 |
| 7.32 | "Regenerate Briefing" button | Refreshes briefing data → toast "Briefing Regenerated" | 🔲 |
| 7.33 | "Generate Morning Briefing" header button | Triggers generation → toast | 🔲 |
| 7.34 | Briefing generation gated in Human mode | AI generation buttons hidden | 🔲 |

### 7E: System Evolution (Agent 28)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 7.35 | "What's New" report loads | Shows tech updates and recommendations | 🔲 |
| 7.36 | 8 system evolution items | Technology updates displayed | 🔲 |
| 7.37 | "Approve" button per recommendation | Queues for implementation → toast | 🔲 |
| 7.38 | "Explore Later" button | Schedules for evaluation → toast | 🔲 |
| 7.39 | "Skip" button | Dismisses recommendation → toast | 🔲 |
| 7.40 | "Scan for Updates" AI button | Triggers scan → toast "Scan Complete" | 🔲 |
| 7.41 | "Scan for Updates" gated in Human mode | Button hidden in manual mode | 🔲 |
| 7.42 | Update impact/relevance indicators | Priority or impact level per update | 🔲 |

---

## SECTION 8: FINANCE (2 Tabs / 2 Agents)

### 8A: Tab Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 8.1 | Finance page loads | No errors, tab bar visible | 🔲 |
| 8.2 | 2 tabs visible | Billing & Revenue, Contracts & Expenses | 🔲 |
| 8.3 | Default tab selected | Billing & Revenue on load | 🔲 |
| 8.4 | Clicking each tab | Content switches without errors | 🔲 |
| 8.5 | ModeIndicator visible | Mode badge in finance header | 🔲 |
| 8.6 | Header "New Invoice" button | Clicking shows toast about creating invoice | 🔲 |

### 8B: Billing & Revenue (Agent 29)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 8.7 | Invoice list loads | 8 invoices displayed | 🔲 |
| 8.8 | Invoice details per row | ID, client, amount, status, date | 🔲 |
| 8.9 | Invoice status badges | Paid (green), Sent (blue), Overdue (red), Draft (gray) | 🔲 |
| 8.10 | MRR metric displayed | $17,500 Monthly Recurring Revenue | 🔲 |
| 8.11 | Revenue breakdown per client | Shows revenue attribution per client | 🔲 |
| 8.12 | "Send Invoice" button per invoice | Sends invoice → toast | 🔲 |
| 8.13 | "Send Reminder" button (overdue) | Sends payment reminder → toast | 🔲 |
| 8.14 | "View" button per invoice | Opens invoice preview → toast | 🔲 |
| 8.15 | "Download" button per invoice | Downloads PDF → toast | 🔲 |
| 8.16 | "Auto-Generate Monthly" AI button | Generates monthly invoices → toast | 🔲 |
| 8.17 | "Auto-Generate Monthly" gated in Human mode | Button hidden in manual mode | 🔲 |
| 8.18 | "Create Invoice" manual button | Shows "coming soon" or creation toast | 🔲 |
| 8.19 | Client profitability section | Revenue minus cost per client | 🔲 |

### 8C: Contracts & Expenses (Agent 30)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 8.20 | Contract list loads | 4 contracts displayed | 🔲 |
| 8.21 | Contract details | Client, package tier, monthly value, start/end dates | 🔲 |
| 8.22 | Contract expiring alert | 1 contract flagged as expiring soon | 🔲 |
| 8.23 | "Renew" button on expiring contract | Sends renewal proposal → toast | 🔲 |
| 8.24 | "View Contract" button | Opens contract details → toast | 🔲 |
| 8.25 | "Draft Contract" AI button | Drafts new contract → toast | 🔲 |
| 8.26 | "Draft Contract" gated in Human mode | Button hidden in manual mode | 🔲 |
| 8.27 | Expense tracking display | 4 categories: AI tools, advertising, software, team | 🔲 |
| 8.28 | Expense total | $516/mo total expenses | 🔲 |
| 8.29 | Monthly P&L report | Revenue vs expenses breakdown | 🔲 |
| 8.30 | Revenue forecasting | 4 scenarios displayed | 🔲 |
| 8.31 | Scenario modeling | "If we close X deals, revenue = $Y" | 🔲 |
| 8.32 | "Run Scenario Analysis" AI button | Calculates projections → toast | 🔲 |
| 8.33 | Upsell suggestions | Based on client performance data | 🔲 |

---

## SECTION 9: SETTINGS (10 Tabs)

### 9A: Tab Navigation

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.1 | Settings page loads | No errors, 10 tabs visible | 🔲 |
| 9.2 | All 10 tabs listed | General, AI Modes, Wallet, Users & Roles, Channels, Integrations, API Keys, Legal & Compliance, Notifications, System Health | 🔲 |
| 9.3 | Default tab selected | General on load | 🔲 |
| 9.4 | Clicking each tab | Content switches without errors | 🔲 |
| 9.5 | Tab icons render | Each tab has distinct icon | 🔲 |

### 9B: General Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.6 | Company logo placeholder | PMG shield logo displayed | 🔲 |
| 9.7 | "Upload Logo" button | Button present and clickable → action | 🔲 |
| 9.8 | Company Name field | Pre-filled "PMG Group LLC", editable | 🔲 |
| 9.9 | Website field | Pre-filled "https://pmggroup-llc.com", editable | 🔲 |
| 9.10 | Industry Focus field | "Cybersecurity & IT Services", read-only | 🔲 |
| 9.11 | Timezone dropdown | Select from EST, CST, MST, PST, UTC | 🔲 |
| 9.12 | Brand Identity colors | 4 color swatches: Primary (Crimson), Background (Navy), Text (White), Accent (Gold) | 🔲 |
| 9.13 | Color hex values | #DC2626, #0F172A, #F8FAFC, #F59E0B displayed | 🔲 |
| 9.14 | Font settings | Primary Font (Inter), Display Font (Clash Display) | 🔲 |
| 9.15 | Brand Voice section | Tone, Terminology, Forbidden Words, Content Rule | 🔲 |
| 9.16 | Forbidden words listed | "leverage, synergy, cutting-edge, game-changing, innovative" | 🔲 |
| 9.17 | "Save Changes" button | Premium-styled button at bottom | 🔲 |

### 9C: AI Modes Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.18 | 3 mode cards displayed | AI Autonomous, Hybrid, Manual Control | 🔲 |
| 9.19 | Mode card descriptions | Each explains behavior | 🔲 |
| 9.20 | Click to select mode | Clicking mode card activates it | 🔲 |
| 9.21 | Active mode has checkmark | CheckCircle2 icon on selected mode | 🔲 |
| 9.22 | Active mode has border highlight | Selected card has colored border | 🔲 |
| 9.23 | Mode switch affects globally | After switching, all pages reflect new mode | 🔲 |
| 9.24 | Per-Section Overrides section | 6 sections listed with dropdown each | 🔲 |
| 9.25 | Section override dropdown | Options: Inherit Global, AI Autonomous, Hybrid, Manual Control | 🔲 |
| 9.26 | "Inherit Global" shows current mode | Dropdown text shows "(Auto)" or "(Hybrid)" or "(Manual)" | 🔲 |
| 9.27 | Override persists per section | Changing one section doesn't affect others | 🔲 |

### 9D: Wallet Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.28 | Current Balance displayed | $360.29 shown prominently | 🔲 |
| 9.29 | This Month Spent | $89.71 displayed | 🔲 |
| 9.30 | Monthly Budget | $450.00 displayed | 🔲 |
| 9.31 | Budget Pools section | 4 pools: Standard, Premium, Creative, System | 🔲 |
| 9.32 | Pool progress bars | Visual bar showing spent/budget ratio | 🔲 |
| 9.33 | Pool agent labels | Each pool shows which agents use it | 🔲 |
| 9.34 | Spending Controls section | 3 controls listed | 🔲 |
| 9.35 | Auto-pause toggle | Switch for "pause when balance low" | 🔲 |
| 9.36 | Low balance threshold input | Number input, default $50 | 🔲 |
| 9.37 | Max charge per agent input | Number input, default $5 | 🔲 |
| 9.38 | Switch toggles work | Clicking switches changes their state | 🔲 |

### 9E: Users & Roles Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.39 | "Invite User" button visible | Premium-styled button in header | 🔲 |
| 9.40 | Current user card | "Sher Shah Nawabi" with email and "Super Admin" badge | 🔲 |
| 9.41 | User avatar initials | "SN" initials in gradient circle | 🔲 |
| 9.42 | Role definitions section | 4 roles listed | 🔲 |
| 9.43 | Role descriptions | Super Admin, Admin, Manager, Viewer with permissions | 🔲 |
| 9.44 | User count per role | "1 user" for Super Admin, "0 users" for others | 🔲 |

### 9F: Channels Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.45 | 6 channels listed | Email, LinkedIn, Facebook, X (Twitter), YouTube, Slack | 🔲 |
| 9.46 | Channel icons | Correct platform icon per channel | 🔲 |
| 9.47 | Connection status | "Not Connected" badge per channel | 🔲 |
| 9.48 | Channel descriptions | Description of what each channel does | 🔲 |
| 9.49 | "Connect" button per channel | Button present and clickable | 🔲 |
| 9.50 | Anti-Spam Protection section | 4 rules listed with switches | 🔲 |
| 9.51 | Anti-spam rules | Email 50/day, LinkedIn 25/day, Social 30/week, Cool-down 2-5min | 🔲 |
| 9.52 | Anti-spam toggles | All switches default ON, clickable | 🔲 |

### 9G: Integrations Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.53 | 6 integrations listed | GHL, HubSpot, Hunter.io, Zoom, Google Analytics, Stripe | 🔲 |
| 9.54 | Integration descriptions | Purpose of each integration | 🔲 |
| 9.55 | "Configure" button per integration | Button present and clickable | 🔲 |
| 9.56 | GHL sub-account mention | "main account + partner sub-account" in description | 🔲 |

### 9H: API Keys Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.57 | 6 API key services listed | Claude, OpenAI DALL-E 3, OpenAI GPT-4o, Runway ML, ElevenLabs, Hunter.io | 🔲 |
| 9.58 | Required/Optional badges | Claude, DALL-E 3, Hunter.io = Required; GPT-4o, Runway, ElevenLabs = Optional | 🔲 |
| 9.59 | Monthly cost estimates | ~$50, ~$25, ~$20, ~$20, ~$10, ~$49 per service | 🔲 |
| 9.60 | "Add Key" button per service | Button present and clickable | 🔲 |
| 9.61 | Estimated Monthly Cost card | Shows $300-$500 total estimate | 🔲 |
| 9.62 | Cost card styling | Gold accent with Zap icon | 🔲 |

### 9I: Legal & Compliance Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.63 | Communication Compliance section | 4 compliance rules | 🔲 |
| 9.64 | CAN-SPAM toggle | With description, switch enabled | 🔲 |
| 9.65 | GDPR toggle | With description, switch enabled | 🔲 |
| 9.66 | TCPA toggle | With description, switch enabled | 🔲 |
| 9.67 | Platform Rate Limits toggle | With description, switch enabled | 🔲 |
| 9.68 | Anti-Spam Monitoring section | Email warm-up, bounce rate, domain reputation | 🔲 |
| 9.69 | Contract Templates section | NDA, Terms of Service, DPA, SLA | 🔲 |
| 9.70 | Contract template buttons | "View" / "Edit" per template | 🔲 |
| 9.71 | Opt-Out Management section | Stats + master opt-out list | 🔲 |

### 9J: Notifications Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.72 | Notification categories | Pipeline, Outreach, Production, Finance, System | 🔲 |
| 9.73 | Per-category toggles | In-App / Email / Slack toggle per category | 🔲 |
| 9.74 | Toggles clickable | Switches change state | 🔲 |
| 9.75 | Default toggle states | All In-App toggles ON by default | 🔲 |

### 9K: System Health Tab

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 9.76 | System status overview | Overall system status shown | 🔲 |
| 9.77 | Active agents count | Number of active agents (out of 32) | 🔲 |
| 9.78 | API calls metric | Total API calls shown | 🔲 |
| 9.79 | Database health indicator | DB status (healthy/degraded) | 🔲 |
| 9.80 | Agent status list | Each of 32 agents with status | 🔲 |
| 9.81 | Per-agent details | Last run time, total calls per agent | 🔲 |
| 9.82 | API health monitor | Latency + uptime for AI services | 🔲 |
| 9.83 | Database stats | Live counts: Leads, Contacts, Assets | 🔲 |
| 9.84 | "Run Health Check" button | Triggers system health check → toast | 🔲 |
| 9.85 | Health indicators color | Green (healthy), yellow (degraded), red (down) | 🔲 |

---

## SECTION 10: AI MODE BEHAVIOR (Cross-Cutting)

### 10A: Mode Switching

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 10.1 | Switch to AI Autonomous via Settings | All pages reflect AI Auto mode | 🔲 |
| 10.2 | Switch to Hybrid via Settings | All pages reflect Hybrid mode | 🔲 |
| 10.3 | Switch to Human via Settings | All pages reflect Human mode | 🔲 |
| 10.4 | Switch via header toggle | Mode changes immediately across app | 🔲 |
| 10.5 | Mode persists on page navigation | Switching pages retains current mode | 🔲 |
| 10.6 | Mode persists on page refresh | Refreshing browser retains mode (API-backed) | 🔲 |

### 10B: AI Autonomous Mode Verification

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 10.7 | Dashboard — no restriction banner | No "human controlled" or "hybrid" banner | 🔲 |
| 10.8 | All AI buttons visible | Find Prospects, Generate Leads, Auto-Assign, etc. all showing | 🔲 |
| 10.9 | Bot icons visible | AI automation badges and icons shown | 🔲 |
| 10.10 | "AI Routed" / "Auto-Advanced" badges | Leads and deals show AI processing badges | 🔲 |

### 10C: Hybrid Mode Verification

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 10.11 | Banner indicates Hybrid mode | Yellow/blue banner on pages | 🔲 |
| 10.12 | AI buttons still visible | All AI action buttons accessible | 🔲 |
| 10.13 | "Needs Review" / "Review Required" badges | Items show review-needed status | 🔲 |
| 10.14 | Human approval indicators | Some items marked as needing human sign-off | 🔲 |

### 10D: Human Controlled Mode Verification

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 10.15 | Banner indicates Manual Control | Blue banner on pages | 🔲 |
| 10.16 | AI automation buttons HIDDEN | Find Prospects, Generate Leads, AI Build Funnel, Auto-Assign, Auto-Generate Monthly, Draft Contract, Scan for Updates, Auto-Update, Generate Morning Briefing — all hidden | 🔲 |
| 10.17 | Manual alternatives available | "Enter Prospects Manually" instead of "Find Prospects" | 🔲 |
| 10.18 | Context-specific AI helpers also hidden | Generate Fix Plan, Auto-Fix Quality — hidden | 🔲 |
| 10.19 | View/Read-only features still work | Viewing invoices, documents, contracts still available | 🔲 |
| 10.20 | Manual action buttons still work | "Mark Complete", "View", "Download" still clickable | 🔲 |

---

## SECTION 11: WALLET & BUDGET SYSTEM

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 11.1 | Wallet balance in header | Shows dollar amount at all times | 🔲 |
| 11.2 | Wallet balance stays static in dummy mode | Balance doesn't actually deduct | 🔲 |
| 11.3 | Wallet display across all pages | Visible on Dashboard, Outreach, CRM, Marketing, etc. | 🔲 |
| 11.4 | Wallet tab in Settings | Full wallet breakdown accessible | 🔲 |
| 11.5 | Budget pool visualization | 4 pools with progress bars | 🔲 |
| 11.6 | Spending controls functional | Auto-pause toggle, threshold input work | 🔲 |
| 11.7 | Transaction history | Past wallet transactions viewable | 🔲 |

---

## SECTION 12: BUTTON-TO-BUTTON FLOW (End-to-End Chains)

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 12.1 | Outreach full chain | Find Prospects → Plan Approach → Draft Messages → Send → Follow-up → Move to CRM — all buttons produce toasts | 🔲 |
| 12.2 | CRM full chain | Lead in CRM → Score → Set Meeting → Prep Call → Upload Transcript → Create Proposal → Send → Mark Won — all produce toasts | 🔲 |
| 12.3 | Production full chain | Mark Won → Start Onboarding → Run Audit → Create Content → Quality Review → Publish — all produce toasts | 🔲 |
| 12.4 | Finance chain | Create Invoice → Send → Track Payment → Revenue Dashboard — all produce toasts | 🔲 |
| 12.5 | Admin chain | Generate Briefing → Go to action → Complete Task — all produce toasts | 🔲 |
| 12.6 | No dead-end buttons | Every button leads to a next action, toast, or clear result | 🔲 |
| 12.7 | No "undefined" or "null" in toasts | All toast messages show meaningful content | 🔲 |
| 12.8 | No blank/empty toast messages | Every toast has title and description | 🔲 |

---

## SECTION 13: CONTENT & TERMINOLOGY STANDARDS

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 13.1 | No "leverage" in any UI text | Word not present in static or generated text | 🔲 |
| 13.2 | No "synergy" in any UI text | Word not present | 🔲 |
| 13.3 | No "cutting-edge" in any UI text | Word not present | 🔲 |
| 13.4 | No "game-changing" in any UI text | Word not present | 🔲 |
| 13.5 | No "innovative" in any UI text | Word not present | 🔲 |
| 13.6 | NIST referenced correctly | Used in industry context | 🔲 |
| 13.7 | SOC 2 referenced correctly | Used in compliance context | 🔲 |
| 13.8 | SIEM, EDR, MDR, XDR terminology | Used naturally in cybersecurity context | 🔲 |
| 13.9 | Pricing tiers consistent | Starter $2,500 / Growth $5,000 / Enterprise $10,000 everywhere | 🔲 |
| 13.10 | Sample client names consistent | SecureNet Solutions, CyberShield IT, DataVault MSP, Fortress Cybersecurity, ShieldOps Inc | 🔲 |
| 13.11 | "20 deals" promise visible | Core guarantee referenced in Production/Reporting | 🔲 |
| 13.12 | Human tone in all content | No AI-sounding fluff in any text | 🔲 |

---

## SECTION 14: ERROR HANDLING & EDGE CASES

### 14A: API Error Handling

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 14.1 | AI call with 403 response | Falls back to hardcoded toast, no crash | 🔲 |
| 14.2 | All mutation onError handlers | Every mutation has onError with realistic toast | 🔲 |
| 14.3 | Network timeout | Shows error toast, not infinite spinner | 🔲 |
| 14.4 | 401 unauthorized | Redirects to login page | 🔲 |
| 14.5 | API server down | Shows connection error, app doesn't crash | 🔲 |

### 14B: UI Edge Cases

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 14.6 | Double-click prevention on buttons | Buttons disabled during pending state | 🔲 |
| 14.7 | Empty input validation | Empty form submissions show validation errors | 🔲 |
| 14.8 | Page refresh mid-flow | State recovered or gracefully handled | 🔲 |
| 14.9 | Empty states for all lists | All lists show "no data" message when empty | 🔲 |
| 14.10 | Long text truncation | Long names/descriptions truncated with ellipsis | 🔲 |
| 14.11 | Content doesn't overflow containers | No horizontal scrollbar on content areas | 🔲 |
| 14.12 | Tab animation transitions | No flickering or jarring tab switches | 🔲 |

### 14C: Browser Compatibility

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 14.13 | Chrome rendering | All features work in Chrome | 🔲 |
| 14.14 | No console errors on load | Clean console (no red errors) on page load | 🔲 |
| 14.15 | No "Illegal constructor" errors | No native API conflicts (Clipboard fixed) | 🔲 |
| 14.16 | No React hook errors | No "Invalid hook call" errors | 🔲 |
| 14.17 | No import/module errors | All imports resolve correctly | 🔲 |

### 14D: Responsive Design

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 14.18 | Desktop layout (1280px+) | Full sidebar, multi-column grids | 🔲 |
| 14.19 | Tablet layout (~768px) | Sidebar collapses, grids reduce columns | 🔲 |
| 14.20 | Mobile layout (~375px) | Hamburger menu, single column, no overflow | 🔲 |
| 14.21 | Dashboard KPI cards responsive | 6 cards reflow from 6-col to 2-col | 🔲 |
| 14.22 | Settings tabs responsive | Tabs scrollable or wrap on mobile | 🔲 |
| 14.23 | Production tabs responsive | 9 tabs scrollable on small screens | 🔲 |

---

## SECTION 15: VISUAL DESIGN & POLISH

| # | Test | Expected Result | Status |
|---|------|----------------|--------|
| 15.1 | Dark theme consistent | Navy/dark background across all pages | 🔲 |
| 15.2 | Crimson accent color used | Primary actions, CTAs use crimson (#DC2626) | 🔲 |
| 15.3 | Gold accent for insights | Insight cards and special items use gold | 🔲 |
| 15.4 | Glass-card styling | Glass morphism effect on cards (border, backdrop) | 🔲 |
| 15.5 | Hover animations | Cards and buttons scale/glow on hover (framer-motion) | 🔲 |
| 15.6 | Tap animations | Buttons compress on click (whileTap) | 🔲 |
| 15.7 | Loading states | Spinners/skeletons during data fetch | 🔲 |
| 15.8 | Toast styling | Toasts match dark theme, readable text | 🔲 |
| 15.9 | Badge styling consistency | All badges use consistent border/text patterns | 🔲 |
| 15.10 | Icon consistency | All icons from lucide-react, consistent sizing | 🔲 |
| 15.11 | Font rendering | Inter font renders cleanly at all sizes | 🔲 |
| 15.12 | Gradient usage | Premium gradients on CTA buttons and key elements | 🔲 |

---

## TOTAL TEST ITEMS: 260+

### Priority Order for Testing:
1. **Login & Authentication** (Section 0) — foundational
2. **Global Layout & Navigation** (Section 1) — affects all pages
3. **AI Mode Switching** (Section 10) — affects every feature
4. **Dashboard** (Section 2) — first thing users see
5. **Outreach full flow** (Section 3) — revenue engine start
6. **CRM full flow** (Section 4) — deal pipeline
7. **Production** (Section 6) — client delivery (9 tabs)
8. **Marketing** (Section 5) — growth
9. **Admin** (Section 7) — operations
10. **Finance** (Section 8) — billing
11. **Settings** (Section 9) — configuration (10 tabs)
12. **End-to-end chains** (Section 12) — the ultimate test
13. **Content standards** (Section 13) — brand compliance
14. **Error handling** (Section 14) — resilience
15. **Visual polish** (Section 15) — final QA

---

*Generated from PMG OS Codebase Deep Analysis | Last updated: Session 6*
*Covers: 8 pages, 40+ tabs, 32 agents, 3 AI modes, 10 settings panels*
