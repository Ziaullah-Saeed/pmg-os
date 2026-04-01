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
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import {
  Zap, CheckCircle2, Clock, AlertTriangle, Plus, LayoutGrid,
  List, ArrowRight
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
  const { data: tasks } = useListTasks();
  const { isHuman, isHybrid, isAuto } = useAiModeContext();
  const taskList = (tasks ?? []) as any[];

  const total = taskList.length;
  const inProgress = taskList.filter((t: any) => t.status === "in_progress").length;
  const pending = taskList.filter((t: any) => t.status === "pending").length;
  const completed = taskList.filter((t: any) => t.status === "completed").length;
  const critical = taskList.filter((t: any) => t.priority === "critical" && t.status !== "completed").length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Execution & Operations"
        subtitle="Task management, workflows, checklists, and operational monitoring"
        icon={<Zap className="h-5 w-5" />}
        actions={<Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg"><Plus className="h-4 w-4 mr-2" />New Task</Button>}
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
                        {task.assignee && <span className="text-[9px] text-muted-foreground">{task.assignee}</span>}
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
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Pending Approvals</h3></div>
            <div className="px-5 pb-4 space-y-2">
              {taskList.filter((t: any) => t.status === "pending" && (t.priority === "critical" || t.priority === "high")).length > 0 ? (
                taskList.filter((t: any) => t.status === "pending" && (t.priority === "critical" || t.priority === "high")).map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="h-4 w-4 text-warning shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{task.domain} &bull; {task.priority}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button className="btn-glass text-crimson text-xs px-3 py-1.5 rounded-lg">Reject</Button>
                      <Button className="bg-success hover:bg-success/90 text-white text-xs px-3 py-1.5 rounded-lg">Approve</Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-success/50" />
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                </div>
              )}
            </div>
          </GlassCard>
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
            <div>
              <h4 className="section-header mb-2">Checklist</h4>
              <div className="space-y-1.5">
                {["Review requirements", "Execute task", "Verify output", "Get approval"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg glass-surface">
                    <div className="w-3.5 h-3.5 rounded border border-border" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            {selectedTask.status !== "completed" && (
              <div className="flex gap-2">
                <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg"><AlertTriangle className="h-4 w-4 mr-2" />Block</Button>
                <Button className="btn-premium text-white flex-1 text-sm rounded-lg"><ArrowRight className="h-4 w-4 mr-2" />
                  {selectedTask.status === "pending" ? "Start" : selectedTask.status === "in_progress" ? "Complete" : "Reopen"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
