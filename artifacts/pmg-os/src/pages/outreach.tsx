import { useState, useCallback, type ReactNode } from "react";
import { useListLeads, useListCompanies, useListOutreachSequences, useListCommunications, useListTasks, useCreateOutreachSequence, getListOutreachSequencesQueryKey } from "@workspace/api-client-react";
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
import { useApolloSearch, useApolloStatus, useApolloImport, useApolloEnrich, useApolloEnroll, useIntegrationStatus, type ApolloPerson, type ApolloSearchResult } from "@/hooks/use-api";

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
  ThumbsUp, ThumbsDown, Bookmark, ExternalLink, Copy, SkipForward, Trash2, ListPlus
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
  // apolloId → result of import (so rows can show imported / reveal / enroll state)
  const [importedMap, setImportedMap] = useState<Record<string, { contactId: number; leadId: number; email: string | null; phone: string | null; contactStatus: string }>>({});
  // Opt-in: also capture a phone number when revealing (Apollo returns already-known
  // numbers synchronously; freshly-revealed mobiles are webhook-only).
  const [revealPhone, setRevealPhone] = useState(false);
  // Track which single contact / batch is revealing so only the clicked row spins
  // (apolloEnrich.isPending is shared across every row otherwise).
  const [revealingId, setRevealingId] = useState<number | null>(null);
  const [revealingAll, setRevealingAll] = useState(false);
  const [enrichingLead, setEnrichingLead] = useState(false);
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

  // --- Pipeline prospect delete (single + bulk, with confirmation) ---
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- Create a new outreach sequence (so the enroll dropdown is never a dead end) ---
  const createSequence = useCreateOutreachSequence();
  const [showNewSequence, setShowNewSequence] = useState(false);
  const [newSequence, setNewSequence] = useState({ name: "", channel: "email" });
  const [sequenceSteps, setSequenceSteps] = useState<Array<{ subject: string; body: string; delayDays: number }>>([
    { subject: "", body: "", delayDays: 0 },
  ]);

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

  // Prospect funnel filters keyed off real, reachable data — not the lead's
  // transient `status`. A lead only passes through status "enriched" for a moment
  // before the AI pipeline advances it to "scored", and Apollo's "Reveal email"
  // updates the *contact* (contactEmail), never the lead status. So bucket by what
  // the user can actually see: revealed email = enriched, fit score = scored.
  const hasEmail = (l: any) => !!(l.contactEmail && String(l.contactEmail).trim());
  const hasScore = (l: any) => l.fitScore != null || l.confidenceScore != null;
  const matchesStatus = (l: any) => {
    switch (statusFilter) {
      case "all": return !isInCrm(l.status);
      case "in_crm": return isInCrm(l.status);
      case "enriched": return !isInCrm(l.status) && hasEmail(l);
      case "scored": return !isInCrm(l.status) && hasScore(l);
      case "new": return !isInCrm(l.status) && !hasEmail(l) && !hasScore(l);
      default: return l.status === statusFilter;
    }
  };
  const filtered = leadList.filter((l: any) => {
    const matchesSearch = !searchQuery ||
      `${getLeadName(l)} ${getLeadCompany(l)}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && matchesStatus(l);
  });

  const filteredIds = filtered.map((l: any) => l.id as number);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedLeadIds.has(id));
  const toggleLeadSelect = useCallback((id: number) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

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
            if (row.apolloId) next[row.apolloId] = { contactId: row.contactId, leadId: row.leadId, email: row.email, phone: null, contactStatus: row.contactStatus };
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

  const handleReveal = useCallback((apolloId: string, contactId: number) => {
    setRevealingId(contactId);
    apolloEnrich.mutate({ contactIds: [contactId], revealPhone }, {
      onSettled: () => setRevealingId(null),
      onSuccess: (data) => {
        const row = data.enriched.find((e) => e.contactId === contactId);
        setImportedMap((prev) => ({
          ...prev,
          [apolloId]: { ...prev[apolloId], contactId, email: row?.email ?? null, phone: row?.phone ?? prev[apolloId]?.phone ?? null, contactStatus: row?.contactStatus ?? "missing_contact" },
        }));
        toast(
          row?.email
            ? { title: data.mode === "fixture" ? "Sample contact filled" : "Contact revealed", description: [row.email, row.phone].filter(Boolean).join(" · ") }
            : {
                title: "No email found",
                description: revealPhone && row?.phone
                  ? `Apollo returned a phone (${row.phone}) but no email for this contact.`
                  : "Apollo could not reveal an email for this contact.",
                variant: "destructive",
              },
        );
        if (data.phoneRevealAsync && data.phoneRevealsRequested > 0) {
          toast({ title: "Mobile reveal requested", description: "Apollo verifies the number and delivers it to your webhook in a few minutes — refresh to see it land." });
        }
      },
      onError: (err: any) => {
        toast({ title: "Enrich failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  }, [apolloEnrich, revealPhone, toast]);

  // Batch reveal every imported-but-unrevealed contact in one call, so a fully
  // locked batch surfaces one honest "0 emails available" message.
  const handleRevealAll = useCallback(() => {
    const targets = Object.entries(importedMap).filter(([, v]) => !v.email);
    const contactIds = targets.map(([, v]) => v.contactId);
    if (contactIds.length === 0) return;
    setRevealingAll(true);
    apolloEnrich.mutate({ contactIds, revealPhone }, {
      onSettled: () => setRevealingAll(false),
      onSuccess: (data) => {
        setImportedMap((prev) => {
          const next = { ...prev };
          for (const row of data.enriched) {
            const key = Object.keys(next).find((k) => next[k].contactId === row.contactId);
            if (key) next[key] = { ...next[key], email: row.email, phone: row.phone ?? next[key].phone ?? null, contactStatus: row.contactStatus };
          }
          return next;
        });
        const phones = data.phonesRevealed ? ` · ${data.phonesRevealed} phone${data.phonesRevealed === 1 ? "" : "s"}` : "";
        toast(
          data.emailsRevealed > 0
            ? { title: data.mode === "fixture" ? "Sample contacts filled" : "Contacts revealed", description: `${data.emailsRevealed} email${data.emailsRevealed === 1 ? "" : "s"}${phones} of ${data.enriched.length}.` }
            : { title: "No emails available", description: `Apollo could not reveal an email for any of these ${data.enriched.length} contact${data.enriched.length === 1 ? "" : "s"}.`, variant: "destructive" },
        );
        if (data.phoneRevealAsync && data.phoneRevealsRequested > 0) {
          toast({ title: "Mobile reveal requested", description: `${data.phoneRevealsRequested} number${data.phoneRevealsRequested === 1 ? "" : "s"} arriving via webhook in a few minutes — refresh to see them.` });
        }
      },
      onError: (err: any) => {
        toast({ title: "Reveal failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  }, [importedMap, revealPhone, apolloEnrich, toast]);

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

  // Real enrichment for a pipeline lead's linked contact (Apollo bulk_match).
  // Replaces the old setTimeout fake-success. Updates the open dialog in place.
  const handleEnrichLead = useCallback((lead: any) => {
    if (!lead?.contactId) {
      toast({ title: "No contact to enrich", description: "This lead has no linked contact record to enrich.", variant: "destructive" });
      return;
    }
    setEnrichingLead(true);
    apolloEnrich.mutate({ contactIds: [lead.contactId], revealPhone: true }, {
      onSettled: () => setEnrichingLead(false),
      onSuccess: (data) => {
        const row = data.enriched.find((e) => e.contactId === lead.contactId);
        setSelectedLead((prev: any) =>
          prev && prev.id === lead.id
            ? { ...prev, contactEmail: row?.email ?? prev.contactEmail, contactPhone: row?.phone ?? prev.contactPhone }
            : prev,
        );
        toast(
          row?.email
            ? { title: data.mode === "fixture" ? "Sample contact filled" : "Contact enriched", description: [row.email, row.phone].filter(Boolean).join(" · ") }
            : { title: "No contact found", description: "Apollo could not reveal a verified email for this lead.", variant: "destructive" },
        );
      },
      onError: (err: any) => {
        toast({ title: "Enrich failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  }, [apolloEnrich, toast]);

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

  // Delete one or more prospects. Opportunities keep a null leadId (FK is
  // onDelete:set null) and enrollments have no FK, so the row deletes cleanly.
  const handleDeleteLeads = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`${API_BASE}/leads/${id}`, { method: "DELETE", credentials: "include" })),
      );
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      const ok = ids.length - failed;
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.refetchQueries({ queryKey: ["/api/leads"] });
      setSelectedLeadIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setConfirmDeleteIds(null);
      setSelectedLead(null);
      if (failed > 0) {
        toast({
          title: ok > 0 ? "Partially deleted" : "Delete failed",
          description: `${ok} deleted, ${failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Prospect deleted", description: `${ok} prospect${ok === 1 ? "" : "s"} removed.` });
      }
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Request failed", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }, [queryClient, toast]);

  const addSequenceStep = useCallback(() => {
    setSequenceSteps((s) => [...s, { subject: "", body: "", delayDays: s.length === 0 ? 0 : 3 }]);
  }, []);
  const removeSequenceStep = useCallback((idx: number) => {
    setSequenceSteps((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== idx)));
  }, []);
  const updateSequenceStep = useCallback((idx: number, patch: Partial<{ subject: string; body: string; delayDays: number }>) => {
    setSequenceSteps((s) => s.map((step, i) => (i === idx ? { ...step, ...patch } : step)));
  }, []);

  // Create an ACTIVE sequence with ≥1 step so it's immediately enrollable
  // (enrollContact rejects draft sequences and sequences with no steps).
  const handleCreateSequence = useCallback(() => {
    const name = newSequence.name.trim();
    if (!name) {
      toast({ title: "Name required", description: "Give the sequence a name.", variant: "destructive" });
      return;
    }
    const steps = sequenceSteps
      .filter((s) => s.body.trim())
      .map((s) => ({
        type: newSequence.channel,
        channel: newSequence.channel,
        subject: s.subject.trim() || undefined,
        body: s.body.trim(),
        delayDays: Number.isFinite(s.delayDays) ? Math.max(0, Math.trunc(s.delayDays)) : 0,
      }));
    if (steps.length === 0) {
      toast({ title: "Add a step", description: "A sequence needs at least one message with body text.", variant: "destructive" });
      return;
    }
    createSequence.mutate(
      {
        data: {
          name,
          type: "outbound",
          channel: newSequence.channel,
          status: "active",
          steps: steps as any,
          safetyControls: { stopOnReply: true } as any,
        },
      },
      {
        onSuccess: (created: any) => {
          queryClient.invalidateQueries({ queryKey: getListOutreachSequencesQueryKey() });
          if (created?.id != null) setSelectedSequenceId(String(created.id));
          setShowNewSequence(false);
          setNewSequence({ name: "", channel: "email" });
          setSequenceSteps([{ subject: "", body: "", delayDays: 0 }]);
          toast({ title: "Sequence created", description: `"${name}" is active — select it and enroll leads.` });
        },
        onError: (err: any) => {
          toast({ title: "Could not create sequence", description: err?.message || "Request failed", variant: "destructive" });
        },
      },
    );
  }, [newSequence, sequenceSteps, createSequence, queryClient, toast]);

  const apolloPeople = apolloResult?.people ?? [];
  const isFixture = apolloResult?.mode === "fixture" || apolloStatus?.mode === "fixture";
  const selectableIds = apolloPeople.map((p) => p.apolloId).filter((id): id is string => !!id && !importedMap[id]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const importedCount = Object.keys(importedMap).length;
  const enrollableCount = Object.values(importedMap).filter((v) => v.email && v.leadId).length;
  const unrevealedCount = Object.values(importedMap).filter((v) => !v.email).length;

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
                          <div className="flex flex-col items-end gap-1">
                            {imp.email && (
                              <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                <Mail className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate max-w-[160px]">{imp.email}</span>
                              </div>
                            )}
                            {imp.phone && (
                              <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                <Phone className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate max-w-[160px]">{imp.phone}</span>
                              </div>
                            )}
                            {!imp.email && (
                              <Button size="sm" variant="outline" className="text-[10px] h-7" disabled={revealingId === imp.contactId || revealingAll}
                                onClick={() => p.apolloId && handleReveal(p.apolloId, imp.contactId)}>
                                {revealingId === imp.contactId ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                                Reveal {revealPhone ? "contact" : "email"}
                              </Button>
                            )}
                          </div>
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
              ? "Sample mode — Import creates leads with labeled sample data. Connect Apollo to import real prospects and reveal verified emails."
              : "Search is free. Import creates leads (no email); Reveal enriches via Apollo and spends ~1 credit per email."}
          </p>

          <label className="text-[10px] text-muted-foreground mt-1.5 flex items-start gap-1.5 cursor-pointer">
            <input type="checkbox" className="h-3 w-3 mt-0.5 accent-crimson cursor-pointer shrink-0" checked={revealPhone} onChange={(e) => setRevealPhone(e.target.checked)} />
            <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />
              {apolloStatus?.phoneRevealEnabled
                ? "Also reveal mobile numbers — Apollo verifies them asynchronously (~8 credits each) and delivers them to your webhook in a few minutes; refresh to see them land."
                : "Also capture phone — returns numbers Apollo already has (no async reveal). Set APOLLO_WEBHOOK_URL to a public endpoint to unlock live mobile reveal."}
            </span>
          </label>

          {apolloStatus?.mode === "live" && (
            <p className="text-[10px] mt-1.5 flex items-center gap-1">
              <Zap className="h-3 w-3 shrink-0 text-gold" />
              <span className={apolloStatus.creditsRemaining <= 0 ? "text-crimson" : "text-muted-foreground"}>
                Apollo credits this month: {apolloStatus.creditsThisMonth.toLocaleString()} / {apolloStatus.monthlyCap.toLocaleString()} ({apolloStatus.creditsRemaining.toLocaleString()} left)
                {apolloStatus.creditsRemaining <= 0 ? " — cap reached, enrichment paused until next month" : ""}
              </span>
            </p>
          )}

          {importedCount > 0 && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-crimson/15 bg-crimson/5 p-2.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Send className="h-3 w-3 text-crimson shrink-0" />
                <span>Enroll imported leads into a sequence — {enrollableCount} of {importedCount} have an email{enrollableCount < importedCount ? " (Reveal the rest first)" : ""}.</span>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                {unrevealedCount > 0 && (
                  <Button size="sm" variant="outline" className="text-xs h-8" disabled={revealingAll || revealingId !== null}
                    onClick={handleRevealAll}>
                    {revealingAll ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                    Reveal all {unrevealedCount}
                  </Button>
                )}
                {activeSequences.length === 0 ? (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNewSequence(true)}>
                    <ListPlus className="h-3 w-3 mr-1" />Create a sequence
                  </Button>
                ) : (
                  <>
                    <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                      <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Choose sequence" /></SelectTrigger>
                      <SelectContent>
                        {activeSequences.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setShowNewSequence(true)} title="Create a new sequence">
                      <ListPlus className="h-3 w-3" />
                    </Button>
                  </>
                )}
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
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-crimson cursor-pointer"
                checked={allFilteredSelected}
                onChange={() => setSelectedLeadIds((prev) => (filteredIds.every((id) => prev.has(id)) ? new Set() : new Set(filteredIds)))}
              />
              <span className="text-[10px] text-muted-foreground">
                {selectedLeadIds.size > 0 ? `${selectedLeadIds.size} selected` : "Select all"}
              </span>
            </label>
            {selectedLeadIds.size > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-crimson/40 text-crimson"
                onClick={() => setConfirmDeleteIds([...selectedLeadIds])}>
                <Trash2 className="h-3 w-3 mr-1" />Delete {selectedLeadIds.size}
              </Button>
            )}
          </div>
          {filtered.map((lead: any) => (
            <motion.div key={lead.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-lg p-4 cursor-pointer hover:glass-card-interactive transition-all"
              onClick={() => setSelectedLead(lead)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-crimson cursor-pointer shrink-0"
                    checked={selectedLeadIds.has(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleLeadSelect(lead.id)}
                  />
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
            <DialogContent className="glass-panel border-border/50 max-w-3xl">
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
                  <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedLead.contactEmail || "No email yet — enrich to discover"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{selectedLead.contactPhone || "No phone yet — enrich to discover"}</span></div>
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
                <Button variant="outline" className="text-sm" disabled={enrichingLead || !selectedLead.contactId}
                  title={selectedLead.contactId ? undefined : "No linked contact to enrich"}
                  onClick={() => handleEnrichLead(selectedLead)}>
                  {enrichingLead ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Enrich
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
                <Button variant="outline" className="text-sm border-destructive/40 text-destructive"
                  onClick={() => setConfirmDeleteIds([selectedLead.id])}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      <Dialog open={confirmDeleteIds !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteIds(null); }}>
        <DialogContent className="glass-panel border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {confirmDeleteIds?.length ?? 0} prospect{(confirmDeleteIds?.length ?? 0) === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              This permanently removes the lead{(confirmDeleteIds?.length ?? 0) === 1 ? "" : "s"} from your pipeline. Any linked CRM deal is kept but unlinked. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteIds(null)} disabled={deleting}>Cancel</Button>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={deleting}
              onClick={() => confirmDeleteIds && handleDeleteLeads(confirmDeleteIds)}>
              {deleting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewSequence} onOpenChange={setShowNewSequence}>
        <DialogContent className="glass-panel border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ListPlus className="h-5 w-5 text-crimson" />New Outreach Sequence</DialogTitle>
            <DialogDescription>
              A sequence is an automated series of messages your enrolled prospects move through — e.g. an intro email now, a follow-up in 3 days, another in 7. Sends are still gated by your AI mode (drafts wait for approval in Hybrid/Human).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Sequence Name</Label>
                <Input value={newSequence.name} onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })} placeholder="Cybersecurity CISO outbound" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={newSequence.channel} onValueChange={(v) => setNewSequence({ ...newSequence, channel: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">Steps</Label>
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={addSequenceStep}>
                  <Plus className="h-3 w-3 mr-1" />Add step
                </Button>
              </div>
              <div className="space-y-2">
                {sequenceSteps.map((step, i) => (
                  <div key={i} className="p-2.5 rounded-lg glass-surface space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">Step {i + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Wait</span>
                        <Input type="number" min={0} value={step.delayDays}
                          onChange={(e) => updateSequenceStep(i, { delayDays: Number(e.target.value) })}
                          className="h-7 w-16 text-xs" />
                        <span className="text-[10px] text-muted-foreground">day(s)</span>
                        {sequenceSteps.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => removeSequenceStep(i)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {newSequence.channel === "email" && (
                      <Input value={step.subject} onChange={(e) => updateSequenceStep(i, { subject: e.target.value })} placeholder="Subject line" className="h-8 text-xs" />
                    )}
                    <Textarea value={step.body} onChange={(e) => updateSequenceStep(i, { body: e.target.value })}
                      placeholder={`Message body for step ${i + 1}...`} className="min-h-[70px] text-xs" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">The first step's delay is the wait before the first message goes out. Created as an <span className="text-foreground">active</span> sequence so you can enroll immediately.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowNewSequence(false)} disabled={createSequence.isPending}>Cancel</Button>
            <Button className="btn-premium text-white" onClick={handleCreateSequence} disabled={createSequence.isPending || !newSequence.name.trim()}>
              {createSequence.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ListPlus className="h-4 w-4 mr-2" />}
              Create sequence
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Channel definitions for the unified inbox. `connected` is derived from real
// integrations (never hardcoded); `types` maps a channel to communication.type
// values so per-channel counts reflect real data.
const SOCIAL_CHANNELS: { name: string; icon: ReactNode; color: string; match: RegExp; types: string[] }[] = [
  { name: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, color: "text-blue-400", match: /linkedin/i, types: ["linkedin"] },
  { name: "Email", icon: <Mail className="h-4 w-4" />, color: "text-crimson", match: /mail|smtp|gmail|outlook|sendgrid|imap/i, types: ["email"] },
  { name: "Facebook", icon: <Facebook className="h-4 w-4" />, color: "text-blue-500", match: /facebook|meta/i, types: ["facebook"] },
  { name: "X (Twitter)", icon: <Twitter className="h-4 w-4" />, color: "text-foreground", match: /twitter|(^|[^a-z])x([^a-z]|$)/i, types: ["twitter", "x"] },
  { name: "Instagram", icon: <Instagram className="h-4 w-4" />, color: "text-pink-400", match: /instagram/i, types: ["instagram"] },
  { name: "Slack", icon: <Slack className="h-4 w-4" />, color: "text-purple-400", match: /slack/i, types: ["slack"] },
  { name: "Website Forms", icon: <FileText className="h-4 w-4" />, color: "text-green-400", match: /webhook|form|website|landing/i, types: ["form", "web", "website", "webhook"] },
];

function socialChannelIcon(type: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("linkedin")) return <Linkedin className="h-3.5 w-3.5 text-blue-400" />;
  if (t.includes("email") || t.includes("mail")) return <Mail className="h-3.5 w-3.5 text-crimson" />;
  if (t.includes("facebook")) return <Facebook className="h-3.5 w-3.5 text-blue-500" />;
  if (t === "x" || t.includes("twitter")) return <Twitter className="h-3.5 w-3.5" />;
  if (t.includes("instagram")) return <Instagram className="h-3.5 w-3.5 text-pink-400" />;
  if (t.includes("slack")) return <Slack className="h-3.5 w-3.5 text-purple-400" />;
  if (t.includes("form") || t.includes("web")) return <FileText className="h-3.5 w-3.5 text-green-400" />;
  if (t.includes("call") || t.includes("phone")) return <Phone className="h-3.5 w-3.5 text-gold" />;
  return <MessageSquare className="h-3.5 w-3.5" />;
}

function relTime(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms)) return "";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function SocialCommand({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { isHuman, isAuto, currentMode } = useAiModeContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: comms } = useListCommunications();
  const { data: integrations } = useIntegrationStatus();
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [movedIds, setMovedIds] = useState<Set<number>>(new Set());

  const commList = (comms ?? []) as any[];
  // The unified inbox is inbound communications (replies, form fills, messages).
  const inbound = commList.filter((c) => String(c.direction ?? "").toLowerCase() === "inbound");
  const integrationList: any[] = Array.isArray(integrations) ? integrations : [];
  const providerActive = (re: RegExp) =>
    integrationList.some((i: any) => re.test(String(i.provider ?? i.name ?? "")) && i.isActive);

  const channels = SOCIAL_CHANNELS.map((ch) => ({
    ...ch,
    connected: providerActive(ch.match),
    unread: inbound.filter((c) => ch.types.includes(String(c.type ?? "").toLowerCase())).length,
  }));

  const senderName = (m: any) => m.contactName || m.companyName || m.performedBy || "Unknown sender";

  const handleReply = async (msg: any) => {
    const text = (replyDraft || "").trim();
    if (!text) {
      toast({ title: "Empty reply", description: "Write a reply first.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: msg.type || "email",
          direction: "outbound",
          subject: msg.subject ? `Re: ${msg.subject}` : "Reply",
          summary: text,
          contactId: msg.contactId ?? undefined,
          companyId: msg.companyId ?? undefined,
          opportunityId: msg.opportunityId ?? undefined,
          performedBy: "user",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || `Request failed (${res.status})`);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      toast({ title: "Reply logged", description: "Saved to the contact timeline. Connect the channel in Settings to send directly." });
      setSelectedMsg(null);
      setReplyDraft("");
    } catch (err: any) {
      toast({ title: "Reply failed", description: err?.message || "Request failed", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleMoveToCrm = async (msg: any) => {
    try {
      const parts = String(msg.contactName || "").trim().split(/\s+/).filter(Boolean);
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: parts[0] || (msg.companyName || "Contact"),
          lastName: parts.slice(1).join(" ") || "",
          company: msg.companyName || undefined,
          companyId: msg.companyId ?? undefined,
          contactId: msg.contactId ?? undefined,
          source: (msg.type || "inbound").toLowerCase(),
          status: "qualified",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        toast({ title: "Error", description: err.message || err.error || "Could not create CRM lead", variant: "destructive" });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setMovedIds((prev) => new Set(prev).add(msg.id));
      toast({ title: "Moved to CRM", description: `${senderName(msg)} added as a qualified lead` });
      setSelectedMsg(null);
    } catch {
      toast({ title: "Error", description: "Failed to create CRM lead", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {channels.map((ch) => (
          <GlassCard key={ch.name} className="p-3">
            <div className="flex flex-col items-center text-center gap-1">
              <div className={ch.color}>{ch.icon}</div>
              <span className="text-[10px] font-medium">{ch.name}</span>
              <div className="flex items-center gap-1">
                {ch.unread > 0 && <Badge className="bg-crimson text-white text-[9px] px-1 py-0">{ch.unread}</Badge>}
                <span className={`text-[9px] ${ch.connected ? "text-success" : "text-muted-foreground"}`}>
                  {ch.connected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center gap-1.5 px-1">
        <Globe className="h-3 w-3 text-crimson/70" />
        <span className="text-[10px] text-muted-foreground">
          Inbound messages appear here from connected channels. Connect LinkedIn, email, or a webhook in Settings → Integrations to route replies into this inbox.
        </span>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Unified Inbox</h3>
          <Badge variant="outline" className="text-xs">{inbound.length} message{inbound.length === 1 ? "" : "s"}</Badge>
        </div>
        {inbound.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Inbound replies and form submissions land here once a channel is connected. Nothing has come in yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {inbound.map((msg) => {
              const moved = movedIds.has(msg.id);
              return (
                <motion.div key={msg.id} whileHover={{ scale: 1.002 }}
                  className="p-3 rounded-lg glass-surface cursor-pointer flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
                  onClick={() => { setSelectedMsg(msg); setReplyDraft(""); }}
                >
                  <div className="p-1.5 rounded-lg glass-surface shrink-0">{socialChannelIcon(msg.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{senderName(msg)}</p>
                      {msg.companyName && msg.contactName && <span className="text-[10px] text-muted-foreground truncate">at {msg.companyName}</span>}
                      {msg.sentiment && <Badge variant="outline" className="text-[9px] capitalize">{msg.sentiment}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{msg.subject || msg.summary || "(no subject)"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{relTime(msg.createdAt)}</span>
                    {moved ? (
                      <Badge className="bg-success/20 text-success text-[9px] border-success/30">In CRM</Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 border-crimson/30 text-crimson" onClick={(e) => { e.stopPropagation(); handleMoveToCrm(msg); }}>
                        <ArrowRight className="h-2.5 w-2.5 mr-1" />CRM
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {selectedMsg && (
        <Dialog open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
          <DialogContent className="glass-panel border-border/50 max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {socialChannelIcon(selectedMsg.type)}
                {senderName(selectedMsg)}
              </DialogTitle>
              <DialogDescription>{selectedMsg.subject || selectedMsg.summary || "Inbound message"}</DialogDescription>
            </DialogHeader>
            <div className="mt-3 p-4 rounded-lg glass-surface text-sm leading-relaxed whitespace-pre-wrap">
              {selectedMsg.transcript || selectedMsg.summary || "No message body recorded."}
            </div>
            {!isHuman && (
              <div className="mt-3">
                <Label className="text-xs">Reply</Label>
                <Textarea
                  value={replyDraft}
                  placeholder={`Hi ${String(senderName(selectedMsg)).split(" ")[0]}, thank you for reaching out...`}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button className="btn-premium text-white text-sm flex-1" disabled={sending || !replyDraft.trim()} onClick={() => handleReply(selectedMsg)}>
                {sending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Log Reply
              </Button>
              {movedIds.has(selectedMsg.id) ? (
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
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || errBody?.message || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const msg = data?.message || data?.result;
      if (!msg) throw new Error("AI did not return a usable message. Try again or use a template.");
      const text = typeof msg === "string" ? msg : msg.message || msg.body || JSON.stringify(msg);
      setBody(text);
      if (typeof msg !== "string" && msg.subject) setSubject(msg.subject);
      toast({ title: "AI Draft Ready", description: "Message generated — review and edit before sending" });
    } catch (err: any) {
      // Surface the real failure — never fabricate a draft + success toast.
      toast({ title: "AI draft failed", description: err?.message || "Could not generate a draft. Use a template or write your own.", variant: "destructive" });
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
  const { isAuto } = useAiModeContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tasks } = useListTasks();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const taskList = (tasks ?? []) as any[];
  const CLOSED = new Set(["completed", "done", "cancelled", "archived"]);
  const open = taskList.filter((t) => !CLOSED.has(String(t.status ?? "").toLowerCase()));

  const daysOverdue = (t: any): number | null =>
    t.dueDate ? Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000) : null;

  const overdueCount = open.filter((t) => (daysOverdue(t) ?? -1) > 0).length;
  const dueTodayCount = open.filter((t) => daysOverdue(t) === 0).length;

  const patchTask = async (id: number, body: Record<string, unknown>, okMsg: { title: string; description: string }) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || `Request failed (${res.status})`);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast(okMsg);
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message || "Request failed", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleComplete = (t: any) =>
    patchTask(t.id, { status: "completed" }, { title: "Marked complete", description: `"${t.title}" closed.` });

  const handleSnooze = (t: any) => {
    const next = new Date(Date.now() + 3 * 86400000).toISOString();
    patchTask(t.id, { dueDate: next }, { title: "Snoozed 3 days", description: `"${t.title}" rescheduled.` });
  };

  const priorityBorder = (p: string) =>
    p === "high" || p === "urgent" ? "border-l-crimson" : p === "medium" ? "border-l-gold" : "border-l-muted-foreground/30";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Overdue" value={overdueCount} icon={<AlertCircle className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Due Today" value={dueTodayCount} icon={<Clock className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Open Tasks" value={open.length} icon={<Calendar className="h-4 w-4" />} accent="blue" />
      </div>

      <div className="flex items-center gap-1.5 px-1">
        {isAuto ? <Bot className="h-3 w-3 text-crimson/70" /> : <Hand className="h-3 w-3 text-yellow-400/70" />}
        <span className="text-[10px] text-muted-foreground">
          Follow-up tasks created across the OS (calls, proposals, nurture) surface here. Draft opens the composer; Complete closes the task.
        </span>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Follow-up Queue</h3>
          <Badge variant="outline" className="text-xs">{open.length} open</Badge>
        </div>
        {open.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-semibold">No follow-ups due</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              You're all caught up. Tasks appear here as leads progress and follow-ups get scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((t) => {
              const od = daysOverdue(t);
              return (
                <div key={t.id} className={`p-3 rounded-lg glass-surface border-l-2 ${priorityBorder(String(t.priority ?? "").toLowerCase())}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        {od != null && od > 0 && <Badge className="bg-crimson/20 text-crimson text-[10px] border-crimson/30">{od}d overdue</Badge>}
                        {od === 0 && <Badge className="bg-gold/20 text-gold text-[10px] border-gold/30">Due today</Badge>}
                        {t.priority && <Badge variant="outline" className="text-[9px] capitalize">{t.priority}</Badge>}
                        {t.entityType && <Badge variant="outline" className="text-[9px] capitalize">{t.entityType}{t.entityId ? ` #${t.entityId}` : ""}</Badge>}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground truncate mt-1">{t.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : "No due date"}</span>
                        {t.assignedTo && <span>Assigned: {t.assignedTo}</span>}
                        {t.status && <span className="capitalize">{String(t.status).replace(/_/g, " ")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={() => onTabChange("compose")}>
                        <Send className="h-3 w-3 mr-1" />Draft
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7" disabled={updatingId === t.id} onClick={() => handleSnooze(t)}>
                        {updatingId === t.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Clock className="h-3 w-3 mr-1" />}Snooze
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 border-success/30 text-success" disabled={updatingId === t.id} onClick={() => handleComplete(t)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Done
                      </Button>
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

function AnalyticsTab() {
  const { data: leads } = useListLeads();
  const { data: comms } = useListCommunications();
  const { data: tasks } = useListTasks();
  const leadList = (leads ?? []) as any[];
  const commList = (comms ?? []) as any[];
  const taskList = (tasks ?? []) as any[];

  const dir = (c: any) => String(c.direction ?? "").toLowerCase();
  const outbound = commList.filter((c) => dir(c) === "outbound");
  const inbound = commList.filter((c) => dir(c) === "inbound");
  const isMeeting = (c: any) => /meeting|call|demo/i.test(`${c.type ?? ""} ${c.outcome ?? ""}`);

  const messagesSent = outbound.length;
  const replies = inbound.length;
  const responseRate = messagesSent > 0 ? Math.round((replies / messagesSent) * 100) : 0;
  const meetings = commList.filter(isMeeting).length;
  const qualified = leadList.filter((l: any) => ["qualified", "routing", "routed", "active"].includes(l.status)).length;

  // Real per-channel performance grouped by communication.type.
  const byType: Record<string, { sent: number; replies: number }> = {};
  for (const c of commList) {
    const t = String(c.type ?? "other").toLowerCase();
    (byType[t] ??= { sent: 0, replies: 0 });
    if (dir(c) === "outbound") byType[t].sent++;
    else if (dir(c) === "inbound") byType[t].replies++;
  }
  const channelRows = Object.entries(byType)
    .map(([channel, v]) => ({ channel, sent: v.sent, replies: v.replies, rate: v.sent ? Math.round((v.replies / v.sent) * 100) : 0 }))
    .sort((a, b) => b.sent + b.replies - (a.sent + a.replies));

  const weekAgo = Date.now() - 7 * 86400000;
  const within = (d?: string | Date | null) => (d ? new Date(d).getTime() >= weekAgo : false);
  const goals = [
    { goal: "New prospects (7d)", current: leadList.filter((l: any) => within(l.createdAt)).length, target: 50 },
    { goal: "Messages sent (7d)", current: outbound.filter((c) => within(c.createdAt)).length, target: 100 },
    { goal: "Follow-ups completed (7d)", current: taskList.filter((t: any) => String(t.status).toLowerCase() === "completed" && within(t.completedAt ?? t.updatedAt)).length, target: 30 },
    { goal: "Meetings logged (7d)", current: commList.filter((c) => isMeeting(c) && within(c.createdAt)).length, target: 5 },
  ];

  const bestPractices = [
    "Lead with a case study — outcome-first intros consistently out-reply generic pitches.",
    "Keep LinkedIn messages under ~100 words with a single, specific ask.",
    "Reference the prospect's compliance context (SOC 2, NIST) — it signals you know their world.",
    "Escalate channels after 2–3 unanswered touches instead of repeating the same one.",
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Messages Sent" value={messagesSent} icon={<Mail className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Replies" value={replies} icon={<MessageSquare className="h-4 w-4" />} accent="success" />
        <KpiCard label="Response Rate" value={messagesSent > 0 ? `${responseRate}%` : "--"} icon={<TrendingUp className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Meetings Logged" value={meetings} icon={<Calendar className="h-4 w-4" />} accent="gold" />
      </div>

      <div className="flex items-center gap-1.5 px-1">
        <BarChart3 className="h-3 w-3 text-crimson/70" />
        <span className="text-[10px] text-muted-foreground">
          Metrics are computed live from logged communications ({commList.length}) and {qualified} qualified lead{qualified === 1 ? "" : "s"}. Log sends and replies in the inbox/composer to populate them.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-sm font-semibold mb-4">Channel Performance</h3>
          {channelRows.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-9 w-9 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">No channel activity yet. Metrics appear once messages are logged per channel.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {channelRows.map((ch) => (
                <div key={ch.channel} className="p-3 rounded-lg glass-surface">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">{ch.channel}</span>
                    <span className="text-xs text-crimson font-semibold">{ch.rate}% reply rate</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 mb-2 overflow-hidden">
                    <div className="h-full rounded-full bg-crimson/60" style={{ width: `${Math.min(ch.rate, 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div><p className="text-sm font-bold">{ch.sent}</p><p className="text-[10px] text-muted-foreground">Sent</p></div>
                    <div><p className="text-sm font-bold">{ch.replies}</p><p className="text-[10px] text-muted-foreground">Replies</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4">This Week</h3>
            <div className="space-y-4">
              {goals.map((g) => (
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
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-crimson" />
              <h3 className="text-sm font-semibold">Outreach Best Practices</h3>
              <Badge variant="outline" className="text-[9px] text-muted-foreground">General guidance</Badge>
            </div>
            <div className="space-y-2">
              {bestPractices.map((tip, i) => (
                <div key={i} className="p-2 rounded-lg glass-surface flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground">{tip}</p>
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
