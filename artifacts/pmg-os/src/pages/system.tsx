import { useState } from "react";
import { useHealthCheck } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAiMode, useSetAiMode, useWorkflowModes, useSetWorkflowMode,
  useWalletBalance, useWalletTransactions, useCommandCenter,
  useGHLConfig, useSaveGHLConfig, useTestGHLConnection, useGHLCRMMode, useSetGHLCRMMode
} from "@/hooks/use-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, CheckCircle2, Database, Shield, Server, Users,
  Lock, Eye, Activity, Clock, Globe, Cpu, Bot, Wallet, Zap,
  TrendingUp, AlertTriangle, Loader2, Save, PlugZap, RefreshCw
} from "lucide-react";

const roles = [
  { role: "Super Admin", desc: "Full system access, governance settings, permission management", users: 1, color: "text-crimson" },
  { role: "Admin", desc: "Domain management, approval rights, financial access", users: 2, color: "text-warning" },
  { role: "Manager", desc: "Team oversight, task assignment, reporting access", users: 3, color: "text-info" },
  { role: "User", desc: "Task execution, limited visibility, no admin access", users: 5, color: "text-muted-foreground" },
];

const modules = [
  { name: "Command Center", domain: "dashboard", uptime: "99.9%" },
  { name: "Intelligence Engine", domain: "intelligence", uptime: "99.9%" },
  { name: "Outreach & Prospecting", domain: "outreach", uptime: "99.8%" },
  { name: "Marketing & Campaigns", domain: "marketing", uptime: "99.9%" },
  { name: "Production Studio", domain: "production", uptime: "99.7%" },
  { name: "Execution & Operations", domain: "execution", uptime: "99.9%" },
  { name: "CRM Pipeline", domain: "crm", uptime: "99.9%" },
  { name: "Communication Intelligence", domain: "communications", uptime: "99.8%" },
  { name: "Finance & Legal", domain: "finance", uptime: "99.9%" },
  { name: "Reports & Archive", domain: "reports", uptime: "99.9%" },
  { name: "System Core", domain: "system", uptime: "100%" },
];

const workflowLabels: Record<string, string> = {
  lead_qualification: "Lead Qualification",
  content_generation: "Content Generation",
  proposal_creation: "Proposal Creation",
  deal_progression: "Deal Progression",
  invoice_generation: "Invoice Generation",
  legal_review: "Legal Review",
  lead_enrichment: "Lead Enrichment",
  lead_scoring: "Lead Scoring",
  outreach_drafting: "Outreach Drafting",
  report_generation: "Report Generation",
  task_assignment: "Task Assignment",
  campaign_optimization: "Campaign Optimization",
  asset_review: "Asset Review",
  communication_analysis: "Communication Analysis",
};

const tabs = [
  { id: "overview", label: "System Overview", icon: <Server className="h-3.5 w-3.5" /> },
  { id: "ai-control", label: "AI Control", icon: <Bot className="h-3.5 w-3.5" /> },
  { id: "permissions", label: "Permissions", icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "audit", label: "Audit Trail", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "integrations", label: "Integrations", icon: <Globe className="h-3.5 w-3.5" /> },
];

