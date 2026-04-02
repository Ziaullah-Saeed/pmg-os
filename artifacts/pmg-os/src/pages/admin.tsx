import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeIndicatorBanner, ModeAwareWrapper, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import { useSops, useCreateSop, useQualityIssues, useTestSuites, useTestHistory, useDummyModeStatus, useRunTestSuite, useToggleDummyMode, useAuditEvents, useScheduledJobs, useEventBusLog } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  BookOpen, FileText, AlertTriangle, Plus, Search, FolderOpen,
  ClipboardList, Scale, ArrowUpCircle, Archive, CheckCircle2, Loader2, Eye,
  FlaskConical, Bot, Activity, Calendar, Play, Pause, Shield, Zap
} from "lucide-react";

const tabs = [
  { id: "sops", label: "SOPs", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: "testing", label: "Testing", icon: <FlaskConical className="h-3.5 w-3.5" /> },
  { id: "audit", label: "Audit Trail", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "scheduler", label: "Scheduler", icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: "policies", label: "Policies", icon: <Scale className="h-3.5 w-3.5" /> },
  { id: "escalations", label: "Escalations", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
];

const builtInPolicies = [
  { id: 1, title: "Data Retention Policy", category: "compliance", status: "active", version: "2.1", domain: "system" },
  { id: 2, title: "Client Communication Standards", category: "operations", status: "active", version: "1.3", domain: "communications" },
  { id: 3, title: "Incident Response Plan", category: "security", status: "active", version: "3.0", domain: "system" },
  { id: 4, title: "AI Usage & Governance Policy", category: "ai", status: "active", version: "1.0", domain: "system" },
  { id: 5, title: "Financial Approval Matrix", category: "finance", status: "active", version: "1.2", domain: "finance" },
  { id: 6, title: "Asset Production Guidelines", category: "production", status: "draft", version: "0.9", domain: "production" },
];

const workInstructions = [
  { id: 1, title: "Lead Qualification Process", domain: "crm", steps: 7, lastUpdated: "2026-03-15" },
  { id: 2, title: "Campaign Launch Checklist", domain: "marketing", steps: 12, lastUpdated: "2026-03-20" },
  { id: 3, title: "Asset Review & Approval Flow", domain: "production", steps: 5, lastUpdated: "2026-03-25" },
  { id: 4, title: "Invoice Creation & Sending", domain: "finance", steps: 6, lastUpdated: "2026-03-28" },
  { id: 5, title: "Outreach Sequence Setup", domain: "outreach", steps: 8, lastUpdated: "2026-03-30" },
];

const escalationTemplates = [
  { id: 1, title: "Client Escalation — Service Issue", severity: "high", triggerCondition: "Client reports unresolved issue > 48hrs", escalateTo: "Account Manager → VP Operations" },
  { id: 2, title: "Deal Stall Escalation", severity: "medium", triggerCondition: "Deal inactive > 14 days, value > $50k", escalateTo: "Sales Rep → Sales Manager" },
  { id: 3, title: "AI Agent Failure", severity: "critical", triggerCondition: "Agent fails 3+ consecutive runs", escalateTo: "System Admin → CTO" },
  { id: 4, title: "Budget Overrun Alert", severity: "high", triggerCondition: "Campaign spend exceeds budget by 20%", escalateTo: "Marketing Lead → Finance" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("sops");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSop, setExpandedSop] = useState<number | null>(null);
  const [sopSearch, setSopSearch] = useState("");
  const [newSop, setNewSop] = useState({ title: "", category: "operations", content: "", domain: "system" });
  const { isHuman } = useAiModeContext();
  const { toast } = useToast();
  const { data: sops } = useSops();
  const createSop = useCreateSop();
  const { data: testSuites } = useTestSuites();
  const { data: testHistory } = useTestHistory(50);
  const { data: dummyStatus } = useDummyModeStatus();
  const runTestSuite = useRunTestSuite();
  const toggleDummy = useToggleDummyMode();
  const { data: auditEvents } = useAuditEvents(100);
  const { data: scheduledJobs } = useScheduledJobs();
  const { data: eventBusLog } = useEventBusLog();

  const suiteList = (testSuites ?? []) as any[];
  const historyList = (testHistory ?? []) as any[];
  const auditList = (auditEvents ?? []) as any[];
  const jobList = (scheduledJobs ?? []) as any[];
  const eventLog = (eventBusLog ?? []) as any[];
  const isDummyEnabled = (dummyStatus as any)?.enabled ?? false;

  const sopList = (sops ?? []) as any[];
  const filteredSops = sopSearch ? sopList.filter((s: any) => s.title?.toLowerCase().includes(sopSearch.toLowerCase()) || s.category?.toLowerCase().includes(sopSearch.toLowerCase())) : sopList;

  const handleCreateSop = () => {
    if (!newSop.title || !newSop.content) return;
    createSop.mutate({ ...newSop, createdBy: "SherShah K." }, {
      onSuccess: () => {
        toast({ title: "SOP created" });
        setShowCreate(false);
        setNewSop({ title: "", category: "operations", content: "", domain: "system" });
      },
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Administrative"
        subtitle="SOPs, policies, work instructions, escalation forms, and archives"
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />New SOP
          </Button>
        }
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active SOPs" value={sopList.filter((s: any) => s.status === "active").length + 4} icon={<BookOpen className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Policies" value={builtInPolicies.length} icon={<Scale className="h-4 w-4" />} accent="success" />
        <KpiCard label="Work Instructions" value={workInstructions.length} icon={<ClipboardList className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Escalation Templates" value={escalationTemplates.length} icon={<ArrowUpCircle className="h-4 w-4" />} accent="crimson" />
      </div>

      <ModeAwareWrapper
        domain="admin"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Administrative Workflow" steps={[
              { id: "1", title: "Review SOPs", description: "Check existing SOPs for outdated procedures and update as needed", status: "current" as const, action: "View SOPs" },
              { id: "2", title: "Update Policies", description: "Review compliance policies and ensure they reflect current regulations", status: "upcoming" as const },
              { id: "3", title: "Create Work Instructions", description: "Document step-by-step procedures for common operational tasks", status: "upcoming" as const },
              { id: "4", title: "Configure Escalations", description: "Set up escalation paths and notification rules for critical events", status: "upcoming" as const },
            ]} icon={<BookOpen className="h-5 w-5 text-blue-400" />} />
          </div>
        }
      >
        <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {activeTab === "sops" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search SOPs..." value={sopSearch} onChange={e => setSopSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 h-9" />
                </div>
              </div>

              {showCreate && (
                <GlassCard glow="crimson">
                  <h3 className="text-sm font-semibold mb-3">Create New SOP</h3>
                  <div className="space-y-3">
                    <Input placeholder="SOP Title" value={newSop.title} onChange={e => setNewSop(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={newSop.category} onChange={e => setNewSop(p => ({ ...p, category: e.target.value }))} className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white">
                        <option value="operations">Operations</option>
                        <option value="security">Security</option>
                        <option value="compliance">Compliance</option>
                        <option value="finance">Finance</option>
                        <option value="sales">Sales</option>
                        <option value="marketing">Marketing</option>
                      </select>
                      <select value={newSop.domain} onChange={e => setNewSop(p => ({ ...p, domain: e.target.value }))} className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white">
                        <option value="system">System</option>
                        <option value="crm">CRM</option>
                        <option value="marketing">Marketing</option>
                        <option value="production">Production</option>
                        <option value="finance">Finance</option>
                        <option value="outreach">Outreach</option>
                        <option value="communications">Communications</option>
                      </select>
                    </div>
                    <Textarea placeholder="SOP Content / Procedure Steps" value={newSop.content} onChange={e => setNewSop(p => ({ ...p, content: e.target.value }))} className="bg-white/5 border-white/10 min-h-[100px]" />
                    <div className="flex gap-2">
                      <Button className="btn-premium text-white text-sm" onClick={handleCreateSop} disabled={createSop.isPending}>
                        {createSop.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Create SOP
                      </Button>
                      <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    </div>
                  </div>
                </GlassCard>
              )}
              {filteredSops.map((sop: any) => (
                <GlassCard key={sop.id} className="cursor-pointer hover:border-white/10 transition-colors" onClick={() => setExpandedSop(expandedSop === sop.id ? null : sop.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg glass-surface">
                        <BookOpen className="h-4 w-4 text-crimson" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{sop.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] capitalize">{sop.category}</Badge>
                          {sop.domain && <Badge variant="outline" className="text-[9px] capitalize">{sop.domain}</Badge>}
                          <span className="text-[10px] text-muted-foreground">v{sop.version ?? "1.0"}</span>
                          {sop.createdBy && <span className="text-[10px] text-muted-foreground">by {sop.createdBy ?? sop.created_by}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={sop.status === "active" ? "active" : "draft"} label={sop.status ?? "active"} />
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  {expandedSop === sop.id && sop.content && (
                    <div className="mt-3 p-3 rounded-lg glass-surface border border-white/5">
                      <p className="text-xs text-slate-300 whitespace-pre-wrap">{sop.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">Created: {new Date(sop.createdAt ?? sop.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </GlassCard>
              ))}
              {filteredSops.length === 0 && (
                <GlassCard className="py-8 flex flex-col items-center gap-2">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{sopSearch ? "No SOPs match your search" : "No SOPs created yet. Click \"New SOP\" to start."}</p>
                </GlassCard>
              )}
            </div>
          )}

          {activeTab === "policies" && (
            <div className="space-y-4">
              {builtInPolicies.map(policy => (
                <GlassCard key={policy.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{policy.title}</h3>
                      <p className="text-xs text-muted-foreground">{policy.category} · v{policy.version} · {policy.domain}</p>
                    </div>
                    <StatusBadge variant={policy.status === "active" ? "active" : "draft"} label={policy.status} />
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {activeTab === "work-instructions" && (
            <div className="space-y-4">
              {workInstructions.map(wi => (
                <GlassCard key={wi.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{wi.title}</h3>
                      <p className="text-xs text-muted-foreground">{wi.domain} · {wi.steps} steps · Updated {wi.lastUpdated}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs">
                      <FileText className="h-3.5 w-3.5 mr-1" />View Steps
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {activeTab === "escalations" && (
            <div className="space-y-4">
              {escalationTemplates.map(esc => (
                <GlassCard key={esc.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">{esc.title}</h3>
                    <StatusBadge variant={esc.severity === "critical" ? "critical" : esc.severity === "high" ? "warning" : "pending"} label={esc.severity} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground"><span className="text-slate-400">Trigger:</span> {esc.triggerCondition}</p>
                    <p className="text-xs text-muted-foreground"><span className="text-slate-400">Path:</span> {esc.escalateTo}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {activeTab === "testing" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold text-info">{suiteList.length}</p>
                  <p className="text-[10px] text-muted-foreground">Test Suites</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold text-success">{historyList.filter((h: any) => h.status === "passed").length}</p>
                  <p className="text-[10px] text-muted-foreground">Passed</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold text-crimson">{historyList.filter((h: any) => h.status === "failed").length}</p>
                  <p className="text-[10px] text-muted-foreground">Failed</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold text-purple-400">{historyList.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Runs</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isDummyEnabled ? "bg-yellow-400" : "bg-green-400"}`} />
                    <p className="text-sm font-bold">{isDummyEnabled ? "Dummy" : "Live"}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">AI Mode</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-info" />
                      <h3 className="text-sm font-semibold">Test Suites</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        runTestSuite.mutate(undefined, {
                          onSuccess: (data: any) => toast({ title: "Tests completed", description: `${data?.summary?.totalPassed ?? 0} passed, ${data?.summary?.totalFailed ?? 0} failed` }),
                          onError: (err: any) => toast({ title: "Test run failed", description: err.message, variant: "destructive" }),
                        });
                      }}
                      disabled={runTestSuite.isPending}
                    >
                      {runTestSuite.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                      Run All
                    </Button>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {suiteList.length > 0 ? suiteList.map((suite: any, i: number) => (
                      <div key={suite.id ?? suite.name ?? i} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{suite.name ?? suite.title}</p>
                          <p className="text-[9px] text-muted-foreground">{suite.testCount ?? suite.tests?.length ?? 0} tests &bull; {suite.description ?? ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={suite.lastResult === "passed" ? "success" : suite.lastResult === "failed" ? "critical" : "pending"} label={suite.lastResult ?? "pending"} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              runTestSuite.mutate(suite.name ?? suite.id, {
                                onSuccess: (data: any) => toast({ title: `Suite "${suite.name}" completed`, description: `${data?.summary?.totalPassed ?? 0} passed, ${data?.summary?.totalFailed ?? 0} failed` }),
                                onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                              });
                            }}
                            disabled={runTestSuite.isPending}
                          >
                            <Zap className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )) : (
                      ["core", "crm", "marketing", "production", "finance", "integration", "reporting"].map((name) => (
                        <div key={name} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium capitalize">{name} Suite</p>
                            <p className="text-[9px] text-muted-foreground">Phase 10 validation tests</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              runTestSuite.mutate(name, {
                                onSuccess: (data: any) => toast({ title: `Suite "${name}" completed` }),
                                onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                              });
                            }}
                            disabled={runTestSuite.isPending}
                          >
                            <Zap className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-warning" />
                      <h3 className="text-sm font-semibold">Dummy Mode Control</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{isDummyEnabled ? "Enabled" : "Disabled"}</span>
                      <Switch
                        checked={isDummyEnabled}
                        onCheckedChange={(checked) => {
                          toggleDummy.mutate(checked, {
                            onSuccess: () => toast({ title: `Dummy mode ${checked ? "enabled" : "disabled"}` }),
                            onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                          });
                        }}
                        disabled={toggleDummy.isPending}
                      />
                    </div>
                  </div>
                  <div className="px-5 pb-4 space-y-3">
                    <div className={`p-3 rounded-lg ${isDummyEnabled ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
                      <p className="text-xs font-medium">{isDummyEnabled ? "Dummy Mode Active" : "Live AI Active"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {isDummyEnabled
                          ? "AI calls return mock responses. No wallet charges. Admin-only access."
                          : "AI calls use OpenAI API. Wallet charges apply per operation."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Features</p>
                      {[
                        { label: "Bypasses wallet charges", active: isDummyEnabled },
                        { label: "Returns deterministic mock data", active: isDummyEnabled },
                        { label: "Admin-only access control", active: true },
                        { label: "Full API compatibility", active: true },
                      ].map((f) => (
                        <div key={f.label} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className={`h-3 w-3 ${f.active ? "text-green-400" : "text-muted-foreground"}`} />
                          <span className={f.active ? "" : "text-muted-foreground"}>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Test Run History</h3>
                  <Badge variant="outline" className="text-[10px]">{historyList.length} runs</Badge>
                </div>
                <div className="px-5 pb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-muted-foreground uppercase tracking-wider text-[10px]">
                        <th className="text-left py-2 px-2">Suite</th>
                        <th className="text-left py-2 px-2">Test</th>
                        <th className="text-left py-2 px-2">Status</th>
                        <th className="text-left py-2 px-2">Duration</th>
                        <th className="text-left py-2 px-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.slice(0, 30).map((run: any, i: number) => (
                        <tr key={run.id ?? i} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2 px-2 font-medium">{run.suite ?? "all"}</td>
                          <td className="py-2 px-2 text-muted-foreground">{run.name ?? "—"}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${run.status === "passed" ? "bg-green-400" : run.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                              <span className={`capitalize ${run.status === "passed" ? "text-green-400" : run.status === "failed" ? "text-red-400" : ""}`}>{run.status}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-muted-foreground tabular-nums">{run.durationMs ? `${run.durationMs}ms` : "—"}</td>
                          <td className="py-2 px-2 text-muted-foreground">{run.timestamp ? new Date(run.timestamp).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {historyList.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No test runs yet. Run a suite to see results here.</p>}
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-info" />
                    <h3 className="text-sm font-semibold">Audit Events</h3>
                    <Badge variant="outline" className="text-[10px] ml-auto">{auditList.length} events</Badge>
                  </div>
                  <div className="px-5 pb-4 space-y-2 max-h-[500px] overflow-y-auto">
                    {auditList.length > 0 ? auditList.slice(0, 30).map((evt: any, i: number) => (
                      <div key={evt.id ?? i} className="p-2 rounded-lg glass-surface">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium capitalize">{(evt.action ?? evt.event ?? "").replace(/_/g, " ")}</p>
                          <Badge variant="outline" className="text-[8px]">{evt.domain ?? "system"}</Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground">{evt.details ?? evt.description ?? ""}</p>
                        <p className="text-[8px] text-muted-foreground mt-1">{evt.actor ?? evt.user ?? "system"} &bull; {evt.createdAt ? new Date(evt.createdAt).toLocaleString() : ""}</p>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground text-center py-6">No audit events recorded yet.</p>
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold">Event Bus Log</h3>
                    <Badge variant="outline" className="text-[10px] ml-auto">{eventLog.length} events</Badge>
                  </div>
                  <div className="px-5 pb-4 space-y-2 max-h-[500px] overflow-y-auto">
                    {eventLog.length > 0 ? eventLog.slice(0, 30).map((evt: any, i: number) => (
                      <div key={i} className="p-2 rounded-lg glass-surface flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{evt.event ?? evt.type}</p>
                          <p className="text-[9px] text-muted-foreground">{evt.source ?? ""} {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ""}</p>
                        </div>
                        <Badge variant="outline" className="text-[8px]">{evt.status ?? "emitted"}</Badge>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground text-center py-6">Event bus log is empty. Events appear here in real-time.</p>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {activeTab === "scheduler" && (
            <div className="space-y-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-info" />
                    <h3 className="text-sm font-semibold">Scheduled Jobs</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{jobList.length} jobs</Badge>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {jobList.length > 0 ? jobList.map((job: any, i: number) => (
                    <div key={job.id ?? i} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{job.name ?? job.title}</p>
                        <p className="text-[9px] text-muted-foreground">{job.schedule ?? job.cron ?? "manual"} &bull; {job.description ?? ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge variant={job.status === "active" ? "active" : job.status === "running" ? "ai-executed" : "pending"} label={job.status ?? "active"} />
                        {job.nextRun && <span className="text-[9px] text-muted-foreground">Next: {new Date(job.nextRun).toLocaleString()}</span>}
                      </div>
                    </div>
                  )) : (
                    ["Report Generation (Daily)", "Data Sync (Hourly)", "Knowledge Refresh (4h)", "Agent Health Check (15min)", "Wallet Alert Check (30min)"].map((name) => (
                      <div key={name} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{name}</p>
                          <p className="text-[9px] text-muted-foreground">System scheduled job</p>
                        </div>
                        <StatusBadge variant="active" label="Active" />
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          )}
        </motion.div>
      </ModeAwareWrapper>
    </div>
  );
}
