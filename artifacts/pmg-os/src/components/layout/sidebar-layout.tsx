import { Link, useLocation } from "wouter";
import {
  Target,
  Briefcase,
  Megaphone,
  Palette,
  Shield,
  Landmark,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  HelpCircle,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Bot,
  Eye,
  Hand,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  RefreshCw,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/notification-bell";
import { AiModeToggle } from "@/components/ai-mode-toggle";
import { WalletDisplay } from "@/components/wallet-display";
import { GlobalSearch } from "@/components/global-search";
import { useAuth } from "@/hooks/use-auth";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useAiGetGuide } from "@/hooks/use-api";
import { ModeIndicatorBanner } from "@/components/mode-aware-wrapper";

interface GuideStep {
  heading: string;
  description: string;
  mockup: { type: "kanban" | "table" | "cards" | "form" | "chart" | "checklist" | "inbox" | "dashboard"; items: string[] };
  modeTips?: {
    ai_auto: string;
    hybrid: string;
    human: string;
  };
}

const guideContent: Record<string, { title: string; steps: GuideStep[] }> = {
  "/outreach": {
    title: "Outreach Guide",
    steps: [
      { heading: "Find Prospects", description: "Use the Prospect Finder tab to search for cybersecurity companies. AI scores each prospect on fit and accessibility.", mockup: { type: "table", items: ["CyberShield Corp — Score: 92", "SecureNet Solutions — Score: 87", "DefendX Technologies — Score: 84", "CyberVault Inc — Score: 78"] }, modeTips: { ai_auto: "AI automatically finds and ranks prospects. Click 'Find Prospects' and results appear instantly.", hybrid: "AI prepares prospect lists for your review. You approve before any outreach begins.", human: "Use 'Create Lead' to enter prospects manually. AI prospecting is disabled in this mode." } },
      { heading: "Social Command Center", description: "Monitor all connected channels (LinkedIn, Email, Facebook) from a unified inbox. Messages are auto-classified by intent.", mockup: { type: "inbox", items: ["LinkedIn: New connection request from CISO", "Email: Re: Cybersecurity marketing proposal", "Facebook: Comment on your SOC 2 post", "LinkedIn: Message from VP of Sales"] }, modeTips: { ai_auto: "AI auto-classifies messages (Hot/Warm/Cold/Spam) and drafts responses. You review before sending.", hybrid: "AI classifies and drafts, but flags uncertain items for your review.", human: "Messages are shown without AI classification. You manually triage and respond." } },
      { heading: "Plan Approach", description: "AI creates a multi-channel strategy for each prospect — which channel to use first, what sequence to follow.", mockup: { type: "checklist", items: ["Day 1: LinkedIn connection request", "Day 3: Follow-up with value post", "Day 7: Email with case study", "Day 14: Direct message pitch"] }, modeTips: { ai_auto: "AI generates complete approach strategies automatically per prospect.", hybrid: "AI drafts strategy plans that you can modify before execution.", human: "Strategy planning is manual. Use this tab as a reference for best practices." } },
      { heading: "Compose Messages", description: "AI drafts personalized messages referencing the prospect's specific business details. Every message sounds human.", mockup: { type: "form", items: ["To: john@cybershield.com", "Subject: Your SIEM marketing gaps", "Body: Hi John, I noticed CyberShield...", "[AI Draft] [Edit] [Send]"] }, modeTips: { ai_auto: "AI writes fully personalized messages per channel. You review and click Send.", hybrid: "AI provides drafts with confidence scores. High-confidence drafts are ready; low-confidence need editing.", human: "Compose all messages yourself. Template suggestions are available as starting points." } },
      { heading: "Follow-ups", description: "Track all outreach attempts. AI schedules follow-ups and escalates across channels when one goes cold.", mockup: { type: "table", items: ["CyberShield — Attempt 3 — Email — Pending", "SecureNet — Attempt 1 — LinkedIn — Replied", "DefendX — Attempt 2 — Email — No Reply", "CyberVault — Attempt 1 — LinkedIn — Sent"] }, modeTips: { ai_auto: "AI automatically schedules follow-ups and escalates (LinkedIn → Email → Phone).", hybrid: "AI suggests follow-up timing and channel. You confirm before it sends.", human: "Manually track and schedule your follow-ups. Reminders are time-based only." } },
      { heading: "Review Analytics", description: "See reply rates, open rates, and conversions per channel. Get data-driven recommendations to improve.", mockup: { type: "chart", items: ["LinkedIn: 34% reply rate", "Email: 22% open rate", "Facebook: 12% engagement", "Overall: 8 meetings booked"] }, modeTips: { ai_auto: "AI applies optimization recommendations automatically based on performance data.", hybrid: "AI recommends changes. Click 'Apply' to accept or modify the recommendation.", human: "View raw analytics data. All strategy changes require your manual action." } },
    ],
  },
  "/crm": {
    title: "CRM Guide",
    steps: [
      { heading: "Pipeline View", description: "See all deals in a Kanban board across stages: New Lead, Meeting Set, Discovery, Proposal, Negotiation, Won/Lost.", mockup: { type: "kanban", items: ["New Lead (4)", "Meeting Set (2)", "Discovery (3)", "Proposal (1)", "Won (2)"] }, modeTips: { ai_auto: "AI auto-advances deals between stages based on activity signals and engagement.", hybrid: "AI suggests stage changes with 'Auto-Advanced' or 'Review Required' badges.", human: "Move deals manually between stages. Health indicators still show." } },
      { heading: "Lead Scoring", description: "Every lead is scored on 5 dimensions: Company Fit, Marketing Need, Budget, Timing, and Authority. Only 80+ leads are Hot.", mockup: { type: "cards", items: ["Company Fit: 95/100", "Marketing Need: 88/100", "Budget: 72/100", "Timing: 90/100", "Authority: 85/100"] }, modeTips: { ai_auto: "AI scores all leads automatically and routes Hot leads directly to pipeline.", hybrid: "AI scores leads but waits for your confirmation before routing.", human: "Lead scores are shown from initial data. No AI re-scoring in this mode." } },
      { heading: "Call Intelligence", description: "Before calls: get briefings and coaching cards. After calls: upload transcripts for AI analysis and follow-up drafts.", mockup: { type: "cards", items: ["Pre-Call Briefing ready", "3 Objection responses loaded", "Competitor battle card: CrowdStrike", "Post-call: Upload transcript"] }, modeTips: { ai_auto: "AI generates full briefings and post-call analysis with auto-drafted follow-ups.", hybrid: "AI prepares briefings and analysis. Follow-up drafts need your review.", human: "Upload transcripts for reference. Briefings and coaching cards are not auto-generated." } },
      { heading: "Proposals", description: "Generate customized proposals with pricing tiers, timelines, and case studies. Track: Sent, Viewed, Accepted.", mockup: { type: "table", items: ["Starter $2,500/mo — Sent", "Growth $5,000/mo — Viewed", "Enterprise $10,000/mo — Draft", "Custom Bundle — Accepted"] }, modeTips: { ai_auto: "AI generates full proposals customized to the prospect. You review before sending.", hybrid: "AI drafts proposals with suggested pricing. You customize and approve.", human: "Build proposals manually using the pricing tiers as a guide." } },
      { heading: "CRM Sync", description: "Connect to GoHighLevel (main + sub-accounts) and HubSpot for bidirectional sync of leads and deals.", mockup: { type: "cards", items: ["GoHighLevel Main: Connected", "GHL Sub-Account: 3 synced", "HubSpot: 12 leads synced", "Last sync: 2 min ago"] }, modeTips: { ai_auto: "Sync runs continuously. All deal updates push to GHL/HubSpot in real-time.", hybrid: "Sync runs on schedule. Errors are flagged for your review.", human: "Manual sync only. Click 'Sync Now' to push updates to external CRMs." } },
    ],
  },
  "/marketing": {
    title: "Marketing Guide",
    steps: [
      { heading: "Content Strategy", description: "Plan content across all channels: LinkedIn (3/week), Blog (2/month), Social (5/week), YouTube, Email newsletter.", mockup: { type: "cards", items: ["LinkedIn: 3 posts/week", "Blog: 2 articles/month", "Social: 5 posts/week", "YouTube: 2 videos/month"] }, modeTips: { ai_auto: "AI auto-generates a weekly content calendar and writes drafts for each slot.", hybrid: "AI suggests content topics and schedules. You approve and edit before publishing.", human: "Plan your content calendar manually. Use the channel breakdown as a guide." } },
      { heading: "Campaigns", description: "Create ad campaigns for Facebook, LinkedIn, Google. AI prepares everything — you review and launch manually.", mockup: { type: "table", items: ["SOC 2 Awareness — Facebook — Active", "SIEM Solutions — LinkedIn — Draft", "MDR Services — Google — Paused", "EDR Buyers — LinkedIn — Active"] }, modeTips: { ai_auto: "AI builds complete campaign packages (copy, targeting, budget). You launch manually.", hybrid: "AI drafts campaigns. You review targeting and copy before launch.", human: "Build campaigns from scratch. Templates available for each platform." } },
      { heading: "SEO & Growth", description: "Keyword research, website audit, ranking tracking. Focus on cybersecurity marketing niche keywords.", mockup: { type: "chart", items: ["cybersecurity marketing: #3", "SIEM vendor marketing: #7", "SOC 2 compliance ads: #12", "Domain Authority: 42"] }, modeTips: { ai_auto: "AI runs SEO audits automatically and generates fix plans with content suggestions.", hybrid: "AI runs audits on request. Fix plans require your approval before execution.", human: "View ranking data manually. SEO audit button is not available in this mode." } },
      { heading: "Campaign Orchestrator", description: "Coordinate multi-channel campaigns. Track full journey from impression to closed client.", mockup: { type: "checklist", items: ["Ad Impression → Click", "Landing Page → Form Fill", "Email Nurture → 3 touches", "Sales Call → Close"] }, modeTips: { ai_auto: "AI coordinates all campaign channels and optimizes spend automatically.", hybrid: "AI suggests campaign plans. You confirm the timeline and budget allocation.", human: "Plan multi-channel campaigns manually. Journey tracking is view-only." } },
      { heading: "Competitor Intel", description: "Monitor competitor agencies. Get battle cards for sales calls. Identify gaps PMG can exploit.", mockup: { type: "cards", items: ["Competitor A: Weak in SIEM", "Competitor B: No SOC 2 focus", "Gap: Cybersec-only niche", "PMG Advantage: 20-lead promise"] }, modeTips: { ai_auto: "AI scans competitors weekly and auto-updates battle cards.", hybrid: "AI runs scans on request. You review findings before sharing with sales.", human: "Competitor data is static. Click 'Refresh' is not available in this mode." } },
    ],
  },
  "/production": {
    title: "Production Guide",
    steps: [
      { heading: "Client Onboarding", description: "Step-by-step checklist: collect brand assets, get access, define audience, set goals, choose CRM.", mockup: { type: "checklist", items: ["Collect brand assets", "Get website/analytics access", "Define target audience", "Set 90-day goals", "Choose CRM setup"] }, modeTips: { ai_auto: "AI generates 90-day plans and marketing audit reports after onboarding completes.", hybrid: "Complete steps manually. AI generates plans for your review at the end.", human: "Complete all onboarding steps manually. AI-generated plans are disabled." } },
      { heading: "Marketing Audit", description: "Deep audit of client's website, social, ads, email, SEO. Identifies exactly why they're not getting clients.", mockup: { type: "cards", items: ["Website: 62/100", "Social Media: 45/100", "Paid Ads: 28/100", "Email: 55/100", "SEO: 38/100"] }, modeTips: { ai_auto: "AI runs full audits and generates fix-it plans with priority rankings.", hybrid: "AI runs audits on request. Fix plans need your approval before execution.", human: "Audit tab shows historical data only. Full audit requires AI mode." } },
      { heading: "Creative Production", description: "Create images (DALL-E 3), videos (Runway ML), documents, and branding packages. Preview and download in any format.", mockup: { type: "cards", items: ["DALL-E 3: Generate Images", "Runway ML: Create Videos", "Document Builder: Reports", "Brand Kit: Logo + Colors"] }, modeTips: { ai_auto: "Select asset type, describe what you need, and AI generates it instantly.", hybrid: "AI generates drafts. You review, edit prompts, and approve final versions.", human: "AI generation is disabled. Upload your own creative assets to the library." } },
      { heading: "Lead Generator", description: "Generate 20 ready-to-close leads per client per month. Each lead scored 80+ with verified contacts.", mockup: { type: "dashboard", items: ["20 leads/month target", "15 generated this month", "Avg score: 86/100", "3 ready to close"] }, modeTips: { ai_auto: "AI continuously finds and scores leads. Push to client CRM automatically.", hybrid: "AI generates lead lists for your review. You approve before pushing to CRM.", human: "Lead generation requires AI mode. View existing leads only." } },
      { heading: "Campaigns & Funnels", description: "Build client campaigns and conversion funnels: Ad, Landing Page, Form, Email Nurture, Sales Call.", mockup: { type: "checklist", items: ["Facebook Ad Campaign", "Landing Page Builder", "Lead Capture Form", "Email Nurture Sequence", "Sales Call Scheduler"] }, modeTips: { ai_auto: "AI builds complete funnels from ad to close. You review the full funnel before launch.", hybrid: "AI drafts funnel steps. You customize each step before activating.", human: "Build funnels manually step by step. AI funnel builder is disabled." } },
      { heading: "Reporting & CRM Sync", description: "Generate performance reports. Sync leads and deals to client's GHL or HubSpot.", mockup: { type: "chart", items: ["Monthly Report Generated", "12 leads synced to GHL", "3 deals in pipeline", "ROI: 340% this month"] }, modeTips: { ai_auto: "AI auto-generates monthly reports and syncs all data continuously.", hybrid: "AI generates reports on request. You review and send to clients.", human: "View raw data only. Report generation requires AI mode." } },
    ],
  },
  "/admin": {
    title: "Admin Guide",
    steps: [
      { heading: "Operations", description: "Assign tasks based on skills and workload. Track completion. Get daily action plans per team member.", mockup: { type: "table", items: ["Sarah: 4 tasks — 75% done", "Mike: 3 tasks — 100% done", "Alex: 5 tasks — 60% done", "Today: 12 tasks total"] }, modeTips: { ai_auto: "AI auto-assigns tasks based on team capacity and priority. You monitor progress.", hybrid: "AI suggests task assignments. You approve or reassign before they go live.", human: "Assign all tasks manually. Auto-assign button is hidden in this mode." } },
      { heading: "Knowledge Base", description: "SOPs, playbooks, templates, and training materials. Searchable — ask any question, get instant answers.", mockup: { type: "cards", items: ["SOPs: 24 documents", "Playbooks: 8 guides", "Templates: 15 files", "Ask AI: 'How to onboard?'"] }, modeTips: { ai_auto: "AI auto-updates knowledge base with new content from recent activities.", hybrid: "AI suggests updates. You review and approve before they are published.", human: "Browse and search documents manually. Auto-update is disabled." } },
      { heading: "Executive Briefing", description: "Morning briefing: overnight activity, urgent items, today's priorities. Weekly pipeline and revenue summary.", mockup: { type: "dashboard", items: ["3 urgent items", "5 new leads overnight", "$45K pipeline value", "2 proposals pending"] }, modeTips: { ai_auto: "AI generates morning briefings daily with urgent items and action recommendations.", hybrid: "AI prepares briefings on request. You decide which items to act on.", human: "Briefing generation requires AI mode. View historical briefings only." } },
      { heading: "System Evolution", description: "Weekly scan of new AI tools, platforms, and trends. You decide: Approve, Explore Later, or Skip.", mockup: { type: "cards", items: ["New: GPT-4o upgrade", "New: Perplexity API", "Pending: Runway Gen-3", "[Approve] [Explore] [Skip]"] }, modeTips: { ai_auto: "AI scans for updates weekly and presents recommendations with impact analysis.", hybrid: "AI scans on request. You review each recommendation and decide.", human: "Scanning for updates requires AI mode. View past recommendations only." } },
    ],
  },
  "/finance": {
    title: "Finance Guide",
    steps: [
      { heading: "Billing & Revenue", description: "Create invoices (one-time, recurring). Track payments: Draft, Sent, Viewed, Paid, Overdue.", mockup: { type: "table", items: ["INV-001 CyberShield $5,000 — Paid", "INV-002 SecureNet $2,500 — Sent", "INV-003 DefendX $10,000 — Draft", "INV-004 CyberVault $5,000 — Overdue"] }, modeTips: { ai_auto: "AI auto-generates monthly invoices for all active clients and sends reminders.", hybrid: "AI drafts invoices. You review amounts and send manually.", human: "Create and send invoices manually. Auto-generation is disabled." } },
      { heading: "Revenue Dashboard", description: "See MRR, revenue per client, growth trends. Client profitability: revenue minus cost to serve.", mockup: { type: "dashboard", items: ["MRR: $22,500", "Growth: +18% MoM", "Top Client: $10K/mo", "Profit Margin: 72%"] }, modeTips: { ai_auto: "Revenue data updates in real-time. AI highlights trends and anomalies.", hybrid: "Dashboard data is live. AI provides insights when requested.", human: "View revenue data manually. All metrics are read-only." } },
      { heading: "Contracts", description: "Manage service agreements. Get renewal alerts 60 days before expiration. Track contract lifecycle.", mockup: { type: "table", items: ["CyberShield — Renewal: 45 days", "SecureNet — Active — 8 months", "DefendX — New — Pending sign", "CyberVault — Expires: 12 days"] }, modeTips: { ai_auto: "AI drafts contracts and sends renewal proposals automatically before expiration.", hybrid: "AI drafts contracts for your review. Renewal alerts require your action.", human: "Manage contracts manually. AI contract drafting is disabled." } },
      { heading: "Expenses & Forecasting", description: "Track all expenses: tools, ads, AI costs, subscriptions. Monthly P&L and revenue forecasting.", mockup: { type: "chart", items: ["AI Tools: $420/mo", "Ad Spend: $3,200/mo", "Subscriptions: $890/mo", "Net Profit: $18,990/mo"] }, modeTips: { ai_auto: "AI runs scenario analysis automatically and alerts you to budget overruns.", hybrid: "AI provides forecasting on request. You run scenario models manually.", human: "View expense data and P&L only. Scenario modeling requires AI mode." } },
    ],
  },
  "/settings": {
    title: "Settings Guide",
    steps: [
      { heading: "General", description: "Set company name, logo, branding, timezone, and brand voice guidelines.", mockup: { type: "form", items: ["Company: PMG Group LLC", "Timezone: EST", "Brand Voice: Professional", "Logo: Uploaded"] }, modeTips: { ai_auto: "General settings apply the same way regardless of AI mode.", hybrid: "General settings apply the same way regardless of AI mode.", human: "General settings apply the same way regardless of AI mode." } },
      { heading: "AI Modes", description: "Choose between AI Autonomous, Hybrid, or Manual Control globally or per section.", mockup: { type: "cards", items: ["AI Autonomous: Full auto", "Hybrid: AI + Human review", "Human Control: Manual only", "Current: AI Autonomous"] }, modeTips: { ai_auto: "You are in AI Autonomous mode. AI handles all automation across every section.", hybrid: "You are in Hybrid mode. AI prepares and suggests, you review and approve.", human: "You are in Manual Control. AI features are disabled. You control everything." } },
      { heading: "Wallet & Keys", description: "Manage AI spending budget, set limits, and configure API keys for Claude, DALL-E, Runway, etc.", mockup: { type: "dashboard", items: ["Balance: $355.02", "Monthly Limit: $500", "API Keys: 4 configured", "Usage: 71% of budget"] }, modeTips: { ai_auto: "Wallet depletes faster in AI Auto mode — all 32 agents run continuously.", hybrid: "Moderate wallet usage — agents run only when triggered by you.", human: "Minimal wallet usage — only manual API calls consume credits." } },
      { heading: "Users & Channels", description: "Add team members with roles (Super Admin, Admin, Manager, Viewer). Connect social channels.", mockup: { type: "table", items: ["Shershah — Super Admin", "LinkedIn — Connected", "Email — Connected", "Facebook — Not Connected"] }, modeTips: { ai_auto: "Connected channels are monitored by AI in real-time for Social Command.", hybrid: "Channels are monitored on schedule. AI flags important messages for review.", human: "Channels show status only. No AI monitoring in manual mode." } },
      { heading: "Legal & Compliance", description: "CAN-SPAM, GDPR, TCPA compliance. Anti-spam rules. Contract templates. Opt-out management.", mockup: { type: "checklist", items: ["CAN-SPAM: Compliant", "GDPR: Configured", "TCPA: Active", "Opt-out: Auto-managed"] }, modeTips: { ai_auto: "Compliance checks run on every AI-generated message before sending.", hybrid: "Compliance checks run, but you review flagged items manually.", human: "Compliance rules are shown for reference. Manual enforcement required." } },
      { heading: "System Health", description: "Monitor all 32 agents, API health, database stats. Run diagnostics when issues arise.", mockup: { type: "dashboard", items: ["32 Agents: All Online", "API Health: 99.9%", "DB: 2.3GB used", "Last Check: 2 min ago"] }, modeTips: { ai_auto: "All 32 agents active and running. Health monitoring is continuous.", hybrid: "Agents activate on demand. Health checks run on schedule.", human: "Agents are on standby. Run health check manually when needed." } },
    ],
  },
};

