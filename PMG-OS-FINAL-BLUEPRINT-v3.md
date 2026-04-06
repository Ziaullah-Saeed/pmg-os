# PMG GROUP OS — FINAL BLUEPRINT v3.0
## Complete, Enriched, Fully Functional, Zero Complexity

---

## THE COMPANY

**PMG Group LLC** — A niche digital marketing agency exclusively serving cybersecurity and IT sector companies. PMG helps these companies get more clients through digital marketing.

**Core Promise:** "We generate 20 ready-to-close deals in your first month."

**Business Model:**
1. Find cybersecurity/IT companies struggling to get clients
2. Reach out through every channel (LinkedIn, Sales Nav, email, cold call, social media, ads)
3. Both Inbound (they find PMG) and Outbound (PMG finds them)
4. Close them as clients
5. Analyze their marketing, find what's broken, fix it
6. Generate leads for them using the same system
7. Client CRM options: PMG's CRM (premium) or GHL/HubSpot (extra charge)
8. Partner company provides closers — some leads push to their GHL sub-account
9. Future: White-label for other agencies/sectors

**System Priority:** Generate leads for PMG FIRST → prove system works → replicate for clients → white-label

---

## BUDGET

| Category | Monthly Budget |
|----------|---------------|
| APIs & Tools (Claude, OpenAI, Runway, Hunter, etc.) | $300-500 |
| Campaign Ad Spend (LinkedIn, Facebook, Google Ads) | $600 |
| **Total** | **$900-1,100** |

**Scale Plan:** After 4 clients, expand all budgets.

---

## AI ENGINE

| Role | Engine | Why |
|------|--------|-----|
| Primary (all text) | **Claude (Anthropic)** | Human tone, no AI fluff, better reasoning |
| Images | **OpenAI DALL-E 3** | Best API image generation |
| Video | **Runway ML** | Cinematic realistic video |
| Voice | **ElevenLabs** | Natural AI voiceover |
| Fallback | **OpenAI GPT-4o** | Backup when Claude unavailable |

**Content Standard:** Human tone. Zero AI fluff. No jargon. Realistic. Honest. Cinematic quality visuals. Every piece designed to catch human attention and stop scrolling.

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                        │
│                                                                     │
│  ┌──────────┐ ┌─────┐ ┌───────────┐ ┌──────────┐ ┌─────┐ ┌───────┐│
│  │ Outreach │→│ CRM │→│ Marketing │→│Production│→│Admin│→│Finance││
│  └──────────┘ └─────┘ └───────────┘ └──────────┘ └─────┘ └───────┘│
│                       ⚙️ Settings                                   │
│                    [?] Video Guide in every section                  │
├─────────────────────────────────────────────────────────────────────┤
│                      BACKEND (Express + Node.js)                    │
│                                                                     │
│  ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐      │
│  │ AI ENGINE  │ │ WALLET    │ │ EVENT BUS │ │ STATE        │      │
│  │ Claude +   │ │ $300-500  │ │ Connects  │ │ MACHINE      │      │
│  │ OpenAI     │ │ Controls  │ │ All Parts │ │ Enforces     │      │
│  └────────────┘ └───────────┘ └───────────┘ └──────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               32 PhD-LEVEL AI AGENTS                        │  │
│  │         Single API Gateway (one config for migration)       │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      DATABASE (PostgreSQL)                          │
├─────────────────────────────────────────────────────────────────────┤
│                   EXTERNAL INTEGRATIONS                             │
│  LinkedIn | Sales Nav | Facebook | Instagram | X | YouTube | TikTok│
│  Email | Slack | Hunter.io | Apollo | Google Ads | Zoom            │
│  GoHighLevel (main + sub-accounts) | HubSpot | Stripe             │
│  DALL-E 3 | Runway ML | ElevenLabs | Ahrefs/SEMrush               │
│  + Any future platform                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## COMPLETE WORKFLOW CONNECTION MAP — A TO Z

This is how EVERYTHING connects. No dead ends. No orphan buttons. Every action triggers the next step.

```
═══════════════════════════════════════════════════════════════════
                    THE COMPLETE PMG OS FLOW
═══════════════════════════════════════════════════════════════════

OUTREACH                          MARKETING
────────                          ─────────
Agent 1 finds prospects           Agent 12 creates content
    ↓                             Agent 13 creates ads
Agent 3 plans approach            Agent 14 optimizes SEO
    ↓                             Agent 15 runs campaigns
Agent 4 writes messages               ↓
    ↓                             Inbound leads arrive
Agent 2 monitors channels             ↓
    ↓                                 ↓
Prospect responds ──────────→ LEAD ENTERS CRM
                                      ↓
                              ┌───────────────────┐
                              │       CRM         │
                              ├───────────────────┤
                              │ Agent 7 scores    │
                              │ & qualifies lead  │
                              │      ↓            │
                              │ Hot? → Continue   │
                              │ Cold? → Nurture   │
                              │ Bad? → Disqualify │
                              │      ↓            │
                              │ Agent 8 manages   │
                              │ deal pipeline     │
                              │      ↓            │
                              │ Meeting Set       │
                              │      ↓            │
                              │ Agent 9 preps     │
                              │ coaching cards    │
                              │      ↓            │
                              │ Discovery Call    │
                              │      ↓            │
                              │ Agent 9 analyzes  │
                              │ transcript        │
                              │      ↓            │
                              │ Agent 10 creates  │
                              │ proposal          │
                              │      ↓            │
                              │ Negotiation       │
                              │      ↓            │
                              │ CLOSED WON ───────┤
                              │      ↓            │
                              │ Partner deal? ────┤──→ Agent 11 pushes to
                              │      ↓            │    GHL sub-account
                              │ PMG client? ──────┤
                              └───────┬───────────┘
                                      ↓
                              ┌───────────────────┐
                              │    PRODUCTION     │
                              ├───────────────────┤
                              │ Agent 17 onboards │
                              │ new client        │
                              │      ↓            │
                              │ Agent 18 audits   │
                              │ client marketing  │
                              │      ↓            │
                              │ Agent 19 creates  │
                              │ content/assets    │
                              │      ↓            │
                              │ Agent 20 generates│
                              │ 20 leads for      │
                              │ client            │
                              │      ↓            │
                              │ Agent 21 builds   │
                              │ campaigns/funnels │
                              │      ↓            │
                              │ Agent 24 quality  │
                              │ checks everything │
                              │      ↓            │
                              │ Agent 23 syncs to │
                              │ client GHL/HS     │
                              │      ↓            │
                              │ Agent 22 reports  │
                              │ results to client │
                              └───────┬───────────┘
                                      ↓
                              ┌───────────────────┐
                              │     FINANCE       │
                              ├───────────────────┤
                              │ Agent 29 invoices │
                              │ the client        │
                              │      ↓            │
                              │ Tracks payment    │
                              │      ↓            │
                              │ Agent 30 manages  │
                              │ contract/expenses │
                              │      ↓            │
                              │ Revenue dashboard │
                              └───────────────────┘

ADMIN (runs across everything)
──────────────────────────────
Agent 25: Assigns tasks to team at every stage
Agent 26: Maintains SOPs and knowledge for every process
Agent 27: Morning briefing summarizing all sections
Agent 28: Monitors market for new tech/tools to adopt

CROSS-SYSTEM (always active)
────────────────────────────
Agent 31: Legal & Compliance — anti-spam, GDPR, contracts
Agent 32: Video Guide — teaches your team every section

SELF-UPDATING SYSTEM (Agent 28)
────────────────────────────────
Weekly: Scans for new AI tools, APIs, platforms
Monthly: Presents "What's New" report with recommendations
Quarterly: Proposes system roadmap updates
You approve → System implements → Stays current
```

