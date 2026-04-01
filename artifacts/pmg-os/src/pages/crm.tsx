import { useState, useCallback } from "react";
import { useListOpportunities, useListCommunications, useListTasks, useListCompanies, useListLeads } from "@workspace/api-client-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import {
  Briefcase, Plus, DollarSign, TrendingUp, Clock, AlertTriangle,
  ArrowRight, FileText, Phone, Calendar, ChevronRight, Bot, Target, Users,
  GripVertical, Pencil, Save, X, Loader2, Building2, User
} from "lucide-react";
import { CreateLeadForm } from "@/components/forms/create-lead-form";
import { CreateOpportunityForm } from "@/components/forms/create-opportunity-form";
import { CreateCompanyForm } from "@/components/forms/create-company-form";
import { CreateContactForm } from "@/components/forms/create-contact-form";
import { useDeleteLead, useUpdateLead, useRouteLead, useLeadActivities, useUpdateOpportunityMut } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

const stages = ["discovery", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
const stageLabels: Record<string, string> = { discovery: "Discovery", qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost" };

const tabs = [
  { id: "leads", label: "Leads", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "pmg", label: "Pipeline", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "client", label: "Client CRM", icon: <DollarSign className="h-3.5 w-3.5" /> },
];

function DraggableDealCard({ opp, isStale, onClick }: { opp: any; isStale: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `deal-${opp.id}`, data: { opp } });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <GlassCard variant="interactive" className="cursor-pointer !p-3" onClick={onClick}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-white"><GripVertical className="h-3 w-3" /></div>
            <p className="font-medium text-sm leading-tight">{opp.title}</p>
          </div>
          {isStale && <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />}
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">{opp.companyName}</p>
        <ConfidenceMeter score={opp.probability ?? 0} size="sm" className="mb-2" />
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[9px] px-1 capitalize">{opp.proposalStatus ?? opp.proposal_status ?? "pending"}</Badge>
          <span className="text-xs font-bold gradient-text-crimson">${(opp.value ?? 0).toLocaleString()}</span>
        </div>
      </GlassCard>
    </div>
  );
}

