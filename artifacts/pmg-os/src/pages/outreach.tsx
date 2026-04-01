import { useState } from "react";
import { useListLeads, useListCompanies } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import {
  Target, ArrowUpRight, AlertCircle, CheckCircle2, Plus, Sparkles,
  Users, ArrowRight, Filter, ListChecks, Send
} from "lucide-react";
import { CreateLeadForm } from "@/components/forms/create-lead-form";

const tabs = [
  { id: "pipeline", label: "Lead Pipeline", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "sequences", label: "Outbound Sequences", icon: <Send className="h-3.5 w-3.5" /> },
  { id: "qualification", label: "Qualification", icon: <ListChecks className="h-3.5 w-3.5" /> },
];

export default function Outreach() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateLead, setShowCreateLead] = useState(false);
  const { data: leads } = useListLeads();
  const { data: companies } = useListCompanies();
  const { isHuman, isHybrid, isAuto } = useAiModeContext();
  const leadList = (leads ?? []) as any[];
  const companyList = (companies ?? []) as any[];

  const filtered = statusFilter === "all" ? leadList : leadList.filter((l: any) => l.status === statusFilter);
  const totalLeads = leadList.length;
  const qualified = leadList.filter((l: any) => l.status === "qualified").length;
  const contacted = leadList.filter((l: any) => l.status === "contacted").length;
  const avgConfidence = totalLeads ? Math.round(leadList.reduce((s: number, l: any) => s + (l.confidenceScore ?? l.confidence_score ?? 0), 0) / totalLeads) : 0;
  const avgFit = totalLeads ? Math.round(leadList.reduce((s: number, l: any) => s + (l.fitScore ?? l.fit_score ?? 0), 0) / totalLeads) : 0;

  const humanWorkflowSteps = [
    { id: "1", title: "Review Lead List", description: "Check incoming leads and prioritize by fit score and urgency", status: "current" as const, action: "Open List" },
    { id: "2", title: "Research Top Prospects", description: "Manually research the top 5 leads — company size, tech stack, pain points", status: "upcoming" as const },
    { id: "3", title: "Craft Outreach Messages", description: "Write personalized emails or LinkedIn messages for each prospect", status: "upcoming" as const },
    { id: "4", title: "Schedule Follow-ups", description: "Set follow-up reminders and sequence timing for each lead", status: "upcoming" as const },
    { id: "5", title: "Update Lead Status", description: "Move leads through pipeline stages based on responses", status: "upcoming" as const },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Outreach & Prospecting"
        subtitle={isHuman ? "Manual prospecting, lead review, and personalized outreach" : "Target discovery, lead scoring, qualification, and CRM handoff"}
        icon={<Target className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateLead(true)}><Plus className="h-4 w-4 mr-2" />New Lead</Button>
            {!isHuman && (
              <Button className="btn-glass text-foreground text-sm px-4 py-2 rounded-lg"><Sparkles className="h-4 w-4 mr-2" />AI Prospect</Button>
            )}
          </div>
        }
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Leads" value={totalLeads} icon={<Users className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Qualified" value={qualified} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Contacted" value={contacted} icon={<Send className="h-4 w-4" />} />
        <KpiCard label="Avg Confidence" value={`${avgConfidence}%`} icon={<Target className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Avg Fit Score" value={`${avgFit}%`} icon={<Target className="h-4 w-4" />} accent="gold" />
      </div>

      <ModeAwareWrapper
        domain="outreach"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Manual Prospecting Workflow" steps={humanWorkflowSteps} icon={<Target className="h-5 w-5 text-blue-400" />} />
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3">Lead Queue ({leadList.length} leads)</h3>
              <div className="space-y-2">
                {leadList.slice(0, 8).map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 cursor-pointer hover:bg-slate-800/50" onClick={() => setSelectedLead(lead)}>
                    <div>
                      <p className="text-sm font-medium">{lead.companyName ?? lead.company_name}</p>
                      <p className="text-[10px] text-muted-foreground">{lead.contactName ?? lead.contact_name} · {lead.source}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={lead.status === "qualified" ? "ai-approved" : lead.status === "contacted" ? "ai-recommended" : "pending"} label={lead.status} />
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        }
      >
      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "pipeline" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 glass-surface border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{filtered.length} leads</span>
            </div>

            {filtered.map((lead: any) => (
              <GlassCard key={lead.id} variant="interactive" className="cursor-pointer" onClick={() => setSelectedLead(lead)}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold uppercase text-[10px] ${lead.priority === "critical" ? "text-crimson" : lead.priority === "high" ? "text-warning" : "text-info"}`}>
                        {lead.priority}
                      </span>
                      <StatusBadge variant={lead.status === "qualified" ? "success" : lead.status === "contacted" ? "active" : "pending"} label={lead.status} />
                      <Badge variant="outline" className="capitalize text-[10px]">{lead.source}</Badge>
                    </div>
                    {(lead.painPoints ?? lead.pain_points) && (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                        {lead.painPoints ?? lead.pain_points}
                      </p>
                    )}
                    {(lead.bestAngle ?? lead.best_angle) && (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                        {lead.bestAngle ?? lead.best_angle}
                      </p>
                    )}
                    {(lead.nextAction ?? lead.next_action) && (
                      <p className="text-sm font-medium flex items-center gap-2 text-crimson">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Next: {lead.nextAction ?? lead.next_action}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Fit</p>
                      <ConfidenceMeter score={lead.fitScore ?? lead.fit_score ?? 0} className="w-16" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Confidence</p>
                      <ConfidenceMeter score={lead.confidenceScore ?? lead.confidence_score ?? 0} className="w-16" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
            {filtered.length === 0 && (
              <GlassCard className="py-12 flex flex-col items-center gap-3">
                <Target className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No leads found</p>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === "sequences" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Outbound Sequences</h3>
              <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="h-3 w-3 mr-1" />New Sequence</Button>
            </div>
            <div className="px-5 pb-4 space-y-3">
              {[
                { name: "Cybersecurity Compliance Gap", steps: 5, enrolled: 12, replied: 3, status: "active", channel: "Email + LinkedIn" },
                { name: "IT Infrastructure Scaling", steps: 4, enrolled: 8, replied: 2, status: "active", channel: "Email" },
                { name: "Post-Breach Response", steps: 3, enrolled: 4, replied: 1, status: "paused", channel: "Email + Call" },
              ].map((seq, i) => (
                <div key={i} className="p-4 rounded-lg glass-surface">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{seq.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{seq.channel} &bull; {seq.steps} steps</p>
                    </div>
                    <StatusBadge variant={seq.status === "active" ? "active" : "pending"} label={seq.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded-lg glass-surface"><p className="text-sm font-bold">{seq.enrolled}</p><p className="text-[9px] text-muted-foreground">Enrolled</p></div>
                    <div className="p-2 rounded-lg glass-surface"><p className="text-sm font-bold gradient-text-crimson">{seq.replied}</p><p className="text-[9px] text-muted-foreground">Replied</p></div>
                    <div className="p-2 rounded-lg glass-surface"><p className="text-sm font-bold">{seq.enrolled ? Math.round((seq.replied / seq.enrolled) * 100) : 0}%</p><p className="text-[9px] text-muted-foreground">Reply Rate</p></div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === "qualification" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-crimson" />
              <h3 className="text-sm font-semibold">Qualification Checklist</h3>
            </div>
            <div className="px-5 pb-4 space-y-4">
              {leadList.filter((l: any) => l.status !== "disqualified").map((lead: any) => (
                <div key={lead.id} className="p-4 rounded-lg glass-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={lead.status === "qualified" ? "success" : "pending"} label={lead.status} />
                      <ConfidenceMeter score={lead.fitScore ?? lead.fit_score ?? 0} className="w-20" />
                    </div>
                    <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"><ArrowRight className="h-3 w-3 mr-1" />Handoff to CRM</Button>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {[
                      { label: "Budget identified", checked: (lead.fitScore ?? lead.fit_score) > 70 },
                      { label: "Decision maker contacted", checked: lead.status === "qualified" || lead.status === "contacted" },
                      { label: "Pain point confirmed", checked: !!(lead.painPoints ?? lead.pain_points) },
                      { label: "Timeline established", checked: lead.status === "qualified" },
                      { label: "Competition assessed", checked: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${item.checked ? "bg-success border-success" : "border-border"}`}>
                          {item.checked && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <span className={item.checked ? "" : "text-muted-foreground"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </motion.div>
      </ModeAwareWrapper>

      <DetailDrawer
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title="Lead Details"
        subtitle={selectedLead ? `Source: ${selectedLead.source}` : ""}
      >
        {selectedLead && (() => {
          const company = companyList.find((c: any) => c.id === (selectedLead.companyId ?? selectedLead.company_id));
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold gradient-text-crimson">{selectedLead.fitScore ?? selectedLead.fit_score}%</p>
                  <p className="text-[10px] text-muted-foreground">Fit Score</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold">{selectedLead.confidenceScore ?? selectedLead.confidence_score}%</p>
                  <p className="text-[10px] text-muted-foreground">Confidence</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <StatusBadge variant={selectedLead.status === "qualified" ? "success" : "pending"} label={selectedLead.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Company</span><p className="font-medium">{company?.name ?? "Unknown"}</p></div>
                <div><span className="text-muted-foreground text-xs">Priority</span><p className="font-medium capitalize">{selectedLead.priority}</p></div>
              </div>
              {(selectedLead.painPoints ?? selectedLead.pain_points) && (
                <GlassCard variant="alert-warning">
                  <p className="text-[10px] font-semibold text-warning mb-1">Pain Points</p>
                  <p className="text-sm">{selectedLead.painPoints ?? selectedLead.pain_points}</p>
                </GlassCard>
              )}
              {(selectedLead.bestAngle ?? selectedLead.best_angle) && (
                <GlassCard glow="success">
                  <p className="text-[10px] font-semibold text-success mb-1">Best Approach</p>
                  <p className="text-sm">{selectedLead.bestAngle ?? selectedLead.best_angle}</p>
                </GlassCard>
              )}
              <div className="flex gap-2">
                <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg"><Sparkles className="h-4 w-4 mr-2" />AI Qualify</Button>
                <Button className="btn-premium text-white flex-1 text-sm rounded-lg"><ArrowRight className="h-4 w-4 mr-2" />Handoff to CRM</Button>
              </div>
            </div>
          );
        })()}
      </DetailDrawer>

      <CreateLeadForm open={showCreateLead} onOpenChange={setShowCreateLead} />
    </div>
  );
}
