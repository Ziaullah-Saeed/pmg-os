import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { ModeIndicatorBanner } from "@/components/mode-aware-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useFullAgents, useAgentStats, useOrchestrationStats, useOrchestrationCompleted,
  useOrchestrationActive, useExecuteAgent, useUpdateAgentStatus
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Activity, Cpu, Zap, Shield, Target, Brain, Clock, Wallet,
  ChevronRight, Play, Pause, RefreshCw, AlertTriangle, CheckCircle2,
  TrendingUp, Layers, GitBranch, Archive, Eye
} from "lucide-react";

const domainColors: Record<string, string> = {
  command_center: "text-crimson",
  intelligence: "text-purple-400",
  outreach: "text-blue-400",
  marketing: "text-emerald-400",
  production: "text-orange-400",
  execution: "text-cyan-400",
  crm: "text-amber-400",
  communications: "text-sky-400",
  finance_legal: "text-green-400",
  reports: "text-indigo-400",
  system: "text-red-400",
};

const domainIcons: Record<string, any> = {
  command_center: Shield,
  intelligence: Brain,
  outreach: Target,
  marketing: TrendingUp,
  production: Layers,
  execution: Zap,
  crm: GitBranch,
  communications: Activity,
  finance_legal: Wallet,
  reports: Archive,
  system: Cpu,
};

const domainLabels: Record<string, string> = {
  command_center: "Command Center",
  intelligence: "Intelligence",
  outreach: "Outreach",
  marketing: "Marketing",
  production: "Production",
  execution: "Execution",
  crm: "CRM & Sales",
  communications: "Communications",
  finance_legal: "Finance & Legal",
  reports: "Reports",
  system: "System",
};

const triggerLabels: Record<string, string> = {
  event: "Event-Driven",
  schedule: "Scheduled",
  manual: "Manual",
  threshold: "Threshold",
  chain: "Chain",
};

const tabs = [
  { id: "overview", label: "Agent Overview", icon: <Bot className="h-3.5 w-3.5" /> },
  { id: "orchestration", label: "Orchestration", icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: "domain-view", label: "Domain View", icon: <Layers className="h-3.5 w-3.5" /> },
  { id: "execution-log", label: "Execution Log", icon: <Activity className="h-3.5 w-3.5" /> },
];

