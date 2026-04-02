import { useState } from "react";
import { useListTasks } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useUpdateTaskMut, useAgents, useAgentStats, useRunAgent, useUpdateAgentStatus, useAiRuns, usePendingActions, useApprovePendingAction, useRejectPendingAction } from "@/hooks/use-api";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import { CreateTaskForm } from "@/components/forms/create-task-form";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, CheckCircle2, Clock, AlertTriangle, Plus, LayoutGrid,
  List, ArrowRight, Shield, Bot, Sparkles, FileText, Eye,
  Play, Pause, Activity, XCircle, ThumbsUp, ThumbsDown, BarChart3
} from "lucide-react";

const statuses = ["pending", "in_progress", "completed", "blocked"] as const;
const statusLabels: Record<string, string> = { pending: "Pending", in_progress: "In Progress", completed: "Completed", blocked: "Blocked" };

const tabs = [
  { id: "kanban", label: "Kanban", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { id: "list", label: "List View", icon: <List className="h-3.5 w-3.5" /> },
  { id: "agents", label: "AI Agents", icon: <Bot className="h-3.5 w-3.5" /> },
  { id: "pending", label: "Pending Actions", icon: <Clock className="h-3.5 w-3.5" /> },
  { id: "runs", label: "AI Run History", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "approvals", label: "Approvals", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { id: "workflows", label: "Workflow Automation", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "escalation", label: "Escalation & Failures", icon: <Shield className="h-3.5 w-3.5" /> },
];

const domainColors: Record<string, string> = {
  crm: "text-blue-400", marketing: "text-purple-400", production: "text-amber-400",
  communications: "text-cyan-400", intelligence: "text-emerald-400", finance: "text-green-400",
  outreach: "text-orange-400", execution: "text-indigo-400", reports: "text-pink-400",
  system: "text-slate-400", legal: "text-rose-400",
};

export default function Execution() {
  const [activeTab, setActiveTab] = useState("kanban");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [agentDomainFilter, setAgentDomainFilter] = useState("all");
  const { data: tasks } = useListTasks();
  const { isHuman } = useAiModeContext();
  const updateTask = useUpdateTaskMut();
  const { data: agents } = useAgents();
  const { data: agentStatsData } = useAgentStats();
  const runAgent = useRunAgent();
  const updateAgentStatus = useUpdateAgentStatus();
  const { data: aiRuns } = useAiRuns(100);
  const { data: pendingActions } = usePendingActions();
  const approveAction = useApprovePendingAction();
  const rejectAction = useRejectPendingAction();
  const { toast } = useToast();

  const taskList = (tasks ?? []) as any[];
  const agentList = (agents ?? []) as any[];
  const aiRunList = (aiRuns ?? []) as any[];
  const pendingList = (pendingActions ?? []) as any[];
  const stats = agentStatsData as any;

  const total = taskList.length;
  const inProgress = taskList.filter((t: any) => t.status === "in_progress").length;
  const pending = taskList.filter((t: any) => t.status === "pending").length;
  const completed = taskList.filter((t: any) => t.status === "completed").length;
  const critical = taskList.filter((t: any) => t.priority === "critical" && t.status !== "completed").length;

  const filteredAgents = agentDomainFilter === "all" ? agentList : agentList.filter((a: any) => a.domain === agentDomainFilter);
  const agentDomains = [...new Set(agentList.map((a: any) => a.domain))];

  function handleTransition(task: any, newStatus: string) {
    updateTask.mutate({ id: task.id, data: { status: newStatus } }, {
      onSuccess: () => setSelectedTask(null),
    });
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Execution & Operations"
        subtitle="Task management, AI agents, pending actions, and operational monitoring"
        icon={<Zap className="h-5 w-5" />}
        actions={<Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateTask(true)}><Plus className="h-4 w-4 mr-2" />New Task</Button>}
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KpiCard label="Total Tasks" value={total} icon={<Zap className="h-4 w-4" />} />
        <KpiCard label="In Progress" value={inProgress} icon={<Clock className="h-4 w-4" />} accent="blue" />
        <KpiCard label="AI Agents" value={agentList.length} icon={<Bot className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Active Agents" value={agentList.filter((a: any) => a.status === "active").length} icon={<Activity className="h-4 w-4" />} accent="success" />
        <KpiCard label="Pending Actions" value={pendingList.length} icon={<Clock className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="AI Runs Today" value={aiRunList.filter((r: any) => r.createdAt && (Date.now() - new Date(r.createdAt).getTime()) < 86400000).length} icon={<Sparkles className="h-4 w-4" />} accent="blue" />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">
            {statuses.map((status) => {
              const statusTasks = taskList.filter((t: any) => t.status === status);
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <h3 className="kpi-label">{statusLabels[status]}</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full glass-surface font-medium">{statusTasks.length}</span>
                  </div>
                  {statusTasks.map((task: any) => (
                    <GlassCard key={task.id} variant="interactive" className="cursor-pointer !p-3" onClick={() => setSelectedTask(task)}>
                      <p className="text-sm font-medium leading-tight mb-1">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <StatusBadge variant={task.priority === "critical" ? "critical" : task.priority === "high" ? "warning" : "pending"} label={task.priority} />
                          <Badge variant="outline" className="text-[9px] capitalize">{task.domain}</Badge>
                        </div>
                        {(task.assignee || task.assignedTo || task.assigned_to) && <span className="text-[9px] text-muted-foreground">{task.assignee || task.assignedTo || task.assigned_to}</span>}
                      </div>
                    </GlassCard>
                  ))}
                  {statusTasks.length === 0 && (
                    <div className="p-6 border border-dashed border-border/30 rounded-lg text-center text-[10px] text-muted-foreground">No tasks</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "list" && (
          <div className="space-y-2">
            {taskList.map((task: any) => (
              <GlassCard key={task.id} variant="interactive" className="cursor-pointer !p-3" onClick={() => setSelectedTask(task)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === "completed" ? "bg-success" : task.status === "in_progress" ? "bg-info" : task.status === "blocked" ? "bg-crimson" : "bg-warning"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className="capitalize text-[10px]">{task.domain}</Badge>
                    <StatusBadge variant={task.priority === "critical" ? "critical" : "pending"} label={task.priority} />
                    <StatusBadge variant={task.status === "completed" ? "success" : task.status === "in_progress" ? "active" : "pending"} label={task.status?.replace("_", " ")} />
                  </div>
                </div>
              </GlassCard>
            ))}
            {taskList.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No tasks yet. Create one to get started.</div>}
          </div>
        )}

        {activeTab === "agents" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-info">{agentList.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Agents</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-success">{agentList.filter((a: any) => a.status === "active").length}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-warning">{agentList.filter((a: any) => a.status === "idle").length}</p>
                <p className="text-[10px] text-muted-foreground">Idle</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-crimson">{agentList.filter((a: any) => a.status === "paused" || a.status === "error").length}</p>
                <p className="text-[10px] text-muted-foreground">Paused/Error</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-purple-400">{agentDomains.length}</p>
                <p className="text-[10px] text-muted-foreground">Domains</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={agentDomainFilter === "all" ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setAgentDomainFilter("all")}>All Domains</Button>
              {agentDomains.map((d) => (
                <Button key={d} variant={agentDomainFilter === d ? "default" : "outline"} size="sm" className="text-xs h-7 capitalize" onClick={() => setAgentDomainFilter(d)}>{d}</Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAgents.map((agent: any) => (
                <GlassCard key={agent.id} className="!p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bot className={`h-4 w-4 shrink-0 ${domainColors[agent.domain] ?? "text-slate-400"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{agent.name}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{agent.domain} &bull; {agent.role ?? "agent"}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${agent.status === "active" ? "bg-green-400" : agent.status === "error" ? "bg-red-400" : agent.status === "paused" ? "bg-yellow-400" : "bg-slate-500"}`} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[8px] ${agent.status === "active" ? "text-green-400 border-green-500/30" : agent.status === "error" ? "text-red-400 border-red-500/30" : ""}`}>{agent.status}</Badge>
                      {agent.totalRuns > 0 && <span className="text-[9px] text-muted-foreground">{agent.totalRuns} runs</span>}
                      {agent.successRate !== undefined && <span className="text-[9px] text-muted-foreground">{Math.round(agent.successRate)}%</span>}
                    </div>
                    <div className="flex gap-1">
                      {agent.status === "active" ? (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "paused" })}>
                          <Pause className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => updateAgentStatus.mutate({ id: agent.id, status: "active" })}>
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => runAgent.mutate({ id: agent.id })} disabled={runAgent.isPending}>
                        <Zap className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {agent.lastRunAt && <p className="text-[8px] text-muted-foreground mt-1">Last run: {new Date(agent.lastRunAt).toLocaleString()}</p>}
                </GlassCard>
              ))}
            </div>
            {filteredAgents.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No agents found for this filter.</div>}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-warning">{pendingList.filter((a: any) => a.status === "pending").length}</p>
                <p className="text-[10px] text-muted-foreground">Awaiting Review</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-crimson">{pendingList.filter((a: any) => a.confidence && a.confidence < 50).length}</p>
                <p className="text-[10px] text-muted-foreground">Low Confidence</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-success">{pendingList.filter((a: any) => a.status === "approved").length}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-red-400">{pendingList.filter((a: any) => a.status === "rejected").length}</p>
                <p className="text-[10px] text-muted-foreground">Rejected</p>
              </div>
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-semibold">Pending Action Queue</h3>
                </div>
                <Badge variant="outline" className="text-[10px]">{pendingList.filter((a: any) => a.status === "pending").length} awaiting</Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {pendingList.filter((a: any) => a.status === "pending").length > 0 ? (
                  pendingList.filter((a: any) => a.status === "pending").map((action: any) => (
                    <div key={action.id} className="p-3 rounded-lg glass-surface">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg ${action.confidence && action.confidence < 50 ? "bg-red-500/10" : action.confidence < 80 ? "bg-yellow-500/10" : "bg-green-500/10"}`}>
                            <Bot className={`h-4 w-4 ${action.confidence && action.confidence < 50 ? "text-red-400" : action.confidence < 80 ? "text-yellow-400" : "text-green-400"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{action.action ?? action.description ?? "Pending action"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[9px] capitalize">{action.domain ?? "system"}</Badge>
                              <Badge variant="outline" className="text-[9px] capitalize">{action.workflowKey ?? action.workflow ?? ""}</Badge>
                              {action.confidence !== undefined && (
                                <span className={`text-[9px] font-medium ${action.confidence >= 80 ? "text-green-400" : action.confidence >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                  {Math.round(action.confidence)}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0 ml-3">
                          <Button
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg h-7"
                            onClick={() => rejectAction.mutate({ id: action.id, reason: "Rejected via pending queue" }, {
                              onSuccess: () => toast({ title: "Action rejected" }),
                            })}
                            disabled={rejectAction.isPending}
                          >
                            <ThumbsDown className="h-3 w-3 mr-1" />Reject
                          </Button>
                          <Button
                            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-lg h-7"
                            onClick={() => approveAction.mutate(action.id, {
                              onSuccess: () => toast({ title: "Action approved" }),
                            })}
                            disabled={approveAction.isPending}
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />Approve
                          </Button>
                        </div>
                      </div>
                      {action.suggestedOutput && (
                        <div className="mt-2 p-2 rounded bg-white/[0.02] border border-white/5">
                          <p className="text-[10px] text-muted-foreground font-medium mb-1">AI Suggested Output:</p>
                          <p className="text-xs text-foreground/80 line-clamp-3">{typeof action.suggestedOutput === "string" ? action.suggestedOutput : JSON.stringify(action.suggestedOutput)}</p>
                        </div>
                      )}
                      <p className="text-[8px] text-muted-foreground mt-1">{action.createdAt ? new Date(action.createdAt).toLocaleString() : ""}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-success/50" />
                    <p className="text-sm text-muted-foreground">No pending actions — all clear</p>
                    <p className="text-[10px] text-muted-foreground">Actions appear here when AI confidence is below threshold in Hybrid mode</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "runs" && (
          <div className="space-y-4">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">AI Run History</h3>
                </div>
                <Badge variant="outline" className="text-[10px]">{aiRunList.length} total runs</Badge>
              </div>
              <div className="px-5 pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground uppercase tracking-wider text-[10px]">
                      <th className="text-left py-2 px-2">Tool</th>
                      <th className="text-left py-2 px-2">Domain</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Confidence</th>
                      <th className="text-left py-2 px-2">Duration</th>
                      <th className="text-left py-2 px-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiRunList.slice(0, 50).map((run: any, i: number) => (
                      <tr key={run.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 px-2 font-medium capitalize">{(run.runType ?? "").replace(/_/g, " ")}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-[8px] capitalize">{run.domain}</Badge></td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${run.status === "completed" ? "bg-green-400" : run.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                            <span className="capitalize">{run.status}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          {run.confidenceScore !== undefined && run.confidenceScore !== null ? (
                            <span className={`font-medium ${run.confidenceScore >= 80 ? "text-green-400" : run.confidenceScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              {Math.round(run.confidenceScore)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2 px-2 tabular-nums text-muted-foreground">{run.durationMs ? `${run.durationMs}ms` : "—"}</td>
                        <td className="py-2 px-2 text-muted-foreground">{run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {aiRunList.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No AI runs yet. Trigger AI operations to see history here.</p>}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-warning">{taskList.filter((t: any) => t.status === "pending" && (t.priority === "critical" || t.priority === "high")).length}</p>
                <p className="text-[10px] text-muted-foreground">Pending Approval</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-crimson">{taskList.filter((t: any) => t.priority === "critical" && t.status === "pending").length}</p>
                <p className="text-[10px] text-muted-foreground">Urgent</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-success">{taskList.filter((t: any) => t.status === "completed" && t.updatedAt && (Date.now() - new Date(t.updatedAt).getTime()) < 86400000).length}</p>
                <p className="text-[10px] text-muted-foreground">Approved Today</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-info">{taskList.filter((t: any) => t.status === "blocked").length}</p>
                <p className="text-[10px] text-muted-foreground">Escalated</p>
              </div>
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Pending Approvals Queue</h3>
                <Badge variant="outline" className="text-[10px]">Sorted by Urgency</Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {taskList.filter((t: any) => t.status === "pending" && (t.priority === "critical" || t.priority === "high")).length > 0 ? (
                  taskList
                    .filter((t: any) => t.status === "pending" && (t.priority === "critical" || t.priority === "high"))
                    .sort((a: any, b: any) => {
                      const rank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                      return (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4);
                    })
                    .map((task: any) => (
                      <div key={task.id} className="p-3 rounded-lg glass-surface">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg ${task.priority === "critical" ? "bg-red-500/10" : "bg-yellow-500/10"}`}>
                              {task.priority === "critical" ? <AlertTriangle className="h-4 w-4 text-red-400" /> : <Clock className="h-4 w-4 text-yellow-400" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{task.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[9px] capitalize">{task.domain}</Badge>
                                <StatusBadge variant={task.priority === "critical" ? "critical" : "warning"} label={task.priority} />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0 ml-3">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedTask(task)}><Eye className="h-3 w-3 mr-1" />Review</Button>
                            <Button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg h-7" onClick={() => handleTransition(task, "blocked")}>Reject</Button>
                            <Button className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-lg h-7" onClick={() => handleTransition(task, "in_progress")}>Approve</Button>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-success/50" />
                    <p className="text-sm text-muted-foreground">All approvals are up to date</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}
        {activeTab === "workflows" && (
          <div className="space-y-6">
            <GlassCard glow="blue" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">Workflow Automation Rules</h3>
                </div>
                <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="h-3 w-3 mr-1" />New Workflow</Button>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { name: "Lead → CRM Pipeline", trigger: "New lead fit score ≥ 80%", actions: ["Create CRM opportunity", "Assign sales rep", "Send Slack notification"], runs: 47, success: 98, status: "active" },
                  { name: "Invoice Overdue Alert", trigger: "Invoice unpaid > 30 days", actions: ["Send reminder email", "Flag in finance dashboard", "Create follow-up task"], runs: 12, success: 100, status: "active" },
                  { name: "Campaign Performance Check", trigger: "Campaign spend > $500 with < 2% CTR", actions: ["Pause campaign", "Generate report", "Notify marketing team"], runs: 8, success: 87, status: "active" },
                  { name: "Security Incident Escalation", trigger: "Critical vulnerability detected", actions: ["Create incident ticket", "Page on-call team", "Lock affected systems"], runs: 3, success: 100, status: "active" },
                  { name: "Client Onboarding Checklist", trigger: "New contract signed", actions: ["Create onboarding tasks", "Send welcome kit", "Schedule kickoff meeting"], runs: 15, success: 93, status: "active" },
                  { name: "Content Publishing Pipeline", trigger: "Content approved in production", actions: ["Schedule social posts", "Update website", "Track engagement"], runs: 22, success: 95, status: "paused" },
                ].map((wf, i) => (
                  <div key={i} className="p-3 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${wf.status === "active" ? "bg-success" : "bg-warning"}`} />
                        <p className="text-sm font-semibold">{wf.name}</p>
                      </div>
                      <StatusBadge variant={wf.status === "active" ? "active" : "pending"} label={wf.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">Trigger: {wf.trigger}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {wf.actions.map((a, j) => (
                        <Badge key={j} variant="outline" className="text-[9px]">{j + 1}. {a}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span>{wf.runs} runs</span>
                      <span className="text-success">{wf.success}% success</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard className="text-center">
                <p className="text-2xl font-bold gradient-text-crimson">6</p>
                <p className="text-[10px] text-muted-foreground">Active Workflows</p>
              </GlassCard>
              <GlassCard className="text-center">
                <p className="text-2xl font-bold text-success">107</p>
                <p className="text-[10px] text-muted-foreground">Total Executions</p>
              </GlassCard>
              <GlassCard className="text-center">
                <p className="text-2xl font-bold text-info">96%</p>
                <p className="text-[10px] text-muted-foreground">Avg Success Rate</p>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === "escalation" && (
          <div className="space-y-6">
            <GlassCard glow="crimson" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Escalation Routing</h3>
                </div>
                <Badge variant="outline" className="text-[10px] border-crimson/30 text-crimson">{taskList.filter((t: any) => t.status === "blocked").length} Active Escalations</Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {taskList.filter((t: any) => t.status === "blocked").length > 0 ? (
                  taskList.filter((t: any) => t.status === "blocked").map((task: any) => (
                    <div key={task.id} className="p-3 rounded-lg border border-crimson/20 bg-crimson/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-crimson" />
                          <p className="text-sm font-medium">{task.title}</p>
                        </div>
                        <StatusBadge variant="critical" label="Blocked" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] capitalize">{task.domain}</Badge>
                        <Badge variant="outline" className="text-[9px]">{task.priority}</Badge>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg" onClick={() => setSelectedTask(task)}>Review</Button>
                        <Button className="bg-success/20 hover:bg-success/30 text-success text-xs px-2 py-1 rounded-lg" onClick={() => handleTransition(task, "in_progress")}>Unblock</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-success/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No active escalations</p>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Failure Handling & Retries</h3></div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { action: "Email Delivery — Invoice #1042", type: "Communication", attempts: 3, lastAttempt: "2 hours ago", status: "retrying", resolution: "Auto-retry scheduled" },
                  { action: "AI Report Generation — Weekly CRM", type: "Report", attempts: 2, lastAttempt: "4 hours ago", status: "failed", resolution: "API rate limit — retry in 1hr" },
                  { action: "GHL Sync — Contact Update", type: "Integration", attempts: 1, lastAttempt: "30 min ago", status: "retrying", resolution: "Connection timeout — retrying" },
                ].map((failure, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{failure.action}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{failure.type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{failure.attempts} attempts · {failure.lastAttempt}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{failure.resolution}</p>
                    </div>
                    <StatusBadge variant={failure.status === "failed" ? "critical" : "warning"} label={failure.status} />
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Escalation Rules</h3></div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { rule: "Task blocked > 24 hours", action: "Notify domain lead + CEO", tier: "L2" },
                  { rule: "AI failure > 3 retries", action: "Switch to human mode + create incident", tier: "L3" },
                  { rule: "Critical task unassigned > 1 hour", action: "Auto-assign to available agent", tier: "L1" },
                  { rule: "Client-facing deadline < 48 hours", action: "Priority escalation to all leads", tier: "L2" },
                  { rule: "Wallet balance < $10", action: "Pause AI operations + alert admin", tier: "L3" },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[9px] ${rule.tier === "L3" ? "border-crimson/30 text-crimson" : rule.tier === "L2" ? "border-warning/30 text-warning" : "border-info/30 text-info"}`}>{rule.tier}</Badge>
                      <div>
                        <p className="text-xs font-medium">{rule.rule}</p>
                        <p className="text-[10px] text-muted-foreground">{rule.action}</p>
                      </div>
                    </div>
                    <StatusBadge variant="active" label="Active" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>

      <DetailDrawer open={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title} subtitle={selectedTask?.domain}>
        {selectedTask && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center">
                <StatusBadge variant={selectedTask.priority === "critical" ? "critical" : "warning"} label={selectedTask.priority} />
                <p className="text-[10px] text-muted-foreground mt-1">Priority</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <StatusBadge variant={selectedTask.status === "completed" ? "success" : "pending"} label={selectedTask.status?.replace("_", " ")} />
                <p className="text-[10px] text-muted-foreground mt-1">Status</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <Badge variant="outline" className="capitalize">{selectedTask.domain}</Badge>
                <p className="text-[10px] text-muted-foreground mt-1">Domain</p>
              </div>
            </div>
            {selectedTask.description && (
              <GlassCard><p className="text-xs font-semibold mb-1">Description</p><p className="text-sm text-muted-foreground">{selectedTask.description}</p></GlassCard>
            )}
            {selectedTask.status !== "completed" && (
              <div className="flex gap-2">
                <Button className="btn-glass text-crimson flex-1 text-sm rounded-lg" onClick={() => handleTransition(selectedTask, "blocked")} disabled={updateTask.isPending}>
                  <AlertTriangle className="h-4 w-4 mr-2" />Block
                </Button>
                <Button className="btn-premium text-white flex-1 text-sm rounded-lg" onClick={() => handleTransition(selectedTask, selectedTask.status === "pending" ? "in_progress" : "completed")} disabled={updateTask.isPending}>
                  <ArrowRight className="h-4 w-4 mr-2" />{selectedTask.status === "pending" ? "Start" : "Complete"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      <CreateTaskForm open={showCreateTask} onOpenChange={setShowCreateTask} />
    </div>
  );
}
