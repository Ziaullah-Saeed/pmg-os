import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useListTasks } from "@workspace/api-client-react";

export default function Execution() {
  const { data: tasks } = useListTasks();
  const taskList = tasks ?? [];

  const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-yellow-400" />,
    in_progress: <Zap className="h-4 w-4 text-blue-400" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-400" />,
    blocked: <AlertTriangle className="h-4 w-4 text-red-400" />,
  };

  const priorityColor: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          Execution & Operations
        </h1>
        <p className="text-muted-foreground mt-1">Task management, workflows, and operational monitoring.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold mt-1">{taskList.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold mt-1 text-blue-400">
              {taskList.filter((t: any) => t.status === 'in_progress').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold mt-1 text-yellow-400">
              {taskList.filter((t: any) => t.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Critical</p>
            <p className="text-2xl font-bold mt-1 text-red-400">
              {taskList.filter((t: any) => t.priority === 'critical').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {taskList.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center gap-3">
                  {statusIcon[task.status] ?? statusIcon.pending}
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{task.domain}</Badge>
                  <Badge className={`capitalize ${priorityColor[task.priority] ?? ''}`}>{task.priority}</Badge>
                  <Badge variant="secondary" className="capitalize">{task.status?.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