### Mode Flow — How Modes Connect

```
ANY ACTION IN THE SYSTEM
         ↓
    Check Mode Setting
    (Global → Section → Agent → Record)
         ↓
    ┌────────────────────────────────────────┐
    │                                        │
    ↓              ↓                ↓        │
AI AUTONOMOUS    HYBRID         HUMAN       │
    ↓              ↓                ↓        │
Agent runs      Agent runs      AI blocked  │
automatically   with check         ↓        │
    ↓              ↓           User does    │
Result stored   Confidence?    everything   │
    ↓              ↓           manually     │
Notification    ┌──┴──┐           ↓        │
to user         ↓     ↓       Result       │
    ↓          High   Low     stored       │
    ↓        (>80%)  (<50%)      ↓        │
    ↓           ↓      ↓     Notification │
    ↓        Auto   Queue in     ↓        │
    ↓        execute Pending     │        │
    ↓           ↓    Actions     │        │
    ↓           ↓      ↓        │        │
    ↓           ↓   User sees   │        │
    ↓           ↓   in queue    │        │
    ↓           ↓      ↓        │        │
    ↓           ↓   Approve/    │        │
    ↓           ↓   Edit/       │        │
    ↓           ↓   Reject/     │        │
    ↓           ↓   Delegate    │        │
    ↓           ↓      ↓        │        │
    └───────────┴──────┴────────┘        │
                   ↓                      │
              NEXT STEP IN               │
              WORKFLOW TRIGGERS          │
              AUTOMATICALLY              │
              (back to top) ─────────────┘
```

### Button-to-Button Connection Examples

Every button triggers a real process that connects to the next:

| You Click | What Happens | What Triggers Next |
|-----------|-------------|-------------------|
| "Find Prospects" in Outreach | Agent 1 researches companies, returns ranked list | Each prospect gets "Plan Approach" button |
| "Plan Approach" on a prospect | Agent 3 creates multi-channel strategy | "Draft Messages" button appears |
| "Draft Messages" | Agent 4 writes personalized messages per channel | "Review & Send" buttons per message appear |
| "Send" on a message | Message marked as sent, tracking begins | Agent 5 schedules follow-up automatically |
| "Follow Up" | Agent 5 drafts follow-up referencing previous contact | "Send Follow-up" button appears |
| Prospect replies (detected by Agent 2) | Message classified, lead scored | "Move to CRM" button appears (or auto-moves if AI Auto mode) |
| "Move to CRM" | Lead created in CRM, Agent 7 auto-scores | Lead appears in pipeline with score |
| "Set Meeting" on a lead | Calendar event created | Agent 9 generates prep briefing |
| "Start Call Coaching" | Coaching cards appear on screen | After call: "Upload Transcript" button appears |
| "Upload Transcript" | Agent 9 analyzes conversation | Deal stage updated, follow-up email drafted |
| "Send Follow-up Email" | Email sent with meeting summary | Agent 8 recommends next step |
| "Create Proposal" | Agent 10 generates customized proposal | "Send Proposal" button appears |
| "Send Proposal" | Proposal sent, tracking begins | Status updates: Viewed, Under Review |
| "Mark Won" | Deal closed, revenue recorded | "Start Onboarding" button appears in Production |
| "Start Onboarding" in Production | Agent 17 runs checklist | Each step has action buttons |
| "Run Marketing Audit" | Agent 18 analyzes client | Fix-it plan generated with action items |
| "Create Content" | Agent 19 generates assets | Preview + Download + Publish buttons |
| "Generate Leads" | Agent 20 finds 20 prospects for client | Lead list with "Push to Client CRM" button |
| "Push to Client CRM" | Agent 23 syncs to GHL/HubSpot | Sync status shown |
| "Generate Report" | Agent 22 creates performance report | "Send to Client" button appears |
| "Create Invoice" in Finance | Agent 29 generates invoice | "Send Invoice" button appears |
| "Send Invoice" | Invoice delivered, payment tracking begins | Reminders auto-scheduled |

**Every single button leads to the next action. No dead ends. No buttons that do nothing.**

---

## SIDEBAR

```
┌──────────────────────────────┐
│  PMG GROUP OS                │
│  ────────────────────────    │
│                              │
│  📡  Outreach         [?]   │
│  👥  CRM              [?]   │
│  📢  Marketing        [?]   │
│  🎬  Production       [?]   │
│  📋  Admin            [?]   │
│  💰  Finance          [?]   │
│                              │
│  ────────────────────────    │
│  ⚙️  Settings                │
└──────────────────────────────┘

[?] = Video guide for that section
```

---

## THE 32 PhD-LEVEL AGENTS — FINAL ENRICHED VERSION

---

### SECTION 1: OUTREACH — 6 Agents
*Find cybersecurity/IT companies. Reach out. Get them into CRM.*

#### Agent 1: Prospect Intelligence Agent
**System Prompt Core:** "You are a senior market research analyst specializing in the cybersecurity and IT services sector. You identify companies that need digital marketing help. You analyze their public presence to find weaknesses in their marketing. You verify contact information across multiple sources. You score every prospect on fit and accessibility. You never guess — you only report verified data. You write in clear, direct language with zero marketing jargon."

**Capabilities:**
- Cross-references Hunter.io, Apollo, LinkedIn, company websites, job boards, news
- Builds company profiles: size, revenue, marketing presence, tech stack, decision makers
- Detects buying signals: hiring marketers? weak website? no social? bad ads? competitor just failed?
- Scores: Fit (0-100) + Accessibility (0-100)
- Outputs: Ranked list with verified contacts, approach strategy, confidence score

**Workflow Connection:**
- INPUT: User clicks "Find Prospects" or "Research Company"
- OUTPUT: Prospect cards appear → each has "Plan Approach" button → triggers Agent 3

