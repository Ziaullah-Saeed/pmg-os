# PMG GROUP OS — FINAL BLUEPRINT v1.0

---

## WHAT I UNDERSTAND — THE COMPLETE PICTURE

### Who Is PMG Group LLC?
PMG Group LLC is a **niche digital marketing agency** that exclusively serves **cybersecurity and IT sector** organizations and companies. PMG does NOT do cybersecurity work — PMG helps cybersecurity/IT companies get more clients through digital marketing.

### The Core Promise
"We generate 20 ready-to-close deals in your first month."

### How The Business Works
1. PMG finds cybersecurity/IT companies that are struggling to get clients
2. PMG reaches out through EVERY channel — LinkedIn, Sales Navigator, Ulinc, cold email, cold calling, Facebook, Instagram, X (Twitter), YouTube, TikTok, Google, and any platform that can bring leads
3. PMG uses both **Inbound** (prospects come to PMG) and **Outbound** (PMG goes to prospects)
4. PMG closes them as clients
5. PMG analyzes the client's marketing pipeline, identifies what's broken, and fixes it
6. PMG generates leads for the client using the same system PMG used to get them
7. PMG offers clients 2 CRM options:
   - **Option A:** PMG's own CRM (premium package, no extra charges)
   - **Option B:** Integration with client's GoHighLevel or HubSpot (extra charge)
8. Eventually PMG **white-labels** the entire system for other agencies and sectors

### What PMG Group OS Must Be
- An AI-native business operating system that runs PMG's entire operation
- **6 main sections** in the sidebar: Outreach → CRM → Marketing → Production → Admin → Finance
- Plus **Settings** (channels, users, AI modes, wallet, integrations)
- **30 PhD-level AI agents** (not 112) — each one handles multiple tasks, no overlap, no confusion
- **3 operating modes:** AI Autonomous, Hybrid, Human Controlled — all fully functional
- **Manages everything** from creating social media accounts to launching campaigns
- **Any social media or tool** that can bring leads should be connectable — added day by day
- **Slack channel management** included
- **Clean start from zero** — no leftover data or complexity from the old system
- **Migration-ready** — can be copied to PMG's private server with one API gateway change
- **AI content production** including cinematic/realistic video and image generation

### API Gateway Model
PMG pays Replit → Replit manages ALL API costs (OpenAI, Hunter.io, Apollo, etc.) through one gateway. When migrating to a private server, this single gateway endpoint changes to PMG's own API gateway — everything else stays the same.

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                     │
│                                                                 │
│  ┌──────────┐ ┌─────┐ ┌───────────┐ ┌──────────┐ ┌─────┐ ┌───────┐ │
│  │ Outreach │ │ CRM │ │ Marketing │ │Production│ │Admin│ │Finance│ │
│  └────┬─────┘ └──┬──┘ └─────┬─────┘ └────┬─────┘ └──┬──┘ └───┬───┘ │
│       │          │          │             │          │        │     │
│       └──────────┴──────────┴──────┬──────┴──────────┴────────┘     │
│                                    │                                │
│                          Settings (gear icon)                       │
│                    Channels | Users | AI Modes | Wallet             │
├────────────────────────────────────┼────────────────────────────────┤
│                          API LAYER                                  │
│                    (Express + REST + WebSocket)                     │
├────────────────────────────────────┼────────────────────────────────┤
│                       CORE ENGINES                                  │
│                                                                     │
│  ┌──────────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ AI MODE      │  │ WALLET    │  │ EVENT BUS │  │ STATE       │  │
│  │ ENGINE       │  │ ENGINE    │  │ (Pub/Sub) │  │ MACHINE     │  │
│  │ (3 modes)    │  │ (billing) │  │           │  │ (lifecycle) │  │
│  └──────────────┘  └───────────┘  └───────────┘  └─────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              30 PhD-LEVEL AI AGENTS                          │  │
│  │        (via single API Gateway → OpenAI/tools)              │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                    DATABASE (PostgreSQL)                             │
├─────────────────────────────────────────────────────────────────────┤
│                  EXTERNAL INTEGRATIONS                              │
│  LinkedIn | Sales Nav | Ulinc | Facebook | Instagram | X(Twitter)  │
│  YouTube | TikTok | Google Ads | Slack | Email (Gmail/Outlook)     │
│  Hunter.io | Apollo | GoHighLevel | HubSpot | Stripe              │
│  Runway/Pika (video) | DALL-E/Midjourney (images)                  │
│  ANY future platform that can bring leads                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SIDEBAR STRUCTURE

```
┌──────────────────────────┐
│  PMG GROUP OS            │
│  ─────────────────────── │
│                          │
│  📡  Outreach            │
│  👥  CRM                 │
│  📢  Marketing           │
│  🎬  Production          │
│  📋  Admin               │
│  💰  Finance             │
│                          │
│  ─────────────────────── │
│  ⚙️  Settings            │
└──────────────────────────┘
```

Each section flows into the next:
- Outreach finds prospects → they flow into CRM as leads
- CRM closes deals → clients move to Production
- Marketing drives inbound leads → they flow into CRM
- Production delivers work → Finance invoices for it
- Admin manages the team doing all of this

---

## THE 30 PhD-LEVEL AI AGENTS — FINAL VERSION

### OUTREACH — 6 Agents

#### Agent 1: Prospect Intelligence Agent
**Role:** Senior Market Research Analyst with PhD in Data Science
**Expertise:** Cross-platform prospect identification, verification, and profiling

**What It Does:**
- Identifies cybersecurity/IT companies that need marketing help using ALL available data sources
- Cross-references Hunter.io, Apollo, LinkedIn, company websites, job boards, news, social media
- Builds comprehensive company profiles:
  - Company size, revenue estimate, employee count
  - Current marketing presence (website quality, SEO ranking, social followers, ad spend)
  - Tech stack and services they offer
  - Decision makers with verified contact details (email, phone, LinkedIn)
  - Buying signals: hiring marketers? Running weak ads? Poor website? No social presence?
- Scores each prospect on two axes:
  - **Fit Score** (0-100): How well do they match PMG's ideal client?
  - **Accessibility Score** (0-100): How easy is it to reach decision makers?
