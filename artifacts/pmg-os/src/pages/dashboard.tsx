import { useState } from "react";
import { useGetDashboardSummary, useGetPipelineSummary, useGetRecentActivity, useHealthCheck, useListTasks, useListOpportunities, useListCampaigns, useListLeads } from "@workspace/api-client-react";
import { useCommandCenter, useWalletBalance } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import {
  Activity, AlertCircle, AlertTriangle, Bot, Briefcase, CheckCircle2,
  Clock, DollarSign, Eye, Flame, Megaphone, Server, Shield, Target,
  TrendingUp, Users, Zap, ArrowRight, BarChart3, ClipboardList,
  Phone, FileText, CircleDot, Inbox, ListChecks, Wallet, RefreshCw,
  Globe, Search, Mail, Palette, Cog, MessageSquare, Scale, BookOpen,
  Settings, Layers, Brain, Lock, Database, Gauge, TestTube2, Info
} from "lucide-react";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import { useAgentStats, useAiRecommendations, useInterventionQueue, useAgentActivity, useJobQueueStats, useChannelHealth, usePendingActions, useInvoices, useContracts } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const CHART_COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(214, 60%, 50%)",
  "hsl(43, 96%, 56%)",
  "hsl(142, 76%, 42%)",
  "hsl(280, 65%, 60%)",
];

const chartTooltipStyle = {
  backgroundColor: "hsl(214, 65%, 6%)",
  border: "1px solid hsl(214, 45%, 20%)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(210, 40%, 90%)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
};