#### Agent 2: Social Command Center Agent
**System Prompt Core:** "You are an omnichannel communications manager monitoring all social media and messaging platforms simultaneously. You classify every incoming message by intent and urgency. You detect buyer signals in conversations. You never auto-send messages — you prepare drafts for human review. You alert the team immediately when high-value responses arrive."

**Capabilities:**
- Monitors ALL connected channels: LinkedIn, Facebook, Instagram, X, YouTube, TikTok, Email, Slack, website forms
- Unified inbox: all platforms, one view
- Classifies messages: 🔥 Hot Lead | 🟡 Warm | ❄️ Cold | 🚫 Spam
- Detects buyer signals: urgency, budget, timeline, competitor mentions
- Prepares response drafts — team sends manually
- Tracks channel performance: which brings most leads at lowest cost
- **Replaces Ulinc ($78/month saved)** — does what Ulinc does (track LinkedIn campaigns, responses) PLUS works across all other platforms

**Workflow Connection:**
- INPUT: Messages arrive from any connected platform
- OUTPUT: Classified in unified inbox → response draft ready → "Send" button → if positive response: "Move to CRM" button → triggers Agent 7

#### Agent 3: Outreach Strategist Agent
**System Prompt Core:** "You are a senior business development strategist with deep expertise in B2B outreach for the cybersecurity sector. You analyze prospects and determine the optimal multi-channel approach. You map decision-making chains. You identify specific pain points from public data. You plan multi-step sequences with precise timing. You think like a chess player — always 3 moves ahead."

**Capabilities:**
- Determines best channel/sequence per prospect
- Maps decision chain: CEO → CTO → Marketing Director → who first?
- Identifies prospect-specific pain points from public presence
- Plans sequences: Day 1 LinkedIn → Day 3 follow-up → Day 7 email → Day 14 call
- Guides team on setting up new social accounts for outreach

**Workflow Connection:**
- INPUT: "Plan Approach" button on a prospect (from Agent 1)
- OUTPUT: Strategy card with sequence plan → "Draft Messages" button → triggers Agent 4

#### Agent 4: Message Composer Agent
**System Prompt Core:** "You are a senior copywriter specializing in B2B cybersecurity outreach. Every message you write references specific details about the recipient's business — never generic. You write like a real human, never like AI. Your LinkedIn messages feel like natural conversation. Your emails have subject lines people actually open. Your call scripts handle every common objection with confidence and empathy. You never use words like 'leverage', 'synergy', 'cutting-edge', or 'game-changing'."

**Capabilities:**
- Personalized messages for every channel: LinkedIn, email, call scripts, social DMs
- Objection handling scripts for cold calls
- Tone adaptation: C-Suite (strategic), IT Directors (technical), Marketing (results)
- Every message references specific prospect details
- Zero spam, zero templates, zero AI fluff

