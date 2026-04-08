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
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/notification-bell";
import { AiModeToggle } from "@/components/ai-mode-toggle";
import { WalletDisplay } from "@/components/wallet-display";
import { GlobalSearch } from "@/components/global-search";
import { useAuth } from "@/hooks/use-auth";
import { ModeIndicatorBanner } from "@/components/mode-aware-wrapper";

interface GuideStep {
  heading: string;
  description: string;
  mockup: { type: "kanban" | "table" | "cards" | "form" | "chart" | "checklist" | "inbox" | "dashboard"; items: string[] };
}

const guideContent: Record<string, { title: string; steps: GuideStep[] }> = {
  "/outreach": {
    title: "Outreach Guide",
    steps: [
      { heading: "Find Prospects", description: "Use the Prospect Finder tab to search for cybersecurity companies. AI scores each prospect on fit and accessibility.", mockup: { type: "table", items: ["CyberShield Corp — Score: 92", "SecureNet Solutions — Score: 87", "DefendX Technologies — Score: 84", "CyberVault Inc — Score: 78"] } },
      { heading: "Social Command Center", description: "Monitor all connected channels (LinkedIn, Email, Facebook) from a unified inbox. Messages are auto-classified by intent.", mockup: { type: "inbox", items: ["LinkedIn: New connection request from CISO", "Email: Re: Cybersecurity marketing proposal", "Facebook: Comment on your SOC 2 post", "LinkedIn: Message from VP of Sales"] } },
      { heading: "Plan Approach", description: "AI creates a multi-channel strategy for each prospect — which channel to use first, what sequence to follow.", mockup: { type: "checklist", items: ["Day 1: LinkedIn connection request", "Day 3: Follow-up with value post", "Day 7: Email with case study", "Day 14: Direct message pitch"] } },
      { heading: "Compose Messages", description: "AI drafts personalized messages referencing the prospect's specific business details. Every message sounds human.", mockup: { type: "form", items: ["To: john@cybershield.com", "Subject: Your SIEM marketing gaps", "Body: Hi John, I noticed CyberShield...", "[AI Draft] [Edit] [Send]"] } },
      { heading: "Follow-ups", description: "Track all outreach attempts. AI schedules follow-ups and escalates across channels when one goes cold.", mockup: { type: "table", items: ["CyberShield — Attempt 3 — Email — Pending", "SecureNet — Attempt 1 — LinkedIn — Replied", "DefendX — Attempt 2 — Email — No Reply", "CyberVault — Attempt 1 — LinkedIn — Sent"] } },
      { heading: "Review Analytics", description: "See reply rates, open rates, and conversions per channel. Get data-driven recommendations to improve.", mockup: { type: "chart", items: ["LinkedIn: 34% reply rate", "Email: 22% open rate", "Facebook: 12% engagement", "Overall: 8 meetings booked"] } },
    ],
  },
  "/crm": {
    title: "CRM Guide",
    steps: [
      { heading: "Pipeline View", description: "See all deals in a Kanban board across stages: New Lead, Meeting Set, Discovery, Proposal, Negotiation, Won/Lost.", mockup: { type: "kanban", items: ["New Lead (4)", "Meeting Set (2)", "Discovery (3)", "Proposal (1)", "Won (2)"] } },
      { heading: "Lead Scoring", description: "Every lead is scored on 5 dimensions: Company Fit, Marketing Need, Budget, Timing, and Authority. Only 80+ leads are Hot.", mockup: { type: "cards", items: ["Company Fit: 95/100", "Marketing Need: 88/100", "Budget: 72/100", "Timing: 90/100", "Authority: 85/100"] } },
      { heading: "Call Intelligence", description: "Before calls: get briefings and coaching cards. After calls: upload transcripts for AI analysis and follow-up drafts.", mockup: { type: "cards", items: ["Pre-Call Briefing ready", "3 Objection responses loaded", "Competitor battle card: CrowdStrike", "Post-call: Upload transcript"] } },
      { heading: "Proposals", description: "Generate customized proposals with pricing tiers, timelines, and case studies. Track: Sent, Viewed, Accepted.", mockup: { type: "table", items: ["Starter $2,500/mo — Sent", "Growth $5,000/mo — Viewed", "Enterprise $10,000/mo — Draft", "Custom Bundle — Accepted"] } },
      { heading: "CRM Sync", description: "Connect to GoHighLevel (main + sub-accounts) and HubSpot for bidirectional sync of leads and deals.", mockup: { type: "cards", items: ["GoHighLevel Main: Connected", "GHL Sub-Account: 3 synced", "HubSpot: 12 leads synced", "Last sync: 2 min ago"] } },
    ],
  },
  "/marketing": {
    title: "Marketing Guide",
    steps: [
      { heading: "Content Strategy", description: "Plan content across all channels: LinkedIn (3/week), Blog (2/month), Social (5/week), YouTube, Email newsletter.", mockup: { type: "cards", items: ["LinkedIn: 3 posts/week", "Blog: 2 articles/month", "Social: 5 posts/week", "YouTube: 2 videos/month"] } },
      { heading: "Campaigns", description: "Create ad campaigns for Facebook, LinkedIn, Google. AI prepares everything — you review and launch manually.", mockup: { type: "table", items: ["SOC 2 Awareness — Facebook — Active", "SIEM Solutions — LinkedIn — Draft", "MDR Services — Google — Paused", "EDR Buyers — LinkedIn — Active"] } },
      { heading: "SEO & Growth", description: "Keyword research, website audit, ranking tracking. Focus on cybersecurity marketing niche keywords.", mockup: { type: "chart", items: ["cybersecurity marketing: #3", "SIEM vendor marketing: #7", "SOC 2 compliance ads: #12", "Domain Authority: 42"] } },
      { heading: "Campaign Orchestrator", description: "Coordinate multi-channel campaigns. Track full journey from impression to closed client.", mockup: { type: "checklist", items: ["Ad Impression → Click", "Landing Page → Form Fill", "Email Nurture → 3 touches", "Sales Call → Close"] } },
      { heading: "Competitor Intel", description: "Monitor competitor agencies. Get battle cards for sales calls. Identify gaps PMG can exploit.", mockup: { type: "cards", items: ["Competitor A: Weak in SIEM", "Competitor B: No SOC 2 focus", "Gap: Cybersec-only niche", "PMG Advantage: 20-lead promise"] } },
    ],
  },
  "/production": {
    title: "Production Guide",
    steps: [
      { heading: "Client Onboarding", description: "Step-by-step checklist: collect brand assets, get access, define audience, set goals, choose CRM.", mockup: { type: "checklist", items: ["Collect brand assets", "Get website/analytics access", "Define target audience", "Set 90-day goals", "Choose CRM setup"] } },
      { heading: "Marketing Audit", description: "Deep audit of client's website, social, ads, email, SEO. Identifies exactly why they're not getting clients.", mockup: { type: "cards", items: ["Website: 62/100", "Social Media: 45/100", "Paid Ads: 28/100", "Email: 55/100", "SEO: 38/100"] } },
      { heading: "Creative Production", description: "Create images (DALL-E 3), videos (Runway ML), documents, and branding packages. Preview and download in any format.", mockup: { type: "cards", items: ["DALL-E 3: Generate Images", "Runway ML: Create Videos", "Document Builder: Reports", "Brand Kit: Logo + Colors"] } },
      { heading: "Lead Generator", description: "Generate 20 ready-to-close leads per client per month. Each lead scored 80+ with verified contacts.", mockup: { type: "dashboard", items: ["20 leads/month target", "15 generated this month", "Avg score: 86/100", "3 ready to close"] } },
      { heading: "Campaigns & Funnels", description: "Build client campaigns and conversion funnels: Ad, Landing Page, Form, Email Nurture, Sales Call.", mockup: { type: "checklist", items: ["Facebook Ad Campaign", "Landing Page Builder", "Lead Capture Form", "Email Nurture Sequence", "Sales Call Scheduler"] } },
      { heading: "Reporting & CRM Sync", description: "Generate performance reports. Sync leads and deals to client's GHL or HubSpot.", mockup: { type: "chart", items: ["Monthly Report Generated", "12 leads synced to GHL", "3 deals in pipeline", "ROI: 340% this month"] } },
    ],
  },
  "/admin": {
    title: "Admin Guide",
    steps: [
      { heading: "Operations", description: "Assign tasks based on skills and workload. Track completion. Get daily action plans per team member.", mockup: { type: "table", items: ["Sarah: 4 tasks — 75% done", "Mike: 3 tasks — 100% done", "Alex: 5 tasks — 60% done", "Today: 12 tasks total"] } },
      { heading: "Knowledge Base", description: "SOPs, playbooks, templates, and training materials. Searchable — ask any question, get instant answers.", mockup: { type: "cards", items: ["SOPs: 24 documents", "Playbooks: 8 guides", "Templates: 15 files", "Ask AI: 'How to onboard?'"] } },
      { heading: "Executive Briefing", description: "Morning briefing: overnight activity, urgent items, today's priorities. Weekly pipeline and revenue summary.", mockup: { type: "dashboard", items: ["3 urgent items", "5 new leads overnight", "$45K pipeline value", "2 proposals pending"] } },
      { heading: "System Evolution", description: "Weekly scan of new AI tools, platforms, and trends. You decide: Approve, Explore Later, or Skip.", mockup: { type: "cards", items: ["New: GPT-4o upgrade", "New: Perplexity API", "Pending: Runway Gen-3", "[Approve] [Explore] [Skip]"] } },
    ],
  },
  "/finance": {
    title: "Finance Guide",
    steps: [
      { heading: "Billing & Revenue", description: "Create invoices (one-time, recurring). Track payments: Draft, Sent, Viewed, Paid, Overdue.", mockup: { type: "table", items: ["INV-001 CyberShield $5,000 — Paid", "INV-002 SecureNet $2,500 — Sent", "INV-003 DefendX $10,000 — Draft", "INV-004 CyberVault $5,000 — Overdue"] } },
      { heading: "Revenue Dashboard", description: "See MRR, revenue per client, growth trends. Client profitability: revenue minus cost to serve.", mockup: { type: "dashboard", items: ["MRR: $22,500", "Growth: +18% MoM", "Top Client: $10K/mo", "Profit Margin: 72%"] } },
      { heading: "Contracts", description: "Manage service agreements. Get renewal alerts 60 days before expiration. Track contract lifecycle.", mockup: { type: "table", items: ["CyberShield — Renewal: 45 days", "SecureNet — Active — 8 months", "DefendX — New — Pending sign", "CyberVault — Expires: 12 days"] } },
      { heading: "Expenses & Forecasting", description: "Track all expenses: tools, ads, AI costs, subscriptions. Monthly P&L and revenue forecasting.", mockup: { type: "chart", items: ["AI Tools: $420/mo", "Ad Spend: $3,200/mo", "Subscriptions: $890/mo", "Net Profit: $18,990/mo"] } },
    ],
  },
  "/settings": {
    title: "Settings Guide",
    steps: [
      { heading: "General", description: "Set company name, logo, branding, timezone, and brand voice guidelines.", mockup: { type: "form", items: ["Company: PMG Group LLC", "Timezone: EST", "Brand Voice: Professional", "Logo: Uploaded"] } },
      { heading: "AI Modes", description: "Choose between AI Autonomous, Hybrid, or Manual Control globally or per section.", mockup: { type: "cards", items: ["AI Autonomous: Full auto", "Hybrid: AI + Human review", "Human Control: Manual only", "Current: AI Autonomous"] } },
      { heading: "Wallet & Keys", description: "Manage AI spending budget, set limits, and configure API keys for Claude, DALL-E, Runway, etc.", mockup: { type: "dashboard", items: ["Balance: $355.02", "Monthly Limit: $500", "API Keys: 4 configured", "Usage: 71% of budget"] } },
      { heading: "Users & Channels", description: "Add team members with roles (Super Admin, Admin, Manager, Viewer). Connect social channels.", mockup: { type: "table", items: ["Shershah — Super Admin", "LinkedIn — Connected", "Email — Connected", "Facebook — Not Connected"] } },
      { heading: "Legal & Compliance", description: "CAN-SPAM, GDPR, TCPA compliance. Anti-spam rules. Contract templates. Opt-out management.", mockup: { type: "checklist", items: ["CAN-SPAM: Compliant", "GDPR: Configured", "TCPA: Active", "Opt-out: Auto-managed"] } },
      { heading: "System Health", description: "Monitor all 32 agents, API health, database stats. Run diagnostics when issues arise.", mockup: { type: "dashboard", items: ["32 Agents: All Online", "API Health: 99.9%", "DB: 2.3GB used", "Last Check: 2 min ago"] } },
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
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-0.5 whitespace-nowrap">
              Business Operating System
            </div>
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
  onClose,
}: {
  guide: { title: string; steps: GuideStep[] };
  onClose: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepDuration = 5;
  const totalDuration = guide.steps.length * stepDuration;
  const currentStep = Math.min(Math.floor(elapsed / stepDuration), guide.steps.length - 1);

  const clearTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const stopPlaying = useCallback(() => {
    clearTimers();
    setIsPlaying(false);
  }, [clearTimers]);

  const startPlaying = useCallback(() => {
    clearTimers();
    setIsPlaying(true);
    tickRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= totalDuration) {
          clearTimers();
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, 1000);
  }, [totalDuration, clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = Math.min(Math.floor(pct * totalDuration), totalDuration - 1);
    stopPlaying();
    setElapsed(newTime);
  }

  function handlePrev() {
    stopPlaying();
    setElapsed(prev => Math.max(0, (Math.floor(prev / stepDuration) - 1) * stepDuration));
  }

  function handleNext() {
    stopPlaying();
    setElapsed(prev => {
      const nextStep = Math.floor(prev / stepDuration) + 1;
      return Math.min(nextStep * stepDuration, (guide.steps.length - 1) * stepDuration);
    });
  }

  function togglePlay() {
    if (isPlaying) {
      stopPlaying();
    } else {
      if (elapsed >= totalDuration) {
        setElapsed(0);
      }
      startPlaying();
    }
  }

  const progressPct = Math.min((elapsed / totalDuration) * 100, 100);
  const StepIcon = stepIcons[guide.steps[currentStep]?.heading] || HelpCircle;

  return (
    <motion.div
      initial={{ y: isExpanded ? 0 : 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 200, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "fixed z-[100] left-0 right-0 bottom-0",
        isExpanded ? "top-0" : ""
      )}
    >
      {isExpanded && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsExpanded(false)} />
      )}

      <div className={cn(
        "relative flex flex-col",
        isExpanded ? "h-full" : ""
      )}>
        {isExpanded && (
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-3xl"
            >
              <div className="rounded-xl border border-white/10 bg-[hsl(222_47%_6%)] overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white/5 rounded-md px-3 py-1 text-[10px] text-muted-foreground text-center truncate">
                      pmggroup-os.app/{guide.title.toLowerCase().replace(/ guide/i, "").replace(/\s/g, "-")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-5 w-5 rounded bg-white/5 flex items-center justify-center">
                      <Shield className="h-3 w-3 text-crimson/50" />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center">
                      <StepIcon className="h-5 w-5 text-crimson" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{guide.steps[currentStep].heading}</h3>
                      <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {guide.steps.length}</p>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <div className="rounded-lg bg-black/30 border border-white/5 p-4 mb-4 min-h-[180px]">
                        {guide.steps[currentStep].mockup && (
                          <MockupPreview mockup={guide.steps[currentStep].mockup} stepIndex={currentStep} />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{guide.steps[currentStep].description}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {!isExpanded && (
          <div className="bg-[hsl(222_47%_8%)] border-t border-white/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-3 flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center shrink-0">
                  <StepIcon className="h-4 w-4 text-crimson" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{guide.steps[currentStep].heading}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{guide.steps[currentStep].description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">Step {currentStep + 1}/{guide.steps.length}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="bg-[hsl(222_47%_5%)] border-t border-white/10">
          <div
            className="h-1 w-full bg-white/5 cursor-pointer group relative"
            onClick={handleSeek}
          >
            <motion.div
              className="h-full bg-crimson relative"
              style={{ width: `${progressPct}%` }}
              transition={{ duration: 0.1 }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-crimson opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-crimson/30" />
            </motion.div>
            <div className="absolute inset-0 flex">
              {guide.steps.map((_, i) => (
                <div key={i} className="flex-1 relative">
                  {i > 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                aria-label="Previous step"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="p-1.5 rounded-full hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SkipBack className="h-3.5 w-3.5 text-white" />
              </button>

              <button
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlay}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
              </button>

              <button
                aria-label="Next step"
                onClick={handleNext}
                disabled={currentStep >= guide.steps.length - 1}
                className="p-1.5 rounded-full hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SkipForward className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            <span className="text-[11px] text-muted-foreground tabular-nums min-w-[70px]">
              {formatTime(elapsed)} / {formatTime(totalDuration)}
            </span>

            <div className="flex-1 flex items-center justify-center">
              <span className="text-[11px] font-medium text-white/70 truncate max-w-[300px]">{guide.title}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                aria-label={isMuted ? "Unmute" : "Mute"}
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" /> : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              <button
                aria-label={isExpanded ? "Minimize" : "Fullscreen"}
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              <button
                aria-label="Close guide"
                onClick={() => { stopPlaying(); onClose(); }}
                className="p-1.5 rounded-full hover:bg-white/5 transition-colors ml-1"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
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
            onClose={() => setActiveGuide(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