- Outputs: Ranked prospect list with full profiles, contact details, and recommended approach
- Works with: Hunter.io API, Apollo API, LinkedIn data, web scraping, OpenAI analysis

#### Agent 2: Channel Intelligence Agent
**Role:** Senior Omnichannel Communications Analyst
**Expertise:** Multi-platform monitoring, message classification, unified inbox management

**What It Does:**
- Monitors ALL connected channels in real-time:
  - LinkedIn: messages, connection requests, post engagement, InMail replies
  - Sales Navigator: saved lead activity, search results
  - Ulinc: automation campaign status, response tracking
  - Facebook: page inbox, comments, ad responses, Messenger
  - Instagram: DMs, story replies, comment mentions
  - X (Twitter): DMs, mentions, replies
  - YouTube: comments on videos, community posts
  - TikTok: comments, DMs
  - Email: inbox monitoring for cold email replies
  - Website: form submissions, chat widget messages
  - Slack: manages PMG's internal Slack channels — posts updates, routes alerts, enables team communication
  - Any future channel added
- Classifies every incoming message:
  - 🔥 Hot Lead (ready to buy, asking about services)
  - 🟡 Warm Inquiry (interested, needs nurturing)
  - ❄️ Cold Question (general question, not buying)
  - 🚫 Spam/Irrelevant
- Detects buyer signals in conversations: urgency words, budget mentions, timeline references, competitor mentions
- Alerts team immediately when high-value response comes in
- Provides unified activity dashboard: all channels, one view
- Tracks channel performance: which platform brings most leads at lowest cost

#### Agent 3: Outreach Strategist Agent
**Role:** Senior Business Development Strategist with PhD in Behavioral Psychology
**Expertise:** Multi-touch outreach planning, decision-maker mapping, persuasion strategy

**What It Does:**
- Analyzes each prospect and determines the optimal approach strategy:
  - Best channel to reach them first (LinkedIn? Email? Phone?)
  - Best time of day/week to reach cybersecurity executives
  - Who to contact first in the organization (CEO vs. CTO vs. Marketing Director)
- Maps the complete decision-making chain:
  - Identifies all stakeholders: budget holder, technical evaluator, champion, blocker
  - Recommends approach sequence: start with champion, then get introduction to budget holder
- Identifies prospect-specific pain points from their public presence:
  - "Their website has zero SEO — ranking for no cybersecurity keywords"
  - "No LinkedIn activity in 6 months — invisible to their market"
  - "Running Google Ads but landing page has no conversion path"
- Crafts positioning angle specific to each prospect
- Plans multi-step sequences:
  - Day 1: LinkedIn connection request
  - Day 3: LinkedIn follow-up if accepted
  - Day 7: Cold email with case study
  - Day 14: Cold call attempt
  - Day 21: Different channel attempt (Facebook, mutual connection, etc.)
- Manages the process FROM creating social media accounts TO launching outreach — provides step-by-step guidance for each platform setup

#### Agent 4: Message Composer Agent
**Role:** Senior Copywriter with PhD in Persuasive Communication
**Expertise:** Hyper-personalized messaging across all channels, objection handling, tone adaptation

**What It Does:**
- Writes world-class personalized outreach messages for EVERY channel:
  - **LinkedIn:** Connection requests that feel genuine ("I noticed your company just expanded into healthcare cybersecurity — we helped [similar company] generate 15 qualified leads in that exact space")
  - **Cold Email:** Subject lines with 40%+ open rates, body copy that references specific business details
  - **Cold Call Scripts:** Opening hooks, value propositions, objection responses for every common pushback:
    - "We already have a marketing agency" → response script
    - "We handle marketing in-house" → response script
    - "No budget right now" → response script
    - "We're too small for marketing" → response script
    - "Send me information" → script to convert to meeting instead
  - **Facebook/Instagram:** Casual but professional DM templates
  - **Slack:** Internal updates and team coordination messages
- NEVER uses generic templates — every message references specific details about the prospect
- Adapts tone per audience:
  - C-Suite: Strategic, ROI-focused, executive language
  - IT Directors: Technical, solution-oriented
  - Marketing Managers: Results-focused, data-driven, collaborative

#### Agent 5: Follow-up Engine Agent
**Role:** Senior Client Engagement Specialist with expertise in behavioral timing
**Expertise:** Cross-channel follow-up orchestration, optimal timing, re-engagement strategies

**What It Does:**
- Tracks EVERY outreach attempt across ALL channels with timestamps
- Schedules follow-ups based on research-backed timing:
  - Cybersecurity executives respond best Tuesday-Thursday, 9-11am their timezone
  - Second follow-up 3 days after first, third follow-up 7 days after second
- Drafts follow-up messages that reference previous touchpoints:
  - "I reached out on LinkedIn last Tuesday about how [Company] could improve lead generation..."
- Smart escalation logic:
  - After 3 attempts on LinkedIn with no response → switches to email
  - After 2 emails with no response → tries phone
  - After all channels attempted → marks as "cold" and schedules 30-day re-engagement
- Detects signals:
  - Prospect viewed your LinkedIn profile = warm signal → immediate personalized follow-up
  - Prospect opened email 3 times = interested → escalate to phone call
  - Prospect went completely silent = cold → pause and try different angle in 30 days
- Flags leads ready for CRM handoff: "This prospect replied positively, ready for sales conversation"

#### Agent 6: Outreach Analytics Agent
**Role:** Senior Performance Analyst with PhD in Marketing Analytics
**Expertise:** Multi-channel performance measurement, A/B testing analysis, team productivity tracking

**What It Does:**
- Measures everything across all channels:
  - LinkedIn: Connection acceptance rate, message reply rate, profile view rate
  - Email: Open rate, click rate, reply rate, bounce rate
  - Cold Call: Connect rate, conversation rate, meeting set rate
  - Facebook/Instagram: Message response rate, engagement rate
  - Per channel: Cost per lead, time to response, conversion rate
- Identifies winning patterns:
  - "Your 'case study' email template has 34% reply rate vs. 8% for 'intro' template"
  - "Tuesday morning LinkedIn messages get 3x more replies than Friday afternoon"