export default function Agents() {
  const [tab, setTab] = useState("overview");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState("all");
  const { data: agents } = useFullAgents();
  const { data: stats } = useAgentStats();
  const { data: orchStats } = useOrchestrationStats();
  const { data: completedTasks } = useOrchestrationCompleted(30);
  const { data: activeTasks } = useOrchestrationActive();
  const executeAgent = useExecuteAgent();
  const updateStatus = useUpdateAgentStatus();
  const { toast } = useToast();

  const filteredAgents = agents?.filter((a: any) => domainFilter === "all" || a.domain === domainFilter) ?? [];
  const selected = agents?.find((a: any) => a.id === selectedAgent);

  const handleExecute = (agentId: string) => {
    executeAgent.mutate({ id: agentId }, {
      onSuccess: (data: any) => {
        toast({ title: "Agent Executed", description: `Confidence: ${data.confidence}% via ${data.provider ?? "tool"}` });
      },
      onError: (err: any) => {
        toast({ title: "Execution Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleToggle = (agentId: string, current: string) => {
    const next = current === "paused" ? "idle" : "paused";
    updateStatus.mutate({ id: agentId, status: next });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Agent Orchestration"
        subtitle={`112-Agent System with Real Tool Execution Pipeline — ${stats?.total ?? 0} Agents`}
        icon={<Bot className="h-5 w-5" />}
      />
      <ModeIndicatorBanner />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Agents" value={stats?.total ?? 0} icon={<Bot className="h-4 w-4" />} accent="crimson" />
          <KpiCard label="Active Now" value={agents?.filter((a: any) => a.status === "running").length ?? 0} icon={<Activity className="h-4 w-4" />} accent="success" />
          <KpiCard label="Success Rate" value={`${stats?.avgSuccessRate ?? 0}%`} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
          <KpiCard label="Orchestrations" value={orchStats?.totalExecutions ?? 0} icon={<Cpu className="h-4 w-4" />} accent="blue" />
          <KpiCard label="Avg Confidence" value={`${orchStats?.avgConfidence ?? 0}%`} icon={<Brain className="h-4 w-4" />} accent="gold" />
          <KpiCard label="Total Cost" value={`$${orchStats?.totalCost?.toFixed(2) ?? "0.00"}`} icon={<Wallet className="h-4 w-4" />} />
        </div>

        <PremiumTabs tabs={tabs} activeTab={tab} onTabChange={setTab} />

        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Select value={domainFilter} onValueChange={setDomainFilter}>
                  <SelectTrigger className="w-[200px] bg-card border-border/50">
                    <SelectValue placeholder="All Domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    {Object.entries(domainLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">{filteredAgents.length} agents</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAgents.map((agent: any) => {
                  const DomainIcon = domainIcons[agent.domain] ?? Bot;
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`cursor-pointer ${selectedAgent === agent.id ? "ring-1 ring-crimson/50" : ""}`}
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <GlassCard className="p-3 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DomainIcon className={`h-4 w-4 ${domainColors[agent.domain] ?? "text-muted-foreground"}`} />
                            <span className="text-sm font-medium truncate max-w-[180px]">{agent.name}</span>
                          </div>
                          <StatusBadge variant={agent.status === "idle" ? "active" : agent.status === "running" ? "warning" : agent.status === "paused" ? "inactive" : "critical"} label={agent.status} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{agent.purpose ?? agent.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {agent.trigger && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {triggerLabels[agent.trigger?.type] ?? agent.trigger?.type}
                              </Badge>
                            )}
                            <span className="text-muted-foreground">{agent.totalRuns} runs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">{agent.successRate}%</span>
                            {agent.confidenceModel && (
                              <span className={`text-[10px] ${agent.confidenceModel.method === "ai_scored" ? "text-purple-400" : agent.confidenceModel.method === "hybrid" ? "text-amber-400" : "text-blue-400"}`}>
                                {agent.confidenceModel.method === "ai_scored" ? "AI" : agent.confidenceModel.method === "hybrid" ? "HYB" : "RUL"}
                              </span>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {selected ? (
                <GlassCard className="p-4">
                  <h3 className="text-sm font-semibold mb-1">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{selected.purpose ?? selected.description}</p>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Trigger</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {triggerLabels[selected.trigger?.type] ?? "Manual"}
                        </Badge>
                        {selected.trigger?.schedule && (
                          <span className="text-xs text-muted-foreground">{selected.trigger.schedule}</span>
                        )}
                        {selected.trigger?.event && (
                          <span className="text-xs text-muted-foreground">{selected.trigger.event}</span>
                        )}
                      </div>
                    </div>

                    {selected.toolAccess && (
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Tool Access</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.toolAccess.map((t: string) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selected.confidenceModel && (
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Confidence Model</span>
                        <div className="mt-1 space-y-1">
                          <ConfidenceMeter score={selected.confidenceModel.autoApproveAbove} size="sm" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Min: {selected.confidenceModel.minConfidence}%</span>
                            <span>Escalate: &lt;{selected.confidenceModel.escalateBelow}%</span>
                            <span>Auto: &gt;{selected.confidenceModel.autoApproveAbove}%</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{selected.confidenceModel.method}</Badge>
                        </div>
                      </div>
                    )}

                    {selected.walletBehavior && (
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Wallet</span>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <Wallet className="h-3 w-3 text-amber-400" />
                          <span>Max ${selected.walletBehavior.maxChargePerRun}/run</span>
                          <Badge variant="outline" className="text-[10px]">{selected.walletBehavior.budgetPool}</Badge>
                        </div>
                      </div>
                    )}

                    {selected.fallbackBehavior && (
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Fallback</span>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <RefreshCw className="h-3 w-3 text-blue-400" />
                          <span>{selected.fallbackBehavior.strategy}</span>
                          <span className="text-muted-foreground">({selected.fallbackBehavior.maxRetries} retries)</span>
                        </div>
                      </div>
                    )}

                    {selected.archiveBehavior && (
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Archive</span>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <Archive className="h-3 w-3 text-indigo-400" />
                          <span>{selected.archiveBehavior.autoArchive ? "Auto" : "Manual"}</span>
                          <span className="text-muted-foreground">{selected.archiveBehavior.retentionDays}d</span>
                          <Badge variant="outline" className="text-[10px]">{selected.archiveBehavior.archiveCategory}</Badge>
                        </div>
                      </div>
                    )}

                    {selected.outputStructure && (
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Output</span>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span>Format: {selected.outputStructure.format}</span>
                          <span className="text-muted-foreground">Fields: {selected.outputStructure.requiredFields?.join(", ")}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1 bg-crimson hover:bg-crimson/80" onClick={() => handleExecute(selected.id)} disabled={executeAgent.isPending}>
                        <Play className="h-3 w-3 mr-1" /> Execute
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggle(selected.id, selected.status)}>
                        {selected.status === "paused" ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground pt-1">
                      <div className="flex justify-between">
                        <span>Runs: {selected.totalRuns}</span>
                        <span>Rate: {selected.successRate}%</span>
                        <span>Avg: {selected.avgDuration ? `${(selected.avgDuration / 1000).toFixed(1)}s` : "—"}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-4 text-center text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Select an agent to view details</p>
                </GlassCard>
              )}

              <GlassCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">Domain Distribution</h3>
                <div className="space-y-2">
                  {stats?.domainCounts && Object.entries(stats.domainCounts).map(([domain, count]: [string, any]) => {
                    const DIcon = domainIcons[domain] ?? Bot;
                    return (
                      <div key={domain} className="flex items-center justify-between text-xs cursor-pointer hover:bg-white/[0.03] p-1 rounded" onClick={() => setDomainFilter(domain)}>
                        <div className="flex items-center gap-2">
                          <DIcon className={`h-3 w-3 ${domainColors[domain] ?? ""}`} />
                          <span>{domainLabels[domain] ?? domain}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {tab === "orchestration" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Tasks" value={orchStats?.active ?? 0} icon={<Activity className="h-4 w-4" />} accent="gold" />
              <KpiCard label="Completed" value={orchStats?.completed ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
              <KpiCard label="Failed" value={orchStats?.failed ?? 0} icon={<AlertTriangle className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Fallbacks Used" value={orchStats?.totalFallbacks ?? 0} icon={<RefreshCw className="h-4 w-4" />} accent="blue" />
            </div>

            {orchStats?.providerUsage && Object.keys(orchStats.providerUsage).length > 0 && (
              <GlassCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">Provider Usage</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(orchStats.providerUsage).map(([provider, count]: [string, any]) => (
                    <div key={provider} className="bg-white/[0.03] rounded-lg p-3">
                      <span className="text-xs text-muted-foreground">{provider}</span>
                      <div className="text-lg font-semibold">{count}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {(activeTasks?.length ?? 0) > 0 && (
              <GlassCard className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400 animate-pulse" />
                  Active Pipeline Tasks
                </h3>
                <div className="space-y-3">
                  {activeTasks?.map((task: any) => (
                    <div key={task.id} className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{task.agentId} — {task.taskType}</span>
                        <Badge variant="outline" className="text-[10px]">{task.status}</Badge>
                      </div>
                      <div className="flex gap-1">
                        {task.pipelineSteps?.map((step: any, i: number) => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full ${step.status === "completed" ? "bg-emerald-500" : step.status === "running" ? "bg-amber-500 animate-pulse" : step.status === "failed" ? "bg-red-500" : "bg-white/10"}`} title={`${step.name}: ${step.status}`} />
                        ))}
                      </div>
                      <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                        {task.pipelineSteps?.map((step: any, i: number) => (
                          <span key={i} className="flex-1 text-center truncate">{step.name.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-3">Pipeline Architecture</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {["Provider Selection", "Wallet Charge", "Execution", "Result Processing", "Confidence Check", "Archive", "Audit Log", "Reporting"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="bg-white/[0.05] border border-border/30 rounded-lg px-3 py-2 text-xs whitespace-nowrap">
                      <div className="text-[10px] text-muted-foreground mb-0.5">Step {i + 1}</div>
                      {step}
                    </div>
                    {i < 7 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {tab === "domain-view" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(domainLabels).map(([domain, label]) => {
              const domainAgents = agents?.filter((a: any) => a.domain === domain) ?? [];
              const DIcon = domainIcons[domain] ?? Bot;
              const running = domainAgents.filter((a: any) => a.status === "running").length;
              const paused = domainAgents.filter((a: any) => a.status === "paused").length;
              const avgRate = domainAgents.length > 0 ? Math.round(domainAgents.reduce((s: number, a: any) => s + a.successRate, 0) / domainAgents.length) : 0;

              return (
                <GlassCard key={domain} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DIcon className={`h-4 w-4 ${domainColors[domain]}`} />
                      <span className="text-sm font-semibold">{label}</span>
                    </div>
                    <Badge variant="outline">{domainAgents.length}</Badge>
                  </div>
                  <div className="flex gap-3 text-xs mb-3">
                    <span className="text-emerald-400">{running} running</span>
                    <span className="text-amber-400">{paused} paused</span>
                    <span className="text-muted-foreground">{avgRate}% success</span>
                  </div>
                  <div className="space-y-1">
                    {domainAgents.slice(0, 5).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-xs py-0.5">
                        <span className="truncate max-w-[180px]">{a.name}</span>
                        <div className="flex items-center gap-1">
                          <div className={`h-1.5 w-1.5 rounded-full ${a.status === "running" ? "bg-amber-400 animate-pulse" : a.status === "paused" ? "bg-red-400" : "bg-emerald-400"}`} />
                          {a.trigger && (
                            <span className="text-[9px] text-muted-foreground">{triggerLabels[a.trigger?.type]?.[0] ?? ""}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {domainAgents.length > 5 && (
                      <span className="text-[10px] text-muted-foreground">+{domainAgents.length - 5} more</span>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {tab === "execution-log" && (
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Orchestrated Executions</h3>
            {(!completedTasks || completedTasks.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">No orchestration executions yet. Execute an agent to see results here.</p>
            ) : (
              <div className="space-y-2">
                {completedTasks.map((task: any) => (
                  <div key={task.id} className="bg-white/[0.03] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{task.agentId}</span>
                        <Badge variant="outline" className="text-[10px]">{task.taskType}</Badge>
                      </div>
                      <StatusBadge variant={task.status === "completed" ? "success" : task.status === "failed" ? "critical" : "warning"} label={task.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {task.result && (
                        <>
                          <span>Provider: {task.result.provider}</span>
                          <span>Confidence: {task.result.confidence}%</span>
                          <span>Cost: ${task.result.totalCost?.toFixed(3)}</span>
                          <span>Duration: {(task.result.totalDurationMs / 1000).toFixed(1)}s</span>
                          {task.result.fallbacksUsed > 0 && (
                            <span className="text-amber-400">{task.result.fallbacksUsed} fallback(s)</span>
                          )}
                        </>
                      )}
                      {task.error && <span className="text-red-400">{task.error}</span>}
                    </div>
                    {task.pipelineSteps && (
                      <div className="flex gap-0.5 mt-2">
                        {task.pipelineSteps.map((step: any, i: number) => (
                          <div key={i} className={`flex-1 h-1 rounded-full ${step.status === "completed" ? "bg-emerald-500" : step.status === "failed" ? "bg-red-500" : "bg-white/10"}`} title={step.name} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
