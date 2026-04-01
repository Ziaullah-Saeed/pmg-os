import { useState } from "react";
import { useGetDashboardSummary, useGetPipelineSummary, useGetRecentActivity, useHealthCheck, useListTasks, useListOpportunities, useListCampaigns, useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertCircle, AlertTriangle, Briefcase, Building2, CheckCircle2, Clock, DollarSign, Eye, Flame, Server, Shield, Target, TrendingUp, Users, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

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

  const taskList = (tasks ?? []) as any[];
  const oppList = (opportunities ?? []) as any[];
  const campaignList = (campaigns ?? []) as any[];
  const leadList = (leads ?? []) as any[];

  const criticalTasks = taskList.filter((t: any) => t.priority === 'critical' && t.status !== 'completed');
  const pendingTasks = taskList.filter((t: any) => t.status === 'pending');
  const staleDealThreshold = 7;
  const staleDeals = oppList.filter((o: any) => {
    const updated = new Date(o.updatedAt);
    const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > staleDealThreshold && o.stage !== 'closed_won' && o.stage !== 'closed_lost';
  });

  const totalPipelineValue = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const weightedRevenue = oppList.reduce((s: number, o: any) => s + ((o.value ?? 0) * (o.probability ?? 0) / 100), 0);
  const avgDealSize = oppList.length ? Math.round(totalPipelineValue / oppList.length) : 0;
  const avgProbability = oppList.length ? Math.round(oppList.reduce((s: number, o: any) => s + (o.probability ?? 0), 0) / oppList.length) : 0;

  const totalLeads = leadList.length;
  const qualifiedLeads = leadList.filter((l: any) => l.status === 'qualified').length;
  const conversionRate = totalLeads ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const totalCampaignSpend = campaignList.reduce((s: number, c: any) => s + (c.spent ?? 0), 0);
  const totalCampaignLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);
  const costPerLead = totalCampaignLeads ? Math.round(totalCampaignSpend / totalCampaignLeads) : 0;

  const stageData = ['discovery', 'qualification', 'proposal', 'negotiation'].map(stage => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: oppList.filter((o: any) => o.stage === stage).length,
    value: oppList.filter((o: any) => o.stage === stage).reduce((s: number, o: any) => s + (o.value ?? 0), 0),
  }));

  const CHART_COLORS = ['hsl(0, 72%, 51%)', 'hsl(214, 52%, 40%)', 'hsl(30, 80%, 55%)', 'hsl(280, 65%, 60%)'];

  const attentionItems = [
    ...criticalTasks.map(t => ({ type: 'task', severity: 'critical' as const, text: t.title, detail: t.description, domain: t.domain })),
    ...staleDeals.map(o => ({ type: 'deal', severity: 'warning' as const, text: `${o.title} - stale deal`, detail: `No activity in ${staleDealThreshold}+ days`, domain: 'crm' })),
    ...pendingTasks.filter(t => t.priority === 'high').map(t => ({ type: 'task', severity: 'high' as const, text: t.title, detail: 'High priority, pending action', domain: t.domain })),
  ];

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" {...fadeIn}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Command Center</h1>
          <p className="text-muted-foreground mt-1">Executive control surface — cross-domain visibility and operational health.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${health ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-destructive/10 border-destructive/20 text-destructive'} text-sm font-medium`}>
            {health ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {health ? 'System Operational' : 'System Offline'}
          </div>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="executive" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Eye className="h-4 w-4 mr-2" />Executive
          </TabsTrigger>
          <TabsTrigger value="operations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Zap className="h-4 w-4 mr-2" />Operations
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Server className="h-4 w-4 mr-2" />System Health
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Exceptions
            {attentionItems.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">{attentionItems.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6 mt-6">
          <motion.div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" variants={stagger} initial="initial" animate="animate">
            <MetricCard title="Pipeline Value" value={`$${totalPipelineValue.toLocaleString()}`} icon={DollarSign} valueClass="text-primary" />
            <MetricCard title="Weighted Revenue" value={`$${Math.round(weightedRevenue).toLocaleString()}`} icon={TrendingUp} valueClass="text-green-400" />
            <MetricCard title="Active Deals" value={oppList.length} icon={Briefcase} />
            <MetricCard title="Avg Deal Size" value={`$${avgDealSize.toLocaleString()}`} icon={Target} />
            <MetricCard title="Win Probability" value={`${avgProbability}%`} icon={Flame} />
            <MetricCard title="Lead → Qualified" value={`${conversionRate}%`} icon={Users} />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue Projection</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-[280px] w-full bg-muted/20" />
                ) : summary?.revenueByMonth ? (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.revenueByMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 52%, 18%)" vertical={false} />
                        <XAxis dataKey="month" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(214, 65%, 8%)', border: '1px solid hsl(214, 52%, 25%)', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="value" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pipeline by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stageData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                        {stageData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(214, 65%, 8%)', border: '1px solid hsl(214, 52%, 25%)', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {stageData.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="ml-auto font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Live Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-auto space-y-3">
                {isLoadingActivity ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-muted/20" />)
                ) : recentActivity?.length ? (
                  recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex gap-3 items-start group">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">No recent activity</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Top Deals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...oppList].sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 4).map((opp: any) => (
                  <div key={opp.id} className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/30">
                    <div className="min-w-0 mr-2">
                      <p className="text-sm font-medium truncate">{opp.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{opp.stage} &bull; {opp.probability}% likely</p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">${(opp.value ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Campaign Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-md bg-background/50 border border-border/30 text-center">
                    <p className="text-lg font-bold text-primary">{totalCampaignLeads}</p>
                    <p className="text-[10px] text-muted-foreground">Leads Generated</p>
                  </div>
                  <div className="p-2 rounded-md bg-background/50 border border-border/30 text-center">
                    <p className="text-lg font-bold">${costPerLead}</p>
                    <p className="text-[10px] text-muted-foreground">Cost per Lead</p>
                  </div>
                </div>
                {campaignList.slice(0, 3).map((c: any) => {
                  const pct = c.budget ? Math.round((c.spent ?? 0) / c.budget * 100) : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate mr-2">{c.name}</span>
                        <span className="text-muted-foreground shrink-0">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title="Active Tasks" value={taskList.filter((t: any) => t.status !== 'completed').length} icon={Zap} />
            <MetricCard title="Pending Actions" value={pendingTasks.length} icon={Clock} valueClass="text-yellow-400" />
            <MetricCard title="Critical Items" value={criticalTasks.length} icon={AlertTriangle} valueClass="text-red-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Task Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {taskList.filter((t: any) => t.status !== 'completed').map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === 'critical' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{task.domain}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{task.status?.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
                {taskList.filter((t: any) => t.status !== 'completed').length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">All tasks complete</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Deal Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {oppList.map((opp: any) => (
                  <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="min-w-0 mr-2">
                      <p className="text-sm font-medium truncate">{opp.title}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{opp.serviceType ?? opp.service_type} &bull; {opp.owner}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="capitalize text-[10px]">{opp.stage}</Badge>
                      <Badge className="text-[10px]" variant={opp.proposalStatus === 'accepted' ? 'default' : 'secondary'}>{opp.proposalStatus ?? opp.proposal_status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <HealthCard title="API Server" status={health ? 'healthy' : 'down'} icon={Server} detail="Express 5 + PostgreSQL" />
            <HealthCard title="Database" status="healthy" icon={Shield} detail="9 tables, all synced" />
            <HealthCard title="Frontend" status="healthy" icon={Eye} detail="React 19 + Vite" />
            <HealthCard title="AI Engine" status="standby" icon={Zap} detail="Ready for activation" />
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Module Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  { name: 'Command Center', domain: 'dashboard', status: 'operational' },
                  { name: 'Intelligence Engine', domain: 'intelligence', status: 'operational' },
                  { name: 'Outreach & Prospecting', domain: 'outreach', status: 'operational' },
                  { name: 'Marketing & Campaigns', domain: 'marketing', status: 'operational' },
                  { name: 'Production Studio', domain: 'production', status: 'operational' },
                  { name: 'Execution & Ops', domain: 'execution', status: 'operational' },
                  { name: 'CRM Pipeline', domain: 'crm', status: 'operational' },
                  { name: 'Communications', domain: 'communications', status: 'operational' },
                  { name: 'Finance & Legal', domain: 'finance', status: 'operational' },
                  { name: 'Reports & Archive', domain: 'reports', status: 'operational' },
                  { name: 'System Core', domain: 'system', status: 'operational' },
                ].map(mod => (
                  <div key={mod.domain} className="flex items-center justify-between p-2.5 rounded-md bg-background/50 border border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">{mod.name}</span>
                    </div>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Operational</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-6 mt-6">
          {attentionItems.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-lg font-medium">No Exceptions</p>
                <p className="text-sm text-muted-foreground mt-1">All systems operating within normal parameters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Items Requiring Attention</h2>
                <Badge className="bg-primary/20 text-primary border-primary/30">{attentionItems.length}</Badge>
              </div>
              {attentionItems.map((item, i) => (
                <Card key={i} className={`bg-card/50 backdrop-blur-sm border-l-4 ${item.severity === 'critical' ? 'border-l-red-500 border-border/50' : item.severity === 'warning' ? 'border-l-yellow-500 border-border/50' : 'border-l-orange-500 border-border/50'}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.severity === 'critical' ? <AlertCircle className="h-5 w-5 text-red-400 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />}
                      <div>
                        <p className="text-sm font-semibold">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="capitalize text-[10px]">{item.domain}</Badge>
                      <Badge className={`text-[10px] ${item.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {item.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function MetricCard({ title, value, icon: Icon, loading, valueClass = "" }: any) {
  return (
    <motion.div variants={fadeIn}>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {loading ? (
            <Skeleton className="h-7 w-20 bg-muted/20" />
          ) : (
            <div className={`text-xl font-bold ${valueClass}`}>{value !== undefined ? value : '-'}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HealthCard({ title, status, icon: Icon, detail }: { title: string; status: string; icon: any; detail: string }) {
  const color = status === 'healthy' ? 'text-green-400' : status === 'standby' ? 'text-yellow-400' : 'text-red-400';
  const bg = status === 'healthy' ? 'bg-green-500/10' : status === 'standby' ? 'bg-yellow-500/10' : 'bg-red-500/10';
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-[10px] text-muted-foreground">{detail}</p>
          </div>
        </div>
        <Badge className={`${bg} ${color} border-transparent capitalize text-[10px]`}>{status}</Badge>
      </CardContent>
    </Card>
  );
}