- Team activity tracking:
  - Who sent how many messages on which channel
  - Who followed up and who didn't
  - Who has the best conversion rates
- Weekly outreach intelligence report:
  - Total prospects contacted, total replies, total meetings set
  - Best performing channels, messages, and team members
  - Recommendations: "Increase LinkedIn activity by 20%, reduce cold email volume"
  - Budget allocation suggestions based on ROI per channel

---

### CRM — 5 Agents

#### Agent 7: Lead Qualification Agent
**Role:** Senior Sales Intelligence Analyst with PhD in Predictive Analytics
**Expertise:** Multi-dimensional lead scoring, ICP matching, qualification frameworks

**What It Does:**
- Every lead from every channel automatically lands here
- Scores on 5 dimensions (each 0-100, combined weighted score):
  1. **Company Fit** (30%): Size, industry, revenue, location match
  2. **Marketing Need** (25%): How badly do they need marketing help? (weak website, no SEO, low social)
  3. **Budget Likelihood** (20%): Revenue size, funding status, current marketing spend
  4. **Timing Urgency** (15%): Hiring signals, contract renewals, growth indicators
  5. **Authority Level** (10%): Is our contact the decision maker or a gatekeeper?
- Qualifies into categories:
  - 🔥 **Hot** (80-100): Ready for immediate sales conversation
  - 🟡 **Warm** (50-79): Needs 2-3 more touchpoints before ready
  - ❄️ **Cold** (20-49): Not ready now, nurture for 30-90 days
  - 🚫 **Disqualified** (<20): Wrong fit, not worth pursuing
- Auto-enriches with company intelligence:
  - Website traffic estimates, SEO rankings, social media presence
  - Current marketing tools they use
  - Recent news, funding, hiring activity
- Explains reasoning: "Scored 87/100 because: 500-employee cybersecurity firm with no marketing team, just raised $10M, actively hiring a marketing director — perfect timing"

#### Agent 8: Deal Intelligence Agent
**Role:** Senior Sales Strategy Consultant with PhD in Revenue Science
**Expertise:** Pipeline management, deal risk analysis, next-best-action recommendations

**What It Does:**
- Manages the deal pipeline with clear stages:
  - **New Lead** → **Meeting Set** → **Discovery Call** → **Proposal Sent** → **Negotiation** → **Closed Won / Closed Lost**
- For each active deal, provides:
  - Deal Health Score: 🟢 Green (on track) | 🟡 Yellow (needs attention) | 🔴 Red (at risk)
  - Risk factors: "Champion hasn't responded in 7 days", "Competitor was mentioned", "Budget review scheduled"
  - Exact next step: "Send the ROI calculator spreadsheet to Sarah by Thursday"
- Detects deal velocity:
  - Average time per stage for won deals vs. lost deals
  - "This deal has been in Proposal stage for 14 days — average is 7. Risk increasing."
- Competitive intelligence per deal:
  - "They're also talking to [competitor]. Here's our differentiation points..."
- Win/loss analysis:
  - Why deals close: common patterns in won deals
  - Why deals die: common patterns in lost deals
  - Actionable recommendations to improve close rate

#### Agent 9: Meeting Intelligence Agent
**Role:** Senior Executive Communication Coach with expertise in Consultative Selling
**Expertise:** Meeting preparation, real-time guidance, post-meeting action management

**What It Does:**
- **Before Meeting:**
  - Researches everything about the prospect and their company
  - Prepares talking points: "Ask about their current lead generation challenges"
  - Identifies pain points to probe: "Their website converts at 0.5% — industry average is 2.5%"
  - Suggests what to present: case studies from similar cybersecurity companies
  - Creates an agenda the team can follow
- **During Meeting (guidance notes):**
  - Objection handling cards ready: if they say X, respond with Y
  - Key questions to ask at each stage of the conversation
  - Signals to watch for: buying signals, concerns, hidden objections
- **After Meeting:**
  - Summarizes key decisions and action items
  - Updates CRM automatically: deal stage, notes, next steps
  - Drafts follow-up email based on what was discussed
  - Schedules follow-up tasks for team members
  - Tracks meeting-to-close conversion rate

#### Agent 10: Proposal & Contract Agent
**Role:** Senior Business Development Manager with expertise in Solution Architecture
**Expertise:** Custom proposal creation, pricing strategy, contract lifecycle management

**What It Does:**
- Generates customized proposals based on discovery call findings:
  - Scope of work tailored to the prospect's specific marketing gaps
  - Timeline with milestones: "Month 1: Audit + 20 leads. Month 2: Full campaign launch"
  - Pricing tiers:
    - **Starter:** PMG manages outreach only ($X/month)
    - **Growth:** Full marketing management ($X/month)
    - **Enterprise:** White-label CRM + full service ($X/month)
  - Case studies and ROI projections relevant to their industry vertical
- Tracks proposal lifecycle: Sent → Viewed → Under Review → Accepted → Rejected
- If rejected: AI analyzes why and suggests adjusted proposal
- Generates contracts from accepted proposals with terms, SLAs, payment schedules
- Manages renewals: alerts 60 days before contract expiration
- Suggests upsell opportunities for existing clients

#### Agent 11: CRM Sync Agent
**Role:** Senior Integration Architect
**Expertise:** Bidirectional CRM synchronization, conflict resolution, multi-platform connectivity

**What It Does:**
- Syncs PMG's CRM with client's chosen CRM:
  - **GoHighLevel:** Contacts, pipelines, opportunities, activities
  - **HubSpot:** Contacts, deals, companies, tasks, notes
- Bidirectional sync: changes in either system update the other
- Field mapping: PMG fields → GHL/HubSpot fields (customizable per client)
- Conflict resolution: if both systems update the same record, uses timestamp + priority rules
- OAuth management: handles authentication, token refresh, reconnection
- Sync health monitoring: success rate, error logging, retry queue
- Sync reports: "234 contacts synced, 2 conflicts resolved, 0 errors"

---

### MARKETING — 5 Agents

#### Agent 12: Content Strategist Agent
**Role:** Senior Content Director with PhD in Digital Communications
**Expertise:** Multi-platform content strategy, SEO content, brand voice management

