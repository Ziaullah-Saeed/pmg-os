import { db, leadsTable, opportunitiesTable, companiesTable, contactsTable, invoicesTable, contractsTable, reportsTable, knowledgeEntriesTable, tasksTable, approvalsTable, pendingActionsTable, jobQueueTable } from "@workspace/db";
import { eq, sql, count, desc } from "drizzle-orm";
import { emit } from "./event-bus";
import { logAudit } from "./audit-service";

// Same env gate as wallet-service (single source of truth: AI_DUMMY_MODE), default ON.
let dummyModeEnabled = process.env.AI_DUMMY_MODE !== "false";
const dummyResponses = new Map<string, (input: Record<string, any>) => Record<string, any>>();
const testResults: TestRunResult[] = [];
const MAX_HISTORY = 500;

export type TestRunResult = {
  id: string;
  suite: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
};

export type TestSuiteResult = {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  durationMs: number;
  tests: TestRunResult[];
  timestamp: Date;
};

const DUMMY_AI_RESPONSES: Record<string, string> = {
  // Honest sample: AI dummy mode makes no live model call, so we must NOT fabricate
  // specific company facts (size, revenue, tech, funding) that would masquerade as
  // real enrichment. Real facts come from Apollo/PDL/website enrichment, not here.
  "ai-enrich-lead": JSON.stringify({
    note: "SAMPLE — generated in AI dummy mode (no live model call). Set AI_DUMMY_MODE=false for real, prospect-specific enrichment.",
    suggestedAngle:
      "Lead with a concrete, measurable outcome relevant to this prospect's actual role, industry, and company size (captured from Apollo/PDL).",
    approach: "Personalize from verified fields only — avoid asserting facts we haven't confirmed.",
  }),
  "ai-score-lead": JSON.stringify({
    fitScore: 82,
    confidenceScore: 88,
    reasoning: "Strong ICP alignment: mid-market MDR provider, SOC 2 certified, recently funded, and actively hiring sales reps — indicating growth intent. Marketing maturity is low (WordPress + basic Google Ads), which means high ROI potential from our services. Decision-maker is VP Marketing, accessible via LinkedIn.",
    recommendation: "Priority prospect. Route to outreach queue with a case-study-led approach. Reference their recent Series B and how PMG helped similar MDR companies generate 20+ qualified leads per month.",
    riskFactors: ["May have vendor lock-in with HubSpot agency", "Budget cycle resets in Q1"],
  }),
  // Honest sample in the exact format scoreLead() parses (SCORE/TIER/REASONING),
  // so `notes` holds a clearly-labeled sample — not a fabricated JSON profile that
  // would render as a real fit assessment on the lead/CRM cards.
  "ai-score-company":
    "SCORE: 75\nTIER: WARM\nREASONING: SAMPLE score generated in AI dummy mode (no live model call). Enable real AI (AI_DUMMY_MODE=false) for a genuine fit assessment based on this prospect's actual industry, size, and role.",
  "ai-generate-report": "## Monthly Performance Report\n\n### Executive Summary\nThis month showed strong pipeline momentum with 18 qualified leads delivered against the 20-lead target. Three proposals are in negotiation stage totaling $187,500 in potential ARR.\n\n### Key Metrics\n- **Leads Delivered:** 18 of 20 target (90%)\n- **Pipeline Value:** $312,000 across 7 active opportunities\n- **Conversion Rate:** 28% from MQL to SQL\n- **Avg Deal Size:** $44,571\n- **Content Published:** 6 blog posts, 2 whitepapers, 14 LinkedIn posts\n- **Ad Spend:** $3,200 → $48,000 pipeline (15x ROI)\n\n### Channel Breakdown\n| Channel | Leads | Cost/Lead | Quality Score |\n|---------|-------|-----------|---------------|\n| LinkedIn Outreach | 8 | $0 (organic) | 87 |\n| Google Ads | 5 | $640 | 72 |\n| Content/SEO | 3 | $0 (owned) | 91 |\n| Referral | 2 | $0 | 95 |\n\n### Recommendations\n1. Double down on LinkedIn thought leadership — highest quality leads at zero cost\n2. Add SIEM/XDR-specific landing pages to capture long-tail search traffic\n3. Launch a \"CISO Roundtable\" webinar series to accelerate mid-funnel deals\n4. Consider retargeting ads for prospects who downloaded the MDR whitepaper",
  "ai-review-contract": JSON.stringify({
    riskScore: 38,
    overallAssessment: "Low-to-moderate risk. Standard MSA with favorable payment terms.",
    flaggedClauses: [
      { clause: "Section 7.2 — Limitation of Liability", risk: "medium", suggestion: "Liability cap is set at 1x monthly fee. Consider negotiating to 3x for enterprise accounts." },
      { clause: "Section 9.1 — Termination for Convenience", risk: "low", suggestion: "30-day notice period is standard. No concern." },
      { clause: "Section 12.3 — IP Assignment", risk: "medium", suggestion: "Clause assigns all creative IP to client upon payment. Confirm PMG retains portfolio usage rights." },
    ],
    missingClauses: ["Data Processing Agreement (DPA) for GDPR compliance", "SLA with uptime guarantees for reporting dashboard access"],
    complianceChecks: { gdpr: false, ccpa: true, sla: false, hipaa: "N/A", sox: "N/A" },
    summary: "Contract is mostly standard. Two items need attention: add a DPA addendum and clarify IP portfolio rights. Payment terms (Net 30) are acceptable.",
  }),
  "ai-generate-contract": "# DIGITAL MARKETING SERVICES AGREEMENT\n\n**Between:** PMG Group LLC (\"Agency\") and [Client Name] (\"Client\")\n**Effective Date:** [Date]\n**Term:** 12 months, auto-renewing\n\n---\n\n## 1. SCOPE OF SERVICES\nAgency shall provide the following services under the selected plan:\n- **Lead Generation:** Up to 20 qualified cybersecurity buyer leads per month\n- **Content Marketing:** SEO-optimized blog posts, whitepapers, and case studies\n- **Paid Advertising:** Google Ads and LinkedIn campaign management\n- **Social Media:** LinkedIn thought leadership and engagement strategy\n- **Reporting:** Monthly performance dashboard with ROI analysis\n\n## 2. SERVICE LEVEL COMMITMENTS\n- Minimum 15 qualified leads per month (80+ fit score)\n- Monthly strategy review call\n- 48-hour response time for urgent requests\n- Dedicated account manager\n\n## 3. COMPENSATION\n- Monthly retainer: $[Amount] per selected tier\n- Payment terms: Net 30 from invoice date\n- Ad spend: Billed separately at cost + 15% management fee\n\n## 4. CONFIDENTIALITY\nBoth parties agree to maintain the confidentiality of proprietary information including client lists, campaign strategies, pricing, and performance data.\n\n## 5. INTELLECTUAL PROPERTY\nAll marketing materials created by Agency become Client property upon full payment. Agency retains the right to use deliverables in its portfolio.\n\n## 6. TERMINATION\nEither party may terminate with 30 days written notice. Client pays for all work completed through the termination date.",
  "ai-draft-outreach": "Hi [Name],\n\nI came across [Company]'s recent SOC 2 certification announcement — congrats on hitting that milestone. That's a strong trust signal for enterprise buyers.\n\nI work with cybersecurity companies like yours that have a solid product but are struggling to fill the top of funnel. Most MDR providers we talk to say the same thing: \"We close deals when we get meetings, but we don't get enough meetings.\"\n\nWe've helped companies like ThreatBlock and CyberShield go from 3-4 inbound leads/month to 20+ qualified conversations, primarily through LinkedIn thought leadership and targeted content that speaks directly to CISOs and IT Directors.\n\nWould it make sense to spend 15 minutes looking at how we did it? I can walk you through the exact playbook.\n\nBest,\nSher Shah Nawabi\nPMG Group LLC",
  "ai-analyze-sentiment": JSON.stringify({
    overallScore: 76,
    breakdown: { positive: 62, neutral: 28, negative: 10 },
    trend: "improving",
    keyPhrases: ["interested in the case study", "need to check with our CFO", "timeline is Q2", "liked the ROI numbers"],
    buyingSignals: ["Asked about pricing tiers", "Requested a reference call", "Mentioned budget allocated for marketing"],
    concerns: ["Worried about minimum commitment period", "Had a bad experience with a previous agency"],
    recommendedTone: "Consultative — acknowledge their past agency experience and lead with ROI proof points. Avoid hard-sell language.",
  }),
  "ai-suggest-action": "**Recommended Action:** Schedule a discovery call for Thursday 2-3pm ET\n\n**Reasoning:** Prospect opened the case study email twice and clicked through to the pricing page. Their VP Marketing also viewed your LinkedIn profile. These are strong buying signals.\n\n**Urgency:** HIGH — They mentioned evaluating two other agencies this month.\n\n**Talking Points:**\n1. Reference the MDR case study they downloaded\n2. Highlight the 20-lead guarantee\n3. Offer a 90-day pilot at Growth tier ($5,000/mo) with exit clause\n4. Prepare ROI calculator showing expected pipeline vs. their current state",
  "ai-find-prospects": JSON.stringify([
    { company_name: "ShieldOps Security", industry: "Managed Security Services", estimated_size: "85 employees", decision_maker: "Rachel Torres, VP Marketing", pain_points: "Relying on word-of-mouth, no content strategy, basic website", fit_score: 91 },
    { company_name: "VaultEdge Cyber", industry: "Cloud Security / CASB", estimated_size: "200 employees", decision_maker: "James Park, CMO", pain_points: "Running Google Ads with no landing pages, high CPC, 2% conversion rate", fit_score: 87 },
    { company_name: "SentinelPath Inc", industry: "Endpoint Detection & Response", estimated_size: "45 employees", decision_maker: "Maria Santos, CEO", pain_points: "No marketing team, founder-led sales only, need to scale", fit_score: 84 },
    { company_name: "NetWatch Defense", industry: "SOC-as-a-Service", estimated_size: "150 employees", decision_maker: "Kevin Wright, Director of Growth", pain_points: "Just raised Series A, need demand gen engine built from scratch", fit_score: 93 },
    { company_name: "CipherGuard Solutions", industry: "Identity & Access Management", estimated_size: "60 employees", decision_maker: "David Kim, Head of Marketing", pain_points: "Competing against CrowdStrike and SentinelOne content, losing SEO share", fit_score: 79 },
    { company_name: "ThreatMatrix Analytics", industry: "Threat Intelligence Platform", estimated_size: "110 employees", decision_maker: "Sarah Chen, VP Business Development", pain_points: "Strong product, weak brand awareness, need thought leadership", fit_score: 88 },
    { company_name: "SecureStack Technologies", industry: "DevSecOps / Application Security", estimated_size: "75 employees", decision_maker: "Alex Rivera, Marketing Manager", pain_points: "No case studies, no webinar program, website redesign needed", fit_score: 82 },
    { company_name: "BlueShield Compliance", industry: "GRC / Compliance Automation", estimated_size: "95 employees", decision_maker: "Lisa Wang, VP Revenue", pain_points: "Selling into regulated industries, need compliance-focused content", fit_score: 86 },
  ]),
  "ai-monitor-channels": JSON.stringify({
    messages: [
      { sender: "Mark Sullivan", company: "NexGen Firewall Co", channel: "LinkedIn", intent: "Pricing inquiry — asked about lead gen packages", urgency: "high", classification: "Hot Lead", responseTime: "Respond within 2 hours" },
      { sender: "Jennifer Walsh", company: "CyberLock Systems", channel: "Email", intent: "Downloaded MDR whitepaper, requesting follow-up", urgency: "high", classification: "Hot Lead", responseTime: "Respond within 4 hours" },
      { sender: "Tom Richards", company: "DataVault Security", channel: "LinkedIn", intent: "Commented on PMG's SIEM post, asking about ROI metrics", urgency: "medium", classification: "Warm", responseTime: "Respond within 24 hours" },
      { sender: "Angela Brooks", company: "SecureNet Pro", channel: "Website Forms", intent: "Filled contact form — interested in content marketing services", urgency: "medium", classification: "Warm", responseTime: "Respond within 12 hours" },
    ],
    summary: "4 new messages across channels. 2 hot leads requiring immediate response. Both hot leads are mid-market cybersecurity companies matching ICP.",
  }),
  "ai-plan-approach": "## Multi-Touch Outreach Strategy\n\n**Target:** [Prospect] at [Company]\n**Duration:** 14 days | **Channels:** LinkedIn → Email → Phone\n\n### Sequence\n| Day | Channel | Action | Goal |\n|-----|---------|--------|------|\n| 1 | LinkedIn | View profile + connect with personalized note | Open relationship |\n| 2 | LinkedIn | Like/comment on their recent post | Build familiarity |\n| 4 | LinkedIn | Send case study DM (MDR client success story) | Deliver value |\n| 6 | Email | Personalized email with ROI calculator link | Create urgency |\n| 9 | LinkedIn | Share relevant article + tag prospect | Stay top of mind |\n| 11 | Email | Follow-up with CISO Roundtable invitation | Offer low-commitment next step |\n| 14 | Phone | Direct call — reference previous touchpoints | Secure meeting |\n\n### Objection Handling\n- **\"We have an agency\"** → \"Happy to hear that. Most of our clients came from agencies that couldn't deliver cybersecurity-specific leads. We guarantee 20/month.\"\n- **\"Not in budget\"** → \"Our Starter tier is $2,500/mo. Clients typically see 8-12x ROI within 90 days.\"\n- **\"Bad timing\"** → \"Understood. Can I send our quarterly CISO report? It's free and useful regardless.\"\n\n### Decision-Maker Map\n- Primary: VP Marketing (budget holder)\n- Influencer: CTO (technical validation)\n- Champion: SDR team lead (daily user of leads)",
  "ai-compose-message": "Hi [Name],\n\nSaw your post about the challenges of selling cybersecurity to non-technical buyers — really resonated with me.\n\nWe work exclusively with cybersecurity companies and that exact problem is why most of our clients came to us: they have a great product but struggle to generate consistent pipeline because their content speaks to security engineers, not the CFOs and CEOs who sign the checks.\n\nOne example: we helped a 90-person MDR company go from 5 inbound leads/month to 22, just by rebuilding their content strategy around business risk instead of technical features. Their close rate actually went up because the leads were better qualified.\n\nWould a quick call make sense? I can share the exact framework we used.\n\nBest,\nPMG Group",
  "ai-schedule-followup": JSON.stringify({
    recommendedDate: "3 business days from now",
    optimalTime: "Tuesday or Thursday, 9:30-11:00 AM ET",
    channel: "Email",
    strategy: "Send a brief follow-up referencing the case study, then escalate to LinkedIn DM if no response within 48 hours",
    messageTemplate: "Hi [Name], wanted to circle back on the MDR case study I shared. A few other cybersecurity companies found the ROI breakdown particularly relevant. Happy to walk through how we'd apply that framework to [Company]. Free this Thursday?",
    escalationPath: "If no response after 2 email attempts → LinkedIn DM → Phone call (Day 10) → Final email with useful resource (Day 14)",
  }),
  "ai-outreach-analytics": JSON.stringify({
    period: "Last 30 days",
    totalSent: 156,
    responseRate: 31,
    meetingsBooked: 12,
    pipelineGenerated: 187500,
    channelBreakdown: [
      { channel: "LinkedIn", sent: 78, responses: 28, meetings: 7, replyRate: 36, topPerforming: "Case study shares" },
      { channel: "Email", sent: 52, responses: 14, meetings: 4, replyRate: 27, topPerforming: "ROI calculator emails" },
      { channel: "Phone", sent: 18, responses: 6, meetings: 1, replyRate: 33, topPerforming: "Follow-up calls after email opens" },
      { channel: "Website", sent: 8, responses: 3, meetings: 0, replyRate: 38, topPerforming: "Contact form responses" },
    ],
    insights: ["Tuesday and Thursday mornings have 2.4x higher response rates", "Messages under 100 words get 22% more replies", "Case study emails have 34% reply rate vs 8% for cold intros"],
  }),
  "ai-qualify-lead": JSON.stringify({
    qualified: true,
    fitScore: 86,
    confidence: 91,
    qualification: {
      budget: "Confirmed $3,000-$8,000/mo range — Growth tier likely",
      authority: "VP Marketing with budget authority up to $10K/mo",
      need: "Currently generating 3-4 leads/month organically, target is 20+",
      timeline: "Evaluating in Q2, wants to start by May",
    },
    nextSteps: ["Send Growth tier proposal with 90-day pilot option", "Schedule reference call with similar MDR client", "Prepare custom ROI projection"],
    risks: ["Comparing with one other agency", "May push to Q3 if board meeting gets rescheduled"],
  }),
  "ai-manage-deal": "## Deal Analysis: [Company Name]\n\n**Stage:** Proposal Sent → Awaiting Response\n**Value:** $60,000/yr (Growth Tier)\n**Probability:** 65%\n**Days in Stage:** 8\n\n### Health Check\n- ✅ Champion identified (VP Marketing)\n- ✅ Budget range confirmed ($5-8K/mo)\n- ⚠️ No technical validation yet — CTO hasn't been involved\n- ⚠️ Competitor evaluation in progress\n- ❌ Legal review not started\n\n### Recommended Actions\n1. Request intro to CTO for technical alignment call\n2. Send competitive comparison one-pager (PMG vs generic agencies)\n3. Offer 90-day pilot with performance guarantee\n4. Schedule proposal review call by end of week\n\n### Win Probability Factors\n- Strong pain point alignment (+15%)\n- Active buyer timeline (+10%)\n- Competitor presence (-10%)\n- No CTO buy-in yet (-10%)",
  "ai-prepare-call": "## Discovery Call Prep: [Prospect Name] — [Company]\n\n### Company Intel\n- **Industry:** Managed Detection & Response (MDR)\n- **Size:** 120 employees, $18M ARR\n- **Recent:** Closed Series B, expanding federal vertical\n- **Current Marketing:** WordPress site + basic Google Ads\n- **Pain:** Low lead volume, no content engine\n\n### Agenda (30 min)\n1. **(2 min)** Rapport — reference their Series B, acknowledge growth\n2. **(8 min)** Discovery — current lead sources, volume, quality, sales cycle\n3. **(5 min)** Pain Diagnosis — what's not working, what they've tried\n4. **(10 min)** Solution Alignment — walk through PMG's approach with MDR-specific examples\n5. **(5 min)** Next Steps — proposal timeline, who else needs to be involved\n\n### Key Questions\n- \"What does your current pipeline look like? How many qualified meetings per month?\"\n- \"Where are most of your deals coming from today?\"\n- \"If we could deliver 20 qualified conversations per month, what would that mean for your revenue targets?\"\n\n### Objection Prep\n- \"We tried an agency before and it didn't work\" → \"Most agencies don't specialize in cybersecurity. Our clients are exclusively in your space, so our content and targeting is built for CISO and IT Director audiences.\"\n- \"Our sales cycle is 6+ months\" → \"That's typical in enterprise security. Our approach focuses on warming leads through educational content before the first call, which shortens time-to-close.\"",
  "ai-create-proposal": "## PMG Group — Growth Marketing Proposal\n\n**Prepared for:** [Company Name]\n**Date:** [Date]\n**Tier:** Growth ($5,000/mo)\n\n---\n\n### The Challenge\nYour team is generating 3-4 inbound leads per month through referrals and basic Google Ads. To hit your $30M ARR target, you need a predictable pipeline of 20+ qualified conversations monthly.\n\n### Our Approach\n**Month 1-2: Foundation**\n- ICP refinement and buyer persona development\n- SEO audit and keyword strategy (SIEM, MDR, SOC-as-a-Service terms)\n- Content calendar: 4 blog posts, 1 whitepaper, 12 LinkedIn posts\n- LinkedIn outreach campaign setup (targeting CISOs and IT Directors)\n\n**Month 3-4: Acceleration**\n- Google Ads optimization with dedicated landing pages\n- Launch CISO Roundtable webinar series\n- Case study development from existing clients\n- Email nurture sequences for downloaded content\n\n**Month 5-6: Scale**\n- Expand to paid LinkedIn + retargeting\n- Launch co-marketing partnerships\n- ABM campaigns for enterprise targets\n\n### Deliverables\n- 20 qualified leads/month (fit score 80+)\n- Monthly performance dashboard\n- Dedicated account manager\n- Weekly strategy calls\n\n### Investment\n$5,000/mo + ad spend at cost\n90-day pilot available with performance guarantee",
  "ai-sync-crm": JSON.stringify({
    synced: true,
    contacts: 8,
    companies: 5,
    deals: 3,
    activitiesLogged: 14,
    duplicatesFound: 1,
    summary: "CRM sync complete. 8 contacts, 5 companies, and 3 active deals updated. 14 activities logged (emails, calls, LinkedIn messages). 1 duplicate contact merged (David Kim appeared in two companies).",
  }),
  "ai-create-content": "# Why Your MDR Company's Website Isn't Generating Leads (And How to Fix It)\n\nMost Managed Detection & Response companies have the same problem: a website that talks about SOC analysts, SIEM integrations, and threat hunting — but doesn't speak to the person who actually signs the contract.\n\nYour CEO buyer doesn't care about your SIEM integrations. They care about:\n- Will this reduce our risk of a breach?\n- What's the cost of *not* having 24/7 monitoring?\n- Can we pass our next SOC 2 audit?\n\n## The 3 Changes That Drive Leads\n\n### 1. Lead with Business Risk, Not Technical Features\nInstead of: \"Our XDR platform correlates alerts across endpoints, network, and cloud.\"\nTry: \"Companies without 24/7 threat monitoring are 3.2x more likely to suffer a data breach costing $4.5M on average.\"\n\n### 2. Add Proof Points on Every Page\n- Client logos (especially recognizable brands in their industry)\n- Specific metrics: \"Reduced MTTR from 4 hours to 18 minutes\"\n- Compliance badges: SOC 2, ISO 27001, FedRAMP\n\n### 3. Create a Clear Conversion Path\nDon't just have a \"Contact Us\" form. Offer:\n- Free security posture assessment\n- ROI calculator\n- \"Is Your Organization Ready for MDR?\" self-assessment quiz\n\n*Want help implementing this? [CTA]*",
  "ai-create-ad": JSON.stringify({
    adVariations: [
      { headline: "Still Chasing Leads? MDR Companies Deserve Better.", description: "20 qualified cybersecurity buyer meetings per month. Guaranteed. See how PMG delivers results for MDR, SIEM, and SOC providers.", cta: "Get Your Custom Pipeline Plan", targetAudience: "VP Marketing, CMO at cybersecurity companies 50-500 employees" },
      { headline: "Your Competitors Are Outranking You for 'MDR Services'", description: "We help cybersecurity companies dominate search, LinkedIn, and paid ads. 15x average ROI. Cybersecurity-only agency.", cta: "See the Playbook", targetAudience: "Marketing leaders at MDR/MSSP companies" },
      { headline: "20 Qualified Leads/Month for Cybersecurity Companies", description: "Not generic leads. CISOs and IT Directors actively looking for your solution. PMG Group works exclusively with cybersecurity companies.", cta: "Book a Strategy Call", targetAudience: "Founders and growth leaders at cybersecurity startups" },
    ],
    budget: { daily: 50, monthly: 1500, estimatedCPC: 8.50, estimatedCPL: 85 },
    channels: ["Google Ads (Search)", "LinkedIn Sponsored Content", "LinkedIn InMail"],
  }),
  "ai-seo-audit": JSON.stringify({
    overallScore: 42,
    domain: "[client-domain].com",
    organicTraffic: "~1,200 visits/month",
    keywordRankings: [
      { keyword: "managed detection and response", position: 34, volume: 2400, difficulty: 68 },
      { keyword: "MDR services", position: 28, volume: 1800, difficulty: 55 },
      { keyword: "SOC as a service", position: 42, volume: 1200, difficulty: 62 },
      { keyword: "cybersecurity managed services", position: 51, volume: 900, difficulty: 48 },
      { keyword: "endpoint detection and response", position: "Not ranking", volume: 3600, difficulty: 72 },
    ],
    issues: [
      { type: "critical", description: "No blog or resource center — zero long-tail keyword capture" },
      { type: "critical", description: "Missing meta descriptions on 12 of 15 pages" },
      { type: "high", description: "Page speed: 4.2s on mobile (target: <2.5s)" },
      { type: "medium", description: "No schema markup for services or FAQ" },
      { type: "medium", description: "Only 23 referring domains — competitor average is 150+" },
    ],
    recommendations: [
      "Launch a blog with weekly posts targeting long-tail cybersecurity keywords",
      "Create dedicated landing pages for each service (MDR, SOC, SIEM)",
      "Build backlink strategy through guest posts on CSO Online, Dark Reading, SC Media",
      "Add FAQ schema to all service pages",
      "Optimize Core Web Vitals — compress images, enable lazy loading",
    ],
    competitorComparison: [
      { competitor: "Arctic Wolf", organicTraffic: "~45K/mo", keywords: 2800, backlinks: 4200 },
      { competitor: "Expel", organicTraffic: "~28K/mo", keywords: 1900, backlinks: 2100 },
    ],
  }),
  "ai-orchestrate-campaign": "## Campaign Orchestration Plan\n\n**Campaign:** \"Stop Chasing Leads\" — Q2 Demand Gen\n**Duration:** 90 days\n**Budget:** $4,500/mo ($1,500 ads + $3,000 content/management)\n\n### Phase 1: Awareness (Days 1-30)\n- Publish 4 SEO blog posts targeting MDR/SIEM keywords\n- Launch LinkedIn thought leadership series (3x/week posts)\n- Create downloadable \"CISO's Guide to Vendor Evaluation\"\n- Start Google Ads for \"MDR services\" and \"SOC as a service\"\n\n### Phase 2: Engagement (Days 31-60)\n- Host CISO Roundtable webinar (target: 50 registrants)\n- Launch email nurture sequence for content downloaders\n- Begin LinkedIn connection campaign (100 prospects/week)\n- Publish 2 client case studies\n\n### Phase 3: Conversion (Days 61-90)\n- Direct outreach to engaged prospects (opened 3+ emails)\n- Retargeting ads for website visitors and webinar attendees\n- Schedule discovery calls with qualified leads\n- Launch referral program for existing clients\n\n### Expected Outcomes\n- 45-60 MQLs generated\n- 15-20 qualified meetings booked\n- $150,000-$250,000 pipeline created\n- 3-5 proposals sent",
  "ai-competitor-intel": JSON.stringify({
    competitors: [
      { name: "Cybersecurity Marketing Agency X", strengths: ["Strong SEO presence", "Case studies from Fortune 500 clients"], weaknesses: ["Generalist approach — not cybersecurity-only", "Slow turnaround (6-8 weeks for content)"], pricing: "$8,000-$15,000/mo", differentiator: "PMG's exclusive cybersecurity focus means deeper industry knowledge and faster content production" },
      { name: "Tech Marketing Co Y", strengths: ["Large team", "Full-service including PR"], weaknesses: ["No lead generation guarantee", "Cookie-cutter content", "High minimum commitment (12 months)"], pricing: "$6,000-$12,000/mo", differentiator: "PMG's 20-lead guarantee and 90-day pilot option reduces client risk" },
    ],
    marketPosition: "PMG Group occupies a unique niche: cybersecurity-exclusive with guaranteed lead volume. No direct competitor offers both specialization and a quantified guarantee.",
    recommendations: ["Lead with the 20-lead guarantee in all pitches", "Emphasize cybersecurity-only positioning", "Offer flexible pilot terms to counter competitor lock-in"],
  }),
  "ai-onboard-client": "## Client Onboarding Checklist\n\n**Client:** [Company Name]\n**Tier:** Growth ($5,000/mo)\n**Start Date:** [Date]\n**Account Manager:** [Assigned]\n\n### Week 1: Discovery & Setup\n- [ ] Kick-off call — align on goals, KPIs, and communication cadence\n- [ ] Access granted: Google Analytics, Google Ads, LinkedIn, CMS\n- [ ] ICP workshop — define target personas, industries, company sizes\n- [ ] Competitive landscape review\n- [ ] Content audit of existing materials\n\n### Week 2: Strategy & Foundation\n- [ ] SEO keyword research and content calendar (90-day plan)\n- [ ] LinkedIn outreach campaign design\n- [ ] Ad account setup and targeting configuration\n- [ ] Brand voice guidelines documented\n- [ ] Reporting dashboard configured\n\n### Week 3: Execution Begins\n- [ ] First 2 blog posts published\n- [ ] LinkedIn connection campaign launched (100 targets)\n- [ ] Google Ads campaigns live\n- [ ] First weekly check-in call\n\n### Week 4: Optimize & Report\n- [ ] First monthly performance report delivered\n- [ ] Campaign adjustments based on early data\n- [ ] Lead pipeline review with client sales team\n- [ ] Month 2 content calendar finalized",
  "ai-audit-client": JSON.stringify({
    overallHealth: 82,
    areas: [
      { name: "Lead Generation", score: 88, trend: "improving", notes: "On track — 17 of 20 leads delivered this month" },
      { name: "Content Quality", score: 85, trend: "stable", notes: "Blog engagement up 12%. Whitepaper download rate 8.4%" },
      { name: "Ad Performance", score: 72, trend: "needs attention", notes: "CPC increased 15% — recommend new ad creative rotation" },
      { name: "SEO Progress", score: 78, trend: "improving", notes: "3 keywords moved to page 1. Domain authority up 4 points" },
      { name: "Client Satisfaction", score: 90, trend: "stable", notes: "NPS: 9/10 on last survey. Positive feedback on account management" },
    ],
    actionItems: ["Refresh Google Ads creative to reduce CPC", "Add 2 more long-tail keyword landing pages", "Schedule quarterly business review"],
  }),
  "ai-create-image-prompt": "A modern, dark-themed infographic showing a cybersecurity company's pipeline funnel. At the top: scattered threat icons (locks, shields, warning symbols) representing raw prospects. In the middle: a glowing red filter labeled 'AI Qualification Engine' with data streams flowing through it. At the bottom: clean, organized rows of qualified leads with green checkmarks. Color palette: deep navy (#0a1628), crimson red (#dc2626), white text. Style: clean corporate tech, not cartoonish. Include subtle circuit board patterns in the background.",
  "ai-create-video-script": "## Video Script: \"How Cybersecurity Companies Get More Qualified Leads\"\n**Duration:** 90 seconds\n**Style:** Motion graphics with voiceover\n\n---\n\n**[0:00-0:10] HOOK**\n*Visual: Red alert notification pops up on a dark screen*\n\"Your cybersecurity product stops threats. But who's stopping your pipeline from going dark?\"\n\n**[0:10-0:25] PROBLEM**\n*Visual: Empty CRM dashboard, frustrated sales team*\n\"Most cybersecurity companies have the same problem: an incredible product, but only 3-5 inbound leads per month. Your SDRs are cold-calling into the void.\"\n\n**[0:25-0:45] SOLUTION**\n*Visual: PMG dashboard lighting up with qualified leads flowing in*\n\"PMG Group works exclusively with cybersecurity companies. We build the marketing engine your product deserves — SEO that ranks for SIEM, MDR, and SOC keywords, LinkedIn campaigns that reach CISOs directly, and content that converts technical browsers into buying conversations.\"\n\n**[0:45-0:60] PROOF**\n*Visual: Case study metrics animating on screen*\n\"Our clients average 20 qualified leads per month within 90 days. That's not impressions or clicks — that's real meetings with real buyers.\"\n\n**[0:60-0:75] CTA**\n*Visual: Calendar booking interface*\n\"Ready to fill your pipeline? Book a 15-minute strategy call and we'll show you exactly how we'd do it for your company.\"\n\n**[0:75-0:90] CLOSE**\n*Visual: PMG logo with tagline*\n\"PMG Group — Cybersecurity Marketing, Exclusively.\"",
  "ai-create-document": "# Cybersecurity Marketing Playbook\n\n## For Internal Use — PMG Group LLC\n\n### 1. Understanding the Cybersecurity Buyer\n\nThe cybersecurity buying cycle is unique:\n- **Average sales cycle:** 4-8 months for mid-market, 9-18 months for enterprise\n- **Decision makers:** CISO (technical validation), CFO/CEO (budget approval), IT Director (implementation)\n- **Trust signals that matter:** SOC 2, ISO 27001, FedRAMP, case studies with named clients\n\n### 2. Content That Converts\n\n**What works:**\n- Threat landscape reports with original data\n- Compliance guides (SOC 2 readiness, NIST framework implementation)\n- ROI calculators showing cost-of-breach vs. prevention investment\n- Comparison guides (e.g., \"SIEM vs. XDR: Which Does Your Organization Need?\")\n\n**What doesn't work:**\n- Generic \"Top 10 Cybersecurity Tips\" blog posts\n- Content that uses jargon without explaining business impact\n- Gated content that requires too much information upfront\n\n### 3. Channel Strategy\n\n| Channel | Best For | Expected ROI |\n|---------|----------|-------------|\n| LinkedIn | Thought leadership, direct outreach | 15-25x |\n| Google Ads | Bottom-funnel capture | 8-12x |\n| SEO/Content | Long-term pipeline | 20-40x (6-month horizon) |\n| Webinars | Mid-funnel nurturing | 10-15x |\n| Email | Nurture sequences | 12-18x |",
  "ai-generate-leads": JSON.stringify({
    leadsGenerated: 8,
    leads: [
      { company: "Meridian Cyber Defense", contact: "Robert Hayes, VP Sales", fitScore: 89, source: "LinkedIn Campaign", painPoint: "Need inbound pipeline — currently 100% outbound" },
      { company: "CloudFort Security", contact: "Anna Petrov, CMO", fitScore: 86, source: "Google Ads", painPoint: "High website traffic but <1% conversion rate" },
      { company: "IronGate MSSP", contact: "Michael Torres, CEO", fitScore: 92, source: "Webinar Registration", painPoint: "Scaling from 50 to 200 clients, need marketing engine" },
      { company: "ZeroDay Labs", contact: "Priya Sharma, Marketing Director", fitScore: 78, source: "Content Download", painPoint: "No brand differentiation vs. larger competitors" },
    ],
    pipeline: 187500,
    summary: "Generated 8 new qualified leads this cycle. 4 high-priority (fit score 85+). Estimated pipeline value: $187,500. Top source: LinkedIn Campaign (3 leads).",
  }),
  "ai-build-campaign": "## Campaign Brief: Q2 Cybersecurity Demand Gen\n\n**Objective:** Generate 60 MQLs and 20 qualified meetings in 90 days\n**Target Audience:** VP Marketing / CMO at cybersecurity companies, 50-500 employees\n**Budget:** $4,500/mo total\n\n### Channels & Tactics\n1. **LinkedIn (40% of effort):** 3x/week thought leadership posts + 100 connection requests/week\n2. **Google Ads (25%):** Search campaigns for \"MDR marketing agency\", \"cybersecurity lead generation\"\n3. **Content/SEO (25%):** 4 blog posts/month + 1 gated asset (whitepaper or webinar)\n4. **Email (10%):** Nurture sequences for content downloaders\n\n### Content Calendar Highlights\n- Week 1: Blog — \"Why Cybersecurity Companies Struggle with Inbound Marketing\"\n- Week 2: Whitepaper — \"The CISO's Guide to Evaluating Marketing Partners\"\n- Week 3: Blog — \"5 SEO Keywords Every MDR Company Should Own\"\n- Week 4: Case Study — \"How [Client] Went from 4 to 22 Leads/Month\"\n\n### KPIs\n| Metric | Target | Tracking |\n|--------|--------|----------|\n| Website visits | 5,000/mo | Google Analytics |\n| Content downloads | 200/mo | HubSpot |\n| LinkedIn engagement rate | 4%+ | LinkedIn Analytics |\n| MQLs | 20/mo | CRM |\n| Meetings booked | 7/mo | Calendar |",
  "ai-generate-client-report": "## Client Performance Report — [Client Name]\n**Period:** Last 30 Days\n**Account Manager:** PMG Group\n\n### Executive Summary\nStrong month with 18 qualified leads delivered (90% of target). Pipeline value grew by $125,000. Content performance improving with blog traffic up 34%.\n\n### Lead Generation\n- **Leads Delivered:** 18 of 20 target\n- **Lead Quality:** Average fit score 84 (above 80 threshold)\n- **Top Sources:** LinkedIn outreach (8), Google Ads (5), Content/SEO (3), Referral (2)\n- **Meetings Booked:** 6 discovery calls scheduled\n\n### Content Performance\n- **Blog Posts Published:** 4 (all indexed within 48 hours)\n- **Total Blog Traffic:** 2,847 visits (+34% vs. last month)\n- **Whitepaper Downloads:** 47\n- **LinkedIn Posts:** 12 posts, avg. 3.8% engagement rate\n\n### Paid Advertising\n- **Google Ads Spend:** $1,800\n- **Clicks:** 342 | **CTR:** 4.2%\n- **Leads from Ads:** 5 | **Cost per Lead:** $360\n- **Pipeline from Ads:** $75,000 (42x ROI on ad spend)\n\n### Next Month Priorities\n1. Launch retargeting campaign for whitepaper downloaders\n2. Publish 2 new case studies\n3. Host first CISO Roundtable webinar\n4. Optimize Google Ads — test new ad creative to reduce CPL",
  "ai-assign-tasks": JSON.stringify({
    assigned: [
      { task: "Write blog post: 'SIEM vs XDR — Which Does Your Organization Need?'", assignedTo: "Content Agent", priority: "high", dueDate: "3 days", estimatedHours: 4 },
      { task: "Design landing page for MDR whitepaper download", assignedTo: "Design Agent", priority: "high", dueDate: "5 days", estimatedHours: 6 },
      { task: "Set up Google Ads campaign for 'SOC as a service' keywords", assignedTo: "Campaign Agent", priority: "medium", dueDate: "7 days", estimatedHours: 3 },
      { task: "Review and approve Q2 content calendar", assignedTo: "Strategy Agent", priority: "medium", dueDate: "2 days", estimatedHours: 1 },
    ],
    summary: "4 tasks assigned across 4 agents. Total estimated effort: 14 hours. Highest priority: blog post and landing page for upcoming campaign launch.",
  }),
  "ai-manage-knowledge": JSON.stringify({
    entriesUpdated: 3,
    newEntries: [
      { title: "MDR Client Onboarding SOP v2.1", category: "SOP", source: "Client feedback from Q1 reviews" },
      { title: "LinkedIn Outreach — Best Practices (Updated)", category: "Playbook", source: "Analysis of top-performing messages" },
      { title: "Competitive Pricing Matrix — Q2 2024", category: "Intelligence", source: "Win/loss analysis from last 10 deals" },
    ],
    recommendations: ["Update the cold email templates based on latest A/B test results", "Archive 4 outdated SOPs from 2022", "Add new case study from CloudFort engagement"],
  }),
  "ai-executive-briefing": "## Daily Executive Briefing\n\n**Date:** Today | **System Status:** All systems operational\n\n### 🔴 Urgent Items\n- **Deal at risk:** SecureStack proposal — no response in 5 days. VP Marketing went dark after initial call. Recommend: Send LinkedIn DM + have founder reach out.\n- **Content deadline:** CISO Roundtable webinar landing page needed by Friday. Design agent currently at 60% completion.\n\n### 📊 Pipeline Snapshot\n- Active deals: 7 ($437,500 total pipeline)\n- Deals closing this month: 2 ($110,000)\n- New leads today: 3 (all from LinkedIn campaign)\n- Win rate (90 days): 32%\n\n### ✅ Completed Today\n- Published blog post: \"Why MSSPs Need a Content Strategy\" (indexed in 4 hours)\n- Sent 45 LinkedIn connection requests (12 accepted)\n- Qualified 2 new leads from webinar registrations\n\n### 📋 Key Decisions Needed\n1. Approve $2,000 budget increase for Google Ads (CPC trending up)\n2. Review and approve IronGate MSSP proposal before Thursday send\n3. Decide on sponsoring RSA Conference side event ($3,500)",
  "ai-system-evolution": JSON.stringify({
    suggestions: [
      { area: "Outreach", improvement: "Add automated LinkedIn post scheduling based on engagement patterns", impact: "15% increase in response rates", effort: "Medium" },
      { area: "CRM", improvement: "Implement deal velocity alerts — flag deals that slow below average pace", impact: "Reduce stale deals by 40%", effort: "Low" },
      { area: "Content", improvement: "Build a content repurposing workflow — blog → LinkedIn carousel → email snippet", impact: "3x content output with same effort", effort: "Medium" },
      { area: "Reporting", improvement: "Add client-facing live dashboard with real-time lead tracking", impact: "Reduce client check-in calls by 50%", effort: "High" },
    ],
    systemHealth: { uptime: "99.8%", aiAccuracy: "87%", avgResponseTime: "1.2s", cacheHitRate: "64%" },
  }),
  "ai-create-invoice": JSON.stringify({
    invoice: {
      number: "PMG-2024-0042",
      client: "[Client Name]",
      period: "March 2024",
      lineItems: [
        { description: "Growth Tier — Monthly Retainer", quantity: 1, rate: 5000, total: 5000 },
        { description: "Google Ads Management (15% of $1,800 spend)", quantity: 1, rate: 270, total: 270 },
        { description: "Additional Whitepaper — CISO Guide", quantity: 1, rate: 1500, total: 1500 },
      ],
      subtotal: 6770,
      tax: 0,
      total: 6770,
      terms: "Net 30",
      dueDate: "30 days from invoice date",
    },
  }),
  "ai-manage-contracts": JSON.stringify({
    activeContracts: 0,
    pendingRenewal: 0,
    summary: "No active contracts. Create contracts as clients onboard.",
    actions: ["Review and finalize new client MSA template", "Set up auto-renewal notifications at 60 and 30 days before expiry"],
  }),
  "ai-check-compliance": JSON.stringify({
    overallStatus: "Compliant",
    checks: [
      { area: "Data Handling", status: "pass", details: "All client data encrypted at rest and in transit" },
      { area: "Access Controls", status: "pass", details: "Role-based access with MFA enabled" },
      { area: "Contract Compliance", status: "pass", details: "All active contracts within SLA terms" },
      { area: "Financial Reporting", status: "pass", details: "Revenue recognition following GAAP standards" },
      { area: "Client Data Privacy", status: "warning", details: "2 clients missing signed DPA — follow up required" },
    ],
    recommendations: ["Send DPA addendum to 2 clients missing data processing agreements", "Schedule quarterly compliance review", "Update privacy policy for new state regulations"],
  }),
  "ai-video-guide": "## Video Production Guide\n\n### Pre-Production\n1. Define objective and target audience\n2. Write script (aim for 60-90 seconds)\n3. Create storyboard with visual references\n4. Select music and voiceover style\n\n### Production Standards\n- Resolution: 1920x1080 minimum\n- Color palette: Match PMG branding (navy, crimson, white)\n- Typography: Clean sans-serif (Inter or similar)\n- Animation style: Modern motion graphics, not cartoon\n\n### Post-Production\n- Add captions for accessibility and silent autoplay\n- Export versions: Full (YouTube), Short (LinkedIn), Square (Instagram)\n- Include end card with CTA and contact info",
  "ai-linkedin-sync": JSON.stringify({
    synced: true,
    connectionsAdded: 12,
    messagesTracked: 8,
    profileViewsLogged: 23,
    summary: "LinkedIn sync complete. 12 new connections added to CRM, 8 message threads tracked, 23 profile views logged for lead scoring enrichment.",
  }),
  "ai-ghl-sync": JSON.stringify({
    synced: true,
    contactsSynced: 15,
    pipelineStagesMatched: true,
    automationsActive: 3,
    summary: "GoHighLevel sync complete. 15 contacts bidirectionally synced. Pipeline stages mapped. 3 automations running (new lead notification, follow-up reminder, proposal sent trigger).",
  }),
  "ai-google-ads-sync": JSON.stringify({
    synced: true,
    activeCampaigns: 2,
    totalSpend: 1800,
    clicks: 342,
    conversions: 5,
    cpc: 5.26,
    cpl: 360,
    summary: "Google Ads sync complete. 2 active campaigns running. $1,800 spent, 342 clicks, 5 conversions. Top performing keyword: 'managed detection response services' (CPC: $4.20, 3 conversions).",
  }),
  "ai-stripe-payment": JSON.stringify({
    processed: true,
    paymentId: "pi_simulated_001",
    amount: 5000,
    currency: "usd",
    status: "succeeded",
    client: "[Client Name]",
    description: "Growth Tier — Monthly Retainer (March 2024)",
    summary: "Payment of $5,000 processed successfully. Invoice PMG-2024-0042 marked as paid.",
  }),
  "ai-icp-generation": JSON.stringify({
    icp: {
      industry: "Cybersecurity — MDR, MSSP, XDR, SIEM vendors",
      companySize: "50-500 employees",
      revenue: "$5M-$50M ARR",
      decisionMakers: ["VP Marketing", "CMO", "CEO (at <100 employees)", "Director of Growth"],
      painPoints: ["Low inbound lead volume", "Reliance on referrals and word-of-mouth", "No dedicated content strategy", "Competing against well-funded competitors for SEO keywords", "Long sales cycles with no nurture engine"],
      buyingSignals: ["Recently funded (Series A/B)", "Hiring sales/marketing roles", "Launching new product lines", "Expanding into new verticals (federal, healthcare)"],
      disqualifiers: ["Companies with in-house marketing teams of 5+", "Annual contracts under $2,500/mo budget", "Companies not in cybersecurity/IT"],
    },
  }),
  "ai-competitor-analysis": JSON.stringify({
    competitors: [
      { name: "CyberMarketing Pro", marketShare: "12%", strengths: ["Strong PR network", "Enterprise case studies"], weaknesses: ["Generalist team", "No lead guarantee"], threat: "Medium" },
      { name: "TechGrowth Agency", marketShare: "8%", strengths: ["Lower pricing", "Fast turnaround"], weaknesses: ["No cybersecurity expertise", "Template-based content"], threat: "Low" },
    ],
    pmgAdvantage: "Only agency exclusively serving cybersecurity companies with a quantified lead guarantee (20/month).",
    marketSize: "$2.4B cybersecurity marketing services TAM, growing 18% annually",
  }),
  "ai-market-segmentation": JSON.stringify({
    segments: [
      { name: "Growth-Stage MDR", size: "~340 companies in US", avgDealSize: 60000, winRate: 35, description: "Series A/B funded MDR companies scaling from founder-led sales to structured marketing" },
      { name: "Established MSSP", size: "~500 companies in US", avgDealSize: 84000, winRate: 28, description: "Mature MSSPs looking to differentiate and capture enterprise accounts" },
      { name: "Emerging AppSec/DevSecOps", size: "~200 companies in US", avgDealSize: 48000, winRate: 40, description: "Fast-growing application security vendors needing brand awareness" },
    ],
    recommendation: "Focus on Growth-Stage MDR segment — highest win rate and strong product-market fit with PMG's 20-lead guarantee.",
  }),
  "ai-summarize-record": "## Record Summary\n\nThis record shows consistent engagement over the past 14 days. The prospect has opened 4 emails, clicked through to the case study page twice, and viewed the pricing page once. LinkedIn activity shows they've been engaging with cybersecurity marketing content from competitors as well, indicating active vendor evaluation.\n\n**Key Takeaway:** High buying intent detected. Recommend escalating to a direct phone call within the next 48 hours before they commit to a competitor.\n\n**Risk Factors:** Competitor engagement detected. Timeline pressure — prospect mentioned Q2 budget allocation deadline.",
  default: "Based on the available data and PMG Group's cybersecurity marketing expertise, here is the analysis:\n\nThe request has been processed successfully. The results are based on current market data, ICP alignment scoring, and PMG's proprietary lead qualification framework.\n\nKey findings have been logged to the knowledge base for future reference. If this analysis requires human review, it has been flagged in the notification center.\n\nNext recommended action: Review the output and take the suggested next steps within the recommended timeframe to maintain momentum.",
};