function DroppableColumn({ stage, children }: { stage: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage}` });
  return (
    <div ref={setNodeRef} className={`space-y-2 min-h-[200px] rounded-lg p-1 transition-colors ${isOver ? "bg-crimson/5 ring-1 ring-crimson/20" : ""}`}>
      {children}
    </div>
  );
}

export default function CRM() {
  const [activeTab, setActiveTab] = useState("leads");
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [editingLead, setEditingLead] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState<any>({});
  const { toast } = useToast();
  const updateOpp = useUpdateOpportunityMut();
  const updateLead = useUpdateLead();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { data: opportunities, isLoading } = useListOpportunities();
  const { data: communications } = useListCommunications();
  const { data: tasks } = useListTasks();
  const { data: companies } = useListCompanies();
  const { data: leads } = useListLeads();
  const deleteLead = useDeleteLead();
  const routeLead = useRouteLead();
  const { isHuman, isHybrid, isAuto } = useAiModeContext();

  const leadList = (leads ?? []) as any[];

  const oppList = (opportunities ?? []) as any[];
  const commList = (communications ?? []) as any[];
  const taskList = (tasks ?? []) as any[];

  const totalValue = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const weightedValue = oppList.reduce((s: number, o: any) => s + ((o.value ?? 0) * (o.probability ?? 0)) / 100, 0);
  const activeDeals = oppList.filter((o: any) => o.stage !== "closed_won" && o.stage !== "closed_lost");
  const staleDays = 7;
  const staleDeals = activeDeals.filter((o: any) => {
    const days = (Date.now() - new Date(o.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > staleDays;
  });

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="CRM & Revenue Pipeline"
        subtitle="Opportunity tracking, deal progression, and revenue management"
        icon={<Briefcase className="h-5 w-5" />}
        actions={
          <Button
            className="btn-premium text-white text-sm px-4 py-2 rounded-lg"
            onClick={() => setShowCreateLead(true)}
          >
            <Plus className="h-4 w-4 mr-2" />New Lead
          </Button>
        }
      />

      <CreateLeadForm open={showCreateLead} onOpenChange={setShowCreateLead} />
      <CreateOpportunityForm open={showCreateDeal} onClose={() => setShowCreateDeal(false)} />
      <CreateCompanyForm open={showCreateCompany} onOpenChange={setShowCreateCompany} />
      <CreateContactForm open={showCreateContact} onOpenChange={setShowCreateContact} />

      <ModeIndicatorBanner />

      <ModeAwareWrapper
        domain="crm"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="CRM & Deal Management Workflow" steps={[
              { id: "1", title: "Review New Leads", description: "Check incoming leads, review company details and contact info", status: "current" as const, action: "View Leads" },
              { id: "2", title: "Qualify & Score", description: "Manually assess lead fit, budget, authority, need, and timeline", status: "upcoming" as const },
              { id: "3", title: "Create Opportunity", description: "Convert qualified leads into pipeline opportunities with deal value", status: "upcoming" as const },
              { id: "4", title: "Progress Deals", description: "Move deals through pipeline stages — discovery, proposal, negotiation", status: "upcoming" as const },
              { id: "5", title: "Close & Handoff", description: "Close won deals and hand off to production/delivery team", status: "upcoming" as const },
            ]} icon={<Briefcase className="h-5 w-5 text-blue-400" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Active Leads ({leadList.length})</h3>
                <div className="space-y-2">
                  {leadList.slice(0, 8).map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                      <div>
                        <p className="text-sm font-medium">{lead.companyName ?? lead.company_name}</p>
                        <p className="text-[10px] text-muted-foreground">{lead.contactName ?? lead.contact_name} · {lead.source}</p>
                      </div>
                      <StatusBadge variant={lead.status === "qualified" ? "success" : "pending"} label={lead.status} />
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Pipeline Deals ({activeDeals.length})</h3>
                <div className="space-y-2">
                  {activeDeals.slice(0, 8).map((opp: any) => (
                    <div key={opp.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 cursor-pointer" onClick={() => setSelectedOpp(opp)}>
                      <div>
                        <p className="text-sm font-medium">{opp.title}</p>
                        <p className="text-[10px] text-muted-foreground">${(opp.value ?? 0).toLocaleString()} · {opp.stage}</p>
                      </div>
                      <StatusBadge variant={opp.probability >= 70 ? "success" : opp.probability >= 40 ? "ai-recommended" : "pending"} label={`${opp.probability}%`} />
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
        {activeTab === "leads" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Leads" value={leadList.length} icon={<Target className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Scored" value={leadList.filter((l: any) => l.fitScore).length} icon={<Bot className="h-4 w-4" />} accent="success" />
              <KpiCard label="Qualified" value={leadList.filter((l: any) => l.status === "qualified" || l.status === "scored").length} icon={<Users className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Avg Score" value={leadList.length ? Math.round(leadList.reduce((s: number, l: any) => s + (l.fitScore ?? 0), 0) / leadList.length) : 0} icon={<TrendingUp className="h-4 w-4" />} accent="gold" />
            </div>

            <GlassCard>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-white/5">
                      <th className="text-left py-3 px-4">Lead</th>
                      <th className="text-left py-3 px-4">Source</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Score</th>
                      <th className="text-left py-3 px-4">Priority</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadList.map((lead: any) => (
                      <tr
                        key={lead.id}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm text-white">{lead.companyName ?? `Lead #${lead.id}`}</div>
                            {lead.bestAngle && <Bot className="h-3 w-3 text-green-400" />}
                          </div>
                          {lead.contactName && <div className="text-xs text-slate-500">{lead.contactName}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{lead.source ?? "—"}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs capitalize">{(lead.status ?? "new").replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {lead.fitScore ? (
                            <ConfidenceMeter score={lead.fitScore} size="sm" />
                          ) : (
                            <span className="text-xs text-slate-500">Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs capitalize">{lead.priority ?? "medium"}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-slate-400 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                routeLead.mutate({ id: lead.id, destination: "internal" }, {
                                  onSuccess: () => toast({ title: "Lead routed internally" }),
                                });
                              }}
                            >
                              Route
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-400 hover:text-red-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this lead?")) {
                                  deleteLead.mutate(lead.id, {
                                    onSuccess: () => toast({ title: "Lead deleted" }),
                                  });
                                }
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {leadList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>No leads yet. Create your first lead to trigger AI enrichment.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "pmg" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Deal Pipeline <span className="text-[10px] text-muted-foreground ml-2">(drag deals between stages)</span></h3>
              <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateDeal(true)}>
                <Plus className="h-4 w-4 mr-2" />New Deal
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard label="Pipeline Value" value={`$${totalValue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Weighted Revenue" value={`$${Math.round(weightedValue).toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} accent="success" />
              <KpiCard label="Active Deals" value={activeDeals.length} icon={<Briefcase className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Avg Probability" value={`${activeDeals.length ? Math.round(activeDeals.reduce((s: number, o: any) => s + (o.probability ?? 0), 0) / activeDeals.length) : 0}%`} icon={<Clock className="h-4 w-4" />} />
              <KpiCard label="Stale Deals" value={staleDeals.length} icon={<AlertTriangle className="h-4 w-4" />} accent={staleDeals.length > 0 ? "crimson" : "default"} />
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-96 w-full bg-muted/10" />)}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (!over) return;
                  const overId = String(over.id);
                  if (!overId.startsWith("stage-")) return;
                  const newStage = overId.replace("stage-", "");
                  const dealData = active.data?.current?.opp;
                  if (!dealData || dealData.stage === newStage) return;
                  updateOpp.mutate(
                    { id: dealData.id, data: { stage: newStage } },
                    { onSuccess: () => toast({ title: `Deal moved to ${stageLabels[newStage]}` }) }
                  );
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">
                  {stages.slice(0, 4).map((stage) => {
                    const stageOpps = oppList.filter((o: any) => o.stage === stage);
                    const stageValue = stageOpps.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
                    return (
                      <div key={stage} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                          <div>
                            <h3 className="kpi-label">{stageLabels[stage]}</h3>
                            <p className="text-[10px] text-muted-foreground">${stageValue.toLocaleString()}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full glass-surface font-medium">{stageOpps.length}</span>
                        </div>
                        <DroppableColumn stage={stage}>
                          {stageOpps.map((opp: any) => (
                            <DraggableDealCard
                              key={opp.id}
                              opp={opp}
                              isStale={staleDeals.includes(opp)}
                              onClick={() => setSelectedOpp(opp)}
                            />
                          ))}
                          {stageOpps.length === 0 && (
                            <div className="p-6 border border-dashed border-border/30 rounded-lg text-center text-[10px] text-muted-foreground">
                              Drop deals here
                            </div>
                          )}
                        </DroppableColumn>
                      </div>
                    );
                  })}
                </div>
              </DndContext>
            )}
          </div>
        )}

        {activeTab === "client" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Companies" value={(companies ?? []).length} icon={<Building2 className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Contacts" value={commList.length} icon={<User className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Active Tasks" value={taskList.filter((t: any) => t.status !== "completed").length} icon={<Calendar className="h-4 w-4" />} accent="gold" />
              <KpiCard label="Communications" value={commList.length} icon={<Phone className="h-4 w-4" />} accent="success" />
            </div>
            <div className="flex gap-2">
              <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateCompany(true)}>
                <Building2 className="h-4 w-4 mr-2" />New Company
              </Button>
              <Button className="btn-glass text-foreground text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateContact(true)}>
                <User className="h-4 w-4 mr-2" />New Contact
              </Button>
            </div>
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Companies</h3></div>
              <div className="px-5 pb-4">
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground border-b border-white/5">
                    <th className="text-left py-2 px-2">Name</th><th className="text-left py-2 px-2">Industry</th><th className="text-left py-2 px-2">Size</th><th className="text-left py-2 px-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {((companies ?? []) as any[]).map((c: any) => (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 px-2 font-medium">{c.name}</td>
                        <td className="py-2 px-2 text-muted-foreground">{c.industry ?? "—"}</td>
                        <td className="py-2 px-2 text-muted-foreground">{c.size ?? "—"}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-[9px] capitalize">{c.status ?? "active"}</Badge></td>
                      </tr>
                    ))}
                    {((companies ?? []) as any[]).length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No companies yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
      </ModeAwareWrapper>

      <DetailDrawer
        open={!!selectedOpp}
        onClose={() => setSelectedOpp(null)}
        title={selectedOpp?.title}
        subtitle={selectedOpp?.companyName}
        width="xl"
      >
        {selectedOpp && (() => {
          const relatedComms = commList.filter((c: any) => c.opportunityId === selectedOpp.id || c.opportunity_id === selectedOpp.id);
          const relatedTasks = taskList.filter((t: any) => t.entityType === "opportunity" && t.entityId === selectedOpp.id);
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold gradient-text-crimson">${(selectedOpp.value ?? 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Deal Value</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold">{selectedOpp.probability}%</p>
                  <p className="text-[10px] text-muted-foreground">Win Probability</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold text-success">${Math.round((selectedOpp.value ?? 0) * (selectedOpp.probability ?? 0) / 100).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Weighted Value</p>
                </div>
              </div>

              <div>
                <h4 className="section-header mb-2">Stage Progression</h4>
                <div className="flex items-center gap-1">
                  {stages.slice(0, 4).map((s, i) => {
                    const current = stages.indexOf(selectedOpp.stage as any);
                    const active = i <= current;
                    return (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div className={`h-1.5 rounded-full flex-1 transition-colors ${active ? "bg-crimson" : "bg-muted"}`} />
                        {i < 3 && <ChevronRight className={`h-3 w-3 shrink-0 ${active ? "text-crimson" : "text-muted-foreground"}`} />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  {stages.slice(0, 4).map((s) => <span key={s} className={selectedOpp.stage === s ? "text-crimson font-bold" : ""}>{stageLabels[s]}</span>)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Service Type</span><p className="font-medium capitalize">{selectedOpp.serviceType ?? selectedOpp.service_type}</p></div>
                <div><span className="text-muted-foreground text-xs">Owner</span><p className="font-medium">{selectedOpp.owner}</p></div>
                <div><span className="text-muted-foreground text-xs">Proposal Status</span><StatusBadge variant={selectedOpp.proposalStatus === "accepted" ? "human-approved" : "pending"} label={selectedOpp.proposalStatus ?? selectedOpp.proposal_status} /></div>
                <div><span className="text-muted-foreground text-xs">Stage</span><p className="font-medium capitalize">{selectedOpp.stage}</p></div>
              </div>

              {relatedComms.length > 0 && (
                <div>
                  <h4 className="section-header mb-2 flex items-center gap-2"><Phone className="h-4 w-4 text-crimson" />Communications ({relatedComms.length})</h4>
                  {relatedComms.map((c: any) => (
                    <div key={c.id} className="p-3 rounded-lg glass-surface mb-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{c.subject}</p>
                        <Badge variant="outline" className="text-[9px] capitalize">{c.type}</Badge>
                      </div>
                      {c.summary && <p className="text-xs text-muted-foreground mt-1">{c.summary}</p>}
                    </div>
                  ))}
                </div>
              )}

              {relatedTasks.length > 0 && (
                <div>
                  <h4 className="section-header mb-2 flex items-center gap-2"><Calendar className="h-4 w-4 text-crimson" />Tasks ({relatedTasks.length})</h4>
                  {relatedTasks.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-lg glass-surface mb-1 flex items-center justify-between">
                      <p className="text-sm">{t.title}</p>
                      <StatusBadge variant={t.status === "completed" ? "success" : "pending"} label={t.status?.replace("_", " ")} />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg"
                  onClick={() => {
                    updateOpp.mutate({ id: selectedOpp.id, data: { proposalStatus: "sent" } }, {
                      onSuccess: () => toast({ title: "Proposal status updated to 'sent'" }),
                    });
                  }}
                ><FileText className="h-4 w-4 mr-2" />Generate Proposal</Button>
                <Button className="btn-premium text-white flex-1 text-sm rounded-lg"
                  disabled={selectedOpp.stage === "closed_won" || selectedOpp.stage === "closed_lost"}
                  onClick={() => {
                    const idx = stages.indexOf(selectedOpp.stage);
                    if (idx >= 0 && idx < stages.length - 1) {
                      const next = stages[idx + 1];
                      updateOpp.mutate({ id: selectedOpp.id, data: { stage: next } }, {
                        onSuccess: () => { toast({ title: `Advanced to ${stageLabels[next]}` }); setSelectedOpp(null); },
                      });
                    }
                  }}
                ><ArrowRight className="h-4 w-4 mr-2" />Advance Stage</Button>
              </div>
            </div>
          );
        })()}
      </DetailDrawer>

      <DetailDrawer open={!!selectedLead} onClose={() => { setSelectedLead(null); setEditingLead(false); }} title={selectedLead?.companyName ?? `Lead #${selectedLead?.id}`}>
        {selectedLead && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button
                variant="ghost" size="sm" className="text-xs"
                onClick={() => {
                  if (editingLead) { setEditingLead(false); }
                  else {
                    setLeadEditForm({ priority: selectedLead.priority ?? "medium", source: selectedLead.source ?? "website", notes: selectedLead.notes ?? "" });
                    setEditingLead(true);
                  }
                }}
              >
                {editingLead ? <><X className="h-3 w-3 mr-1" />Cancel</> : <><Pencil className="h-3 w-3 mr-1" />Edit</>}
              </Button>
            </div>

            {editingLead ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Priority</Label>
                  <Select value={leadEditForm.priority} onValueChange={v => setLeadEditForm((f: any) => ({ ...f, priority: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                      {["low", "medium", "high", "urgent"].map(p => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Source</Label>
                  <Select value={leadEditForm.source} onValueChange={v => setLeadEditForm((f: any) => ({ ...f, source: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                      {["website", "referral", "linkedin", "cold_outreach", "inbound", "conference", "partner"].map(s => <SelectItem key={s} value={s} className="text-white">{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Notes</Label>
                  <Input value={leadEditForm.notes} onChange={e => setLeadEditForm((f: any) => ({ ...f, notes: e.target.value }))} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <Button
                  className="btn-premium text-white w-full text-xs rounded-lg"
                  disabled={updateLead.isPending}
                  onClick={() => {
                    updateLead.mutate({ id: selectedLead.id, data: leadEditForm }, {
                      onSuccess: () => { toast({ title: "Lead Updated" }); setEditingLead(false); setSelectedLead(null); },
                    });
                  }}
                >
                  {updateLead.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Save Changes
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg glass-surface">
                    <p className="text-[10px] uppercase text-slate-500">Status</p>
                    <Badge variant="outline" className="text-xs capitalize">{(selectedLead.status ?? "new").replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="p-3 rounded-lg glass-surface">
                    <p className="text-[10px] uppercase text-slate-500">Score</p>
                    {selectedLead.fitScore ? <ConfidenceMeter score={selectedLead.fitScore} /> : <span className="text-sm text-slate-500">Pending</span>}
                  </div>
                  <div className="p-3 rounded-lg glass-surface">
                    <p className="text-[10px] uppercase text-slate-500">Priority</p>
                    <Badge variant="outline" className="text-xs capitalize">{selectedLead.priority ?? "medium"}</Badge>
                  </div>
                  <div className="p-3 rounded-lg glass-surface">
                    <p className="text-[10px] uppercase text-slate-500">Source</p>
                    <p className="text-sm">{selectedLead.source ?? "—"}</p>
                  </div>
                </div>

                {selectedLead.bestAngle && (
                  <div className="p-3 rounded-lg glass-surface">
                    <h4 className="text-xs font-semibold text-crimson-400 flex items-center gap-1 mb-2"><Bot className="h-3 w-3" />AI Enrichment</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{selectedLead.bestAngle}</p>
                  </div>
                )}

                {selectedLead.notes && (
                  <div className="p-3 rounded-lg glass-surface">
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">AI Reasoning</h4>
                    <p className="text-xs text-slate-300">{selectedLead.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg"
                    onClick={() => { routeLead.mutate({ id: selectedLead.id, destination: "internal" }, { onSuccess: () => { toast({ title: "Lead routed internally" }); setSelectedLead(null); } }); }}>
                    <ArrowRight className="h-4 w-4 mr-2" />Route Internal
                  </Button>
                  <Button className="btn-premium text-white flex-1 text-sm rounded-lg"
                    onClick={() => { routeLead.mutate({ id: selectedLead.id, destination: "ghl" }, { onSuccess: () => { toast({ title: "Lead routed to GHL" }); setSelectedLead(null); } }); }}>
                    <ArrowRight className="h-4 w-4 mr-2" />Route to GHL
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
