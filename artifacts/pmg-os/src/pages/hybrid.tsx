import { useState } from "react";
import { Users, Bot, ArrowLeftRight, CheckCircle, XCircle, Clock, Zap, Eye, Shield, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiRuns, usePendingActions, useApprovePendingAction, useRejectPendingAction, useAgents, useListTasks, useSetAiMode, useWorkflowModes, useSetWorkflowMode } from "@/hooks/use-api";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";

function OwnershipBadge({ owner }: { owner: "ai" | "human" | "shared" }) {
  if (owner === "ai") return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"><Bot className="h-3 w-3 mr-1" />AI Owned</Badge>;
  if (owner === "human") return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"><Users className="h-3 w-3 mr-1" />Human Owned</Badge>;
  return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"><ArrowLeftRight className="h-3 w-3 mr-1" />Shared</Badge>;
}

function determineOwner(item: any): "ai" | "human" | "shared" {
  if (item.aiGenerated || item.actorType === "ai" || item.runType) return "ai";
  if (item.actorType === "human" || item.assignedTo) return "human";
  return "shared";
}

export default function HybridPage() {
  const { isHybrid } = useAiModeContext();
  const setMode = useSetAiMode();
  const { data: aiRuns } = useAiRuns(30);
  const { data: pendingActions } = usePendingActions();
  const { data: agents } = useAgents();
  const { data: tasks } = useListTasks();
  const { data: workflowModes } = useWorkflowModes();
  const setWorkflowMode = useSetWorkflowMode();
  const approve = useApprovePendingAction();
  const reject = useRejectPendingAction();
  const [activeTab, setActiveTab] = useState("split");

  const runs = Array.isArray(aiRuns) ? aiRuns : [];
  const pending = Array.isArray(pendingActions) ? pendingActions : [];
  const allTasks = Array.isArray(tasks) ? tasks : [];
  const allAgents = Array.isArray(agents) ? agents : [];
  const workflows = Array.isArray(workflowModes) ? workflowModes : [];

  const aiTasks = runs.filter((r: any) => r.confidenceScore >= 70);
  const humanTasks = allTasks.filter((t: any) => t.status !== "completed" && t.status !== "cancelled");
  const sharedTasks = runs.filter((r: any) => r.confidenceScore && r.confidenceScore >= 50 && r.confidenceScore < 70);

  const handoffTimeline = [...runs.filter((r: any) => r.reviewRequired === "yes")].slice(0, 15);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-yellow-500" />
            Hybrid Mode
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI handles routine tasks — you review what matters
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isHybrid && (
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => setMode.mutate("hybrid")}>
              <ArrowLeftRight className="h-4 w-4 mr-1" /> Switch to Hybrid
            </Button>
          )}
          {isHybrid && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <Zap className="h-3 w-3 mr-1" /> Active
            </Badge>
          )}
          <Button size="sm" variant="outline" className="border-white/20 text-xs" onClick={() => setMode.mutate("ai_autonomous")}>
            Go Fully Auto (I'm away)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-purple-400 mb-1">
              <Bot className="h-4 w-4" /> AI-Owned Tasks
            </div>
            <p className="text-2xl font-bold">{aiTasks.length}</p>
            <p className="text-xs text-muted-foreground">≥70% confidence</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-blue-400 mb-1">
              <Users className="h-4 w-4" /> Human-Owned Tasks
            </div>
            <p className="text-2xl font-bold">{humanTasks.length}</p>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-400 mb-1">
              <ArrowLeftRight className="h-4 w-4" /> Shared / Review
            </div>
            <p className="text-2xl font-bold">{sharedTasks.length + pending.length}</p>
            <p className="text-xs text-muted-foreground">{pending.length} awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <GitBranch className="h-4 w-4" /> Handoffs Today
            </div>
            <p className="text-2xl font-bold">{handoffTimeline.length}</p>
            <p className="text-xs text-muted-foreground">AI→Human escalations</p>
          </CardContent>
        </Card>
      </div>

      {pending.length > 0 && (
        <Card className="glass-card border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
              <Eye className="h-4 w-4" /> Approval Queue — {pending.length} item(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 8).map((action: any) => (
              <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{action.title ?? action.action}</p>
                    <OwnershipBadge owner="shared" />
                  </div>
                  <p className="text-xs text-muted-foreground">{action.domain} • Confidence: {action.confidence ?? "N/A"}%</p>
                  {action.aiRecommendation && (
                    <p className="text-xs text-blue-400 mt-1">AI suggests: {action.aiRecommendation}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button size="sm" variant="ghost" className="h-7 text-green-400 hover:bg-green-500/20" onClick={() => approve.mutate(action.id)}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:bg-red-500/20" onClick={() => reject.mutate({ id: action.id })}>
                    <XCircle className="h-3 w-3 mr-1" /> Skip
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="split">Task Ownership Split</TabsTrigger>
          <TabsTrigger value="handoffs">Handoff Timeline</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Routing</TabsTrigger>
          <TabsTrigger value="workflows">Workflow Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="split" className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <Card className="glass-card border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                  <Bot className="h-4 w-4" /> AI-Owned Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {aiTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No AI tasks active</p>
                ) : (
                  aiTasks.slice(0, 8).map((run: any, i: number) => (
                    <div key={run.id ?? i} className="p-2 rounded bg-white/5 text-sm">
                      <p className="truncate">{run.action ?? run.runType}</p>
                      <p className="text-xs text-muted-foreground">{run.domain} • {run.confidenceScore}%</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Human-Owned Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {humanTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No human tasks active</p>
                ) : (
                  humanTasks.slice(0, 8).map((task: any, i: number) => (
                    <div key={task.id ?? i} className="p-2 rounded bg-white/5 text-sm">
                      <p className="truncate">{task.title ?? task.description}</p>
                      <p className="text-xs text-muted-foreground">{task.priority ?? "normal"} • {task.status}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" /> Shared / Needs Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sharedTasks.length === 0 && pending.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No shared tasks</p>
                ) : (
                  [...pending.slice(0, 4), ...sharedTasks.slice(0, 4)].map((item: any, i: number) => (
                    <div key={item.id ?? i} className="p-2 rounded bg-white/5 text-sm">
                      <p className="truncate">{item.title ?? item.action ?? item.runType}</p>
                      <p className="text-xs text-muted-foreground">{item.domain} • {item.confidence ?? item.confidenceScore ?? "?"}%</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="handoffs" className="space-y-3">
          {handoffTimeline.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No handoffs yet — AI is operating within confidence thresholds
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-sm">AI → Human Handoff Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {handoffTimeline.map((run: any, i: number) => (
                    <div key={run.id ?? i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                      <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{run.action ?? run.runType}</p>
                          <span className="text-xs text-muted-foreground">{run.createdAt ? new Date(run.createdAt).toLocaleTimeString() : ""}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{run.domain} • Confidence: {run.confidenceScore ?? "?"}%</p>
                        <p className="text-xs text-yellow-400 mt-1">Reason: Below confidence threshold — human review requested</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="confidence" className="space-y-3">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-sm">Confidence-Based Routing Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-lg font-bold text-green-400">≥80%</p>
                  <p className="text-xs text-muted-foreground">Auto-execute</p>
                  <p className="text-xs text-green-400">No review needed</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                  <p className="text-lg font-bold text-yellow-400">50-79%</p>
                  <p className="text-xs text-muted-foreground">Human review</p>
                  <p className="text-xs text-yellow-400">AI drafts, you approve</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-lg font-bold text-red-400">&lt;50%</p>
                  <p className="text-xs text-muted-foreground">Human takeover</p>
                  <p className="text-xs text-red-400">AI advisory only</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                In Hybrid mode, AI continues working on tasks it's confident about. When confidence drops below threshold, it hands off to you with its recommendation and supporting data.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-3">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-sm">Per-Workflow Mode Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workflows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All workflows follow global Hybrid mode</p>
                ) : (
                  workflows.map((wf: any) => (
                    <div key={wf.workflowKey ?? wf.workflow_key} className="flex items-center justify-between p-2 rounded bg-white/5">
                      <div>
                        <p className="text-sm font-medium">{(wf.workflowKey ?? wf.workflow_key ?? "").replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">Threshold: {wf.confidenceThreshold ?? wf.confidence_threshold ?? 70}%</p>
                      </div>
                      <div className="flex gap-1">
                        {["ai_autonomous", "hybrid", "human_controlled"].map(m => (
                          <Button
                            key={m}
                            size="sm"
                            variant={(wf.mode ?? wf.scope_mode) === m ? "default" : "ghost"}
                            className={`h-6 text-xs ${(wf.mode ?? wf.scope_mode) === m ? (m === "ai_autonomous" ? "bg-crimson" : m === "hybrid" ? "bg-yellow-600" : "bg-blue-600") : ""}`}
                            onClick={() => setWorkflowMode.mutate({ key: wf.workflowKey ?? wf.workflow_key, mode: m })}
                          >
                            {m === "ai_autonomous" ? "Auto" : m === "hybrid" ? "Hybrid" : "Human"}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
