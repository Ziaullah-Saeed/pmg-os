import { useState } from "react";
import { Bot, Zap, AlertTriangle, DollarSign, Activity, CheckCircle, XCircle, Clock, Shield, TrendingUp, Cpu, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiRuns, usePendingActions, useApprovePendingAction, useRejectPendingAction, useWalletBalance, useWalletTransactions, useAgentActivity, useJobQueueStats, useAgents, useSetAiMode, useWorkflowModes, useSetWorkflowMode } from "@/hooks/use-api";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">{value}%</span>
    </div>
  );
}

export default function AiAutoPage() {
  const { isAuto } = useAiModeContext();
  const setMode = useSetAiMode();
  const { data: aiRuns } = useAiRuns(30);
  const { data: pendingActions } = usePendingActions();
  const { data: wallet } = useWalletBalance();
  const { data: transactions } = useWalletTransactions(20);
  const { data: agentData } = useAgentActivity();
  const { data: jobStats } = useJobQueueStats();
  const { data: agents } = useAgents();
  const { data: workflowModes } = useWorkflowModes();
  const setWorkflowMode = useSetWorkflowMode();
  const approve = useApprovePendingAction();
  const reject = useRejectPendingAction();
  const [activeTab, setActiveTab] = useState("activity");

  const runs = Array.isArray(aiRuns) ? aiRuns : [];
  const pending = Array.isArray(pendingActions) ? pendingActions : [];
  const recentTransactions = Array.isArray(transactions) ? transactions : [];
  const activeAgents = Array.isArray(agents) ? agents.filter((a: any) => a.status === "active") : [];
  const escalations = runs.filter((r: any) => r.reviewRequired === "yes" || (r.confidenceScore && r.confidenceScore < 50));
  const highConfidence = runs.filter((r: any) => r.confidenceScore && r.confidenceScore >= 80);

  const totalSpend = recentTransactions.reduce((sum: number, t: any) => sum + (t.type === "charge" ? Math.abs(Number(t.amount)) : 0), 0);

  const workflows = Array.isArray(workflowModes) ? workflowModes : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-crimson" />
            AI Autonomous Mode
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI agents operate independently — workflows continue when you're away
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isAuto && (
            <Button size="sm" className="bg-crimson hover:bg-crimson/90" onClick={() => setMode.mutate("ai_autonomous")}>
              <Zap className="h-4 w-4 mr-1" /> Switch to Auto
            </Button>
          )}
          {isAuto && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Activity className="h-3 w-3 mr-1" /> Active
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Cpu className="h-4 w-4" /> Active Agents
            </div>
            <p className="text-2xl font-bold">{activeAgents.length}</p>
            <p className="text-xs text-muted-foreground">{agentData?.stats?.totalRuns ?? 0} total runs</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Wallet Balance
            </div>
            <p className="text-2xl font-bold">${(wallet?.balance ?? 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">${totalSpend.toFixed(2)} spent today</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" /> Pending Approvals
            </div>
            <p className="text-2xl font-bold">{pending.length}</p>
            <p className="text-xs text-muted-foreground">{escalations.length} escalations</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" /> Auto-Continue
            </div>
            <p className="text-2xl font-bold">{highConfidence.length}</p>
            <p className="text-xs text-green-400 text-sm">≥80% confidence</p>
          </CardContent>
        </Card>
      </div>

      {pending.length > 0 && (
        <Card className="glass-card border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-4 w-4" /> Intervention Needed — {pending.length} action(s) require approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 5).map((action: any) => (
              <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.title ?? action.action}</p>
                  <p className="text-xs text-muted-foreground">{action.domain} • {action.entityType} #{action.entityId}</p>
                  {action.aiRecommendation && (
                    <p className="text-xs text-blue-400 mt-1">AI recommends: {action.aiRecommendation}</p>
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
          <TabsTrigger value="activity">Agent Activity</TabsTrigger>
          <TabsTrigger value="queue">Task Queue</TabsTrigger>
          <TabsTrigger value="wallet">Wallet Spend</TabsTrigger>
          <TabsTrigger value="escalations">Escalations</TabsTrigger>
          <TabsTrigger value="workflows">Workflow Modes</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-3">
          {runs.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No AI runs recorded yet
              </CardContent>
            </Card>
          ) : (
            runs.slice(0, 20).map((run: any, i: number) => (
              <Card key={run.id ?? i} className="glass-card border-white/10">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{run.domain ?? "system"}</Badge>
                      <span className="text-sm font-medium">{run.action ?? run.runType ?? "AI Run"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {run.status === "completed" || run.status === "success" ? (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">Completed</Badge>
                      ) : run.status === "failed" || run.status === "error" ? (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">Failed</Badge>
                      ) : (
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">{run.status ?? "running"}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{run.durationMs ? `${run.durationMs}ms` : ""}</span>
                    </div>
                  </div>
                  {run.confidenceScore != null && <ConfidenceBar value={run.confidenceScore} />}
                  {run.output && <p className="text-xs text-muted-foreground mt-1 truncate">{typeof run.output === "string" ? run.output.slice(0, 120) : JSON.stringify(run.output).slice(0, 120)}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-3">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-sm">Background Job Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: "Pending", value: jobStats?.pending ?? 0, color: "text-yellow-400" },
                  { label: "Running", value: jobStats?.running ?? 0, color: "text-blue-400" },
                  { label: "Completed", value: jobStats?.completed ?? 0, color: "text-green-400" },
                  { label: "Failed", value: jobStats?.failed ?? 0, color: "text-red-400" },
                  { label: "Retry", value: jobStats?.retry ?? 0, color: "text-orange-400" },
                  { label: "Dead Letter", value: jobStats?.deadLetter ?? 0, color: "text-red-500" },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 rounded-lg bg-white/5">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="space-y-3">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Recent AI Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.slice(0, 15).map((tx: any, i: number) => (
                    <div key={tx.id ?? i} className="flex items-center justify-between p-2 rounded bg-white/5">
                      <div>
                        <p className="text-sm">{tx.action ?? tx.tool ?? "Transaction"}</p>
                        <p className="text-xs text-muted-foreground">{tx.domain ?? "system"}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${tx.type === "charge" ? "text-red-400" : "text-green-400"}`}>
                          {tx.type === "charge" ? "-" : "+"}${Math.abs(Number(tx.amount)).toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">${Number(tx.balanceAfter ?? 0).toFixed(2)} after</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalations" className="space-y-3">
          {escalations.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No escalations — all AI runs within confidence thresholds
              </CardContent>
            </Card>
          ) : (
            escalations.map((run: any, i: number) => (
              <Card key={run.id ?? i} className="glass-card border-red-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{run.action ?? run.runType}</p>
                      <p className="text-xs text-muted-foreground">{run.domain} • Confidence: {run.confidenceScore ?? "N/A"}%</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Review Required
                    </Badge>
                  </div>
                  {run.error && <p className="text-xs text-red-400 mt-1">{run.error}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-3">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-sm">Workflow-Level Mode Overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workflows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All workflows follow global mode</p>
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
                            className={`h-6 text-xs ${(wf.mode ?? wf.scope_mode) === m ? "bg-crimson" : ""}`}
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
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Confidence-based auto-continue: runs with ≥80% confidence proceed automatically. Below threshold, items queue for approval.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
