# PMG GROUP OS — FINAL BLUEPRINT v2.0

---

## THE COMPANY

**PMG Group LLC** is a niche digital marketing agency that exclusively serves cybersecurity and IT sector companies. PMG helps these companies get more clients through digital marketing. PMG does NOT do cybersecurity work — PMG does marketing FOR cybersecurity/IT companies.

**Core Promise:** "We generate 20 ready-to-close deals in your first month."

**Business Model:**
1. PMG finds cybersecurity/IT companies struggling to get clients
2. PMG reaches out through every available channel (LinkedIn, email, cold call, social media, ads)
3. PMG uses both Inbound (prospects come to PMG) and Outbound (PMG goes to prospects)
4. PMG closes them as clients
5. PMG analyzes the client's marketing, finds what's broken, fixes it
6. PMG generates leads for the client using the same system
7. Client CRM options: PMG's own CRM (premium) or GHL/HubSpot integration (extra charge)
8. PMG has a partner company providing closers — some leads go to their GHL sub-account pipeline
9. Future: White-label the system for other agencies and sectors

**Starting Budget:** $300-400/month
**Scale Plan:** After 4 clients, expand budget and allocate campaign funds

---

## SYSTEM PRIORITY

**The system focuses on generating leads for PMG Group FIRST.** Client features come second. The pipeline:

```
PMG gets its own clients FIRST
         ↓
PMG proves the system works
         ↓
PMG replicates for clients
         ↓
PMG white-labels for other agencies
```

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│                                                                     │
│  Sidebar: Outreach | CRM | Marketing | Production | Admin | Finance│
│           Settings (gear icon at bottom)                            │
│           Guide videos embedded in each section                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                        BACKEND (Express + Node.js)                  │
│                                                                     │
│  ┌────────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ AI ENGINE  │  │ WALLET    │  │ EVENT BUS │  │ STATE        │   │
│  │ Claude +   │  │ Balance   │  │ Pub/Sub   │  │ MACHINE      │   │
│  │ OpenAI     │  │ Billing   │  │ Connects  │  │ Lead/Deal    │   │
│  │            │  │ Limits    │  │ Everything│  │ Lifecycle    │   │
│  └────────────┘  └───────────┘  └───────────┘  └──────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    32 PhD-LEVEL AI AGENTS                    │  │
│  │              Claude (primary) + OpenAI (secondary)           │  │
│  │              via Single API Gateway                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                        DATABASE (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────────┤
│                     EXTERNAL INTEGRATIONS                           │
│  LinkedIn | Sales Nav | Facebook | Instagram | X | YouTube | TikTok│
│  Email (Gmail/Outlook) | Slack | Hunter.io | Apollo | Google Ads   │
│  GoHighLevel (+ sub-accounts) | HubSpot | Stripe | Zoom           │
│  DALL-E 3 | Runway ML | ElevenLabs | Ahrefs/SEMrush               │
│  + Any future platform that can bring leads                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Single API Gateway
```
PMG OS → One API Gateway → All Services

On Replit:        Gateway → Replit manages costs
On Private Server: Gateway → PMG's own API keys (one config change)
```

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
│  ⚙️  Settings          [?]   │
└──────────────────────────────┘

[?] = Guide button — plays step-by-step video explainer for that section
```

**Section Flow:**
- Outreach finds prospects → they flow into CRM as leads
- CRM tracks leads, scores them, closes deals → closed clients move to Production
- Marketing drives inbound leads → they also flow into CRM
- Production delivers work for clients → Finance invoices for it
- Admin manages the team doing all of this
- Finance tracks money in and out

---

## AI ENGINE

| Role | Engine | Why |
|------|--------|-----|
| Primary (all text tasks) | **Claude (Anthropic)** | Natural human tone, no AI fluff, better reasoning, follows complex instructions |
| Image generation | **OpenAI DALL-E 3** | Best API-available image generation |
| Video generation | **Runway ML** | Cinematic realistic video from text/images |
| Voice/narration | **ElevenLabs** | Most natural AI voices |
| Fallback | **OpenAI GPT-4o** | When Claude is unavailable |

### Content Quality Standard
All AI output enforces:
- Human tone — sounds like a real person wrote it
- Zero AI fluff — no "leverage", "cutting-edge", "revolutionary", "game-changing"
- Clarity and realism — honest, direct, factual
- No marketing tricks — real value, real promises only
- Cinematic visual quality — not template-looking, eye-catching, scroll-stopping

---

## THREE OPERATING MODES — FULLY FUNCTIONAL

| Mode | What Happens | Best For |
|------|-------------|----------|
| **AI Autonomous** | Agents run automatically. Results appear for review after. | Routine tasks like lead scoring, data enrichment |
| **Hybrid** (Default) | Agents prepare everything. High confidence auto-executes. Low confidence waits for your approval. | Most daily work — AI assists, you decide |
| **Human Controlled** | AI completely off. You do everything manually. System only tracks data. | Sensitive clients, full manual control |

### Mode Levels
| Level | Controls | Example |
|-------|---------|---------|
| Global | Default for entire system | "Set everything to Hybrid" |
| Per Section | Override for one section | "CRM scoring runs in AI Autonomous" |
| Per Agent | Override for one agent | "Message Composer stays in Hybrid" |
| Per Record | Override for one lead/deal/client | "Client ABC runs in Human mode" |

### Pending Actions Queue (Hybrid Mode)
When confidence is low, action lands in queue:
- You see: "Agent drafted LinkedIn message to John Smith. Confidence: 73%"
- Options: **Approve** | **Edit then Approve** | **Reject** | **Delegate to team member**

---

## THE 32 PhD-LEVEL AGENTS

---

### SECTION 1: OUTREACH — 6 Agents

**Purpose:** Find cybersecurity/IT companies that need marketing help. Reach out through every channel. Get them into CRM.

#### Agent 1: Prospect Intelligence Agent
**Role:** Senior Market Research Analyst
- Finds cybersecurity/IT companies matching PMG's ideal client profile
- Uses Hunter.io, Apollo, LinkedIn, web research, job boards, news
- Builds company profiles: size, revenue, marketing presence, tech stack, decision makers
- Detects buying signals: hiring marketers? weak website? no social? bad ads?
- Scores each prospect: Fit Score (0-100) + Accessibility Score (0-100)
- Outputs ranked prospect list with verified contact details and approach strategy

#### Agent 2: Social Command Center Agent (Replaces Ulinc — $78/month saved)
**Role:** Omnichannel Communications Manager
- Manages ALL connected social media platforms from one dashboard
- Monitors: LinkedIn messages, Facebook inbox, Instagram DMs, X mentions, YouTube comments, TikTok comments, email replies, website forms, Slack channels
- Classifies every incoming message: Hot Lead | Warm Inquiry | Cold Question | Spam
- Detects buyer signals: urgency, budget mentions, timeline, competitor mentions
- Prepares response drafts for each message — you review and send manually (no auto-sending, no account bans)
- Tracks campaign performance across all channels: which brings most leads at lowest cost
- Alerts team immediately for high-value responses
- Unified inbox: all platforms, one view
- **For LinkedIn specifically:** Prepares connection requests, follow-up messages, InMail drafts. You send them yourself from LinkedIn/Sales Navigator. Tracks who accepted, who replied, who ignored.

#### Agent 3: Outreach Strategist Agent
**Role:** Senior Business Development Strategist
- Analyzes each prospect and determines best approach: LinkedIn DM, email, phone, or multi-touch
- Maps decision-making chain: CEO, CTO, Marketing Director — who to contact first
- Identifies prospect-specific pain points from their public presence
- Crafts positioning angle: why PMG solves their exact problem
- Plans multi-step sequences: Day 1 LinkedIn → Day 3 follow-up → Day 7 email → Day 14 call
- Guides team on setting up new social media accounts for outreach (step-by-step)

#### Agent 4: Message Composer Agent
**Role:** Senior Copywriter — Persuasive Communication Expert
- Writes personalized outreach messages for every channel — NEVER generic templates
- LinkedIn connection requests that feel genuine and reference specific business details
- Cold emails with high open-rate subject lines and prospect-specific body copy
- Cold call scripts with objection handling:
  - "We already have an agency" → scripted response
  - "No budget" → scripted response
  - "We do it in-house" → scripted response
  - "Send me info" → script to convert to meeting
- Social media response drafts for Facebook, Instagram, X
- Adapts tone per audience: C-Suite (strategic), IT Directors (technical), Marketing Managers (results)
- **Zero spam:** Every message is personalized, compliant, and respects opt-out

#### Agent 5: Follow-up Engine Agent
**Role:** Client Engagement Specialist
- Tracks every outreach attempt across all channels
- Schedules follow-ups based on optimal timing (research-backed: best days/times for cybersec executives)
- Drafts follow-up messages referencing previous touchpoints
- Escalation: after 3 attempts on one channel → switch to another
- Detects signals: profile view = warm (follow up now), email opened 3x = interested (call them)
- Flags leads ready for CRM handoff

#### Agent 6: Outreach Analytics Agent
**Role:** Performance Analyst
- Measures everything: reply rates, open rates, connection acceptance per channel
- Identifies winning messages: "Case study template has 34% reply rate vs 8% for intro template"
- Team activity tracking: who sent what, who followed up, who has best conversion
- Weekly outreach report with clear actions: "Increase LinkedIn, reduce cold email volume"
- Budget allocation suggestions based on ROI per channel
- Tracks PMG's outreach first — client outreach reporting added later

---

### SECTION 2: CRM — 5 Agents

**Purpose:** Track leads from all channels. Score, qualify, and move through pipeline. Close deals. Sync with GHL sub-accounts when needed.

#### Agent 7: Lead Qualification Agent
**Role:** Senior Sales Intelligence Analyst
- Every lead from every channel automatically lands here
- Scores on 5 dimensions (weighted):
  1. Company Fit (30%): size, industry, revenue match
  2. Marketing Need (25%): how badly they need marketing help
  3. Budget Likelihood (20%): can they afford PMG's services
  4. Timing Urgency (15%): hiring signals, contract renewals, growth indicators
  5. Authority Level (10%): is our contact the decision maker
- Categories: 🔥 Hot (80+) | 🟡 Warm (50-79) | ❄️ Cold (20-49) | 🚫 Disqualified (<20)
- Explains reasoning: "Scored 87 because: 500-employee cybersec firm, no marketing team, just raised $10M"

#### Agent 8: Deal Intelligence Agent
**Role:** Senior Sales Strategy Consultant
- Pipeline stages: New Lead → Meeting Set → Discovery Call → Proposal Sent → Negotiation → Closed Won/Lost
- Deal Health Score: 🟢 Green (on track) | 🟡 Yellow (needs attention) | 🔴 Red (at risk)
- Risk detection: champion silent, competitor mentioned, budget objection
- Exact next step recommendation: "Send ROI calculator to Sarah by Thursday"
- Win/loss analysis: patterns in won vs lost deals

#### Agent 9: Call Intelligence Agent
**Role:** Senior Sales Coach & Meeting Analyst
- **Before call:** Full briefing — who they are, their pain points, what to pitch, objection cards
- **During call:** Coaching cards open on screen — "If they say X, respond with Y"
  - Key questions to ask at each conversation stage
  - Buying signals to watch for
  - Red flags to catch
- **After call:** Team uploads Zoom transcript (Zoom's free transcription) → AI analyzes:
  - Key decisions and action items extracted
  - Sentiment analysis: positive, neutral, concerned
  - Deal stage recommendation update
  - Follow-up email drafted automatically
  - Call score: "Covered 7/10 key points. Missed: pricing justification"
- **Over time:** Learns what works → improves coaching cards
- Helps non-expert team perform like expert closers

#### Agent 10: Proposal & Contract Agent
**Role:** Senior Business Development Manager
- Generates customized proposals based on discovery findings:
  - Scope tailored to prospect's specific marketing gaps
  - Timeline: "Month 1: Audit + 20 leads. Month 2: Full campaign launch"
  - Pricing tiers: Starter | Growth | Enterprise
  - Relevant case studies and ROI projections
- Tracks: Sent → Viewed → Under Review → Accepted → Rejected
- If rejected: analyzes why, suggests adjusted proposal
- Generates contracts from accepted proposals
- Manages renewals (alerts 60 days before expiration)

#### Agent 11: CRM Sync Agent
**Role:** Senior Integration Architect
- Syncs PMG's CRM with:
  - **GHL main account** — PMG's own GoHighLevel
  - **GHL sub-accounts** — Partner company's pipeline (for closer service projects)
  - **HubSpot** — Client CRM sync when chosen
- Bidirectional: changes in either system update the other
- Custom field mapping per integration
- Handles OAuth, token refresh, error recovery
- **GHL Sub-account feature:** Specific leads/deals can be flagged to sync to the partner company's GHL sub-account pipeline. Configurable per project.

---

### SECTION 3: MARKETING — 5 Agents

**Purpose:** Promote PMG Group's services. Drive inbound leads. Manage content across all channels. Later: replicate for clients.

#### Agent 12: Content Strategist Agent
**Role:** Senior Content Director
- Plans content calendar across ALL channels:
  - LinkedIn: 3 posts/week (thought leadership, case studies, insights)
  - Facebook/Instagram: 5 posts/week (visuals, testimonials, behind-scenes)
  - Blog: 2 articles/month (SEO-optimized, cybersec marketing topics)
  - X: Daily industry commentary
  - YouTube: 2 videos/month (educational, case studies)
  - TikTok: Short-form awareness content
  - Email newsletter: Bi-weekly
- Writes all content with PMG brand voice: authoritative, data-driven, honest
- Content repurposing: 1 blog → LinkedIn article → 5 social posts → email → video script
- Tracks performance and adjusts strategy

#### Agent 13: Advertising Agent
**Role:** Senior Paid Media Strategist
- Creates complete ad campaigns for every platform:
  - Facebook/Instagram: carousel, video, lead form ads
  - LinkedIn: sponsored content, InMail, conversation ads
  - Google: search + display + retargeting
  - YouTube: pre-roll and discovery ads
- Prepares EVERYTHING: copy, targeting, budget, landing page content
- Multiple variations for A/B testing
- Team reviews and launches — system never auto-publishes
- Tracks performance: cost per lead, cost per meeting, ROAS
- Optimization: "Shift $200 from Facebook to LinkedIn — half the cost per lead"
- **Budget-aware:** Works within $300-400 starting budget, scales with revenue

#### Agent 14: SEO & Growth Agent
**Role:** Senior SEO Strategist
- Keyword research for cybersecurity marketing niche
- Website audit: technical SEO, on-page, content gaps
- Monthly action plan: target keywords, fix issues, write articles
- Tracks rankings and organic traffic
- Backlink strategy: guest posts, partnerships, PR
- Identifies highest-converting pages and doubles down

#### Agent 15: Campaign Orchestrator Agent
**Role:** Senior Growth Marketing Manager
- Coordinates multi-channel campaigns working together
- Plans timelines: Week 1 awareness → Week 2 engagement → Week 3 conversion
- A/B tests messaging, audiences, formats across channels
- Tracks full journey: impression → visit → form → lead → meeting → client
- Reallocates budget to highest-performing channels
- Weekly campaign report with recommendations
- Manages funnels: top (awareness) → middle (nurture) → bottom (conversion)

#### Agent 16: Competitor Intelligence Agent
**Role:** Senior Competitive Intelligence Analyst
- Monitors competitor agencies serving cybersecurity sector
- Tracks their content, ads, pricing, positioning
- Identifies gaps: what competitors aren't doing that PMG can exploit
- Creates competitive battle cards for sales calls
- Alerts on competitor moves
- Quarterly competitive landscape report

---

### SECTION 4: PRODUCTION — 8 Agents

**Purpose:** Create all content and creative assets for PMG and clients. Deliver client work. Everything downloadable with preview.

#### Agent 17: Client Onboarding Agent
**Role:** Senior Client Success Manager
- Step-by-step onboarding for new clients:
  1. Collect brand assets (logo, colors, fonts, guidelines)
  2. Get access (website, socials, analytics, CRM)
  3. Define target audience
  4. Document services offered
  5. Set goals (leads, revenue, growth targets)
  6. Choose CRM: PMG CRM (included) or GHL/HubSpot (extra)
  7. If GHL sub-account needed: configure partner pipeline sync
- Creates client brand profile
- Generates initial marketing audit
- Creates 90-day success plan
- Sets up client's Slack channel

#### Agent 18: Client Marketing Analyst Agent
**Role:** Senior Marketing Strategist
- Deep-dives into client's current marketing:
  - Website: SEO, conversion rate, UX, content quality
  - Social: followers, engagement, posting frequency per platform
  - Paid ads: spend, targeting, quality, conversions
  - Email: list size, open rates, nurture sequences
  - Competitors: who else serves their market
- Identifies exactly WHY they're not getting clients:
  - "Website ranks for zero keywords"
  - "LinkedIn has 47 followers and no content"
  - "Google Ads landing page has no form"
- Creates prioritized fix-it plan
- Monthly progress updates

#### Agent 19: Creative Production Agent
**Role:** Senior Creative Director — Multi-format Content Production

This agent manages ALL creative output. Everything is cinematic quality, human-catching, zero AI template look.

**Text-to-Image Products:**
| Product | Tool | Download Formats |
|---------|------|-----------------|
| Social media graphics | DALL-E 3 | PNG, JPG, WebP |
| Ad creatives | DALL-E 3 | PNG, JPG (1080x1080, 1200x628, 1080x1920) |
| Blog header images | DALL-E 3 | PNG, JPG (1200x630) |
| Infographics | DALL-E 3 + Claude | PNG, PDF |
| Logo concepts | DALL-E 3 | PNG (transparent), SVG |
| Brand assets | DALL-E 3 | PNG, JPG, PDF |
| Thumbnails | DALL-E 3 | PNG, JPG (1280x720) |

**Text-to-Video Products:**
| Product | Tool | Download Formats |
|---------|------|-----------------|
| Social media clips | Runway ML | MP4 (15-60 sec, 1080p) |
| Ad videos | Runway ML + ElevenLabs | MP4 (15-30 sec, 1080p) |
| Explainer videos | Runway ML + ElevenLabs | MP4 (2-5 min, 1080p) |
| Product demos | Runway ML | MP4 (1-3 min, 1080p) |
| Cinematic brand video | Runway ML | MP4 (30-60 sec, 4K) |

**Document Products:**
| Product | Tool | Download Formats |
|---------|------|-----------------|
| Proposals | Claude + styled HTML | PDF, HTML |
| Presentations/Decks | Claude + React slides | PDF, PPTX |
| Case studies | Claude + DALL-E | PDF |
| Whitepapers/Guides | Claude | PDF, DOCX |
| One-pagers | Claude + DALL-E | PDF |
| Reports | Claude | PDF, CSV |

**Branding Package Products:**
| Product | Tool | Download Formats |
|---------|------|-----------------|
| Logo variations | DALL-E 3 | PNG, SVG, PDF |
| Color palette | Claude | PDF, JSON |
| Typography guide | Claude | PDF |
| Brand guidelines | Claude + DALL-E | PDF |
| Social media kit | DALL-E 3 | PNG pack (all sizes) |
| Email signature | Claude + HTML | HTML, PNG |

**How It Works in the System:**
1. Click "Create" → choose type (Image, Video, Document, Branding, Presentation)
2. Describe what you want in plain language
3. Agent creates it using the appropriate AI tool
4. Preview appears in the system
5. Options: Download (all formats) | Edit | Approve | Publish to channel | Share with client
6. All items stored in **Content Library** with status: Draft → Review → Approved → Published

#### Agent 20: Client Lead Generator Agent
**Role:** Senior Growth Specialist
- THE CORE PROMISE — generates 20 ready-to-close leads monthly per client
- Researches client's target market
- Finds prospects using all available data sources
- Each lead includes: company name, decision maker, verified contact, pain points, approach strategy
- Quality guarantee: only delivers leads scoring 80+ on qualification
- Delivers leads with context: "TechSecure needs endpoint security consulting — vendor contract expires in 2 months"

#### Agent 21: Client Campaign & Funnel Agent
**Role:** Senior Digital Campaign Manager + Conversion Specialist
- Builds campaigns for client's channels (ads, content, email sequences)
- Creates landing page content (headlines, copy, forms, CTAs)
- Designs sales funnels: Ad → Landing Page → Lead Capture → Email Nurture → Sales Call
- A/B tests funnel elements
- Tracks: visitor → lead → meeting → client conversion rates
- Prepares everything — client team launches manually

#### Agent 22: Client Report Agent
**Role:** Senior Business Intelligence Analyst
- Weekly/monthly automated reports for clients:
  - Executive Summary: top-line numbers
  - Lead Report: generated, qualified, meetings set, deals closed
  - Content Report: posts published, engagement, traffic
  - Campaign Report: ad spend, clicks, conversions, ROI
  - Pipeline Report: deal stages, revenue forecast
- Two formats: Executive (1-page for C-suite) | Detailed (full data for marketing managers)
- Progress tracking against "20 deals in first month" promise
- ROI calculation: "PMG generated $150K pipeline from $5K spend — 30x ROI"
- Exportable as PDF

#### Agent 23: Client Integration Agent
**Role:** Senior Integration Engineer
- Manages PMG ↔ Client CRM connections:
  - GoHighLevel (main accounts and sub-accounts)
  - HubSpot
- Bidirectional sync: leads, contacts, pipeline, activities
- Custom field mapping per client
- Error handling, retry queue, conflict resolution
- Sync health dashboard
- **GHL Sub-account support:** For partner company projects, pushes leads to specific sub-account pipeline

#### Agent 24: Content Quality Agent
**Role:** Senior Quality Assurance Editor
- Reviews ALL creative output before it goes out:
  - No AI fluff or jargon — must sound human
  - Brand consistency — correct logos, colors, voice
  - Factual accuracy — no false claims or exaggerated promises
  - Platform compliance — correct sizes, formats, character limits
  - Grammar, spelling, formatting
- Scores quality: Ready to Publish | Needs Minor Edits | Needs Rewrite
- Tracks quality metrics per team member and per content type

---

### SECTION 5: ADMIN — 4 Agents

**Purpose:** Manage team, tasks, documents, quality. Keep operations running smoothly.

#### Agent 25: Operations Manager Agent
**Role:** Senior Operations Director
- Assigns tasks based on skills, workload, availability, urgency
- Daily action plans: "John: call these 5 leads. Sarah: publish these 3 posts."
- Tracks completion, flags overdue items
- Escalates when deadlines are at risk
- Team productivity dashboard
- Posts to Slack: task updates, morning briefings, alerts

#### Agent 26: Knowledge & Document Agent
**Role:** Senior Knowledge Manager
- Creates and maintains: SOPs, playbooks, templates, training materials
- Searchable knowledge base: "How do I onboard a client?" → instant answer
- Auto-captures learnings: won deal → "What worked?" added to knowledge
- Version control on all documents
- Team can contribute knowledge, agent organizes it

#### Agent 27: Executive Briefing Agent
**Role:** Chief of Staff
- **Morning briefing:** overnight activity, urgent items, today's priorities
- **Weekly summary:** pipeline health, team performance, client status, revenue
- **Risk alerts:** overdue tasks, at-risk deals, budget warnings, system issues
- Posts to dashboard and Slack

#### Agent 28: System Evolution Agent
**Role:** Technology Scout & Innovation Advisor
- Monitors the market for:
  - New AI tools and capabilities
  - New social media platforms with lead potential
  - New marketing technologies and trends
  - Competitor tool updates
  - API changes from connected services
- Weekly "What's New" report:
  - "New LinkedIn feature allows company page carousels — should we add support?"
  - "Runway ML released version 4 — video quality improved, should we upgrade?"
  - "New platform [X] is trending in B2B — 40% of cybersecurity companies are there now"
- You review and decide: Adopt | Explore Later | Skip
- Ensures the system never falls behind — always adopting the best tools and processes

---

### SECTION 6: FINANCE — 2 Agents

**Purpose:** Invoice clients, track expenses, manage wallet, forecast revenue.

#### Agent 29: Billing & Revenue Agent
**Role:** Senior Financial Controller
- Creates professional invoices: one-time, recurring, usage-based
- Payment tracking: Draft → Sent → Viewed → Paid → Overdue
- Payment reminders at 7, 14, 30 days overdue
- Revenue dashboard: MRR, revenue per client, growth trend
- Payment risk flags: "Client X is 45 days overdue on $3,500"
- Client profitability: revenue minus cost to serve
- AI wallet management: balance, spend limits, cost-per-action, alerts
- **Budget mode:** Works within $300-400 starting budget, auto-scales limits as revenue grows

#### Agent 30: Contract & Expense Agent
**Role:** Senior Finance & Legal Operations Manager
- Drafts service agreements per package (scope, deliverables, SLAs, payment terms)
- Contract lifecycle: start date, end date, renewal alerts (60 days before)
- Upsell suggestions based on client performance
- Expense tracking: tools, ads, salaries, AI costs, subscriptions
- Monthly expense report + budget vs actual
- Revenue forecasting: projects based on pipeline and close rates
- Scenario modeling: "If we close 3 more deals, revenue hits $X"

---

### ADDITIONAL AGENTS (Beyond the 6 Sections)

#### Agent 31: Legal & Compliance Agent
**Role:** Senior Legal & Compliance Officer
**Lives in:** Settings > Legal & Compliance (accessible from all sections)

- **Communication compliance:**
  - CAN-SPAM compliance for all emails (unsubscribe links, physical address, opt-out handling)
  - GDPR compliance for European contacts (consent tracking, data deletion rights)
  - TCPA compliance for calls/SMS (do-not-call list checking, calling hours)
  - Platform-specific rules: LinkedIn connection limits, Facebook messaging policies, Instagram DM rules
- **Contract compliance:**
  - Reviews contracts for missing clauses, unfavorable terms, legal risks
  - NDA template management
  - Terms of service for clients
  - Data processing agreements (DPA) for handling client data
- **Anti-spam enforcement:**
  - Rate limiting on all outbound communications
  - Warm-up sequences for new email accounts
  - Bounce rate monitoring — auto-pauses if bounce rate exceeds 5%
  - Blacklist monitoring for email domains
  - Platform sending limits enforced (LinkedIn: max X connections/day)
- **Data protection:**
  - Contact opt-out management across all channels
  - Data retention policies
  - Right to deletion processing
  - Audit trail for all communications
- **Advertising compliance:**
  - No false claims in ads
  - Required disclaimers
  - Platform ad policy compliance (Facebook, Google, LinkedIn ad rules)
- Generates compliance reports monthly
- Alerts immediately if any violation detected

#### Agent 32: Video Guide Agent
**Role:** Interactive Training Coach
**Lives in:** Every section (accessible via [?] guide button)

- Creates and manages step-by-step video guides for every section
- Each guide is built using animated HTML/React (not external videos — loads instantly)
- Guides are interactive: "Click here to see how to create a lead" → highlights the button
- Updates automatically when new features are added
- Section-by-section guide content:

| Section | Guide Covers |
|---------|-------------|
| Outreach | How to add prospects, use Social Command Center, review AI messages, track follow-ups, connect channels |
| CRM | How leads flow in, scoring, pipeline stages, approving actions, coaching cards, GHL sync |
| Marketing | Content creation, campaign planning, publishing flow, performance tracking |
| Production | Creating images/videos/documents, Content Library, downloading, client deliverables |
| Admin | Task management, SOPs, team tracking, morning briefings |
| Finance | Invoicing, payments, wallet management, expense tracking |
| Settings | Connecting channels, user roles, AI modes, spend limits, integrations |

---

## SETTINGS TAB

| Section | What's In It |
|---------|-------------|
| **General** | Company name, logo, branding, timezone |
| **Connected Channels** | All social/tool connections — add, remove, check status, setup guides |
| **AI Configuration** | Global mode (Auto/Hybrid/Human), per-section overrides, per-agent toggles |
| **Wallet & Billing** | Balance, fund, spend limits (daily/monthly/per-action/per-section), usage history |
| **User Management** | Add/remove users, assign roles (Super Admin, Admin, Manager, Viewer) |
| **Integrations** | GHL (main + sub-accounts), HubSpot, Slack |
| **Legal & Compliance** | Compliance settings, opt-out lists, rate limits, GDPR/CAN-SPAM config |
| **White Label** | Custom branding for client portals/reports (future) |
| **Notifications** | In-app, email, Slack alert preferences |
| **System Health** | Agent status, API health, database stats |

---

## USER ROLES

| Role | Access |
|------|--------|
| **Super Admin** | Everything. Settings, billing, users, all data, modes, wallet, delete anything |
| **Admin** | Everything except system settings and billing. Manage users (not Super Admin) |
| **Manager** | Assigned sections only. Approve actions. Cannot change settings or manage users |
| **Viewer** | Read-only on assigned sections. Cannot create, edit, or delete. Good for clients |

---

## CONNECTED CHANNELS — Added Day by Day

### Phase 1 (Launch)
LinkedIn, Sales Navigator, Email (Gmail/Outlook), Slack

### Phase 2 (Month 1-2)
Facebook Page, Instagram, Google Ads, Website forms

### Phase 3 (Month 2-4)
X (Twitter), YouTube, TikTok, Google My Business

### Phase 4 (Ongoing)
Reddit, Quora, WhatsApp Business, Telegram, Podcasts, Webinars, any new platform with lead potential

Each channel has: Connect button → Setup wizard → Status indicator → Activity dashboard

---

## GHL SUB-ACCOUNT SUPPORT

PMG has a partner company providing closer services. For specific projects:
1. In CRM, flag a deal as "Partner Close" 
2. System pushes that lead/deal to partner company's GHL sub-account pipeline
3. Bidirectional sync: partner updates deal → PMG sees the update
4. Configurable per project — not all leads go to partner
5. Separate pipeline view for partner deals

---

## ANTI-SPAM SYSTEM

Built into every communication channel:

| Rule | What It Does |
|------|-------------|
| Rate limiting | Max messages per day per channel (configurable) |
| Warm-up | New email accounts start slow, gradually increase volume |
| Personalization required | Agent 4 never sends generic templates |
| Opt-out management | One-click unsubscribe, auto-removed from all lists |
| Bounce monitoring | Auto-pauses if bounce rate >5% |
| Domain health | Monitors email domain reputation |
| Platform limits | Enforces LinkedIn/Facebook/Instagram daily limits |
| Time windows | Only sends during business hours in recipient's timezone |
| People opt-in | System tracks consent for each contact per channel |

---

## MONTHLY COST BREAKDOWN (Starting at $300-400)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Claude API | ~$30-50 | Primary AI for all 32 agents, with caching |
| OpenAI DALL-E 3 | ~$10-20 | Image generation only |
| Runway ML | ~$15 | Video generation (basic plan) |
| ElevenLabs | $0-5 | Voice, free tier or starter |
| Hunter.io | $0 | Free tier: 25 lookups/month |
| Apollo | $0 | Free tier: 60 credits/month |
| SendGrid | $0 | Free: 100 emails/day |
| **AI/Tools Total** | **~$55-90** | |
| **Remaining for ads** | **~$210-345** | Campaign budget |

### Wallet Controls
- Daily limit: configurable (e.g., $3/day)
- Monthly limit: configurable (e.g., $90/month for AI)
- Per-action limits: max $0.10 per single AI call
- Per-section limits: Outreach $20/mo, Production $30/mo, etc.
- Alert at 80% of any limit
- Auto-pause at 100%

### After 4 Clients (~$8,000+/month revenue)
- Upgrade to paid tiers of Hunter.io, Apollo
- Increase video generation credits
- Increase campaign ad budgets
- Add premium AI features

---

## MIGRATION TO PRIVATE SERVER

| Component | Technology | Runs On Any Server |
|-----------|-----------|-------------------|
| Frontend | React + Vite | nginx or any web server |
| Backend | Node.js + Express | Node.js 18+ |
| Database | PostgreSQL | PostgreSQL 14+ |
| Real-time | WebSocket | Built into Node.js |

### Migration Steps:
1. `git clone` the code from Replit
2. `pg_dump` the database
3. Set up server (Ubuntu with Node.js + PostgreSQL)
4. Change API gateway: Replit proxy → direct API keys (ONE config change)
5. Set environment variables
6. `npm install` → `npm run build` → `npm start`
7. Done

---

## CLEAN START

When building the new system:
1. Wipe all existing data — fresh database, zero records
2. Remove all 112 old agents — replace with 32 new ones
3. Remove old 11-domain sidebar — replace with 6 sections + Settings
4. Remove broken features — no leftover complexity
5. Keep working engines: AI Mode, Wallet, Event Bus, State Machine
6. Simple workflow connections — no tangled dependencies
7. Every button, every feature must actually work end-to-end

---

## FINAL AGENT COUNT: 32

| Section | Count | Agents |
|---------|-------|--------|
| Outreach | 6 | 1. Prospect Intelligence, 2. Social Command Center, 3. Outreach Strategist, 4. Message Composer, 5. Follow-up Engine, 6. Outreach Analytics |
| CRM | 5 | 7. Lead Qualification, 8. Deal Intelligence, 9. Call Intelligence, 10. Proposal & Contract, 11. CRM Sync |
| Marketing | 5 | 12. Content Strategist, 13. Advertising, 14. SEO & Growth, 15. Campaign Orchestrator, 16. Competitor Intelligence |
| Production | 8 | 17. Client Onboarding, 18. Client Marketing Analyst, 19. Creative Production, 20. Client Lead Generator, 21. Client Campaign & Funnel, 22. Client Report, 23. Client Integration, 24. Content Quality |
| Admin | 4 | 25. Operations Manager, 26. Knowledge & Document, 27. Executive Briefing, 28. System Evolution |
| Finance | 2 | 29. Billing & Revenue, 30. Contract & Expense |
| Cross-System | 2 | 31. Legal & Compliance, 32. Video Guide |
| **TOTAL** | **32** | |

---

## BUILD PHASES

### Phase 1: PMG Lead Generation (Build First)
- Outreach section fully functional
- CRM with pipeline and scoring
- Social Command Center
- GHL sub-account sync for partner
- Call Intelligence (coaching cards + post-call analysis)
- Basic Settings (channels, users, modes)

### Phase 2: Marketing & Content
- Marketing section with content creation
- Production: text content + images
- SEO tools
- Campaign preparation

### Phase 3: Client Delivery
- Full Production section with video/branding
- Client onboarding and reporting
- GHL/HubSpot integration for clients
- Content Library with downloads

### Phase 4: Advanced Features
- Video generation (Runway ML)
- Funnel builder (templates)
- Video guide system
- System Evolution agent
- White-label preparation

---

This is the final blueprint v2.0. Review and guide me on next steps.
