import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Plus, DollarSign, TrendingUp, Clock, AlertTriangle,
  ArrowRight, FileText, Phone, Calendar, ChevronRight, Bot, Target, Users
} from "lucide-react";
import { CreateLeadForm } from "@/components/forms/create-lead-form";
import { CreateOpportunityForm } from "@/components/forms/create-opportunity-form";
import { useDeleteLead, useUpdateLead, useRouteLead, useLeadActivities } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

const stages = ["discovery", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
const stageLabels: Record<string, string> = { discovery: "Discovery", qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost" };

const tabs = [
  { id: "leads", label: "Leads", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "pmg", label: "Pipeline", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "client", label: "Client CRM", icon: <DollarSign className="h-3.5 w-3.5" /> },
];

export default function CRM() {
  const [activeTab, setActiveTab] = useState("leads");
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const { toast } = useToast();
  const { data: opportunities, isLoading } = useListOpportunities();
  const { data: communications } = useListCommunications();
  const { data: tasks } = useListTasks();
  const { data: companies } = useListCompanies();
  const { data: leads } = useListLeads();
  const deleteLead = useDeleteLead();
  const routeLead = useRouteLead();

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
                            {lead.bestAngle && <Bot className="h-3 w-3 text-green-400" title="AI Enriched" />}
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
              <h3 className="text-sm font-semibold text-muted-foreground">Deal Pipeline</h3>
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
                      <div className="space-y-2">
                        {stageOpps.map((opp: any) => {
                          const isStale = staleDeals.includes(opp);
                          return (
                            <GlassCard key={opp.id} variant="interactive" className="cursor-pointer !p-3" onClick={() => setSelectedOpp(opp)}>
                              <div className="flex items-start justify-between mb-1">
                                <p className="font-medium text-sm leading-tight">{opp.title}</p>
                                {isStale && <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground mb-2">{opp.companyName}</p>
                              <ConfidenceMeter score={opp.probability ?? 0} size="sm" className="mb-2" />
                              <div className="flex items-center justify-between">
                                <div className="flex gap-1">
                                  <Badge variant="outline" className="text-[9px] px-1 capitalize">{opp.proposalStatus ?? opp.proposal_status ?? "pending"}</Badge>
                                </div>
                                <span className="text-xs font-bold gradient-text-crimson">${(opp.value ?? 0).toLocaleString()}</span>
                              </div>
                            </GlassCard>
                          );
                        })}
                        {stageOpps.length === 0 && (
                          <div className="p-6 border border-dashed border-border/30 rounded-lg text-center text-[10px] text-muted-foreground">
                            No deals in {stageLabels[stage]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "client" && (
          <GlassCard className="py-12 flex flex-col items-center gap-3">
            <Briefcase className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-semibold">Client CRM</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Client-facing CRM instances for deployed client pipelines. Supports PMG Internal CRM, GoHighLevel, and HubSpot integration modes.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">PMG Internal CRM</Badge>
              <Badge variant="outline">GoHighLevel</Badge>
              <Badge variant="outline">HubSpot</Badge>
            </div>
            <Button className="btn-glass text-foreground text-sm px-4 py-2 rounded-lg mt-4"><Plus className="h-4 w-4 mr-2" />Create Client Instance</Button>
          </GlassCard>
        )}
      </motion.div>

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
                <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg"><FileText className="h-4 w-4 mr-2" />Generate Proposal</Button>
                <Button className="btn-premium text-white flex-1 text-sm rounded-lg"><ArrowRight className="h-4 w-4 mr-2" />Advance Stage</Button>
              </div>
            </div>
          );
        })()}
      </DetailDrawer>

      <DetailDrawer open={!!selectedLead} onClose={() => setSelectedLead(null)} title={selectedLead?.companyName ?? `Lead #${selectedLead?.id}`}>
        {selectedLead && (
          <div className="space-y-4">
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
              <Button
                className="btn-glass text-foreground flex-1 text-sm rounded-lg"
                onClick={() => {
                  routeLead.mutate({ id: selectedLead.id, destination: "internal" }, {
                    onSuccess: () => {
                      toast({ title: "Lead routed internally" });
                      setSelectedLead(null);
                    },
                  });
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />Route Internal
              </Button>
              <Button
                className="btn-premium text-white flex-1 text-sm rounded-lg"
                onClick={() => {
                  routeLead.mutate({ id: selectedLead.id, destination: "ghl" }, {
                    onSuccess: () => {
                      toast({ title: "Lead routed to GHL" });
                      setSelectedLead(null);
                    },
                  });
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />Route to GHL
              </Button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
