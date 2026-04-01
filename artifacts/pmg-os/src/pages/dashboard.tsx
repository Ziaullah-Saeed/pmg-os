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
  Phone, FileText, CircleDot, Inbox, ListChecks
} from "lucide-react";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import { useAgentStats, useAiRecommendations, useInterventionQueue, useAgentActivity } from "@/hooks/use-api";
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
  { id: "executive", label: "Executive", icon: <Eye className="h-3.5 w-3.5" /> },
  { id: "operations", label: "Operations", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "health", label: "System Health", icon: <Server className="h-3.5 w-3.5" /> },
  { id: "exceptions", label: "Exceptions", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { id: "ai-activity", label: "AI Activity", icon: <Bot className="h-3.5 w-3.5" /> },
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

  if (isHuman) {
    return (
      <div className="max-w-[1600px] mx-auto w-full space-y-6">
        <PageHeader
          title="Command Center"
          subtitle="Manual operations mode — step-by-step guidance for your daily workflow"
          icon={<Users className="h-5 w-5" />}
          actions={
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 px-3 py-1">
              <Users className="h-3 w-3 mr-1.5" />Human Control Active
            </Badge>
          }
        />
        <ModeIndicatorBanner />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-semibold text-blue-200 mb-4 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-400" />Today's Action Items
            </h3>
            <div className="space-y-2">
              {[
                { label: "Review pipeline — check for stale deals", done: false, icon: <Briefcase className="h-3.5 w-3.5" /> },
                { label: "Follow up on pending leads", done: false, icon: <Phone className="h-3.5 w-3.5" /> },
                { label: "Review AI recommendations from yesterday", done: false, icon: <Inbox className="h-3.5 w-3.5" /> },
                { label: "Check outstanding invoices", done: false, icon: <DollarSign className="h-3.5 w-3.5" /> },
                { label: "Update campaign performance notes", done: false, icon: <Megaphone className="h-3.5 w-3.5" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer group">
                  <div className="p-1.5 rounded bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-xs text-slate-300 flex-1">{item.label}</span>
                  <ArrowRight className="h-3 w-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
              ))}
            </div>
          </GlassCard>

          <div className="space-y-4">
            <GlassCard>
              <h3 className="text-sm font-semibold text-blue-200 mb-3 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-blue-400" />Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Active Deals</span>
                  <span className="text-sm font-bold text-white">{oppList.filter((o: any) => !["closed_won", "closed_lost"].includes(o.stage)).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Pipeline Value</span>
                  <span className="text-sm font-bold text-white">${totalPipelineValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Open Leads</span>
                  <span className="text-sm font-bold text-white">{totalLeads}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Pending Tasks</span>
                  <span className="text-sm font-bold text-white">{pendingTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Stale Deals</span>
                  <span className={`text-sm font-bold ${staleDeals.length > 0 ? "text-red-400" : "text-green-400"}`}>{staleDeals.length}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold text-yellow-200 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />Needs Attention
              </h3>
              {attentionItems.length === 0 ? (
                <div className="text-center py-3">
                  <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-500">All clear</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attentionItems.slice(0, 5).map((item, i) => (
                    <div key={i} className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                      <p className="text-[10px] font-medium text-yellow-200">{item.text}</p>
                      <p className="text-[9px] text-yellow-400/50">{item.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        <HumanWorkflowGuide
          title="Daily Operations Workflow"
          steps={[
            { id: "1", title: "Review Dashboard", description: "Check pipeline health, stale deals, and pending tasks", status: "current", action: "Start Review" },
            { id: "2", title: "Process Lead Queue", description: "Review new leads, score manually, assign priorities", status: "upcoming" },
            { id: "3", title: "Follow Up on Deals", description: "Call or email contacts with stale or advancing deals", status: "upcoming" },
            { id: "4", title: "Update CRM Records", description: "Log activities, update deal stages, add notes", status: "upcoming" },
            { id: "5", title: "End-of-Day Summary", description: "Review what was accomplished and set tomorrow's priorities", status: "upcoming" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Command Center"
        subtitle={isHybrid
          ? "Hybrid mode — AI handles routine tasks, items needing review are highlighted"
          : "Executive control surface — real-time cross-domain visibility and operational intelligence"
        }
        icon={isHybrid ? <Zap className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            {agentStats && (
              <Badge variant="outline" className="border-green-500/20 text-green-400 text-[10px]">
                <Bot className="h-3 w-3 mr-1" />{agentStats.total} Agents • {agentStats.totalRuns} Runs
              </Badge>
            )}
            <StatusBadge variant={health ? "active" : "critical"} label={health ? "All Systems Operational" : "System Issue"} />
          </div>
        }
      />

      {isHybrid && <ModeIndicatorBanner />}

      <PremiumTabs tabs={tabsWithCounts} activeTab={activeView} onTabChange={setActiveView} />

      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
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

        {activeView === "operations" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard label="Active Tasks" value={taskList.filter((t: any) => t.status !== "completed").length} icon={<Zap className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Pending Actions" value={pendingTasks.length} icon={<Clock className="h-4 w-4" />} accent="gold" />
              <KpiCard label="Critical Items" value={criticalTasks.length} icon={<AlertTriangle className="h-4 w-4" />} accent="crimson" />
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
        )}

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
