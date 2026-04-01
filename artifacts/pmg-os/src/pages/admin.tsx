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
import { useSops, useCreateSop } from "@/hooks/use-api";
import {
  BookOpen, FileText, AlertTriangle, Plus, Search, FolderOpen,
  ClipboardList, Scale, ArrowUpCircle, Archive, CheckCircle2
} from "lucide-react";

const tabs = [
  { id: "sops", label: "SOPs", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: "policies", label: "Policies", icon: <Scale className="h-3.5 w-3.5" /> },
  { id: "work-instructions", label: "Work Instructions", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: "escalations", label: "Escalations", icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
  { id: "archives", label: "Archives", icon: <Archive className="h-3.5 w-3.5" /> },
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
  const [newSop, setNewSop] = useState({ title: "", category: "operations", content: "" });
  const { isHuman } = useAiModeContext();
  const { toast } = useToast();
  const { data: sops } = useSops();
  const createSop = useCreateSop();

  const sopList = (sops ?? []) as any[];

  const handleCreateSop = () => {
    if (!newSop.title || !newSop.content) return;
    createSop.mutate({ ...newSop, createdBy: "SherShah K." }, {
      onSuccess: () => {
        toast({ title: "SOP created" });
        setShowCreate(false);
        setNewSop({ title: "", category: "operations", content: "" });
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
              {showCreate && (
                <GlassCard glow="crimson">
                  <h3 className="text-sm font-semibold mb-3">Create New SOP</h3>
                  <div className="space-y-3">
                    <Input placeholder="SOP Title" value={newSop.title} onChange={e => setNewSop(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10" />
                    <select
                      value={newSop.category}
                      onChange={e => setNewSop(p => ({ ...p, category: e.target.value }))}
                      className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                    >
                      <option value="operations">Operations</option>
                      <option value="security">Security</option>
                      <option value="compliance">Compliance</option>
                      <option value="finance">Finance</option>
                      <option value="sales">Sales</option>
                      <option value="marketing">Marketing</option>
                    </select>
                    <Textarea placeholder="SOP Content / Procedure Steps" value={newSop.content} onChange={e => setNewSop(p => ({ ...p, content: e.target.value }))} className="bg-white/5 border-white/10 min-h-[100px]" />
                    <div className="flex gap-2">
                      <Button className="btn-premium text-white text-sm" onClick={handleCreateSop} disabled={createSop.isPending}>Create SOP</Button>
                      <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    </div>
                  </div>
                </GlassCard>
              )}
              {sopList.map((sop: any) => (
                <GlassCard key={sop.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{sop.title}</h3>
                      <p className="text-xs text-muted-foreground">{sop.category} · v{sop.version ?? "1.0"}</p>
                    </div>
                    <StatusBadge variant={sop.status === "active" ? "active" : "draft"} label={sop.status} />
                  </div>
                  {sop.content && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{sop.content}</p>}
                </GlassCard>
              ))}
              {sopList.length === 0 && (
                <GlassCard>
                  <p className="text-sm text-muted-foreground text-center py-4">No SOPs created yet. Click "New SOP" to start.</p>
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

          {activeTab === "archives" && (
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3">Administrative Archives</h3>
              <p className="text-xs text-muted-foreground">Archived SOPs, retired policies, and historical records are stored here for compliance and audit purposes.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {["Retired SOPs", "Previous Policy Versions", "Completed Escalations"].map(cat => (
                  <div key={cat} className="p-3 rounded-lg glass-surface text-center">
                    <Archive className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs font-medium">{cat}</p>
                    <p className="text-[10px] text-muted-foreground">0 items</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </motion.div>
      </ModeAwareWrapper>
    </div>
  );
}
