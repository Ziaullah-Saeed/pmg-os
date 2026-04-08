import { useState, useMemo } from "react";
import { useListOpportunities, useListLeads, useListCompanies } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { AiResultPanel } from "@/components/ai-result-panel";
import { ModeBadge } from "@/components/mode-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
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
} from "@/hooks/use-api";
import {
  Briefcase, DollarSign, TrendingUp, Users, Phone, FileText,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Sparkles, Plus,
  Search, Filter, ChevronRight, Target, Flame, Snowflake, Ban,
  BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink,
  MessageSquare, Mic, Upload, BookOpen, Shield, Send, Eye, X,
  Zap, AlertTriangle, Calendar, Star, Copy, Link2
} from "lucide-react";

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
  const { isHuman, isAuto } = useAiModeContext();
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
          {activeTab === "pipeline" && <PipelineTab deals={oppList} leads={leadList} isHuman={isHuman} showNewDealForm={showNewDealForm} setShowNewDealForm={setShowNewDealForm} />}
          {activeTab === "qualification" && <QualificationTab leads={leadList} isHuman={isHuman} />}
          {activeTab === "calls" && <CallIntelligenceTab deals={oppList} leads={leadList} isHuman={isHuman} />}
          {activeTab === "proposals" && <ProposalsTab deals={oppList} isHuman={isHuman} />}
          {activeTab === "sync" && <CrmSyncTab deals={oppList} leads={leadList} isHuman={isHuman} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PipelineTab({ deals, leads, isHuman, showNewDealForm, setShowNewDealForm }: { deals: any[]; leads: any[]; isHuman: boolean; showNewDealForm: boolean; setShowNewDealForm: (v: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const showNewDeal = showNewDealForm;
  const setShowNewDeal = setShowNewDealForm;
  const updateOpp = useUpdateOpportunityMut();
  const createOpp = useCreateOpportunityMut();

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
              <option value="full_service">Full Service</option>
            </select>
            <Button onClick={handleCreateDeal} disabled={!newDeal.title || createOpp.isPending} className="btn-premium text-white">
              {createOpp.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </GlassCard>
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
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter((o: any) => o.stage === stage.id);
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
                      {deal.companyName && (
                        <p className="text-[10px] text-muted-foreground truncate mt-1">{deal.companyName}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${health.status === "green" ? "bg-success" : health.status === "yellow" ? "bg-yellow-400" : health.status === "red" ? "bg-red-400" : "bg-muted-foreground"}`} />
                        <span className={`text-[10px] ${health.color}`}>{health.label}</span>
                      </div>
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

  const saveNotes = () => {
    updateOpp.mutate({ id: deal.id, data: { notes } });
  };

  return (
    <GlassCard className="border border-white/10">
      <div className="flex items-start justify-between mb-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Deal Intelligence" />}
        <div>
          <h3 className="text-base font-semibold">{deal.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={stages[currentStageIdx]?.color ?? "bg-blue-500"}>
              {stages[currentStageIdx]?.label ?? deal.stage}
            </Badge>
            {deal.createdByMode && <ModeBadge mode={deal.createdByMode} />}
            <span className={`text-xs ${health.color}`}>{health.label}</span>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-sm font-semibold text-crimson">${((deal.value ?? 0) / 1000).toFixed(1)}k</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-2.5 rounded-lg glass-surface">
          <p className="text-[10px] text-muted-foreground">Company</p>
          <p className="text-xs font-medium">{deal.companyName ?? "—"}</p>
        </div>
        <div className="p-2.5 rounded-lg glass-surface">
          <p className="text-[10px] text-muted-foreground">Contact</p>
          <p className="text-xs font-medium">{deal.contactName ?? "—"}</p>
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

      <div className="mb-4">
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

      <div className="mb-4">
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

      <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
            disabled={manageDeal.isPending}
            onClick={() => manageDeal.mutate({ companyName: deal.title || deal.companyName, dealValue: deal.value, interactions: [deal.stage] }, {
              onSuccess: (data) => setAiResult({ type: "next_action", data }),
            })}>
            {manageDeal.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Next Best Action
          </Button>
        
        {deal.stage !== "closed_won" && deal.stage !== "closed_lost" && (
          <>
            <Button size="sm" variant="outline" className="text-xs border-success/30 text-success" onClick={() => onStageChange(deal.id, "closed_won")}>
              <CheckCircle2 className="h-3 w-3 mr-1" />Mark Won
            </Button>
            <Button size="sm" variant="outline" className="text-xs border-red-500/30 text-red-400" onClick={() => onStageChange(deal.id, "closed_lost")}>
              <X className="h-3 w-3 mr-1" />Mark Lost
            </Button>
          </>
        )}
        <Button size="sm" variant="outline" className="text-xs border-red-500/20 text-red-300 ml-auto" onClick={() => { deleteOpp.mutate(deal.id, { onSuccess: onClose }); }} disabled={deleteOpp.isPending}>
          {deleteOpp.isPending ? "Deleting..." : "Delete Deal"}
        </Button>
      </div>
    </GlassCard>
  );
}

function QualificationTab({ leads, isHuman }: { leads: any[]; isHuman: boolean }) {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showConvert, setShowConvert] = useState<number | null>(null);
  const convertLead = useConvertLead();
  const closeLead = useCloseLead();

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
              <p className="text-xs text-muted-foreground">Leads are auto-scored across {dimensions.length} dimensions: {dimensions.map(d => d.label).join(", ")}</p>
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
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
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
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Scoring Dimensions</p>
                <div className="grid grid-cols-5 gap-2">
                  {dimensions.map((dim, dimIdx) => {
                    const offsets = [5, -3, 2, -5, 8];
                    const dimScore = Math.max(0, Math.min(100, Math.round(lead.score * (1 + offsets[dimIdx] / 100 * (dimIdx + 1)))));
                    return (
                      <div key={dim.key} className="p-2 rounded-lg glass-surface text-center">
                        <p className="text-[10px] text-muted-foreground">{dim.label}</p>
                        <p className="text-sm font-bold mt-0.5">{dimScore}</p>
                        <p className="text-[9px] text-muted-foreground">{dim.weight}</p>
                      </div>
                    );
                  })}
                </div>
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

function CallIntelligenceTab({ deals, leads, isHuman }: { deals: any[]; leads: any[]; isHuman: boolean }) {
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<"prep" | "coaching" | "transcript">("prep");

  const activeDeals = deals.filter((d: any) =>
    d.stage !== "closed_won" && d.stage !== "closed_lost"
  );

  const coachingCards = [
    {
      trigger: "\"We already have an agency\"",
      response: "\"What results are they getting? We guarantee 20 qualified leads in month one — can they match that?\"",
      category: "Objection",
    },
    {
      trigger: "\"No budget right now\"",
      response: "\"We start at $X with a performance guarantee. If we don't deliver, you don't pay.\"",
      category: "Objection",
    },
    {
      trigger: "\"Send me info\"",
      response: "\"I'd love to, but every company's situation is unique. A 15-minute call lets me send you something actually relevant to your business.\"",
      category: "Stall",
    },
    {
      trigger: "\"What makes you different?\"",
      response: "\"We only work with cybersecurity companies. We know your buyers, your compliance requirements, and what actually converts in your space. Generalist agencies can't say that.\"",
      category: "Discovery",
    },
    {
      trigger: "\"We tried marketing before, didn't work\"",
      response: "\"That's common in this space. Most agencies don't understand the cybersecurity buyer journey. What specifically did you try? We can show you exactly why it failed.\"",
      category: "Objection",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-blue-400" />
            <p className="text-sm font-semibold">Pre-Call Prep</p>
          </div>
          <p className="text-xs text-muted-foreground">Full briefings with talking points, objection cards, and key questions</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-gold" />
            <p className="text-sm font-semibold">Live Coaching</p>
          </div>
          <p className="text-xs text-muted-foreground">On-screen coaching cards with response templates for every objection</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-1">
            <Mic className="h-4 w-4 text-crimson" />
            <p className="text-sm font-semibold">Post-Call Analysis</p>
          </div>
          <p className="text-xs text-muted-foreground">Upload Zoom transcripts for AI-powered extraction of decisions and action items</p>
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
                  <p className="text-sm font-semibold">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">{deal.companyName ?? "Unknown company"} · Stage: {deal.stage}</p>
                </div>
                <div className="flex gap-2">
                                      <Button size="sm" variant="outline" className="text-xs border-blue-500/30 text-blue-400 h-7">
                      <Sparkles className="h-3 w-3 mr-1" />Generate Briefing
                    </Button>
                  
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    <Calendar className="h-3 w-3 mr-1" />Set Meeting
                  </Button>
                </div>
              </div>
              {selectedDeal?.id === deal.id && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  <div className="p-3 rounded-lg glass-surface">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Briefing Preview</p>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="font-semibold text-blue-400">Company Overview</p>
                        <p className="text-muted-foreground">{deal.companyName ?? "Company"} — {deal.serviceType ?? "cybersecurity"} sector</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gold">Key Talking Points</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          <li>20 qualified leads guarantee in month one</li>
                          <li>Cybersecurity-specific marketing expertise</li>
                          <li>Performance-based pricing option</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-crimson">Questions to Ask</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          <li>What's your current lead generation process?</li>
                          <li>What marketing have you tried before?</li>
                          <li>Who's involved in the decision?</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {activeSection === "coaching" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Use these coaching cards during calls. They'll appear based on conversation flow:</p>
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
                <Button size="sm" variant="ghost" className="text-xs h-7">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </GlassCard>
          ))}
                      <Button variant="outline" className="w-full text-xs border-crimson/30 text-crimson">
              <Sparkles className="h-3 w-3 mr-2" />Generate Custom Coaching Cards for Selected Deal
            </Button>
          
        </div>
      )}

      {activeSection === "transcript" && (
        <div className="space-y-4">
          <GlassCard className="border border-dashed border-white/20">
            <div className="text-center py-8">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold">Upload Call Transcript</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Upload a Zoom transcript (.txt or .vtt) for AI analysis. Extracts decisions, action items, objections, and next steps.
              </p>
              <Button className="btn-premium text-white text-sm mt-4">
                <Upload className="h-4 w-4 mr-2" />Upload Transcript
              </Button>
            </div>
          </GlassCard>

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
        </div>
      )}
    </div>
  );
}

function ProposalsTab({ deals, isHuman }: { deals: any[]; isHuman: boolean }) {
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const updateOpp = useUpdateOpportunityMut();

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
    updateOpp.mutate({ id: dealId, data: { proposalStatus: status } });
  };

  const pricingTiers = [
    { name: "Starter", price: "$2,500/mo", features: ["SEO Audit", "20 Leads/mo", "Monthly Report", "Email Outreach"] },
    { name: "Growth", price: "$5,000/mo", features: ["Full SEO", "40 Leads/mo", "Weekly Reports", "Multi-channel Outreach", "Content Creation"] },
    { name: "Enterprise", price: "$10,000/mo", features: ["Everything in Growth", "80 Leads/mo", "Dedicated Strategist", "Custom Campaigns", "PPC Management", "Priority Support"] },
  ];

  return (
    <div className="space-y-4">
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
          <Badge variant="outline" className="text-[10px]">Template</Badge>
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
          <div className="space-y-2">
            {activeDeals.map((deal: any) => {
              const proposalStage = proposalStages.find(s => s.id === (deal.proposalStatus ?? "none"));
              return (
                <div key={deal.id} className="p-3 rounded-lg glass-surface">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{deal.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{deal.companyName ?? "—"}</span>
                        <span className="text-xs text-crimson font-semibold">${((deal.value ?? 0) / 1000).toFixed(0)}k</span>
                        <Badge variant="outline" className={`text-[10px] ${proposalStage?.color}`}>{proposalStage?.label}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {(!deal.proposalStatus || deal.proposalStatus === "none") && (
                        <>
                                                      <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson h-7" onClick={() => handleProposalAction(deal.id, "draft")}>
                              <Sparkles className="h-3 w-3 mr-1" />AI Generate
                            </Button>
                          
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleProposalAction(deal.id, "draft")}>
                            <FileText className="h-3 w-3 mr-1" />Create Draft
                          </Button>
                        </>
                      )}
                      {deal.proposalStatus === "draft" && (
                        <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={() => handleProposalAction(deal.id, "sent")}>
                          <Send className="h-3 w-3 mr-1" />Send Proposal
                        </Button>
                      )}
                      {deal.proposalStatus === "sent" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleProposalAction(deal.id, "viewed")}>
                          <Eye className="h-3 w-3 mr-1" />Mark Viewed
                        </Button>
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function CrmSyncTab({ deals, leads, isHuman }: { deals: any[]; leads: any[]; isHuman: boolean }) {
  const integrations = [
    {
      id: "ghl_main",
      name: "GoHighLevel — Main Account",
      desc: "Primary CRM sync for PMG Group leads and deals",
      status: "configured",
      icon: <Zap className="h-5 w-5" />,
      color: "text-blue-400",
      lastSync: "2 hours ago",
      syncedItems: leads.filter((l: any) => l.routingDestination === "pmg" || l.routingDestination === "ghl").length,
    },
    {
      id: "ghl_sub",
      name: "GoHighLevel — Partner Sub-Account",
      desc: "Partner closer pipeline for 'Partner Close' deals",
      status: "configured",
      icon: <Link2 className="h-5 w-5" />,
      color: "text-gold",
      lastSync: "3 hours ago",
      syncedItems: leads.filter((l: any) => l.routingDestination === "both").length,
    },
    {
      id: "hubspot",
      name: "HubSpot",
      desc: "Optional client CRM sync for enterprise clients",
      status: "not_connected",
      icon: <ExternalLink className="h-5 w-5" />,
      color: "text-orange-400",
      lastSync: null,
      syncedItems: 0,
    },
  ];

  const syncLogs = [
    { time: "2h ago", action: "Lead synced to GHL", entity: "CyberShield Solutions", status: "success" },
    { time: "3h ago", action: "Deal updated in GHL", entity: "NetGuard Opportunity", status: "success" },
    { time: "5h ago", action: "Contact created in GHL", entity: "CloudFortress Inc", status: "success" },
    { time: "1d ago", action: "Partner lead pushed to sub-account", entity: "SecureNet Corp", status: "success" },
  ];

  const routedLeads = leads.filter((l: any) => l.routingDestination);
  const partnerDeals = leads.filter((l: any) => l.routingDestination === "both");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Total Synced</p>
          <p className="text-lg font-bold">{routedLeads.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Partner Close</p>
          <p className="text-lg font-bold text-gold">{partnerDeals.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Sync Errors</p>
          <p className="text-lg font-bold text-success">0</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Last Sync</p>
          <p className="text-sm font-bold">2h ago</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Connected Integrations</h3>
        {integrations.map((int) => (
          <GlassCard key={int.id}>
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg glass-surface ${int.color}`}>{int.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{int.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${
                    int.status === "configured" ? "text-success border-success/20" : "text-muted-foreground"
                  }`}>
                    {int.status === "configured" ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{int.desc}</p>
                {int.lastSync && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Last sync: {int.lastSync} · {int.syncedItems} items synced</p>
                )}
              </div>
              <div className="flex gap-2">
                {int.status === "configured" ? (
                  <>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      <RefreshCw className="h-3 w-3 mr-1" />Sync Now
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      <ExternalLink className="h-3 w-3 mr-1" />Open
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="btn-premium text-white text-xs h-7">Connect</Button>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Sync Log</h3>
          <Badge variant="outline" className="text-[10px]">Last 24h</Badge>
        </div>
        <div className="space-y-2">
          {syncLogs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg glass-surface">
              <div className={`w-1.5 h-1.5 rounded-full ${log.status === "success" ? "bg-success" : "bg-red-400"}`} />
              <span className="text-[10px] text-muted-foreground w-12">{log.time}</span>
              <span className="text-xs flex-1">{log.action}</span>
              <span className="text-xs text-muted-foreground">{log.entity}</span>
              <Badge variant="outline" className="text-[10px] text-success">{log.status}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Routing Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg glass-surface">
            <p className="text-xs font-semibold">Standard Leads</p>
            <p className="text-[10px] text-muted-foreground mt-1">Sync to GHL main account. PMG handles closing.</p>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[10px] text-success">Active</span>
            </div>
          </div>
          <div className="p-3 rounded-lg glass-surface">
            <p className="text-xs font-semibold">Partner Close Deals</p>
            <p className="text-[10px] text-muted-foreground mt-1">Push to GHL sub-account for partner company closers.</p>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[10px] text-success">Active</span>
            </div>
          </div>
          <div className="p-3 rounded-lg glass-surface">
            <p className="text-xs font-semibold">Bidirectional Sync</p>
            <p className="text-[10px] text-muted-foreground mt-1">Changes in external CRM reflect back in PMG OS.</p>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-[10px] text-gold">Hybrid Mode</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
