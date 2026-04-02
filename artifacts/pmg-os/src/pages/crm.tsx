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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import {
  Briefcase, Plus, DollarSign, TrendingUp, Clock, AlertTriangle,
  ArrowRight, FileText, Phone, Calendar, ChevronRight, Bot, Target, Users,
  GripVertical, Pencil, Save, X, Loader2, Building2, User, MessageSquare,
  CheckCircle2, Send, Sparkles, History, RefreshCw
} from "lucide-react";
import { CreateLeadForm } from "@/components/forms/create-lead-form";
import { CreateOpportunityForm } from "@/components/forms/create-opportunity-form";
import { CreateCompanyForm } from "@/components/forms/create-company-form";
import { CreateContactForm } from "@/components/forms/create-contact-form";
import {
  useDeleteLead, useUpdateLead, useRouteLead, useLeadActivities, useUpdateOpportunityMut,
  useNotes, useCreateNote, useFollowUps, useCreateFollowUp, useUpdateFollowUp,
  useGHLSyncLogs, useGHLSyncHealth, useGHLRoutingSummary, useGHLRetryQueue,
  useGHLRetryAllFailed, useGHLSyncRetry, useGHLRouteLeadEnhanced, useGHLRouteBulk,
  useGHLSyncContact, useGHLSyncNotes
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

const stages = ["discovery", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
const stageLabels: Record<string, string> = { discovery: "Discovery", qualification: "Qualification", proposal: "Proposal", negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost" };

const pmgTabs = [
  { id: "leads", label: "Leads", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "pmg", label: "Pipeline", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "routing", label: "GHL Routing", icon: <ArrowRight className="h-3.5 w-3.5" /> },
  { id: "sequences", label: "Sequences", icon: <Clock className="h-3.5 w-3.5" /> },
  { id: "insights", label: "AI Insights", icon: <Bot className="h-3.5 w-3.5" /> },
  { id: "meetings", label: "Meetings", icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: "sync-center", label: "Sync Center", icon: <RefreshCw className="h-3.5 w-3.5" /> },
];

const clientTabs = [
  { id: "contacts", label: "Contacts", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "companies", label: "Companies", icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: "deals", label: "Deals", icon: <DollarSign className="h-3.5 w-3.5" /> },
  { id: "activities", label: "Activities", icon: <Calendar className="h-3.5 w-3.5" /> },
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

function DealNotesSection({ oppId, newNote, setNewNote, createNote, toast }: any) {
  const { data: notes } = useNotes("opportunity", String(oppId));
  const noteList = (notes ?? []) as any[];
  return (
    <div>
      <h4 className="section-header mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-crimson" />Notes ({noteList.length})</h4>
      <div className="space-y-2 mb-3">
        {noteList.map((n: any) => (
          <div key={n.id} className="p-3 rounded-lg glass-surface">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-slate-400">{n.author ?? "Team"}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt ?? n.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-300">{n.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a note..."
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] flex-1"
        />
        <Button
          size="sm"
          className="btn-premium text-white shrink-0 self-end"
          disabled={!newNote.trim() || createNote.isPending}
          onClick={() => {
            createNote.mutate({ entityType: "opportunity", entityId: String(oppId), content: newNote, author: "SherShah K.", domain: "crm" }, {
              onSuccess: () => { toast({ title: "Note added" }); setNewNote(""); },
            });
          }}
        ><Send className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function DealFollowUpsSection({ oppId, newFollowUp, setNewFollowUp, createFollowUp, updateFollowUp, toast }: any) {
  const { data: followUps } = useFollowUps("opportunity", String(oppId));
  const fuList = (followUps ?? []) as any[];
  return (
    <div>
      <h4 className="section-header mb-2 flex items-center gap-2"><Calendar className="h-4 w-4 text-crimson" />Follow-Ups ({fuList.length})</h4>
      <div className="space-y-2 mb-3">
        {fuList.map((fu: any) => {
          const isOverdue = fu.status !== "completed" && new Date(fu.dueDate ?? fu.due_date) < new Date();
          return (
            <div key={fu.id} className={`p-3 rounded-lg glass-surface flex items-center justify-between ${isOverdue ? "border border-crimson/30" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{fu.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] ${isOverdue ? "text-crimson" : "text-muted-foreground"}`}>Due: {new Date(fu.dueDate ?? fu.due_date).toLocaleDateString()}</span>
                  {fu.assignedTo && <span className="text-[10px] text-muted-foreground">· {fu.assignedTo ?? fu.assigned_to}</span>}
                </div>
              </div>
              <Button
                size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                disabled={fu.status === "completed" || updateFollowUp.isPending}
                onClick={() => { updateFollowUp.mutate({ id: fu.id, status: "completed" }, { onSuccess: () => toast({ title: "Follow-up completed" }) }); }}
              >
                {fu.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <CheckCircle2 className="h-3 w-3 text-slate-500" />}
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Follow-up title..."
          value={newFollowUp.title}
          onChange={e => setNewFollowUp((p: any) => ({ ...p, title: e.target.value }))}
          className="bg-white/5 border-white/10 text-white text-xs h-8 flex-1"
        />
        <Input
          type="date"
          value={newFollowUp.dueDate}
          onChange={e => setNewFollowUp((p: any) => ({ ...p, dueDate: e.target.value }))}
          className="bg-white/5 border-white/10 text-white text-xs h-8 w-32"
        />
        <Button
          size="sm" className="btn-premium text-white h-8 shrink-0"
          disabled={!newFollowUp.title.trim() || !newFollowUp.dueDate || createFollowUp.isPending}
          onClick={() => {
            createFollowUp.mutate({ entityType: "opportunity", entityId: String(oppId), title: newFollowUp.title, dueDate: newFollowUp.dueDate, assignedTo: "SherShah K.", domain: "crm" }, {
              onSuccess: () => { toast({ title: "Follow-up created" }); setNewFollowUp({ title: "", dueDate: "" }); },
            });
          }}
        ><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

export default function CRM() {
  const [crmMode, setCrmMode] = useState<"pmg" | "client">("pmg");
  const [activeTab, setActiveTab] = useState("leads");
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [editingLead, setEditingLead] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState<any>({});
  const [editingOpp, setEditingOpp] = useState(false);
  const [oppEditForm, setOppEditForm] = useState<any>({});
  const [newNote, setNewNote] = useState("");
  const [newFollowUp, setNewFollowUp] = useState({ title: "", dueDate: "" });
  const { toast } = useToast();

  const tabs = crmMode === "pmg" ? pmgTabs : clientTabs;
  const updateOpp = useUpdateOpportunityMut();
  const updateLead = useUpdateLead();
  const createNote = useCreateNote();
  const createFollowUp = useCreateFollowUp();
  const updateFollowUp = useUpdateFollowUp();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { data: opportunities, isLoading } = useListOpportunities();
  const { data: communications } = useListCommunications();
  const { data: tasks } = useListTasks();
  const { data: companies } = useListCompanies();
  const { data: leads } = useListLeads();
  const deleteLead = useDeleteLead();
  const routeLead = useRouteLead();
  const routeLeadGHL = useGHLRouteLeadEnhanced();
  const routeBulk = useGHLRouteBulk();
  const { data: ghlSyncHealth } = useGHLSyncHealth();
  const { data: ghlRoutingSummary } = useGHLRoutingSummary();
  const { data: ghlSyncLogsData } = useGHLSyncLogs();
  const { data: retryQueueData } = useGHLRetryQueue();
  const retryAllFailed = useGHLRetryAllFailed();
  const syncRetry = useGHLSyncRetry();
  const syncContact = useGHLSyncContact();
  const syncNotes = useGHLSyncNotes();
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const { isHuman, isHybrid, isAuto } = useAiModeContext();

  const leadList = (leads ?? []) as any[];
  const companyList = (companies ?? []) as any[];

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
        subtitle={crmMode === "pmg" ? "PMG Advanced CRM — Internal operating control" : "Client Portal CRM — GoHighLevel / HubSpot style"}
        icon={<Briefcase className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
              <button
                onClick={() => { setCrmMode("pmg"); setActiveTab("leads"); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${crmMode === "pmg" ? "bg-crimson text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
              >PMG CRM</button>
              <button
                onClick={() => { setCrmMode("client"); setActiveTab("contacts"); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${crmMode === "client" ? "bg-blue-600 text-white shadow-lg" : "text-muted-foreground hover:text-white"}`}
              >Client Portal</button>
            </div>
            <Button
              className="btn-premium text-white text-sm px-4 py-2 rounded-lg"
              onClick={() => setShowCreateLead(true)}
            >
              <Plus className="h-4 w-4 mr-2" />New Lead
            </Button>
          </div>
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

        {activeTab === "routing" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Routed to PMG" value={(ghlRoutingSummary as any)?.pmg ?? leadList.filter((l: any) => l.routingDestination === "pmg" || (!l.routingDestination && (l.status === "qualified" || l.status === "scored"))).length} icon={<Target className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Routed to GHL" value={(ghlRoutingSummary as any)?.ghl ?? leadList.filter((l: any) => l.routingDestination === "ghl").length} icon={<Send className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Routed to Both" value={(ghlRoutingSummary as any)?.both ?? leadList.filter((l: any) => l.routingDestination === "both").length} icon={<Users className="h-4 w-4" />} accent="gold" />
              <KpiCard label="Held / Unrouted" value={(ghlRoutingSummary as any)?.hold ?? leadList.filter((l: any) => !l.routingDestination || l.routingDestination === "hold").length} icon={<Clock className="h-4 w-4" />} accent="default" />
            </div>

            {selectedLeadIds.length > 0 && (
              <GlassCard glow="crimson">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? "s" : ""} selected</p>
                  <div className="flex items-center gap-1">
                    {(["pmg", "ghl", "both", "hold"] as const).map(dest => (
                      <Button key={dest} variant="ghost" size="sm"
                        className={`h-7 px-2 text-[10px] border ${
                          dest === "pmg" ? "border-crimson/30 text-crimson hover:bg-crimson/10" :
                          dest === "ghl" ? "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" :
                          dest === "both" ? "border-green-500/30 text-green-400 hover:bg-green-500/10" :
                          "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                        }`}
                        onClick={() => {
                          routeBulk.mutate({ leadIds: selectedLeadIds, destination: dest }, {
                            onSuccess: (r: any) => { toast({ title: `Bulk routed ${r?.results?.length ?? selectedLeadIds.length} leads → ${dest.toUpperCase()}` }); setSelectedLeadIds([]); }
                          });
                        }}
                        disabled={routeBulk.isPending}
                      >
                        {dest.toUpperCase()}
                      </Button>
                    ))}
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground" onClick={() => setSelectedLeadIds([])}>Clear</Button>
                  </div>
                </div>
              </GlassCard>
            )}

            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><ArrowRight className="h-4 w-4 text-crimson" />Lead Routing Center</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${(ghlSyncHealth as any)?.status === "healthy" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"}`}>
                    {(ghlSyncHealth as any)?.status === "healthy" ? "GHL Connected" : "GHL Standby"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                {leadList.map((lead: any) => {
                  const dest = lead.routingDestination;
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <div key={lead.id} className={`flex items-center justify-between p-3 rounded-lg glass-surface transition-all ${isSelected ? "ring-1 ring-crimson/30 bg-crimson/5" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input type="checkbox" checked={isSelected} onChange={e => {
                          setSelectedLeadIds(prev => e.target.checked ? [...prev, lead.id] : prev.filter(x => x !== lead.id));
                        }} className="accent-crimson" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{lead.companyName ?? `Lead #${lead.id}`}</p>
                            {dest && (
                              <Badge variant="outline" className={`text-[8px] shrink-0 ${
                                dest === "pmg" ? "border-crimson/30 text-crimson" :
                                dest === "ghl" ? "border-blue-500/30 text-blue-400" :
                                dest === "both" ? "border-green-500/30 text-green-400" :
                                "border-yellow-500/30 text-yellow-400"
                              }`}>
                                {dest.toUpperCase()}
                              </Badge>
                            )}
                            {lead.retainCopy && dest && dest !== "pmg" && (
                              <Badge variant="outline" className="text-[7px] border-emerald-500/20 text-emerald-400">Copy Retained</Badge>
                            )}
                            {lead.externalCrmId && (
                              <Badge variant="outline" className="text-[7px] border-blue-500/20 text-blue-300">GHL: {lead.externalCrmId.slice(0, 8)}...</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{lead.contactName} · Score: {lead.fitScore ?? "Pending"}{lead.lastSyncedAt ? ` · Synced: ${new Date(lead.lastSyncedAt).toLocaleString()}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(["pmg", "ghl", "both", "hold"] as const).map(d => (
                          <Button key={d} variant="ghost" size="sm"
                            className={`h-7 px-2 text-[10px] border ${
                              d === dest ? "ring-1 ring-white/20 font-bold" : ""
                            } ${
                              d === "pmg" ? "border-crimson/30 text-crimson hover:bg-crimson/10" :
                              d === "ghl" ? "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" :
                              d === "both" ? "border-green-500/30 text-green-400 hover:bg-green-500/10" :
                              "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                            }`}
                            onClick={() => {
                              routeLead.mutate({ id: lead.id, destination: d }, {
                                onSuccess: () => toast({ title: `Routed → ${d.toUpperCase()}`, description: "Copy retained in PMG" })
                              });
                            }}
                            disabled={routeLead.isPending}
                          >
                            {d.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {leadList.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-xs">No leads pending routing</div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4 text-crimson" />Recent Sync Activity</h3>
                {(retryQueueData?.queue ?? []).length > 0 && (
                  <Button className="btn-glass text-foreground text-[10px] px-2 py-1 rounded-lg"
                    onClick={() => retryAllFailed.mutate(undefined, { onSuccess: (r: any) => toast({ title: `Retried ${r?.retried ?? 0} failed` }) })}
                    disabled={retryAllFailed.isPending}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />Retry Failed ({(retryQueueData?.queue ?? []).length})
                  </Button>
                )}
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(ghlSyncLogsData?.logs ?? []).slice(0, 15).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-green-400" : log.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                      <span className="font-medium">{log.entityType}#{log.entityId}</span>
                      <span className="text-muted-foreground truncate">{log.direction ?? "outbound"} · {log.action ?? "sync"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {log.status === "failed" && (
                        <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px] text-red-400 hover:bg-red-500/10"
                          onClick={() => syncRetry.mutate(log.id, { onSuccess: () => toast({ title: "Retry triggered" }) })}>
                          Retry
                        </Button>
                      )}
                      <span className="text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
                    </div>
                  </div>
                ))}
                {(ghlSyncLogsData?.logs ?? []).length === 0 && (
                  <div className="py-4 text-center text-muted-foreground text-xs">No sync activity yet — route a lead to start</div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "sequences" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Sequences" value={3} icon={<Clock className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Enrolled" value={24} icon={<Users className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Responded" value={8} icon={<MessageSquare className="h-4 w-4" />} accent="success" />
              <KpiCard label="Converted" value={3} icon={<CheckCircle2 className="h-4 w-4" />} accent="gold" />
            </div>
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Outreach Sequences</h3>
              <div className="space-y-3">
                {[
                  { name: "Cold Outreach — Cybersecurity Decision Makers", steps: 5, enrolled: 12, responded: 4, status: "active" },
                  { name: "Follow-Up — Demo No-Shows", steps: 3, enrolled: 6, responded: 2, status: "active" },
                  { name: "Warm Re-engagement — Stale Pipeline", steps: 4, enrolled: 6, responded: 2, status: "paused" },
                ].map((seq, i) => (
                  <div key={i} className="p-4 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">{seq.name}</h4>
                      <Badge variant="outline" className={`text-[10px] capitalize ${seq.status === "active" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"}`}>{seq.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div><span className="text-muted-foreground">Steps:</span> <span className="font-medium">{seq.steps}</span></div>
                      <div><span className="text-muted-foreground">Enrolled:</span> <span className="font-medium">{seq.enrolled}</span></div>
                      <div><span className="text-muted-foreground">Responded:</span> <span className="font-medium text-green-400">{seq.responded}</span></div>
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      {Array.from({ length: seq.steps }).map((_, j) => (
                        <div key={j} className={`h-1.5 rounded-full flex-1 ${j < seq.responded ? "bg-green-400" : j < seq.enrolled ? "bg-crimson" : "bg-white/10"}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-green-400" />
                  <h3 className="text-sm font-semibold">Close Probability</h3>
                </div>
                <div className="space-y-2">
                  {oppList.slice(0, 5).map((opp: any) => (
                    <div key={opp.id} className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1">{opp.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-crimson rounded-full" style={{ width: `${opp.probability ?? 0}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums w-8 text-right">{opp.probability ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold">Risk Flags</h3>
                </div>
                <div className="space-y-2">
                  {staleDeals.length > 0 ? staleDeals.slice(0, 5).map((opp: any) => (
                    <div key={opp.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                      <AlertTriangle className="h-3 w-3 text-yellow-400 shrink-0" />
                      <span className="truncate">{opp.title} — stale {Math.floor((Date.now() - new Date(opp.updatedAt).getTime()) / 86400000)}d</span>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground">No risk flags</p>
                  )}
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Next Best Actions</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { action: "Follow up with TechCorp on proposal", priority: "high" },
                    { action: "Schedule demo for SecureNet", priority: "medium" },
                    { action: "Send case study to DataVault", priority: "medium" },
                    { action: "Re-engage stale leads from LinkedIn", priority: "low" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.priority === "high" ? "bg-red-400" : item.priority === "medium" ? "bg-yellow-400" : "bg-blue-400"}`} />
                      <span>{item.action}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-crimson" />
                <h3 className="text-sm font-semibold">AI Pipeline Summary</h3>
              </div>
              <div className="p-4 rounded-lg bg-white/5 text-sm text-slate-300 leading-relaxed">
                <p>Your pipeline has <strong className="text-white">{activeDeals.length} active deals</strong> worth <strong className="gradient-text-crimson">${totalValue.toLocaleString()}</strong> total. Weighted forecast is <strong className="text-green-400">${Math.round(weightedValue).toLocaleString()}</strong>.</p>
                {staleDeals.length > 0 && <p className="mt-2 text-yellow-400">⚠ {staleDeals.length} deal(s) have been stale for over {staleDays} days — consider follow-up or reassignment.</p>}
                <p className="mt-2">Top conversion opportunity: <strong>{oppList[0]?.title ?? "No deals yet"}</strong> at {oppList[0]?.probability ?? 0}% probability.</p>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Upcoming Meetings</h3>
                </div>
                <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="h-3 w-3 mr-1" />Schedule Meeting</Button>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { title: "Discovery Call — Acme Corp", type: "Discovery", date: "Apr 4, 10:00 AM", duration: "30 min", attendees: ["SherShah K.", "John Smith (Acme)"], stage: "discovery", deal: "Acme Security Audit" },
                  { title: "Proposal Review — DataVault Inc", type: "Proposal", date: "Apr 5, 2:00 PM", duration: "45 min", attendees: ["SherShah K.", "Sarah Chen (DataVault)", "Legal Team"], stage: "proposal", deal: "DataVault Compliance Package" },
                  { title: "QBR — TechStart LLC", type: "Account Review", date: "Apr 7, 11:00 AM", duration: "60 min", attendees: ["SherShah K.", "Mike Johnson (TechStart)"], stage: "closed_won", deal: "TechStart Managed Security" },
                  { title: "Demo — SecureNet Solutions", type: "Demo", date: "Apr 8, 3:30 PM", duration: "45 min", attendees: ["SherShah K.", "Lisa Park (SecureNet)", "CTO"], stage: "qualification", deal: "SecureNet Pen Testing" },
                ].map((meeting, i) => (
                  <div key={i} className="p-3 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{meeting.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px]">{meeting.type}</Badge>
                          <Badge variant="outline" className="text-[9px]">{meeting.duration}</Badge>
                          <span className="text-[10px] text-crimson font-medium">{meeting.date}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg"><Sparkles className="h-3 w-3 mr-1" />Prep Brief</Button>
                        <Button className="btn-premium text-white text-xs px-2 py-1 rounded-lg">Join</Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {meeting.attendees.map((a, j) => <Badge key={j} variant="outline" className="text-[9px]">{a}</Badge>)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Recent Meeting Notes</h3></div>
              <div className="px-5 pb-4 space-y-2">
                {commList.filter((c: any) => c.type === "meeting").slice(0, 5).map((comm: any) => (
                  <div key={comm.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{comm.subject}</p>
                      <p className="text-[10px] text-muted-foreground">{comm.createdAt ? new Date(comm.createdAt).toLocaleDateString() : ""} · {comm.duration ? `${comm.duration} min` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge variant={comm.sentiment === "positive" ? "success" : "pending"} label={comm.sentiment ?? "neutral"} />
                      <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2">View Notes</Button>
                    </div>
                  </div>
                ))}
                {commList.filter((c: any) => c.type === "meeting").length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No meeting notes recorded yet</p>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "sync-center" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Synced" value={(ghlSyncHealth as any)?.totalSynced ?? (ghlSyncLogsData?.succeeded ?? 0)} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
              <KpiCard label="Failed Syncs" value={(ghlSyncHealth as any)?.totalFailed ?? (ghlSyncLogsData?.failed ?? 0)} icon={<AlertTriangle className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Health Score" value={`${(ghlSyncHealth as any)?.healthScore ?? 100}%`} icon={<TrendingUp className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Retry Queue" value={(retryQueueData?.queue ?? []).length} icon={<RefreshCw className="h-4 w-4" />} accent="gold" />
            </div>

            <GlassCard glow="blue" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">CRM Sync Status</h3>
                </div>
                <div className="flex items-center gap-2">
                  {(retryQueueData?.queue ?? []).length > 0 && (
                    <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg"
                      onClick={() => retryAllFailed.mutate(undefined, { onSuccess: (r: any) => toast({ title: `Retried ${r?.retried ?? 0} failed syncs` }) })}
                      disabled={retryAllFailed.isPending}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />Retry All Failed
                    </Button>
                  )}
                </div>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { entity: "Leads", synced: leadList.filter((l: any) => l.externalCrmId || l.routingDestination).length, total: leadList.length, source: "PMG ↔ GHL" },
                  { entity: "Opportunities", synced: oppList.length, total: oppList.length, source: "PMG Internal" },
                  { entity: "Contacts", synced: commList.length, total: commList.length, source: "PMG ↔ GHL" },
                  { entity: "Companies", synced: companyList.length, total: companyList.length, source: "Intelligence" },
                ].map((sync) => {
                  const pct = sync.total > 0 ? Math.round((sync.synced / sync.total) * 100) : 100;
                  const status = pct === 100 ? "synced" : pct > 50 ? "partial" : "behind";
                  return (
                    <div key={sync.entity} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status === "synced" ? "bg-success" : status === "partial" ? "bg-warning" : "bg-crimson"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{sync.entity}</p>
                          <p className="text-[10px] text-muted-foreground">{sync.source}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold">{sync.synced}/{sync.total}</p>
                          <p className="text-[9px] text-muted-foreground">{pct}% synced</p>
                        </div>
                        <StatusBadge variant={status === "synced" ? "active" : "warning"} label={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sync Log — All Activity</h3>
                <Badge variant="outline" className="text-[10px]">{ghlSyncLogsData?.total ?? 0} total entries</Badge>
              </div>
              <div className="px-5 pb-4 space-y-1.5 max-h-64 overflow-y-auto">
                {(ghlSyncLogsData?.logs ?? []).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-green-400" : log.status === "failed" ? "bg-red-400" : "bg-yellow-400"}`} />
                      <span className="font-medium">{log.entityType}#{log.entityId}</span>
                      <span className="text-muted-foreground truncate">{log.direction ?? "outbound"} · {log.action ?? "sync"}</span>
                      {log.retryCount > 0 && <Badge variant="outline" className="text-[8px] border-yellow-500/20 text-yellow-400">retry #{log.retryCount}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {log.status === "failed" && (
                        <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px] text-red-400 hover:bg-red-500/10"
                          onClick={() => syncRetry.mutate(log.id, { onSuccess: () => toast({ title: "Retry triggered" }) })}>
                          Retry
                        </Button>
                      )}
                      <span className="text-[10px] text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
                    </div>
                  </div>
                ))}
                {(ghlSyncLogsData?.logs ?? []).length === 0 && (
                  <div className="py-6 text-center text-muted-foreground text-xs">No sync logs yet — route a lead to generate sync activity</div>
                )}
              </div>
            </GlassCard>

            {(retryQueueData?.queue ?? []).length > 0 && (
              <GlassCard glow="crimson" className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Retry Queue ({(retryQueueData?.queue ?? []).length})
                  </h3>
                  <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg"
                    onClick={() => retryAllFailed.mutate(undefined, { onSuccess: (r: any) => toast({ title: `Retried ${r?.retried ?? 0} items` }) })}
                    disabled={retryAllFailed.isPending}
                  >
                    Retry All
                  </Button>
                </div>
                <div className="px-5 pb-4 space-y-1.5">
                  {(retryQueueData?.queue ?? []).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.entityType}#{item.entityId}</span>
                        <span className="text-red-400 truncate max-w-48">{item.errorMessage ?? "Sync failed"}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-5 px-2 text-[9px] text-crimson"
                        onClick={() => syncRetry.mutate(item.id, { onSuccess: () => toast({ title: "Retrying..." }) })}>
                        Retry
                      </Button>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="space-y-6">
            <div className="flex gap-2 mb-4">
              <Button className="btn-glass text-foreground text-sm" onClick={() => setShowCreateContact(true)}><User className="h-4 w-4 mr-2" />New Contact</Button>
            </div>
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Contact Directory</h3></div>
              <div className="px-5 pb-4">
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground border-b border-white/5">
                    <th className="text-left py-2 px-2">Name</th><th className="text-left py-2 px-2">Email</th><th className="text-left py-2 px-2">Company</th><th className="text-left py-2 px-2">Title</th><th className="text-left py-2 px-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {commList.slice(0, 20).map((c: any, i: number) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 px-2 font-medium">{c.contactName ?? c.subject ?? `Contact ${i + 1}`}</td>
                        <td className="py-2 px-2 text-muted-foreground">{c.contactEmail ?? "—"}</td>
                        <td className="py-2 px-2 text-muted-foreground">{c.companyName ?? "—"}</td>
                        <td className="py-2 px-2 text-muted-foreground">{c.title ?? "—"}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-[9px]">Active</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "companies" && (
          <div className="space-y-6">
            <div className="flex gap-2 mb-4">
              <Button className="btn-premium text-white text-sm" onClick={() => setShowCreateCompany(true)}><Building2 className="h-4 w-4 mr-2" />New Company</Button>
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

        {activeTab === "deals" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Pipeline Value" value={`$${totalValue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Active Deals" value={activeDeals.length} icon={<Briefcase className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Won" value={oppList.filter((o: any) => o.stage === "closed_won").length} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
              <KpiCard label="Lost" value={oppList.filter((o: any) => o.stage === "closed_lost").length} icon={<AlertTriangle className="h-4 w-4" />} accent="default" />
            </div>
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">All Deals</h3>
                <Button className="btn-premium text-white text-xs px-3 py-1" onClick={() => setShowCreateDeal(true)}><Plus className="h-3 w-3 mr-1" />New Deal</Button>
              </div>
              <div className="px-5 pb-4">
                <table className="w-full text-xs">
                  <thead><tr className="text-muted-foreground border-b border-white/5">
                    <th className="text-left py-2 px-2">Deal</th><th className="text-left py-2 px-2">Value</th><th className="text-left py-2 px-2">Stage</th><th className="text-left py-2 px-2">Probability</th><th className="text-left py-2 px-2">Owner</th>
                  </tr></thead>
                  <tbody>
                    {oppList.map((opp: any) => (
                      <tr key={opp.id} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedOpp(opp)}>
                        <td className="py-2 px-2 font-medium">{opp.title}</td>
                        <td className="py-2 px-2 gradient-text-crimson font-bold">${(opp.value ?? 0).toLocaleString()}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-[9px] capitalize">{stageLabels[opp.stage] ?? opp.stage}</Badge></td>
                        <td className="py-2 px-2"><ConfidenceMeter score={opp.probability ?? 0} size="sm" /></td>
                        <td className="py-2 px-2 text-muted-foreground">{opp.owner ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "activities" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Communications" value={commList.length} icon={<Phone className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Tasks" value={taskList.length} icon={<Calendar className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Pending" value={taskList.filter((t: any) => t.status !== "completed").length} icon={<Clock className="h-4 w-4" />} accent="gold" />
              <KpiCard label="Completed" value={taskList.filter((t: any) => t.status === "completed").length} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
            </div>
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3">Recent Activities</h3>
              <div className="space-y-2">
                {commList.slice(0, 10).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.type === "call" ? "bg-green-500/20" : c.type === "email" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                      {c.type === "call" ? <Phone className="h-3.5 w-3.5 text-green-400" /> : c.type === "email" ? <MessageSquare className="h-3.5 w-3.5 text-blue-400" /> : <Calendar className="h-3.5 w-3.5 text-purple-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.subject}</p>
                      <p className="text-[10px] text-muted-foreground">{c.summary ?? "No summary"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[9px] capitalize">{c.type}</Badge>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{c.performedBy ?? c.performed_by ?? "Team"}</p>
                    </div>
                  </div>
                ))}
                {commList.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-xs">No activities recorded yet</div>
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
      </ModeAwareWrapper>

      <DetailDrawer
        open={!!selectedOpp}
        onClose={() => { setSelectedOpp(null); setEditingOpp(false); }}
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

              <div className="flex items-center justify-end">
                <Button
                  variant="ghost" size="sm" className="text-xs"
                  onClick={() => {
                    if (editingOpp) { setEditingOpp(false); }
                    else {
                      setOppEditForm({ value: selectedOpp.value ?? 0, probability: selectedOpp.probability ?? 50, owner: selectedOpp.owner ?? "", notes: selectedOpp.notes ?? "", stage: selectedOpp.stage ?? "discovery" });
                      setEditingOpp(true);
                    }
                  }}
                >
                  {editingOpp ? <><X className="h-3 w-3 mr-1" />Cancel</> : <><Pencil className="h-3 w-3 mr-1" />Edit</>}
                </Button>
              </div>

              {editingOpp ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Value ($)</Label>
                      <Input type="number" value={oppEditForm.value} onChange={e => setOppEditForm((f: any) => ({ ...f, value: parseFloat(e.target.value) || 0 }))} className="bg-white/5 border-white/10 text-white h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Probability (%)</Label>
                      <Input type="number" min="0" max="100" value={oppEditForm.probability} onChange={e => setOppEditForm((f: any) => ({ ...f, probability: parseInt(e.target.value) || 0 }))} className="bg-white/5 border-white/10 text-white h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Stage</Label>
                    <Select value={oppEditForm.stage} onValueChange={v => setOppEditForm((f: any) => ({ ...f, stage: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                        {stages.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{stageLabels[s] ?? s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Owner</Label>
                    <Input value={oppEditForm.owner} onChange={e => setOppEditForm((f: any) => ({ ...f, owner: e.target.value }))} className="bg-white/5 border-white/10 text-white h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Notes</Label>
                    <Input value={oppEditForm.notes} onChange={e => setOppEditForm((f: any) => ({ ...f, notes: e.target.value }))} className="bg-white/5 border-white/10 text-white h-8 text-xs" />
                  </div>
                  <Button
                    className="btn-premium text-white w-full text-xs rounded-lg"
                    disabled={updateOpp.isPending}
                    onClick={() => {
                      updateOpp.mutate({ id: selectedOpp.id, data: oppEditForm }, {
                        onSuccess: () => { toast({ title: "Deal Updated" }); setEditingOpp(false); setSelectedOpp(null); },
                      });
                    }}
                  >
                    {updateOpp.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}Save Changes
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Service Type</span><p className="font-medium capitalize">{selectedOpp.serviceType ?? selectedOpp.service_type}</p></div>
                  <div><span className="text-muted-foreground text-xs">Owner</span><p className="font-medium">{selectedOpp.owner}</p></div>
                  <div><span className="text-muted-foreground text-xs">Proposal Status</span><StatusBadge variant={selectedOpp.proposalStatus === "accepted" ? "human-approved" : "pending"} label={selectedOpp.proposalStatus ?? selectedOpp.proposal_status} /></div>
                  <div><span className="text-muted-foreground text-xs">Stage</span><p className="font-medium capitalize">{selectedOpp.stage}</p></div>
                </div>
              )}

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

              <DealNotesSection oppId={selectedOpp.id} newNote={newNote} setNewNote={setNewNote} createNote={createNote} toast={toast} />
              <DealFollowUpsSection oppId={selectedOpp.id} newFollowUp={newFollowUp} setNewFollowUp={setNewFollowUp} createFollowUp={createFollowUp} updateFollowUp={updateFollowUp} toast={toast} />
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
