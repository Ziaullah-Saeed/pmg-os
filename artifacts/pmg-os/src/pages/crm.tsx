import { useState, useMemo, useCallback } from "react";
import { useListOpportunities, useListLeads, useListCompanies } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { AiResultPanel } from "@/components/ai-result-panel";
import { ModeBadge } from "@/components/mode-badge";
import { ContactChannels } from "@/components/contact-channels";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateOpportunityMut,
  useCreateOpportunityMut,
  useConvertLead,
  useCloseLead,
  useDeleteOpportunity,
  useAiQualifyLead,
  useAiManageDeal,
  useAiPrepareCall,
  useAiCreateProposal,
  useAiSyncGhl,
  useAiCoachingCards,
  useProcessTranscript,
  useAiOutputs,
  useSaveAiOutput,
  useIntegrationStatus,
  useSyncLogs,
  useTriggerSync,
} from "@/hooks/use-api";
import {
  Briefcase, DollarSign, TrendingUp, Users, Phone, FileText,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Sparkles, Plus,
  Search, Filter, ChevronRight, Target, Flame, Snowflake, Ban,
  BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink,
  MessageSquare, Mic, Upload, BookOpen, Shield, Send, Eye, X, Mail,
  Zap, AlertTriangle, Calendar, Star, Copy, Link2, Bot, Hand,
  Play, Pause, UserCheck, Trash2
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const stages = [
  { id: "new", label: "New Lead", color: "bg-blue-500", textColor: "text-blue-400" },
  { id: "meeting_scheduled", label: "Meeting Set", color: "bg-cyan-500", textColor: "text-cyan-400" },
  { id: "discovery", label: "Discovery", color: "bg-gold", textColor: "text-gold" },
  { id: "proposal", label: "Proposal", color: "bg-orange-500", textColor: "text-orange-400" },
  { id: "negotiation", label: "Negotiation", color: "bg-crimson", textColor: "text-crimson" },
  { id: "closed_won", label: "Won", color: "bg-success", textColor: "text-success" },
  { id: "closed_lost", label: "Lost", color: "bg-muted-foreground", textColor: "text-muted-foreground" },
];

const tabs = [
  { id: "pipeline", label: "Pipeline", icon: <Briefcase className="h-4 w-4" /> },
  { id: "qualification", label: "Lead Qualification", icon: <Target className="h-4 w-4" /> },
  { id: "calls", label: "Call Intelligence", icon: <Phone className="h-4 w-4" /> },
  { id: "proposals", label: "Proposals", icon: <FileText className="h-4 w-4" /> },
  { id: "sync", label: "CRM Sync", icon: <RefreshCw className="h-4 w-4" /> },
];

function getTier(score: number) {
  if (score >= 80) return { label: "Hot", icon: <Flame className="h-3.5 w-3.5" />, color: "text-red-400 bg-red-500/10 border-red-500/20" };
  if (score >= 50) return { label: "Warm", icon: <Target className="h-3.5 w-3.5" />, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" };
  if (score >= 20) return { label: "Cold", icon: <Snowflake className="h-3.5 w-3.5" />, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  return { label: "Disqualified", icon: <Ban className="h-3.5 w-3.5" />, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
}

function getDealHealth(deal: any) {
  const daysSinceUpdate = deal.updatedAt ? Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / 86400000) : 0;
  if (deal.stage === "closed_won") return { status: "won", color: "text-success", label: "Won" };
  if (deal.stage === "closed_lost") return { status: "lost", color: "text-muted-foreground", label: "Lost" };
  if (daysSinceUpdate > 14) return { status: "red", color: "text-red-400", label: "At Risk" };
  if (daysSinceUpdate > 7) return { status: "yellow", color: "text-yellow-400", label: "Stale" };
  return { status: "green", color: "text-success", label: "Healthy" };
}

export default function CRM() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [showNewDealForm, setShowNewDealForm] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const { data: opportunities } = useListOpportunities();
  const { data: leads } = useListLeads();
  const { data: companies } = useListCompanies();
  const { isHuman, isAuto, currentMode } = useAiModeContext();
  const { toast } = useToast();
  const qualifyLead = useAiQualifyLead();
  const manageDeal = useAiManageDeal();
  const prepareCall = useAiPrepareCall();
  const createProposal = useAiCreateProposal();
  const syncGhl = useAiSyncGhl();

  const oppList = useMemo(() => (opportunities ?? []) as any[], [opportunities]);
  const leadList = useMemo(() => (leads ?? []) as any[], [leads]);

  const activeDeals = oppList.filter((o: any) => o.stage !== "closed_won" && o.stage !== "closed_lost").length;
  const wonDeals = oppList.filter((o: any) => o.stage === "closed_won").length;
  const totalPipeline = oppList
    .filter((o: any) => o.stage !== "closed_won" && o.stage !== "closed_lost")
    .reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const totalWon = oppList
    .filter((o: any) => o.stage === "closed_won")
    .reduce((s: number, o: any) => s + (o.value ?? 0), 0);

  const avgScore = leadList.length
    ? Math.round(leadList.reduce((s: number, l: any) => s + (l.fitScore ?? l.confidenceScore ?? 0), 0) / leadList.length)
    : 0;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="CRM Pipeline"
        subtitle={isHuman ? "Deal tracking and relationship management" : "AI-powered deal intelligence and pipeline optimization"}
        icon={<Briefcase className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
                          <Button variant="outline" className="text-sm border-crimson/30 text-crimson hover:bg-crimson/10"
                disabled={manageDeal.isPending}
                onClick={() => manageDeal.mutate({ companyName: "Pipeline Review", dealValue: totalPipeline, interactions: ["review all deals"] }, {
                  onSuccess: (data) => setAiResult({ type: "pipeline_review", data }),
                })}>
                {manageDeal.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Pipeline Review
              </Button>
            
            <Button className="btn-premium text-white text-sm" onClick={() => { setActiveTab("pipeline"); setShowNewDealForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Deal
            </Button>
          </div>
        }
      />

      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Pipeline Review" />}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Active Deals" value={activeDeals} icon={<Briefcase className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Won Deals" value={wonDeals} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Pipeline Value" value={`$${(totalPipeline / 1000).toFixed(0)}k`} icon={<TrendingUp className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Revenue Won" value={`$${(totalWon / 1000).toFixed(0)}k`} icon={<DollarSign className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Avg Lead Score" value={`${avgScore}%`} icon={<Target className="h-4 w-4" />} accent="blue" />
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-crimson text-white"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "pipeline" && <PipelineTab deals={oppList} leads={leadList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} showNewDealForm={showNewDealForm} setShowNewDealForm={setShowNewDealForm} />}
          {activeTab === "qualification" && <QualificationTab leads={leadList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} onTabChange={setActiveTab} />}
          {activeTab === "calls" && <CallIntelligenceTab deals={oppList} leads={leadList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} />}
          {activeTab === "proposals" && <ProposalsTab deals={oppList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} />}
          {activeTab === "sync" && <CrmSyncTab deals={oppList} leads={leadList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PipelineTab({ deals, leads, isHuman, isAuto, currentMode, showNewDealForm, setShowNewDealForm }: { deals: any[]; leads: any[]; isHuman: boolean; isAuto: boolean; currentMode: string; showNewDealForm: boolean; setShowNewDealForm: (v: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const showNewDeal = showNewDealForm;
  const setShowNewDeal = setShowNewDealForm;
  const updateOpp = useUpdateOpportunityMut();
  const createOpp = useCreateOpportunityMut();
  const { toast } = useToast();

  const [newDeal, setNewDeal] = useState({ title: "", value: "", serviceType: "cybersecurity", stage: "new" });

  const filteredDeals = search
    ? deals.filter((d: any) => (d.title ?? "").toLowerCase().includes(search.toLowerCase()))
    : deals;

  const handleCreateDeal = () => {
    if (!newDeal.title) return;
    createOpp.mutate({
      title: newDeal.title,
      value: parseFloat(newDeal.value) || 0,
      serviceType: newDeal.serviceType,
      stage: newDeal.stage,
    }, {
      onSuccess: () => {
        setShowNewDeal(false);
        setNewDeal({ title: "", value: "", serviceType: "cybersecurity", stage: "new" });
      }
    });
  };

  const handleStageChange = (dealId: number, newStage: string) => {
    const extra: Record<string, unknown> = { stage: newStage };
    if (newStage === "closed_won") extra.wonAt = new Date().toISOString();
    if (newStage === "closed_lost") extra.lostAt = new Date().toISOString();
    updateOpp.mutate({ id: dealId, data: extra });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10"
          />
        </div>
        <Badge variant="outline" className="text-xs">{deals.length} deals</Badge>
        <Button
          className="btn-premium text-white text-sm ml-auto"
          onClick={() => setShowNewDeal(!showNewDeal)}
        >
          <Plus className="h-4 w-4 mr-2" />{showNewDeal ? "Cancel" : "New Deal"}
        </Button>
      </div>

      {showNewDeal && (
        <GlassCard className="border border-crimson/20">
          <h3 className="text-sm font-semibold mb-3">Create New Deal</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Deal title (e.g. CyberShield — SEO Package)"
              value={newDeal.title}
              onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
              className="bg-white/5 border-white/10"
            />
            <Input
              placeholder="Value ($)"
              type="number"
              value={newDeal.value}
              onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
              className="bg-white/5 border-white/10"
            />
            <select
              value={newDeal.serviceType}
              onChange={(e) => setNewDeal({ ...newDeal, serviceType: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
            >
              <option value="cybersecurity">Cybersecurity Marketing</option>
              <option value="it_services">IT Services Marketing</option>
              <option value="seo">SEO Package</option>
              <option value="ppc">PPC Management</option>
              <option value="content">Content Marketing</option>
              <option value="social_media">Social Media Management</option>
              <option value="lead_gen">Lead Generation</option>
              <option value="branding">Branding & Identity</option>
              <option value="web_design">Website Design</option>
              <option value="email_marketing">Email Marketing</option>
              <option value="full_service">Full Service</option>
            </select>
            <Button onClick={handleCreateDeal} disabled={!newDeal.title || createOpp.isPending} className="btn-premium text-white">
              {createOpp.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </GlassCard>
      )}

      {currentMode !== "human" && (
        <div className="flex items-center gap-1.5 px-1">
          <Bot className="h-3 w-3 text-crimson/70" />
          <span className="text-[10px] text-muted-foreground">
            {isAuto ? "Deals auto-advance based on AI deal intelligence. Pipeline health monitored continuously." : "AI recommends stage changes — you drag or click to confirm advancement."}
          </span>
        </div>
      )}
      {isHuman && (
        <div className="flex items-center gap-1.5 px-1">
          <Hand className="h-3 w-3 text-yellow-400/70" />
          <span className="text-[10px] text-muted-foreground">Manual mode — click deal cards to open details and advance stages yourself.</span>
        </div>
      )}

      {filteredDeals.length === 0 ? (
        <GlassCard>
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-sm font-semibold mb-2">Pipeline is Empty</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
              Qualified leads from Outreach will appear here as deals. Convert leads to create opportunities.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {stages.map((stage, stageIdx) => {
            const stageDeals = filteredDeals.filter((o: any) => o.stage === stage.id);
            const nextStage = stageIdx < stages.length - 2 ? stages[stageIdx + 1] : null;
            return (
              <div key={stage.id} className="space-y-2 min-h-[200px]">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-xs font-medium truncate">{stage.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{stageDeals.length}</Badge>
                </div>
                {stageDeals.map((deal: any) => {
                  const health = getDealHealth(deal);
                  return (
                    <div
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="p-2.5 rounded-lg glass-surface cursor-pointer hover:glass-card-interactive text-xs group transition-all"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="font-medium truncate flex-1">{deal.title ?? deal.name}</p>
                        {deal.createdByMode && <ModeBadge mode={deal.createdByMode} />}
                      </div>
                      <p className="text-crimson font-semibold">${((deal.value ?? 0) / 1000).toFixed(0)}k</p>
                      {deal.serviceType && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 capitalize">{(deal.serviceType ?? "").replace(/_/g, " ")}</p>
                      )}
                      {deal.companyName && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{deal.companyName}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${health.status === "green" ? "bg-success" : health.status === "yellow" ? "bg-yellow-400" : health.status === "red" ? "bg-red-400" : "bg-muted-foreground"}`} />
                        <span className={`text-[10px] ${health.color}`}>{health.label}</span>
                      </div>
                      {stage.id !== "closed_won" && stage.id !== "closed_lost" && nextStage && (
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex gap-1">
                          <Button size="sm" variant="outline" className="text-[9px] h-5 px-1.5 flex-1 border-success/30 text-success"
                            onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, nextStage.id); toast({ title: "Deal Advanced", description: `Moved to ${nextStage.label}` }); }}>
                            <ArrowRight className="h-2.5 w-2.5 mr-0.5" />{nextStage.label}
                          </Button>
                        </div>
                      )}
                      {stage.id !== "closed_won" && stage.id !== "closed_lost" && !nextStage && (
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex gap-1">
                          <Button size="sm" variant="outline" className="text-[9px] h-5 px-1.5 flex-1 border-success/30 text-success"
                            onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, "closed_won"); toast({ title: "Deal Won!", description: `${deal.title} marked as won` }); }}>
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Won
                          </Button>
                          <Button size="sm" variant="outline" className="text-[9px] h-5 px-1.5 border-red-500/30 text-red-400"
                            onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, "closed_lost"); toast({ title: "Deal Lost", description: `${deal.title} marked as lost` }); }}>
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {selectedDeal && (
        <DealDetailPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onStageChange={handleStageChange}
          isHuman={isHuman}
        />
      )}
    </div>
  );
}

function DealDetailPanel({ deal, onClose, onStageChange, isHuman }: {
  deal: any; onClose: () => void; onStageChange: (id: number, stage: string) => void; isHuman: boolean;
}) {
  const health = getDealHealth(deal);
  const currentStageIdx = stages.findIndex(s => s.id === deal.stage);
  const updateOpp = useUpdateOpportunityMut();
  const deleteOpp = useDeleteOpportunity();
  const manageDeal = useAiManageDeal();
  const [aiResult, setAiResult] = useState<any>(null);
  const [notes, setNotes] = useState(deal.notes ?? "");

  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveNotes = () => {
    updateOpp.mutate({ id: deal.id, data: { notes } }, {
      onSuccess: () => toast({ title: "Notes saved" }),
      onError: (err: any) => toast({ title: "Could not save notes", description: err?.message || "Request failed", variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    deleteOpp.mutate(deal.id, {
      onSuccess: () => { toast({ title: "Deal deleted", description: `${deal.title ?? "Deal"} removed from the pipeline.` }); onClose(); },
      onError: (err: any) => toast({ title: "Delete failed", description: err?.message || "Request failed", variant: "destructive" }),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="glass-panel border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
            <span className="text-base font-semibold truncate">{deal.title}</span>
            <Badge className={stages[currentStageIdx]?.color ?? "bg-blue-500"}>
              {stages[currentStageIdx]?.label ?? deal.stage}
            </Badge>
            {deal.createdByMode && <ModeBadge mode={deal.createdByMode} />}
            <span className={`text-xs ${health.color}`}>{health.label}</span>
            <span className="text-sm font-semibold text-crimson ml-auto">${((deal.value ?? 0) / 1000).toFixed(1)}k</span>
          </DialogTitle>
          <DialogDescription>
            {deal.companyName || "No company"}{deal.contactName ? ` — ${deal.contactName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Deal Intelligence" />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
          <div className="p-2.5 rounded-lg glass-surface">
            <p className="text-[10px] text-muted-foreground">Company</p>
            <p className="text-xs font-medium truncate">{deal.companyName ?? "—"}</p>
          </div>
          <div className="p-2.5 rounded-lg glass-surface">
            <p className="text-[10px] text-muted-foreground">Contact</p>
            <p className="text-xs font-medium truncate">{deal.contactName ?? "—"}</p>
          </div>
          <div className="p-2.5 rounded-lg glass-surface">
            <p className="text-[10px] text-muted-foreground">Service</p>
            <p className="text-xs font-medium capitalize">{(deal.serviceType ?? "—").replace(/_/g, " ")}</p>
          </div>
          <div className="p-2.5 rounded-lg glass-surface">
            <p className="text-[10px] text-muted-foreground">Probability</p>
            <p className="text-xs font-medium">{deal.probability ?? 0}%</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {deal.contactEmail ? (
            <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" />{deal.contactEmail}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground/60"><Mail className="h-3.5 w-3.5 shrink-0" />No email yet — reveal in Outreach</span>
          )}
          {deal.contactPhone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" />{deal.contactPhone}</span>}
          {/* Website + office phone + all social handles from the enrichment cascade. */}
          <ContactChannels
            data={{
              companyPhone: deal.companyPhone !== deal.contactPhone ? deal.companyPhone : null,
              website: deal.website,
              linkedinUrl: deal.linkedinUrl,
              twitterUrl: deal.twitterUrl,
              facebookUrl: deal.facebookUrl,
              instagramUrl: deal.instagramUrl,
              youtubeUrl: deal.youtubeUrl,
              tiktokUrl: deal.tiktokUrl,
            }}
            sources={deal.fieldSources}
          />
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Stage Progression</p>
          <div className="flex gap-1">
            {stages.filter(s => s.id !== "closed_lost").map((stage, idx) => (
              <button
                key={stage.id}
                onClick={() => onStageChange(deal.id, stage.id)}
                className={`flex-1 py-1.5 text-[10px] rounded transition-colors ${
                  stage.id === deal.stage
                    ? `${stage.color} text-white font-semibold`
                    : idx <= currentStageIdx
                      ? "bg-white/10 text-white/70"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Notes</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add deal notes..."
            className="bg-white/5 border-white/10 text-xs min-h-[60px]"
          />
          <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={saveNotes} disabled={updateOpp.isPending}>
            Save Notes
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap items-center pt-1">
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
              disabled={manageDeal.isPending}
              onClick={() => manageDeal.mutate({ companyName: deal.title || deal.companyName, dealValue: deal.value, interactions: [deal.stage] }, {
                onSuccess: (data) => setAiResult({ type: "next_action", data }),
              })}>
              {manageDeal.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Next Best Action
            </Button>
          )}
          {deal.stage !== "closed_won" && deal.stage !== "closed_lost" && (
            <>
              {currentStageIdx < stages.length - 2 && (
                <Button size="sm" variant="outline" className="text-xs border-blue-500/30 text-blue-400"
                  onClick={() => onStageChange(deal.id, stages[currentStageIdx + 1].id)}>
                  <ArrowRight className="h-3 w-3 mr-1" />Advance to {stages[currentStageIdx + 1].label}
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-xs border-success/30 text-success" onClick={() => onStageChange(deal.id, "closed_won")}>
                <CheckCircle2 className="h-3 w-3 mr-1" />Mark Won
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400" onClick={() => onStageChange(deal.id, "closed_lost")}>
                <X className="h-3 w-3 mr-1" />Mark Lost
              </Button>
            </>
          )}
          {deal.stage === "closed_won" && (
            <Button size="sm" className="btn-premium text-white text-xs" onClick={() => {
              window.location.href = "/production";
            }}>
              <Play className="h-3 w-3 mr-1" />Start Onboarding
            </Button>
          )}
          {confirmDelete ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Delete this deal?</span>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button size="sm" className="text-xs bg-destructive text-white hover:bg-destructive/90" disabled={deleteOpp.isPending} onClick={handleDelete}>
                {deleteOpp.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-300 ml-auto" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3 w-3 mr-1" />Delete Deal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QualificationTab({ leads, isHuman, isAuto, currentMode, onTabChange }: { leads: any[]; isHuman: boolean; isAuto: boolean; currentMode: string; onTabChange: (tab: string) => void }) {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showConvert, setShowConvert] = useState<number | null>(null);
  const [scoringLead, setScoringLead] = useState<number | null>(null);
  const convertLead = useConvertLead();
  const closeLead = useCloseLead();
  const qualifyLead = useAiQualifyLead();
  const { toast } = useToast();

  const [convertForm, setConvertForm] = useState({ title: "", value: "", serviceType: "cybersecurity" });

  const scoredLeads = leads.map((l: any) => ({
    ...l,
    score: l.fitScore ?? l.confidenceScore ?? 0,
    tier: getTier(l.fitScore ?? l.confidenceScore ?? 0),
  }));

  const filtered = scoredLeads.filter((l: any) => {
    if (search && !`${l.companyName ?? ""} ${l.contactName ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTier !== "all") {
      const t = getTier(l.score);
      if (t.label.toLowerCase() !== filterTier) return false;
    }
    return true;
  });

  const hotCount = scoredLeads.filter((l: any) => l.score >= 80).length;
  const warmCount = scoredLeads.filter((l: any) => l.score >= 50 && l.score < 80).length;
  const coldCount = scoredLeads.filter((l: any) => l.score >= 20 && l.score < 50).length;
  const disqCount = scoredLeads.filter((l: any) => l.score < 20).length;

  const handleConvert = (leadId: number) => {
    if (!convertForm.title) return;
    convertLead.mutate({
      id: leadId,
      data: {
        title: convertForm.title,
        value: parseFloat(convertForm.value) || 0,
        serviceType: convertForm.serviceType,
      }
    }, {
      onSuccess: () => {
        setShowConvert(null);
        setConvertForm({ title: "", value: "", serviceType: "cybersecurity" });
      }
    });
  };

  const handleDisqualify = (leadId: number) => {
    closeLead.mutate({ id: leadId, reason: "disqualified", notes: "Disqualified from CRM qualification review" });
  };

  const dimensions = [
    { key: "companyFit", label: "Company Fit", weight: "30%", desc: "Size, industry, revenue match" },
    { key: "marketingNeed", label: "Marketing Need", weight: "25%", desc: "How badly they need help" },
    { key: "budgetLikelihood", label: "Budget Likelihood", weight: "20%", desc: "Revenue, funding, spend" },
    { key: "timingUrgency", label: "Timing Urgency", weight: "15%", desc: "Hiring, contracts, growth signals" },
    { key: "authorityLevel", label: "Authority Level", weight: "10%", desc: "Decision maker access" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setFilterTier(filterTier === "hot" ? "all" : "hot")} className={`rounded-lg glass-surface p-3 text-left transition-colors ${filterTier === "hot" ? "ring-1 ring-red-500" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Hot (80+)</span>
          </div>
          <p className="text-lg font-bold">{hotCount}</p>
        </button>
        <button onClick={() => setFilterTier(filterTier === "warm" ? "all" : "warm")} className={`rounded-lg glass-surface p-3 text-left transition-colors ${filterTier === "warm" ? "ring-1 ring-yellow-500" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400">Warm (50-79)</span>
          </div>
          <p className="text-lg font-bold">{warmCount}</p>
        </button>
        <button onClick={() => setFilterTier(filterTier === "cold" ? "all" : "cold")} className={`rounded-lg glass-surface p-3 text-left transition-colors ${filterTier === "cold" ? "ring-1 ring-blue-500" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <Snowflake className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">Cold (20-49)</span>
          </div>
          <p className="text-lg font-bold">{coldCount}</p>
        </button>
        <button onClick={() => setFilterTier(filterTier === "disqualified" ? "all" : "disqualified")} className={`rounded-lg glass-surface p-3 text-left transition-colors ${filterTier === "disqualified" ? "ring-1 ring-gray-500" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <Ban className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400">Disqualified (&lt;20)</span>
          </div>
          <p className="text-lg font-bold">{disqCount}</p>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
        </div>
        {filterTier !== "all" && (
          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setFilterTier("all")}>
            {filterTier} <X className="h-3 w-3 ml-1" />
          </Badge>
        )}
      </div>

      <GlassCard className="border border-crimson/10 bg-crimson/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg glass-surface text-crimson">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">5-Dimension AI Scoring</p>
            <p className="text-xs text-muted-foreground">Leads are scored across {dimensions.length} dimensions: {dimensions.map(d => d.label).join(", ")}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-crimson">Auto mode — AI scores and qualifies leads automatically, converting hot leads into deals.</span></>}
              {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-blue-400">Hybrid — AI suggests scores, you review and approve conversions.</span></>}
              {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-yellow-400">Manual — you review each lead and decide to convert or disqualify.</span></>}
            </div>
          </div>
        </div>
      </GlassCard>
      

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <GlassCard>
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-sm font-semibold mb-2">No Leads to Qualify</h3>
              <p className="text-xs text-muted-foreground">Leads from Outreach will appear here for qualification scoring.</p>
            </div>
          </GlassCard>
        ) : filtered.map((lead: any) => (
          <GlassCard key={lead.id} variant="interactive" className="cursor-pointer" onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${lead.tier.color}`}>
                  {lead.tier.icon}
                  <span className="text-xs font-bold ml-0.5">{lead.score}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{lead.contactName || lead.companyName || `Lead #${lead.id}`}</p>
                  {lead.companyName && lead.contactName && <span className="text-xs text-muted-foreground truncate">at {lead.companyName}</span>}
                  <Badge variant="outline" className="text-[10px]">{lead.source ?? "manual"}</Badge>
                  {lead.createdByMode && <ModeBadge mode={lead.createdByMode} />}
                  <Badge variant="outline" className={`text-[10px] ${lead.tier.color}`}>{lead.tier.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {lead.bestAngle ?? lead.painPoints ?? lead.notes ?? "Pending analysis..."}
                </p>
                {(lead.contactEmail || lead.contactPhone) && (
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    {lead.contactEmail && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{lead.contactEmail}</span>}
                    {lead.contactPhone && <span className="flex items-center gap-1 truncate"><Phone className="h-3 w-3 shrink-0" />{lead.contactPhone}</span>}
                  </div>
                )}
                {/* Website + office phone + all social handles from enrichment. */}
                <ContactChannels
                  data={{
                    companyPhone: lead.companyPhone !== lead.contactPhone ? lead.companyPhone : null,
                    website: lead.website,
                    linkedinUrl: lead.linkedinUrl,
                    twitterUrl: lead.twitterUrl,
                    facebookUrl: lead.facebookUrl,
                    instagramUrl: lead.instagramUrl,
                    youtubeUrl: lead.youtubeUrl,
                    tiktokUrl: lead.tiktokUrl,
                  }}
                  sources={lead.fieldSources}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
                {!isHuman && (
                  <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson h-7"
                    disabled={scoringLead === lead.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setScoringLead(lead.id);
                      qualifyLead.mutate({ companyName: lead.companyName || "Unknown", contactName: lead.contactName, source: lead.source }, {
                        onSuccess: () => { setScoringLead(null); toast({ title: "Lead Re-scored", description: `AI re-scored ${lead.companyName || "lead"}` }); },
                        onError: (err: any) => { setScoringLead(null); toast({ title: "Scoring failed", description: err?.message || "Request failed", variant: "destructive" }); },
                      });
                    }}>
                    {scoringLead === lead.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Score
                  </Button>
                )}
                {lead.score >= 70 && !["closed_won", "closed_lost", "disqualified"].includes(lead.status) && (
                  <Button size="sm" variant="outline" disabled className="text-xs border-cyan-500/30 text-cyan-400 h-7 opacity-50 cursor-not-allowed"
                    title="Calendar/booking integration not configured yet"
                    onClick={(e) => e.stopPropagation()}>
                    <Calendar className="h-3 w-3 mr-1" />Set Meeting
                  </Button>
                )}
                {lead.score >= 50 && !["closed_won", "closed_lost", "disqualified", "active"].includes(lead.status) && (
                  <Button size="sm" variant="outline" className="text-xs border-success/30 text-success h-7"
                    onClick={(e) => { e.stopPropagation(); setShowConvert(lead.id); setConvertForm({ title: `${lead.companyName ?? "Lead"} — Opportunity`, value: "", serviceType: "cybersecurity" }); }}>
                    <ArrowRight className="h-3 w-3 mr-1" />Convert
                  </Button>
                )}
                {lead.score < 20 && !["closed_won", "closed_lost", "disqualified"].includes(lead.status) && (
                  <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400 h-7"
                    onClick={(e) => { e.stopPropagation(); handleDisqualify(lead.id); }}>
                    <Ban className="h-3 w-3 mr-1" />Disqualify
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {selectedLead?.id === lead.id && (
              <div className="mt-4 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Scoring Dimensions (weighted rubric)</p>
                <div className="grid grid-cols-5 gap-2">
                  {dimensions.map((dim) => {
                    const raw = lead[dim.key];
                    const dimScore = typeof raw === "number" ? Math.round(raw) : null;
                    return (
                      <div key={dim.key} className="p-2 rounded-lg glass-surface text-center" title={dim.desc}>
                        <p className="text-[10px] text-muted-foreground">{dim.label}</p>
                        <p className="text-sm font-bold mt-0.5">{dimScore != null ? dimScore : "—"}</p>
                        <p className="text-[9px] text-muted-foreground">{dim.weight}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] text-muted-foreground mt-1.5">Per-dimension breakdown shows once the AI scorer stores individual dimension scores; overall score above is live.</p>
                {lead.bestAngle && (
                  <div className="mt-3 p-2 rounded-lg glass-surface">
                    <p className="text-[10px] text-muted-foreground mb-1">AI Analysis</p>
                    <p className="text-xs">{lead.bestAngle}</p>
                  </div>
                )}
                {lead.notes && (
                  <div className="mt-2 p-2 rounded-lg glass-surface">
                    <p className="text-[10px] text-muted-foreground mb-1">Scoring Notes</p>
                    <p className="text-xs">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}

            {showConvert === lead.id && (
              <div className="mt-4 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-semibold mb-2">Convert to Opportunity</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <Input placeholder="Deal title" value={convertForm.title} onChange={(e) => setConvertForm({ ...convertForm, title: e.target.value })} className="bg-white/5 border-white/10 text-xs" />
                  <Input placeholder="Value ($)" type="number" value={convertForm.value} onChange={(e) => setConvertForm({ ...convertForm, value: e.target.value })} className="bg-white/5 border-white/10 text-xs" />
                  <select value={convertForm.serviceType} onChange={(e) => setConvertForm({ ...convertForm, serviceType: e.target.value })} className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs">
                    <option value="cybersecurity">Cybersecurity Marketing</option>
                    <option value="it_services">IT Services Marketing</option>
                    <option value="seo">SEO Package</option>
                    <option value="ppc">PPC Management</option>
                    <option value="full_service">Full Service</option>
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleConvert(lead.id)} disabled={convertLead.isPending} className="btn-premium text-white text-xs flex-1">
                      {convertLead.isPending ? "Converting..." : "Convert"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowConvert(null)} className="text-xs">Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function CallIntelligenceTab({ deals, leads, isHuman, isAuto, currentMode }: { deals: any[]; leads: any[]; isHuman: boolean; isAuto: boolean; currentMode: string }) {
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<"prep" | "coaching" | "transcript">("prep");
  const [briefingData, setBriefingData] = useState<Record<number, any>>({});
  const [generatingBriefing, setGeneratingBriefing] = useState<number | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptResult, setTranscriptResult] = useState<any>(null);
  const [coachingDealId, setCoachingDealId] = useState<number | null>(null);
  const prepareCall = useAiPrepareCall();
  const coachingMut = useAiCoachingCards();
  const transcriptMut = useProcessTranscript();
  const saveOutput = useSaveAiOutput();
  const { data: savedCoaching } = useAiOutputs("coaching", { domain: "crm", limit: 20 });
  const { toast } = useToast();

  const customCoachingCards = useMemo(
    () => (savedCoaching ?? []).flatMap((r: any) =>
      (r.data?.cards ?? []).map((c: any) => ({ ...c, dealTitle: r.title }))
    ),
    [savedCoaching]
  );
  const generatingCoaching = coachingMut.isPending;
  const analyzingTranscript = transcriptMut.isPending;

  const activeDeals = deals.filter((d: any) =>
    d.stage !== "closed_won" && d.stage !== "closed_lost"
  );

  const handleGenerateBriefing = (deal: any) => {
    setGeneratingBriefing(deal.id);
    setSelectedDeal(deal);
    prepareCall.mutate({ companyName: deal.companyName || deal.title, dealStage: deal.stage, serviceType: deal.serviceType }, {
      onSuccess: (data: any) => {
        setBriefingData(prev => ({ ...prev, [deal.id]: data }));
        setGeneratingBriefing(null);
        toast({ title: "Briefing Generated", description: `Pre-call briefing ready for ${deal.companyName || deal.title}` });
      },
      onError: (err: any) => {
        setGeneratingBriefing(null);
        toast({ title: "Briefing generation failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  const handleGenerateCustomCoaching = (dealId: number) => {
    setCoachingDealId(dealId);
    const deal = deals.find((d: any) => d.id === dealId);
    coachingMut.mutate(
      { companyName: deal?.companyName || deal?.title, dealValue: deal?.value, serviceType: deal?.serviceType, stage: deal?.stage },
      {
        onSuccess: (res: any) => {
          const cards = res?.cards ?? [];
          if (!cards.length) {
            toast({ title: "No cards returned", description: "AI did not return usable coaching cards. Try again.", variant: "destructive" });
            return;
          }
          saveOutput.mutate({
            domain: "crm",
            kind: "coaching",
            title: `Coaching — ${deal?.title || deal?.companyName || "Deal"}`,
            summary: `${cards.length} coaching cards`,
            data: { cards },
            entityType: "opportunity",
            entityId: typeof dealId === "number" ? dealId : undefined,
          });
          toast({ title: "Custom Cards Generated", description: `${cards.length} coaching cards saved for ${deal?.title || "deal"}` });
        },
        onError: (err: any) => toast({ title: "Coaching generation failed", description: err?.message || "Request failed", variant: "destructive" }),
      }
    );
  };

  const handleAnalyzeTranscript = () => {
    if (!transcriptText.trim()) return;
    transcriptMut.mutate(
      { transcript: transcriptText, type: "call" },
      {
        onSuccess: (res: any) => {
          const analysis = res?.analysis;
          if (!analysis) {
            toast({ title: "Analysis failed", description: "AI did not return a usable analysis.", variant: "destructive" });
            return;
          }
          setTranscriptResult(analysis);
          saveOutput.mutate({
            domain: "crm",
            kind: "transcript",
            title: `Transcript Analysis — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
            summary: (analysis.summary ?? "").slice(0, 280),
            data: analysis,
          });
          toast({ title: "Transcript Analyzed", description: "AI extracted action items, objections, and sentiment" });
        },
        onError: (err: any) => toast({ title: "Transcript analysis failed", description: err?.message || "Request failed", variant: "destructive" }),
      }
    );
  };

  const coachingCards = [
    { trigger: "\"We already have an agency\"", response: "\"What results are they getting? We guarantee 20 qualified leads in month one — can they match that?\"", category: "Objection" },
    { trigger: "\"No budget right now\"", response: "\"We start at $2,500/mo with a performance guarantee. If we don't deliver, you don't pay. Zero risk.\"", category: "Objection" },
    { trigger: "\"Send me info\"", response: "\"I'd love to, but every company's situation is unique. A 15-minute call lets me send you something actually relevant to your business.\"", category: "Stall" },
    { trigger: "\"What makes you different?\"", response: "\"We only work with cybersecurity companies. We know your buyers, your compliance requirements (NIST, SOC 2, ISO 27001), and what actually converts in your space.\"", category: "Discovery" },
    { trigger: "\"We tried marketing before, didn't work\"", response: "\"That's common in this space. Most agencies don't understand the cybersecurity buyer journey. What specifically did you try? We can show you exactly why it failed.\"", category: "Objection" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — briefings generated before every call. Coaching cards auto-selected. Transcripts analyzed on upload.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — AI generates briefings on demand. You review coaching cards and transcript analysis.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — browse coaching cards manually. Upload transcripts for AI analysis when ready.</span></>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="cursor-pointer hover:ring-1 hover:ring-blue-500/30 transition-all" onClick={() => setActiveSection("prep")}>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-semibold">Pre-Call Prep</p>
          </div>
          <p className="text-xs text-muted-foreground">Full briefings with talking points, objection cards, and key questions</p>
          <p className="text-[10px] text-blue-400 mt-1">{Object.keys(briefingData).length} briefings generated</p>
        </GlassCard>
        <GlassCard className="cursor-pointer hover:ring-1 hover:ring-gold/30 transition-all" onClick={() => setActiveSection("coaching")}>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-gold" />
            <p className="text-sm font-semibold">Live Coaching</p>
          </div>
          <p className="text-xs text-muted-foreground">On-screen coaching cards with response templates for every objection</p>
          <p className="text-[10px] text-gold mt-1">{coachingCards.length + customCoachingCards.length} cards available</p>
        </GlassCard>
        <GlassCard className="cursor-pointer hover:ring-1 hover:ring-crimson/30 transition-all" onClick={() => setActiveSection("transcript")}>
          <div className="flex items-center gap-2 mb-1">
            <Mic className="h-4 w-4 text-crimson" />
            <p className="text-sm font-semibold">Post-Call Analysis</p>
          </div>
          <p className="text-xs text-muted-foreground">Paste Zoom/Teams/Meet transcripts for AI extraction</p>
          <p className="text-[10px] text-crimson mt-1">{transcriptResult ? "1 analysis complete" : "No analyses yet"}</p>
        </GlassCard>
      </div>

      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        <button onClick={() => setActiveSection("prep")} className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${activeSection === "prep" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}>
          <BookOpen className="h-3.5 w-3.5 inline mr-1" />Pre-Call Prep
        </button>
        <button onClick={() => setActiveSection("coaching")} className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${activeSection === "coaching" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}>
          <MessageSquare className="h-3.5 w-3.5 inline mr-1" />Coaching Cards
        </button>
        <button onClick={() => setActiveSection("transcript")} className={`flex-1 py-2 text-xs font-medium rounded transition-colors ${activeSection === "transcript" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}>
          <Upload className="h-3.5 w-3.5 inline mr-1" />Transcript Analysis
        </button>
      </div>

      {activeSection === "prep" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Select an active deal to generate a pre-call briefing:</p>
          {activeDeals.length === 0 ? (
            <GlassCard>
              <div className="text-center py-8">
                <Phone className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm font-semibold">No Active Deals</p>
                <p className="text-xs text-muted-foreground mt-1">Create deals in the Pipeline tab to prepare for calls.</p>
              </div>
            </GlassCard>
          ) : activeDeals.map((deal: any) => (
            <GlassCard key={deal.id} variant="interactive" className="cursor-pointer" onClick={() => setSelectedDeal(selectedDeal?.id === deal.id ? null : deal)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{deal.title}</p>
                    {deal.createdByMode && <ModeBadge mode={deal.createdByMode} />}
                  </div>
                  <p className="text-xs text-muted-foreground">{deal.companyName ?? "Unknown company"} · Stage: {deal.stage?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs border-blue-500/30 text-blue-400 h-7"
                    disabled={generatingBriefing === deal.id}
                    onClick={(e) => { e.stopPropagation(); handleGenerateBriefing(deal); }}>
                    {generatingBriefing === deal.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {briefingData[deal.id] ? "Regenerate" : "Generate Briefing"}
                  </Button>
                  <Button size="sm" variant="outline" disabled className="text-xs h-7 opacity-50 cursor-not-allowed"
                    title="Calendar/booking integration not configured yet"
                    onClick={(e) => e.stopPropagation()}>
                    <Calendar className="h-3 w-3 mr-1" />Set Meeting
                  </Button>
                </div>
              </div>
              {(selectedDeal?.id === deal.id || briefingData[deal.id]) && selectedDeal?.id === deal.id && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  {briefingData[deal.id] ? (
                    <div className="p-3 rounded-lg glass-surface">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">AI-Generated Briefing</p>
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="font-semibold text-blue-400">Company Overview</p>
                          <p className="text-muted-foreground">{briefingData[deal.id].companyOverview || briefingData[deal.id].data?.companyOverview || `${deal.companyName || deal.title} — ${(deal.serviceType || "cybersecurity").replace(/_/g, " ")} sector`}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gold">Key Talking Points</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                            {(briefingData[deal.id].talkingPoints || briefingData[deal.id].data?.talkingPoints || [
                              "20 qualified leads guarantee in month one",
                              "Cybersecurity-specific marketing expertise",
                              "Performance-based pricing option",
                            ]).map((tp: string, i: number) => <li key={i}>{tp}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-crimson">Questions to Ask</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                            {(briefingData[deal.id].questionsToAsk || briefingData[deal.id].data?.questionsToAsk || [
                              "What's your current lead generation process?",
                              "What marketing have you tried before?",
                              "Who's involved in the decision?",
                            ]).map((q: string, i: number) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                        {(briefingData[deal.id].objectionPrepare || briefingData[deal.id].data?.objectionPrepare) && (
                          <div>
                            <p className="font-semibold text-orange-400">Objection Preparation</p>
                            <div className="space-y-1.5 mt-1">
                              {(briefingData[deal.id].objectionPrepare || briefingData[deal.id].data?.objectionPrepare || []).map((obj: any, i: number) => (
                                <div key={i} className="p-2 rounded glass-surface">
                                  <p className="text-red-400 text-[10px]">If they say: "{obj.objection}"</p>
                                  <p className="text-success text-[10px] mt-0.5">→ {obj.counter}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg glass-surface text-center">
                      <p className="text-xs text-muted-foreground">Click "Generate Briefing" to create an AI-powered pre-call prep document.</p>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {activeSection === "coaching" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Use these coaching cards during calls. Click copy to use responses:</p>
          {coachingCards.map((card, idx) => (
            <GlassCard key={idx}>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${
                  card.category === "Objection" ? "text-red-400 border-red-500/20" :
                  card.category === "Stall" ? "text-yellow-400 border-yellow-500/20" :
                  "text-blue-400 border-blue-500/20"
                }`}>{card.category}</Badge>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">When they say:</p>
                  <p className="text-sm font-medium italic">{card.trigger}</p>
                  <p className="text-xs text-muted-foreground mt-2 mb-1">Respond with:</p>
                  <p className="text-sm text-success">{card.response}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => {
                  navigator.clipboard.writeText(card.response.replace(/"/g, ""));
                  toast({ title: "Copied", description: "Response copied to clipboard" });
                }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </GlassCard>
          ))}

          {customCoachingCards.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Sparkles className="h-3.5 w-3.5 text-crimson" />
                <p className="text-xs font-semibold text-crimson">Custom AI-Generated Cards</p>
              </div>
              {customCoachingCards.map((card, idx) => (
                <GlassCard key={`custom-${idx}`} className="border border-crimson/10">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${
                      card.category === "Objection" ? "text-red-400 border-red-500/20" :
                      card.category === "Trust" ? "text-green-400 border-green-500/20" :
                      "text-purple-400 border-purple-500/20"
                    }`}>{card.category}</Badge>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">When they say:</p>
                      <p className="text-sm font-medium italic">{card.trigger}</p>
                      <p className="text-xs text-muted-foreground mt-2 mb-1">Respond with:</p>
                      <p className="text-sm text-success">{card.response}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => {
                      navigator.clipboard.writeText(card.response.replace(/"/g, ""));
                      toast({ title: "Copied", description: "Response copied to clipboard" });
                    }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </>
          )}

          {activeDeals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Generate custom cards for a specific deal:</p>
              <div className="flex gap-2 flex-wrap">
                {activeDeals.map((deal: any) => (
                  <Button key={deal.id} variant="outline" size="sm" className="text-xs border-crimson/30 text-crimson"
                    disabled={generatingCoaching}
                    onClick={() => handleGenerateCustomCoaching(deal.id)}>
                    {generatingCoaching && coachingDealId === deal.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {deal.title}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "transcript" && (
        <div className="space-y-4">
          <GlassCard className="border border-dashed border-white/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-semibold">Paste Call Transcript</p>
                <div className="flex gap-1 ml-auto">
                  <Badge variant="outline" className="text-[9px]">Zoom</Badge>
                  <Badge variant="outline" className="text-[9px]">Google Meet</Badge>
                  <Badge variant="outline" className="text-[9px]">Teams</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste your call transcript from Zoom, Google Meet, or Microsoft Teams. AI will extract a summary, action items, objections, next steps, and sentiment.
              </p>
              <Textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste your call transcript here...&#10;&#10;Example:&#10;John (PMG): Thanks for taking the time today. I wanted to talk about how we can help SecureNet with lead generation.&#10;Sarah (SecureNet): Sure, we've been struggling to get quality leads in the cybersecurity space...&#10;John: That's exactly what we specialize in. We guarantee 20 qualified leads in month one..."
                className="bg-white/5 border-white/10 text-xs min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button className="btn-premium text-white text-sm" onClick={handleAnalyzeTranscript} disabled={!transcriptText.trim() || analyzingTranscript}>
                  {analyzingTranscript ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" />Analyze Transcript</>}
                </Button>
                {transcriptText && (
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { setTranscriptText(""); setTranscriptResult(null); }}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>

          {transcriptResult && (() => {
            const score = transcriptResult.sentiment?.score ?? 0;
            const overall = transcriptResult.sentiment?.overall ?? "neutral";
            const objections = transcriptResult.objections ?? [];
            const actionItems = transcriptResult.actionItems ?? [];
            const nextSteps = transcriptResult.nextSteps ?? [];
            const keyTopics = transcriptResult.keyTopics ?? [];
            return (
            <GlassCard className="border border-crimson/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">Transcript Analysis Results</p>
                  <p className="text-xs text-muted-foreground capitalize">Sentiment: {overall}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${score >= 70 ? "text-success" : score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {score}/100
                  </div>
                  <span className="text-[10px] text-muted-foreground">Sentiment Score</span>
                </div>
              </div>

              {transcriptResult.summary && (
                <div className="mb-4 p-3 rounded glass-surface">
                  <p className="text-xs font-semibold mb-1">Summary</p>
                  <p className="text-xs text-muted-foreground">{transcriptResult.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-success mb-2 flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Next Steps</p>
                  <div className="space-y-1.5">
                    {nextSteps.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">None detected.</p>
                    ) : nextSteps.map((d: string, i: number) => (
                      <div key={i} className="p-2 rounded glass-surface text-xs flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Objections Detected</p>
                  <div className="space-y-1.5">
                    {objections.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">None detected.</p>
                    ) : objections.map((obj: any, i: number) => (
                      <div key={i} className="p-2 rounded glass-surface text-xs">
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${obj.severity === "high" ? "bg-red-400" : obj.severity === "medium" ? "bg-yellow-400" : "bg-blue-400"}`} />
                          <div>
                            <span>{obj.text}</span>
                            <Badge variant="outline" className="text-[9px] ml-2 capitalize">{obj.category ?? obj.severity}</Badge>
                          </div>
                        </div>
                        {obj.suggestedResponse && (
                          <p className="text-[10px] text-success mt-1 pl-4">→ {obj.suggestedResponse}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Action Items</p>
                <div className="space-y-1.5">
                  {actionItems.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">None detected.</p>
                  ) : actionItems.map((item: any, i: number) => (
                    <div key={i} className="p-2 rounded glass-surface text-xs flex items-center gap-3">
                      <Badge variant="outline" className={`text-[9px] capitalize ${item.priority === "high" ? "text-crimson border-crimson/20" : "text-blue-400 border-blue-500/20"}`}>
                        {item.priority ?? "normal"}
                      </Badge>
                      <span className="flex-1">{item.task}</span>
                      {item.assignee && <span className="text-muted-foreground text-[10px]">{item.assignee}</span>}
                      {item.deadline && <span className="text-muted-foreground text-[10px]">Due: {item.deadline}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {keyTopics.length > 0 && (
                <div className="mt-4 p-3 rounded glass-surface">
                  <p className="text-xs font-semibold mb-2">Key Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keyTopics.map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
            );
          })()}

          {!transcriptResult && (
            <GlassCard>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">What AI Extracts From Transcripts</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: <CheckCircle2 className="h-4 w-4" />, label: "Decisions Made", desc: "Key agreements and commitments" },
                  { icon: <AlertTriangle className="h-4 w-4" />, label: "Objections", desc: "Concerns and pushback detected" },
                  { icon: <ArrowRight className="h-4 w-4" />, label: "Action Items", desc: "Follow-up tasks for both sides" },
                  { icon: <BarChart3 className="h-4 w-4" />, label: "Call Score", desc: "Overall conversation quality" },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg glass-surface text-center">
                    <div className="mx-auto w-8 h-8 rounded-full glass-surface flex items-center justify-center text-crimson mb-2">{item.icon}</div>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}

function ProposalsTab({ deals, isHuman, isAuto, currentMode }: { deals: any[]; isHuman: boolean; isAuto: boolean; currentMode: string }) {
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [proposalContent, setProposalContent] = useState<Record<number, any>>({});
  const [editingProposal, setEditingProposal] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [generatingProposal, setGeneratingProposal] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<Record<number, string>>({});
  const updateOpp = useUpdateOpportunityMut();
  const createProposal = useAiCreateProposal();
  const { toast } = useToast();

  const proposalStages = [
    { id: "none", label: "No Proposal", color: "text-muted-foreground" },
    { id: "draft", label: "Draft", color: "text-blue-400" },
    { id: "sent", label: "Sent", color: "text-gold" },
    { id: "viewed", label: "Viewed", color: "text-orange-400" },
    { id: "reviewing", label: "Reviewing", color: "text-crimson" },
    { id: "accepted", label: "Accepted", color: "text-success" },
    { id: "rejected", label: "Rejected", color: "text-red-400" },
  ];

  const activeDeals = deals.filter((d: any) =>
    d.stage !== "closed_won" && d.stage !== "closed_lost"
  );

  const dealsWithProposals = deals.filter((d: any) => d.proposalStatus && d.proposalStatus !== "none");
  const acceptedCount = deals.filter((d: any) => d.proposalStatus === "accepted").length;
  const sentCount = deals.filter((d: any) => d.proposalStatus === "sent" || d.proposalStatus === "viewed").length;
  const draftCount = deals.filter((d: any) => d.proposalStatus === "draft").length;

  const handleProposalAction = (dealId: number, status: string) => {
    updateOpp.mutate({ id: dealId, data: { proposalStatus: status } }, {
      onSuccess: () => {
        if (status === "sent") toast({ title: "Marked as Sent", description: "Status updated. Send the proposal to the client from your email — automated delivery is not configured yet." });
        else if (status === "accepted") toast({ title: "Proposal Accepted!", description: "Move the deal to Won and start onboarding." });
        else if (status === "rejected") toast({ title: "Proposal Rejected", description: "Consider following up with alternative pricing." });
        else if (status === "viewed") toast({ title: "Marked as Viewed", description: "Status updated to reflect the client has opened your proposal." });
      },
    });
  };

  const handleAiGenerate = (deal: any) => {
    setGeneratingProposal(deal.id);
    const tier = selectedTier[deal.id] || "Growth";
    createProposal.mutate({ companyName: deal.companyName || deal.title, serviceType: deal.serviceType, dealValue: deal.value }, {
      onSuccess: (data: any) => {
        setProposalContent(prev => ({ ...prev, [deal.id]: data }));
        handleProposalAction(deal.id, "draft");
        setGeneratingProposal(null);
      },
      onError: (err: any) => {
        setGeneratingProposal(null);
        toast({ title: "Proposal generation failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  const pricingTiers = [
    { name: "Starter", price: "$2,500/mo", features: ["SEO Audit", "20 Leads/mo", "Monthly Report", "Email Outreach"] },
    { name: "Growth", price: "$5,000/mo", features: ["Full SEO", "40 Leads/mo", "Weekly Reports", "Multi-channel Outreach", "Content Creation"] },
    { name: "Enterprise", price: "$10,000/mo", features: ["Everything in Growth", "80 Leads/mo", "Dedicated Strategist", "Custom Campaigns", "PPC Management", "Priority Support"] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — proposals auto-generated and sent when deals reach the proposal stage.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — AI drafts proposals, you review and edit before sending.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — create and customize proposals yourself. Use templates or write from scratch.</span></>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Total Proposals</p>
          <p className="text-lg font-bold">{dealsWithProposals.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Accepted</p>
          <p className="text-lg font-bold text-success">{acceptedCount}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Pending Review</p>
          <p className="text-lg font-bold text-gold">{sentCount}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Drafts</p>
          <p className="text-lg font-bold text-blue-400">{draftCount}</p>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Pricing Tiers</h3>
          <Badge variant="outline" className="text-[10px]">Customizable</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {pricingTiers.map((tier) => (
            <div key={tier.name} className={`p-3 rounded-lg glass-surface ${tier.name === "Growth" ? "ring-1 ring-crimson/30" : ""}`}>
              {tier.name === "Growth" && <Badge className="bg-crimson text-white text-[9px] mb-2">Most Popular</Badge>}
              <p className="text-sm font-semibold">{tier.name}</p>
              <p className="text-lg font-bold text-crimson mt-0.5">{tier.price}</p>
              <ul className="mt-2 space-y-1">
                {tier.features.map((f) => (
                  <li key={f} className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 text-success" />{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Deal Proposals</h3>
        {activeDeals.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-semibold">No Active Deals</p>
            <p className="text-xs text-muted-foreground mt-1">Create deals in the Pipeline to generate proposals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDeals.map((deal: any) => {
              const proposalStage = proposalStages.find(s => s.id === (deal.proposalStatus ?? "none"));
              const proposal = proposalContent[deal.id];
              return (
                <div key={deal.id} className="rounded-lg glass-surface overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{deal.title}</p>
                          {deal.createdByMode && <ModeBadge mode={deal.createdByMode} />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{deal.companyName ?? "—"}</span>
                          <span className="text-xs text-crimson font-semibold">${((deal.value ?? 0) / 1000).toFixed(0)}k</span>
                          <Badge variant="outline" className={`text-[10px] ${proposalStage?.color}`}>{proposalStage?.label}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        {(!deal.proposalStatus || deal.proposalStatus === "none") && (
                          <>
                            <select value={selectedTier[deal.id] || "Growth"} onChange={(e) => setSelectedTier(prev => ({ ...prev, [deal.id]: e.target.value }))}
                              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] h-7">
                              <option value="Starter">Starter</option>
                              <option value="Growth">Growth</option>
                              <option value="Enterprise">Enterprise</option>
                            </select>
                            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson h-7"
                              disabled={generatingProposal === deal.id}
                              onClick={() => handleAiGenerate(deal)}>
                              {generatingProposal === deal.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Generate
                            </Button>
                          </>
                        )}
                        {deal.proposalStatus === "draft" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                              setEditingProposal(editingProposal === deal.id ? null : deal.id);
                              if (proposal) setEditContent(proposal.summary || "");
                            }}>
                              <FileText className="h-3 w-3 mr-1" />{editingProposal === deal.id ? "Close Editor" : "Edit"}
                            </Button>
                            <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={() => handleProposalAction(deal.id, "sent")}>
                              <Send className="h-3 w-3 mr-1" />Mark as Sent
                            </Button>
                          </>
                        )}
                        {deal.proposalStatus === "sent" && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gold flex items-center gap-1"><Clock className="h-3 w-3" />Awaiting view</span>
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleProposalAction(deal.id, "viewed")}>
                              <Eye className="h-3 w-3 mr-1" />Mark Viewed
                            </Button>
                          </div>
                        )}
                        {(deal.proposalStatus === "viewed" || deal.proposalStatus === "reviewing") && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-xs border-success/30 text-success h-7" onClick={() => handleProposalAction(deal.id, "accepted")}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />Accepted
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400 h-7" onClick={() => handleProposalAction(deal.id, "rejected")}>
                              <X className="h-3 w-3 mr-1" />Rejected
                            </Button>
                          </div>
                        )}
                        {deal.proposalStatus === "accepted" && (
                          <span className="text-[10px] text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Client accepted — mark deal as Won</span>
                        )}
                        {deal.proposalStatus === "rejected" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleProposalAction(deal.id, "none")}>
                            <RefreshCw className="h-3 w-3 mr-1" />Create New Proposal
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {proposal && (deal.proposalStatus === "draft" || deal.proposalStatus === "sent" || deal.proposalStatus === "accepted") && (
                    <div className="border-t border-white/5 p-3 bg-white/[0.02]">
                      {editingProposal === deal.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Proposal Summary</Label>
                            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                              className="bg-white/5 border-white/10 text-xs min-h-[80px] mt-1" />
                          </div>
                          <Button size="sm" className="text-xs" onClick={() => {
                            setProposalContent(prev => ({ ...prev, [deal.id]: { ...prev[deal.id], summary: editContent } }));
                            setEditingProposal(null);
                            toast({ title: "Proposal Updated", description: "Your edits have been saved" });
                          }}>Save Changes</Button>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="font-semibold text-blue-400 mb-1">Proposal Summary</p>
                            <p className="text-muted-foreground">{proposal.summary}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gold mb-1">Deliverables</p>
                            <ul className="space-y-0.5">
                              {(proposal.deliverables || []).map((d: string, i: number) => (
                                <li key={i} className="text-muted-foreground flex items-start gap-1.5">
                                  <CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />{d}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 rounded glass-surface">
                              <p className="text-[10px] text-muted-foreground">Timeline</p>
                              <p className="text-xs font-medium">{proposal.timeline}</p>
                            </div>
                            <div className="p-2 rounded glass-surface">
                              <p className="text-[10px] text-muted-foreground">Pricing ({proposal.tier})</p>
                              <p className="text-xs font-bold text-crimson">{proposal.pricing}</p>
                            </div>
                            <div className="p-2 rounded glass-surface">
                              <p className="text-[10px] text-muted-foreground">Guarantee</p>
                              <p className="text-xs font-medium text-success">{proposal.guarantee}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function CrmSyncTab({ deals, leads, isHuman, isAuto, currentMode }: { deals: any[]; leads: any[]; isHuman: boolean; isAuto: boolean; currentMode: string }) {
  const { data: statusData } = useIntegrationStatus();
  const { data: logsData } = useSyncLogs();
  const triggerSync = useTriggerSync();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const { toast } = useToast();

  const integrations: any[] = Array.isArray(statusData) ? statusData : [];
  const logs: any[] = Array.isArray(logsData?.logs) ? logsData.logs : [];

  const activeCount = integrations.filter((i) => i.isActive).length;
  const errorCount = logs.filter((l) => ["failed", "error"].includes(String(l.status))).length;
  const partnerDeals = leads.filter((l: any) => l.routingDestination === "both");
  const lastSyncAt = integrations
    .map((i) => i.lastSyncAt)
    .filter(Boolean)
    .sort()
    .pop();
  const ghlActive = integrations.some((i) => /ghl|highlevel/i.test(String(i.provider)) && i.isActive);

  const handleSync = (integrationId: string, name: string) => {
    setSyncingId(integrationId);
    triggerSync.mutate(integrationId, {
      onSuccess: (res: any) => {
        setSyncingId(null);
        toast({ title: "Sync Triggered", description: res?.synced != null ? `${name}: ${res.synced} records synced, ${res.errors ?? 0} errors.` : `${name} sync started.` });
      },
      onError: (err: any) => {
        setSyncingId(null);
        toast({ title: "Sync failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  const routingStatus = (active: boolean) =>
    active
      ? <><div className="w-2 h-2 rounded-full bg-success" /><span className="text-[10px] text-success">Active</span></>
      : <><div className="w-2 h-2 rounded-full bg-muted-foreground/50" /><span className="text-[10px] text-muted-foreground">Not configured</span></>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — connected integrations sync on their configured schedule.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — sync status visible. You trigger manual syncs on connected integrations.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — you initiate all syncs manually on connected integrations.</span></>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Connected</p>
          <p className="text-lg font-bold">{activeCount}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Partner Close Leads</p>
          <p className="text-lg font-bold text-gold">{partnerDeals.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Sync Errors</p>
          <p className={`text-lg font-bold ${errorCount ? "text-red-400" : "text-success"}`}>{errorCount}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Last Sync</p>
          <p className="text-sm font-bold">{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Integrations</h3>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { window.location.href = "/settings"; }}>
            <ExternalLink className="h-3 w-3 mr-1" />Manage in Settings
          </Button>
        </div>
        {integrations.length === 0 ? (
          <GlassCard>
            <div className="text-center py-10">
              <Link2 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm font-semibold">No CRM Integrations Connected</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Connect GoHighLevel, HubSpot, or another CRM in Settings → Integrations to enable two-way sync. No integration is configured yet.
              </p>
              <Button size="sm" className="btn-premium text-white text-xs h-7 mt-4" onClick={() => { window.location.href = "/settings"; }}>
                Go to Settings → Integrations
              </Button>
            </div>
          </GlassCard>
        ) : (
          integrations.map((int) => {
            const id = String(int.id);
            return (
              <GlassCard key={id}>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg glass-surface text-blue-400"><Zap className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{int.name ?? int.provider}</p>
                      <Badge variant="outline" className={`text-[10px] ${int.isActive ? "text-success border-success/20" : "text-muted-foreground"}`}>
                        {int.isActive ? "Connected" : "Inactive"}
                      </Badge>
                      {int.tokenExpired && <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/20">Token expired</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{int.provider}{int.type ? ` · ${int.type}` : ""}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Last sync: {int.lastSyncAt ? new Date(int.lastSyncAt).toLocaleString() : "Never"}
                      {int.lastSyncStatus ? ` · ${int.lastSyncStatus}` : ""}
                      {int.lastSyncError ? ` · ${int.lastSyncError}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      disabled={!int.isActive || (syncingId === id && triggerSync.isPending)}
                      title={int.isActive ? undefined : "Integration is inactive — reconnect in Settings"}
                      onClick={() => handleSync(id, int.name ?? int.provider)}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${syncingId === id && triggerSync.isPending ? "animate-spin" : ""}`} />
                      {syncingId === id && triggerSync.isPending ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Sync Log</h3>
          <Badge variant="outline" className="text-[10px]">{logs.length} events</Badge>
        </div>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No sync events yet. Logs appear here once an integration runs a sync.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 20).map((log, idx) => {
              const ok = ["success", "completed", "received"].includes(String(log.status));
              return (
                <div key={log.id ?? idx} className="flex items-center gap-3 p-2 rounded-lg glass-surface">
                  <div className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-success" : "bg-red-400"}`} />
                  <span className="text-[10px] text-muted-foreground w-32 flex-shrink-0">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</span>
                  <span className="text-xs flex-1 capitalize">{log.direction ?? "sync"} · {log.entityType ?? "record"}</span>
                  <span className="text-xs text-muted-foreground">{log.integrationId ?? ""}</span>
                  <Badge variant="outline" className={`text-[10px] ${ok ? "text-success" : "text-red-400"}`}>{log.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-1">Routing Configuration</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Planned routing rules — activate once a CRM integration is connected in Settings.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg glass-surface">
            <p className="text-xs font-semibold">Standard Leads</p>
            <p className="text-[10px] text-muted-foreground mt-1">Sync to CRM main account. PMG handles closing.</p>
            <div className="flex items-center gap-1 mt-2">{routingStatus(ghlActive)}</div>
          </div>
          <div className="p-3 rounded-lg glass-surface">
            <p className="text-xs font-semibold">Partner Close Deals</p>
            <p className="text-[10px] text-muted-foreground mt-1">Push to CRM sub-account for partner company closers.</p>
            <div className="flex items-center gap-1 mt-2">{routingStatus(ghlActive && partnerDeals.length > 0)}</div>
          </div>
          <div className="p-3 rounded-lg glass-surface">
            <p className="text-xs font-semibold">Bidirectional Sync</p>
            <p className="text-[10px] text-muted-foreground mt-1">Changes in external CRM reflect back in PMG OS.</p>
            <div className="flex items-center gap-1 mt-2">{routingStatus(ghlActive)}</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