**What It Does:**
- Plans content calendar across ALL channels:
  - LinkedIn: 3 posts/week (thought leadership, case studies, industry insights)
  - Facebook/Instagram: 5 posts/week (visual content, testimonials, behind-scenes)
  - Blog: 2 articles/month (SEO-optimized, cybersecurity marketing topics)
  - X (Twitter): Daily industry commentary and engagement
  - YouTube: 2 videos/month (educational, case studies)
  - TikTok: Short-form content for brand awareness
  - Email Newsletter: Bi-weekly to subscriber list
- Writes all content matching PMG's brand voice: authoritative, data-driven, results-focused
- Every piece of content is SEO-optimized with targeted keywords
- Cybersecurity industry awareness: uses correct terminology, references real industry events, standards (NIST, SOC2, ISO 27001)
- Content repurposing: one blog post → LinkedIn article → 5 social posts → email snippet → video script
- Tracks content performance and adjusts strategy based on engagement data

#### Agent 13: Advertising Agent
**Role:** Senior Paid Media Strategist with expertise in B2B Lead Generation
**Expertise:** Multi-platform ad creation, targeting, A/B testing, budget optimization

**What It Does:**
- Creates complete ad campaigns for every platform:
  - **Facebook/Instagram Ads:** Carousel, video, lead form ads targeting IT decision makers
  - **LinkedIn Ads:** Sponsored content, InMail, conversation ads targeting cybersecurity executives
  - **Google Ads:** Search ads for "cybersecurity marketing agency" keywords, display retargeting
  - **YouTube Ads:** Pre-roll and discovery ads with compelling hooks
- For each campaign, prepares EVERYTHING ready to launch:
  - Ad copy (multiple variations for A/B testing)
  - Targeting criteria (job titles, company sizes, industries, interests)
  - Budget allocation per platform
  - Landing page content
  - Conversion tracking setup instructions
- **Your team reviews and launches** — the system never auto-publishes to avoid platform flagging
- Manages retargeting: shows ads to people who visited PMG's website but didn't convert
- Tracks and reports ad performance: cost per lead, cost per meeting, ROAS per platform
- Continuous optimization: "Shift $200 from Facebook to LinkedIn — LinkedIn is producing leads at half the cost"

#### Agent 14: SEO & Growth Agent
**Role:** Senior SEO Strategist with expertise in B2B Cybersecurity Marketing
**Expertise:** Technical SEO, keyword research, organic growth strategy, website optimization

**What It Does:**
- Keyword research specifically for cybersecurity marketing:
  - "cybersecurity marketing agency", "IT company lead generation", "MSP marketing"
  - Long-tail keywords with high intent and low competition
- Website audit and optimization plan:
  - Technical SEO: page speed, mobile responsiveness, schema markup
  - On-page SEO: title tags, meta descriptions, header structure, internal linking
  - Content gaps: topics competitors rank for that PMG doesn't
- Monthly SEO action plan:
  - "Write article targeting 'cybersecurity company lead generation' — 1,200 monthly searches, difficulty 34"
  - "Fix 12 broken internal links on the services page"
  - "Add FAQ schema to the pricing page"
- Tracks rankings and organic traffic over time
- Identifies which pages bring the most leads and recommends doubling down
- Backlink strategy: identifies guest posting, partnership, and PR opportunities

#### Agent 15: Campaign Orchestrator Agent
**Role:** Senior Growth Marketing Manager
**Expertise:** Multi-channel campaign coordination, A/B testing, conversion optimization

**What It Does:**
- Coordinates campaigns across ALL channels working together:
  - Week 1: Blog post → LinkedIn article → Social posts → Email to subscribers
  - Week 2: Paid ads promoting the content → Retargeting visitors → Follow-up email
  - Week 3: Case study release → Targeted outreach to engaged prospects
- Plans campaign timelines with clear milestones
- A/B tests across channels: messaging, audiences, formats, timing
- Tracks the full journey: Ad impression → Website visit → Form fill → Lead → Meeting → Client
- Allocates budget to highest-performing channels in real-time
- Generates weekly campaign performance reports with actionable recommendations
- Manages all funnels:
  - Top of funnel: Awareness content, SEO, social media
  - Middle of funnel: Case studies, webinars, email nurture
  - Bottom of funnel: Consultations, proposals, client success stories

#### Agent 16: Competitor Intelligence Agent
**Role:** Senior Competitive Intelligence Analyst
**Expertise:** Competitive landscape mapping, positioning analysis, market opportunity detection

