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
  SkipForward,
  RotateCcw,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/notification-bell";
import { AiModeToggle } from "@/components/ai-mode-toggle";
import { WalletDisplay } from "@/components/wallet-display";
import { GlobalSearch } from "@/components/global-search";
import { useAuth } from "@/hooks/use-auth";

const guideContent: Record<string, { title: string; steps: { heading: string; description: string }[] }> = {
  "/outreach": {
    title: "Outreach Guide",
    steps: [
      { heading: "Find Prospects", description: "Use the Prospect Finder tab to search for cybersecurity companies. AI scores each prospect on fit and accessibility." },
      { heading: "Social Command Center", description: "Monitor all connected channels (LinkedIn, Email, Facebook) from a unified inbox. Messages are auto-classified by intent." },
      { heading: "Plan Approach", description: "AI creates a multi-channel strategy for each prospect — which channel to use first, what sequence to follow." },
      { heading: "Compose Messages", description: "AI drafts personalized messages referencing the prospect's specific business details. Every message sounds human." },
      { heading: "Follow-ups", description: "Track all outreach attempts. AI schedules follow-ups and escalates across channels when one goes cold." },
      { heading: "Review Analytics", description: "See reply rates, open rates, and conversions per channel. Get data-driven recommendations to improve." },
    ],
  },
  "/crm": {
    title: "CRM Guide",
    steps: [
      { heading: "Pipeline View", description: "See all deals in a Kanban board across stages: New Lead → Meeting Set → Discovery → Proposal → Negotiation → Won/Lost." },
      { heading: "Lead Scoring", description: "Every lead is scored on 5 dimensions: Company Fit, Marketing Need, Budget, Timing, and Authority. Only 80+ leads are Hot." },
      { heading: "Call Intelligence", description: "Before calls: get briefings and coaching cards. After calls: upload transcripts for AI analysis and follow-up drafts." },
      { heading: "Proposals", description: "Generate customized proposals with pricing tiers, timelines, and case studies. Track: Sent → Viewed → Accepted." },
      { heading: "CRM Sync", description: "Connect to GoHighLevel (main + sub-accounts) and HubSpot for bidirectional sync of leads and deals." },
    ],
  },
  "/marketing": {
    title: "Marketing Guide",
    steps: [
      { heading: "Content Strategy", description: "Plan content across all channels: LinkedIn (3/week), Blog (2/month), Social (5/week), YouTube, Email newsletter." },
      { heading: "Campaigns", description: "Create ad campaigns for Facebook, LinkedIn, Google. AI prepares everything — you review and launch manually." },
      { heading: "SEO & Growth", description: "Keyword research, website audit, ranking tracking. Focus on cybersecurity marketing niche keywords." },
      { heading: "Campaign Orchestrator", description: "Coordinate multi-channel campaigns. Track full journey from impression to closed client." },
      { heading: "Competitor Intel", description: "Monitor competitor agencies. Get battle cards for sales calls. Identify gaps PMG can exploit." },
    ],
  },
  "/production": {
    title: "Production Guide",
    steps: [
      { heading: "Client Onboarding", description: "Step-by-step checklist: collect brand assets, get access, define audience, set goals, choose CRM." },
      { heading: "Marketing Audit", description: "Deep audit of client's website, social, ads, email, SEO. Identifies exactly why they're not getting clients." },
      { heading: "Creative Production", description: "Create images (DALL-E 3), videos (Runway ML), documents, and branding packages. Preview and download in any format." },
      { heading: "Lead Generator", description: "Generate 20 ready-to-close leads per client per month. Each lead scored 80+ with verified contacts." },
      { heading: "Campaigns & Funnels", description: "Build client campaigns and conversion funnels: Ad → Landing Page → Form → Email Nurture → Sales Call." },
      { heading: "Reporting & CRM Sync", description: "Generate performance reports. Sync leads and deals to client's GHL or HubSpot." },
    ],
  },
  "/admin": {
    title: "Admin Guide",
    steps: [
      { heading: "Operations", description: "Assign tasks based on skills and workload. Track completion. Get daily action plans per team member." },
      { heading: "Knowledge Base", description: "SOPs, playbooks, templates, and training materials. Searchable — ask any question, get instant answers." },
      { heading: "Executive Briefing", description: "Morning briefing: overnight activity, urgent items, today's priorities. Weekly pipeline and revenue summary." },
      { heading: "System Evolution", description: "Weekly scan of new AI tools, platforms, and trends. You decide: Approve, Explore Later, or Skip." },
    ],
  },
  "/finance": {
    title: "Finance Guide",
    steps: [
      { heading: "Billing & Revenue", description: "Create invoices (one-time, recurring). Track payments: Draft → Sent → Viewed → Paid → Overdue." },
      { heading: "Revenue Dashboard", description: "See MRR, revenue per client, growth trends. Client profitability: revenue minus cost to serve." },
      { heading: "Contracts", description: "Manage service agreements. Get renewal alerts 60 days before expiration. Track contract lifecycle." },
      { heading: "Expenses & Forecasting", description: "Track all expenses: tools, ads, AI costs, subscriptions. Monthly P&L and revenue forecasting." },
    ],
  },
  "/settings": {
    title: "Settings Guide",
    steps: [
      { heading: "General", description: "Set company name, logo, branding, timezone, and brand voice guidelines." },
      { heading: "AI Modes", description: "Choose between AI Autonomous, Hybrid, or Manual Control globally or per section." },
      { heading: "Wallet & Keys", description: "Manage AI spending budget, set limits, and configure API keys for Claude, DALL-E, Runway, etc." },
      { heading: "Users & Channels", description: "Add team members with roles (Super Admin, Admin, Manager, Viewer). Connect social channels." },
      { heading: "Legal & Compliance", description: "CAN-SPAM, GDPR, TCPA compliance. Anti-spam rules. Contract templates. Opt-out management." },
      { heading: "System Health", description: "Monitor all 32 agents, API health, database stats. Run diagnostics when issues arise." },
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

function VideoGuideOverlay({
  guide,
  onClose,
}: {
  guide: { title: string; steps: { heading: string; description: string }[] };
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-[hsl(222_47%_6%)] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-crimson/5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-crimson" />
            <span className="text-sm font-semibold">{guide.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              Step {currentStep + 1} of {guide.steps.length}
            </span>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/5">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <div className="flex gap-1 mb-4">
              {guide.steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    idx <= currentStep ? "bg-crimson" : "bg-white/10"
                  )}
                />
              ))}
            </div>

            <div className="rounded-lg glass-surface p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-crimson/20 flex items-center justify-center text-crimson font-bold text-sm">
                  {currentStep + 1}
                </div>
                <h3 className="text-sm font-semibold">{guide.steps[currentStep].heading}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {guide.steps[currentStep].description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(0)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors"
            >
              <RotateCcw className="h-3 w-3" />Replay
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
              )}
              {currentStep < guide.steps.length - 1 ? (
                <Button
                  size="sm"
                  className="btn-premium text-white text-xs h-7"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  Next Step <SkipForward className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="btn-premium text-white text-xs h-7"
                  onClick={onClose}
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
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
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
  const roleName = user?.role?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || "User";

  return (
    <div className={cn("p-3 border-t border-border/30", collapsed && "p-2")}>
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
              onClick={() => logout()}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
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
