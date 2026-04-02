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
import { ModeIndicatorBanner } from "@/components/mode-aware-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAiMode, useSetAiMode, useWorkflowModes, useSetWorkflowMode,
  useWalletBalance, useWalletTransactions, useCommandCenter,
  useGHLConfig, useSaveGHLConfig, useTestGHLConnection, useGHLCRMMode, useSetGHLCRMMode,
  useGHLFieldMapping, useSaveGHLFieldMapping, useGHLPipelineMapping, useSaveGHLPipelineMapping,
  useGHLSyncHealth, useGHLRoutingSummary, useGHLSyncLogs, useGHLRetryQueue, useGHLRetryAllFailed, useGHLSyncRetry,
  useIntegrationConnectors, useIntegrationStatus, useConnectIntegration, useDisconnectIntegration,
  useSyncHealth, useSyncLogs, useTriggerSync, useImportCsv,
  useUsers, useCreateUser, useUpdateUser, useChangeUserRole, useUpdateUserPermissions,
  useDeactivateUser, useReactivateUser, useResetUserPassword, useUserAuditLog,
} from "@/hooks/use-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, CheckCircle2, Database, Shield, Server, Users,
  Lock, Eye, Activity, Clock, Globe, Cpu, Bot, Wallet, Zap,
  TrendingUp, AlertTriangle, Loader2, Save, PlugZap, RefreshCw, Plus, ArrowRight,
  UserPlus, KeyRound, UserX, RotateCcw, X
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
  { id: "users", label: "Users & Permissions", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "audit", label: "Audit Trail", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "integration-hub", label: "Integration Hub", icon: <PlugZap className="h-3.5 w-3.5" /> },
  { id: "integrations", label: "GHL Setup", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "channels", label: "Channel Connectors", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  { id: "queue", label: "Queue & Retries", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "incidents", label: "Incident Monitor", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
];

const channelConnectors = [
  { name: "LinkedIn Profile", category: "Social", status: "available", icon: "🔗", syncMethod: "oauth" },
  { name: "LinkedIn Company Page", category: "Social", status: "available", icon: "🏢", syncMethod: "oauth" },
  { name: "LinkedIn Sales Navigator", category: "Prospecting", status: "available", icon: "🎯", syncMethod: "manual" },
  { name: "LinkedIn Ads", category: "Paid", status: "available", icon: "📢", syncMethod: "oauth" },
  { name: "Facebook Page", category: "Social", status: "available", icon: "📘", syncMethod: "oauth" },
  { name: "Meta Ads Manager", category: "Paid", status: "available", icon: "📊", syncMethod: "oauth" },
  { name: "Instagram Business", category: "Social", status: "available", icon: "📷", syncMethod: "oauth" },
  { name: "X / Twitter", category: "Social", status: "available", icon: "🐦", syncMethod: "oauth" },
  { name: "YouTube", category: "Social", status: "available", icon: "▶️", syncMethod: "oauth" },
  { name: "TikTok", category: "Social", status: "available", icon: "🎵", syncMethod: "oauth" },
  { name: "Google Ads", category: "Paid", status: "available", icon: "🔍", syncMethod: "oauth" },
  { name: "Google Business Profile", category: "Social", status: "available", icon: "📍", syncMethod: "oauth" },
  { name: "Apollo.io", category: "Prospecting", status: "available", icon: "🚀", syncMethod: "api_key" },
  { name: "Clay", category: "Prospecting", status: "available", icon: "🧱", syncMethod: "api_key" },
  { name: "Hunter.io", category: "Prospecting", status: "available", icon: "📧", syncMethod: "api_key" },
  { name: "Ocean.io", category: "Prospecting", status: "available", icon: "🌊", syncMethod: "api_key" },
  { name: "PMG Website", category: "Website", status: "available", icon: "🌐", syncMethod: "webhook" },
  { name: "Landing Pages", category: "Website", status: "available", icon: "📄", syncMethod: "webhook" },
  { name: "Email Provider", category: "Communication", status: "available", icon: "✉️", syncMethod: "api_key" },
  { name: "SMS Provider", category: "Communication", status: "available", icon: "💬", syncMethod: "api_key" },
  { name: "VoIP / Calling", category: "Communication", status: "available", icon: "📞", syncMethod: "api_key" },
  { name: "Calendar (Google/Outlook)", category: "Communication", status: "available", icon: "📅", syncMethod: "oauth" },
  { name: "Webinar Platform", category: "Website", status: "available", icon: "🎤", syncMethod: "api_key" },
  { name: "Chatbot / Widget", category: "Website", status: "available", icon: "🤖", syncMethod: "webhook" },
];

const userPermissions = [
  "Command Center", "Intelligence", "Outreach", "Marketing", "Production",
  "Execution", "CRM Pipeline", "Communications", "Finance & Legal",
  "Reports & Archive", "System Admin", "AI Mode Control", "Wallet Access",
  "Integration Management", "User Management", "Publishing Rights",
  "Approval Authority", "Manual Integration"
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
  const { data: fieldMappingData } = useGHLFieldMapping();
  const saveFieldMapping = useSaveGHLFieldMapping();
  const { data: pipelineMappingData } = useGHLPipelineMapping();
  const savePipelineMapping = useSaveGHLPipelineMapping();
  const { data: ghlSyncHealth } = useGHLSyncHealth();
  const { data: routingSummary } = useGHLRoutingSummary();
  const { data: ghlSyncLogsData } = useGHLSyncLogs();
  const { data: retryQueueData } = useGHLRetryQueue();
  const retryAllFailed = useGHLRetryAllFailed();
  const syncRetry = useGHLSyncRetry();
  const { data: connectors } = useIntegrationConnectors();
  const { data: integrationStatus } = useIntegrationStatus();
  const connectIntegration = useConnectIntegration();
  const disconnectIntegration = useDisconnectIntegration();
  const { data: syncHealthData } = useSyncHealth();
  const triggerSync = useTriggerSync();
  const importCsv = useImportCsv();
  const { data: usersData } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const changeRole = useChangeUserRole();
  const updatePermissions = useUpdateUserPermissions();
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();
  const resetPassword = useResetUserPassword();
  const { data: auditLog } = useUserAuditLog({ limit: 50 });
  const { toast } = useToast();
  const [ghlForm, setGhlForm] = useState({ apiKey: "", locationId: "", webhookUrl: "" });
  const [connectForm, setConnectForm] = useState({ provider: "", apiKey: "" });
  const [csvForm, setCsvForm] = useState({ entityType: "leads", csvContent: "", dryRun: true });
  const [fieldMapEdits, setFieldMapEdits] = useState<Record<string, string>>({});
  const [pipelineMapEdits, setPipelineMapEdits] = useState<Record<string, string>>({});
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", name: "", password: "", role: "user", department: "", title: "" });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingPerms, setEditingPerms] = useState<any>(null);
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const connectorList = (connectors ?? []) as any[];
  const syncHealth = syncHealthData as any;

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

      <ModeIndicatorBanner />

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
                <div className="px-5 pb-4 space-y-3">
                  {(wallet?.balance ?? 0) < 100 && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <p className="text-[11px] text-red-300">Low balance alert — wallet below $100. Fund soon to avoid service interruption.</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Per-Provider Spend</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { provider: "OpenAI GPT-4o-mini", spent: txList.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0) * 0.7, color: "text-green-400" },
                        { provider: "AI Enrichment", spent: txList.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0) * 0.2, color: "text-blue-400" },
                        { provider: "AI Scoring", spent: txList.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0) * 0.08, color: "text-yellow-400" },
                        { provider: "Report Gen", spent: txList.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0) * 0.02, color: "text-crimson" },
                      ].map((p) => (
                        <div key={p.provider} className="p-2 rounded-lg glass-surface">
                          <p className={`text-xs font-bold tabular-nums ${p.color}`}>${p.spent.toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground">{p.provider}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recent Transactions</p>
                    {txList.slice(0, 6).map((tx: any, i: number) => (
                      <div key={tx.id ?? i} className="flex items-center justify-between p-2 rounded-lg glass-surface mb-1">
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

        {activeTab === "users" && (() => {
          const usersList = (usersData ?? []) as any[];
          const filteredUsers = userRoleFilter === "all" ? usersList : usersList.filter((u: any) => u.role === userRoleFilter);
          const roleCounts = { super_admin: 0, admin: 0, manager: 0, user: 0 };
          usersList.forEach((u: any) => { if (roleCounts[u.role as keyof typeof roleCounts] !== undefined) roleCounts[u.role as keyof typeof roleCounts]++; });
          const roleColor = (r: string) => r === "super_admin" ? "text-crimson border-crimson/30" : r === "admin" ? "text-yellow-400 border-yellow-500/30" : r === "manager" ? "text-blue-400 border-blue-500/30" : "text-muted-foreground";
          const roleLabel = (r: string) => r === "super_admin" ? "Super Admin" : r === "admin" ? "Admin" : r === "manager" ? "Manager" : "User";
          const aiPrivLabel = (gp: any) => !gp ? "Default" : gp.aiModePrivileges === "full" ? "Full" : gp.aiModePrivileges === "hybrid_only" ? "Hybrid" : gp.aiModePrivileges === "read_only" ? "Read Only" : "None";

          const permCategories = [
            { key: "domainAccess", label: "Domain Access", options: ["dashboard", "intelligence", "outreach", "marketing", "production", "execution", "crm", "communications", "finance", "reports", "admin", "agents", "channels", "system", "quality", "automation"] },
            { key: "approvalRights", label: "Approval Rights", options: ["proposals", "deals", "invoices", "contracts", "campaigns", "content", "budgets", "users"] },
            { key: "publishingRights", label: "Publishing Rights", options: ["content", "campaigns", "landing_pages", "forms", "reports", "emails"] },
            { key: "financialVisibility", label: "Financial Visibility", options: ["invoices", "revenue", "wallet_balance", "cost_data", "budgets", "forecasts", "thresholds"] },
            { key: "crmVisibility", label: "CRM Visibility", options: ["leads", "contacts", "companies", "opportunities", "pipelines", "activities"] },
            { key: "archiveVisibility", label: "Archive Visibility", options: ["reports", "archived_data", "audit_logs", "knowledge_base"] },
            { key: "integrationAccess", label: "Integration Access", options: ["connect", "disconnect", "configure", "sync", "import", "export"] },
            { key: "walletPermissions", label: "Wallet Permissions", options: ["fund", "set_thresholds", "view_transactions", "view_balance", "configure_providers"] },
            { key: "manualIntegrationPermissions", label: "Manual Integration", options: ["csv_import", "csv_export", "field_mapping", "reconciliation", "manual_sync"] },
          ];

          return (
          <div className="space-y-6">
            {showCreateUser && (
              <GlassCard glow="crimson" className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4 text-crimson" />Create New User</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateUser(false)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label className="text-xs">Full Name *</Label><Input className="mt-1 text-xs h-8" value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" /></div>
                  <div><Label className="text-xs">Email *</Label><Input className="mt-1 text-xs h-8" value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="john@pmggroup-llc.com" /></div>
                  <div><Label className="text-xs">Password *</Label><Input className="mt-1 text-xs h-8" type="password" value={createForm.password} onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" /></div>
                  <div><Label className="text-xs">Role</Label>
                    <Select value={createForm.role} onValueChange={(v) => setCreateForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Department</Label><Input className="mt-1 text-xs h-8" value={createForm.department} onChange={(e) => setCreateForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Sales" /></div>
                  <div><Label className="text-xs">Title</Label><Input className="mt-1 text-xs h-8" value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Sales Manager" /></div>
                </div>
                <div className="px-5 pb-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                  <Button className="btn-premium text-white text-xs" disabled={!createForm.email || !createForm.name || !createForm.password || createForm.password.length < 8}
                    onClick={() => createUser.mutate(createForm, {
                      onSuccess: () => { toast({ title: "User created successfully" }); setShowCreateUser(false); setCreateForm({ email: "", name: "", password: "", role: "user", department: "", title: "" }); },
                      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                    })}>
                    {createUser.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}Create User
                  </Button>
                </div>
              </GlassCard>
            )}

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold">User Management</h3>
                  <div className="flex gap-1">
                    {["all", "super_admin", "admin", "manager", "user"].map((r) => (
                      <Button key={r} variant={userRoleFilter === r ? "default" : "ghost"} size="sm" className={`h-6 px-2 text-[10px] ${userRoleFilter === r ? "bg-crimson/20 text-crimson" : ""}`}
                        onClick={() => setUserRoleFilter(r)}>
                        {r === "all" ? `All (${usersList.length})` : `${roleLabel(r)} (${roleCounts[r as keyof typeof roleCounts]})`}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg" onClick={() => setShowCreateUser(true)}>
                  <UserPlus className="h-3 w-3 mr-1" />Add User
                </Button>
              </div>
              <div className="px-5 pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-2 px-2">User</th>
                      <th className="text-left py-2 px-2">Role</th>
                      <th className="text-left py-2 px-2">Department</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">AI Privileges</th>
                      <th className="text-left py-2 px-2">Domains</th>
                      <th className="text-left py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${u.isActive ? "bg-crimson/20" : "bg-muted"} flex items-center justify-center text-[9px] font-bold`}>
                              {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-[9px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Select value={u.role} onValueChange={(v) => changeRole.mutate({ id: u.id, role: v }, {
                            onSuccess: () => toast({ title: `Role changed to ${roleLabel(v)}` }),
                            onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                          })}>
                            <SelectTrigger className={`h-6 text-[10px] w-[110px] border ${roleColor(u.role)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">{u.department || "—"}</td>
                        <td className="py-2 px-2">
                          {u.isActive
                            ? <StatusBadge variant="active" label="Active" />
                            : <StatusBadge variant="inactive" label="Deactivated" />}
                        </td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-[9px]">{aiPrivLabel(u.governancePermissions)}</Badge></td>
                        <td className="py-2 px-2">
                          <span className="text-[10px] text-muted-foreground">
                            {u.governancePermissions?.domainAccess?.length ?? 0} domains
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditingPerms(u)}>
                              <KeyRound className="h-3 w-3 mr-0.5" />Permissions
                            </Button>
                            {u.isActive ? (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-crimson" onClick={() =>
                                deactivateUser.mutate(u.id, {
                                  onSuccess: () => toast({ title: "User deactivated" }),
                                  onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                                })}>
                                <UserX className="h-3 w-3 mr-0.5" />Deactivate
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-emerald-400" onClick={() =>
                                reactivateUser.mutate(u.id, {
                                  onSuccess: () => toast({ title: "User reactivated" }),
                                  onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                                })}>
                                <RotateCcw className="h-3 w-3 mr-0.5" />Reactivate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {editingPerms && (
              <GlassCard glow="blue" className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-info" />
                    Governance Permissions — {editingPerms.name}
                    <Badge variant="outline" className={`text-[9px] ${roleColor(editingPerms.role)}`}>{roleLabel(editingPerms.role)}</Badge>
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditingPerms(null)}>Close</Button>
                    <Button className="btn-premium text-white text-xs" onClick={() => {
                      const perms = editingPerms.governancePermissions || {};
                      updatePermissions.mutate({ id: editingPerms.id, permissions: perms }, {
                        onSuccess: () => { toast({ title: "Permissions saved" }); setEditingPerms(null); },
                        onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                      });
                    }}>
                      <Save className="h-3 w-3 mr-1" />Save Permissions
                    </Button>
                  </div>
                </div>
                <div className="px-5 pb-4 space-y-4">
                  <div className="p-3 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold">AI Mode Privileges</Label>
                      <Select value={editingPerms.governancePermissions?.aiModePrivileges || "read_only"} onValueChange={(v) =>
                        setEditingPerms((p: any) => ({ ...p, governancePermissions: { ...p.governancePermissions, aiModePrivileges: v } }))}>
                        <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Access</SelectItem>
                          <SelectItem value="hybrid_only">Hybrid Only</SelectItem>
                          <SelectItem value="read_only">Read Only</SelectItem>
                          <SelectItem value="none">No Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {permCategories.map(({ key, label, options }) => {
                    const currentValues: string[] = editingPerms.governancePermissions?.[key] || [];
                    return (
                      <div key={key} className="p-3 rounded-lg glass-surface">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-semibold">{label}</Label>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] text-emerald-400" onClick={() =>
                              setEditingPerms((p: any) => ({ ...p, governancePermissions: { ...p.governancePermissions, [key]: [...options] } }))}>All</Button>
                            <Button variant="ghost" size="sm" className="h-5 text-[9px] text-crimson" onClick={() =>
                              setEditingPerms((p: any) => ({ ...p, governancePermissions: { ...p.governancePermissions, [key]: [] } }))}>None</Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {options.map((opt) => {
                            const active = currentValues.includes(opt);
                            return (
                              <button key={opt}
                                className={`px-2 py-0.5 rounded text-[10px] border transition-all ${active ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-white/[0.02] border-white/10 text-muted-foreground hover:bg-white/5"}`}
                                onClick={() => setEditingPerms((p: any) => ({
                                  ...p, governancePermissions: {
                                    ...p.governancePermissions,
                                    [key]: active ? currentValues.filter((v: string) => v !== opt) : [...currentValues, opt],
                                  },
                                }))}>
                                {active ? <CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" /> : <Lock className="h-2.5 w-2.5 inline mr-0.5" />}
                                {opt.replace(/_/g, " ")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="p-3 rounded-lg glass-surface">
                    <Label className="text-xs font-semibold">Action Permissions</Label>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["create", "read", "update", "delete"].map((act) => {
                        const ap = editingPerms.governancePermissions?.actionPermissions?.["*"] || [];
                        const active = ap.includes(act);
                        return (
                          <button key={act}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-all ${active ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-white/[0.02] border-white/10 text-muted-foreground hover:bg-white/5"}`}
                            onClick={() => setEditingPerms((p: any) => ({
                              ...p, governancePermissions: {
                                ...p.governancePermissions,
                                actionPermissions: { "*": active ? ap.filter((v: string) => v !== act) : [...ap, act] },
                              },
                            }))}>
                            {active ? <CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" /> : <Lock className="h-2.5 w-2.5 inline mr-0.5" />}
                            {act}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Role-Based Access Control</h3>
              </div>
              <div className="px-5 pb-4 space-y-3">
                {roles.map((r) => {
                  const count = roleCounts[r.role.toLowerCase().replace(" ", "_") as keyof typeof roleCounts] ?? 0;
                  return (
                  <div key={r.role} className="p-4 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Shield className={`h-5 w-5 ${r.color}`} />
                        <div>
                          <h3 className="font-semibold text-sm">{r.role}</h3>
                          <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{count} users</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.role === "Super Admin" && ["All Modules", "All Governance", "All Permissions", "All Financials", "System Config", "Audit Logs", "User Management"].map((p) => <Badge key={p} className="text-[8px] bg-crimson/10 text-crimson border-crimson/20">{p}</Badge>)}
                      {r.role === "Admin" && ["All Domains", "Approvals", "Financial View", "User Management", "Reports", "Integrations"].map((p) => <Badge key={p} className="text-[8px] bg-warning/10 text-warning border-warning/20">{p}</Badge>)}
                      {r.role === "Manager" && ["10 Domains", "Deal Approvals", "CSV Import/Export", "CRM Full", "Basic Reports"].map((p) => <Badge key={p} className="text-[8px] bg-info/10 text-info border-info/20">{p}</Badge>)}
                      {r.role === "User" && ["4 Domains", "Read Only", "Limited CRM", "No Admin"].map((p) => <Badge key={p} className="text-[8px] bg-muted text-muted-foreground">{p}</Badge>)}
                    </div>
                  </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-info" />
                <h3 className="text-sm font-semibold">Governance Audit Trail</h3>
              </div>
              <div className="px-5 pb-4">
                {(auditLog ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No governance events recorded yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {(auditLog ?? []).map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-2 rounded-lg glass-surface text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            log.action === "user_created" ? "bg-emerald-400" :
                            log.action === "user_deactivated" ? "bg-crimson" :
                            log.action === "role_changed" ? "bg-yellow-400" :
                            log.action === "permissions_updated" ? "bg-blue-400" :
                            "bg-muted-foreground"
                          }`} />
                          <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
                          {log.targetField && <span className="text-muted-foreground">({log.targetField})</span>}
                          {log.oldValue && log.newValue && (
                            <span className="text-muted-foreground">{log.oldValue} → {log.newValue}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{log.performedByName || `User #${log.performedBy}`}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Permission Matrix</h3></div>
              <div className="px-5 pb-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Permission</th>
                      {roles.map((r) => <th key={r.role} className={`text-center py-2 px-2 font-medium ${r.color}`}>{r.role.split(" ")[0]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {userPermissions.map((perm) => (
                      <tr key={perm} className="border-b border-border/20">
                        <td className="py-1.5 px-2">{perm}</td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-success mx-auto" /></td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-success mx-auto" /></td>
                        <td className="text-center">
                          {["Command Center", "Intelligence", "Outreach", "Marketing", "CRM Pipeline", "Communications", "Execution", "Reports & Archive"].includes(perm)
                            ? <CheckCircle2 className="h-3 w-3 text-success mx-auto" />
                            : <Eye className="h-3 w-3 text-warning mx-auto" />}
                        </td>
                        <td className="text-center">
                          {["Command Center", "Communications", "Execution"].includes(perm)
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
          );
        })()}

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

        {activeTab === "integration-hub" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-info">{connectorList.length || 10}</p>
                <p className="text-[10px] text-muted-foreground">Total Connectors</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-success">{connectorList.filter((c: any) => c.status === "connected").length}</p>
                <p className="text-[10px] text-muted-foreground">Connected</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-warning">{connectorList.filter((c: any) => c.status === "disconnected" || c.status === "available").length || connectorList.length || 10}</p>
                <p className="text-[10px] text-muted-foreground">Available</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${syncHealth?.healthy ? "bg-green-400" : "bg-yellow-400"}`} />
                  <p className="text-sm font-bold">{syncHealth?.healthy ? "Healthy" : "OK"}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">Sync Health</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">Integration Connectors</h3>
                </div>
                <div className="px-5 pb-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {(connectorList.length > 0 ? connectorList : [
                    { id: "ghl", name: "GoHighLevel", status: "available", type: "oauth2", category: "CRM" },
                    { id: "hubspot", name: "HubSpot", status: "available", type: "oauth2", category: "CRM" },
                    { id: "salesforce", name: "Salesforce", status: "available", type: "oauth2", category: "CRM" },
                    { id: "slack", name: "Slack", status: "available", type: "oauth2", category: "Communication" },
                    { id: "google_sheets", name: "Google Sheets", status: "available", type: "oauth2", category: "Data" },
                    { id: "stripe", name: "Stripe", status: "available", type: "api_key", category: "Payments" },
                    { id: "mailchimp", name: "Mailchimp", status: "available", type: "api_key", category: "Email" },
                    { id: "apollo", name: "Apollo.io", status: "available", type: "api_key", category: "Prospecting" },
                    { id: "linkedin", name: "LinkedIn", status: "available", type: "oauth2", category: "Social" },
                    { id: "zapier", name: "Zapier Webhooks", status: "available", type: "webhook", category: "Automation" },
                  ]).map((c: any, i: number) => (
                    <div key={c.id ?? i} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{c.name}</p>
                        <p className="text-[9px] text-muted-foreground">{c.category ?? c.type} &bull; {c.type ?? "api_key"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge variant={c.status === "connected" ? "active" : "pending"} label={c.status} />
                        {c.status === "connected" ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => triggerSync.mutate(c.id, {
                              onSuccess: () => toast({ title: `Sync triggered for ${c.name}` }),
                              onError: (err: any) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
                            })} disabled={triggerSync.isPending}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-400" onClick={() => disconnectIntegration.mutate(c.id, {
                              onSuccess: () => toast({ title: `${c.name} disconnected` }),
                            })}>
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-green-400" onClick={async () => {
                            if (c.type === "oauth2") {
                              try {
                                const redirectUri = `${window.location.origin}/api/integration-hub/oauth/callback`;
                                const resp = await fetch("/api/integration-hub/oauth/authorize", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ provider: c.id, clientId: c.id, redirectUri }),
                                });
                                const data = await resp.json();
                                if (data.authorizeUrl) window.open(data.authorizeUrl, "_blank");
                                else toast({ title: "OAuth not configured", description: data.error || "No authorize URL returned", variant: "destructive" });
                              } catch (err: any) {
                                toast({ title: "OAuth error", description: err.message, variant: "destructive" });
                              }
                            } else {
                              setConnectForm({ provider: c.id, apiKey: "" });
                            }
                          }}>
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <div className="space-y-6">
                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-warning" />
                    <h3 className="text-sm font-semibold">API Key Connect</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-3">
                    <Input placeholder="Provider ID (e.g. stripe, apollo)" value={connectForm.provider} onChange={(e) => setConnectForm(p => ({ ...p, provider: e.target.value }))} className="bg-white/5 border-white/10 h-8 text-xs" />
                    <Input placeholder="API Key" type="password" value={connectForm.apiKey} onChange={(e) => setConnectForm(p => ({ ...p, apiKey: e.target.value }))} className="bg-white/5 border-white/10 h-8 text-xs" />
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                      if (!connectForm.provider || !connectForm.apiKey) return;
                      connectIntegration.mutate(connectForm, {
                        onSuccess: () => { toast({ title: "Connected!" }); setConnectForm({ provider: "", apiKey: "" }); },
                        onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                      });
                    }} disabled={connectIntegration.isPending || !connectForm.provider || !connectForm.apiKey}>
                      {connectIntegration.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PlugZap className="h-3 w-3 mr-1" />}
                      Connect Provider
                    </Button>
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Database className="h-4 w-4 text-info" />
                    <h3 className="text-sm font-semibold">CSV Import</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-3">
                    <select value={csvForm.entityType} onChange={(e) => setCsvForm(p => ({ ...p, entityType: e.target.value }))} className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white">
                      <option value="leads">Leads</option>
                      <option value="contacts">Contacts</option>
                      <option value="companies">Companies</option>
                      <option value="opportunities">Opportunities</option>
                    </select>
                    <textarea
                      placeholder="Paste CSV content here (header row + data rows)..."
                      value={csvForm.csvContent}
                      onChange={(e) => setCsvForm(p => ({ ...p, csvContent: e.target.value }))}
                      className="w-full h-24 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white font-mono resize-none"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input type="checkbox" checked={csvForm.dryRun} onChange={(e) => setCsvForm(p => ({ ...p, dryRun: e.target.checked }))} className="rounded" />
                        Dry Run (preview only)
                      </label>
                      <Button variant="outline" size="sm" className="ml-auto text-xs" onClick={() => {
                        if (!csvForm.csvContent) return;
                        importCsv.mutate({ entityType: csvForm.entityType, csvContent: csvForm.csvContent, fieldMapping: {}, skipDuplicates: true, dryRun: csvForm.dryRun }, {
                          onSuccess: (data: any) => toast({ title: csvForm.dryRun ? "Dry run complete" : "Import complete", description: `${data?.imported ?? data?.count ?? 0} records` }),
                          onError: (err: any) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
                        });
                      }} disabled={importCsv.isPending || !csvForm.csvContent}>
                        {importCsv.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Database className="h-3 w-3 mr-1" />}
                        {csvForm.dryRun ? "Preview Import" : "Import Data"}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Field Mapping — PMG → GHL</h3>
                  <Badge variant="outline" className="text-[10px]">Data Sync</Badge>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {Object.entries(fieldMappingData?.defaults ?? {
                    contactName: "contact_name", companyName: "company_name", email: "email",
                    phone: "phone", fitScore: "custom_fit_score", source: "source", status: "status"
                  }).map(([pmgField, defaultGhl]) => (
                    <div key={pmgField} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground">PMG: {pmgField}</Label>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Input
                          className="bg-white/5 border-white/10 text-white text-xs h-7"
                          value={fieldMapEdits[pmgField] ?? (fieldMappingData?.fieldMapping?.[pmgField] || defaultGhl as string)}
                          onChange={e => setFieldMapEdits(prev => ({ ...prev, [pmgField]: e.target.value }))}
                          placeholder={defaultGhl as string}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg w-full mt-2"
                    disabled={saveFieldMapping.isPending || Object.keys(fieldMapEdits).length === 0}
                    onClick={async () => {
                      const merged = { ...(fieldMappingData?.fieldMapping ?? {}), ...fieldMapEdits };
                      await saveFieldMapping.mutateAsync(merged);
                      setFieldMapEdits({});
                      toast({ title: "Field mapping saved" });
                    }}
                  >
                    {saveFieldMapping.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save Field Mapping
                  </Button>
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Pipeline Mapping — Stages</h3>
                  <Badge variant="outline" className="text-[10px]">Deal Flow</Badge>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {(pipelineMappingData?.pmgStages ?? ["discovery", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]).map((stage: string) => (
                    <div key={stage} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground capitalize">PMG: {stage.replace(/_/g, " ")}</Label>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <Input
                          className="bg-white/5 border-white/10 text-white text-xs h-7"
                          value={pipelineMapEdits[stage] ?? (pipelineMappingData?.pipelineMapping?.[stage] || "")}
                          onChange={e => setPipelineMapEdits(prev => ({ ...prev, [stage]: e.target.value }))}
                          placeholder={`GHL stage for ${stage}`}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg w-full mt-2"
                    disabled={savePipelineMapping.isPending || Object.keys(pipelineMapEdits).length === 0}
                    onClick={async () => {
                      const merged = { ...(pipelineMappingData?.pipelineMapping ?? {}), ...pipelineMapEdits };
                      await savePipelineMapping.mutateAsync(merged);
                      setPipelineMapEdits({});
                      toast({ title: "Pipeline mapping saved" });
                    }}
                  >
                    {savePipelineMapping.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save Pipeline Mapping
                  </Button>
                </div>
              </GlassCard>
            </div>

            <GlassCard glow="blue" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">Sync Health Dashboard</h3>
                </div>
                <div className="flex items-center gap-2">
                  {(retryQueueData?.queue ?? []).length > 0 && (
                    <Button
                      className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg"
                      onClick={() => retryAllFailed.mutate(undefined, { onSuccess: (r: any) => toast({ title: `Retried ${r?.retried ?? 0} failed syncs` }) })}
                      disabled={retryAllFailed.isPending}
                    >
                      {retryAllFailed.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Retry All Failed
                    </Button>
                  )}
                  <Badge variant="outline" className="text-[10px]">Live</Badge>
                </div>
              </div>
              <div className="px-5 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-lg glass-surface text-center">
                    <p className="text-lg font-bold text-success">{(ghlSyncHealth as any)?.totalSynced ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Synced</p>
                  </div>
                  <div className="p-3 rounded-lg glass-surface text-center">
                    <p className="text-lg font-bold text-red-400">{(ghlSyncHealth as any)?.totalFailed ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                  <div className="p-3 rounded-lg glass-surface text-center">
                    <p className="text-lg font-bold text-yellow-400">{(retryQueueData?.queue ?? []).length}</p>
                    <p className="text-[10px] text-muted-foreground">In Retry Queue</p>
                  </div>
                  <div className="p-3 rounded-lg glass-surface text-center">
                    <p className="text-lg font-bold text-info">{(ghlSyncHealth as any)?.healthScore ?? "—"}%</p>
                    <p className="text-[10px] text-muted-foreground">Health Score</p>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(ghlSyncLogsData?.logs ?? []).slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-green-400" : log.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                        <span className="truncate">{log.entityType}#{log.entityId}</span>
                        <span className="text-muted-foreground truncate">{log.direction ?? "outbound"} · {log.action ?? "sync"}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {log.status === "failed" && (
                          <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px] text-red-400"
                            onClick={() => syncRetry.mutate(log.id, { onSuccess: () => toast({ title: "Retry triggered" }) })}>
                            Retry
                          </Button>
                        )}
                        <span className="text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
                      </div>
                    </div>
                  ))}
                  {(ghlSyncLogsData?.logs ?? []).length === 0 && (
                    <div className="py-4 text-center text-muted-foreground text-xs">No sync logs yet</div>
                  )}
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

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Tool Orchestration Engine</h3>
                <Badge variant="outline" className="text-[10px]">Auto-Select Best Tool</Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { name: "Perplexity", domain: "Research", desc: "Market research, competitor analysis" },
                  { name: "Exa.ai", domain: "Research", desc: "Real-time web intelligence" },
                  { name: "Surfer SEO", domain: "Marketing", desc: "SEO optimization & content scoring" },
                  { name: "Jasper", domain: "Marketing", desc: "Content drafting & copywriting" },
                  { name: "Brand24", domain: "Marketing", desc: "Brand sentiment monitoring" },
                  { name: "Midjourney", domain: "Production", desc: "Visual concept generation" },
                  { name: "ElevenLabs", domain: "Production", desc: "Voiceover & voice AI" },
                  { name: "Luma", domain: "Production", desc: "Video generation" },
                  { name: "Descript", domain: "Production", desc: "Video editing & post-production" },
                  { name: "Fathom / Otter.ai", domain: "Communication", desc: "Meeting transcription & analysis" },
                  { name: "Lavender", domain: "Outreach", desc: "Email quality optimization" },
                  { name: "Spellbook", domain: "Legal", desc: "Contract assistance" },
                  { name: "Ramp", domain: "Finance", desc: "Spending & financial visibility" },
                  { name: "Make.com", domain: "Automation", desc: "Workflow automation" },
                  { name: "Zapier Central", domain: "Automation", desc: "Cross-system automation" },
                ].map((tool) => (
                  <div key={tool.name} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[8px] w-20 justify-center">{tool.domain}</Badge>
                      <div>
                        <p className="text-sm font-medium">{tool.name}</p>
                        <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                      </div>
                    </div>
                    <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg">Configure</Button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "channels" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Channels" value={channelConnectors.length} icon={<PlugZap className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Connected" value={0} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
              <KpiCard label="Available" value={channelConnectors.length} icon={<Globe className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Manual Mode" value={channelConnectors.filter(c => c.syncMethod === "manual").length} icon={<Activity className="h-4 w-4" />} accent="gold" />
            </div>

            {["Social", "Paid", "Prospecting", "Website", "Communication"].map(category => {
              const items = channelConnectors.filter(c => c.category === category);
              return (
                <GlassCard key={category} className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{category} Channels</h3>
                    <Badge variant="outline" className="text-[10px]">{items.length} connectors</Badge>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {items.map(ch => (
                      <div key={ch.name} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{ch.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{ch.name}</p>
                            <p className="text-[10px] text-muted-foreground">Sync: {ch.syncMethod === "oauth" ? "OAuth" : ch.syncMethod === "api_key" ? "API Key" : ch.syncMethod === "webhook" ? "Webhook" : "Manual"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge variant="pending" label="Not Connected" />
                          <div className="flex gap-1">
                            <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg">Connect</Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground">Manual</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              );
            })}

            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Manual Integration Center</h3>
                <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"><Zap className="h-3 w-3 mr-1" />CSV Import</Button>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>For tools that require manual connection, use this center to:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {["CSV Import/Export", "Manual Field Mapping", "Manual Source Assignment", "Manual Lead Import", "Manual Sync Trigger", "Manual Attribution Correction", "Manual Channel Reconciliation", "Manual Account Refresh", "Manual Sales Tool Upload"].map(item => (
                    <div key={item} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors text-center">
                      <p className="text-[10px] font-medium text-white">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        )}
        {activeTab === "queue" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Queue Depth", value: "24", accent: "text-info" },
                { label: "Processing Rate", value: "12/min", accent: "text-success" },
                { label: "Dead Letters", value: "3", accent: "text-crimson" },
                { label: "Avg Latency", value: "240ms", accent: "text-warning" },
              ].map((kpi) => (
                <GlassCard key={kpi.label} className="text-center">
                  <p className={`text-2xl font-bold ${kpi.accent}`}>{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                </GlassCard>
              ))}
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Job Queue Monitor</h3>
                <div className="flex gap-1.5">
                  <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg"><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
                  <Button className="btn-premium text-white text-xs px-2 py-1 rounded-lg">Retry All Failed</Button>
                </div>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { id: "JOB-001", type: "ai_report_generation", domain: "reports", status: "processing", attempts: 1, created: "2 min ago", priority: "high" },
                  { id: "JOB-002", type: "lead_enrichment", domain: "outreach", status: "queued", attempts: 0, created: "5 min ago", priority: "medium" },
                  { id: "JOB-003", type: "email_delivery", domain: "communications", status: "failed", attempts: 3, created: "15 min ago", priority: "high" },
                  { id: "JOB-004", type: "ghl_sync", domain: "system", status: "processing", attempts: 1, created: "1 min ago", priority: "critical" },
                  { id: "JOB-005", type: "invoice_reminder", domain: "finance", status: "completed", attempts: 1, created: "30 min ago", priority: "medium" },
                  { id: "JOB-006", type: "campaign_analytics", domain: "marketing", status: "queued", attempts: 0, created: "8 min ago", priority: "low" },
                  { id: "JOB-007", type: "content_generation", domain: "production", status: "dead_letter", attempts: 5, created: "1 hour ago", priority: "medium" },
                ].map((job) => (
                  <div key={job.id} className={`flex items-center justify-between p-3 rounded-lg ${job.status === "dead_letter" ? "border border-crimson/20 bg-crimson/5" : job.status === "failed" ? "border border-warning/20 bg-warning/5" : "glass-surface"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${job.status === "processing" ? "bg-info animate-pulse" : job.status === "completed" ? "bg-success" : job.status === "queued" ? "bg-warning" : "bg-crimson"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{job.id}: {job.type.replace(/_/g, " ")}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px]">{job.domain}</Badge>
                          <Badge variant="outline" className={`text-[9px] ${job.priority === "critical" ? "border-crimson/30 text-crimson" : ""}`}>{job.priority}</Badge>
                          <span className="text-[10px] text-muted-foreground">{job.attempts} attempts · {job.created}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge variant={job.status === "completed" ? "active" : job.status === "processing" ? "awaiting-review" : job.status === "failed" || job.status === "dead_letter" ? "critical" : "pending"} label={job.status.replace("_", " ")} />
                      {(job.status === "failed" || job.status === "dead_letter") && (
                        <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg">Retry</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Rate Control</h3></div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { service: "OpenAI API", limit: "60 req/min", current: "42 req/min", usage: 70, status: "normal" },
                  { service: "GoHighLevel API", limit: "100 req/min", current: "28 req/min", usage: 28, status: "normal" },
                  { service: "Email Provider", limit: "500/hr", current: "120/hr", usage: 24, status: "normal" },
                  { service: "LinkedIn API", limit: "100/day", current: "78/day", usage: 78, status: "warning" },
                ].map((svc) => (
                  <div key={svc.service} className="p-3 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium">{svc.service}</p>
                      <span className="text-[10px] text-muted-foreground">{svc.current} / {svc.limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${svc.usage > 80 ? "bg-crimson" : svc.usage > 60 ? "bg-warning" : "bg-success"}`} style={{ width: `${svc.usage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "incidents" && (
          <div className="space-y-6">
            <GlassCard glow="crimson" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Active Incidents</h3>
                </div>
                <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="h-3 w-3 mr-1" />Report Incident</Button>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { id: "INC-001", title: "LinkedIn API Rate Limit Approaching", severity: "warning", domain: "outreach", started: "45 min ago", status: "monitoring", impact: "Lead enrichment may be delayed" },
                  { id: "INC-002", title: "Email Delivery Failures — SMTP Timeout", severity: "critical", domain: "communications", started: "2 hours ago", status: "investigating", impact: "Invoice reminders and follow-up emails blocked" },
                ].map((inc) => (
                  <div key={inc.id} className={`p-4 rounded-lg border ${inc.severity === "critical" ? "border-crimson/30 bg-crimson/5" : "border-warning/20 bg-warning/5"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${inc.severity === "critical" ? "text-crimson" : "text-warning"}`} />
                        <p className="text-sm font-semibold">{inc.title}</p>
                      </div>
                      <StatusBadge variant={inc.severity === "critical" ? "critical" : "warning"} label={inc.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px]">{inc.id}</Badge>
                      <Badge variant="outline" className="text-[9px]">{inc.domain}</Badge>
                      <span className="text-[10px] text-muted-foreground">Started: {inc.started}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Impact: {inc.impact}</p>
                    <div className="flex gap-1.5 mt-2">
                      <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg">Acknowledge</Button>
                      <Button className="bg-success/20 hover:bg-success/30 text-success text-xs px-2 py-1 rounded-lg">Resolve</Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Recent Resolved Incidents</h3></div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { id: "INC-098", title: "GHL Webhook Delivery Failure", severity: "high", domain: "system", resolved: "2 days ago", duration: "4 hours", rootCause: "Webhook URL misconfiguration after GHL update" },
                  { id: "INC-097", title: "AI Report Generation Timeout", severity: "medium", domain: "reports", resolved: "5 days ago", duration: "1 hour", rootCause: "OpenAI API latency spike during peak hours" },
                  { id: "INC-096", title: "Database Connection Pool Exhaustion", severity: "critical", domain: "system", resolved: "1 week ago", duration: "30 min", rootCause: "Connection leak in long-running queries — pool config updated" },
                ].map((inc) => (
                  <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{inc.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{inc.id}</Badge>
                        <Badge variant="outline" className="text-[9px]">{inc.domain}</Badge>
                        <span className="text-[10px] text-muted-foreground">Duration: {inc.duration} · {inc.resolved}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Root Cause: {inc.rootCause}</p>
                    </div>
                    <StatusBadge variant="active" label="Resolved" />
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">System Observability</h3></div>
              <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { metric: "API Uptime", value: "99.8%", period: "30d", status: "good" },
                  { metric: "Avg Response Time", value: "180ms", period: "24h", status: "good" },
                  { metric: "Error Rate", value: "0.3%", period: "24h", status: "good" },
                  { metric: "DB Query P95", value: "45ms", period: "24h", status: "good" },
                  { metric: "AI Run Success", value: "94%", period: "7d", status: "warning" },
                  { metric: "Queue Throughput", value: "720/hr", period: "24h", status: "good" },
                  { metric: "Memory Usage", value: "68%", period: "current", status: "warning" },
                  { metric: "Storage Used", value: "2.4GB", period: "total", status: "good" },
                ].map((m) => (
                  <div key={m.metric} className="p-3 rounded-lg glass-surface text-center">
                    <p className={`text-lg font-bold ${m.status === "good" ? "text-success" : "text-warning"}`}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.metric}</p>
                    <p className="text-[9px] text-muted-foreground">{m.period}</p>
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
