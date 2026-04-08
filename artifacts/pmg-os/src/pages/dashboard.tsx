import { useListLeads, useListOpportunities, useListCompanies, useListTasks } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import {
  LayoutDashboard, Target, Briefcase, TrendingUp, Users, DollarSign,
  ArrowRight, Clock, CheckCircle2, Zap, Activity, Bot, Eye, Hand,
  Shield, AlertTriangle, RefreshCw
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const { data: leads } = useListLeads();
  const { data: opportunities } = useListOpportunities();
  const { data: tasks } = useListTasks();
  const { currentMode } = useAiModeContext();
  const [, setLocation] = useLocation();

  const leadList = (leads ?? []) as any[];
  const oppList = (opportunities ?? []) as any[];
  const taskList = (tasks ?? []) as any[];

  const qualified = leadList.filter((l: any) => l.status === "qualified").length;
  const activeDeals = oppList.filter((o: any) => o.stage !== "closed_won" && o.stage !== "closed_lost").length;
  const wonDeals = oppList.filter((o: any) => o.stage === "closed_won").length;
  const totalRevenue = oppList
    .filter((o: any) => o.stage === "closed_won")
    .reduce((s: number, o: any) => s + (o.value ?? o.amount ?? 0), 0);
  const pendingTasks = taskList.filter((t: any) => t.status !== "completed" && t.status !== "done").length;

  const modeLabel = currentMode === "ai_auto" ? "AI Autonomous" : currentMode === "hybrid" ? "Hybrid Mode" : "Manual Mode";
  const ModeIcon = currentMode === "ai_auto" ? Bot : currentMode === "hybrid" ? Eye : Hand;
  const modeBadgeClass = currentMode === "ai_auto" ? "border-crimson/30 text-crimson" : currentMode === "hybrid" ? "border-blue-400/30 text-blue-400" : "border-yellow-400/30 text-yellow-400";

  const quickActions = currentMode === "human" ? [
    { label: "Enter Prospects Manually", href: "/outreach", icon: Target, color: "text-crimson" },
    { label: "View Pipeline", href: "/crm", icon: Briefcase, color: "text-info" },
    { label: "Create Content", href: "/production", icon: Zap, color: "text-gold" },
    { label: "Open Settings", href: "/settings", icon: Activity, color: "text-success" },
  ] : [
    { label: "Find Prospects", href: "/outreach", icon: Target, color: "text-crimson" },
    { label: "View Pipeline", href: "/crm", icon: Briefcase, color: "text-info" },
    { label: "Create Content", href: "/production", icon: Zap, color: "text-gold" },
    { label: "Open Settings", href: "/settings", icon: Activity, color: "text-success" },
  ];

  const pipelineStages = ["new_lead", "meeting_set", "discovery", "proposal", "negotiation", "closed_won", "closed_lost"];
  const stageLabels: Record<string, string> = {
    new_lead: "New Lead", meeting_set: "Meeting Set", discovery: "Discovery",
    proposal: "Proposal", negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost"
  };
  const stageCounts = pipelineStages.reduce((acc, stage) => {
    acc[stage] = oppList.filter((o: any) => (o.stage ?? "new_lead") === stage).length;
    return acc;
  }, {} as Record<string, number>);
  const totalDeals = oppList.length || 1;

  const systemModules = [
    {
      label: "AI Engine",
      status: currentMode === "ai_auto" ? "autonomous" : currentMode === "hybrid" ? "hybrid" : "standby",
      detail: currentMode === "ai_auto" ? "Full auto — all agents active" : currentMode === "hybrid" ? "AI + human review" : "Manual only — AI standby",
      icon: Bot,
    },
    {
      label: "Wallet",
      status: "active",
      detail: "Credits available",
      icon: DollarSign,
    },
    {
      label: "Outreach",
      status: leadList.length > 0 ? "active" : "ready",
      detail: currentMode === "ai_auto" ? `${leadList.length} leads — auto-processed` : currentMode === "hybrid" ? `${leadList.length} leads — review pending` : `${leadList.length} leads — manual tracking`,
      icon: Target,
    },
    {
      label: "CRM",
      status: oppList.length > 0 ? "active" : "ready",
      detail: currentMode === "ai_auto" ? `${oppList.length} deals — AI advancing` : currentMode === "hybrid" ? `${oppList.length} deals — some need review` : `${oppList.length} deals — manually managed`,
      icon: Briefcase,
    },
    {
      label: "Marketing",
      status: "active",
      detail: currentMode === "ai_auto" ? "Auto-scheduling content" : currentMode === "hybrid" ? "Drafts pending approval" : "Awaiting manual input",
      icon: TrendingUp,
    },
    {
      label: "Production",
      status: "active",
      detail: currentMode === "ai_auto" ? "Auto-generating assets" : currentMode === "hybrid" ? "Assets ready for review" : "Manual creation mode",
      icon: Zap,
    },
  ];

  function getStatusColor(status: string) {
    if (status === "autonomous") return "bg-crimson animate-pulse";
    if (status === "hybrid") return "bg-blue-400 animate-pulse";
    if (status === "active" || status === "online") return "bg-success animate-pulse";
    if (status === "standby") return "bg-yellow-400";
    return "bg-muted-foreground/40";
  }

  function getLeadModeInfo(lead: any) {
    if (currentMode === "ai_auto") {
      return { badge: "AI Routed", badgeClass: "border-crimson/30 text-crimson bg-crimson/5" };
    } else if (currentMode === "hybrid") {
      const needsReview = lead.status === "new" || lead.status === "contacted";
      return needsReview
        ? { badge: "Needs Review", badgeClass: "border-yellow-400/30 text-yellow-400 bg-yellow-400/5" }
        : { badge: "Reviewed", badgeClass: "border-green-400/30 text-green-400 bg-green-400/5" };
    } else {
      return { badge: (lead.status ?? "new").replace(/_/g, " "), badgeClass: "border-muted-foreground/30 text-muted-foreground" };
    }
  }

  function getDealModeInfo(opp: any) {
    if (currentMode === "ai_auto") {
      return { badge: "Auto-Advanced", badgeClass: "border-crimson/30 text-crimson bg-crimson/5" };
    } else if (currentMode === "hybrid") {
      return { badge: "Review Required", badgeClass: "border-yellow-400/30 text-yellow-400 bg-yellow-400/5" };
    } else {
      return { badge: (opp.stage ?? "new_lead").replace(/_/g, " "), badgeClass: "border-muted-foreground/30 text-muted-foreground" };
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="Your business at a glance — every section, every metric, one view"
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Badge variant="outline" className={`text-xs px-3 py-1 flex items-center gap-1.5 ${modeBadgeClass}`}>
            <ModeIcon className="h-3 w-3" />
            {modeLabel}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Leads" value={leadList.length} icon={<Users className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Qualified" value={qualified} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Active Deals" value={activeDeals} icon={<Briefcase className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Won Deals" value={wonDeals} icon={<TrendingUp className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}k`} icon={<DollarSign className="h-4 w-4" />} accent="success" />
        <KpiCard label="Pending Tasks" value={pendingTasks} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
            {currentMode === "ai_auto" && (
              <span className="text-[10px] text-crimson/70 flex items-center gap-1"><Bot className="h-3 w-3" /> AI handles most actions</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-surface rounded-lg p-4 cursor-pointer group flex items-center gap-3"
                >
                  <div className={`p-2 rounded-lg glass-surface ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-foreground transition-colors">{action.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Pipeline Summary</h3>
            <Link href="/crm">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          {oppList.length === 0 ? (
            <div className="text-center py-6">
              <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No deals in pipeline yet</p>
              <Link href="/outreach">
                <Button size="sm" className="mt-3 btn-premium text-white text-xs">
                  Start Prospecting
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {currentMode !== "human" && (
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  {currentMode === "ai_auto" ? (
                    <span className="text-[10px] text-crimson/70 flex items-center gap-1"><Bot className="h-3 w-3" /> AI auto-advancing deals</span>
                  ) : (
                    <span className="text-[10px] text-yellow-400/70 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Some deals need your review</span>
                  )}
                </div>
              )}

              <div className="space-y-1.5 mb-3">
                {pipelineStages.filter(s => s !== "closed_lost").map((stage) => {
                  const count = stageCounts[stage] || 0;
                  const pct = Math.max(4, (count / totalDeals) * 100);
                  const isWon = stage === "closed_won";
                  return (
                    <div key={stage} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 truncate">{stageLabels[stage]}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: count > 0 ? `${pct}%` : "0%" }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          className={`h-full rounded-full ${isWon ? "bg-success" : "bg-crimson/60"}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {oppList.slice(0, 3).map((opp: any) => {
                const modeInfo = getDealModeInfo(opp);
                return (
                  <div key={opp.id}
                    className="flex items-center justify-between p-2 rounded-lg glass-surface cursor-pointer hover:bg-white/[0.03] transition-colors"
                    onClick={() => setLocation("/crm")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{opp.title ?? opp.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{(opp.stage ?? "new").replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="outline" className={`text-[9px] ${modeInfo.badgeClass}`}>{modeInfo.badge}</Badge>
                      <span className="text-xs font-semibold text-crimson">${((opp.value ?? opp.amount ?? 0) / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Leads</h3>
            <Link href="/outreach">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          {leadList.length === 0 ? (
            <div className="text-center py-6">
              <Target className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No leads yet — start with Outreach</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentMode !== "human" && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {currentMode === "ai_auto" ? (
                    <span className="text-[10px] text-crimson/70 flex items-center gap-1"><Bot className="h-3 w-3" /> All leads auto-scored and routed by AI</span>
                  ) : (
                    <span className="text-[10px] text-blue-400/70 flex items-center gap-1"><Eye className="h-3 w-3" /> AI scored — your approval needed</span>
                  )}
                </div>
              )}
              {currentMode === "human" && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] text-yellow-400/70 flex items-center gap-1"><Hand className="h-3 w-3" /> Manual tracking — no AI processing</span>
                </div>
              )}
              {leadList.slice(0, 5).map((lead: any) => {
                const modeInfo = getLeadModeInfo(lead);
                return (
                  <div key={lead.id}
                    className="flex items-center justify-between p-2 rounded-lg glass-surface cursor-pointer hover:bg-white/[0.03] transition-colors"
                    onClick={() => setLocation("/outreach")}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{lead.firstName ?? lead.first_name ?? ""} {lead.lastName ?? lead.last_name ?? ""}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{lead.company ?? lead.companyName ?? ""}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] capitalize ${modeInfo.badgeClass}`}>{modeInfo.badge}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">System Status</h3>
            <Badge variant="outline" className={`text-[9px] ${modeBadgeClass} flex items-center gap-1`}>
              <ModeIcon className="h-2.5 w-2.5" />
              {modeLabel}
            </Badge>
          </div>
          <div className="space-y-3">
            {systemModules.map((sys) => (
              <div key={sys.label} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(sys.status)}`} />
                  <sys.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{sys.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{sys.detail}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
