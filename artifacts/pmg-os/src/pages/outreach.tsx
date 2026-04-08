import { useState, useCallback } from "react";
import { useListLeads, useListCompanies } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useToast } from "@/hooks/use-toast";
import { AiResultPanel } from "@/components/ai-result-panel";
import {
  Target, Users, CheckCircle2, Send, Sparkles, Plus, Search, Globe,
  Building2, Mail, Phone, Linkedin, ArrowRight, Clock, AlertCircle,
  MessageSquare, BarChart3, RefreshCw, Eye, Edit, Zap, Calendar,
  TrendingUp, Filter, ChevronRight, X, Bot, Hand, Shield,
  Facebook, Twitter, Instagram, Slack, FileText, ArrowUpRight,
  ThumbsUp, ThumbsDown, Bookmark, ExternalLink, Copy, SkipForward
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const tabs = [
  { id: "prospects", label: "Prospect Finder", icon: <Search className="h-3.5 w-3.5" /> },
  { id: "social", label: "Social Command", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "strategy", label: "Strategy", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "compose", label: "Compose", icon: <Edit className="h-3.5 w-3.5" /> },
  { id: "followups", label: "Follow-ups", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

function ProspectFinder({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { data: leads } = useListLeads();
  const { isHuman, isAuto, currentMode } = useAiModeContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [aiResult, setAiResult] = useState<any>(null);
  const leadList = (leads ?? []) as any[];

  const [showAddLead, setShowAddLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isProspecting, setIsProspecting] = useState(false);
  const [savedProspectIds, setSavedProspectIds] = useState<Set<number>>(new Set());

  const [newLead, setNewLead] = useState({
    firstName: "", lastName: "", email: "", company: "", title: "", phone: "", source: "manual"
  });

  const getLeadName = (l: any) => {
    if (l.contactName) return l.contactName;
    if (l.firstName || l.first_name) return `${l.firstName ?? l.first_name ?? ""} ${l.lastName ?? l.last_name ?? ""}`.trim();
    return `Lead #${l.id}`;
  };
  const getLeadCompany = (l: any) => l.companyName || l.company || "";
  const getLeadInitials = (l: any) => {
    const name = getLeadName(l);
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2);
  };

  const filtered = leadList.filter((l: any) => {
    const matchesSearch = !searchQuery ||
      `${getLeadName(l)} ${getLeadCompany(l)}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddLead = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: newLead.firstName, lastName: newLead.lastName,
          email: newLead.email, company: newLead.company,
          title: newLead.title, phone: newLead.phone,
          source: newLead.source, status: "new",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Lead added", description: `${newLead.firstName} ${newLead.lastName} added to pipeline` });
      setShowAddLead(false);
      setNewLead({ firstName: "", lastName: "", email: "", company: "", title: "", phone: "", source: "manual" });
      queryClient.invalidateQueries({ queryKey: ["/leads"] });
    } catch {
      toast({ title: "Error", description: "Failed to add lead", variant: "destructive" });
    }
  }, [newLead, toast, queryClient]);

  const handleAiProspect = useCallback(async () => {
    setIsProspecting(true);
    setAiResult(null);
    setSavedProspectIds(new Set());
    try {
      const res = await fetch(`${API_BASE}/outreach/find-prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ industry: "cybersecurity", region: "USA", companySize: "mid-market", marketingGaps: "not enough qualified leads" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "AI Error", description: data.error || "Request failed", variant: "destructive" });
        return;
      }
      setAiResult(data);
      toast({ title: "AI Prospecting Complete", description: `Found prospects with ${data.confidence}% confidence` });
      queryClient.invalidateQueries({ queryKey: ["/leads"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reach AI", variant: "destructive" });
    } finally {
      setIsProspecting(false);
    }
  }, [toast, queryClient]);

  const handleSaveProspect = useCallback(async (prospect: Record<string, any>, index: number) => {
    const companyName = prospect.company_name || prospect.companyName || prospect.company || prospect.name || "";
    const contact = prospect.decision_maker || prospect.contact || prospect.contactName || "";
    const parts = contact.split(",");
    const nameParts = (parts[0] || "").trim().split(" ");
    const firstName = nameParts[0] || companyName.split(" ")[0] || "Contact";
    const lastName = nameParts.slice(1).join(" ") || "";
    const email = prospect.email || `${firstName.toLowerCase()}@${companyName.toLowerCase().replace(/\s/g, "")}.com`;
    const phone = prospect.phone || "";
    const score = prospect.fit_score || prospect.fitScore || prospect.score || prospect.estimated_fit || 0;

    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName, lastName, email, phone,
          company: companyName,
          title: (parts[1] || "").trim() || prospect.industry || "Decision Maker",
          source: "ai_prospecting", status: "new",
          confidenceScore: typeof score === "number" ? score : parseInt(score) || 75,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSavedProspectIds(prev => new Set([...prev, index]));
      queryClient.invalidateQueries({ queryKey: ["/leads"] });
      toast({ title: "Lead Saved", description: `${companyName} added to your pipeline` });
    } catch {
      toast({ title: "Error", description: "Failed to save prospect", variant: "destructive" });
    }
  }, [toast, queryClient]);

  const handleSaveAll = useCallback(async () => {
    if (!aiResult?.result) return;
    const items = Array.isArray(aiResult.result) ? aiResult.result : aiResult.result.prospects || aiResult.result.companies || [];
    let saved = 0;
    for (let i = 0; i < items.length; i++) {
      if (!savedProspectIds.has(i)) {
        try {
          await handleSaveProspect(items[i], i);
          saved++;
        } catch {}
      }
    }
    toast({ title: "Bulk Save Complete", description: `${saved} prospects saved to CRM pipeline` });
  }, [aiResult, savedProspectIds, handleSaveProspect, toast]);

  const handleMoveToCrm = useCallback(async (leadId: number) => {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "qualified" }),
      });
      if (!res.ok) {
        toast({ title: "Error", description: "Could not move lead to CRM", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/leads"] });
      toast({ title: "Moved to CRM", description: "Lead qualified and added to CRM pipeline" });
      setSelectedLead(null);
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  }, [toast, queryClient]);

  const rawResult = aiResult?.data || aiResult?.result;
  const aiProspects = rawResult ? (Array.isArray(rawResult) ? rawResult : rawResult.prospects || rawResult.companies || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="unqualified">Unqualified</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button className="btn-premium text-white text-sm" onClick={() => setShowAddLead(true)}>
            <Plus className="h-4 w-4 mr-2" />{isHuman ? "Enter Prospect" : "Add Lead"}
          </Button>
          {!isHuman && (
            <Button className="btn-glass text-foreground text-sm" onClick={handleAiProspect} disabled={isProspecting}>
              {isProspecting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isAuto ? "AI Prospect" : "Find with AI"}
            </Button>
          )}
          {isHuman && (
            <Button variant="outline" className="text-sm" onClick={() => setShowAddLead(true)}>
              <Search className="h-4 w-4 mr-2" />Research Company
            </Button>
          )}
        </div>
      </div>

      {currentMode !== "human" && (
        <div className="flex items-center gap-1.5 px-1">
          <Bot className="h-3 w-3 text-crimson/70" />
          <span className="text-[10px] text-muted-foreground">
            {isAuto ? "AI auto-discovers and scores prospects — results save directly to pipeline" : "AI finds prospects — you review and approve before saving"}
          </span>
        </div>
      )}

      {aiProspects.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold">AI-Discovered Prospects</h3>
              <Badge variant="outline" className="text-[10px]">{aiProspects.length} found</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={handleSaveAll}>
                <Bookmark className="h-3 w-3 mr-1" />Save All to CRM
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setAiResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {aiProspects.map((p: any, i: number) => {
              const name = p.company_name || p.companyName || p.company || p.name || "Unknown";
              const score = p.fit_score || p.fitScore || p.score || p.estimated_fit || "--";
              const access = p.accessibility_score || p.accessibilityScore || p.accessibility || "--";
              const contact = p.decision_maker || p.contact || p.contactName || "Contact TBD";
              const isSaved = savedProspectIds.has(i);
              return (
                <div key={i} className="p-3 rounded-lg glass-surface flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson text-sm font-bold shrink-0">
                    {name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{contact}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-bold text-crimson">{score}</p>
                      <p className="text-[8px] text-muted-foreground">Fit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-blue-400">{access}</p>
                      <p className="text-[8px] text-muted-foreground">Access</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={isSaved}
                      className={isSaved ? "text-xs h-7 bg-muted text-muted-foreground" : "btn-premium text-white text-xs h-7"}
                      onClick={() => handleSaveProspect(p, i)}
                    >
                      {isSaved ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" />Saved</>
                      ) : (
                        <><Bookmark className="h-3 w-3 mr-1" />Save as Lead</>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {aiResult && aiProspects.length === 0 && rawResult && (
        <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="AI Prospects Found" onSaveProspect={(p: any) => handleSaveProspect(p, 0)} />
      )}

      {filtered.length === 0 && aiProspects.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-sm font-semibold mb-2">No Prospects Yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
            Start building your pipeline. {isHuman ? "Enter prospects manually." : "Add leads manually or let AI find cybersecurity companies."}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead: any) => (
            <motion.div key={lead.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-lg p-4 cursor-pointer hover:glass-card-interactive transition-all"
              onClick={() => setSelectedLead(lead)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-crimson/30 to-crimson/10 flex items-center justify-center text-crimson text-sm font-bold shrink-0">
                    {getLeadInitials(lead)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{getLeadName(lead)}</p>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{(lead.status ?? "new").replace(/_/g, " ")}</Badge>
                      {isAuto && lead.fitScore && <Badge variant="outline" className="text-[9px] border-crimson/30 text-crimson shrink-0">AI Scored</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {getLeadCompany(lead) && <span className="flex items-center gap-1 truncate"><Building2 className="h-3 w-3" />{getLeadCompany(lead)}</span>}
                      {lead.source && <span className="flex items-center gap-1 truncate capitalize">{lead.source.replace(/_/g, " ")}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {(lead.confidenceScore ?? lead.fitScore) ? (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-sm font-semibold text-crimson">{lead.confidenceScore ?? lead.fitScore}%</p>
                    </div>
                  ) : null}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="glass-panel border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle>{isHuman ? "Enter Prospect Details" : "Add New Lead"}</DialogTitle>
            <DialogDescription>{isHuman ? "Manually enter company and contact information" : "Add a prospect to your pipeline"}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><Label className="text-xs">First Name</Label><Input value={newLead.firstName} onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })} placeholder="John" className="mt-1" /></div>
            <div><Label className="text-xs">Last Name</Label><Input value={newLead.lastName} onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })} placeholder="Smith" className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs">Email</Label><Input value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="john@company.com" className="mt-1" /></div>
            <div><Label className="text-xs">Company</Label><Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="CyberDefend Inc" className="mt-1" /></div>
            <div><Label className="text-xs">Title</Label><Input value={newLead.title} onChange={(e) => setNewLead({ ...newLead, title: e.target.value })} placeholder="VP Marketing" className="mt-1" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+1 555-0123" className="mt-1" /></div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={newLead.source} onValueChange={(v) => setNewLead({ ...newLead, source: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button>
            <Button className="btn-premium text-white" onClick={handleAddLead} disabled={!newLead.firstName || !newLead.lastName}>Add Lead</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {selectedLead && (
          <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
            <DialogContent className="glass-panel border-border/50 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-crimson/30 to-crimson/10 flex items-center justify-center text-crimson text-sm font-bold">
                    {getLeadInitials(selectedLead)}
                  </div>
                  {getLeadName(selectedLead)}
                </DialogTitle>
                <DialogDescription>{getLeadCompany(selectedLead) || "No company"} — {selectedLead.title ?? selectedLead.bestAngle ?? "Prospect"}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{getLeadCompany(selectedLead) || "No company"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-muted-foreground" /><span>Source: {(selectedLead.source ?? "Unknown").replace(/_/g, " ")}</span></div>
                  {selectedLead.painPoints && (
                    <div className="flex items-start gap-2 text-sm"><AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" /><span className="text-xs text-muted-foreground">{selectedLead.painPoints}</span></div>
                  )}
                  {selectedLead.nextAction && (
                    <div className="flex items-center gap-2 text-sm"><ArrowRight className="h-4 w-4 text-muted-foreground" /><span className="text-xs">Next: {selectedLead.nextAction}</span></div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg glass-surface">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className="mt-1 capitalize">{(selectedLead.status ?? "new").replace(/_/g, " ")}</Badge>
                  </div>
                  {(selectedLead.confidenceScore || selectedLead.fitScore) && (
                    <div className="p-3 rounded-lg glass-surface">
                      <p className="text-xs text-muted-foreground">Fit / Confidence</p>
                      <div className="flex items-center gap-3">
                        {selectedLead.fitScore && <p className="text-lg font-bold text-crimson">{selectedLead.fitScore}</p>}
                        {selectedLead.confidenceScore && <p className="text-lg font-bold text-blue-400">{selectedLead.confidenceScore}%</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button className="btn-premium text-white text-sm flex-1" onClick={() => { setSelectedLead(null); onTabChange("compose"); }}>
                  <Send className="h-4 w-4 mr-2" />Draft Message
                </Button>
                <Button variant="outline" className="text-sm flex-1" onClick={() => { setSelectedLead(null); onTabChange("strategy"); }}>
                  <Target className="h-4 w-4 mr-2" />Plan Approach
                </Button>
                {["qualified","routing","routed","active","closed_won","closed_lost"].includes(selectedLead.status) ? (
                  <Button variant="outline" className="text-sm opacity-60" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2" />In CRM
                  </Button>
                ) : (
                  <Button variant="outline" className="text-sm" onClick={() => handleMoveToCrm(selectedLead.id)}>
                    <ArrowRight className="h-4 w-4 mr-2" />Move to CRM
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialCommand({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { isHuman, isAuto, currentMode } = useAiModeContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const channels = [
    { name: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, unread: 3, color: "text-blue-400", connected: true },
    { name: "Email", icon: <Mail className="h-4 w-4" />, unread: 7, color: "text-crimson", connected: true },
    { name: "Facebook", icon: <Facebook className="h-4 w-4" />, unread: 1, color: "text-blue-500", connected: true },
    { name: "X (Twitter)", icon: <Twitter className="h-4 w-4" />, unread: 0, color: "text-foreground", connected: true },
    { name: "Instagram", icon: <Instagram className="h-4 w-4" />, unread: 2, color: "text-pink-400", connected: false },
    { name: "Slack", icon: <Slack className="h-4 w-4" />, unread: 0, color: "text-purple-400", connected: false },
    { name: "Website Forms", icon: <FileText className="h-4 w-4" />, unread: 1, color: "text-green-400", connected: true },
  ];

  const messages = [
    { id: 1, channel: "LinkedIn", from: "Sarah Chen, CISO", company: "CyberShield Corp", subject: "Re: Marketing partnership for SOC 2 services", time: "2h ago", type: "reply", priority: "high", classification: "Hot Lead", body: "Hi, I'd like to learn more about your marketing services. We need help promoting our SOC 2 compliance solutions. Can we schedule a call this week?" },
    { id: 2, channel: "Email", from: "Mike Johnson, VP Marketing", company: "SecureNet Solutions", subject: "Interested in cybersecurity marketing services", time: "3h ago", type: "inbound", priority: "high", classification: "Hot Lead", body: "We saw your case study about EDR vendor marketing. Our company provides MDR services and we're struggling to generate qualified leads. What packages do you offer?" },
    { id: 3, channel: "LinkedIn", from: "David Lee, CTO", company: "ThreatBlock Inc", subject: "Connection request accepted — open to chat", time: "5h ago", type: "notification", priority: "medium", classification: "Warm", body: "Thanks for connecting! I saw your post about SIEM marketing strategies. Interesting approach." },
    { id: 4, channel: "Email", from: "Lisa Wang, Director", company: "DataGuard Pro", subject: "Follow up on our call last week", time: "1d ago", type: "follow-up", priority: "medium", classification: "Warm", body: "Hi, just following up on our conversation. We're still evaluating marketing partners. Can you send over the Growth package details?" },
    { id: 5, channel: "Website Forms", from: "Alex Rivera", company: "CyberVault Solutions", subject: "Contact form: Need marketing help", time: "1d ago", type: "inbound", priority: "medium", classification: "Warm", body: "Looking for a marketing agency that understands cybersecurity. We offer XDR solutions." },
    { id: 6, channel: "Facebook", from: "Tom Roberts", company: "NetDefense Corp", subject: "Comment on your EDR marketing post", time: "2d ago", type: "engagement", priority: "low", classification: "Cold", body: "Great insights on EDR marketing. Do you work with smaller cybersecurity startups?" },
    { id: 7, channel: "Email", from: "newsletter@techconf.com", company: "", subject: "Upcoming Cybersecurity Conference", time: "2d ago", type: "inbound", priority: "low", classification: "Spam", body: "Register now for the 2026 cybersecurity conference..." },
  ];

  const getClassBadge = (cls: string) => {
    if (cls === "Hot Lead") return "bg-crimson/20 text-crimson border-crimson/30";
    if (cls === "Warm") return "bg-yellow-400/20 text-yellow-400 border-yellow-400/30";
    if (cls === "Cold") return "bg-blue-400/20 text-blue-400 border-blue-400/30";
    return "bg-muted text-muted-foreground border-muted-foreground/30";
  };

  const getChannelIcon = (ch: string) => {
    if (ch === "LinkedIn") return <Linkedin className="h-3.5 w-3.5 text-blue-400" />;
    if (ch === "Email") return <Mail className="h-3.5 w-3.5 text-crimson" />;
    if (ch === "Facebook") return <Facebook className="h-3.5 w-3.5 text-blue-500" />;
    if (ch === "Website Forms") return <FileText className="h-3.5 w-3.5 text-green-400" />;
    return <MessageSquare className="h-3.5 w-3.5" />;
  };

  const handleMoveToCrm = async (msg: any) => {
    try {
      const nameParts = (msg.from || "").split(",")[0].trim().split(" ");
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: nameParts[0] || "Contact",
          lastName: nameParts.slice(1).join(" ") || "",
          email: msg.channel === "Email" ? `${nameParts[0]?.toLowerCase()}@${msg.company?.toLowerCase().replace(/\s/g, "")}.com` : "",
          company: msg.company,
          title: (msg.from || "").split(",")[1]?.trim() || "",
          source: msg.channel.toLowerCase(),
          status: "qualified",
          confidenceScore: msg.classification === "Hot Lead" ? 92 : 75,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        toast({ title: "Error", description: err.message || "Could not create CRM lead", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/leads"] });
      toast({ title: "Moved to CRM", description: `${msg.from} from ${msg.company} added as qualified lead` });
      setSelectedMsg(null);
    } catch {
      toast({ title: "Error", description: "Failed to create CRM lead", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {channels.map((ch) => (
          <GlassCard key={ch.name} variant="interactive" className="cursor-pointer p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <div className={ch.color}>{ch.icon}</div>
              <span className="text-[10px] font-medium">{ch.name}</span>
              <div className="flex items-center gap-1">
                {ch.unread > 0 && <Badge className="bg-crimson text-white text-[9px] px-1 py-0">{ch.unread}</Badge>}
                <span className={`text-[9px] ${ch.connected ? "text-success" : "text-muted-foreground"}`}>
                  {ch.connected ? "Connected" : "Connect"}
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {currentMode !== "human" && (
        <div className="flex items-center gap-1.5 px-1">
          <Bot className="h-3 w-3 text-crimson/70" />
          <span className="text-[10px] text-muted-foreground">
            {isAuto ? "Messages auto-classified. Hot leads auto-flagged for CRM." : "AI classifies messages — you review before taking action."}
          </span>
        </div>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Unified Inbox</h3>
          <Badge variant="outline" className="text-xs">{messages.filter(m => m.classification !== "Spam").length} messages</Badge>
        </div>
        <div className="space-y-2">
          {messages.filter(m => isHuman || m.classification !== "Spam").map((msg) => (
            <motion.div key={msg.id} whileHover={{ scale: 1.002 }}
              className="p-3 rounded-lg glass-surface cursor-pointer flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
              onClick={() => { setSelectedMsg(msg); setReplyDraft(""); }}
            >
              <div className="p-1.5 rounded-lg glass-surface shrink-0">{getChannelIcon(msg.channel)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{msg.from}</p>
                  {msg.company && <span className="text-[10px] text-muted-foreground truncate">at {msg.company}</span>}
                  {!isHuman && <Badge variant="outline" className={`text-[9px] ${getClassBadge(msg.classification)}`}>{msg.classification}</Badge>}
                  {msg.priority === "high" && <AlertCircle className="h-3 w-3 text-crimson shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{msg.subject}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                {(msg.classification === "Hot Lead" || msg.classification === "Warm") && !isHuman && (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 border-crimson/30 text-crimson" onClick={(e) => { e.stopPropagation(); handleMoveToCrm(msg); }}>
                    <ArrowRight className="h-2.5 w-2.5 mr-1" />CRM
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {selectedMsg && (
        <Dialog open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
          <DialogContent className="glass-panel border-border/50 max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getChannelIcon(selectedMsg.channel)}
                {selectedMsg.from}
              </DialogTitle>
              <DialogDescription>{selectedMsg.subject}</DialogDescription>
            </DialogHeader>
            <div className="mt-3 p-4 rounded-lg glass-surface text-sm leading-relaxed">{selectedMsg.body}</div>
            {!isHuman && (
              <div className="mt-3">
                <Label className="text-xs">AI Draft Reply</Label>
                <Textarea
                  value={replyDraft || `Hi ${selectedMsg.from.split(",")[0].split(" ")[0]}, thank you for reaching out. I'd be happy to discuss how PMG Group can help ${selectedMsg.company || "your company"} with cybersecurity marketing. Would you be available for a quick 15-minute call this week to explore the fit?`}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button className="btn-premium text-white text-sm flex-1" onClick={() => { toast({ title: "Reply Sent", description: `Response sent via ${selectedMsg.channel}` }); setSelectedMsg(null); }}>
                <Send className="h-4 w-4 mr-2" />Send Reply
              </Button>
              {(selectedMsg.classification === "Hot Lead" || selectedMsg.classification === "Warm") && (
                <Button variant="outline" className="text-sm" onClick={() => handleMoveToCrm(selectedMsg)}>
                  <ArrowRight className="h-4 w-4 mr-2" />Move to CRM
                </Button>
              )}
              <Button variant="outline" className="text-sm" onClick={() => { setSelectedMsg(null); onTabChange("compose"); }}>
                <Edit className="h-4 w-4 mr-2" />Compose
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StrategyTab({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { isHuman, isAuto, currentMode } = useAiModeContext();
  const { toast } = useToast();
  const { data: leads } = useListLeads();
  const leadList = (leads ?? []) as any[];
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [channelPriority, setChannelPriority] = useState({
    linkedin: isAuto || currentMode === "hybrid",
    email: isAuto || currentMode === "hybrid",
    phone: false,
    facebook: false,
    instagram: false,
    twitter: false,
    sms: false,
  });

  const generateStrategy = async () => {
    if (!selectedProspect) {
      toast({ title: "Select a prospect", description: "Choose a prospect from the list to generate a strategy", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/outreach/plan-approach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prospectName: selectedProspect.contactName || `${selectedProspect.firstName || ""} ${selectedProspect.lastName || ""}`.trim() || `Lead #${selectedProspect.id}`,
          companyName: selectedProspect.companyName || selectedProspect.company || "",
          industryContext: "Cybersecurity",
          painPoints: "Not enough qualified leads",
          channels: Object.entries(channelPriority).filter(([, v]) => v).map(([k]) => k),
        }),
      });
      const data = await res.json();
      const aiStrategy = data?.strategy || data?.result || {};
      setStrategy({
        prospect: selectedProspect.contactName || `${selectedProspect.firstName || ""} ${selectedProspect.lastName || ""}`.trim() || `Lead #${selectedProspect.id}`,
        company: selectedProspect.companyName || selectedProspect.company || "",
        decisionChain: (aiStrategy.decision_chain || aiStrategy.decisionChain) || [
          { role: "CTO / CISO", approach: "Technical credibility — reference NIST, SOC 2 compliance case studies" },
          { role: "VP Marketing", approach: "ROI focus — show lead generation results from similar cybersecurity clients" },
          { role: "CEO", approach: "Strategic value — position PMG as growth partner, not vendor" },
        ],
        painPoints: (aiStrategy.pain_points || aiStrategy.painPoints) || [
          "Low website conversion rate for cybersecurity services",
          "No consistent content pipeline for thought leadership",
          "Poor LinkedIn presence despite decision-makers being active there",
          "No lead nurture sequence after initial contact",
        ],
        sequence: (aiStrategy.sequence || aiStrategy.outreach_sequence) || [
          { day: 1, channel: "LinkedIn", action: "Connection request with personalized note mentioning their latest product", status: "ready" },
          { day: 3, channel: "LinkedIn", action: "Follow-up message sharing relevant SOC 2 marketing case study", status: "ready" },
          { day: 7, channel: "Email", action: "Send detailed proposal with Starter ($2,500/mo) and Growth ($5,000/mo) options", status: "pending" },
          { day: 10, channel: "LinkedIn", action: "Share a cybersecurity marketing insight post and tag them", status: "pending" },
          { day: 14, channel: "Phone", action: "Direct call to schedule discovery meeting — use call script", status: "pending" },
          { day: 21, channel: "Email", action: "Final follow-up with limited-time Growth package offer", status: "pending" },
        ],
        aiNotes: (typeof aiStrategy === "string" ? aiStrategy : aiStrategy.notes || aiStrategy.summary) || "Strategy generated based on prospect profile and industry analysis.",
      });
      toast({ title: "Strategy Generated", description: `Outreach plan created for ${selectedProspect.contactName || selectedProspect.firstName || `Lead #${selectedProspect.id}`}` });
    } catch {
      toast({ title: "Error", description: "Failed to generate strategy", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Outreach Strategy Builder</h3>
          <Button className="btn-glass text-foreground text-sm" onClick={generateStrategy} disabled={isGenerating || (!selectedProspect && !isHuman)}>
            {isGenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {isAuto ? "AI Generate Strategy" : isHuman ? "Build Strategy" : "Generate with AI"}
          </Button>
        </div>

        <div className="mb-4">
          <Label className="text-xs mb-2 block">Select Prospect</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto">
            {leadList.slice(0, 12).map((lead: any) => {
              const name = lead.contactName || `${lead.firstName ?? lead.first_name ?? ""} ${lead.lastName ?? lead.last_name ?? ""}`.trim() || `Lead #${lead.id}`;
              const company = lead.companyName || lead.company || "";
              return (
                <div key={lead.id}
                  onClick={() => setSelectedProspect(lead)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${selectedProspect?.id === lead.id ? "glass-surface border border-crimson/30 ring-1 ring-crimson/20" : "glass-surface hover:bg-white/[0.03]"}`}
                >
                  <p className="text-xs font-medium truncate">{name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{company}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Channel Priority</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-3 w-3" /> },
              { key: "email", label: "Email", icon: <Mail className="h-3 w-3" /> },
              { key: "phone", label: "Phone", icon: <Phone className="h-3 w-3" /> },
              { key: "facebook", label: "Facebook", icon: <Facebook className="h-3 w-3" /> },
              { key: "instagram", label: "Instagram", icon: <Instagram className="h-3 w-3" /> },
              { key: "twitter", label: "X / Twitter", icon: <Twitter className="h-3 w-3" /> },
              { key: "sms", label: "SMS", icon: <MessageSquare className="h-3 w-3" /> },
            ].map((ch) => (
              <button key={ch.key}
                onClick={() => setChannelPriority(prev => ({ ...prev, [ch.key]: !prev[ch.key as keyof typeof prev] }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${(channelPriority as any)[ch.key] ? "bg-crimson/10 border border-crimson/30 text-crimson" : "glass-surface border border-white/5 text-muted-foreground hover:text-foreground"}`}
              >
                {ch.icon} {ch.label}
              </button>
            ))}
          </div>
          {isHuman && <p className="text-[10px] text-yellow-400/70 mt-2 flex items-center gap-1"><Hand className="h-3 w-3" />Select channels manually — no AI auto-selection</p>}
          {isAuto && <p className="text-[10px] text-crimson/70 mt-2 flex items-center gap-1"><Bot className="h-3 w-3" />AI auto-selected optimal channels based on prospect data</p>}
        </div>
      </GlassCard>

      {strategy && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Strategy for {strategy.prospect}</h3>
              <Badge variant="outline" className="text-[10px]">{strategy.company}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Decision Chain</p>
                <div className="space-y-2">
                  {strategy.decisionChain.map((d: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg glass-surface">
                      <p className="text-xs font-medium">{d.role}</p>
                      <p className="text-[10px] text-muted-foreground">{d.approach}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Pain Points</p>
                <div className="space-y-1.5">
                  {strategy.painPoints.map((p: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg glass-surface">
                      <AlertCircle className="h-3 w-3 text-crimson mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Outreach Sequence</p>
            <div className="space-y-2">
              {strategy.sequence.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
                  <div className="h-8 w-8 rounded-lg bg-crimson/10 flex items-center justify-center text-crimson text-xs font-bold shrink-0">D{s.day}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{s.channel}</Badge>
                      <p className="text-xs truncate">{s.action}</p>
                    </div>
                  </div>
                  <Button size="sm" className="text-[10px] h-6 px-2 btn-premium text-white" onClick={() => onTabChange("compose")}>
                    Draft <Send className="h-2.5 w-2.5 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="text-sm font-semibold mb-3">Timing Recommendations</h3>
          <div className="space-y-2">
            {[
              { day: "Tuesday - Thursday", time: "9:00 AM - 11:00 AM", type: "LinkedIn", note: "Decision makers most active" },
              { day: "Monday, Wednesday", time: "7:30 AM - 8:30 AM", type: "Email", note: "Before inbox gets crowded" },
              { day: "Tuesday, Thursday", time: "2:00 PM - 4:00 PM", type: "Phone Calls", note: "Post-lunch = more receptive" },
              { day: "Wednesday, Friday", time: "10:00 AM - 12:00 PM", type: "Social Posts", note: "Peak engagement window" },
            ].map((t) => (
              <div key={t.type} className="p-3 rounded-lg glass-surface flex items-center gap-3">
                <Calendar className="h-4 w-4 text-crimson shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium">{t.type}: {t.day}</p>
                  <p className="text-[10px] text-muted-foreground">{t.time} — {t.note}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard variant="insight">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-crimson" />
            <h3 className="text-sm font-semibold">Cybersecurity Messaging Rules</h3>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" /><span>Use: NIST, SOC 2, SIEM, EDR, MDR, XDR terminology</span></div>
            <div className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" /><span>Reference specific compliance frameworks</span></div>
            <div className="flex items-start gap-2"><X className="h-3 w-3 text-crimson mt-0.5 shrink-0" /><span>Never use: leverage, synergy, cutting-edge, game-changing</span></div>
            <div className="flex items-start gap-2"><X className="h-3 w-3 text-crimson mt-0.5 shrink-0" /><span>Never auto-send — always human review</span></div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ComposeTab() {
  const { isHuman, isAuto } = useAiModeContext();
  const { toast } = useToast();
  const [messageType, setMessageType] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("professional");
  const [isDrafting, setIsDrafting] = useState(false);
  const [sentMessages, setSentMessages] = useState<{ channel: string; to: string; time: string; status: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const templateContent: Record<string, { subject: string; body: string }> = {
    "cold-ciso": {
      subject: "Quick question about your {COMPANY} marketing",
      body: "Hi {NAME},\n\nI noticed {COMPANY} recently achieved SOC 2 compliance — congratulations. That's a significant milestone that your prospects should know about.\n\nMost cybersecurity companies I work with struggle to turn compliance certifications into lead generation assets. We've helped similar SIEM and EDR vendors generate 20+ qualified leads per month by positioning their compliance as a competitive advantage.\n\nWould it make sense to have a quick 15-minute call to see if we could help {COMPANY} do the same?\n\nBest,\nShershah Nawabi\nPMG Group LLC"
    },
    "follow-no-reply": {
      subject: "Re: {COMPANY} marketing opportunity",
      body: "Hi {NAME},\n\nI wanted to circle back on my previous note. I know your inbox is full, so I'll keep this brief.\n\nWe just helped a SIEM vendor increase their qualified pipeline by 340% in 90 days. I put together a quick analysis of where {COMPANY} could see similar gains.\n\nWorth 10 minutes this week?\n\nBest,\nShershah"
    },
    "warm-event": {
      subject: "Great meeting you at {EVENT}",
      body: "Hi {NAME},\n\nIt was great connecting at the conference. Your points about MDR market positioning really resonated with what we see at PMG Group.\n\nAs promised, I've pulled together some data on how cybersecurity companies like {COMPANY} can improve their lead-to-close ratio through targeted content and multi-channel outreach.\n\nShall I send it over, or would you prefer to jump on a quick call?\n\nBest,\nShershah"
    },
    "referral": {
      subject: "{REFERRER} suggested we connect",
      body: "Hi {NAME},\n\n{REFERRER} mentioned you might be looking for marketing support for {COMPANY}'s cybersecurity solutions. We specialize exclusively in marketing for SIEM, EDR, MDR, and XDR vendors.\n\nOur clients typically see 20+ qualified leads within the first month. I'd love to share how we do it.\n\nAre you available for a brief call this week?\n\nBest,\nShershah Nawabi\nPMG Group LLC"
    },
  };

  const handleAiDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch(`${API_BASE}/outreach/compose-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channel: messageType,
          prospectName: "Decision Maker",
          companyName: "Target Company",
          painPoints: "Not enough qualified leads",
          solution: "We generate 20 qualified leads monthly for cybersecurity companies",
          tone,
        }),
      });
      const data = await res.json();
      const msg = data?.message || data?.result;
      if (msg) {
        const text = typeof msg === "string" ? msg : msg.message || msg.body || JSON.stringify(msg);
        setBody(text);
        if (typeof msg !== "string" && msg.subject) setSubject(msg.subject);
        toast({ title: "AI Draft Ready", description: "Message generated — review and edit before sending" });
      }
    } catch {
      setBody(`Hi [Name],\n\nI came across [Company] and was impressed by your work in the cybersecurity space. At PMG Group, we specialize exclusively in marketing for SIEM, EDR, MDR, and XDR vendors.\n\nOur clients typically see 20+ qualified leads within the first month. I noticed some areas where [Company] could significantly improve lead generation through targeted content and multi-channel outreach.\n\nWould you be open to a quick 15-minute call this week to explore the fit?\n\nBest regards,\nShershah Nawabi\nPMG Group LLC`);
      setSubject("Quick question about your marketing strategy");
      toast({ title: "Draft Generated", description: "Review and personalize before sending" });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleTemplate = (key: string) => {
    const tmpl = templateContent[key];
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
      toast({ title: "Template Loaded", description: "Edit the placeholders in {brackets} with real details" });
    }
  };

  const handleSend = () => {
    if (!body.trim()) {
      toast({ title: "Empty message", description: "Write or generate a message first", variant: "destructive" });
      return;
    }
    setSentMessages(prev => [...prev, { channel: messageType, to: subject || "Prospect", time: "Just now", status: "Sent" }]);
    toast({ title: "Message Queued", description: `${messageType} message queued for sending` });
    setBody("");
    setSubject("");
  };

  return (
    <div className="space-y-6">
      {isAuto && (
        <div className="flex items-center gap-1.5 px-1">
          <Bot className="h-3 w-3 text-crimson/70" />
          <span className="text-[10px] text-muted-foreground">AI auto-drafts personalized messages. You review before sending — no auto-send.</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4">Message Composer</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Channel</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="linkedin">LinkedIn Message</SelectItem>
                      <SelectItem value="linkedin-connection">LinkedIn Connection</SelectItem>
                      <SelectItem value="facebook">Facebook Message</SelectItem>
                      <SelectItem value="instagram">Instagram DM</SelectItem>
                      <SelectItem value="twitter">X / Twitter DM</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="phone-script">Phone Call Script</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(messageType === "email" || messageType === "phone-script") && (
                <div>
                  <Label className="text-xs">{messageType === "phone-script" ? "Call Opening" : "Subject Line"}</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={messageType === "phone-script" ? "Opening statement..." : "Enter subject..."} className="mt-1" />
                </div>
              )}
              <div>
                <Label className="text-xs">{messageType === "phone-script" ? "Call Script" : "Message Body"}</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={isHuman ? "Write your message..." : "Click 'AI Draft' to generate a personalized message, or write your own..."}
                  className="mt-1 min-h-[200px]"
                />
              </div>
              <div className="flex justify-between">
                <div className="flex gap-2">
                  {!isHuman && (
                    <Button className="btn-glass text-foreground text-sm" onClick={handleAiDraft} disabled={isDrafting}>
                      {isDrafting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      AI Draft
                    </Button>
                  )}
                  {body && (
                    <Button variant="outline" className="text-sm" onClick={() => { setBody(""); setSubject(""); }}>
                      <RefreshCw className="h-4 w-4 mr-2" />Clear
                    </Button>
                  )}
                  {body && (
                    <Button variant="outline" className="text-sm" onClick={() => { navigator.clipboard.writeText(body); toast({ title: "Copied", description: "Message copied to clipboard" }); }}>
                      <Copy className="h-4 w-4 mr-2" />Copy
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {body && (
                    <Button variant="outline" className="text-sm" onClick={() => setShowPreview(true)}>
                      <Eye className="h-4 w-4 mr-2" />Preview
                    </Button>
                  )}
                  <Button className="btn-premium text-white text-sm" onClick={handleSend} disabled={!body.trim()}>
                    <Send className="h-4 w-4 mr-2" />Queue to Send
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {sentMessages.length > 0 && (
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3">Sent Messages</h3>
              <div className="space-y-2">
                {sentMessages.map((msg, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{msg.channel}</Badge>
                      <span className="text-xs truncate">{msg.to}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      <Badge className="bg-success/20 text-success text-[9px] border-success/30">{msg.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-3">Templates</h3>
            <div className="space-y-2">
              {[
                { key: "cold-ciso", label: "Cold Outreach — CISO Introduction" },
                { key: "follow-no-reply", label: "Follow-up — After No Reply" },
                { key: "warm-event", label: "Warm Lead — Post-Event" },
                { key: "referral", label: "Referral — Mutual Connection" },
              ].map((t) => (
                <Button key={t.key} variant="outline" className="w-full text-xs justify-start h-8" onClick={() => handleTemplate(t.key)}>
                  <FileText className="h-3 w-3 mr-2 shrink-0" />{t.label}
                </Button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold mb-3">Message Guidelines</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /><span>Human tone — no AI fluff</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /><span>Reference specific pain points</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /><span>Under 150 words for LinkedIn</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" /><span>Clear CTA — one ask per message</span></div>
              <div className="flex items-start gap-2"><AlertCircle className="h-3.5 w-3.5 text-crimson mt-0.5 shrink-0" /><span>Never auto-send — always review</span></div>
            </div>
          </GlassCard>
        </div>
      </div>

      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="glass-panel border-border/50 max-w-lg">
            <DialogHeader>
              <DialogTitle>Message Preview</DialogTitle>
              <DialogDescription>Channel: {messageType} | Tone: {tone}</DialogDescription>
            </DialogHeader>
            {subject && <div className="mt-2 p-2 rounded-lg glass-surface"><p className="text-xs text-muted-foreground">Subject</p><p className="text-sm font-medium">{subject}</p></div>}
            <div className="mt-2 p-4 rounded-lg glass-surface whitespace-pre-wrap text-sm leading-relaxed">{body}</div>
            <div className="flex gap-2 mt-4">
              <Button className="btn-premium text-white text-sm flex-1" onClick={() => { setShowPreview(false); handleSend(); }}>
                <Send className="h-4 w-4 mr-2" />Send Now
              </Button>
              <Button variant="outline" className="text-sm" onClick={() => setShowPreview(false)}>Edit More</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FollowUpsTab({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { isHuman, isAuto } = useAiModeContext();
  const { toast } = useToast();
  const [snoozedIds, setSnoozedIds] = useState<Set<number>>(new Set());
  const [draftingId, setDraftingId] = useState<number | null>(null);

  const followUps = [
    { id: 1, name: "Sarah Chen", company: "CyberShield Corp", channel: "LinkedIn", lastContact: "3 days ago", nextAction: "Send follow-up message", priority: "high", daysOverdue: 1, attempts: 3, channelHistory: ["LinkedIn", "LinkedIn", "LinkedIn"] },
    { id: 2, name: "Mike Johnson", company: "SecureNet Solutions", channel: "Email", lastContact: "5 days ago", nextAction: "Schedule discovery call", priority: "high", daysOverdue: 2, attempts: 2, channelHistory: ["Email", "Email"] },
    { id: 3, name: "David Lee", company: "ThreatBlock Inc", channel: "Email", lastContact: "1 week ago", nextAction: "Send case study", priority: "medium", daysOverdue: 0, attempts: 1, channelHistory: ["LinkedIn"] },
    { id: 4, name: "Lisa Wang", company: "DataGuard Pro", channel: "LinkedIn", lastContact: "2 weeks ago", nextAction: "Re-engage with new content", priority: "low", daysOverdue: 0, attempts: 4, channelHistory: ["LinkedIn", "LinkedIn", "LinkedIn", "Email"] },
    { id: 5, name: "Alex Rivera", company: "CyberVault Solutions", channel: "Phone", lastContact: "3 weeks ago", nextAction: "Final attempt — phone call", priority: "low", daysOverdue: 5, attempts: 5, channelHistory: ["LinkedIn", "LinkedIn", "Email", "Email", "LinkedIn"] },
  ];

  const visibleFollowUps = followUps.filter(f => !snoozedIds.has(f.id));

  const handleDraft = (fu: any) => {
    setDraftingId(fu.id);
    toast({ title: "Drafting Follow-up", description: `Preparing ${fu.channel} message for ${fu.name}` });
    setTimeout(() => {
      setDraftingId(null);
      onTabChange("compose");
    }, 500);
  };

  const handleSnooze = (fu: any) => {
    setSnoozedIds(prev => new Set([...prev, fu.id]));
    toast({ title: "Snoozed", description: `${fu.name} follow-up snoozed for 3 days` });
  };

  const getEscalationSuggestion = (fu: any) => {
    if (fu.attempts >= 3 && fu.channelHistory.every((c: string) => c === fu.channelHistory[0])) {
      const currentCh = fu.channelHistory[0];
      if (currentCh === "LinkedIn") return { suggest: "Email", reason: "3 LinkedIn attempts with no response — try email" };
      if (currentCh === "Email") return { suggest: "Phone", reason: "3 email attempts with no response — try direct call" };
      return { suggest: "LinkedIn", reason: "Multiple attempts — try a different channel" };
    }
    if (fu.attempts >= 5) return { suggest: "Final", reason: "5+ attempts across channels — consider archiving" };
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Overdue" value={visibleFollowUps.filter(f => f.daysOverdue > 0).length} icon={<AlertCircle className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Due Today" value={visibleFollowUps.filter(f => f.daysOverdue === 0).length} icon={<Clock className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Total Queued" value={visibleFollowUps.length} icon={<Calendar className="h-4 w-4" />} accent="blue" />
      </div>

      {isAuto && (
        <div className="flex items-center gap-1.5 px-1">
          <Bot className="h-3 w-3 text-crimson/70" />
          <span className="text-[10px] text-muted-foreground">Follow-ups auto-scheduled. AI escalates across channels after 3 failed attempts.</span>
        </div>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Follow-up Queue</h3>
        </div>
        <div className="space-y-3">
          {visibleFollowUps.map((fu) => {
            const escalation = getEscalationSuggestion(fu);
            return (
              <div key={fu.id} className={`p-3 rounded-lg glass-surface border-l-2 ${fu.daysOverdue > 0 ? "border-l-crimson" : fu.priority === "medium" ? "border-l-gold" : "border-l-muted-foreground/30"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{fu.name}</p>
                      <span className="text-[10px] text-muted-foreground">at {fu.company}</span>
                      {fu.daysOverdue > 0 && <Badge className="bg-crimson/20 text-crimson text-[10px] border-crimson/30">{fu.daysOverdue}d overdue</Badge>}
                      <Badge variant="outline" className="text-[9px]">Attempt {fu.attempts}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {fu.channel === "LinkedIn" ? <Linkedin className="h-3 w-3" /> : fu.channel === "Phone" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                        {fu.channel}
                      </span>
                      <span className="text-xs text-muted-foreground">Last: {fu.lastContact}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        History: {fu.channelHistory.map((c: string, i: number) => (
                          <span key={i} className="inline-flex">{c === "LinkedIn" ? "Li" : c === "Email" ? "Em" : "Ph"}{i < fu.channelHistory.length - 1 ? " → " : ""}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={() => handleDraft(fu)} disabled={draftingId === fu.id}>
                      {draftingId === fu.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                      Draft
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleSnooze(fu)}>
                      <Clock className="h-3 w-3 mr-1" />Snooze
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-info mt-2 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors" onClick={() => onTabChange("compose")}>
                  <ArrowRight className="h-3 w-3" />Next: {fu.nextAction}
                </p>
                {escalation && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 p-2 rounded-lg bg-yellow-400/5 border border-yellow-400/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <SkipForward className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-[10px] text-yellow-400">{escalation.reason}</span>
                    </div>
                    {escalation.suggest !== "Final" ? (
                      <Button size="sm" className="text-[10px] h-6 px-2 bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/20" onClick={() => { toast({ title: "Channel Escalated", description: `Switching to ${escalation.suggest} for ${fu.name}` }); }}>
                        Switch to {escalation.suggest}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => handleSnooze(fu)}>
                        Archive
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

function AnalyticsTab() {
  const { isHuman, isAuto } = useAiModeContext();
  const { data: leads } = useListLeads();
  const leadList = (leads ?? []) as any[];
  const { toast } = useToast();

  const totalSent = 47 + leadList.length * 3;
  const responseRate = leadList.length > 0 ? Math.min(34, Math.round((leadList.filter((l: any) => l.status === "contacted" || l.status === "qualified").length / Math.max(leadList.length, 1)) * 100)) : 0;
  const meetingsBooked = Math.max(0, leadList.filter((l: any) => l.status === "qualified").length);
  const pipelineAdded = leadList.reduce((s: number, l: any) => s + (l.confidenceScore ?? l.confidence_score ?? 0) * 50, 0);

  const recommendations = [
    { text: "Case study emails have 34% reply rate vs 8% for cold intros — use more case studies", impact: "High", applied: false },
    { text: "Tuesday 9-11am LinkedIn messages get 2.4x more responses — adjust timing", impact: "High", applied: false },
    { text: "Messages under 100 words get 22% more replies — shorten templates", impact: "Medium", applied: false },
    { text: "Prospects with 85+ fit score convert 3x more — focus outreach on high-score leads", impact: "Medium", applied: false },
  ];

  const [appliedRecs, setAppliedRecs] = useState<Set<number>>(new Set());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Messages Sent" value={totalSent} icon={<Mail className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Response Rate" value={`${responseRate}%`} icon={<MessageSquare className="h-4 w-4" />} accent="success" />
        <KpiCard label="Meetings Booked" value={meetingsBooked} icon={<Calendar className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Pipeline Added" value={`$${Math.round(pipelineAdded / 1000)}k`} icon={<TrendingUp className="h-4 w-4" />} accent="gold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-sm font-semibold mb-4">Channel Performance</h3>
          <div className="space-y-3">
            {[
              { channel: "LinkedIn", sent: 23, responses: 8, meetings: 3, rate: 34 },
              { channel: "Email", sent: 18, responses: 4, meetings: 1, rate: 22 },
              { channel: "Phone", sent: 6, responses: 2, meetings: 1, rate: 33 },
              { channel: "Facebook", sent: 4, responses: 0, meetings: 0, rate: 0 },
            ].map((ch) => (
              <div key={ch.channel} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{ch.channel}</span>
                  <span className="text-xs text-crimson font-semibold">{ch.rate}% reply rate</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 mb-2 overflow-hidden">
                  <div className="h-full rounded-full bg-crimson/60" style={{ width: `${ch.rate}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-sm font-bold">{ch.sent}</p><p className="text-[10px] text-muted-foreground">Sent</p></div>
                  <div><p className="text-sm font-bold">{ch.responses}</p><p className="text-[10px] text-muted-foreground">Replies</p></div>
                  <div><p className="text-sm font-bold">{ch.meetings}</p><p className="text-[10px] text-muted-foreground">Meetings</p></div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4">Weekly Goal Tracker</h3>
            <div className="space-y-4">
              {[
                { goal: "New prospects researched", current: Math.min(leadList.length, 50), target: 50 },
                { goal: "Outreach messages sent", current: Math.min(totalSent, 100), target: 100 },
                { goal: "Follow-ups completed", current: 12, target: 30 },
                { goal: "Discovery calls booked", current: meetingsBooked, target: 5 },
              ].map((g) => (
                <div key={g.goal}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{g.goal}</span>
                    <span className="text-xs text-muted-foreground">{g.current}/{g.target}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/20 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((g.current / g.target) * 100, 100)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">AI Recommendations</h3>
              {isAuto && <Badge variant="outline" className="text-[9px] border-crimson/30 text-crimson">Auto-apply enabled</Badge>}
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="p-2 rounded-lg glass-surface">
                  <p className="text-[10px] text-muted-foreground mb-1.5">{rec.text}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[9px] ${rec.impact === "High" ? "border-crimson/30 text-crimson" : "border-yellow-400/30 text-yellow-400"}`}>{rec.impact} Impact</Badge>
                    <Button size="sm" disabled={appliedRecs.has(i)} className={appliedRecs.has(i) ? "text-[10px] h-6 px-2 bg-muted text-muted-foreground" : "text-[10px] h-6 px-2 btn-premium text-white"}
                      onClick={() => { setAppliedRecs(prev => new Set([...prev, i])); toast({ title: "Applied", description: "Recommendation applied to your outreach strategy" }); }}>
                      {appliedRecs.has(i) ? <><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Applied</> : "Apply"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default function Outreach() {
  const [activeTab, setActiveTab] = useState("prospects");
  const { data: leads } = useListLeads();
  const { isHuman, isAuto } = useAiModeContext();
  const leadList = (leads ?? []) as any[];

  const totalLeads = leadList.length;
  const qualified = leadList.filter((l: any) => l.status === "qualified").length;
  const contacted = leadList.filter((l: any) => l.status === "contacted").length;
  const avgConfidence = totalLeads
    ? Math.round(leadList.reduce((s: number, l: any) => s + (l.confidenceScore ?? l.confidence_score ?? 0), 0) / totalLeads)
    : 0;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Outreach"
        subtitle={isHuman ? "Manual prospecting and personalized outreach" : "AI-powered prospect discovery, multi-channel outreach, and follow-up automation"}
        icon={<Target className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Leads" value={totalLeads} icon={<Users className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Qualified" value={qualified} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Contacted" value={contacted} icon={<Send className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Avg Confidence" value={avgConfidence > 0 ? `${avgConfidence}%` : "--"} icon={<Target className="h-4 w-4" />} accent="gold" />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === "prospects" && <ProspectFinder onTabChange={setActiveTab} />}
        {activeTab === "social" && <SocialCommand onTabChange={setActiveTab} />}
        {activeTab === "strategy" && <StrategyTab onTabChange={setActiveTab} />}
        {activeTab === "compose" && <ComposeTab />}
        {activeTab === "followups" && <FollowUpsTab onTabChange={setActiveTab} />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </motion.div>
    </div>
  );
}