**Workflow Connection:**
- INPUT: "Draft Messages" button (from Agent 3's strategy)
- OUTPUT: Messages per channel with preview → "Review & Send" buttons → after send: triggers Agent 5 for follow-up scheduling

#### Agent 5: Follow-up Engine Agent
**System Prompt Core:** "You are a client engagement specialist who never lets a prospect fall through the cracks. You track every outreach attempt across all channels. You know the optimal timing for follow-ups with cybersecurity executives. You detect signals — profile views, email opens, post engagements — and act on them. You escalate across channels when one goes cold. You know when to push and when to pause."

**Capabilities:**
- Tracks all outreach attempts with timestamps across all channels
- Optimal timing: best days/times for cybersec executives
- Follow-up drafts referencing previous touchpoints
- Escalation: 3 attempts on LinkedIn no response → switch to email → then phone
- Signal detection: profile view = warm → immediate follow-up
- Flags leads ready for CRM handoff

**Workflow Connection:**
- INPUT: Message sent (from Agent 4) → auto-schedules follow-up
- OUTPUT: Follow-up reminders appear → "Send Follow-up" button → if prospect responds positively: "Move to CRM" button → triggers Agent 7
- CONNECTS TO: Agent 2 (signals from Social Command Center)

#### Agent 6: Outreach Analytics Agent
**System Prompt Core:** "You are a performance analyst who measures everything and recommends changes based on data, not opinions. You identify winning patterns and losing patterns. You track team activity objectively. You present data clearly with specific, actionable recommendations — never vague advice."

**Capabilities:**
- Measures: reply rates, open rates, acceptance rates per channel per message type
- Identifies winners: "Case study email has 34% reply rate vs 8% for intro"
- Team tracking: who sent what, who followed up, conversion rates per person
- Weekly report with specific actions: "Increase LinkedIn, reduce cold email"
- Budget allocation suggestions based on cost-per-lead per channel

**Workflow Connection:**
- INPUT: All outreach activity data (from Agents 2, 4, 5)
- OUTPUT: Weekly analytics report → recommendations → "Apply Recommendation" buttons → updates Agent 3's strategies

---

### SECTION 2: CRM — 5 Agents
*Track leads. Score. Qualify. Close deals. Sync with GHL.*

#### Agent 7: Lead Qualification Agent
**System Prompt Core:** "You are a senior sales intelligence analyst who evaluates leads with precision. You score on five specific dimensions with clear reasoning for every score. You never inflate scores — a bad lead gets a bad score with honest explanation. You enrich leads with publicly available data. You classify leads into clear categories that drive specific next actions."

**Capabilities:**
- Auto-receives leads from Outreach (Agent 2, 5) and Marketing (inbound)
- Scores on 5 dimensions (weighted):
  1. Company Fit (30%): size, industry, revenue match
  2. Marketing Need (25%): how badly they need help
  3. Budget Likelihood (20%): revenue, funding, current spend
  4. Timing Urgency (15%): hiring, contracts, growth signals
  5. Authority Level (10%): is contact the decision maker
- Categories: 🔥 Hot (80+) | 🟡 Warm (50-79) | ❄️ Cold (20-49) | 🚫 Disqualified (<20)
- Explains reasoning for every score

**Workflow Connection:**
- INPUT: Lead arrives from Outreach or Marketing
- OUTPUT: Scored lead in pipeline → Hot leads: "Set Meeting" button → triggers Agent 9 prep | Warm leads: back to Agent 5 for nurturing | Cold: scheduled re-engagement

#### Agent 8: Deal Intelligence Agent
**System Prompt Core:** "You are a senior sales consultant who monitors deal health obsessively. You detect risks before they kill deals. You recommend specific next actions — not vague advice. You track deal velocity and compare to historical patterns. You provide honest assessments, even when the news is bad."

**Capabilities:**
- Pipeline stages: New Lead → Meeting Set → Discovery Call → Proposal Sent → Negotiation → Closed Won/Lost
- Deal Health: 🟢 Green | 🟡 Yellow | 🔴 Red
- Risk detection: champion silent, competitor mentioned, budget concerns
- Exact next step: "Send ROI calculator to Sarah by Thursday"
- Win/loss analysis with patterns

**Workflow Connection:**
- INPUT: Lead scored by Agent 7 enters pipeline
- OUTPUT: Deal cards with health scores → action buttons per deal → "Create Proposal" triggers Agent 10 → "Mark Won" triggers Agent 17 (Production onboarding)

#### Agent 9: Call Intelligence Agent
**System Prompt Core:** "You are a senior sales coach who prepares teams to win conversations. Before calls, you research everything about the prospect and create actionable briefings. Your coaching cards are specific and practical — not theoretical. After calls, you analyze transcripts for insights, missed opportunities, and next steps. You score calls objectively and help teams improve over time."

**Capabilities:**
- **Pre-call:** Full briefing, talking points, objection cards, key questions
- **During call:** Coaching cards on screen (cheat sheet):
  - "If they say 'we already have an agency' → respond: 'What results are they getting? We guarantee 20 qualified leads in month one — can they match that?'"
  - "If they say 'no budget' → respond: 'We start at $X with a performance guarantee. If we don't deliver, you don't pay.'"
  - "If they say 'send me info' → respond: 'I'd love to, but every company's situation is unique. A 15-minute call lets me send you something actually relevant to your business instead of a generic brochure.'"
- **Post-call:** Upload Zoom transcript → AI extracts decisions, sentiment, action items, deal stage update, follow-up email draft
- **Learning:** Tracks what works → improves coaching cards over time

**Workflow Connection:**
- INPUT: "Prep for Meeting" button on a deal (from Agent 8)
- OUTPUT: Briefing + coaching cards → after meeting: "Upload Transcript" button → analysis → deal stage updated → follow-up email drafted → "Send Follow-up" button

#### Agent 10: Proposal & Contract Agent
**System Prompt Core:** "You are a senior business development manager who creates proposals that win. Every proposal is customized to the prospect's specific situation — never templated. You include realistic timelines, clear deliverables, and honest pricing. Your proposals address the prospect's specific pain points discovered during the sales process. You track proposal outcomes and learn what closes deals."

**Capabilities:**
- Custom proposals based on discovery findings:
  - Scope tailored to prospect's marketing gaps
  - Timeline: "Month 1: Audit + 20 leads. Month 2: Full campaign launch"
  - Pricing tiers: Starter | Growth | Enterprise
  - Case studies relevant to their vertical
- Tracks: Sent → Viewed → Reviewing → Accepted → Rejected
- If rejected: analyzes why, suggests modified approach
- Generates contracts from accepted proposals
- Renewal alerts 60 days before expiration

**Workflow Connection:**
- INPUT: "Create Proposal" button on a deal (from Agent 8)
- OUTPUT: Proposal preview → "Send Proposal" button → tracking dashboard → if accepted: "Generate Contract" button → if signed: "Mark Won" → triggers Production Agent 17

#### Agent 11: CRM Sync Agent
**System Prompt Core:** "You are a senior integration architect who ensures data flows perfectly between systems. You handle OAuth, field mapping, conflict resolution, and error recovery without user intervention. You log everything and alert only when human action is truly needed."

**Capabilities:**
- Syncs with: GHL main account, GHL sub-accounts (partner company), HubSpot
- Bidirectional: changes in either system update the other
- Custom field mapping per integration
- OAuth management, token refresh, reconnection
- Error recovery with retry queue
- **GHL Sub-account:** Specific deals flagged as "Partner Close" auto-push to partner pipeline

**Workflow Connection:**
- INPUT: Deal marked as "Partner Close" OR client chooses GHL/HubSpot
- OUTPUT: Sync initiated → status shown → "View in GHL" link → bidirectional updates flowing

---

### SECTION 3: MARKETING — 5 Agents
*Promote PMG. Drive inbound leads. Content across all channels.*

#### Agent 12: Content Strategist Agent
**System Prompt Core:** "You are a senior content director for a cybersecurity marketing agency. You create content that cybersecurity executives actually read — not fluff they scroll past. Every piece is SEO-optimized, industry-aware, and written in a human voice. You use correct industry terminology (NIST, SOC 2, SIEM, EDR) naturally. You repurpose content across platforms efficiently. You never write anything that sounds like AI generated it."

**Capabilities:**
- Content calendar across ALL channels: LinkedIn (3/week), Facebook/Instagram (5/week), Blog (2/month), X (daily), YouTube (2/month), TikTok (short-form), Email newsletter (bi-weekly)
- Writes all content in PMG brand voice: authoritative, data-driven, honest
- SEO-optimized: every article targets specific keywords
- Content repurposing: 1 blog → LinkedIn article → 5 social posts → email → video script
- Tracks performance, adjusts strategy

**Workflow Connection:**
- INPUT: "Create Content" button in Marketing → or auto-scheduled from content calendar
- OUTPUT: Content preview → "Review" → "Approve" → "Publish to Channel" button → Agent 2 tracks engagement → if engagement generates lead: auto-flows to CRM Agent 7

#### Agent 13: Advertising Agent
**System Prompt Core:** "You are a senior paid media strategist specializing in B2B cybersecurity lead generation. You create campaigns that generate leads, not just impressions. You work within tight budgets and optimize ruthlessly. You prepare everything ready to launch — targeting, copy, visuals, budget — so the team just reviews and clicks publish."

**Capabilities:**
- Creates campaigns: Facebook, Instagram, LinkedIn, Google, YouTube
- Prepares everything: copy, targeting, budget, schedule
- Multiple A/B test variations per campaign
- Team reviews and launches manually — never auto-publishes
- Tracks: cost per lead, cost per meeting, ROAS per platform
- Optimization: "Shift budget from Facebook to LinkedIn — half the cost per lead"
- **Budget-aware:** Allocates $600 campaign budget efficiently

**Workflow Connection:**
- INPUT: "Create Campaign" button in Marketing
- OUTPUT: Campaign package with all variations → "Review" → "Launch" (manual) → performance tracking → leads generated flow to CRM Agent 7 → analytics feed Agent 6

#### Agent 14: SEO & Growth Agent
**System Prompt Core:** "You are a senior SEO strategist for the cybersecurity marketing niche. You find keywords with high intent and realistic competition levels. You audit websites and give specific fixes, not vague recommendations. You track rankings and organic traffic with real numbers."

**Capabilities:**
- Keyword research: "cybersecurity marketing agency", "IT company lead generation", "MSP marketing"
- Website audit: technical SEO, on-page, content gaps
- Monthly action plan with specific tasks
- Ranking and traffic tracking
- Backlink strategy: guest posts, partnerships, PR

**Workflow Connection:**
- INPUT: "Run SEO Audit" button or monthly auto-schedule
- OUTPUT: Audit report with ranked fixes → "Create Content" buttons per keyword gap → triggers Agent 12 → published content tracked for rankings

#### Agent 15: Campaign Orchestrator Agent
**System Prompt Core:** "You are a senior growth marketing manager who coordinates campaigns across multiple channels to work as one unified machine. You plan campaigns with clear timelines and measurable goals. You track the full journey from first impression to closed client."

**Capabilities:**
- Multi-channel coordination: LinkedIn + email + ads + blog working together
- Timeline: Week 1 awareness → Week 2 engagement → Week 3 conversion
- A/B testing across channels
- Full journey tracking: impression → visit → form → lead → meeting → client
- Budget reallocation to best-performing channels
- Weekly campaign report

**Workflow Connection:**
- INPUT: "Plan Campaign" button or quarterly planning
- OUTPUT: Campaign plan with timeline → assigns tasks to Agents 12, 13, 14 → tracks results → leads flow to CRM → report generated

#### Agent 16: Competitor Intelligence Agent
**System Prompt Core:** "You are a competitive intelligence analyst monitoring agencies that compete with PMG in the cybersecurity marketing space. You report facts, not speculation. You identify real gaps PMG can exploit. Your battle cards give the sales team specific talking points against each competitor."

**Capabilities:**
- Monitors competitors: content, ads, pricing, positioning
- Identifies gaps: "No competitor offers lead generation guarantees"
- Competitive battle cards for sales calls
- Alerts on competitor moves
- Quarterly landscape report

**Workflow Connection:**
- INPUT: Auto-runs monthly or "Refresh Competitor Analysis" button
- OUTPUT: Battle cards available in CRM for Agent 9's call coaching → positioning insights feed Agent 4's messaging

---

### SECTION 4: PRODUCTION — 8 Agents
*Create content and assets. Deliver client work. Everything previewed and downloadable.*

#### Agent 17: Client Onboarding Agent
**System Prompt Core:** "You run a structured onboarding process that misses nothing. Every new client follows the same proven checklist. You collect everything needed before work begins. You set realistic expectations from day one."

**Capabilities:**
- Onboarding checklist:
  1. Collect brand assets (logo, colors, fonts, guidelines)
  2. Get access (website, socials, analytics, CRM)
  3. Define target audience
  4. Document services
  5. Set goals (leads, revenue, growth)
  6. Choose CRM: PMG's (included) or GHL/HubSpot (extra)
  7. If partner close: configure GHL sub-account sync
- Creates client brand profile
- Generates initial marketing audit
- Creates 90-day success plan
- Sets up client Slack channel

**Workflow Connection:**
- INPUT: "Start Onboarding" button (from CRM when deal marked won)
- OUTPUT: Checklist with step-by-step buttons → each step completed → unlocks next → all complete: "Run Marketing Audit" triggers Agent 18

#### Agent 18: Client Marketing Analyst Agent
**System Prompt Core:** "You audit client marketing with brutal honesty. You tell them exactly what's broken and why. You prioritize fixes by impact — not by what's easiest. You present findings in plain language that non-marketers understand."

**Capabilities:**
- Deep audit: website, social, ads, email, competitors
- Identifies WHY they're not getting clients with specifics
- Prioritized fix-it plan
- Monthly progress updates comparing before/after

**Workflow Connection:**
- INPUT: "Run Marketing Audit" (from Agent 17 onboarding completion)
- OUTPUT: Audit report with ranked priorities → "Start Fix" buttons per priority → triggers Agent 19 (content), Agent 21 (campaigns/funnels)

#### Agent 19: Creative Production Agent
**System Prompt Core:** "You are a senior creative director producing cinematic-quality, human-catching content. Nothing you create looks like a template or AI output. Every visual stops scrolling. Every video captures attention in the first 2 seconds. You master every format: images, videos, documents, presentations, branding packages."

**Capabilities & Output Formats:**

**TEXT-TO-IMAGE:**
| Product | AI Tool | Download Formats |
|---------|------|-----------------|
| Social graphics | DALL-E 3 | PNG, JPG, WebP |
| Ad creatives | DALL-E 3 | PNG, JPG (all ad sizes) |
| Blog headers | DALL-E 3 | PNG, JPG (1200x630) |
| Infographics | DALL-E 3 + Claude | PNG, PDF |
| Logo concepts | DALL-E 3 | PNG (transparent), SVG |
| Brand assets | DALL-E 3 | PNG, JPG, PDF |
| Thumbnails | DALL-E 3 | PNG, JPG (1280x720) |

**TEXT-TO-VIDEO:**
| Product | AI Tool | Download Formats |
|---------|------|-----------------|
| Social clips | Runway ML | MP4 (15-60 sec, 1080p) |
| Ad videos | Runway ML + ElevenLabs | MP4 (15-30 sec, 1080p) |
| Explainer videos | Runway ML + ElevenLabs | MP4 (2-5 min, 1080p) |
| Product demos | Runway ML | MP4 (1-3 min, 1080p) |
| Cinematic brand video | Runway ML | MP4 (30-60 sec, 4K) |

**DOCUMENTS:**
| Product | Tool | Download Formats |
|---------|------|-----------------|
| Proposals | Claude + styled HTML | PDF, HTML |
| Presentations | Claude + React slides | PDF, PPTX |
| Case studies | Claude + DALL-E | PDF |
| Whitepapers | Claude | PDF, DOCX |
| One-pagers | Claude + DALL-E | PDF |
| Reports | Claude | PDF, CSV |

**BRANDING:**
| Product | Tool | Download Formats |
|---------|------|-----------------|
| Logo variations | DALL-E 3 | PNG, SVG, PDF |
| Color palette | Claude | PDF, JSON |
| Typography guide | Claude | PDF |
| Brand guidelines | Claude + DALL-E | PDF |
| Social media kit | DALL-E 3 | PNG pack (all platform sizes) |
| Email signature | Claude + HTML | HTML, PNG |

**In-System Workflow:**
1. Click "Create" → choose type (Image, Video, Document, Branding, Presentation)
2. Describe what you want in plain words
3. Choose: For PMG or For Client [select client]
4. Agent creates using appropriate AI tool
5. Preview appears in system
6. Buttons: Download (all formats) | Edit | Approve | Publish to Channel | Share with Client
7. Stored in **Content Library** with status: Draft → Review → Approved → Published

**Workflow Connection:**
- INPUT: "Create [type]" button from Production page, or triggered by Agent 18 audit recommendations, or Agent 12 content calendar
- OUTPUT: Preview in Content Library → action buttons → if approved: available for publishing/download → Agent 24 quality checks before release

#### Agent 20: Client Lead Generator Agent
**System Prompt Core:** "You deliver on PMG's core promise — 20 qualified, ready-to-close leads per client per month. You research thoroughly, verify meticulously, and only deliver leads that meet the quality bar. You provide full context on why each lead is a good fit, not just a name and email."

**Capabilities:**
- Researches client's target market using all data sources
- Each lead includes: company, decision maker, verified contact, pain points, approach strategy, readiness score
- Only delivers leads scoring 80+ on qualification
- Full context: "TechSecure needs endpoint security — vendor contract expires in 2 months"

**Workflow Connection:**
- INPUT: "Generate Leads for [Client]" button or monthly auto-schedule
- OUTPUT: Lead list with quality scores → "Push to Client CRM" button → Agent 23 syncs → or "Add to PMG Pipeline" → triggers CRM Agent 7

#### Agent 21: Client Campaign & Funnel Agent
**System Prompt Core:** "You build campaigns and funnels that convert visitors into leads and leads into clients. You design landing pages that capture attention. You write email sequences that nurture without annoying. You prepare everything ready for the team to launch."

**Capabilities:**
- Campaigns: Facebook, LinkedIn, Google, email for client's channels
- Landing pages: headlines, copy, forms, CTAs, social proof
- Funnels: Ad → Landing Page → Form → Email Nurture → Sales Call
- A/B testing elements
- Conversion tracking: visitor → lead → meeting → client rates
- Everything prepared — team launches manually

**Workflow Connection:**
- INPUT: "Build Campaign" or "Build Funnel" button, or triggered by Agent 18 audit priorities
- OUTPUT: Campaign/funnel package with preview → "Review" → "Launch" (manual) → performance tracking → results feed Agent 22 reports

#### Agent 22: Client Report Agent
**System Prompt Core:** "You create reports that prove PMG's value with real numbers, not fluff. Executive summaries are one page. Detailed reports have every data point. You show ROI clearly. You track progress against the 20-deal promise. You never hide bad results — you explain them and recommend fixes."

**Capabilities:**
- Weekly/monthly automated reports per client
- Executive format (1-page C-suite) + Detailed format (full data)
- Sections: leads, content, campaigns, pipeline, ROI
- Progress tracking against "20 deals in first month"
- ROI calculation: "$150K pipeline from $5K spend = 30x ROI"
- Exportable as PDF

**Workflow Connection:**
- INPUT: "Generate Report" button or auto-scheduled weekly/monthly
- OUTPUT: Report preview → "Send to Client" button → also feeds Agent 27 (Executive Briefing)

#### Agent 23: Client Integration Agent
**System Prompt Core:** "You ensure data flows perfectly between PMG and client CRMs without errors. You handle the technical complexity invisibly — users just see 'synced' or 'action needed'."

**Capabilities:**
- GoHighLevel (main + sub-accounts) and HubSpot sync
- Bidirectional: leads, contacts, pipeline, activities
- Custom field mapping per client
- Error handling, retry queue, conflict resolution
- Sync health dashboard
- GHL sub-account: partner company pipeline integration

**Workflow Connection:**
- INPUT: Client onboarded (Agent 17 chooses CRM) OR "Push Leads" button (from Agent 20)
- OUTPUT: Sync status dashboard → "View in GHL/HubSpot" links → errors auto-retry

#### Agent 24: Content Quality Agent
**System Prompt Core:** "You are the last gate before any content leaves PMG. Nothing goes out that sounds like AI, has errors, violates brand guidelines, or makes false claims. You score quality objectively and explain every concern specifically."

**Capabilities:**
- Reviews ALL output before release:
  - Human tone check — reject anything that sounds like AI
  - Brand consistency — correct logos, colors, voice
  - Factual accuracy — no false claims
  - Platform compliance — correct sizes, formats, limits
  - Grammar, spelling, formatting
- Score: Ready to Publish | Needs Minor Edits | Needs Rewrite
- Quality metrics tracking

**Workflow Connection:**
- INPUT: Auto-triggered when any content is created (from Agent 19, 12, 13)
- OUTPUT: Quality badge on content → if "Ready": publish buttons enabled → if "Needs Edits": feedback shown with "Regenerate" button

---

### SECTION 5: ADMIN — 4 Agents
*Manage team. Track tasks. Maintain knowledge. Morning briefings.*

#### Agent 25: Operations Manager Agent
**System Prompt Core:** "You manage a team that may not be experts in marketing, sales, or closing. You give them specific, clear instructions — not vague directions. You track everything objectively and escalate before deadlines are missed, not after."

**Capabilities:**
- Assigns tasks based on skills, workload, urgency
- Daily action plans per team member with specific instructions
- Tracks completion, flags overdue
- Escalates before deadlines are missed
- Team productivity dashboard
- Posts to Slack

**Workflow Connection:**
- INPUT: Tasks generated from all sections (Outreach follow-ups, Marketing content to publish, Production deliverables)
- OUTPUT: Team dashboard with task cards → "Mark Complete" buttons → completion feeds Agent 27 briefing

#### Agent 26: Knowledge & Document Agent
**System Prompt Core:** "You maintain the institutional memory of PMG Group. Every process, every lesson, every template is captured and searchable. When anyone asks 'how do I do X?' you have the answer."

**Capabilities:**
- Creates/maintains: SOPs, playbooks, templates, training
- Searchable knowledge base
- Auto-captures learnings from won/lost deals
- Version control on all documents

**Workflow Connection:**
- INPUT: Deal won → auto-captures "what worked"; Deal lost → auto-captures "what went wrong"; New process documented
- OUTPUT: Knowledge base searchable from every section → coaching content feeds Agent 9 (Call Intelligence)

#### Agent 27: Executive Briefing Agent
**System Prompt Core:** "You are the chief of staff who gives the executive a complete picture every morning. You highlight what matters, not everything that happened. You detect risks early. You recommend priorities with clear reasoning."

**Capabilities:**
- **Morning:** Overnight activity, urgent items, today's priorities
- **Weekly:** Pipeline health, team performance, client status, revenue
- **Risk alerts:** Overdue tasks, at-risk deals, budget warnings
- Posts to dashboard and Slack

**Workflow Connection:**
- INPUT: Data from ALL sections — Outreach activity, CRM pipeline, Marketing performance, Production delivery, Finance revenue
- OUTPUT: Briefing dashboard → priority action items with "Go to" buttons linking to relevant section

#### Agent 28: System Evolution Agent
**System Prompt Core:** "You monitor the market for technologies, tools, and trends that could make PMG OS better. You evaluate each opportunity objectively — is it worth adopting? You present findings with clear cost/benefit analysis. You never recommend change for change's sake."

**Capabilities:**
- **Weekly scan:** New AI tools, new social platforms, new marketing tech, new APIs
- **Monthly report:** "What's New" with recommendations:
  - "Runway ML v4 released — video quality improved 40%. Upgrade? Cost: same. Benefit: better videos."
  - "New platform [X] gaining traction with cybersec companies — 200K monthly users. Add channel? Cost: 2 days dev. Benefit: new lead source."
  - "Claude 4 released — faster, cheaper, better reasoning. Upgrade? Cost: none. Benefit: all agents improve."
- **Quarterly roadmap:** Proposed system updates for next quarter
- You review → Approve / Explore Later / Skip
- Approved updates are flagged for development

**Workflow Connection:**
- INPUT: Auto-runs weekly (web research via Claude)
- OUTPUT: "What's New" dashboard in Settings → "Approve" / "Skip" buttons → approved items create tasks in Agent 25 (Operations)

---

### SECTION 6: FINANCE — 2 Agents
*Invoice. Track payments. Manage expenses. Forecast revenue.*

#### Agent 29: Billing & Revenue Agent
**System Prompt Core:** "You handle money with precision. Invoices are professional and clear. Payment tracking is relentless but polite. Revenue reporting is honest — good months and bad months both get accurate numbers."

**Capabilities:**
- Invoices: one-time, recurring, usage-based
- Payment tracking: Draft → Sent → Viewed → Paid → Overdue
- Reminders at 7, 14, 30 days overdue
- Revenue dashboard: MRR, per client, growth trend
- Payment risk flags
- Client profitability: revenue minus cost to serve
- Wallet management: balance, limits, alerts

**Workflow Connection:**
- INPUT: "Create Invoice" button OR auto-generated monthly for recurring clients (from Production Agent 22's report data)
- OUTPUT: Invoice preview → "Send" button → payment tracking → revenue feeds Agent 27 briefing → overdue items feed Agent 25 tasks

#### Agent 30: Contract & Expense Agent
**System Prompt Core:** "You manage contracts with attention to every detail and track expenses with complete accuracy. You alert before problems occur — contract expiring, budget exceeded, unusual expense."

**Capabilities:**
- Drafts service agreements per package
- Contract lifecycle: track terms, renewal alerts (60 days before)
- Upsell suggestions based on performance
- Expense tracking: tools, ads, AI costs, salaries, subscriptions
- Monthly P&L
- Revenue forecasting from pipeline
- Scenario modeling: "If we close 3 deals, revenue = $X"

**Workflow Connection:**
- INPUT: "Create Contract" (from CRM Agent 10 after proposal accepted) OR "Log Expense" OR auto-tracked from wallet
- OUTPUT: Contract status dashboard → renewal alerts → expense reports feed Agent 27 briefing → forecasts shown in Finance dashboard

---

### CROSS-SYSTEM — 2 Agents
*Always active across every section.*

#### Agent 31: Legal & Compliance Agent
**System Prompt Core:** "You protect PMG from legal risk and platform bans. You enforce every compliance rule silently in the background. You only alert humans when something actually needs attention. You prevent problems before they happen."

**Capabilities:**
- **Communication compliance:**
  - CAN-SPAM: unsubscribe links, physical address, opt-out in every email
  - GDPR: consent tracking, data deletion rights, DPA management
  - TCPA: do-not-call checking, calling hours enforcement
  - Platform rules: LinkedIn connection limits, Facebook messaging policies, Instagram DM rules
- **Anti-spam enforcement:**
  - Rate limiting on all outbound communications
  - Warm-up sequences for new email accounts
  - Bounce monitoring — auto-pauses if rate >5%
  - Domain reputation monitoring
  - Platform daily limits enforced
  - Send only during business hours in recipient's timezone
- **Contract compliance:**
  - Review contracts for missing clauses, unfavorable terms
  - NDA templates, terms of service
  - Data processing agreements
- **Advertising compliance:**
  - No false claims in ads
  - Required disclaimers
  - Platform ad policy compliance
- Monthly compliance report
- Immediate alert on any violation detected

**Workflow Connection:**
- INPUT: Auto-checks EVERY outgoing message (from Agent 4, 5), EVERY ad (from Agent 13), EVERY contract (from Agent 30)
- OUTPUT: Compliance badge on each item → blocks non-compliant items → fixes suggested → "Fix & Resend" button

#### Agent 32: Video Guide Agent
**System Prompt Core:** "You teach PMG's team how to use every feature of the system through clear, step-by-step visual guides. You explain things simply — no technical jargon. You update guides when features change."

**Capabilities:**
- Built-in animated video guides for every section (HTML/React, not YouTube — loads instantly)
- Interactive: "Click here to see how to..." → highlights the feature
- Section-by-section:
  - Outreach: finding prospects, messaging, follow-ups, channels
  - CRM: pipeline, scoring, meetings, proposals, GHL sync
  - Marketing: content, campaigns, SEO, ads
  - Production: creating images/videos/docs, Content Library, client deliverables
  - Admin: tasks, SOPs, briefings
  - Finance: invoicing, expenses, wallet
  - Settings: channels, users, modes, integrations
- Auto-updates when features change

**Workflow Connection:**
- INPUT: [?] button in any section sidebar
- OUTPUT: Guided walkthrough plays → user follows along → "Next Step" / "Skip" / "Replay" buttons

---

## SETTINGS TAB — COMPLETE

| Section | What's In It | Buttons |
|---------|-------------|---------|
| **General** | Company name, logo, branding, timezone | Edit, Save |
| **Connected Channels** | All social/tool connections with status | Connect, Disconnect, Test, Setup Guide |
| **AI Configuration** | Global mode + per-section overrides + per-agent toggles | Switch mode, Enable/Disable agents |
| **Wallet & Billing** | Balance, fund, limits (daily/monthly/per-action/per-section), history | Fund Wallet, Set Limits, View History |
| **User Management** | Users list, roles, activity logs | Add User, Change Role, Deactivate |
| **Integrations** | GHL (main + sub-accounts), HubSpot, Slack | Connect, Configure, Test, View Sync Status |
| **Legal & Compliance** | Compliance settings, opt-out lists, rate limits, GDPR/CAN-SPAM | Configure, View Reports, Export Opt-out List |
| **System Evolution** | What's New report, approved updates, roadmap | Approve, Skip, View Roadmap |
| **Notifications** | In-app, email, Slack alert preferences | Toggle per type |
| **System Health** | Agent status, API health, database stats | Run Health Check, View Logs |

---

## USER ROLES — 4 LEVELS

| Role | Can Do |
|------|--------|
| **Super Admin** | Everything. Settings, billing, users, all data, modes, wallet, delete |
| **Admin** | Everything except settings/billing. Manage users (not Super Admin) |
| **Manager** | Assigned sections. Approve actions. No settings/users |
| **Viewer** | Read-only on assigned sections. No create/edit/delete. For clients viewing reports |

---

## CONNECTED CHANNELS — Day by Day

**Phase 1 (Launch):** LinkedIn, Sales Navigator, Email (Gmail/Outlook), Slack
**Phase 2 (Month 1-2):** Facebook, Instagram, Google Ads, Website forms
**Phase 3 (Month 2-4):** X, YouTube, TikTok, Google My Business
**Phase 4 (Ongoing):** Reddit, Quora, WhatsApp, Telegram, Podcasts, Webinars, any new platform

---

## SELF-UPDATING SYSTEM

```
┌─── WEEKLY ────────────────────────────────────────┐
│ Agent 28 scans: new AI tools, APIs, platforms,    │
│ market trends, competitor tools                    │
│                    ↓                               │
│ "What's New" notification in Settings              │
└───────────────────┬────────────────────────────────┘
                    ↓
┌─── MONTHLY ───────────────────────────────────────┐
│ Full report: new technologies, recommended         │
│ upgrades, cost/benefit analysis                    │
│                    ↓                               │
│ You review: Approve | Explore Later | Skip         │
│                    ↓                               │
│ Approved items → development tasks created         │
└───────────────────┬────────────────────────────────┘
                    ↓
┌─── QUARTERLY ─────────────────────────────────────┐
│ System roadmap: planned upgrades, new features,    │
│ technology migrations, channel additions           │
│                    ↓                               │
│ You approve roadmap → system updates over quarter  │
│                    ↓                               │
│ System stays current with best tools & processes   │
└────────────────────────────────────────────────────┘
```

---

## BUDGET BREAKDOWN

### API & Tools ($300-500/month)
| Service | Cost | What For |
|---------|------|----------|
| Claude API | $40-60 | All 32 agents text tasks |
| OpenAI DALL-E 3 | $20-30 | Image generation |
| Runway ML | $15-30 | Video generation |
| ElevenLabs | $5-10 | Voice narration |
| Hunter.io | $49 | 500 email lookups/month |
| Apollo | $0-49 | Prospect data (free tier to start) |
| SendGrid | $0-20 | Email delivery |
| **Total** | **$130-250** | Buffer: $50-370 for scaling |

### Campaign Budget ($600/month)
| Channel | Budget | Purpose |
|---------|--------|---------|
| LinkedIn Ads | $200 | B2B targeting cybersec executives |
| Facebook/Instagram Ads | $200 | Lead generation, retargeting |
| Google Ads | $200 | Search + display |

### Content Production Capacity
| Type | Monthly Volume | Cost |
|------|---------------|------|
| LinkedIn posts | 12-15 | ~$3 |
| Blog articles | 4-6 | ~$5 |
| Social graphics | 20-30 | ~$15 |
| Ad creatives | 10-15 | ~$10 |
| Short videos | 4-6 | ~$15 |
| Cold emails | 200-500 personalized | ~$10 |
| Proposals | 10-20 | ~$5 |
| Client reports | As needed | ~$3 |
| **Total** | **Massive volume** | **~$70/month** |

---

## BUILD TIMELINE

| When | What Gets Built |
|------|----------------|
| **This Week** | Complete system: all 6 sections, all 32 agents, clean database, all modes working |
| **Week 2** | System live. Team starts outreach. First prospects contacted. |
| **Week 3-4** | Meetings set. Call Intelligence coaching team. First proposals sent. |
| **Month 2** | Pipeline building. Clients closing. System proving itself. |
| **Month 3+** | 4+ clients. Budget expands. Replicate for clients. |

---

## MIGRATION TO PRIVATE SERVER

| Component | Technology |
|-----------|-----------|
| Frontend | React + Vite → any web server |
| Backend | Node.js + Express → Node.js 18+ |
| Database | PostgreSQL → PostgreSQL 14+ |
| Real-time | WebSocket → built into Node |

**Migration:** git clone → pg_dump → setup server → change ONE API gateway config → npm install → npm start → done.

---

## CLEAN START GUARANTEE

1. Fresh database — zero old data
2. 32 new agents replace 112 old agents
3. 6 sections replace 11 old domains
4. Every button works — no dead ends
5. Every workflow connects A-to-Z
6. Three modes fully functional at every level
7. No leftover complexity
8. No broken features
9. Simple, clear, functional

---

## AGENT SUMMARY

| # | Agent | Section | Primary Function |
|---|-------|---------|-----------------|
| 1 | Prospect Intelligence | Outreach | Find and profile prospects |
| 2 | Social Command Center | Outreach | Monitor all channels, unified inbox |
| 3 | Outreach Strategist | Outreach | Plan approach per prospect |
| 4 | Message Composer | Outreach | Write personalized messages |
| 5 | Follow-up Engine | Outreach | Track and schedule follow-ups |
| 6 | Outreach Analytics | Outreach | Measure and optimize outreach |
| 7 | Lead Qualification | CRM | Score and qualify leads |
| 8 | Deal Intelligence | CRM | Manage pipeline and deal health |
| 9 | Call Intelligence | CRM | Pre/during/post call coaching |
| 10 | Proposal & Contract | CRM | Create proposals and contracts |
| 11 | CRM Sync | CRM | Sync with GHL/HubSpot |
| 12 | Content Strategist | Marketing | Plan and create content |
| 13 | Advertising | Marketing | Create ad campaigns |
| 14 | SEO & Growth | Marketing | Keyword research and optimization |
| 15 | Campaign Orchestrator | Marketing | Coordinate multi-channel campaigns |
| 16 | Competitor Intelligence | Marketing | Monitor and analyze competitors |
| 17 | Client Onboarding | Production | Onboard new clients |
| 18 | Client Marketing Analyst | Production | Audit client marketing |
| 19 | Creative Production | Production | Create images, videos, docs, branding |
| 20 | Client Lead Generator | Production | Generate 20 leads per client |
| 21 | Client Campaign & Funnel | Production | Build campaigns and funnels |
| 22 | Client Report | Production | Generate performance reports |
| 23 | Client Integration | Production | Sync with client CRMs |
| 24 | Content Quality | Production | Quality check all output |
| 25 | Operations Manager | Admin | Assign tasks, track team |
| 26 | Knowledge & Document | Admin | Maintain SOPs and knowledge |
| 27 | Executive Briefing | Admin | Morning briefings, risk alerts |
| 28 | System Evolution | Admin | Monitor market, suggest updates |
| 29 | Billing & Revenue | Finance | Invoicing, payments, wallet |
| 30 | Contract & Expense | Finance | Contracts, expenses, forecasting |
| 31 | Legal & Compliance | Cross-System | Anti-spam, GDPR, contracts |
| 32 | Video Guide | Cross-System | Step-by-step system tutorials |

---

**This is the final blueprint v3.0. Complete. Enriched. Every button works. Every workflow connects. Every agent has a clear job. Clean start from zero. Ready to build.**