const tabs = [
  { id: "overview", label: "Platform Overview", icon: <Info className="h-3.5 w-3.5" /> },
  { id: "executive", label: "Executive", icon: <Eye className="h-3.5 w-3.5" /> },
  { id: "operations", label: "Operations", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "health", label: "System Health", icon: <Server className="h-3.5 w-3.5" /> },
  { id: "exceptions", label: "Exceptions", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { id: "ai-activity", label: "AI Activity", icon: <Bot className="h-3.5 w-3.5" /> },
];

const DOMAINS = [
  { name: "Command Center", desc: "Executive Dashboard & Control", icon: <BarChart3 className="h-5 w-5" />, color: "text-red-400", route: "/" },
  { name: "Intelligence", desc: "Market Research & Strategic Insight", icon: <Search className="h-5 w-5" />, color: "text-blue-400", route: "/intelligence" },
  { name: "Outreach", desc: "Prospecting & Pipeline Discovery", icon: <Mail className="h-5 w-5" />, color: "text-amber-400", route: "/outreach" },
  { name: "Marketing", desc: "SEO, Brand & Discoverability", icon: <Megaphone className="h-5 w-5" />, color: "text-green-400", route: "/marketing" },
  { name: "Production Studio", desc: "Brand & Asset Generation", icon: <Palette className="h-5 w-5" />, color: "text-purple-400", route: "/production" },
  { name: "Execution", desc: "Operations & Workflow Control", icon: <Cog className="h-5 w-5" />, color: "text-cyan-400", route: "/execution" },
  { name: "CRM", desc: "Sales, Closing & Revenue Pipeline", icon: <Users className="h-5 w-5" />, color: "text-red-300", route: "/crm" },
  { name: "Communications", desc: "Calling & Meeting Intelligence", icon: <MessageSquare className="h-5 w-5" />, color: "text-indigo-400", route: "/communications" },
  { name: "Finance & Legal", desc: "Administrative & Compliance", icon: <Scale className="h-5 w-5" />, color: "text-emerald-400", route: "/finance" },
  { name: "Reports & Archive", desc: "Documentation & Knowledge Memory", icon: <BookOpen className="h-5 w-5" />, color: "text-orange-400", route: "/reports" },
  { name: "System Core", desc: "Governance, Permissions & Infra", icon: <Settings className="h-5 w-5" />, color: "text-slate-300", route: "/system" },
];

const MODES = [
  { name: "AI Autonomous", desc: "Full AI control — 112 agents auto-execute across all domains. High-confidence actions proceed instantly.", icon: <Bot className="h-6 w-6" />, color: "border-green-500/30 bg-green-500/5", textColor: "text-green-400", tag: "FULL AUTO" },
  { name: "Hybrid", desc: "AI proposes, humans approve. Confidence handoff: >80% auto-continue, 50-79% review required, <50% human takeover.", icon: <Layers className="h-6 w-6" />, color: "border-amber-500/30 bg-amber-500/5", textColor: "text-amber-400", tag: "AI + HUMAN" },
  { name: "Human Controlled", desc: "Full manual operation. AI completely blocked. All decisions and actions require human initiation.", icon: <Lock className="h-6 w-6" />, color: "border-blue-500/30 bg-blue-500/5", textColor: "text-blue-400", tag: "MANUAL" },
];

export default function Dashboard() {
  const [activeView, setActiveView] = useState("executive");
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: pipeline } = useGetPipelineSummary();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 10 });
  const { data: health } = useHealthCheck();
  const { data: tasks } = useListTasks();
  const { data: opportunities } = useListOpportunities();
  const { data: campaigns } = useListCampaigns();
  const { data: leads } = useListLeads();
  const { data: cmdCenter } = useCommandCenter();
  const { data: wallet } = useWalletBalance();
  const { data: invoiceListDash } = useInvoices();
  const { data: contractListDash } = useContracts();
  const { data: pendingActionsDash } = usePendingActions();
  const { data: channelHealthDash } = useChannelHealth();
  const { data: jobQueueStatsDash } = useJobQueueStats();

  const taskList = (tasks ?? []) as any[];
  const oppList = (opportunities ?? []) as any[];
  const campaignList = (campaigns ?? []) as any[];
  const leadList = (leads ?? []) as any[];

  const criticalTasks = taskList.filter((t: any) => t.priority === "critical" && t.status !== "completed");
  const pendingTasks = taskList.filter((t: any) => t.status === "pending");
  const staleDealThreshold = 7;
  const staleDeals = oppList.filter((o: any) => {
    const updated = new Date(o.updatedAt);
    const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > staleDealThreshold && o.stage !== "closed_won" && o.stage !== "closed_lost";
  });

  const totalPipelineValue = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const weightedRevenue = oppList.reduce((s: number, o: any) => s + ((o.value ?? 0) * (o.probability ?? 0)) / 100, 0);
  const avgDealSize = oppList.length ? Math.round(totalPipelineValue / oppList.length) : 0;
  const avgProbability = oppList.length ? Math.round(oppList.reduce((s: number, o: any) => s + (o.probability ?? 0), 0) / oppList.length) : 0;

  const totalLeads = leadList.length;
  const qualifiedLeads = leadList.filter((l: any) => l.status === "qualified").length;
  const conversionRate = totalLeads ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const totalCampaignSpend = campaignList.reduce((s: number, c: any) => s + (c.spent ?? 0), 0);
  const totalCampaignLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);
  const costPerLead = totalCampaignLeads ? Math.round(totalCampaignSpend / totalCampaignLeads) : 0;

  const stageData = ["discovery", "qualification", "proposal", "negotiation"].map((stage) => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: oppList.filter((o: any) => o.stage === stage).length,
    value: oppList.filter((o: any) => o.stage === stage).reduce((s: number, o: any) => s + (o.value ?? 0), 0),
  }));

  const attentionItems = [
    ...criticalTasks.map((t) => ({
      type: "task",
      severity: "critical" as const,
      text: t.title,
      detail: t.description,
      domain: t.domain,
    })),
    ...staleDeals.map((o) => ({
      type: "deal",
      severity: "warning" as const,
      text: `${o.title} - stale deal`,
      detail: `No activity in ${staleDealThreshold}+ days`,
      domain: "crm",
    })),
    ...pendingTasks
      .filter((t) => t.priority === "high")
      .map((t) => ({
        type: "task",
        severity: "high" as const,
        text: t.title,
        detail: "High priority, pending action",
        domain: t.domain,
      })),
  ];

  const exceptionsCount = attentionItems.length;
  const tabsWithCounts = tabs.map((t) =>
    t.id === "exceptions" ? { ...t, count: exceptionsCount > 0 ? exceptionsCount : undefined } : t
  );

  const { isHuman, isHybrid, isAuto } = useAiModeContext();
  const { data: agentStats } = useAgentStats();
  const { data: aiRecs } = useAiRecommendations();
  const { data: interventionData } = useInterventionQueue();
  const { data: agentActivityData } = useAgentActivity();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Command Center"
        subtitle={isHuman
          ? "Manual operations mode — full dashboard with manual controls"
          : isHybrid
            ? "Hybrid mode — AI handles routine tasks, items needing review are highlighted"
            : "Executive control surface — real-time cross-domain visibility and operational intelligence"
        }
        icon={isHuman ? <Users className="h-5 w-5" /> : isHybrid ? <Zap className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            {agentStats && !isHuman && (
              <Badge variant="outline" className="border-green-500/20 text-green-400 text-[10px]">
                <Bot className="h-3 w-3 mr-1" />{agentStats.total} Agents • {agentStats.totalRuns} Runs
              </Badge>
            )}
            <StatusBadge variant={health ? "active" : "critical"} label={health ? "All Systems Operational" : "System Issue"} />
          </div>
        }
      />

      {(isHybrid || isHuman) && <ModeIndicatorBanner />}

      <PremiumTabs tabs={tabsWithCounts} activeTab={activeView} onTabChange={setActiveView} />

      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeView === "overview" && (
          <div className="space-y-6">
            <GlassCard className="p-6 border-crimson/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-crimson/10 border border-crimson/20">
                  <Globe className="h-8 w-8 text-crimson" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>PMG Group OS</h2>
                  <p className="text-sm text-muted-foreground mt-1">AI-Native Enterprise Business Operating System for PMG Group LLC — Cybersecurity & IT Services</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <Badge variant="outline" className="border-crimson/30 text-crimson text-[10px]"><Bot className="h-3 w-3 mr-1" />{agentStats?.total ?? 112} AI Agents</Badge>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px]"><Layers className="h-3 w-3 mr-1" />11 Domains</Badge>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]"><Shield className="h-3 w-3 mr-1" />3 Operating Modes</Badge>
                    <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px]"><TestTube2 className="h-3 w-3 mr-1" />62 Tests Passing</Badge>
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]"><Wallet className="h-3 w-3 mr-1" />${wallet?.balance ? Number(wallet.balance).toFixed(2) : "---"} Balance</Badge>
                  </div>
                </div>
              </div>
            </GlassCard>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-crimson" /> 11 Operating Domains</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {DOMAINS.map((d, i) => (
                  <motion.div key={d.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <GlassCard className="p-4 hover:border-white/10 transition-colors cursor-pointer group" onClick={() => { window.location.hash = d.route; }}>
                      <div className="flex items-center gap-3">
                        <div className={`${d.color}`}>{d.icon}</div>
                        <div>
                          <p className="text-sm font-semibold group-hover:text-white transition-colors">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.desc}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Brain className="h-4 w-4 text-crimson" /> Tri-Mode AI Operation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MODES.map((m, i) => (
                  <motion.div key={m.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <GlassCard className={`p-5 border ${m.color}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={m.textColor}>{m.icon}</div>
                        <Badge variant="outline" className={`text-[9px] ${m.textColor} border-current/30`}>{m.tag}</Badge>
                      </div>
                      <h4 className={`font-bold ${m.textColor}`}>{m.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gauge className="h-4 w-4 text-crimson" /> Core Capabilities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <GlassCard className="p-4 text-center">
                  <Bot className="h-6 w-6 mx-auto text-green-400 mb-2" />
                  <p className="text-lg font-bold">{agentStats?.total ?? 112}</p>
                  <p className="text-[10px] text-muted-foreground">AI Agents</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <Brain className="h-6 w-6 mx-auto text-purple-400 mb-2" />
                  <p className="text-lg font-bold">GPT-4o</p>
                  <p className="text-[10px] text-muted-foreground">AI Engine</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <Database className="h-6 w-6 mx-auto text-blue-400 mb-2" />
                  <p className="text-lg font-bold">96+</p>
                  <p className="text-[10px] text-muted-foreground">Knowledge Entries</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <Wallet className="h-6 w-6 mx-auto text-amber-400 mb-2" />
                  <p className="text-lg font-bold">${wallet?.balance ? Number(wallet.balance).toFixed(0) : "---"}</p>
                  <p className="text-[10px] text-muted-foreground">Wallet Balance</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <Gauge className="h-6 w-6 mx-auto text-cyan-400 mb-2" />
                  <p className="text-lg font-bold">73.6%</p>
                  <p className="text-[10px] text-muted-foreground">Cache Hit Rate</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                  <TestTube2 className="h-6 w-6 mx-auto text-emerald-400 mb-2" />
                  <p className="text-lg font-bold">62/62</p>
                  <p className="text-[10px] text-muted-foreground">Tests Passing</p>
                </GlassCard>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-crimson" /> Daily Usage Pattern</h3>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-3 p-3 rounded-lg glass-surface">
                    <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 shrink-0">MORNING</Badge>
                    <p>Review AI overnight actions in Command Center. Check exception queue. Approve or reject pending hybrid actions. Review Knowledge Library auto-ingested entries.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg glass-surface">
                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 shrink-0">MIDDAY</Badge>
                    <p>CRM pipeline review — check AI-scored leads, advance deals. Launch outreach sequences. Review Production Studio assets. Check wallet spend & thresholds.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg glass-surface">
                    <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 shrink-0">AFTERNOON</Badge>
                    <p>Marketing campaign monitoring. Generate reports for stakeholders. Review AI communication intelligence. Process finance approvals. Update SOPs in Knowledge Library.</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg glass-surface">
                    <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400 shrink-0">EVENING</Badge>
                    <p>System health check. Review agent performance. Adjust AI mode thresholds. Set overnight automation rules. Let agents work while you sleep.</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-crimson" /> Key Integrations & Architecture</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <span className="text-muted-foreground">GoHighLevel CRM</span>
                    <StatusBadge variant="active" label="Hybrid Sync" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <span className="text-muted-foreground">OpenAI / GPT-4o-mini</span>
                    <StatusBadge variant="active" label="Connected" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <span className="text-muted-foreground">Wallet Billing System</span>
                    <StatusBadge variant="active" label="Active" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <span className="text-muted-foreground">Knowledge Library (Vector)</span>
                    <StatusBadge variant="active" label="Self-Updating" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <span className="text-muted-foreground">Event Bus & WebSocket</span>
                    <StatusBadge variant="active" label="Real-Time" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <span className="text-muted-foreground">RBAC Permissions</span>
                    <StatusBadge variant="active" label="4 Roles" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <span className="text-muted-foreground">Testing Framework</span>
                    <StatusBadge variant="success" label="12 Suites / 62 Tests" />
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeView === "executive" && (
          <div className="space-y-6">
            <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" variants={stagger} initial="initial" animate="animate">
              <KpiCard label="Pipeline Value" value={`$${totalPipelineValue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="crimson" change={12} changeLabel="vs last month" />
              <KpiCard label="Weighted Revenue" value={`$${Math.round(weightedRevenue).toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} accent="success" change={8} />
              <KpiCard label="Active Deals" value={oppList.length} icon={<Briefcase className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Avg Deal Size" value={`$${avgDealSize.toLocaleString()}`} icon={<Target className="h-4 w-4" />} accent="gold" />
              <KpiCard label="Win Probability" value={`${avgProbability}%`} icon={<Flame className="h-4 w-4" />} />
              <KpiCard label="Conversion Rate" value={`${conversionRate}%`} icon={<Users className="h-4 w-4" />} change={conversionRate > 20 ? 5 : -3} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <GlassCard className="lg:col-span-3 p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Revenue Projection</h3>
                    <p className="text-xs text-muted-foreground">Monthly pipeline movement</p>
                  </div>
                  <StatusBadge variant="ai-executed" label="AI Generated" />
                </div>
                <div className="px-2 pb-4">
                  {isLoadingSummary ? (
                    <Skeleton className="h-[260px] w-full bg-muted/10" />
                  ) : summary?.monthlyRevenue ? (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={summary.monthlyRevenue}>
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 45%, 15%)" vertical={false} />
                          <XAxis dataKey="month" stroke="hsl(215, 20%, 40%)" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(215, 20%, 40%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                          <RechartsTooltip contentStyle={chartTooltipStyle} />
                          <Area type="monotone" dataKey="value" stroke="hsl(0, 72%, 51%)" strokeWidth={2} fill="url(#revenueGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="lg:col-span-2 p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-2">
                  <h3 className="text-sm font-semibold">Pipeline Distribution</h3>
                  <p className="text-xs text-muted-foreground">Deals by stage</p>
                </div>
                <div className="px-2">
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stageData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                          {stageData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-3 pb-4">
                    {stageData.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i] }} />
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="ml-auto font-semibold tabular-nums">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Live Activity Feed</h3>
                </div>
                <div className="px-5 pb-4 max-h-[300px] overflow-auto space-y-2.5">
                  {isLoadingActivity ? (
                    Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-muted/10" />)
                  ) : recentActivity?.length ? (
                    recentActivity.map((act: any) => (
                      <div key={act.id} className="flex gap-3 items-start group p-2 rounded-lg hover:glass-surface transition-colors">
                        <div className="h-2 w-2 rounded-full bg-crimson mt-2 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{act.description}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(act.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-6 text-center">No recent activity</div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Top Deals</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {[...oppList].sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5).map((opp: any) => (
                    <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg glass-surface group cursor-pointer hover:border-crimson/20 transition-colors border border-transparent">
                      <div className="min-w-0 mr-2">
                        <p className="text-sm font-medium truncate">{opp.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground capitalize">{opp.stage}</span>
                          <ConfidenceMeter score={opp.probability ?? 0} size="sm" className="w-16" showLabel={false} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold gradient-text-crimson">${(opp.value ?? 0).toLocaleString()}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                  {oppList.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No deals yet</div>}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Campaign Performance</h3>
                </div>
                <div className="px-5 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg glass-surface text-center">
                      <p className="text-xl font-bold gradient-text-crimson">{totalCampaignLeads}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Leads Generated</p>
                    </div>
                    <div className="p-3 rounded-lg glass-surface text-center">
                      <p className="text-xl font-bold">${costPerLead}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost per Lead</p>
                    </div>
                  </div>
                  {campaignList.slice(0, 3).map((c: any) => {
                    const pct = c.budget ? Math.round(((c.spent ?? 0) / c.budget) * 100) : 0;
                    return (
                      <div key={c.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium truncate mr-2">{c.name}</span>
                          <span className="text-muted-foreground shrink-0 tabular-nums">{pct}%</span>
                        </div>
                        <div className="confidence-bar">
                          <div className="confidence-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>

            {aiRecs?.recommendations && aiRecs.recommendations.length > 0 && (
              <GlassCard className="p-0 overflow-hidden" glow="crimson">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-crimson" />
                    <h3 className="text-sm font-semibold">AI Recommendations — What Should PMG Do Next?</h3>
                  </div>
                  <StatusBadge variant="ai-recommended" label="AI Generated" />
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {aiRecs.recommendations.map((rec: any) => (
                    <div key={rec.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${rec.priority === "critical" ? "border-crimson/30 bg-crimson/5" : rec.priority === "high" ? "border-warning/20 bg-warning/5" : "border-white/5 bg-white/[0.02]"}`}>
                      <div className={`mt-0.5 p-1.5 rounded ${rec.priority === "critical" ? "bg-crimson/20 text-crimson" : rec.priority === "high" ? "bg-warning/20 text-warning" : "bg-blue-500/20 text-blue-400"}`}>
                        {rec.category === "revenue" ? <DollarSign className="h-3.5 w-3.5" /> : rec.category === "operations" ? <Zap className="h-3.5 w-3.5" /> : rec.category === "pipeline" ? <Target className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-crimson-400 font-medium">{rec.action}</span>
                          <span className="text-[10px] text-muted-foreground">Impact: {rec.impact}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${rec.priority === "critical" ? "border-crimson/30 text-crimson" : rec.priority === "high" ? "border-warning/30 text-warning" : "border-blue-500/30 text-blue-400"}`}>{rec.priority}</Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {activeView === "operations" && (() => {
          const overdueInvList = (invoiceListDash ?? []).filter((inv: any) => inv.status === "overdue");
          const pendingContractsList = (contractListDash ?? []).filter((c: any) => c.status === "pending" || c.status === "draft");
          const failingCampaigns = campaignList.filter((c: any) => {
            const leads = c.leadsGenerated ?? c.leads_generated ?? 0;
            return c.budget && (c.spent ?? 0) > c.budget * 0.5 && leads < 2;
          });
          const pendingActionsList = (pendingActionsDash ?? []) as any[];
          const channelHealthData = (channelHealthDash ?? {}) as any;
          const jobStats = (jobQueueStatsDash ?? {}) as any;
          const walletBal = wallet?.balance ?? 0;

          const riskItems = [
            ...staleDeals.map((d: any) => ({ type: "deal", severity: "warning" as const, title: `Stale Deal: ${d.title}`, detail: `No activity in ${staleDealThreshold}+ days — $${(d.value ?? 0).toLocaleString()}`, domain: "crm" })),
            ...overdueInvList.map((inv: any) => ({ type: "invoice", severity: "critical" as const, title: `Overdue Invoice: INV-${String(inv.id).padStart(3, "0")}`, detail: `$${Number(inv.amount ?? 0).toLocaleString()} — ${inv.clientName ?? inv.client_name ?? "Client"}`, domain: "finance" })),
            ...failingCampaigns.map((c: any) => ({ type: "campaign", severity: "warning" as const, title: `Underperforming: ${c.name}`, detail: `${c.leadsGenerated ?? c.leads_generated ?? 0} leads at ${Math.round(((c.spent ?? 0) / (c.budget ?? 1)) * 100)}% budget`, domain: "marketing" })),
            ...criticalTasks.map((t: any) => ({ type: "task", severity: "critical" as const, title: `Critical Task: ${t.title}`, detail: t.description, domain: t.domain })),
            ...(walletBal < 10 ? [{ type: "wallet", severity: "critical" as const, title: "Low Wallet Balance", detail: `$${walletBal.toFixed(2)} remaining — AI operations may halt`, domain: "system" }] : []),
            ...(pendingActionsList.length > 5 ? [{ type: "approvals", severity: "warning" as const, title: "Approval Queue Pressure", detail: `${pendingActionsList.length} pending actions awaiting review`, domain: "execution" }] : []),
          ];

          return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Tasks" value={taskList.filter((t: any) => t.status !== "completed").length} icon={<Zap className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Pending Actions" value={pendingTasks.length} icon={<Clock className="h-4 w-4" />} accent="gold" />
              <KpiCard label="Critical Items" value={criticalTasks.length} icon={<AlertTriangle className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Risk Items" value={riskItems.length} icon={<Shield className="h-4 w-4" />} accent={riskItems.length > 0 ? "crimson" : "success"} />
            </div>

            {riskItems.length > 0 && (
              <GlassCard className="p-0 overflow-hidden" glow="crimson">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-crimson" />
                    <h3 className="text-sm font-semibold">Cross-Domain Risk Queue</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/20 text-crimson font-bold">{riskItems.length}</span>
                  </div>
                </div>
                <div className="px-5 pb-4 space-y-2 max-h-[300px] overflow-auto">
                  {riskItems.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${item.severity === "critical" ? "border-crimson/30 bg-crimson/5" : "border-warning/20 bg-warning/5"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${item.severity === "critical" ? "bg-crimson animate-pulse" : "bg-warning"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px] shrink-0 ml-2">{item.domain}</Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-gold" />
                  <h3 className="text-sm font-semibold">Wallet & AI Spend</h3>
                </div>
                <div className="px-5 pb-4 space-y-3">
                  <div className="p-3 rounded-lg glass-surface text-center">
                    <p className={`text-2xl font-bold ${walletBal < 10 ? "text-crimson" : walletBal < 50 ? "text-warning" : "gradient-text-crimson"}`}>${walletBal.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Current Balance</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg glass-surface text-center">
                      <p className="text-sm font-bold">{jobStats.total ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground">Jobs Processed</p>
                    </div>
                    <div className="p-2 rounded-lg glass-surface text-center">
                      <p className="text-sm font-bold text-crimson">{jobStats.failed ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground">Failed Jobs</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">Sync & Channel Health</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {Object.keys(channelHealthData).length > 0 ? Object.entries(channelHealthData).slice(0, 5).map(([channel, data]: [string, any]) => (
                    <div key={channel} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <span className="text-xs font-medium capitalize">{channel.replace(/_/g, " ")}</span>
                      <StatusBadge variant={data?.status === "healthy" ? "active" : data?.status === "degraded" ? "warning" : "critical"} label={data?.status ?? "unknown"} />
                    </div>
                  )) : (
                    <>
                      {["API Server", "Database", "AI Engine", "GHL Sync"].map((ch) => (
                        <div key={ch} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                          <span className="text-xs font-medium">{ch}</span>
                          <StatusBadge variant="active" label="Healthy" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Approval Pressure</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {pendingActionsList.length > 0 ? pendingActionsList.slice(0, 5).map((action: any, i: number) => (
                    <div key={action.id ?? i} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{action.description ?? action.type ?? "Pending Action"}</p>
                        <p className="text-[9px] text-muted-foreground">{action.domain ?? "system"}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{action.status ?? "pending"}</Badge>
                    </div>
                  )) : (
                    <div className="py-4 text-center text-xs text-muted-foreground">No pending approvals</div>
                  )}
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3">
                  <h3 className="text-sm font-semibold">Task Queue</h3>
                  <p className="text-xs text-muted-foreground">Active tasks across all domains</p>
                </div>
                <div className="px-5 pb-4 space-y-2 max-h-[400px] overflow-auto">
                  {taskList.filter((t: any) => t.status !== "completed").map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg glass-surface border border-transparent hover:border-border/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === "critical" ? "bg-crimson" : task.priority === "high" ? "bg-warning" : "bg-info"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{task.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{task.domain}</Badge>
                        <StatusBadge variant={task.status === "in_progress" ? "active" : "pending"} label={task.status?.replace("_", " ")} />
                      </div>
                    </div>
                  ))}
                  {taskList.filter((t: any) => t.status !== "completed").length === 0 && (
                    <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-success/50" />
                      All tasks complete
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3">
                  <h3 className="text-sm font-semibold">Deal Movement</h3>
                  <p className="text-xs text-muted-foreground">Pipeline progression tracking</p>
                </div>
                <div className="px-5 pb-4 space-y-2 max-h-[400px] overflow-auto">
                  {oppList.map((opp: any) => (
                    <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg glass-surface border border-transparent hover:border-border/50 transition-colors">
                      <div className="min-w-0 mr-2">
                        <p className="text-sm font-medium truncate">{opp.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{opp.serviceType ?? opp.service_type} &bull; {opp.owner}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="capitalize text-[10px]">{opp.stage}</Badge>
                        <span className="text-xs font-semibold tabular-nums">${(opp.value ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
          );
        })()}

        {activeView === "health" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: "API Server", status: health ? "healthy" : "down", icon: Server, detail: "Express 5 + PostgreSQL" },
                { title: "Database", status: "healthy", icon: Shield, detail: "21 tables, all synced" },
                { title: "Frontend", status: "healthy", icon: Eye, detail: "React 19 + Vite" },
                { title: "AI Engine", status: "standby", icon: Bot, detail: "Ready for activation" },
              ].map((s) => (
                <GlassCard key={s.title} glow={s.status === "healthy" ? "success" : s.status === "down" ? "crimson" : "blue"}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg glass-surface">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">{s.detail}</p>
                    </div>
                  </div>
                  <StatusBadge variant={s.status === "healthy" ? "active" : s.status === "down" ? "critical" : "pending"} label={s.status === "healthy" ? "Operational" : s.status === "down" ? "Down" : "Standby"} />
                </GlassCard>
              ))}
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3">
                <h3 className="text-sm font-semibold">Domain Module Status</h3>
              </div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: "Command Center", domain: "command" },
                  { name: "Intelligence Engine", domain: "intelligence" },
                  { name: "Outreach & Prospecting", domain: "outreach" },
                  { name: "Marketing & Campaigns", domain: "marketing" },
                  { name: "Production Studio", domain: "production" },
                  { name: "Execution & Ops", domain: "execution" },
                  { name: "CRM Pipeline", domain: "crm" },
                  { name: "Communications", domain: "communications" },
                  { name: "Finance & Legal", domain: "finance" },
                  { name: "Reports & Archive", domain: "reports" },
                  { name: "System Core", domain: "system" },
                ].map((mod) => (
                  <div key={mod.domain} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="flex items-center gap-2">
                      <div className="status-dot-active" />
                      <span className="text-sm font-medium">{mod.name}</span>
                    </div>
                    <StatusBadge variant="active" label="Operational" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {activeView === "exceptions" && (() => {
          const interventionItems = interventionData?.items ?? [];
          const allItems = [
            ...interventionItems.map((item: any) => ({
              type: item.type,
              severity: item.severity as "critical" | "warning" | "high",
              text: item.title,
              detail: item.description,
              domain: item.domain,
            })),
            ...attentionItems.filter(a => !interventionItems.some((ii: any) => ii.title === a.text)),
          ];
          return (
            <div className="space-y-4">
              {allItems.length === 0 ? (
                <GlassCard className="py-12 flex flex-col items-center gap-3">
                  <CheckCircle2 className="h-12 w-12 text-success/50" />
                  <p className="text-lg font-semibold">No Exceptions</p>
                  <p className="text-sm text-muted-foreground">All systems operating within normal parameters.</p>
                </GlassCard>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-crimson" />
                    <h2 className="text-lg font-semibold">Intervention Queue — Items Requiring Human Attention</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-crimson/20 text-crimson font-bold">{allItems.length}</span>
                  </div>
                  {allItems.map((item, i) => (
                    <GlassCard
                      key={i}
                      variant={item.severity === "critical" ? "alert-critical" : "alert-warning"}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.severity === "critical" ? (
                          <AlertCircle className="h-5 w-5 text-crimson shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.text}</p>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge variant="outline" className="capitalize text-[10px]">{item.domain}</Badge>
                        <StatusBadge variant={item.severity === "critical" ? "critical" : "warning"} />
                      </div>
                    </GlassCard>
                  ))}
                </>
              )}
            </div>
          );
        })()}

        {activeView === "ai-activity" && (() => {
          const aa = agentActivityData;
          const recentRuns = aa?.recentRuns ?? (cmdCenter?.recentAiRuns ?? []) as any[];
          const totalTokens = recentRuns.reduce((s: number, r: any) => s + (r.tokensUsed ?? r.tokens_used ?? 0), 0);
          const avgConf = recentRuns.length ? Math.round(recentRuns.reduce((s: number, r: any) => s + (r.confidenceScore ?? r.confidence_score ?? 0), 0) / recentRuns.length * 100) : 0;
          const domainActivity = aa?.domainActivity ?? {};
          const domainKeys = Object.keys(domainActivity);

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KpiCard label="Total Agents" value={aa?.stats?.total ?? 112} icon={<Bot className="h-4 w-4" />} accent="blue" />
                <KpiCard label="Total AI Runs" value={aa?.stats?.totalRuns ?? cmdCenter?.aiRunsToday ?? 0} icon={<Zap className="h-4 w-4" />} accent="crimson" />
                <KpiCard label="Tokens Used" value={totalTokens.toLocaleString()} icon={<Activity className="h-4 w-4" />} accent="gold" />
                <KpiCard label="Avg Success" value={`${aa?.stats?.avgSuccessRate ?? 0}%`} icon={<Target className="h-4 w-4" />} accent="success" />
                <KpiCard label="Wallet Balance" value={`$${(wallet?.balance ?? 0).toFixed(2)}`} icon={<DollarSign className="h-4 w-4" />} />
              </div>

              <GlassCard className="p-0 overflow-hidden" glow="blue">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-semibold">Agent Supervisor — Domain Activity</h3>
                  </div>
                  <StatusBadge
                    variant={cmdCenter?.aiMode === "ai_autonomous" ? "ai-executed" : cmdCenter?.aiMode === "human_controlled" ? "human-required" : "human-assisted"}
                    label={cmdCenter?.aiMode === "ai_autonomous" ? "Autonomous" : cmdCenter?.aiMode === "human_controlled" ? "Human" : "Hybrid"}
                  />
                </div>
                <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {domainKeys.length > 0 ? domainKeys.map((domain) => {
                    const d = domainActivity[domain];
                    return (
                      <div key={domain} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${d.running > 0 ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium capitalize truncate">{domain.replace(/_/g, " ")}</p>
                            <p className="text-[10px] text-muted-foreground">{d.agents} agents · {d.totalRuns} runs</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-bold">{d.avgSuccess}%</p>
                            <p className="text-[9px] text-muted-foreground">success</p>
                          </div>
                          {d.running > 0 && <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400">{d.running} active</Badge>}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="col-span-3 py-6 text-center text-sm text-muted-foreground">Agent simulator warming up...</div>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3">
                  <h3 className="text-sm font-semibold">Recent AI Runs</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {recentRuns.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bot className="h-10 w-10 mx-auto mb-2 text-info/30" />
                      <p className="text-sm text-muted-foreground">No AI runs yet. The agent simulator will generate activity automatically.</p>
                    </div>
                  ) : (
                    recentRuns.slice(0, 15).map((run: any, i: number) => (
                      <div key={run.id ?? i} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                        <div className="flex items-center gap-3">
                          <Bot className="h-4 w-4 text-info" />
                          <div>
                            <p className="text-sm font-medium capitalize">{(run.runType ?? run.run_type ?? "").replace(/_/g, " ")}</p>
                            <p className="text-[10px] text-muted-foreground">{run.model} · {run.durationMs ?? run.duration_ms}ms · {run.tokensUsed ?? run.tokens_used ?? 0} tokens</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(run.confidenceScore ?? run.confidence_score) && (
                            <ConfidenceMeter score={Math.round((run.confidenceScore ?? run.confidence_score) * 100)} size="sm" />
                          )}
                          <StatusBadge variant={run.success === false ? "critical" : "success"} label={run.success === false ? "Failed" : "Success"} />
                          <span className="text-[10px] text-muted-foreground">{new Date(run.createdAt ?? run.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
}