const navSections = [
  {
    label: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Revenue Engine",
    items: [
      { href: "/outreach", label: "Outreach", icon: Target },
      { href: "/crm", label: "CRM", icon: Briefcase },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/marketing", label: "Marketing", icon: Megaphone },
      { href: "/production", label: "Production", icon: Palette },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin", label: "Admin", icon: Shield },
      { href: "/finance", label: "Finance", icon: Landmark },
    ],
  },
];

const settingsItem = { href: "/settings", label: "Settings", icon: Settings };

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-crimson to-crimson/70" />
        <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-transparent to-white/10" />
        <Shield className="h-4 w-4 text-white relative z-10" />
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="font-bold text-base tracking-tight whitespace-nowrap">
              PMG <span className="text-crimson">OS</span>
            </div>
            {/* <div className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-0.5 whitespace-nowrap">
              Business Operating System
            </div> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const stepIcons: Record<string, typeof Target> = {
  "Find Prospects": Target,
  "Social Command Center": Megaphone,
  "Plan Approach": LayoutDashboard,
  "Compose Messages": Megaphone,
  "Follow-ups": Target,
  "Review Analytics": LayoutDashboard,
  "Pipeline View": Briefcase,
  "Lead Scoring": Target,
  "Call Intelligence": Shield,
  "Proposals": Briefcase,
  "CRM Sync": Settings,
  "Content Strategy": Megaphone,
  "Campaigns": Megaphone,
  "SEO & Growth": Target,
  "Campaign Orchestrator": LayoutDashboard,
  "Competitor Intel": Shield,
  "Client Onboarding": Palette,
  "Marketing Audit": Shield,
  "Creative Production": Palette,
  "Lead Generator": Target,
  "Campaigns & Funnels": Megaphone,
  "Reporting & CRM Sync": LayoutDashboard,
  "Operations": Shield,
  "Knowledge Base": HelpCircle,
  "Executive Briefing": LayoutDashboard,
  "System Evolution": Settings,
  "Billing & Revenue": Landmark,
  "Revenue Dashboard": LayoutDashboard,
  "Contracts": Briefcase,
  "Expenses & Forecasting": Landmark,
  "General": Settings,
  "AI Modes": Settings,
  "Wallet & Keys": Landmark,
  "Users & Channels": Shield,
  "Legal & Compliance": Shield,
  "System Health": Settings,
};

function MockupPreview({ mockup, stepIndex }: { mockup: GuideStep["mockup"]; stepIndex: number }) {
  const colors = ["border-crimson/30", "border-blue-500/30", "border-green-500/30", "border-purple-500/30", "border-yellow-500/30", "border-cyan-500/30"];
  const accents = ["text-crimson", "text-blue-400", "text-green-400", "text-purple-400", "text-yellow-400", "text-cyan-400"];
  const bgs = ["bg-crimson/10", "bg-blue-500/10", "bg-green-500/10", "bg-purple-500/10", "bg-yellow-500/10", "bg-cyan-500/10"];
  const c = stepIndex % colors.length;

  if (mockup.type === "kanban") {
    return (
      <div className="flex gap-1.5 overflow-hidden">
        {mockup.items.map((item, i) => (
          <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 * i }}
            className={cn("flex-1 rounded-lg p-2 border bg-white/[0.03] min-w-0", colors[c])}
          >
            <div className={cn("text-[8px] font-bold truncate", accents[c])}>{item}</div>
            <div className="mt-1.5 space-y-1">
              {[...Array(Math.max(1, 3 - i))].map((_, j) => (
                <div key={j} className="h-2 rounded bg-white/5" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (mockup.type === "table") {
    return (
      <div className="space-y-1">
        <div className="flex gap-2 px-2 py-1 text-[7px] text-slate-600 uppercase tracking-wider font-bold">
          <span className="flex-1">Item</span><span>Status</span>
        </div>
        {mockup.items.map((item, i) => (
          <motion.div key={i} initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.12 * i }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/5"
          >
            <div className={cn("h-1.5 w-1.5 rounded-full", bgs[c])} />
            <span className="text-[9px] text-white/80 flex-1 truncate">{item}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (mockup.type === "cards") {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {mockup.items.map((item, i) => (
          <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 * i }}
            className={cn("rounded-lg p-2 border bg-white/[0.03]", colors[c])}
          >
            <div className="text-[9px] text-white/80">{item}</div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (mockup.type === "chart") {
    return (
      <div className="space-y-1.5">
        {mockup.items.map((item, i) => {
          const pct = 30 + Math.random() * 60;
          return (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 * i }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-white/70">{item}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + 0.1 * i, duration: 0.8 }}
                  className={cn("h-full rounded-full", bgs[c])} />
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  if (mockup.type === "checklist") {
    return (
      <div className="space-y-1">
        {mockup.items.map((item, i) => (
          <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 * i }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]"
          >
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ delay: 0.3 + 0.2 * i, duration: 0.3 }}
              className={cn("h-3 w-3 rounded border flex items-center justify-center", colors[c])}
            >
              <div className={cn("h-1.5 w-1.5 rounded-sm", bgs[c])} />
            </motion.div>
            <span className="text-[9px] text-white/80">{item}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (mockup.type === "inbox") {
    return (
      <div className="space-y-1">
        {mockup.items.map((item, i) => (
          <motion.div key={i} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 * i }}
            className={cn("flex items-start gap-2 px-2 py-1.5 rounded-lg border bg-white/[0.03]", i === 0 ? colors[c] : "border-white/5")}
          >
            <div className={cn("h-2 w-2 rounded-full mt-1 shrink-0", i === 0 ? bgs[c] : "bg-white/10")} />
            <span className={cn("text-[9px]", i === 0 ? "text-white font-medium" : "text-white/60")}>{item}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (mockup.type === "form") {
    return (
      <div className="space-y-1.5">
        {mockup.items.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 * i }}
            className={cn("px-2 py-1.5 rounded-lg border text-[9px]", i === mockup.items.length - 1 ? `${bgs[c]} ${colors[c]} ${accents[c]} text-center font-bold` : "bg-white/[0.03] border-white/5 text-white/70")}
          >
            {item}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {mockup.items.map((item, i) => (
        <motion.div key={i} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 * i }}
          className={cn("rounded-lg p-2.5 border text-center", colors[c], bgs[c])}
        >
          <div className={cn("text-sm font-bold mb-0.5", accents[c])}>{item.split(":")[1]?.trim() || item.split(" ").pop()}</div>
          <div className="text-[8px] text-white/50">{item.split(":")[0]}</div>
        </motion.div>
      ))}
    </div>
  );
}

function StepAnimation({ stepIndex, heading, mockup }: { stepIndex: number; heading: string; mockup?: GuideStep["mockup"] }) {
  const StepIcon = stepIcons[heading] || HelpCircle;
  const colors = ["from-crimson/20 to-crimson/5", "from-blue-500/20 to-blue-500/5", "from-green-500/20 to-green-500/5", "from-purple-500/20 to-purple-500/5", "from-yellow-500/20 to-yellow-500/5", "from-cyan-500/20 to-cyan-500/5"];
  const colorClass = colors[stepIndex % colors.length];

  return (
    <motion.div
      key={stepIndex}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={cn("relative w-full rounded-xl bg-gradient-to-br overflow-hidden", colorClass)}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <StepIcon className="h-3.5 w-3.5 text-white/60" />
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Live Preview</span>
        </div>
        {mockup && (
          <div className="rounded-lg bg-[hsl(222_47%_4%)] border border-white/5 p-2.5 max-h-[160px] overflow-hidden">
            <MockupPreview mockup={mockup} stepIndex={stepIndex} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VideoGuideOverlay({
  guide,
  section,
  onClose,
}: {
  guide: { title: string; steps: GuideStep[] };
  section: string;
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [view, setView] = useState<"walkthrough" | "ai">("walkthrough");
  const { currentMode } = useAiModeContext();
  const getGuide = useAiGetGuide();
  const aiGuideText = String(getGuide.data?.guide ?? getGuide.data?.result ?? "");

  const requestAiGuide = () => getGuide.mutate({ section });
  const showAiGuide = () => {
    setView("ai");
    if (!getGuide.data && !getGuide.isPending) requestAiGuide();
  };

  const step = guide.steps[currentStep];
  const StepIcon = stepIcons[step?.heading] || HelpCircle;

  const modeLabel = currentMode === "ai_auto" ? "AI Autonomous" : currentMode === "hybrid" ? "Hybrid" : "Manual Control";
  const ModeIcon = currentMode === "ai_auto" ? Bot : currentMode === "hybrid" ? Eye : Hand;
  const modeBorderClass = currentMode === "ai_auto" ? "border-crimson/30" : currentMode === "hybrid" ? "border-blue-400/30" : "border-yellow-400/30";
  const modeTextClass = currentMode === "ai_auto" ? "text-crimson" : currentMode === "hybrid" ? "text-blue-400" : "text-yellow-400";
  const modeBgClass = currentMode === "ai_auto" ? "bg-crimson/5" : currentMode === "hybrid" ? "bg-blue-400/5" : "bg-yellow-400/5";
  const modeTip = step?.modeTips?.[currentMode as keyof typeof step.modeTips] || "";

  function handlePrev() {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }

  function handleNext() {
    setCurrentStep(prev => Math.min(guide.steps.length - 1, prev + 1));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-[hsl(222_47%_5%)] shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-crimson" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{guide.title}</h2>
              <p className="text-[10px] text-muted-foreground">
                {view === "walkthrough" ? `Step ${currentStep + 1} of ${guide.steps.length}` : "AI-generated guide"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 p-0.5">
              <button onClick={() => setView("walkthrough")}
                className={cn("text-[10px] px-2 py-1 rounded-md transition-colors", view === "walkthrough" ? "bg-crimson/20 text-crimson" : "text-muted-foreground hover:text-white")}>
                Walkthrough
              </button>
              <button onClick={showAiGuide}
                className={cn("text-[10px] px-2 py-1 rounded-md transition-colors flex items-center gap-1", view === "ai" ? "bg-crimson/20 text-crimson" : "text-muted-foreground hover:text-white")}>
                <Sparkles className="h-2.5 w-2.5" />AI Guide
              </button>
            </div>
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 flex items-center gap-1", modeBorderClass, modeTextClass)}>
              <ModeIcon className="h-2.5 w-2.5" />
              {modeLabel}
            </Badge>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {view === "walkthrough" && (
          <div className="flex gap-1 px-5 pt-3">
            {guide.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all",
                  i === currentStep ? "bg-crimson" : i < currentStep ? "bg-crimson/40" : "bg-white/10"
                )}
              />
            ))}
          </div>
        )}

        {view === "ai" ? (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {getGuide.isPending ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw className="h-6 w-6 text-crimson animate-spin mb-3" />
                <p className="text-xs text-muted-foreground">Generating an up-to-date AI guide for this section…</p>
              </div>
            ) : getGuide.isError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Info className="h-6 w-6 text-red-400 mb-3" />
                <p className="text-xs text-muted-foreground mb-3">{(getGuide.error as any)?.message || "Could not generate the guide."}</p>
                <Button size="sm" onClick={requestAiGuide} className="text-xs h-8 btn-premium text-white">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />Try again
                </Button>
              </div>
            ) : aiGuideText ? (
              <div className="rounded-xl bg-black/30 border border-white/5 p-4">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{aiGuideText}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="h-6 w-6 text-crimson mb-3" />
                <p className="text-xs text-muted-foreground mb-3">Generate a fresh, AI-written walkthrough for this section.</p>
                <Button size="sm" onClick={requestAiGuide} className="text-xs h-8 btn-premium text-white">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />Generate AI Guide
                </Button>
              </div>
            )}
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center shrink-0">
                  <StepIcon className="h-5 w-5 text-crimson" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{step.heading}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>

              <div className="rounded-xl bg-black/30 border border-white/5 p-4 mb-4">
                {step.mockup && <MockupPreview mockup={step.mockup} stepIndex={currentStep} />}
              </div>

              {modeTip && (
                <div className={cn("rounded-xl border p-3.5 flex items-start gap-3", modeBorderClass, modeBgClass)}>
                  <div className={cn("p-1.5 rounded-lg border shrink-0 mt-0.5", modeBorderClass)}>
                    <ModeIcon className={cn("h-3.5 w-3.5", modeTextClass)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={cn("text-[10px] font-semibold uppercase tracking-wider", modeTextClass)}>
                        {modeLabel} Mode
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{modeTip}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        )}

        {view === "walkthrough" ? (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/[0.02]">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-xs h-8 px-3 border-white/10 disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-1.5">
            {guide.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === currentStep ? "w-6 bg-crimson" : "w-2 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>

          {currentStep < guide.steps.length - 1 ? (
            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs h-8 px-3 btn-premium text-white"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onClose}
              className="text-xs h-8 px-3 btn-premium text-white"
            >
              Done
            </Button>
          )}
        </div>
        ) : (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/[0.02]">
            <Button variant="outline" size="sm" onClick={requestAiGuide} disabled={getGuide.isPending} className="text-xs h-8 px-3 border-white/10">
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", getGuide.isPending && "animate-spin")} />Regenerate
            </Button>
            <Button size="sm" onClick={onClose} className="text-xs h-8 px-3 btn-premium text-white">
              Done
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function NavLink({
  item,
  isActive,
  collapsed,
  onGuide,
}: {
  item: { href: string; label: string; icon: any };
  isActive: boolean;
  collapsed?: boolean;
  onGuide?: () => void;
}) {
  const hasGuide = item.href in guideContent;

  return (
    <div className="relative group/nav">
      <Link href={item.href}>
        <div
          className={cn(
            "nav-item-glow flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 cursor-pointer group relative",
            isActive
              ? "nav-item-glow-active glass-surface text-foreground"
              : "text-muted-foreground hover:text-foreground hover:glass-surface",
            collapsed && "justify-center mx-1 px-2"
          )}
        >
          <item.icon className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? "text-crimson" : "group-hover:text-foreground"
          )} />
          {!collapsed && (
            <span className="text-sm font-medium truncate">{item.label}</span>
          )}
          {isActive && (
            <motion.div
              layoutId="navActive"
              className="absolute inset-0 rounded-lg glass-surface -z-10"
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
        </div>
      </Link>
      {hasGuide && !collapsed && onGuide && (
        <button
          onClick={(e) => { e.stopPropagation(); onGuide(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover/nav:opacity-100 transition-opacity text-muted-foreground hover:text-crimson"
          title={`${item.label} guide`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function UserProfile({ collapsed }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
  const roleName = user?.role?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || "User";

  return (
    <div className={cn("p-3 border-t border-border/30 relative", collapsed && "p-2")}>
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg glass-surface",
        collapsed && "justify-center"
      )}>
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-crimson/80 to-crimson/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-medium truncate">{user?.name || "Unknown"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{roleName}</div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-2 right-2 mb-2 p-3 rounded-xl border border-red-500/20 bg-[hsl(222_47%_5%)] shadow-2xl z-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <LogOut className="h-4 w-4 text-red-400" />
              <p className="text-xs font-semibold text-white">Sign Out?</p>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">
              You will be logged out of PMG OS. Any unsaved changes will be lost.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-[10px] border-white/10"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 flex-1 text-[10px] bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400"
                onClick={() => logout()}
              >
                <LogOut className="h-3 w-3 mr-1" />Sign Out
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarNav({ collapsed, location, onOpenGuide }: { collapsed?: boolean; location: string; onOpenGuide: (href: string) => void }) {
  return (
    <>
      {navSections.map((section, si) => (
        <div key={section.label}>
          {si > 0 && <div className={cn("my-2 border-t border-border/20", collapsed ? "mx-1.5" : "mx-3")} />}
          {!collapsed && (
            <div className="px-5 py-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">{section.label}</span>
            </div>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={item.href === "/" ? location === "/" : location.startsWith(item.href)}
              collapsed={collapsed}
              onGuide={() => onOpenGuide(item.href)}
            />
          ))}
        </div>
      ))}
      <div className={cn("my-2 border-t border-border/20", collapsed ? "mx-1.5" : "mx-3")} />
      <NavLink
        item={settingsItem}
        isActive={location.startsWith("/settings")}
        collapsed={collapsed}
        onGuide={() => onOpenGuide("/settings")}
      />
    </>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  const openGuide = (href: string) => {
    if (href in guideContent) {
      setActiveGuide(href);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row gradient-bg-atmosphere">
      <header className="md:hidden border-b border-border glass-panel p-4 flex items-center justify-between sticky top-0 z-50">
        <Logo />
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden btn-glass">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 border-r-border glass-panel">
              <div className="p-5 border-b border-border">
                <Logo />
              </div>
              <nav className="space-y-0.5 mt-2 pb-4 overflow-y-auto">
                <SidebarNav location={location} onOpenGuide={openGuide} />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <aside className={cn(
        "hidden md:flex flex-col border-r border-border/50 sticky top-0 h-screen shrink-0 transition-all duration-300",
        collapsed ? "w-16" : "w-56",
        "bg-gradient-to-b from-[hsl(222_47%_3%)] via-[hsl(214_65%_5%)] to-[hsl(222_47%_3%)]"
      )}>
        <div className={cn(
          "p-4 border-b border-border/30 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Logo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className={cn("p-2", collapsed ? "px-1.5" : "px-3")}>
          <AiModeToggle collapsed={collapsed} />
        </div>

        <div className={cn("px-2", collapsed ? "px-1.5" : "px-3")}>
          <WalletDisplay collapsed={collapsed} />
        </div>

        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
          <SidebarNav collapsed={collapsed} location={location} onOpenGuide={openGuide} />
        </nav>

        <UserProfile collapsed={collapsed} />
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="hidden md:flex items-center justify-end gap-3 px-6 py-3 border-b border-border/30">
          <GlobalSearch />
          <NotificationBell />
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <ModeIndicatorBanner />
          {children}
        </div>
      </main>

      <AnimatePresence>
        {activeGuide && guideContent[activeGuide] && (
          <VideoGuideOverlay
            guide={guideContent[activeGuide]}
            section={activeGuide.replace(/^\//, "") || "dashboard"}
            onClose={() => setActiveGuide(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
