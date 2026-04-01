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
import { useUpdateTaskMut } from "@/hooks/use-api";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import { CreateTaskForm } from "@/components/forms/create-task-form";
import {
  Zap, CheckCircle2, Clock, AlertTriangle, Plus, LayoutGrid,
  List, ArrowRight, Shield, Bot, Sparkles, FileText, Eye
} from "lucide-react";

const statuses = ["pending", "in_progress", "completed", "blocked"] as const;
const statusLabels: Record<string, string> = { pending: "Pending", in_progress: "In Progress", completed: "Completed", blocked: "Blocked" };

const tabs = [
  { id: "kanban", label: "Kanban", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { id: "list", label: "List View", icon: <List className="h-3.5 w-3.5" /> },
  { id: "approvals", label: "Approvals", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
];

export default function Execution() {
  const [activeTab, setActiveTab] = useState("kanban");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const { data: tasks } = useListTasks();
  const { isHuman } = useAiModeContext();
  const updateTask = useUpdateTaskMut();
  const taskList = (tasks ?? []) as any[];

  const total = taskList.length;
  const inProgress = taskList.filter((t: any) => t.status === "in_progress").length;
  const pending = taskList.filter((t: any) => t.status === "pending").length;
  const completed = taskList.filter((t: any) => t.status === "completed").length;
  const critical = taskList.filter((t: any) => t.priority === "critical" && t.status !== "completed").length;

  function handleTransition(task: any, newStatus: string) {
    updateTask.mutate({ id: task.id, data: { status: newStatus } }, {
      onSuccess: () => setSelectedTask(null),
    });
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Execution & Operations"
        subtitle="Task management, workflows, checklists, and operational monitoring"
        icon={<Zap className="h-5 w-5" />}
        actions={<Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateTask(true)}><Plus className="h-4 w-4 mr-2" />New Task</Button>}
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Tasks" value={total} icon={<Zap className="h-4 w-4" />} />
        <KpiCard label="In Progress" value={inProgress} icon={<Clock className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Pending" value={pending} icon={<Clock className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Completed" value={completed} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Critical" value={critical} icon={<AlertTriangle className="h-4 w-4" />} accent="crimson" />
      </div>

      <ModeAwareWrapper
        domain="execution"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Task Management Workflow" steps={[
              { id: "1", title: "Review Task Queue", description: "Check pending and blocked tasks, prioritize by urgency and impact", status: "current" as const, action: "View Tasks" },
              { id: "2", title: "Assign & Plan", description: "Assign tasks to team members, set deadlines and dependencies", status: "upcoming" as const },
              { id: "3", title: "Execute & Track", description: "Work through tasks, update status as you progress", status: "upcoming" as const },
              { id: "4", title: "Quality Check", description: "Review completed work against acceptance criteria", status: "upcoming" as const },
              { id: "5", title: "Close & Document", description: "Mark tasks complete and document lessons learned", status: "upcoming" as const },
            ]} icon={<Zap className="h-5 w-5 text-blue-400" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Priority Tasks ({pending + inProgress})</h3>
                <div className="space-y-2">
                  {taskList.filter((t: any) => t.status !== "completed").slice(0, 8).map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 cursor-pointer" onClick={() => setSelectedTask(task)}>
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{task.priority} · {task.status}</p>
                      </div>
                      <StatusBadge variant={task.priority === "critical" ? "ai-flagged" : task.status === "in_progress" ? "ai-recommended" : "pending"} label={task.status} />
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Recently Completed ({completed})</h3>
                <div className="space-y-2">
                  {taskList.filter((t: any) => t.status === "completed").slice(0, 8).map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 opacity-60">
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{task.priority}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        }
      >
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
                      const ra = rank[a.priority] ?? 4;
                      const rb = rank[b.priority] ?? 4;
                      if (ra !== rb) return ra - rb;
                      return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
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
                                {task.assignedTo && <span className="text-[9px] text-muted-foreground">Assigned: {task.assignedTo}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0 ml-3">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedTask(task)}>
                              <Eye className="h-3 w-3 mr-1" />Review
                            </Button>
                            <Button className="btn-glass text-crimson text-xs px-3 py-1.5 rounded-lg h-7" onClick={() => handleTransition(task, "blocked")}>Escalate</Button>
                            <Button className="btn-glass text-red-400 text-xs px-3 py-1.5 rounded-lg h-7" onClick={() => handleTransition(task, "cancelled")}>Reject</Button>
                            <Button className="bg-success hover:bg-success/90 text-white text-xs px-3 py-1.5 rounded-lg h-7" onClick={() => handleTransition(task, "in_progress")}>Approve</Button>
                          </div>
                        </div>
                        {task.description && <p className="text-[10px] text-muted-foreground ml-10">{task.description}</p>}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Approval Policy Configuration</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { workflow: "Financial Transactions > $5,000", approver: "Super Admin", mode: "Required" },
                    { workflow: "Campaign Launch", approver: "Admin+", mode: "AI Auto → Human Approval" },
                    { workflow: "Client Proposal Send", approver: "Manager+", mode: "Required" },
                    { workflow: "AI Agent Config Change", approver: "Super Admin", mode: "Required" },
                    { workflow: "Content Publishing", approver: "Manager+", mode: "AI Auto → Auto-Approve" },
                    { workflow: "Lead Disqualification", approver: "Any", mode: "AI Auto Only" },
                    { workflow: "Contract Signing", approver: "Super Admin", mode: "Required" },
                  ].map((policy, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <div>
                        <p className="text-xs font-medium">{policy.workflow}</p>
                        <p className="text-[9px] text-muted-foreground">Approver: {policy.approver}</p>
                      </div>
                      <Badge variant="outline" className={`text-[8px] ${policy.mode === "Required" ? "text-crimson border-crimson/30" : policy.mode.includes("Auto-Approve") ? "text-green-400 border-green-500/30" : ""}`}>{policy.mode}</Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">Approval History</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {taskList.filter((t: any) => t.status === "completed" || t.status === "in_progress").slice(0, 6).map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{task.title}</p>
                          <p className="text-[9px] text-muted-foreground">{task.domain} &bull; {new Date(task.updatedAt ?? task.createdAt ?? Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] text-success border-success/30">{task.status === "completed" ? "Approved" : "In Review"}</Badge>
                    </div>
                  ))}
                  {taskList.filter((t: any) => t.status === "completed" || t.status === "in_progress").length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No approval history yet.</p>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </motion.div>
      </ModeAwareWrapper>

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
            {(selectedTask.assignee || selectedTask.assignedTo || selectedTask.assigned_to) && (
              <GlassCard><p className="text-xs font-semibold mb-1">Assigned To</p><p className="text-sm text-muted-foreground">{selectedTask.assignee || selectedTask.assignedTo || selectedTask.assigned_to}</p></GlassCard>
            )}
            {selectedTask.dueDate && (
              <GlassCard><p className="text-xs font-semibold mb-1">Due Date</p><p className="text-sm text-muted-foreground">{new Date(selectedTask.dueDate || selectedTask.due_date).toLocaleDateString()}</p></GlassCard>
            )}
            {selectedTask.status !== "completed" && (
              <div className="flex gap-2">
                <Button
                  className="btn-glass text-crimson flex-1 text-sm rounded-lg"
                  onClick={() => handleTransition(selectedTask, "blocked")}
                  disabled={updateTask.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />Block
                </Button>
                <Button
                  className="btn-premium text-white flex-1 text-sm rounded-lg"
                  onClick={() => handleTransition(selectedTask, selectedTask.status === "pending" ? "in_progress" : selectedTask.status === "in_progress" ? "completed" : "in_progress")}
                  disabled={updateTask.isPending}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {selectedTask.status === "pending" ? "Start" : selectedTask.status === "in_progress" ? "Complete" : "Reopen"}
                </Button>
              </div>
            )}
            {selectedTask.status === "completed" && (
              <Button
                className="btn-glass text-foreground w-full text-sm rounded-lg"
                onClick={() => handleTransition(selectedTask, "pending")}
                disabled={updateTask.isPending}
              >
                Reopen Task
              </Button>
            )}
          </div>
        )}
      </DetailDrawer>

      <CreateTaskForm open={showCreateTask} onOpenChange={setShowCreateTask} />
    </div>
  );
}