export default function System() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: health } = useHealthCheck();
  const { data: aiMode } = useAiMode();
  const setAiMode = useSetAiMode();
  const { data: workflows } = useWorkflowModes();
  const setWorkflowMode = useSetWorkflowMode();
  const { data: wallet } = useWalletBalance();
  const { data: transactions } = useWalletTransactions(20);
  const { data: cmdCenter } = useCommandCenter();
  const { data: ghlConfig } = useGHLConfig();
  const saveGHL = useSaveGHLConfig();
  const testGHL = useTestGHLConnection();
  const { data: crmModeData } = useGHLCRMMode();
  const setCRMMode = useSetGHLCRMMode();
  const { toast } = useToast();
  const [ghlForm, setGhlForm] = useState({ apiKey: "", locationId: "", webhookUrl: "" });

  const currentMode = aiMode?.mode ?? "hybrid";
  const crmMode = crmModeData?.mode ?? "internal";
  const workflowList = (workflows ?? []) as any[];
  const txList = (transactions ?? []) as any[];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="System Core & Governance"
        subtitle="AI control, permissions, governance, audit trails, integrations, and system health"
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="API Status" value={health?.status === "ok" ? "Healthy" : "Checking..."} icon={<Server className="h-4 w-4" />} accent="success" />
        <KpiCard label="AI Mode" value={currentMode === "ai_autonomous" ? "Autonomous" : currentMode === "human_controlled" ? "Human" : "Hybrid"} icon={<Bot className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Wallet Balance" value={`$${(wallet?.balance ?? 0).toFixed(2)}`} icon={<Wallet className="h-4 w-4" />} accent="gold" />
        <KpiCard label="AI Runs Today" value={cmdCenter?.aiRunsToday ?? 0} icon={<Zap className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Modules Active" value={modules.length} icon={<Cpu className="h-4 w-4" />} accent="success" />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Module Status</h3></div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {modules.map((mod) => (
                  <div key={mod.domain} className="flex items-center justify-between p-2.5 rounded-lg glass-surface">
                    <div className="flex items-center gap-2">
                      <div className="status-dot-active" />
                      <span className="text-sm font-medium">{mod.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{mod.uptime}</span>
                      <StatusBadge variant="active" label="Operational" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Platform Information</h3></div>
                <div className="px-5 pb-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Platform", value: "PMG Group OS v1.0" },
                    { label: "Organization", value: "PMG Group LLC" },
                    { label: "Industry", value: "Cybersecurity & IT Services" },
                    { label: "Architecture", value: "AI-Native Enterprise OS" },
                    { label: "Frontend", value: "React 19 + Vite + TailwindCSS" },
                    { label: "Backend", value: "Express 5 + PostgreSQL + Drizzle" },
                    { label: "AI Engine", value: "OpenAI GPT-4o-mini (Active)" },
                    { label: "Environment", value: "Development" },
                  ].map((item) => (
                    <div key={item.label} className="p-2 rounded-lg glass-surface">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-xs font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">System Health</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { label: "API Response Time", value: "<50ms" },
                    { label: "Database", value: health?.status === "ok" ? "Connected" : "Checking..." },
                    { label: "AI Engine", value: "Active (GPT-4o-mini)" },
                    { label: "Uptime", value: "99.9%" },
                    { label: "Active Workflows", value: `${workflowList.length} configured` },
                    { label: "Error Rate", value: "0.01%" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums">{item.value}</span>
                        <div className="status-dot-active" />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === "ai-control" && (
          <div className="space-y-6">
            <GlassCard glow="blue" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-info" />
                <h3 className="text-sm font-semibold">Global AI Mode</h3>
                <StatusBadge
                  variant={currentMode === "ai_autonomous" ? "ai-executed" : currentMode === "human_controlled" ? "human-required" : "human-assisted"}
                  label={currentMode === "ai_autonomous" ? "AI Autonomous" : currentMode === "human_controlled" ? "Human Controlled" : "Hybrid Mode"}
                />
              </div>
              <div className="px-5 pb-4 space-y-4">
                <p className="text-sm text-muted-foreground">Configure how the AI engine operates across all domains.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { mode: "ai_autonomous", label: "AI Autonomous", desc: "24/7 autonomous operation. AI handles all workflows.", icon: <Bot className="h-5 w-5" />, color: "border-green-500/30 bg-green-500/5" },
                    { mode: "hybrid", label: "Hybrid", desc: "AI operates with human review for confidence < 70%.", icon: <Users className="h-5 w-5" />, color: "border-blue-500/30 bg-blue-500/5" },
                    { mode: "human_controlled", label: "Human Controlled", desc: "Manual control only. AI provides suggestions.", icon: <Shield className="h-5 w-5" />, color: "border-amber-500/30 bg-amber-500/5" },
                  ].map((m) => (
                    <button
                      key={m.mode}
                      onClick={() => setAiMode.mutate(m.mode)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        currentMode === m.mode
                          ? `${m.color} ring-1 ring-white/20`
                          : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {m.icon}
                        <span className="text-sm font-semibold">{m.label}</span>
                        {currentMode === m.mode && <CheckCircle2 className="h-4 w-4 text-green-400 ml-auto" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Per-Workflow AI Mode Overrides</h3>
                <Badge variant="outline" className="text-[10px]">{workflowList.length} workflows</Badge>
              </div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {workflowList.map((wf: any) => (
                  <div key={wf.workflowKey} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div>
                      <p className="text-sm font-medium">{workflowLabels[wf.workflowKey] ?? wf.workflowKey}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {wf.mode === "ai_autonomous" ? "Fully automated" : wf.mode === "human_controlled" ? "Manual only" : "AI + human review"}
                      </p>
                    </div>
                    <Select value={wf.mode} onValueChange={(v) => setWorkflowMode.mutate({ key: wf.workflowKey, mode: v })}>
                      <SelectTrigger className="w-[160px] h-8 text-xs bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai_autonomous">AI Autonomous</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="human_controlled">Human Controlled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {workflowList.length === 0 && (
                  <div className="col-span-2 py-6 text-center text-sm text-muted-foreground">
                    No workflow overrides configured. All workflows use global mode.
                  </div>
                )}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold">AI Wallet</h3>
                  <span className="ml-auto text-lg font-bold text-green-400">${(wallet?.balance ?? 0).toFixed(2)}</span>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Every AI action deducts from the wallet. Fund as needed.</p>
                  {txList.slice(0, 8).map((tx: any, i: number) => (
                    <div key={tx.id ?? i} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <div>
                        <p className="text-xs font-medium">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${Number(tx.amount) < 0 ? "text-red-400" : "text-green-400"}`}>
                        {Number(tx.amount) < 0 ? "" : "+"}${Number(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {txList.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Recent AI Activity</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {(cmdCenter?.recentAiRuns ?? []).slice(0, 8).map((run: any, i: number) => (
                    <div key={run.id ?? i} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <div>
                        <p className="text-xs font-medium capitalize">{(run.runType ?? "").replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-muted-foreground">{run.model} &bull; {run.durationMs}ms</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {run.confidenceScore && (
                          <Badge variant="outline" className="text-[9px]">{Math.round(run.confidenceScore * 100)}%</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">{new Date(run.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                  {(!cmdCenter?.recentAiRuns || cmdCenter.recentAiRuns.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">No AI runs yet. Create a lead to trigger AI.</p>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Role-Based Access Control</h3>
                <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"><Users className="h-3 w-3 mr-1" />Manage Users</Button>
              </div>
              <div className="px-5 pb-4 space-y-3">
                {roles.map((r) => (
                  <div key={r.role} className="p-4 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Shield className={`h-5 w-5 ${r.color}`} />
                        <div>
                          <h3 className="font-semibold text-sm">{r.role}</h3>
                          <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{r.users} users</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.role === "Super Admin" && ["All Modules", "Governance", "Permissions", "Financials", "System Config", "Audit Logs"].map((p) => <Badge key={p} className="text-[8px] bg-crimson/10 text-crimson border-crimson/20">{p}</Badge>)}
                      {r.role === "Admin" && ["Domain Management", "Approvals", "Financial View", "User Management", "Reports"].map((p) => <Badge key={p} className="text-[8px] bg-warning/10 text-warning border-warning/20">{p}</Badge>)}
                      {r.role === "Manager" && ["Team Tasks", "Campaign Management", "CRM Access", "Basic Reports"].map((p) => <Badge key={p} className="text-[8px] bg-info/10 text-info border-info/20">{p}</Badge>)}
                      {r.role === "User" && ["Own Tasks", "Limited CRM", "Communication Log"].map((p) => <Badge key={p} className="text-[8px] bg-muted text-muted-foreground">{p}</Badge>)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Permission Matrix</h3></div>
              <div className="px-5 pb-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Module</th>
                      {roles.map((r) => <th key={r.role} className={`text-center py-2 px-2 font-medium ${r.color}`}>{r.role.split(" ")[0]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {["Dashboard", "Intelligence", "Outreach", "Marketing", "Production", "CRM", "Communications", "Execution", "Finance", "Reports", "System"].map((mod) => (
                      <tr key={mod} className="border-b border-border/20">
                        <td className="py-1.5 px-2">{mod}</td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-success mx-auto" /></td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-success mx-auto" /></td>
                        <td className="text-center">
                          {["Dashboard", "Intelligence", "Outreach", "Marketing", "CRM", "Communications", "Execution"].includes(mod)
                            ? <CheckCircle2 className="h-3 w-3 text-success mx-auto" />
                            : <Eye className="h-3 w-3 text-warning mx-auto" />}
                        </td>
                        <td className="text-center">
                          {["Dashboard", "Communications", "Execution"].includes(mod)
                            ? <Eye className="h-3 w-3 text-warning mx-auto" />
                            : <Lock className="h-3 w-3 text-muted-foreground mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "audit" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Audit Trail</h3>
              <Badge variant="outline" className="text-[10px]">{cmdCenter?.activitiesToday ?? 0} activities today</Badge>
            </div>
            <div className="px-5 pb-4 space-y-2">
              {(cmdCenter?.recentAiRuns ?? []).map((run: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-info" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize">{(run.runType ?? "").replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">AI System &bull; {run.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <StatusBadge variant="ai-executed" label="AI" />
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(run.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {(!cmdCenter?.recentAiRuns || cmdCenter.recentAiRuns.length === 0) && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No audit entries yet. Actions will appear here as the system is used.
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {activeTab === "integrations" && (
          <div className="space-y-6">
            <GlassCard glow="crimson" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">GoHighLevel Configuration</h3>
                </div>
                <Badge variant="outline" className="text-[10px]">CRM Integration</Badge>
              </div>
              <div className="px-5 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { mode: "internal", label: "PMG Internal", desc: "Use PMG OS as sole CRM" },
                    { mode: "ghl", label: "GoHighLevel", desc: "Route all leads to GHL" },
                    { mode: "hybrid", label: "Hybrid", desc: "Use both CRMs in parallel" },
                  ].map(m => (
                    <button
                      key={m.mode}
                      onClick={() => setCRMMode.mutate(m.mode, { onSuccess: () => toast({ title: `CRM mode: ${m.label}` }) })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        crmMode === m.mode
                          ? "border-crimson/30 bg-crimson/5 ring-1 ring-crimson/20"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                      }`}
                    >
                      <p className="text-sm font-semibold">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      {crmMode === m.mode && <CheckCircle2 className="h-3 w-3 text-crimson mt-1" />}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">GHL API Key</Label>
                    <Input
                      type="password"
                      value={ghlForm.apiKey || (ghlConfig?.apiKey ? "••••••••" : "")}
                      onChange={e => setGhlForm(f => ({ ...f, apiKey: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="eyJhbGciOiJIUzI1NiIs..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Location ID</Label>
                    <Input
                      value={ghlForm.locationId || ghlConfig?.locationId || ""}
                      onChange={e => setGhlForm(f => ({ ...f, locationId: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="loc_xxxxxxxxxx"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Webhook URL</Label>
                  <Input
                    value={ghlForm.webhookUrl || ghlConfig?.webhookUrl || ""}
                    onChange={e => setGhlForm(f => ({ ...f, webhookUrl: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-sm"
                    placeholder="https://hooks.example.com/ghl"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"
                    onClick={async () => {
                      const res = await testGHL.mutateAsync();
                      toast({ title: res.connected ? "Connection Successful" : "Connection Failed", description: res.error, variant: res.connected ? "default" : "destructive" });
                    }}
                    disabled={testGHL.isPending}
                  >
                    {testGHL.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Test Connection
                  </Button>
                  <Button
                    className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"
                    onClick={async () => {
                      const config: Record<string, unknown> = {};
                      if (ghlForm.apiKey && !ghlForm.apiKey.includes("•")) config.apiKey = ghlForm.apiKey;
                      if (ghlForm.locationId) config.locationId = ghlForm.locationId;
                      if (ghlForm.webhookUrl) config.webhookUrl = ghlForm.webhookUrl;
                      await saveGHL.mutateAsync(config);
                      toast({ title: "GHL Config Saved" });
                    }}
                    disabled={saveGHL.isPending}
                  >
                    {saveGHL.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save Configuration
                  </Button>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">All Integrations</h3></div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { name: "OpenAI / GPT-4o-mini", status: "ready", desc: "AI intelligence engine (Replit proxy)" },
                  { name: "GoHighLevel", status: ghlConfig?.apiKey ? "ready" : "available", desc: "Client CRM integration (sub-account)" },
                  { name: "ElevenLabs", status: "available", desc: "Voice AI for calling" },
                  { name: "Slack", status: "available", desc: "Reporting & communication surface" },
                  { name: "Stripe", status: "available", desc: "Payment processing" },
                  { name: "Google Calendar", status: "available", desc: "Meeting scheduling" },
                  { name: "LinkedIn", status: "available", desc: "Social selling & outreach" },
                ].map((int) => (
                  <div key={int.name} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div>
                      <p className="text-sm font-medium">{int.name}</p>
                      <p className="text-[10px] text-muted-foreground">{int.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={int.status === "ready" ? "active" : "pending"} label={int.status === "ready" ? "Connected" : "Available"} />
                      {int.status !== "ready" && <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg">Connect</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
    </div>
  );
}
