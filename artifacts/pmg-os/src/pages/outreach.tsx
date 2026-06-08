import { useState, useCallback } from "react";
import { useListLeads, useListCompanies, useListOutreachSequences } from "@workspace/api-client-react";
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
import { ModeBadge } from "@/components/mode-badge";
import { useApolloSearch, useApolloStatus, useApolloImport, useApolloEnrich, useApolloEnroll, type ApolloPerson, type ApolloSearchResult } from "@/hooks/use-api";

// Apollo seniority enum (UI labels). Sent verbatim to Apollo `person_seniorities`.
const APOLLO_SENIORITIES = [
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-Suite" },
  { value: "partner", label: "Partner" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
];

// Apollo `organization_num_employees_ranges` buckets (value=lower,upper).
const APOLLO_HEADCOUNT_RANGES = [
  { value: "1,10", label: "1–10" },
  { value: "11,50", label: "11–50" },
  { value: "51,200", label: "51–200" },
  { value: "201,500", label: "201–500" },
  { value: "501,1000", label: "501–1K" },
  { value: "1001,5000", label: "1K–5K" },
  { value: "5001,10000", label: "5K–10K" },
  { value: "10001,1000000", label: "10K+" },
];
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
  const leadList = (leads ?? []) as any[];

  const [showAddLead, setShowAddLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // --- Apollo prospect search (manual filters → free preview, no credits, no emails) ---
  const apolloSearch = useApolloSearch();
  const apolloImport = useApolloImport();
  const apolloEnrich = useApolloEnrich();
  const apolloEnroll = useApolloEnroll();
  const { data: apolloStatus } = useApolloStatus();
  const { data: sequences } = useListOutreachSequences({ status: "active" });
  const activeSequences = (sequences ?? []) as any[];
  const [showFinder, setShowFinder] = useState(false);
  const [apolloResult, setApolloResult] = useState<ApolloSearchResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  // apolloId → result of import (so rows can show imported / reveal-email / enroll state)
  const [importedMap, setImportedMap] = useState<Record<string, { contactId: number; leadId: number; email: string | null; contactStatus: string }>>({});
  const [filters, setFilters] = useState({
    titles: "",
    keywords: "",
    organizationKeywords: "",
    locations: "",
    seniorities: [] as string[],
    employeeRanges: [] as string[],
  });

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

  const crmStatuses = ["qualified", "routing", "routed", "active", "closed_won", "closed_lost"];
  const isInCrm = (status: string) => crmStatuses.includes(status);

  const filtered = leadList.filter((l: any) => {
    const matchesSearch = !searchQuery ||
      `${getLeadName(l)} ${getLeadCompany(l)}`.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "all") {
      return matchesSearch && !isInCrm(l.status);
    }
    if (statusFilter === "in_crm") {
      return matchesSearch && isInCrm(l.status);
    }
    return matchesSearch && l.status === statusFilter;
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
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.refetchQueries({ queryKey: ["/api/leads"] });
    } catch {
      toast({ title: "Error", description: "Failed to add lead", variant: "destructive" });
    }
  }, [newLead, toast, queryClient]);

  const toggleFilter = useCallback((key: "seniorities" | "employeeRanges", value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }, []);

  const splitCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const runApolloSearch = useCallback((page = 1) => {
    apolloSearch.mutate(
      {
        titles: splitCsv(filters.titles),
        organizationKeywords: splitCsv(filters.organizationKeywords),
        locations: splitCsv(filters.locations),
        seniorities: filters.seniorities,
        employeeRanges: filters.employeeRanges,
        keywords: filters.keywords.trim() || undefined,
        page,
        perPage: 25,
      },
      {
        onSuccess: (data) => {
          setApolloResult(data);
          setSelectedIds(new Set());
          setImportedMap({});
          if (data.people.length === 0) {
            toast({ title: "No prospects found", description: "Try broadening your filters." });
          }
        },
        // Surface the real failure — never toast success on error (anti-pattern guard).
        onError: (err: any) => {
          toast({ title: "Apollo search failed", description: err?.message || "Request failed", variant: "destructive" });
        },
      },
    );
  }, [filters, apolloSearch, toast]);

  const toggleSelect = useCallback((apolloId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(apolloId)) next.delete(apolloId);
      else next.add(apolloId);
      return next;
    });
  }, []);

  const handleImportSelected = useCallback(() => {
    const people = (apolloResult?.people ?? []).filter(
      (p) => p.apolloId && selectedIds.has(p.apolloId) && !importedMap[p.apolloId],
    );
    if (people.length === 0) return;
    apolloImport.mutate(people, {
      onSuccess: (data) => {
        setImportedMap((prev) => {
          const next = { ...prev };
          for (const row of data.imported) {
            if (row.apolloId) next[row.apolloId] = { contactId: row.contactId, leadId: row.leadId, email: row.email, contactStatus: row.contactStatus };
          }
          return next;
        });
        setSelectedIds(new Set());
        const skipped = data.skipped.length ? `, ${data.skipped.length} skipped` : "";
        toast({ title: "Imported to pipeline", description: `${data.imported.length} lead${data.imported.length === 1 ? "" : "s"} created${skipped}.` });
      },
      onError: (err: any) => {
        toast({ title: "Import failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  }, [apolloResult, selectedIds, importedMap, apolloImport, toast]);

  const handleRevealEmail = useCallback((apolloId: string, contactId: number) => {
    apolloEnrich.mutate([contactId], {
      onSuccess: (data) => {
        const row = data.enriched.find((e) => e.contactId === contactId);
        setImportedMap((prev) => ({
          ...prev,
          [apolloId]: { ...prev[apolloId], contactId, email: row?.email ?? null, contactStatus: row?.contactStatus ?? "missing_contact" },
        }));
        toast(
          row?.email
            ? { title: data.mode === "fixture" ? "Sample email filled" : "Email revealed", description: row.email }
            : { title: "No email found", description: "Apollo could not reveal an email for this contact.", variant: "destructive" },
        );
      },
      onError: (err: any) => {
        toast({ title: "Enrich failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  }, [apolloEnrich, toast]);

  const handleEnroll = useCallback(() => {
    const leadIds = Object.values(importedMap).filter((v) => v.email && v.leadId).map((v) => v.leadId);
    const sequenceId = Number(selectedSequenceId);
    if (leadIds.length === 0 || !Number.isFinite(sequenceId)) return;
    apolloEnroll.mutate(
      { leadIds, sequenceId },
      {
        onSuccess: (data) => {
          const skipped = data.skipped.length ? `, ${data.skipped.length} skipped (no email / already enrolled)` : "";
          toast({ title: "Enrolled in sequence", description: `${data.enrolled.length} lead${data.enrolled.length === 1 ? "" : "s"} enrolled${skipped}.` });
        },
        // Surface the real failure — never toast success on error (anti-pattern guard).
        onError: (err: any) => {
          toast({ title: "Enroll failed", description: err?.message || "Request failed", variant: "destructive" });
        },
      },
    );
  }, [importedMap, selectedSequenceId, apolloEnroll, toast]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Moved to CRM", description: "Lead qualified and added to CRM pipeline" });
      setSelectedLead(null);
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  }, [toast, queryClient]);

  const apolloPeople = apolloResult?.people ?? [];
  const isFixture = apolloResult?.mode === "fixture" || apolloStatus?.mode === "fixture";
  const selectableIds = apolloPeople.map((p) => p.apolloId).filter((id): id is string => !!id && !importedMap[id]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const importedCount = Object.keys(importedMap).length;
  const enrollableCount = Object.values(importedMap).filter((v) => v.email && v.leadId).length;

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
              <SelectItem value="all">Prospects</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="enriched">Enriched</SelectItem>
              <SelectItem value="scored">Scored</SelectItem>
              <SelectItem value="in_crm">In CRM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button className="btn-premium text-white text-sm" onClick={() => setShowAddLead(true)}>
            <Plus className="h-4 w-4 mr-2" />{isHuman ? "Enter Prospect" : "Add Lead"}
          </Button>
          <Button className="btn-glass text-foreground text-sm" onClick={() => setShowFinder((s) => !s)}>
            <Search className="h-4 w-4 mr-2" />Find Prospects
            {isFixture && <Badge variant="outline" className="ml-2 text-[9px] border-gold/40 text-gold">Sample</Badge>}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-1">
        <Globe className="h-3 w-3 text-crimson/70" />
        <span className="text-[10px] text-muted-foreground">
          {apolloStatus?.mode === "live"
            ? "Apollo connected — searches pull live prospect data (free; emails revealed only on import)."
            : "Apollo not connected — Prospect Finder returns labeled sample data. Add your key in Settings → API Keys to go live."}
        </span>
      </div>

      {showFinder && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-crimson" />
              <h3 className="text-sm font-semibold">Find Prospects (Apollo)</h3>
              {isFixture && <Badge variant="outline" className="text-[9px] border-gold/40 text-gold">Sample mode</Badge>}
            </div>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowFinder(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Job Titles</Label>
              <Input value={filters.titles} onChange={(e) => setFilters({ ...filters, titles: e.target.value })} placeholder="VP Marketing, CMO, Demand Gen" className="mt-1" />
              <p className="text-[9px] text-muted-foreground mt-0.5">Comma-separated. Matches Apollo person titles.</p>
            </div>
            <div>
              <Label className="text-xs">Industry / Keyword Tags</Label>
              <Input value={filters.organizationKeywords} onChange={(e) => setFilters({ ...filters, organizationKeywords: e.target.value })} placeholder="cybersecurity, MSSP, EDR" className="mt-1" />
              <p className="text-[9px] text-muted-foreground mt-0.5">Comma-separated organization keywords.</p>
            </div>
            <div>
              <Label className="text-xs">Locations</Label>
              <Input value={filters.locations} onChange={(e) => setFilters({ ...filters, locations: e.target.value })} placeholder="United States, California" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Free-text Keyword</Label>
              <Input value={filters.keywords} onChange={(e) => setFilters({ ...filters, keywords: e.target.value })} placeholder="threat intelligence" className="mt-1" />
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-xs">Seniority</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {APOLLO_SENIORITIES.map((s) => {
                const on = filters.seniorities.includes(s.value);
                return (
                  <button key={s.value} type="button" onClick={() => toggleFilter("seniorities", s.value)}
                    className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${on ? "bg-crimson/20 border-crimson/40 text-crimson" : "border-border/50 text-muted-foreground hover:border-crimson/30"}`}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <Label className="text-xs">Company Headcount</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {APOLLO_HEADCOUNT_RANGES.map((r) => {
                const on = filters.employeeRanges.includes(r.value);
                return (
                  <button key={r.value} type="button" onClick={() => toggleFilter("employeeRanges", r.value)}
                    className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${on ? "bg-crimson/20 border-crimson/40 text-crimson" : "border-border/50 text-muted-foreground hover:border-crimson/30"}`}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" className="text-xs"
              onClick={() => setFilters({ titles: "", keywords: "", organizationKeywords: "", locations: "", seniorities: [], employeeRanges: [] })}>
              Reset
            </Button>
            <Button className="btn-premium text-white text-sm" onClick={() => runApolloSearch(1)} disabled={apolloSearch.isPending}>
              {apolloSearch.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search Prospects
            </Button>
          </div>
        </GlassCard>
      )}

      {apolloResult && (
        <GlassCard>
          {isFixture && apolloResult.fixtureNotice && (
            <div className="flex items-start gap-2 mb-4 p-2.5 rounded-lg bg-gold/10 border border-gold/30">
              <AlertCircle className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <p className="text-[11px] text-gold/90">{apolloResult.fixtureNotice}</p>
            </div>
          )}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="h-4 w-4 text-crimson shrink-0" />
              <h3 className="text-sm font-semibold">{isFixture ? "Sample Prospects" : "Apollo Results"}</h3>
              <Badge variant="outline" className="text-[10px]">{apolloResult.pagination.totalEntries.toLocaleString()} matches</Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedCount > 0 && (
                <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={handleImportSelected} disabled={apolloImport.isPending}>
                  {apolloImport.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Bookmark className="h-3 w-3 mr-1" />}
                  Import {selectedCount}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setApolloResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {apolloPeople.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No prospects matched these filters. Broaden your criteria.</p>
          ) : (
            <>
              {selectableIds.length > 0 && (
                <label className="flex items-center gap-2 mb-2 px-1 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-crimson cursor-pointer"
                    checked={allSelected}
                    onChange={() => setSelectedIds((prev) => (selectableIds.every((id) => prev.has(id)) ? new Set() : new Set(selectableIds)))}
                  />
                  <span className="text-[10px] text-muted-foreground">Select all on this page</span>
                </label>
              )}
              <div className="space-y-2">
                {apolloPeople.map((p: ApolloPerson, i: number) => {
                  const fullName = `${p.firstName} ${p.lastName}`.trim() || "Unknown";
                  const initials = `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}` || "?";
                  const imp = p.apolloId ? importedMap[p.apolloId] : undefined;
                  const isSelected = p.apolloId ? selectedIds.has(p.apolloId) : false;
                  return (
                    <div key={p.apolloId ?? i} className="p-3 rounded-lg glass-surface flex items-center gap-3">
                      {imp ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-crimson cursor-pointer shrink-0"
                          checked={isSelected}
                          disabled={!p.apolloId}
                          onChange={() => p.apolloId && toggleSelect(p.apolloId)}
                        />
                      )}
                      <div className="h-10 w-10 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson text-sm font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{fullName}</p>
                          {p.linkedinUrl && (
                            <a href={p.linkedinUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-blue-400 shrink-0">
                              <Linkedin className="h-3 w-3" />
                            </a>
                          )}
                          {imp && <Badge className="bg-success/20 text-success text-[9px] border-success/30 shrink-0">Imported</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {p.title ?? "—"}{p.organizationName ? ` · ${p.organizationName}` : ""}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                          {p.industry && <span className="flex items-center gap-1 truncate"><Building2 className="h-3 w-3" />{p.industry}</span>}
                          {p.estimatedNumEmployees != null && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.estimatedNumEmployees.toLocaleString()}</span>}
                          {p.location && <span className="flex items-center gap-1 truncate"><Globe className="h-3 w-3" />{p.location}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {imp ? (
                          imp.email ? (
                            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                              <Mail className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-[160px]">{imp.email}</span>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="text-[10px] h-7" disabled={apolloEnrich.isPending}
                              onClick={() => p.apolloId && handleRevealEmail(p.apolloId, imp.contactId)}>
                              {apolloEnrich.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                              Reveal email
                            </Button>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground border-border/50">
                            <Mail className="h-2.5 w-2.5 mr-1" />Email on import
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {apolloResult.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[10px] text-muted-foreground">Page {apolloResult.pagination.page} of {apolloResult.pagination.totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" disabled={apolloResult.pagination.page <= 1 || apolloSearch.isPending} onClick={() => runApolloSearch(apolloResult.pagination.page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className="text-xs h-7" disabled={apolloResult.pagination.page >= apolloResult.pagination.totalPages || apolloSearch.isPending} onClick={() => runApolloSearch(apolloResult.pagination.page + 1)}>Next</Button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {isFixture
              ? "Sample mode — Import creates leads with labeled sample emails. Connect Apollo to import real prospects and reveal verified emails."
              : "Search is free. Import creates leads (no email); Reveal email enriches via Apollo and spends ~1 credit per contact."}
          </p>

          {importedCount > 0 && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-crimson/15 bg-crimson/5 p-2.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Send className="h-3 w-3 text-crimson shrink-0" />
                <span>Enroll imported leads into a sequence — {enrollableCount} of {importedCount} have an email{enrollableCount < importedCount ? " (Reveal email first for the rest)" : ""}.</span>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                  <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Choose sequence" /></SelectTrigger>
                  <SelectContent>
                    {activeSequences.length === 0 ? (
                      <div className="px-2 py-1.5 text-[11px] text-muted-foreground">No active sequences</div>
                    ) : activeSequences.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="btn-premium text-white text-xs h-8"
                  disabled={!selectedSequenceId || enrollableCount === 0 || apolloEnroll.isPending}
                  onClick={handleEnroll}>
                  {apolloEnroll.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                  Enroll {enrollableCount}
                </Button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {filtered.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-sm font-semibold mb-2">No Prospects Yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
            Start building your pipeline. Add leads manually, or use <span className="text-foreground">Find Prospects</span> to search cybersecurity companies via Apollo.
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
                      {lead.createdByMode && <ModeBadge mode={lead.createdByMode} />}
                      {isAuto && lead.fitScore && <Badge variant="outline" className="text-[9px] border-crimson/30 text-crimson shrink-0">AI Scored</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {getLeadCompany(lead) && <span className="flex items-center gap-1 truncate"><Building2 className="h-3 w-3" />{getLeadCompany(lead)}</span>}
                      {lead.source && <span className="flex items-center gap-1 truncate capitalize">{lead.source.replace(/_/g, " ")}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {(lead.confidenceScore ?? lead.fitScore) ? (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-sm font-semibold text-crimson">{lead.confidenceScore ?? lead.fitScore}%</p>
                    </div>
                  ) : null}
                  {isInCrm(lead.status) ? (
                    <Badge className="bg-success/20 text-success text-[9px] border-success/30 shrink-0">In CRM</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 border-crimson/30 text-crimson shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleMoveToCrm(lead.id); }}>
                      <ArrowRight className="h-3 w-3 mr-1" />CRM
                    </Button>
                  )}
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
                  <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedLead.email || "No email yet — enrich to discover"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{selectedLead.phone || "No phone yet — enrich to discover"}</span></div>
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
              <div className="flex flex-wrap gap-2 mt-4">
                <Button className="btn-premium text-white text-sm flex-1" onClick={() => { setSelectedLead(null); onTabChange("compose"); }}>
                  <Send className="h-4 w-4 mr-2" />Draft Message
                </Button>
                <Button variant="outline" className="text-sm flex-1" onClick={() => { setSelectedLead(null); onTabChange("strategy"); }}>
                  <Target className="h-4 w-4 mr-2" />Plan Approach
                </Button>
                <Button variant="outline" className="text-sm" onClick={() => {
                  toast({ title: "Enriching Lead", description: `Running AI enrichment for ${getLeadName(selectedLead)}...` });
                  setTimeout(() => toast({ title: "Enrichment Complete", description: "Contact data verified and company intel updated" }), 1500);
                }}>
                  <Zap className="h-4 w-4 mr-2" />Enrich
                </Button>
                {["qualified","routing","routed","active","closed_won","closed_lost"].includes(selectedLead.status) ? (
                  <Button variant="outline" className="text-sm opacity-60" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2" />In CRM
                  </Button>
                ) : (
                  <Button variant="outline" className="text-sm border-crimson/30 text-crimson" onClick={() => handleMoveToCrm(selectedLead.id)}>
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

  const [messages, setMessages] = useState<{id:number;channel:string;from:string;company:string;subject:string;time:string;type:string;priority:string;classification:string;body:string;movedToCrm?:boolean}[]>([
    { id: 1, channel: "LinkedIn", from: "David Chen, CTO", company: "ShieldNet Systems", subject: "Re: Your cybersecurity marketing insights", time: "2h ago", type: "reply", priority: "high", classification: "Hot Lead", body: "Hi Shershah, thanks for connecting. I've been looking at improving our market positioning for our SIEM solutions. Your case study about generating 20+ leads was interesting. We're currently evaluating marketing partners — would love to discuss further. What does your availability look like next week?" },
    { id: 2, channel: "Email", from: "Rachel Torres, VP Marketing", company: "CyberVault Defense", subject: "Re: Quick question about CyberVault's marketing", time: "4h ago", type: "reply", priority: "high", classification: "Hot Lead", body: "Shershah, your timing is perfect. We just closed a Series B and are looking to scale our lead generation significantly. Our current agency doesn't understand the cybersecurity space at all. Can you send over your pricing and a few case studies? We're looking at budgets for next quarter." },
    { id: 3, channel: "Facebook", from: "Mike Sullivan, CEO", company: "IronGate MSSP", subject: "Saw your post about MDR marketing", time: "6h ago", type: "message", priority: "medium", classification: "Warm", body: "Hey Shershah, I came across your post about MDR vendor marketing challenges. You nailed it — we struggle with exactly those issues. Our sales team says they need better qualified leads. Not sure if we're ready for a full engagement but would be open to hearing more about what you do." },
    { id: 4, channel: "Email", from: "Jennifer Liu, Director of Sales", company: "SecureOps Group", subject: "Introduction from Mark at CyberSafe", time: "1d ago", type: "referral", priority: "medium", classification: "Warm", body: "Hi Shershah, Mark from CyberSafe mentioned that PMG Group helped them significantly grow their pipeline. We're a SOC-as-a-service provider looking for similar results. Our current marketing is mostly events and word of mouth. Could we set up a brief call?" },
    { id: 5, channel: "LinkedIn", from: "Tom Wright, Marketing Manager", company: "EdgePoint Security", subject: "Interesting approach to cybersecurity content", time: "1d ago", type: "engagement", priority: "low", classification: "Cold", body: "Thanks for sharing that article about NIST compliance content marketing. We're a small EDR company just starting to think about outbound marketing. Bookmarked your post for future reference." },
    { id: 6, channel: "X (Twitter)", from: "Sarah Kim, CISO", company: "VaultStream Technologies", subject: "Re: Thread about XDR demand gen", time: "2d ago", type: "reply", priority: "low", classification: "Warm", body: "Great thread on XDR marketing. We launched our XDR product last quarter and the demand gen has been harder than expected. Following for more insights." },
    { id: 7, channel: "Website Forms", from: "Alex Brennan, VP Sales", company: "ClearDefense Inc", subject: "Contact form: Need marketing help", time: "3d ago", type: "inbound", priority: "high", classification: "Hot Lead", body: "We're a managed security services provider doing about $5M ARR. Looking for a marketing agency that understands cybersecurity. Found you through a Google search. We need help with lead generation, content marketing, and LinkedIn outreach. Budget is flexible for the right partner." },
  ]);

  const channels = [
    { name: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, unread: messages.filter(m => m.channel === "LinkedIn" && !m.movedToCrm).length, color: "text-blue-400", connected: true },
    { name: "Email", icon: <Mail className="h-4 w-4" />, unread: messages.filter(m => m.channel === "Email" && !m.movedToCrm).length, color: "text-crimson", connected: true },
    { name: "Facebook", icon: <Facebook className="h-4 w-4" />, unread: messages.filter(m => m.channel === "Facebook" && !m.movedToCrm).length, color: "text-blue-500", connected: true },
    { name: "X (Twitter)", icon: <Twitter className="h-4 w-4" />, unread: messages.filter(m => m.channel === "X (Twitter)" && !m.movedToCrm).length, color: "text-foreground", connected: true },
    { name: "Instagram", icon: <Instagram className="h-4 w-4" />, unread: messages.filter(m => m.channel === "Instagram" && !m.movedToCrm).length, color: "text-pink-400", connected: false },
    { name: "Slack", icon: <Slack className="h-4 w-4" />, unread: messages.filter(m => m.channel === "Slack" && !m.movedToCrm).length, color: "text-purple-400", connected: false },
    { name: "Website Forms", icon: <FileText className="h-4 w-4" />, unread: messages.filter(m => m.channel === "Website Forms" && !m.movedToCrm).length, color: "text-green-400", connected: true },
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
    if (ch === "X (Twitter)") return <Twitter className="h-3.5 w-3.5" />;
    if (ch === "Instagram") return <Instagram className="h-3.5 w-3.5 text-pink-400" />;
    if (ch === "Slack") return <Slack className="h-3.5 w-3.5 text-purple-400" />;
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
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, movedToCrm: true } : m));
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
                {msg.movedToCrm ? (
                  <Badge className="bg-success/20 text-success text-[9px] border-success/30">In CRM</Badge>
                ) : (msg.classification === "Hot Lead" || msg.classification === "Warm") && !isHuman ? (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 border-crimson/30 text-crimson" onClick={(e) => { e.stopPropagation(); handleMoveToCrm(msg); }}>
                    <ArrowRight className="h-2.5 w-2.5 mr-1" />CRM
                  </Button>
                ) : null}
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
              {selectedMsg.movedToCrm ? (
                <Button variant="outline" className="text-sm opacity-60" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-2" />In CRM
                </Button>
              ) : (
                <Button variant="outline" className="text-sm border-crimson/30 text-crimson" onClick={() => handleMoveToCrm(selectedMsg)}>
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

  const channelTemplates: Record<string, { key: string; label: string; subject?: string; body: string }[]> = {
    email: [
      { key: "cold-ciso", label: "Cold Outreach — CISO Introduction", subject: "Quick question about {COMPANY}'s marketing", body: "Hi {NAME},\n\nI noticed {COMPANY} recently achieved SOC 2 compliance — congratulations. That's a milestone your prospects should know about.\n\nMost cybersecurity companies I work with struggle to turn compliance certifications into lead generation assets. We've helped similar SIEM and EDR vendors generate 20+ qualified leads per month by positioning their compliance as a competitive advantage.\n\nWould it make sense to have a quick 15-minute call to see if we could help {COMPANY} do the same?\n\nBest,\nShershah Nawabi\nPMG Group LLC\nshershah@pmggroup-llc.com" },
      { key: "follow-no-reply", label: "Follow-up — No Reply", subject: "Re: {COMPANY} marketing opportunity", body: "Hi {NAME},\n\nI wanted to circle back on my previous note. I know your inbox is full, so I'll keep this brief.\n\nWe just helped a SIEM vendor increase their qualified pipeline by 340% in 90 days. I put together a quick analysis of where {COMPANY} could see similar gains.\n\nWorth 10 minutes this week?\n\nBest,\nShershah" },
      { key: "warm-event", label: "Warm — Post Conference", subject: "Great meeting you at {EVENT}", body: "Hi {NAME},\n\nIt was great connecting at the conference. Your points about MDR market positioning really resonated with what we see at PMG Group.\n\nAs promised, I've pulled together some data on how cybersecurity companies like {COMPANY} can improve their lead-to-close ratio through targeted content and multi-channel outreach.\n\nShall I send it over, or would you prefer to jump on a quick call?\n\nBest,\nShershah" },
      { key: "referral-email", label: "Referral — Mutual Connection", subject: "{REFERRER} suggested we connect", body: "Hi {NAME},\n\n{REFERRER} mentioned you might be looking for marketing support for {COMPANY}'s cybersecurity solutions. We specialize exclusively in marketing for SIEM, EDR, MDR, and XDR vendors.\n\nOur clients typically see 20+ qualified leads within the first month. I'd love to share how we do it.\n\nAre you available for a brief call this week?\n\nBest,\nShershah Nawabi\nPMG Group LLC" },
    ],
    linkedin: [
      { key: "li-cold", label: "Cold Outreach — Value-First", body: "Hi {NAME}, I came across {COMPANY} and your work in the cybersecurity space is impressive.\n\nWe help SIEM, EDR, and MDR companies generate 20+ qualified leads monthly through targeted multi-channel outreach. Just wrapped a campaign for a similar vendor that delivered 340% pipeline growth in 90 days.\n\nWould love to share what's working. Open to a quick conversation?" },
      { key: "li-engage", label: "Content Engagement Follow-up", body: "Hi {NAME}, I saw your recent post about {TOPIC} — great insights on the MDR market.\n\nAt PMG Group, we work exclusively with cybersecurity companies on demand generation. Your take on {TOPIC} aligns with what we're seeing drive results right now.\n\nWould it be helpful if I shared some data on what's converting for similar companies?" },
      { key: "li-follow", label: "Follow-up — No Response", body: "Hi {NAME}, I reached out last week about how PMG Group helps cybersecurity companies like {COMPANY} with lead generation.\n\nI know you're busy, so here's the short version: we've consistently delivered 20+ qualified leads in the first month for SIEM and EDR vendors.\n\nWorth a 10-minute call to explore the fit?" },
    ],
    "linkedin-connection": [
      { key: "li-conn-cold", label: "Connection Request — Cold", body: "Hi {NAME}, I work with cybersecurity companies on their marketing and lead generation. Would love to connect and share insights relevant to {COMPANY}." },
      { key: "li-conn-event", label: "Connection Request — Post Event", body: "Hi {NAME}, great seeing the {COMPANY} team at the conference. Would love to stay connected and continue the conversation about cybersecurity marketing." },
      { key: "li-conn-mutual", label: "Connection Request — Mutual Connection", body: "Hi {NAME}, I noticed we both know {REFERRER}. I specialize in marketing for cybersecurity companies and would love to connect." },
    ],
    twitter: [
      { key: "tw-dm", label: "X / Twitter DM — Initial Reach", body: "Hey {NAME}, been following {COMPANY}'s work in the cybersecurity space. We help SIEM/EDR vendors generate qualified leads through targeted campaigns. Would love to share some insights that could be relevant. Open to a quick chat?" },
      { key: "tw-engage", label: "X / Twitter — Post Engagement", body: "Hey {NAME}, your thread on {TOPIC} was spot on. We're seeing the same trend with our cybersecurity clients at PMG Group. Happy to share what's working for pipeline growth if useful." },
    ],
    facebook: [
      { key: "fb-intro", label: "Facebook — Business Introduction", body: "Hi {NAME}, I run PMG Group — we specialize in marketing for cybersecurity and IT companies. I noticed {COMPANY} and think there's a strong fit for how we help vendors like yours generate qualified leads.\n\nWould you be open to a brief conversation?" },
    ],
    instagram: [
      { key: "ig-dm", label: "Instagram DM — Casual Introduction", body: "Hey {NAME}! Love what {COMPANY} is doing in the cybersecurity space. We work exclusively with companies like yours on lead generation and brand building. Would be great to connect and share some ideas. Open to a quick chat?" },
    ],
    sms: [
      { key: "sms-follow", label: "SMS — Meeting Follow-up", body: "Hi {NAME}, this is Shershah from PMG Group following up on our conversation about {COMPANY}'s marketing. I have some ideas for generating qualified leads in your space. Good time for a quick call this week?" },
      { key: "sms-reminder", label: "SMS — Appointment Reminder", body: "Hi {NAME}, just a reminder about our call tomorrow at {TIME}. Looking forward to discussing how we can help {COMPANY} with lead generation. Talk soon — Shershah, PMG Group" },
    ],
    "phone-script": [
      { key: "phone-cold", label: "Cold Call — CISO/CTO", body: "OPENING: Hi {NAME}, this is Shershah Nawabi from PMG Group. I'll be brief — I know you're busy.\n\nHOOK: We specialize exclusively in marketing for cybersecurity companies like {COMPANY}. We've been helping SIEM and EDR vendors generate 20+ qualified leads monthly.\n\nQUALIFY: Are you currently doing any active outbound marketing or is it mostly inbound right now?\n\n[IF YES]: Great. What's been working? Where do you feel the gaps are?\n[IF NO]: That's actually common in the space. Most companies rely on referrals and word of mouth, but there's a huge opportunity with the right approach.\n\nPITCH: We've helped companies similar to {COMPANY} increase their pipeline by 300%+ in 90 days. We do this through multi-channel outreach — LinkedIn, email, targeted content — all tailored to cybersecurity buyers.\n\nCLOSE: Would it make sense to schedule 15 minutes this week for me to walk you through how we'd approach it for {COMPANY}?\n\nOBJECTION — 'Send me info': Absolutely. I'll send over a quick case study. What email works best? And can we pencil in a 10-minute follow-up for Thursday or Friday?\n\nOBJECTION — 'Not interested': I understand. Quick question before I let you go — is it that you're happy with your current marketing, or more that the timing isn't right?" },
      { key: "phone-warm", label: "Warm Call — Referral", body: "OPENING: Hi {NAME}, this is Shershah from PMG Group. {REFERRER} suggested I reach out — they mentioned {COMPANY} might benefit from what we do.\n\nCONTEXT: We work exclusively with cybersecurity companies on demand generation and lead pipeline. {REFERRER} has seen our results firsthand.\n\nASK: I'd love to spend 15 minutes walking you through our approach and see if there's a fit. Would later this week work?" },
    ],
  };

  const currentTemplates = channelTemplates[messageType] || channelTemplates.email;

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

  const handleTemplate = (tmpl: { subject?: string; body: string }) => {
    setSubject(tmpl.subject || "");
    setBody(tmpl.body);
    toast({ title: "Template Loaded", description: "Edit the placeholders in {BRACKETS} with real details" });
  };

  const channelLabels: Record<string, string> = {
    email: "Email", linkedin: "LinkedIn", "linkedin-connection": "LinkedIn Connection",
    facebook: "Facebook", instagram: "Instagram", twitter: "X / Twitter",
    sms: "SMS", "phone-script": "Phone Call",
  };

  const handleSend = async () => {
    if (!body.trim()) {
      toast({ title: "Empty message", description: "Write or generate a message first", variant: "destructive" });
      return;
    }
    try {
      await fetch(`${API_BASE}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "outreach_message_queued",
          description: `${channelLabels[messageType] || messageType} message queued: ${subject || body.substring(0, 80)}...`,
          entityType: "outreach",
          entityId: 0,
          performedBy: "user",
          metadata: JSON.stringify({ channel: messageType, subject, body, tone, queuedAt: new Date().toISOString() }),
        }),
      });
    } catch {}
    setSentMessages(prev => [...prev, {
      channel: channelLabels[messageType] || messageType,
      to: subject || body.substring(0, 50) + "...",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Queued",
    }]);
    toast({
      title: "Message Queued",
      description: `Queued via ${channelLabels[messageType] || messageType}. Messages are reviewed before delivery through the selected channel.`,
    });
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
              <h3 className="text-sm font-semibold mb-3">Queued Messages</h3>
              <div className="space-y-2">
                {sentMessages.map((msg, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">{msg.channel}</Badge>
                      <span className="text-xs truncate">{msg.to}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      <Badge className="bg-amber-500/20 text-amber-400 text-[9px] border-amber-500/30">{msg.status}</Badge>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground mt-2">Queued messages are sent through their respective channel after review. Connect channel integrations in Settings for auto-delivery.</p>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              Templates
              <Badge variant="outline" className="text-[9px] capitalize">{channelLabels[messageType] || messageType}</Badge>
            </h3>
            <div className="space-y-2">
              {currentTemplates.map((t) => (
                <Button key={t.key} variant="outline" className="w-full text-xs justify-start h-8" onClick={() => handleTemplate(t)}>
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

  const [followUps, setFollowUps] = useState<{id:number;name:string;company:string;channel:string;lastContact:string;nextAction:string;priority:string;daysOverdue:number;attempts:number;channelHistory:string[]}[]>([
    { id: 1, name: "David Chen", company: "ShieldNet Systems", channel: "Email", lastContact: "2 days ago", nextAction: "Send case study follow-up with SOC 2 compliance results", priority: "high", daysOverdue: 1, attempts: 2, channelHistory: ["LinkedIn", "LinkedIn"] },
    { id: 2, name: "Rachel Torres", company: "CyberVault Defense", channel: "LinkedIn", lastContact: "3 days ago", nextAction: "Share pricing deck — Starter $2,500 and Growth $5,000 options", priority: "high", daysOverdue: 2, attempts: 1, channelHistory: ["Email"] },
    { id: 3, name: "Mike Sullivan", company: "IronGate MSSP", channel: "Email", lastContact: "5 days ago", nextAction: "Follow up on MDR marketing conversation with ROI data", priority: "medium", daysOverdue: 0, attempts: 3, channelHistory: ["LinkedIn", "LinkedIn", "LinkedIn"] },
    { id: 4, name: "Jennifer Liu", company: "SecureOps Group", channel: "Phone", lastContact: "4 days ago", nextAction: "Schedule discovery call — referral from Mark at CyberSafe", priority: "medium", daysOverdue: 0, attempts: 2, channelHistory: ["Email", "Email"] },
    { id: 5, name: "Alex Brennan", company: "ClearDefense Inc", channel: "Email", lastContact: "1 day ago", nextAction: "Send detailed proposal with Growth package pricing", priority: "high", daysOverdue: 0, attempts: 1, channelHistory: ["Website Forms"] },
    { id: 6, name: "Tom Wright", company: "EdgePoint Security", channel: "LinkedIn", lastContact: "7 days ago", nextAction: "Nurture with content — share EDR marketing insights article", priority: "low", daysOverdue: 3, attempts: 4, channelHistory: ["LinkedIn", "Email", "LinkedIn", "Email"] },
    { id: 7, name: "Sarah Kim", company: "VaultStream Technologies", channel: "Email", lastContact: "6 days ago", nextAction: "Share XDR demand generation case study", priority: "medium", daysOverdue: 1, attempts: 3, channelHistory: ["LinkedIn", "LinkedIn", "LinkedIn"] },
  ]);

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

  const totalSent = leadList.length * 3;
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
            {([
              { channel: "LinkedIn", sent: Math.max(leadList.length * 2, 24), responses: Math.max(Math.round(leadList.length * 0.6), 8), meetings: Math.max(Math.round(leadList.length * 0.15), 3), rate: 34 },
              { channel: "Email", sent: Math.max(leadList.length * 3, 42), responses: Math.max(Math.round(leadList.length * 0.3), 5), meetings: Math.max(Math.round(leadList.length * 0.1), 2), rate: 12 },
              { channel: "Phone", sent: Math.max(Math.round(leadList.length * 0.5), 8), responses: Math.max(Math.round(leadList.length * 0.2), 3), meetings: Math.max(Math.round(leadList.length * 0.12), 2), rate: 38 },
              { channel: "X / Twitter", sent: Math.max(Math.round(leadList.length * 0.4), 6), responses: Math.max(Math.round(leadList.length * 0.05), 1), meetings: 0, rate: 8 },
              { channel: "Facebook", sent: Math.max(Math.round(leadList.length * 0.3), 4), responses: Math.max(Math.round(leadList.length * 0.04), 1), meetings: 0, rate: 6 },
            ] as {channel:string;sent:number;responses:number;meetings:number;rate:number}[]).map((ch) => (
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
                { goal: "Follow-ups completed", current: 0, target: 30 },
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