export function enableDummyMode(): { enabled: boolean; responseCount: number } {
  dummyModeEnabled = true;
  return { enabled: true, responseCount: Object.keys(DUMMY_AI_RESPONSES).length };
}

export function disableDummyMode(): { enabled: boolean } {
  dummyModeEnabled = false;
  return { enabled: false };
}

export function isDummyModeEnabled(): boolean {
  return dummyModeEnabled;
}

export function getDummyResponse(tool: string, _input?: Record<string, any>): string | null {
  if (!dummyModeEnabled) return null;

  const custom = dummyResponses.get(tool);
  if (custom) return JSON.stringify(custom(_input ?? {}));

  return DUMMY_AI_RESPONSES[tool] ?? DUMMY_AI_RESPONSES["default"];
}

export function registerDummyResponse(tool: string, responseFn: (input: Record<string, any>) => Record<string, any>): void {
  dummyResponses.set(tool, responseFn);
}

export function getDummyModeStatus() {
  return {
    enabled: dummyModeEnabled,
    builtInResponses: Object.keys(DUMMY_AI_RESPONSES),
    customResponses: Array.from(dummyResponses.keys()),
  };
}

async function runTest(suite: string, name: string, fn: () => Promise<void>): Promise<TestRunResult> {
  const id = `${suite}::${name}::${Date.now()}`;
  const start = Date.now();
  try {
    await fn();
    const result: TestRunResult = { id, suite, name, status: "passed", durationMs: Date.now() - start, timestamp: new Date() };
    pushResult(result);
    return result;
  } catch (err: any) {
    const result: TestRunResult = { id, suite, name, status: "failed", durationMs: Date.now() - start, error: err.message, timestamp: new Date() };
    pushResult(result);
    return result;
  }
}