**What It Does:**
- Monitors competitor marketing agencies serving cybersecurity/IT sector:
  - Their website content, blog frequency, social activity
  - Their ad campaigns (what they're promoting, where)
  - Their pricing and packaging (if publicly available)
  - Their client testimonials and case studies
- Identifies gaps PMG can exploit:
  - "Competitor X doesn't offer lead generation guarantees — PMG's 20-deal promise is unique"
  - "No competitor is creating TikTok content for cybersecurity — first-mover opportunity"
- Creates competitive battle cards for sales calls:
  - "If prospect mentions [competitor], here's why PMG is better..."
- Alerts when competitors launch new campaigns or change positioning
- Quarterly competitive landscape report with strategic recommendations

---

### PRODUCTION — 8 Agents (Enriched)

#### Agent 17: Client Onboarding Agent
**Role:** Senior Client Success Manager
**Expertise:** Structured onboarding, brand profiling, system setup

**What It Does:**
- Runs a step-by-step onboarding checklist for every new client:
  1. Collect brand assets: logo, colors, fonts, brand guidelines
  2. Get access: website admin, social media accounts, Google Analytics, CRM
  3. Define target audience: who is the client trying to reach?
  4. Document services: what exactly does the client offer?
  5. Set goals: monthly lead targets, revenue goals, growth metrics
  6. Choose CRM option: PMG's CRM (included) or GHL/HubSpot integration (extra)
- Creates the client's brand profile in the system
- Sets up their pipeline in PMG's CRM
- If GHL/HubSpot chosen: initiates integration setup via Agent 24 (CRM Sync)
- Generates the initial marketing audit (what's broken, what to fix first)
- Creates the 90-day success plan
- Sets up the client's dedicated Slack channel (via Slack integration)

#### Agent 18: Client Marketing Analyst Agent
**Role:** Senior Marketing Strategist with PhD in Digital Analytics
**Expertise:** Marketing pipeline audits, gap analysis, competitive benchmarking

**What It Does:**
- Deep-dives into EVERYTHING about the client's current marketing:
  - **Website:** SEO audit, conversion rate, page speed, user experience, content quality
  - **Social Media:** Followers, engagement rate, posting frequency, content quality per platform
  - **Paid Ads:** Current spend, targeting, ad quality, landing page conversion
  - **Email:** List size, open rates, click rates, nurture sequences
  - **Competitors:** Who else serves their target market? How do they market?
- Identifies exactly WHY the client isn't getting clients:
  - "Website ranks for zero keywords — invisible to Google"
  - "LinkedIn has 47 followers and no content — missing 90% of B2B buyers"
  - "Running Google Ads but landing page has no form — leads have nowhere to go"
- Creates prioritized fix-it plan:
  - Priority 1: Fix website conversion path (add forms, CTAs, landing pages)
  - Priority 2: Launch LinkedIn content strategy (3 posts/week)
  - Priority 3: Set up email nurture sequence for website visitors
- Benchmarks against competitors in their specific market
- Updates analysis monthly showing progress and next priorities

#### Agent 19: Client Content Engine Agent
**Role:** Senior Creative Director specializing in Cybersecurity/IT Marketing
**Expertise:** Multi-format content production, brand adaptation, channel optimization

**What It Does:**
- Creates ALL marketing content for the client, across all formats:
  - **Social Posts:** LinkedIn, Facebook, Instagram, X, TikTok — platform-optimized
  - **Blog Articles:** SEO-optimized, technically accurate for cybersecurity/IT audience
  - **Email Campaigns:** Welcome sequences, nurture series, promotional emails
  - **Ad Copy:** Facebook, LinkedIn, Google Ads — multiple variations
  - **Case Studies:** Client success stories formatted for credibility
  - **Whitepapers/Guides:** Lead magnets for email capture
- Matches the client's brand voice precisely — not PMG's voice, the CLIENT's voice
- Uses correct industry terminology (NIST, SOC 2, ISO 27001, SIEM, EDR, etc.)
- Generates monthly content packages:
  - 12 social posts, 2 blog articles, 4 email campaigns, 8 ad variations
  - Ready for client review and team execution
- Tracks which content performs best and adjusts style/topics accordingly

#### Agent 20: Client Lead Generator Agent
**Role:** Senior Growth Hacking Specialist with PhD in B2B Lead Generation
**Expertise:** ICP-based prospect identification, multi-source research, qualification

**What It Does:**
- THIS IS THE CORE OF PMG's PROMISE — generates 20 ready-to-close leads monthly
- Researches the client's target market:
  - Who needs their cybersecurity/IT services?
  - Where are these companies? How big? Who decides?
- Uses all available data sources to find prospects:
  - LinkedIn/Sales Navigator for company and contact data
  - Hunter.io/Apollo for verified emails
  - Web research for company intelligence
  - Industry databases and directories
- For each lead, provides:
  - Company name, size, industry vertical
  - Key decision maker with verified contact details
  - Why they need the client's services (specific pain points)
  - Recommended approach strategy
  - Readiness score (how likely to convert)
- Quality guarantee: only delivers leads that score 80+ on the qualification scale
- Delivers leads with full context: "TechSecure Inc needs endpoint security consulting — their current vendor contract expires in 2 months, CTO is actively posting about evaluating alternatives"

#### Agent 21: Client Campaign Agent
**Role:** Senior Digital Campaign Manager
**Expertise:** Full-funnel campaign execution, multi-platform management

**What It Does:**
- Builds complete campaigns for the client's channels:
  - Facebook Ads: creative, targeting, budget, schedule
  - LinkedIn Ads: sponsored content, InMail sequences
  - Google Ads: search, display, retargeting
  - Email Campaigns: sequences, A/B tests, segmentation
- Creates landing pages content (text, layout, CTA placement)
- Sets up tracking: UTM parameters, conversion pixels, goal tracking
- Prepares EVERYTHING ready to go — the client's team or PMG's team launches manually
- Monitors campaign performance once live:
  - Real-time metrics: impressions, clicks, conversions, cost per lead
  - Optimization recommendations: "Pause ad set B, double budget on ad set A"
- Weekly campaign performance summary for the client

#### Agent 22: Client Funnel Builder Agent
**Role:** Senior Conversion Optimization Specialist
**Expertise:** Sales funnel architecture, landing pages, lead capture, nurture sequences

**What It Does:**
- Designs the client's complete sales funnel:
  ```
  Awareness → Interest → Consideration → Decision → Client
  (Ad/Content) → (Landing Page) → (Email Nurture) → (Sales Call) → (Proposal)
  ```
- Creates funnel components:
  - **Landing Pages:** Headlines, copy, form fields, social proof, CTA buttons
  - **Lead Magnets:** Free guides, checklists, assessments that capture emails
  - **Thank You Pages:** Next step instructions, calendar booking links
  - **Email Nurture Sequences:** 5-7 automated emails that build trust and move to sales call
  - **Retargeting Ads:** Show ads to people who visited but didn't convert
- A/B tests funnel elements: headlines, images, form length, CTA text
- Tracks funnel metrics: visitor → lead conversion rate, lead → meeting rate, meeting → client rate
- Identifies drop-off points: "40% of visitors leave at the pricing page — add testimonials and a guarantee"

#### Agent 23: Client Report Agent
**Role:** Senior Business Intelligence Analyst
**Expertise:** Executive reporting, data visualization, performance storytelling

**What It Does:**
- Generates automated reports for clients at configurable intervals (weekly/monthly):
  - **Executive Summary:** Top-line numbers a CEO cares about
  - **Lead Report:** New leads generated, qualified, meetings set, deals closed
  - **Content Report:** Posts published, engagement metrics, website traffic
  - **Campaign Report:** Ad spend, impressions, clicks, conversions, ROI
  - **Pipeline Report:** Deal stages, revenue forecast, close predictions
- Two report formats:
  - **Executive:** 1-page summary for C-suite (charts, KPIs, key wins)
  - **Detailed:** Full breakdown for marketing managers (all data, recommendations)
- Progress tracking against the "20 deals in first month" promise
- Shows ROI: "PMG generated $150K in pipeline value from $5K marketing spend — 30x ROI"
- Exportable as PDF for client presentations

#### Agent 24: Client Integration Agent
**Role:** Senior Integration Engineer
**Expertise:** CRM API integration, data synchronization, multi-platform connectivity

**What It Does:**
- Manages the connection between PMG's system and client's CRM:
  - **GoHighLevel:** OAuth connection, contact/pipeline/opportunity sync
  - **HubSpot:** API connection, contact/deal/company sync
- Sets up integration per client during onboarding
- Bidirectional sync:
  - PMG generates a lead → automatically appears in client's GHL/HubSpot
  - Client's sales team updates a deal → PMG sees the update
- Custom field mapping per client
- Sync scheduling: real-time, hourly, or daily (configurable)
- Error handling: retry queue, conflict resolution, error alerts
- Sync health dashboard: success rate, last sync time, pending items
- When client chooses PMG's CRM instead: manages their data within PMG OS directly

---

### ADMIN — 4 Agents

#### Agent 25: Operations Manager Agent
**Role:** Senior Operations Director
**Expertise:** Team management, task orchestration, workload optimization

**What It Does:**
- Creates and assigns tasks to team members based on:
  - Skills and expertise
  - Current workload
  - Availability and time zones
  - Task urgency and deadline
- Daily action plans for each team member:
  - "John: Call these 5 leads, send follow-ups to these 3, prepare proposal for TechSecure"
  - "Sarah: Publish these 4 social posts, write blog draft, respond to Facebook messages"
- Tracks task completion and flags overdue items
- Escalates when deadlines are at risk: "Client report due in 2 hours, not started yet"
- Team productivity dashboard: tasks completed, on-time rate, average handle time
- Manages team Slack channels: posts task updates, morning briefings, alerts

#### Agent 26: Knowledge & Document Agent
**Role:** Senior Knowledge Management Specialist
**Expertise:** SOPs, playbooks, training materials, institutional memory

**What It Does:**
- Creates and maintains all internal documents:
  - **SOPs:** Step-by-step procedures for every workflow (how to onboard a client, how to run a LinkedIn campaign, etc.)
  - **Playbooks:** Strategy guides for common scenarios (how to handle objections, how to run a discovery call)
  - **Templates:** Proposal templates, email templates, report templates, contract templates
  - **Training Materials:** New team member onboarding guides, tool tutorials
- Searchable knowledge base: when anyone asks "how do I do X?" — finds the answer
- Auto-captures learnings:
  - Deal won → "What worked?" added to knowledge base
  - Deal lost → "What went wrong?" added to knowledge base
  - New objection encountered → response added to objection library
- Version control: tracks document changes over time
- Team can contribute: anyone can add knowledge, agent organizes it

#### Agent 27: Quality & Compliance Agent
**Role:** Senior Quality Assurance Manager
**Expertise:** Content review, brand compliance, regulatory compliance

**What It Does:**
- Reviews all outgoing content before team sends it:
  - Brand consistency: correct logos, colors, voice, messaging
  - Factual accuracy: no false claims, no exaggerated promises
  - Compliance: GDPR, CAN-SPAM, platform-specific rules
  - Quality: grammar, spelling, formatting, professionalism
- Approval workflows:
  - Junior team member creates content → routed to manager for approval
  - High-value proposals → routed to admin for sign-off
  - Client-facing reports → quality check before delivery
- Tracks quality metrics:
  - Error rate per team member, per content type
  - Approval time (how long items wait for review)
  - Revision rate (how often content needs changes)
- Flags items needing management attention before sending

#### Agent 28: Executive Briefing Agent
**Role:** Chief of Staff / Senior Executive Assistant
**Expertise:** Cross-business intelligence synthesis, risk detection, strategic recommendations

**What It Does:**
- **Morning Briefing** (daily):
  - What happened overnight: new leads, responses, deals updated
  - What's urgent today: overdue tasks, meetings scheduled, deadlines approaching
  - What needs your attention: pending approvals, at-risk deals, budget alerts
- **Weekly Strategic Summary:**
  - Pipeline health: total deals, total value, forecast
  - Team performance: who's excelling, who needs support
  - Client status: all active clients with health scores
  - Revenue: this week vs. last week vs. target
  - Recommendations: "Focus on closing TechSecure this week — highest value deal"
- **Risk Alerts** (immediate):
  - "Client ABC hasn't received their monthly report — 2 days overdue"
  - "Wallet balance below $50 — AI operations will be limited"
  - "Team member hasn't logged activity in 3 days"
- Posts briefings to Slack and in-app dashboard

---

### FINANCE — 4 Agents (Renumbered to fit 30 total)

> Note: With 8 Production agents, the total is 32 agents. To keep exactly 30, we combine two Production agents. Agent 21 (Client Campaign) and Agent 22 (Client Funnel Builder) merge into one "Client Campaign & Funnel Agent" since campaigns and funnels are closely related. This gives us exactly 30.

#### Agent 29: Billing & Revenue Agent
**Role:** Senior Financial Controller
**Expertise:** Invoicing, payment tracking, revenue management, financial health

**What It Does:**
- Creates professional invoices for clients:
  - One-time project invoices (marketing audit, initial setup)
  - Recurring monthly invoices (retainer, campaign management)
  - Usage-based invoices (extra leads, additional channels)
- Tracks payment lifecycle: Draft → Sent → Viewed → Paid → Overdue
- Sends payment reminders at 7, 14, 30 days overdue
- Revenue dashboard:
  - Monthly Recurring Revenue (MRR)
  - Revenue per client, per service tier
  - Growth trend: this month vs. last month vs. 3 months ago
- Flags payment risks: "Client X is 45 days overdue on $3,500"
- Calculates client profitability: revenue minus cost to serve
- Manages AI wallet: balance tracking, spend limits, cost-per-action controls, alerts when budget thresholds approached

#### Agent 30: Contract & Expense Agent
**Role:** Senior Finance & Legal Operations Manager
**Expertise:** Contract lifecycle, expense management, financial compliance

**What It Does:**
- Drafts service agreements based on chosen package:
  - Scope of work, deliverables, timeline, payment terms
  - SLA definitions: response time, reporting frequency, lead quality standards
  - Cancellation terms, non-disclosure clauses
- Tracks contract lifecycle:
  - Start date, end date, renewal date, auto-renewal status
  - Alerts 60 days before expiration
  - Suggests upsell/renewal terms based on client performance
- Expense tracking:
  - Categorizes all business expenses: tools, ads, salaries, contractors, AI costs
  - Monthly expense report
  - Budget vs. actual comparison
- Financial forecasting:
  - Projects revenue based on current pipeline and close rates
  - Models scenarios: "If we close 3 more deals, monthly revenue hits $X"
  - Identifies trends: growing services, declining clients
- Legal compliance: flags any contract issues, missing terms, or compliance risks

---

## THREE OPERATING MODES — FULLY FUNCTIONAL

### How Modes Work

Every section, every agent, and every individual record can have its own mode:

| Mode | How It Works | Example |
|------|-------------|---------|
| **AI Autonomous** | Agents execute automatically. Results appear in dashboard. You review after. | Lead comes in → auto-scored → auto-enriched → follow-up drafted and sent |
| **Hybrid** (Default) | Agents prepare everything. You approve before it executes. High confidence (>80%) auto-executes. Low confidence (<50%) waits for approval. | Lead scored 92 → auto-enriched. Email drafted → appears in "Pending" → you approve → sent |
| **Human Controlled** | AI completely off. You do everything manually. System tracks and organizes only. | You manually score leads, write emails, create content. System just stores data. |

### Mode Configuration

| Level | What It Controls | Example |
|-------|-----------------|---------|
| **Global** | Default mode for entire system | Set to "Hybrid" — everything defaults to Hybrid |
| **Per Section** | Override for a specific section | Outreach set to "Hybrid" but CRM Lead Scoring set to "AI Autonomous" |
| **Per Agent** | Override for a specific agent | Message Composer set to "Hybrid" but Follow-up Engine set to "AI Autonomous" |
| **Per Record** | Override for a specific lead/deal/client | Client ABC's production set to "Human Controlled" (they want manual content) |

### Pending Actions Queue
When in Hybrid mode, low-confidence actions land in a **Pending Actions Queue**:
- You see: "Agent 4 drafted a LinkedIn message to John Smith at CyberShield Inc. Confidence: 73%"
- You can: Approve (send it), Edit (modify then send), Reject (discard), Delegate (assign to team member)

---

## SETTINGS TAB

| Section | What's In It |
|---------|-------------|
| **General** | Company name, logo, branding colors, timezone, language |
| **Connected Channels** | All social media and tool connections (add/remove/status per channel) |
| **AI Configuration** | Global mode switch, per-section overrides, per-agent enable/disable |
| **Wallet & Billing** | Balance, fund wallet, spend limits (daily/monthly/per-action), usage history |
| **User Management** | Add/remove users, assign roles, view activity logs |
| **Integrations** | GHL, HubSpot, Slack workspace connection |
| **White Label** | Custom branding for client-facing portals and reports |
| **Notifications** | In-app alerts, email notifications, Slack alerts |
| **Security** | Password policy, session management |
| **System Health** | Agent status, API connection health, database stats |

---

## CONNECTED CHANNELS — ANY PLATFORM THAT CAN BRING LEADS

Built to add channels day by day. Start with core channels, expand over time:

### Phase 1 — Launch Channels
| Channel | Type | Purpose |
|---------|------|---------|
| LinkedIn | Outbound + Inbound | Connection requests, DMs, post engagement |
| Sales Navigator | Outbound | Advanced prospecting, saved lead tracking |
| Ulinc | Outbound | LinkedIn automation campaign monitoring |
| Email (Gmail/Outlook) | Outbound + Inbound | Cold emails, replies, newsletter |
| Slack | Internal | Team communication, agent alerts, briefings |

### Phase 2 — Growth Channels
| Channel | Type | Purpose |
|---------|------|---------|
| Facebook Page | Inbound + Outbound | Page management, ads, Messenger |
| Instagram | Inbound | DMs, story engagement, content |
| Google Ads | Inbound | Search + display advertising |
| Website | Inbound | Form submissions, visitor tracking |

### Phase 3 — Expansion Channels
| Channel | Type | Purpose |
|---------|------|---------|
| X (Twitter) | Inbound + Outbound | Industry conversations, DMs |
| YouTube | Inbound | Video content, comments, subscribers |
| TikTok | Inbound | Short-form content, awareness |
| Google My Business | Inbound | Local visibility, reviews |
| Reddit | Inbound | Cybersecurity community engagement |
| Quora | Inbound | Expert answers, brand authority |
| WhatsApp Business | Inbound + Outbound | Direct messaging |
| Telegram | Inbound + Outbound | Channel/group management |

### Phase 4 — Future Channels
| Channel | Type | Purpose |
|---------|------|---------|
| Podcasts | Inbound | Guest appearances, hosting |
| Webinars | Inbound | Lead capture events |
| Clutch/G2 | Inbound | Review platforms, credibility |
| Any new platform | TBD | Added when it shows lead potential |

---

## USER ROLES — 4 LEVELS

| Role | What They Can Do |
|------|-----------------|
| **Super Admin** | Everything. System settings, billing, user management, all data, delete anything, change modes, wallet management |
| **Admin** | Everything except system settings and billing. Can manage users (except Super Admin), see all data, change modes per section |
| **Manager** | Can work on assigned sections. Can approve pending actions. Cannot change settings, manage users, or see billing |
| **Viewer** | Read-only access to assigned sections. Cannot create, edit, or delete anything. Good for clients viewing their reports |

### Permissions Matrix

| Action | Super Admin | Admin | Manager | Viewer |
|--------|:-----------:|:-----:|:-------:|:------:|
| View all sections | ✓ | ✓ | Assigned only | Assigned only |
| Create/edit records | ✓ | ✓ | ✓ | ✗ |
| Delete records | ✓ | ✓ | ✗ | ✗ |
| Approve pending actions | ✓ | ✓ | ✓ | ✗ |
| Change AI modes | ✓ | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✓ (not Super Admin) | ✗ | ✗ |
| System settings | ✓ | ✗ | ✗ | ✗ |
| Billing & wallet | ✓ | ✗ | ✗ | ✗ |
| Delete users | ✓ | ✗ | ✗ | ✗ |
| View reports | ✓ | ✓ | ✓ | ✓ |

---

## API TECHNOLOGIES & WALLET SPENDING

### One API Gateway Model
```
PMG OS → Single API Gateway → All External Services

On Replit: PMG pays Replit → Replit manages API costs
On Private Server: PMG pays API providers directly → same gateway, different keys
```

When migrating to private server, you only change ONE configuration: the API gateway endpoint. Every agent and service call goes through this single point.

### External APIs Used

| Service | What For | Used By Agents |
|---------|----------|----------------|
| **OpenAI GPT-4o-mini** | All AI tasks: scoring, content, analysis, drafts | All 30 agents |
| **OpenAI GPT-4o** | Complex tasks: proposals, audits, strategy | Agents 10, 18, 20 |
| **DALL-E 3** | Image generation for social posts, ads, brand assets | Agents 19, 21 |
| **Runway ML / Pika Labs** | Cinematic realistic video generation for client content, ads, social | Agents 19, 21 |
| **ElevenLabs** | AI voiceover for video content | Agent 19 |
| **Hunter.io** | Email address finding and verification | Agent 1 |
| **Apollo.io** | Prospect research and contact database | Agent 1 |
| **LinkedIn API** | Profile data, messaging, activity monitoring | Agents 2, 3, 4 |
| **Facebook Graph API** | Page management, ads, Messenger | Agents 2, 13 |
| **Instagram Graph API** | Content publishing, DM management | Agents 2, 12 |
| **Google Ads API** | Search/display ad management | Agent 13 |
| **YouTube Data API** | Video upload, comment management | Agent 12 |
| **X (Twitter) API** | Tweet management, DM access | Agents 2, 12 |
| **TikTok API** | Content publishing, analytics | Agent 12 |
| **Slack API** | Team messaging, channel management, alerts | Agents 2, 25, 28 |
| **GoHighLevel API** | Client CRM sync | Agent 11, 24 |
| **HubSpot API** | Client CRM sync | Agent 11, 24 |
| **SendGrid** | Email delivery (cold emails, newsletters) | Agents 4, 5, 19 |
| **Stripe** | Payment processing for client invoicing | Agent 29 |
| **Google Analytics API** | Website traffic analysis | Agent 18 |
| **Ahrefs/SEMrush API** | SEO data, keyword research, backlink analysis | Agent 14 |

### Wallet Spending Breakdown

| Action | Cost | When It Happens |
|--------|------|-----------------|
| AI scores a lead | $0.01 | Lead enters CRM |
| AI enriches a lead | $0.02 | After qualification |
| AI writes an email | $0.02 | Message composition |
| AI writes social post | $0.01 | Content creation |
| AI writes blog article | $0.05 | Content creation |
| AI generates image | $0.04 | Production/content |
| AI generates video clip | $0.10 | Production/content |
| AI analyzes client pipeline | $0.05 | Client onboarding/monthly |
| AI generates proposal | $0.05 | Deal stage |
| AI creates report | $0.03 | Weekly/monthly reporting |
| Cached result reused | $0.00 | Same query previously answered |
| Hunter.io lookup | Via gateway | Prospect research |
| Apollo lookup | Via gateway | Prospect research |
| GHL/HubSpot sync | Via gateway | Client CRM sync |

### Spend Controls
- **Daily limit:** e.g., max $5/day
- **Monthly limit:** e.g., max $100/month
- **Per-action limit:** e.g., max $0.10 per single call
- **Per-section limit:** e.g., Outreach max $30/month, Production max $50/month
- **Alert at 80%:** notification when approaching any limit
- **Auto-pause at 100%:** stops AI operations when limit reached

---

## CLEAN START PLAN

When building the new system:
1. **Wipe all existing data** — start from zero, clean database
2. **Remove the 112 old agents** — replace with 30 new ones
3. **Remove old 11-domain sidebar** — replace with 6 sections + Settings
4. **Remove unnecessary services** — keep only what the 30 agents need
5. **Remove workflow complexity** — simple, clear data flow between sections
6. **Keep core engines:** AI Mode, Wallet, Event Bus, State Machine — they work
7. **Remove broken features:** Follow-ups DB errors, non-functional cron jobs, fake data

---

## MIGRATION TO PRIVATE SERVER

The system is built on standard open-source tech that runs anywhere:

| Component | Technology | Server Requirement |
|-----------|-----------|-------------------|
| Frontend | React + Vite | Any web server (nginx) |
| Backend | Node.js + Express | Node.js 18+ |
| Database | PostgreSQL | PostgreSQL 14+ |
| Real-time | WebSocket | Built into Node.js |
| AI | OpenAI API | API key |
| File Storage | Local filesystem | Disk space |

### Migration Steps:
1. Export code from Replit (git clone)
2. Export database (pg_dump)
3. Set up server (Ubuntu/CentOS with Node.js + PostgreSQL)
4. Change API gateway endpoint from Replit proxy → direct API keys
5. Set environment variables (API keys, database URL, session secret)
6. Run `npm install` + `npm run build` + `npm start`
7. Done — same system, your server

---

## FINAL AGENT COUNT: 30

| Section | Agents | Numbers |
|---------|--------|---------|
| Outreach | 6 | Agents 1-6 |
| CRM | 5 | Agents 7-11 |
| Marketing | 5 | Agents 12-16 |
| Production | 8 → 6 (merged 2) | Agents 17-22 |
| Admin | 4 | Agents 23-26 (renumbered 25-28) |
| Finance | 4 → 2 (merged 2) | Agents 27-28 (renumbered 29-30) |
| **TOTAL** | **30** | |

---

This is the complete blueprint. Review it carefully and tell me what to change, add, or remove before I start building.
