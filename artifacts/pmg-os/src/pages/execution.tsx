import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, CheckCircle2, Clock, AlertTriangle, Plus, LayoutGrid, List, ArrowRight, User, Calendar } from "lucide-react";
import { useListTasks } from "@workspace/api-client-react";
import { motion } from "framer-motion";

const statuses = ['pending', 'in_progress', 'completed', 'blocked'] as const;
const statusLabels: Record<string, string> = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', blocked: 'Blocked' };
const statusColors: Record<string, string> = { pending: 'border-yellow-500/50', in_progress: 'border-blue-500/50', completed: 'border-green-500/50', blocked: 'border-red-500/50' };
const priorityStyles: Record<string, string> = { critical: 'bg-red-500/20 text-red-400', high: 'bg-orange-500/20 text-orange-400', medium: 'bg-yellow-500/20 text-yellow-400', low: 'bg-muted text-muted-foreground' };

export default function Execution() {
  const [activeTab, setActiveTab] = useState("kanban");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const { data: tasks } = useListTasks();
  const taskList = (tasks ?? []) as any[];

  const total = taskList.length;
  const inProgress = taskList.filter((t: any) => t.status === 'in_progress').length;
  const pending = taskList.filter((t: any) => t.status === 'pending').length;
  const completed = taskList.filter((t: any) => t.status === 'completed').length;
  const critical = taskList.filter((t: any) => t.priority === 'critical' && t.status !== 'completed').length;

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            Execution & Operations
          </h1>
          <p className="text-muted-foreground mt-1">Task management, workflows, checklists, and operational monitoring.</p>
        </div>
        <NewTaskDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SmallMetric label="Total Tasks" value={total} />
        <SmallMetric label="In Progress" value={inProgress} accent="blue" />
        <SmallMetric label="Pending" value={pending} accent="yellow" />
        <SmallMetric label="Completed" value={completed} accent="green" />
        <SmallMetric label="Critical" value={critical} accent="red" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="kanban" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <LayoutGrid className="h-4 w-4 mr-2" />Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <List className="h-4 w-4 mr-2" />List View
          </TabsTrigger>
          <TabsTrigger value="approvals" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <CheckCircle2 className="h-4 w-4 mr-2" />Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">
            {statuses.map(status => {
              const statusTasks = taskList.filter((t: any) => t.status === status);
              return (
                <div key={status} className="space-y-2">
                  <div className={`flex items-center justify-between pb-2 border-b-2 ${statusColors[status]}`}>
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{statusLabels[status]}</h3>
                    <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px] font-medium">{statusTasks.length}</span>
                  </div>
                  {statusTasks.map((task: any) => (
                    <motion.div key={task.id} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
                      <Card className="bg-card/50 border-border/50 hover:border-primary/30 cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <CardContent className="p-3 space-y-2">
                          <p className="text-sm font-medium leading-tight">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{task.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              <Badge className={`text-[9px] px-1 py-0 capitalize ${priorityStyles[task.priority] ?? ''}`}>{task.priority}</Badge>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{task.domain}</Badge>
                            </div>
                            {task.assignee && <span className="text-[9px] text-muted-foreground">{task.assignee}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  {statusTasks.length === 0 && (
                    <div className="p-6 border border-dashed border-border/50 rounded-lg text-center text-[10px] text-muted-foreground">No tasks</div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-2 mt-6">
          {taskList.map((task: any) => (
            <Card key={task.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 cursor-pointer" onClick={() => setSelectedTask(task)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : task.status === 'blocked' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">{task.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Badge variant="outline" className="capitalize text-[10px]">{task.domain}</Badge>
                  <Badge className={`capitalize text-[10px] ${priorityStyles[task.priority] ?? ''}`}>{task.priority}</Badge>
                  <Badge variant="secondary" className="capitalize text-[10px]">{task.status?.replace('_', ' ')}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Pending Approvals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {taskList.filter((t: any) => t.status === 'pending' && (t.priority === 'critical' || t.priority === 'high')).length > 0 ? (
                taskList.filter((t: any) => t.status === 'pending' && (t.priority === 'critical' || t.priority === 'high')).map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="h-4 w-4 text-yellow-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">{task.domain} &bull; {task.priority}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-400 border-red-500/30">Reject</Button>
                      <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700">Approve</Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </motion.div>
  );
}

function SmallMetric({ label, value, accent }: any) {
  const c = accent === 'blue' ? 'text-blue-400' : accent === 'yellow' ? 'text-yellow-400' : accent === 'green' ? 'text-green-400' : accent === 'red' ? 'text-red-400' : '';
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`text-xl font-bold ${c}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />New Task</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2"><Label>Task Title</Label><Input placeholder="e.g., Deploy firewall rules" className="bg-background/50" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Task details..." className="bg-background/50" rows={3} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Priority</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Domain</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Domain" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intelligence">Intelligence</SelectItem><SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem><SelectItem value="production">Production</SelectItem>
                  <SelectItem value="crm">CRM</SelectItem><SelectItem value="communications">Comms</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem><SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Assignee</Label><Input placeholder="Name" className="bg-background/50" /></div>
          </div>
          <div className="space-y-2">
            <Label>Checklist Items</Label>
            <div className="space-y-1">
              {['Step 1', 'Step 2', 'Step 3'].map((_, i) => (
                <Input key={i} placeholder={`Checklist item ${i + 1}`} className="bg-background/50 text-xs h-8" />
              ))}
            </div>
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90">Create Task</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailModal({ task, onClose }: any) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-xl max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>{task.title}</DialogTitle></DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge className={`capitalize ${priorityStyles[task.priority] ?? ''}`}>{task.priority}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Priority</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant="secondary" className="capitalize">{task.status?.replace('_', ' ')}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Status</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant="outline" className="capitalize">{task.domain}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Domain</p>
            </div>
          </div>

          {task.description && (
            <div className="p-3 rounded-lg bg-background/50 border border-border/30">
              <p className="text-xs font-semibold mb-1">Description</p>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold mb-2">Checklist</h4>
            <div className="space-y-2">
              {['Review requirements', 'Execute task', 'Verify output', 'Get approval'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-background/50 border border-border/30">
                  <Checkbox className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {task.status !== 'completed' && (
              <>
                <Button variant="outline" className="flex-1"><AlertTriangle className="h-4 w-4 mr-2" />Block</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90"><ArrowRight className="h-4 w-4 mr-2" />
                  {task.status === 'pending' ? 'Start' : task.status === 'in_progress' ? 'Complete' : 'Reopen'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