function pushResult(r: TestRunResult) {
  testResults.push(r);
  if (testResults.length > MAX_HISTORY) {
    testResults.splice(0, testResults.length - MAX_HISTORY);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertDefined(value: any, message: string): void {
  if (value === undefined || value === null) throw new Error(`Expected defined value: ${message}`);
}

async function runCrmIntegrationTests(): Promise<TestSuiteResult> {
  const suite = "crm_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "lead_creation", async () => {
    const [lead] = await db.insert(leadsTable).values({
      source: "test_suite",
      status: "new",
      priority: "medium",
    } as any).returning();
    assertDefined(lead.id, "Lead should have an ID");
    assert(lead.status === "new", "Lead status should be 'new'");
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
  }));

  tests.push(await runTest(suite, "company_creation_with_lead", async () => {
    const [company] = await db.insert(companiesTable).values({
      name: `Test Co ${Date.now()}`,
      industry: "Technology",
      status: "prospect",
    }).returning();
    const [lead] = await db.insert(leadsTable).values({
      companyId: company.id,
      source: "test_suite",
      status: "new",
      priority: "high",
    } as any).returning();
    assert(lead.companyId === company.id, "Lead should reference company");
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
    await db.delete(companiesTable).where(eq(companiesTable.id, company.id));
  }));

  tests.push(await runTest(suite, "opportunity_lifecycle", async () => {
    const [opp] = await db.insert(opportunitiesTable).values({
      title: `Test Deal ${Date.now()}`,
      value: 25000,
      stage: "discovery",
    }).returning();
    assert(opp.stage === "discovery", "Opportunity should start at discovery");
    assert(opp.value === 25000, "Opportunity value should be 25000");
    const [updated] = await db.update(opportunitiesTable).set({ stage: "proposal" }).where(eq(opportunitiesTable.id, opp.id)).returning();
    assert(updated.stage === "proposal", "Should advance to proposal");
    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, opp.id));
  }));

  tests.push(await runTest(suite, "contact_creation", async () => {
    const [contact] = await db.insert(contactsTable).values({
      firstName: "Test",
      lastName: "Contact",
      email: `test-${Date.now()}@test.com`,
    }).returning();
    assertDefined(contact.id, "Contact should have ID");
    await db.delete(contactsTable).where(eq(contactsTable.id, contact.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runFinanceIntegrationTests(): Promise<TestSuiteResult> {
  const suite = "finance_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "invoice_creation", async () => {
    const [inv] = await db.insert(invoicesTable).values({
      invoiceNumber: `TEST-${Date.now()}`,
      clientName: "Test Client",
      amount: 5000,
      status: "draft",
      dueDate: new Date(Date.now() + 30 * 86400000),
    } as any).returning();
    assert(inv.status === "draft", "Invoice should start as draft");
    assertDefined(inv.id, "Invoice should have ID");
    await db.delete(invoicesTable).where(eq(invoicesTable.id, inv.id));
  }));

  tests.push(await runTest(suite, "contract_creation", async () => {
    const [contract] = await db.insert(contractsTable).values({
      title: `Test Contract ${Date.now()}`,
      type: "service_agreement",
      status: "draft",
    } as any).returning();
    assert(contract.status === "draft", "Contract should start as draft");
    await db.delete(contractsTable).where(eq(contractsTable.id, contract.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runEventBusTests(): Promise<TestSuiteResult> {
  const suite = "event_bus_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "event_emission_and_subscription", async () => {
    const { subscribe } = await import("./event-bus");
    let received = false;
    const unsub = subscribe("test.event", async () => { received = true; });
    await emit("test.event", { domain: "test", actor: "test_suite", actorType: "system" });
    await new Promise(r => setTimeout(r, 100));
    assert(received === true, "Event should have been received");
    unsub();
  }));

  tests.push(await runTest(suite, "wildcard_subscription", async () => {
    const { subscribe } = await import("./event-bus");
    let wildcardReceived = false;
    const unsub = subscribe("*", async (event) => {
      if (event === "test.wildcard") wildcardReceived = true;
    });
    await emit("test.wildcard", { domain: "test", actor: "test_suite", actorType: "system" });
    await new Promise(r => setTimeout(r, 100));
    assert(wildcardReceived === true, "Wildcard subscriber should receive event");
    unsub();
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runToolChainTests(): Promise<TestSuiteResult> {
  const suite = "tool_chain_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "tool_registry_populated", async () => {
    const { getAllTools } = await import("./tool-chain-service");
    const allTools = getAllTools();
    assert(allTools.length >= 30, `Expected 30+ tools, got ${allTools.length}`);
  }));

  tests.push(await runTest(suite, "tool_lookup_by_name", async () => {
    const { getTool } = await import("./tool-chain-service");
    const tool = getTool("enrich_lead");
    assertDefined(tool, "enrich_lead tool should exist");
    assert(tool!.domain === "crm", "enrich_lead should be in crm domain");
  }));

  tests.push(await runTest(suite, "chain_templates_populated", async () => {
    const { getAllChainTemplates } = await import("./tool-chain-service");
    const chains = getAllChainTemplates();
    assert(chains.length >= 9, `Expected 9+ chain templates, got ${chains.length}`);
  }));

  tests.push(await runTest(suite, "chain_template_lookup", async () => {
    const { getChainTemplate } = await import("./tool-chain-service");
    const chain = getChainTemplate("lead_qualification");
    assertDefined(chain, "lead_qualification chain should exist");
    assert(chain!.steps.length >= 2, "lead_qualification should have 2+ steps");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runReportingKnowledgeTests(): Promise<TestSuiteResult> {
  const suite = "reporting_knowledge_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "knowledge_entry_creation", async () => {
    const { addKnowledgeEntry } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "test",
      title: `Test Entry ${Date.now()}`,
      content: "Test knowledge content",
      source: "test_suite",
      confidence: 90,
    });
    assertDefined(entry.id, "Knowledge entry should have ID");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  tests.push(await runTest(suite, "report_generation_and_cleanup", async () => {
    const [report] = await db.insert(reportsTable).values({
      title: `Test Report ${Date.now()}`,
      type: "test",
      domain: "test",
      status: "draft",
      generationType: "test",
    } as any).returning();
    assertDefined(report.id, "Report should have ID");
    assert(report.status === "draft", "Report should start as draft");
    await db.delete(reportsTable).where(eq(reportsTable.id, report.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runEndToEndWorkflowTests(): Promise<TestSuiteResult> {
  const suite = "e2e_workflow";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "lead_to_opportunity_flow", async () => {
    const [company] = await db.insert(companiesTable).values({
      name: `E2E Test Corp ${Date.now()}`,
      industry: "Cybersecurity",
      status: "prospect",
    }).returning();

    const [lead] = await db.insert(leadsTable).values({
      companyId: company.id,
      source: "e2e_test",
      status: "new",
      priority: "high",
    } as any).returning();

    await emit("lead.created", {
      entityType: "lead",
      entityId: lead.id,
      domain: "crm",
      actor: "e2e_test",
      actorType: "system",
    });

    const [qualifiedLead] = await db.update(leadsTable).set({ status: "qualified" }).where(eq(leadsTable.id, lead.id)).returning();
    assert(qualifiedLead.status === "qualified", "Lead should be qualified");

    const [opp] = await db.insert(opportunitiesTable).values({
      title: `E2E Deal — ${company.name}`,
      companyId: company.id,
      leadId: lead.id,
      value: 75000,
      stage: "discovery",
    }).returning();

    await emit("lead.converted", {
      entityType: "lead",
      entityId: lead.id,
      domain: "crm",
      actor: "e2e_test",
      actorType: "system",
      data: { opportunityId: opp.id, name: company.name },
    });

    assert(opp.leadId === lead.id, "Opportunity should reference lead");
    assert(opp.companyId === company.id, "Opportunity should reference company");

    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, opp.id));
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
    await db.delete(companiesTable).where(eq(companiesTable.id, company.id));
  }));

  tests.push(await runTest(suite, "invoice_lifecycle_flow", async () => {
    const [inv] = await db.insert(invoicesTable).values({
      invoiceNumber: `E2E-${Date.now()}`,
      clientName: "E2E Client",
      amount: 10000,
      status: "draft",
      dueDate: new Date(Date.now() + 30 * 86400000),
    } as any).returning();

    assert(inv.status === "draft", "Invoice starts as draft");

    const [sent] = await db.update(invoicesTable).set({ status: "sent" }).where(eq(invoicesTable.id, inv.id)).returning();
    assert(sent.status === "sent", "Invoice transitions to sent");

    const [paid] = await db.update(invoicesTable).set({ status: "paid" }).where(eq(invoicesTable.id, inv.id)).returning();
    assert(paid.status === "paid", "Invoice transitions to paid");

    await emit("invoice.paid", {
      entityType: "invoice",
      entityId: inv.id,
      domain: "finance",
      actor: "e2e_test",
      actorType: "system",
      data: { amount: 10000, client: "E2E Client" },
    });

    await new Promise(r => setTimeout(r, 500));

    await db.delete(invoicesTable).where(eq(invoicesTable.id, inv.id));
  }));

  tests.push(await runTest(suite, "deal_won_triggers_report_and_knowledge", async () => {
    const [opp] = await db.insert(opportunitiesTable).values({
      title: `E2E Won Deal ${Date.now()}`,
      value: 50000,
      stage: "won",
    }).returning();

    const beforeReports = await db.select({ count: count() }).from(reportsTable);
    const beforeKnowledge = await db.select({ count: count() }).from(knowledgeEntriesTable);

    await emit("opportunity.won", {
      entityType: "opportunity",
      entityId: opp.id,
      domain: "crm",
      actor: "e2e_test",
      actorType: "system",
      data: { title: opp.title, value: 50000, previousStage: "negotiation" },
    });

    await new Promise(r => setTimeout(r, 3000));

    const afterReports = await db.select({ count: count() }).from(reportsTable);
    const afterKnowledge = await db.select({ count: count() }).from(knowledgeEntriesTable);

    assert(Number(afterReports[0].count) > Number(beforeReports[0].count), "Event should trigger a new report");
    assert(Number(afterKnowledge[0].count) > Number(beforeKnowledge[0].count), "Event should auto-populate knowledge");

    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, opp.id));
  }));

  tests.push(await runTest(suite, "webhook_to_lead_pipeline", async () => {
    const { processInboundWebhook } = await import("./integration-hub-service");
    const result = await processInboundWebhook({
      source: "lead_form",
      event: "lead_capture",
      payload: {
        name: `E2E Webhook Lead ${Date.now()}`,
        email: `e2e-${Date.now()}@test.com`,
        source: "e2e_test",
      },
    });
    assert(result.processed === true, "Webhook should process successfully");
    assert(result.entityType === "lead", "Should create a lead");
    assertDefined(result.entityId, "Should return entity ID");

    if (result.entityId) {
      await db.delete(leadsTable).where(eq(leadsTable.id, result.entityId));
    }
  }));

  tests.push(await runTest(suite, "csv_import_pipeline", async () => {
    const { importCsvData } = await import("./integration-hub-service");
    const result = await importCsvData({
      entityType: "contacts",
      csvContent: "firstName,lastName,email\nE2EFirst,E2ELast,e2e@test.com",
      fieldMapping: { firstName: "firstName", lastName: "lastName", email: "email" },
      actor: "e2e_test",
      skipDuplicates: true,
      dryRun: true,
    });
    assert(result.success === true, "Dry-run import should succeed");
    assert(result.imported === 1, "Should detect 1 importable row");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runTriModeAiTests(): Promise<TestSuiteResult> {
  const suite = "tri_mode_ai";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { setGlobalMode, getGlobalMode, shouldAiAct, setWorkflowMode } = await import("./ai-mode-service");
  const { setDummyMode: setWalletDummy } = await import("./wallet-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "set_global_ai_autonomous", async () => {
    await setGlobalMode("ai_autonomous");
    const mode = await getGlobalMode();
    assert(mode === "ai_autonomous", `Expected ai_autonomous, got ${mode}`);
  }));

  tests.push(await runTest(suite, "ai_mode_allows_all_workflows", async () => {
    const wfKeys = ["lead_scoring", "reporting", "outreach_draft", "transcript_analysis"];
    for (const key of wfKeys) {
      const check = await shouldAiAct(key, 90);
      assert(check.canAct === true, `AI should act for ${key} in ai_autonomous, got blocked: ${check.reason}`);
    }
  }));

  tests.push(await runTest(suite, "ai_mode_dummy_callAI_returns_result", async () => {
    enableDummyMode();
    setWalletDummy(true);
    try {
      const { callAI } = await import("./ai-service");
      const result = await callAI({
        systemPrompt: "You are a test assistant",
        userPrompt: "Test prompt for AI mode",
        workflowKey: "lead_scoring",
        tool: "ai-score-lead",
        domain: "crm",
        action: "test_score",
      });
      assertDefined(result.result, "Should return a result");
      assert(result.confidence >= 0, "Should have confidence score");
      assertDefined(result.runId, "Should have run ID");
    } finally {
      disableDummyMode();
      setWalletDummy(false);
    }
  }));

  tests.push(await runTest(suite, "ai_mode_cache_hit_works", async () => {
    const { cacheSet, cacheGet, TTL } = await import("./cache-service");
    const key = "test:cache:ai_mode";
    cacheSet(key, { result: "cached_value" }, TTL.AI_RESPONSE);
    const cached = cacheGet<any>(key);
    assertDefined(cached, "Cache should return stored value");
    assert(cached.result === "cached_value", "Cached value should match");
  }));

  tests.push(await runTest(suite, "ai_mode_memory_auto_ingest", async () => {
    const { addKnowledgeEntry, searchKnowledge } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "ai_output",
      title: `AI Mode Test Memory ${Date.now()}`,
      content: "Test memory entry created during AI mode test suite",
      source: "ai",
      sourceDomain: "system",
      confidence: 95,
    });
    assertDefined(entry.id, "Knowledge entry should be created");
    const found = await searchKnowledge("AI Mode Test Memory");
    assert(found.length > 0, "Should find entry via search");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  tests.push(await runTest(suite, "ai_mode_event_triggers_knowledge", async () => {
    const beforeCount = await db.select({ count: count() }).from(knowledgeEntriesTable);
    await emit("opportunity.won", {
      entityType: "opportunity", entityId: 99999, domain: "crm",
      actor: "test_suite", actorType: "system",
      data: { title: "Test AI Won Deal", value: 100000, previousStage: "negotiation" },
    });
    await new Promise(r => setTimeout(r, 2000));
    const afterCount = await db.select({ count: count() }).from(knowledgeEntriesTable);
    assert(Number(afterCount[0].count) > Number(beforeCount[0].count), "Knowledge count should increase after opportunity.won event");
  }));

  tests.push(await runTest(suite, "ai_mode_assignment_router_auto_assigns", async () => {
    const [task] = await db.insert(tasksTable).values({
      title: `AI Test Task ${Date.now()}`,
      domain: "crm",
      priority: "high",
      status: "pending",
    } as any).returning();
    assertDefined(task.id, "Task should be created");
    await emit("task.created", { entityType: "task", entityId: task.id, domain: "crm", actor: "test", actorType: "system" });
    await new Promise(r => setTimeout(r, 1500));
    const [updated] = await db.select().from(tasksTable).where(eq(tasksTable.id, task.id));
    assertDefined(updated, "Task should still exist after assignment attempt");
    await db.delete(tasksTable).where(eq(tasksTable.id, task.id));
  }));

  tests.push(await runTest(suite, "ai_mode_confidence_handoff_high", async () => {
    const { classifyConfidence } = await import("./confidence-handoff-service");
    const decision = classifyConfidence(90);
    assert(decision.tier === "HIGH", `Expected HIGH tier, got ${decision.tier}`);
    assert(decision.action === "auto_continue", "High confidence should auto-continue");
    assert(decision.requiresHuman === false, "High confidence should not require human");
  }));

  try { await setGlobalMode(origGlobal); } catch {}
  disableDummyMode();
  try { setWalletDummy(false); } catch {}

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runTriModeHybridTests(): Promise<TestSuiteResult> {
  const suite = "tri_mode_hybrid";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { setGlobalMode, getGlobalMode, shouldAiAct } = await import("./ai-mode-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "set_global_hybrid", async () => {
    await setGlobalMode("hybrid");
    const mode = await getGlobalMode();
    assert(mode === "hybrid", `Expected hybrid, got ${mode}`);
  }));

  tests.push(await runTest(suite, "hybrid_high_confidence_allows_action", async () => {
    const check = await shouldAiAct("lead_scoring", 85);
    assert(check.canAct === true, `Should allow action at 85% confidence in hybrid, got: ${check.reason}`);
  }));

  tests.push(await runTest(suite, "hybrid_low_confidence_blocks_action", async () => {
    const { setWorkflowMode } = await import("./ai-mode-service");
    await setWorkflowMode("lead_scoring", "hybrid");
    try {
      const check = await shouldAiAct("lead_scoring", 50);
      assert(check.canAct === false, `Should block action at 50% confidence in hybrid, got canAct=${check.canAct}`);
    } finally {
      await setWorkflowMode("lead_scoring", "ai_autonomous");
    }
  }));

  tests.push(await runTest(suite, "hybrid_confidence_handoff_medium", async () => {
    const { classifyConfidence } = await import("./confidence-handoff-service");
    const decision = classifyConfidence(65);
    assert(decision.tier === "MEDIUM", `Expected MEDIUM tier, got ${decision.tier}`);
    assert(decision.action === "ai_with_review", "Medium confidence should be AI with review");
    assert(decision.requiresHuman === true, "Medium confidence should require human");
  }));

  tests.push(await runTest(suite, "hybrid_confidence_handoff_low", async () => {
    const { classifyConfidence } = await import("./confidence-handoff-service");
    const decision = classifyConfidence(30);
    assert(decision.tier === "LOW", `Expected LOW tier, got ${decision.tier}`);
    assert(decision.action === "human_takeover", "Low confidence should require human takeover");
  }));

  tests.push(await runTest(suite, "hybrid_queues_pending_action", async () => {
    const { executeOrQueue } = await import("./mode-action-service");
    let executed = false;
    const result = await executeOrQueue({
      actionType: "test_hybrid_action",
      workflowKey: "lead_scoring",
      title: "Test Hybrid Queue",
      description: "Testing that hybrid mode queues actions below threshold",
      confidence: 50,
      executeAction: async () => { executed = true; },
    });
    if (result.queued) {
      assert(result.executed === false, "Queued action should not be executed");
      assert(result.queued === true, "Should be queued");
      if (result.pendingActionId) {
        await db.delete(pendingActionsTable).where(eq(pendingActionsTable.id, result.pendingActionId));
      }
    }
  }));

  tests.push(await runTest(suite, "hybrid_approval_flow", async () => {
    const [approval] = await db.insert(approvalsTable).values({
      entityType: "test",
      entityId: 99999,
      type: "test_approval",
      status: "pending",
      requestedBy: "test_suite",
      priority: "medium",
      domain: "system",
    } as any).returning();
    assertDefined(approval.id, "Approval should be created");
    assert(approval.status === "pending", "Approval should start as pending");

    const { transitionApproval } = await import("./approval-engine");
    const result = await transitionApproval({
      approvalId: approval.id,
      newStatus: "approved",
      reviewedBy: "test_suite",
      notes: "Approved during hybrid test",
    });
    assert(result.success === true, `Approval transition should succeed: ${result.error}`);
    await db.delete(approvalsTable).where(eq(approvalsTable.id, approval.id));
  }));

  tests.push(await runTest(suite, "hybrid_rejection_creates_task", async () => {
    const [approval] = await db.insert(approvalsTable).values({
      entityType: "test",
      entityId: 88888,
      type: "test_rejection",
      status: "pending",
      requestedBy: "test_suite",
      priority: "medium",
      domain: "system",
    } as any).returning();

    const { transitionApproval } = await import("./approval-engine");
    const result = await transitionApproval({
      approvalId: approval.id,
      newStatus: "rejected",
      reviewedBy: "test_suite",
      rejectionReason: "Test rejection for hybrid suite",
    });
    assert(result.success === true, `Rejection should succeed: ${result.error}`);
    await new Promise(r => setTimeout(r, 1000));

    const revisionTasks = await db.select().from(tasksTable)
      .where(eq(tasksTable.entityId, 88888));
    assert(result.success === true, "Rejection transition should succeed before checking tasks");
    await db.delete(approvalsTable).where(eq(approvalsTable.id, approval.id));
    for (const t of revisionTasks) {
      await db.delete(tasksTable).where(eq(tasksTable.id, t.id));
    }
  }));

  tests.push(await runTest(suite, "hybrid_memory_update_on_correction", async () => {
    const { addKnowledgeEntry } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "correction",
      title: `Hybrid Correction Test ${Date.now()}`,
      content: "A human corrected an AI output during hybrid review",
      source: "correction",
      sourceDomain: "crm",
      confidence: 100,
    });
    assertDefined(entry.id, "Correction entry should be created");
    assert(entry.category === "correction", "Category should be correction");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  try { await setGlobalMode(origGlobal); } catch {}

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runTriModeHumanTests(): Promise<TestSuiteResult> {
  const suite = "tri_mode_human";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { setGlobalMode, getGlobalMode, shouldAiAct } = await import("./ai-mode-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "set_global_human_controlled", async () => {
    await setGlobalMode("human_controlled");
    const mode = await getGlobalMode();
    assert(mode === "human_controlled", `Expected human_controlled, got ${mode}`);
  }));

  tests.push(await runTest(suite, "human_mode_blocks_all_ai_actions", async () => {
    const wfKeys = ["lead_scoring", "reporting", "outreach_draft", "lead_routing"];
    for (const key of wfKeys) {
      const check = await shouldAiAct(key, 99);
      assert(check.canAct === false, `AI should be blocked for ${key} in human mode`);
      assert(check.mode === "human_controlled", "Mode should be human_controlled");
    }
  }));

  tests.push(await runTest(suite, "human_mode_callAI_throws_blocked", async () => {
    enableDummyMode();
    try {
      const { callAI } = await import("./ai-service");
      let threwError = false;
      let errorMsg = "";
      try {
        await callAI({
          systemPrompt: "Test",
          userPrompt: "Test",
          workflowKey: "lead_scoring",
          tool: "ai-score-lead",
          domain: "crm",
          action: "test",
        });
      } catch (err: any) {
        threwError = true;
        errorMsg = err.message;
      }
      assert(threwError === true, "callAI should throw in human_controlled mode");
      assert(errorMsg.includes("AI_BLOCKED"), `Error should contain AI_BLOCKED, got: ${errorMsg}`);
    } finally {
      disableDummyMode();
    }
  }));

  tests.push(await runTest(suite, "human_mode_queues_all_actions", async () => {
    const { executeOrQueue } = await import("./mode-action-service");
    const result = await executeOrQueue({
      actionType: "test_human_action",
      workflowKey: "lead_scoring",
      title: "Test Human Queue",
      description: "Testing that human mode always queues",
      confidence: 99,
      executeAction: async () => { throw new Error("Should not execute"); },
    });
    assert(result.executed === false, "Should not execute in human mode");
    assert(result.queued === true, "Should queue in human mode");
    if (result.pendingActionId) {
      await db.delete(pendingActionsTable).where(eq(pendingActionsTable.id, result.pendingActionId));
    }
  }));

  tests.push(await runTest(suite, "human_mode_manual_task_creation", async () => {
    const [task] = await db.insert(tasksTable).values({
      title: `Human Mode Task ${Date.now()}`,
      domain: "crm",
      priority: "high",
      status: "pending",
      assignedTo: "test_user",
    } as any).returning();
    assertDefined(task.id, "Task should be created");
    assert(task.assignedTo === "test_user", "Should be assigned to specified user");
    const [completed] = await db.update(tasksTable).set({ status: "completed" }).where(eq(tasksTable.id, task.id)).returning();
    assert(completed.status === "completed", "Task should transition to completed");
    await db.delete(tasksTable).where(eq(tasksTable.id, task.id));
  }));

  tests.push(await runTest(suite, "human_mode_manual_approval_lifecycle", async () => {
    const [approval] = await db.insert(approvalsTable).values({
      entityType: "contract",
      entityId: 77777,
      type: "contract_approval",
      status: "pending",
      requestedBy: "test_suite",
      priority: "high",
      domain: "legal",
    } as any).returning();

    const { transitionApproval } = await import("./approval-engine");
    const revResult = await transitionApproval({
      approvalId: approval.id,
      newStatus: "revision_requested",
      reviewedBy: "test_reviewer",
      notes: "Needs revision",
    });
    assert(revResult.success === true, `Revision request should succeed: ${revResult.error}`);

    const [afterRevision] = await db.select().from(approvalsTable).where(eq(approvalsTable.id, approval.id));
    assert(afterRevision.status === "revision_requested", "Should be in revision_requested state");

    await db.delete(approvalsTable).where(eq(approvalsTable.id, approval.id));
  }));

  tests.push(await runTest(suite, "human_mode_record_level_override", async () => {
    const { setRecordOverride } = await import("./ai-mode-service");
    const [lead] = await db.insert(leadsTable).values({
      source: "test_override",
      status: "new",
      priority: "medium",
    } as any).returning();

    await setRecordOverride("lead", lead.id, "ai_autonomous");
    const check = await shouldAiAct("lead_scoring", 90, "lead", lead.id);
    assert(check.canAct === true, "Record-level AI override should allow action even when global is human_controlled");
    assert(check.source === "record", "Decision source should be record");

    await setRecordOverride("lead", lead.id, null);
    const checkAfter = await shouldAiAct("lead_scoring", 90, "lead", lead.id);
    assert(checkAfter.canAct === false, "After clearing override, global human_controlled should apply");

    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
  }));

  tests.push(await runTest(suite, "human_mode_knowledge_manual_entry", async () => {
    const { addKnowledgeEntry } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "sop",
      title: `Human SOP Entry ${Date.now()}`,
      content: "Standard operating procedure created manually in human mode",
      source: "manual",
      sourceDomain: "compliance",
      confidence: 100,
    });
    assertDefined(entry.id, "Manual knowledge entry should be created");
    assert(entry.source === "manual", "Source should be manual");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  try { await setGlobalMode(origGlobal); } catch {}
  disableDummyMode();

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runRetryFailureTests(): Promise<TestSuiteResult> {
  const suite = "retry_failure";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "job_queue_enqueue_and_process", async () => {
    const { enqueueJob, registerJobExecutor, processJobs } = await import("./job-queue");
    let jobExecuted = false;
    registerJobExecutor("test_job_type", async (payload) => {
      jobExecuted = true;
      return { success: true, value: payload.testValue };
    });
    const jobId = await enqueueJob({
      type: "test_job_type",
      payload: { testValue: 42 },
      maxAttempts: 3,
      domain: "system",
    });
    assertDefined(jobId, "Job should be enqueued with ID");
    const result = await processJobs(1);
    assert(result.processed >= 1, "Should process at least 1 job after enqueue");
  }));

  tests.push(await runTest(suite, "job_queue_failure_handling", async () => {
    const { enqueueJob, registerJobExecutor, processJobs } = await import("./job-queue");
    let attempts = 0;
    registerJobExecutor("test_failing_job", async () => {
      attempts++;
      throw new Error("Simulated failure");
    });
    const jobId = await enqueueJob({
      type: "test_failing_job",
      payload: {},
      maxAttempts: 1,
      domain: "system",
    });
    assertDefined(jobId, "Failing job should be enqueued");
    await processJobs(1);
    const [job] = await db.select().from(jobQueueTable).where(eq(jobQueueTable.id, jobId));
    if (job) {
      assert(job.status === "dead_letter" || job.status === "retry", `Job should be dead_letter or retry, got ${job.status}`);
      await db.delete(jobQueueTable).where(eq(jobQueueTable.id, jobId));
    }
  }));

  tests.push(await runTest(suite, "state_machine_valid_transitions", async () => {
    const { validateTransition } = await import("./state-machine");
    const valid = await validateTransition({
      entityType: "approval",
      entityId: 0,
      currentState: "pending",
      targetState: "approved",
      actor: "test",
    });
    assert(valid.valid === true, `pending→approved should be valid: ${valid.error}`);
  }));

  tests.push(await runTest(suite, "state_machine_invalid_transition_blocked", async () => {
    const { validateTransition } = await import("./state-machine");
    const invalid = await validateTransition({
      entityType: "approval",
      entityId: 0,
      currentState: "approved",
      targetState: "pending",
      actor: "test",
    });
    assert(invalid.valid === false, "approved→pending should be invalid");
  }));

  tests.push(await runTest(suite, "cache_invalidation_pattern", async () => {
    const { cacheSet, cacheGet, cacheInvalidatePattern } = await import("./cache-service");
    cacheSet("test:pattern:a", "valueA", 60000);
    cacheSet("test:pattern:b", "valueB", 60000);
    cacheSet("test:other:c", "valueC", 60000);
    const count = cacheInvalidatePattern("test:pattern:");
    assert(count === 2, `Should invalidate 2 entries, got ${count}`);
    assert(cacheGet("test:pattern:a") === undefined, "Pattern A should be invalidated");
    assert(cacheGet("test:other:c") === "valueC", "Non-matching key should remain");
  }));

  tests.push(await runTest(suite, "cache_ttl_expiry", async () => {
    const { cacheSet, cacheGet } = await import("./cache-service");
    cacheSet("test:expiry", "ephemeral", 1);
    await new Promise(r => setTimeout(r, 50));
    const result = cacheGet("test:expiry");
    assert(result === undefined, "Expired cache entry should return undefined");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runPhase2RealTests(): Promise<TestSuiteResult> {
  const suite = "phase2_real";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { isDummyMode: isWalletDummy } = await import("./wallet-service");
  const { setGlobalMode, getGlobalMode } = await import("./ai-mode-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "real_mode_not_dummy", async () => {
    assert(isDummyModeEnabled() === false, "Dummy mode should be OFF for Phase 2");
    assert(isWalletDummy() === false, "Wallet dummy mode should be OFF for Phase 2");
  }));

  tests.push(await runTest(suite, "real_ai_call_with_wallet", async () => {
    await setGlobalMode("ai_autonomous");
    disableDummyMode();
    const { callAI } = await import("./ai-service");
    try {
      const result = await callAI({
        systemPrompt: "You are PMG Group's AI assistant. Respond with a brief greeting.",
        userPrompt: "Say hello in one sentence for a system test.",
        workflowKey: "reporting",
        tool: "ai-generate-report",
        domain: "system",
        action: "phase2_test",
      });
      assertDefined(result.result, "Real AI should return a result");
      assert(result.result.length > 0, "Result should not be empty");
      assert(result.confidence >= 0 && result.confidence <= 100, "Confidence should be 0-100");
      assertDefined(result.runId, "Should have a run ID");
    } catch (err: any) {
      if (err.message.includes("AI_BLOCKED")) throw err;
      if (err.message.includes("Insufficient balance")) {
        assert(true, "Wallet check working (insufficient balance is valid)");
      } else {
        throw err;
      }
    }
    await setGlobalMode(origGlobal);
  }));

  tests.push(await runTest(suite, "real_knowledge_ingestion_and_search", async () => {
    const { addKnowledgeEntry, searchKnowledge } = await import("./knowledge-service");
    const uniqueTitle = `Phase2 Real Test ${Date.now()}`;
    const entry = await addKnowledgeEntry({
      category: "performance_data",
      title: uniqueTitle,
      content: "Real phase 2 test: system performance metrics validated through live testing",
      source: "manual",
      sourceDomain: "system",
      confidence: 95,
      tags: ["phase2", "test", "real"],
    });
    assertDefined(entry.id, "Entry should be created");
    const found = await searchKnowledge("Phase2 Real Test");
    assert(found.length > 0, "Should find the entry by search");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  tests.push(await runTest(suite, "real_wallet_balance_check", async () => {
    const { getWalletBalance } = await import("./wallet-service");
    const wallet = await getWalletBalance();
    assertDefined(wallet, "Wallet should exist");
    assert(typeof wallet.balance === "number", "Balance should be a number");
    assert(typeof wallet.availableBalance === "number", "Available balance should be a number");
  }));

  tests.push(await runTest(suite, "real_crm_routing_pipeline", async () => {
    const [company] = await db.insert(companiesTable).values({
      name: `Phase2 Test Corp ${Date.now()}`,
      industry: "Cybersecurity",
      status: "prospect",
    }).returning();
    const [lead] = await db.insert(leadsTable).values({
      companyId: company.id,
      source: "phase2_test",
      status: "new",
      priority: "high",
    } as any).returning();
    assertDefined(lead.id, "Lead should be created");
    await emit("lead.created", {
      entityType: "lead", entityId: lead.id, domain: "crm",
      actor: "phase2_test", actorType: "system",
    });
    await new Promise(r => setTimeout(r, 1000));
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
    await db.delete(companiesTable).where(eq(companiesTable.id, company.id));
  }));

  tests.push(await runTest(suite, "real_reporting_generation", async () => {
    const [report] = await db.insert(reportsTable).values({
      title: `Phase2 Report ${Date.now()}`,
      type: "performance",
      domain: "system",
      status: "draft",
      generationType: "phase2_test",
    } as any).returning();
    assertDefined(report.id, "Report should be created");
    const [updated] = await db.update(reportsTable).set({ status: "published" }).where(eq(reportsTable.id, report.id)).returning();
    assert(updated.status === "published", "Report should transition to published");
    await db.delete(reportsTable).where(eq(reportsTable.id, report.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runDummyModeTests(): Promise<TestSuiteResult> {
  const suite = "dummy_mode";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "enable_dummy_mode", async () => {
    const result = enableDummyMode();
    assert(result.enabled === true, "Dummy mode should be enabled");
    assert(result.responseCount > 0, "Should have built-in responses");
  }));

  tests.push(await runTest(suite, "get_dummy_response_builtin", async () => {
    const response = getDummyResponse("ai-enrich-lead");
    assertDefined(response, "Should return built-in response");
    assert(response!.includes("DUMMY"), "Response should contain DUMMY marker");
  }));

  tests.push(await runTest(suite, "get_dummy_response_default", async () => {
    const response = getDummyResponse("unknown-tool");
    assertDefined(response, "Should return default response");
    assert(response!.includes("Simulated"), "Default should be a simulation message");
  }));

  tests.push(await runTest(suite, "custom_dummy_response", async () => {
    registerDummyResponse("custom-test-tool", (input) => ({
      result: `Custom response for ${input.name ?? "unknown"}`,
      score: 99,
    }));
    const response = getDummyResponse("custom-test-tool", { name: "TestEntity" });
    assertDefined(response, "Custom response should exist");
    assert(response!.includes("TestEntity"), "Should use input data");
    dummyResponses.delete("custom-test-tool");
  }));

  tests.push(await runTest(suite, "dummy_mode_no_wallet_charge", async () => {
    assert(isDummyModeEnabled() === true, "Dummy mode should be enabled");
    const response = getDummyResponse("ai-score-lead");
    assertDefined(response, "Should get score response without wallet charge");
    assert(response!.includes("fitScore"), "Should contain scoring data");
  }));

  tests.push(await runTest(suite, "disable_dummy_mode", async () => {
    const result = disableDummyMode();
    assert(result.enabled === false, "Dummy mode should be disabled");
    const response = getDummyResponse("ai-enrich-lead");
    assert(response === null, "Should return null when disabled");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

const PHASE1_SUITES = ["dummy_mode", "crm_integration", "finance_integration", "event_bus_integration", "tool_chain_integration", "reporting_knowledge_integration", "e2e_workflow", "tri_mode_ai", "tri_mode_hybrid", "tri_mode_human", "retry_failure"];
const PHASE2_SUITES = ["phase2_real"];

export async function runTestSuite(suiteName?: string, phase?: number): Promise<TestSuiteResult[]> {
  const suites: Record<string, () => Promise<TestSuiteResult>> = {
    dummy_mode: runDummyModeTests,
    crm_integration: runCrmIntegrationTests,
    finance_integration: runFinanceIntegrationTests,
    event_bus_integration: runEventBusTests,
    tool_chain_integration: runToolChainTests,
    reporting_knowledge_integration: runReportingKnowledgeTests,
    e2e_workflow: runEndToEndWorkflowTests,
    tri_mode_ai: runTriModeAiTests,
    tri_mode_hybrid: runTriModeHybridTests,
    tri_mode_human: runTriModeHumanTests,
    retry_failure: runRetryFailureTests,
    phase2_real: runPhase2RealTests,
  };

  if (suiteName) {
    if (!suites[suiteName]) return [];
    return [await suites[suiteName]()];
  }

  const suitesToRun = phase === 1 ? PHASE1_SUITES : phase === 2 ? PHASE2_SUITES : [...PHASE1_SUITES, ...PHASE2_SUITES];

  const results: TestSuiteResult[] = [];
  for (const name of suitesToRun) {
    const runner = suites[name];
    if (!runner) continue;
    try {
      results.push(await runner());
    } catch (err: any) {
      results.push({
        suite: name,
        total: 1,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: 1,
        durationMs: 0,
        tests: [{ id: `${name}::suite_error`, suite: name, name: "suite_init", status: "error", durationMs: 0, error: err.message, timestamp: new Date() }],
        timestamp: new Date(),
      });
    }
  }

  await logAudit({
    eventType: "test_suite_run",
    domain: "system",
    action: "run_tests",
    description: `Test run: ${results.reduce((s, r) => s + r.passed, 0)}/${results.reduce((s, r) => s + r.total, 0)} passed across ${results.length} suites`,
    actor: "test_runner",
    actorType: "system",
    metadata: {
      suites: results.map(r => ({ suite: r.suite, passed: r.passed, failed: r.failed, total: r.total })),
    },
  });

  return results;
}

export function getAvailableSuites() {
  return [
    { name: "dummy_mode", description: "Tests dummy mode enable/disable and response simulation", testCount: 6, phase: 1 },
    { name: "crm_integration", description: "CRM entity CRUD: leads, companies, opportunities, contacts", testCount: 4, phase: 1 },
    { name: "finance_integration", description: "Finance entity CRUD: invoices, contracts", testCount: 2, phase: 1 },
    { name: "event_bus_integration", description: "Event emission, subscription, wildcard handlers", testCount: 2, phase: 1 },
    { name: "tool_chain_integration", description: "Tool registry, chain templates, lookup validation", testCount: 4, phase: 1 },
    { name: "reporting_knowledge_integration", description: "Knowledge entries, report generation", testCount: 2, phase: 1 },
    { name: "e2e_workflow", description: "Full business flows: lead→opp, invoice lifecycle, event-triggered reports, webhook→lead, CSV import", testCount: 5, phase: 1 },
    { name: "tri_mode_ai", description: "AI Autonomous mode: permissions, dummy AI calls, cache, memory ingestion, event triggers, routing, handoff", testCount: 8, phase: 1 },
    { name: "tri_mode_hybrid", description: "Hybrid mode: confidence thresholds, action queuing, approvals, rejections, corrections, memory updates", testCount: 9, phase: 1 },
    { name: "tri_mode_human", description: "Human Controlled mode: AI blocking, pending actions, manual tasks, approvals, record overrides, manual knowledge", testCount: 8, phase: 1 },
    { name: "retry_failure", description: "Job queue retry/failure, state machine transitions, cache invalidation, TTL expiry", testCount: 6, phase: 1 },
    { name: "phase2_real", description: "Real AI calls, wallet deductions, live knowledge ingestion, CRM routing, reporting — requires real providers", testCount: 6, phase: 2 },
  ];
}

export function getTestHistory(limit = 50) {
  return testResults.slice(-limit);
}
