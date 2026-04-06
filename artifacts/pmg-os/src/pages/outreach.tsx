import { useState, useCallback } from "react";
import { useListLeads, useListCompanies, useCreateLead } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Users, CheckCircle2, Send, Sparkles, Plus, Search, Globe,
  Building2, Mail, Phone, Linkedin, ArrowRight, Clock, AlertCircle,
  MessageSquare, BarChart3, RefreshCw, Eye, Edit, Zap, Calendar,
  TrendingUp, Filter, ChevronDown, ChevronRight, X
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

function ProspectFinder() {
  const { data: leads } = useListLeads();
  const { data: companies } = useListCompanies();
  const { isHuman, isAuto } = useAiModeContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const leadList = (leads ?? []) as any[];
  const companyList = (companies ?? []) as any[];

  const [showAddLead, setShowAddLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isProspecting, setIsProspecting] = useState(false);

  const [newLead, setNewLead] = useState({
    firstName: "", lastName: "", email: "", company: "", title: "", phone: "", source: "manual"
  });

  const filtered = leadList.filter((l: any) => {
    const matchesSearch = !searchQuery || 
      `${l.firstName ?? l.first_name ?? ""} ${l.lastName ?? l.last_name ?? ""} ${l.company ?? l.companyName ?? ""}`.toLowerCase().includes(searchQuery.toLowerCase());
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
          firstName: newLead.firstName,
          lastName: newLead.lastName,
          email: newLead.email,
          company: newLead.company,
          title: newLead.title,
          phone: newLead.phone,
          source: newLead.source,
          status: "new",
        }),
      });
      if (!res.ok) throw new Error("Failed to create lead");
      toast({ title: "Lead added", description: `${newLead.firstName} ${newLead.lastName} added to pipeline` });
      setShowAddLead(false);
      setNewLead({ firstName: "", lastName: "", email: "", company: "", title: "", phone: "", source: "manual" });
      queryClient.invalidateQueries({ queryKey: ["/leads"] });
    } catch (err) {
      toast({ title: "Error", description: "Failed to add lead", variant: "destructive" });
    }
  }, [newLead, toast, queryClient]);

  const handleAiProspect = useCallback(async () => {
    setIsProspecting(true);
    try {
      const res = await fetch(`${API_BASE}/outreach/find-prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          industry: "cybersecurity",
          region: "USA",
          companySize: "mid-market",
          marketingGaps: "not enough qualified leads",
        }),
      });
      const data = await res.json();
      toast({ title: "AI Prospecting Complete", description: data.data ? `Found prospects with ${data.confidence}% confidence` : "Prospect research initiated" });
      queryClient.invalidateQueries({ queryKey: ["/leads"] });
    } catch {
      toast({ title: "AI Prospecting", description: "Prospecting task queued. AI will research and add leads shortly." });
    } finally {
      setIsProspecting(false);
    }
  }, [toast, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
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
            <Plus className="h-4 w-4 mr-2" />Add Lead
          </Button>
          {!isHuman && (
            <Button
              className="btn-glass text-foreground text-sm"
              onClick={handleAiProspect}
              disabled={isProspecting}
            >
              {isProspecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              AI Prospect
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-sm font-semibold mb-2">No Prospects Yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
            Start building your pipeline. Add leads manually or let AI find cybersecurity companies that match your ideal customer profile.
          </p>
          <div className="flex justify-center gap-3">
            <Button className="btn-premium text-white text-sm" onClick={() => setShowAddLead(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Manually
            </Button>
            {!isHuman && (
              <Button className="btn-glass text-foreground text-sm" onClick={handleAiProspect} disabled={isProspecting}>
                <Sparkles className="h-4 w-4 mr-2" />Find with AI
              </Button>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead: any) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-lg p-4 cursor-pointer hover:glass-card-interactive transition-all"
              onClick={() => setSelectedLead(lead)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-crimson/30 to-crimson/10 flex items-center justify-center text-crimson text-sm font-bold shrink-0">
                    {(lead.firstName ?? lead.first_name ?? "?")[0]}{(lead.lastName ?? lead.last_name ?? "?")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{lead.firstName ?? lead.first_name ?? ""} {lead.lastName ?? lead.last_name ?? ""}</p>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{(lead.status ?? "new").replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {(lead.company ?? lead.companyName) && (
                        <span className="flex items-center gap-1 truncate"><Building2 className="h-3 w-3" />{lead.company ?? lead.companyName}</span>
                      )}
                      {(lead.title) && (
                        <span className="truncate">{lead.title}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {(lead.confidenceScore ?? lead.confidence_score) ? (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-sm font-semibold text-crimson">{lead.confidenceScore ?? lead.confidence_score}%</p>
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
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Manually add a prospect to your pipeline</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={newLead.firstName} onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })} placeholder="John" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={newLead.lastName} onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })} placeholder="Smith" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Email</Label>
              <Input value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="john@company.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="CyberDefend Inc" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={newLead.title} onChange={(e) => setNewLead({ ...newLead, title: e.target.value })} placeholder="VP Marketing" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+1 555-0123" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={newLead.source} onValueChange={(v) => setNewLead({ ...newLead, source: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
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
            <Button className="btn-premium text-white" onClick={handleAddLead} disabled={!newLead.firstName || !newLead.lastName}>
              Add Lead
            </Button>
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
                    {(selectedLead.firstName ?? selectedLead.first_name ?? "?")[0]}{(selectedLead.lastName ?? selectedLead.last_name ?? "?")[0]}
                  </div>
                  {selectedLead.firstName ?? selectedLead.first_name} {selectedLead.lastName ?? selectedLead.last_name}
                </DialogTitle>
                <DialogDescription>{selectedLead.company ?? selectedLead.companyName} — {selectedLead.title ?? "No title"}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.email ?? "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.phone ?? "No phone"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>Source: {selectedLead.source ?? "Unknown"}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg glass-surface">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className="mt-1 capitalize">{(selectedLead.status ?? "new").replace(/_/g, " ")}</Badge>
                  </div>
                  {(selectedLead.confidenceScore ?? selectedLead.confidence_score) && (
                    <div className="p-3 rounded-lg glass-surface">
                      <p className="text-xs text-muted-foreground">Confidence Score</p>
                      <p className="text-lg font-bold text-crimson">{selectedLead.confidenceScore ?? selectedLead.confidence_score}%</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button className="btn-premium text-white text-sm flex-1">
                  <Send className="h-4 w-4 mr-2" />Draft Message
                </Button>
                <Button variant="outline" className="text-sm flex-1">
                  <Target className="h-4 w-4 mr-2" />Plan Approach
                </Button>
                <Button variant="outline" className="text-sm">
                  <ArrowRight className="h-4 w-4 mr-2" />Move to CRM
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialCommand() {
  const channels = [
    { name: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, unread: 3, color: "text-blue-400" },
    { name: "Email", icon: <Mail className="h-4 w-4" />, unread: 7, color: "text-crimson" },
    { name: "Facebook", icon: <Globe className="h-4 w-4" />, unread: 1, color: "text-blue-500" },
    { name: "X (Twitter)", icon: <MessageSquare className="h-4 w-4" />, unread: 0, color: "text-foreground" },
  ];

  const messages = [
    { id: 1, channel: "LinkedIn", from: "Sarah Chen", subject: "Re: Marketing partnership opportunity", time: "2h ago", type: "reply", priority: "high" },
    { id: 2, channel: "Email", from: "Mike Johnson", subject: "Interested in your cybersecurity marketing services", time: "3h ago", type: "inbound", priority: "high" },
    { id: 3, channel: "LinkedIn", from: "David Lee", subject: "Connection request accepted", time: "5h ago", type: "notification", priority: "medium" },
    { id: 4, channel: "Email", from: "Lisa Wang", subject: "Follow up on our call last week", time: "1d ago", type: "follow-up", priority: "medium" },
    { id: 5, channel: "Email", from: "Tom Roberts", subject: "Budget discussion for Q2 campaigns", time: "1d ago", type: "inbound", priority: "low" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {channels.map((ch) => (
          <GlassCard key={ch.name} variant="interactive" className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={ch.color}>{ch.icon}</div>
                <span className="text-sm font-medium">{ch.name}</span>
              </div>
              {ch.unread > 0 && (
                <Badge className="bg-crimson text-white text-[10px] px-1.5 py-0">{ch.unread}</Badge>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Unified Inbox</h3>
          <Badge variant="outline" className="text-xs">{messages.length} messages</Badge>
        </div>
        <div className="space-y-2">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              whileHover={{ scale: 1.005 }}
              className="p-3 rounded-lg glass-surface cursor-pointer flex items-center gap-3"
            >
              <div className={`p-1.5 rounded-lg glass-surface ${msg.priority === "high" ? "text-crimson" : "text-muted-foreground"}`}>
                {msg.channel === "LinkedIn" ? <Linkedin className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{msg.from}</p>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{msg.type}</Badge>
                  {msg.priority === "high" && <AlertCircle className="h-3 w-3 text-crimson shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{msg.subject}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Eye className="h-3 w-3 mr-1" />View
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <GlassCard variant="insight">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold">How Social Command Center Works</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          All connected channels feed into this unified inbox. AI classifies messages by priority and type, drafts responses for your review,
          and tracks engagement patterns. You always approve and send — no automated sending to prevent account bans.
        </p>
      </GlassCard>
    </div>
  );
}

function StrategyTab() {
  const { isHuman } = useAiModeContext();

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Outreach Strategy Builder</h3>
          {!isHuman && (
            <Button className="btn-glass text-foreground text-sm">
              <Sparkles className="h-4 w-4 mr-2" />AI Generate Strategy
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select a prospect from the pipeline, and the Outreach Strategist will build a personalized multi-channel approach plan.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Select Prospect", desc: "Choose from your pipeline or import new", icon: <Users className="h-5 w-5" /> },
            { step: "2", title: "AI Analyzes", desc: "Research company, pain points, decision makers", icon: <Search className="h-5 w-5" /> },
            { step: "3", title: "Get Strategy", desc: "Multi-channel approach with timing and messaging", icon: <Target className="h-5 w-5" /> },
          ].map((s) => (
            <GlassCard key={s.step} variant="interactive" className="text-center cursor-pointer">
              <div className="p-3 rounded-full glass-surface w-12 h-12 mx-auto flex items-center justify-center text-crimson mb-3">
                {s.icon}
              </div>
              <p className="text-sm font-semibold mb-1">Step {s.step}: {s.title}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="text-sm font-semibold mb-3">Channel Priority</h3>
          <div className="space-y-2">
            {[
              { channel: "LinkedIn", priority: "Primary", reason: "Decision makers most active here" },
              { channel: "Email", priority: "Secondary", reason: "Follow-up and formal proposals" },
              { channel: "Phone", priority: "Tertiary", reason: "For warm leads ready for calls" },
            ].map((ch) => (
              <div key={ch.channel} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{ch.channel}</span>
                  <Badge variant="outline" className="text-[10px]">{ch.priority}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{ch.reason}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold mb-3">Timing Recommendations</h3>
          <div className="space-y-2">
            {[
              { day: "Tuesday - Thursday", time: "9:00 AM - 11:00 AM", type: "LinkedIn" },
              { day: "Monday, Wednesday", time: "7:30 AM - 8:30 AM", type: "Email" },
              { day: "Tuesday, Thursday", time: "2:00 PM - 4:00 PM", type: "Phone Calls" },
            ].map((t) => (
              <div key={t.type} className="p-3 rounded-lg glass-surface flex items-center gap-3">
                <Calendar className="h-4 w-4 text-crimson shrink-0" />
                <div>
                  <p className="text-xs font-medium">{t.type}: {t.day}</p>
                  <p className="text-[10px] text-muted-foreground">{t.time} (prospect's timezone)</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ComposeTab() {
  const { isHuman } = useAiModeContext();
  const [messageType, setMessageType] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("professional");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4">Message Composer</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Channel</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="linkedin">LinkedIn Message</SelectItem>
                      <SelectItem value="linkedin-connection">LinkedIn Connection Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="consultative">Consultative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {messageType === "email" && (
                <div>
                  <Label className="text-xs">Subject Line</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject..." className="mt-1" />
                </div>
              )}
              <div>
                <Label className="text-xs">Message Body</Label>
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
                    <Button className="btn-glass text-foreground text-sm">
                      <Sparkles className="h-4 w-4 mr-2" />AI Draft
                    </Button>
                  )}
                  {body && !isHuman && (
                    <Button variant="outline" className="text-sm">
                      <RefreshCw className="h-4 w-4 mr-2" />Rewrite
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-sm">
                    <Eye className="h-4 w-4 mr-2" />Preview
                  </Button>
                  <Button className="btn-premium text-white text-sm">
                    <Send className="h-4 w-4 mr-2" />Queue to Send
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-3">Message Guidelines</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>Human tone — no AI fluff or jargon</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>Reference specific pain points</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>Keep under 150 words for LinkedIn</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                <span>Clear CTA — one ask per message</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-crimson mt-0.5 shrink-0" />
                <span>Never auto-send — always human review</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold mb-3">Templates</h3>
            <div className="space-y-2">
              {[
                "Cold Outreach — CISO Introduction",
                "Follow-up — After No Reply",
                "Warm Lead — Post-Event",
                "Referral — Mutual Connection",
              ].map((t) => (
                <Button key={t} variant="outline" className="w-full text-xs justify-start h-8">
                  {t}
                </Button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function FollowUpsTab() {
  const followUps = [
    { id: 1, name: "Sarah Chen", company: "CyberShield Corp", channel: "LinkedIn", lastContact: "3 days ago", nextAction: "Send follow-up message", priority: "high", daysOverdue: 1 },
    { id: 2, name: "Mike Johnson", company: "SecureNet Solutions", channel: "Email", lastContact: "5 days ago", nextAction: "Schedule discovery call", priority: "high", daysOverdue: 2 },
    { id: 3, name: "David Lee", company: "ThreatBlock Inc", channel: "Email", lastContact: "1 week ago", nextAction: "Send case study", priority: "medium", daysOverdue: 0 },
    { id: 4, name: "Lisa Wang", company: "DataGuard Pro", channel: "LinkedIn", lastContact: "2 weeks ago", nextAction: "Re-engage with new content", priority: "low", daysOverdue: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Overdue" value={followUps.filter(f => f.daysOverdue > 0).length} icon={<AlertCircle className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Due Today" value={followUps.filter(f => f.daysOverdue === 0).length} icon={<Clock className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Scheduled" value={followUps.length} icon={<Calendar className="h-4 w-4" />} accent="blue" />
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Follow-up Queue</h3>
          <Button className="btn-glass text-foreground text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1" />AI Prioritize
          </Button>
        </div>
        <div className="space-y-2">
          {followUps.map((fu) => (
            <div key={fu.id} className={`p-3 rounded-lg glass-surface border-l-2 ${fu.daysOverdue > 0 ? "border-l-crimson" : fu.priority === "medium" ? "border-l-gold" : "border-l-muted-foreground/30"}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{fu.name}</p>
                    <span className="text-[10px] text-muted-foreground">at {fu.company}</span>
                    {fu.daysOverdue > 0 && (
                      <Badge className="bg-crimson/20 text-crimson text-[10px] border-crimson/30">{fu.daysOverdue}d overdue</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {fu.channel === "LinkedIn" ? <Linkedin className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                      {fu.channel}
                    </span>
                    <span className="text-xs text-muted-foreground">Last: {fu.lastContact}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" className="btn-premium text-white text-xs h-7">
                    <Send className="h-3 w-3 mr-1" />Draft
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    <Clock className="h-3 w-3 mr-1" />Snooze
                  </Button>
                </div>
              </div>
              <p className="text-xs text-info mt-2 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />Next: {fu.nextAction}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Emails Sent" value={0} icon={<Mail className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Response Rate" value="0%" icon={<MessageSquare className="h-4 w-4" />} accent="success" />
        <KpiCard label="Meetings Booked" value={0} icon={<Calendar className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Pipeline Added" value="$0" icon={<TrendingUp className="h-4 w-4" />} accent="gold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-sm font-semibold mb-4">Channel Performance</h3>
          <div className="space-y-3">
            {[
              { channel: "LinkedIn", sent: 0, responses: 0, meetings: 0 },
              { channel: "Email", sent: 0, responses: 0, meetings: 0 },
              { channel: "Phone", sent: 0, responses: 0, meetings: 0 },
            ].map((ch) => (
              <div key={ch.channel} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{ch.channel}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{ch.sent}</p>
                    <p className="text-[10px] text-muted-foreground">Sent</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{ch.responses}</p>
                    <p className="text-[10px] text-muted-foreground">Replies</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{ch.meetings}</p>
                    <p className="text-[10px] text-muted-foreground">Meetings</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold mb-4">Weekly Goal Tracker</h3>
          <div className="space-y-4">
            {[
              { goal: "New prospects researched", current: 0, target: 50 },
              { goal: "Outreach messages sent", current: 0, target: 100 },
              { goal: "Follow-ups completed", current: 0, target: 30 },
              { goal: "Discovery calls booked", current: 0, target: 5 },
            ].map((g) => (
              <div key={g.goal}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{g.goal}</span>
                  <span className="text-xs text-muted-foreground">{g.current}/{g.target}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson/60 transition-all"
                    style={{ width: `${Math.min((g.current / g.target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
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

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "prospects" && <ProspectFinder />}
        {activeTab === "social" && <SocialCommand />}
        {activeTab === "strategy" && <StrategyTab />}
        {activeTab === "compose" && <ComposeTab />}
        {activeTab === "followups" && <FollowUpsTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </motion.div>
    </div>
  );
}
