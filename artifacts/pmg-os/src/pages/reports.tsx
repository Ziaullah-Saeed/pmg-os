import { useState } from "react";
import { useListDocuments, useListOpportunities, useListCampaigns, useListTasks } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKnowledgeLibrary, useSearchKnowledge, useAiGenerateReport, useReportTemplates, useReportEventTriggers, useReportArchive, useGenerateScheduledReport, useDeliverReportSlack, useDeliverReportEmail, useKnowledgeEventMappings, useSemanticSearch } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import {
  FileBox, FileText, Search, BarChart3, Sparkles,
  Download, Clock, Eye, BookOpen, Brain, Loader2, FileDown,
  Calendar, Mail, MessageSquare, Zap, Activity, TrendingUp,
  CheckCircle2, AlertTriangle
} from "lucide-react";
import { apiFetch } from "@/hooks/use-api";

const tabs = [
  { id: "reports", label: "Reports", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "scheduled", label: "Scheduled", icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: "triggers", label: "Event Triggers", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "knowledge", label: "Knowledge Library", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: "lessons", label: "Lessons & Patterns", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "archive", label: "Report Archive", icon: <FileBox className="h-3.5 w-3.5" /> },
];

const reportTypes = [
  { name: "CRM Pipeline Report", domain: "crm", type: "executive" },
  { name: "Campaign Performance", domain: "marketing", type: "operational" },
  { name: "Communication Summary", domain: "communications", type: "executive" },
  { name: "Task Completion Report", domain: "execution", type: "operational" },
  { name: "Financial Summary", domain: "finance", type: "executive" },
  { name: "System Health Report", domain: "system", type: "operational" },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState("all");
  const [knowledgeTimeFilter, setKnowledgeTimeFilter] = useState("all");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [deliverReportId, setDeliverReportId] = useState<number | null>(null);
  const [deliverEmail, setDeliverEmail] = useState("");
  const { toast } = useToast();
  const { isHuman, isHybrid, isAuto } = useAiModeContext();
  const { data: documents } = useListDocuments();
  const { data: opportunities } = useListOpportunities();
  const { data: campaigns } = useListCampaigns();
  const { data: tasks } = useListTasks();
  const { data: knowledge } = useKnowledgeLibrary();
  const { data: searchResults } = useSearchKnowledge(knowledgeSearch);
  const generateReport = useAiGenerateReport();
  const { data: templates } = useReportTemplates();
  const { data: eventTriggers } = useReportEventTriggers();
  const { data: archiveData } = useReportArchive();
  const generateScheduled = useGenerateScheduledReport();
  const deliverSlack = useDeliverReportSlack();
  const deliverEmailMut = useDeliverReportEmail();
  const { data: eventMappings } = useKnowledgeEventMappings();
  const { data: semanticResults } = useSemanticSearch(knowledgeSearch.length > 2 ? knowledgeSearch : "");

  const docList = (documents ?? []) as any[];
  const oppList = (opportunities ?? []) as any[];
  const campaignList = (campaigns ?? []) as any[];
  const taskList = (tasks ?? []) as any[];
  const templateList = (templates ?? []) as any[];
  const triggerList = (eventTriggers ?? []) as any[];
  const archiveList = (archiveData ?? []) as any[];
  const mappingList = (eventMappings ?? []) as any[];
  const knowledgeList = knowledgeSearch.length > 2 ? (searchResults ?? []) as any[] : (knowledge ?? []) as any[];

  const filteredKnowledge = knowledgeList.filter((entry: any) => {
    if (knowledgeCategoryFilter !== "all" && entry.category !== knowledgeCategoryFilter) return false;
    if (knowledgeTimeFilter !== "all" && entry.createdAt) {
      const diff = Date.now() - new Date(entry.createdAt).getTime();
      const limits: Record<string, number> = { "24h": 86400000, "7d": 604800000, "30d": 2592000000, "90d": 7776000000 };
      if (limits[knowledgeTimeFilter] && diff > limits[knowledgeTimeFilter]) return false;
    }
    return true;
  });

  const categories = [...new Set(docList.map((d: any) => d.category))];
  const filtered = docList.filter((d: any) => {
    const matchesSearch = !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  async function handleGenerateReport(domain: string, type: string, name: string) {
    setGeneratingReport(name);
    setGeneratedReport(null);
    try {
      const result = await generateReport.mutateAsync({ domain, reportType: type, data: { totalOpps: oppList.length, totalCampaigns: campaignList.length, totalTasks: taskList.length } });
      setGeneratedReport(result.report);
      toast({ title: "Report generated", description: `Confidence: ${Math.round(result.confidence)}%` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingReport(null);
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Reports & Archive"
        subtitle="AI-powered reporting, knowledge memory, scheduled reports, and institutional archive"
        icon={<BarChart3 className="h-5 w-5" />}
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Report Templates" value={templateList.length} icon={<FileText className="h-4 w-4" />} />
        <KpiCard label="Event Triggers" value={triggerList.length} icon={<Zap className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Knowledge Entries" value={knowledgeList.length} icon={<Brain className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Archive Items" value={archiveList.length} icon={<FileBox className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Auto-Mappings" value={mappingList.length} icon={<Activity className="h-4 w-4" />} accent="success" />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "reports" && (
          <ModeAwareWrapper
            domain="reports"
            humanContent={
              <HumanWorkflowGuide title="Report Generation Workflow" steps={[
                { id: "1", title: "Select Report Type", description: "Choose from CRM, Marketing, Finance, or custom report templates", status: "current" as const, action: "Select" },
                { id: "2", title: "Configure Parameters", description: "Set date range, filters, and comparison periods", status: "upcoming" as const },
                { id: "3", title: "Generate & Review", description: "AI generates report content with executive summary", status: "upcoming" as const },
                { id: "4", title: "Deliver", description: "Send via Slack or email to stakeholders", status: "upcoming" as const },
              ]} icon={<BarChart3 className="h-5 w-5 text-info" />} />
            }
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((rt) => (
                  <GlassCard key={rt.name} variant="interactive" className="!p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-info" />
                        <h3 className="text-sm font-semibold">{rt.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-[9px] capitalize">{rt.type}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3">Domain: {rt.domain}</p>
                    <Button
                      className="btn-premium text-white text-xs w-full rounded-lg"
                      onClick={() => handleGenerateReport(rt.domain, rt.type, rt.name)}
                      disabled={!!generatingReport}
                    >
                      {generatingReport === rt.name ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      {generatingReport === rt.name ? "Generating..." : "Generate Report"}
                    </Button>
                  </GlassCard>
                ))}
              </div>

              {generatedReport && (
                <GlassCard glow="blue" className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-info" />
                      <h3 className="text-sm font-semibold">Generated Report</h3>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setGeneratedReport(null)}>Close</Button>
                  </div>
                  <div className="px-5 pb-4">
                    <div className="prose prose-sm prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-sans leading-relaxed">{generatedReport}</pre>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          </ModeAwareWrapper>
        )}

        {activeTab === "scheduled" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">Scheduled Report Templates</h3>
                </div>
                <Badge variant="outline" className="text-[10px]">{templateList.length} active</Badge>
              </div>
              <div className="px-5 pb-4 space-y-3">
                {templateList.length > 0 ? templateList.map((tmpl: any, i: number) => (
                  <div key={tmpl.id ?? i} className="p-4 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold">{tmpl.name ?? tmpl.title}</h4>
                        <p className="text-[10px] text-muted-foreground">{tmpl.description ?? `${tmpl.frequency ?? tmpl.schedule ?? "scheduled"} report`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] capitalize">{tmpl.frequency ?? tmpl.schedule ?? "cron"}</Badge>
                        <StatusBadge variant="active" label="Active" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] text-muted-foreground">Domain: {tmpl.domain ?? "all"}</span>
                      {tmpl.cronExpression && <span className="text-[9px] text-muted-foreground font-mono">{tmpl.cronExpression}</span>}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-xs h-7"
                        onClick={() => {
                          generateScheduled.mutate({ template: tmpl.id }, {
                            onSuccess: () => toast({ title: "Report generated", description: `${tmpl.name ?? tmpl.title} generated successfully` }),
                            onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                          });
                        }}
                        disabled={generateScheduled.isPending}
                      >
                        {generateScheduled.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                        Run Now
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Scheduled reports run automatically via cron jobs</p>
                    <p className="text-[10px] mt-1">Templates: daily_pipeline, weekly_revenue, weekly_marketing, monthly_executive, quarterly_business</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "triggers" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Event-Triggered Reports</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {triggerList.length > 0 ? triggerList.map((trigger: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{trigger.event ?? trigger.name}</p>
                        <p className="text-[9px] text-muted-foreground">{trigger.description ?? `Generates report on ${trigger.event}`}</p>
                      </div>
                      <StatusBadge variant="active" label="Active" />
                    </div>
                  )) : (
                    ["opportunity.won", "opportunity.lost", "invoice.paid", "lead.converted"].map((evt) => (
                      <div key={evt} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium capitalize">{evt.replace(".", " ")}</p>
                          <p className="text-[9px] text-muted-foreground">Auto-generates milestone report on {evt}</p>
                        </div>
                        <StatusBadge variant="active" label="Active" />
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-semibold">Knowledge Auto-Population</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  {mappingList.length > 0 ? mappingList.map((mapping: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium capitalize">{(mapping.event ?? mapping.name ?? "").replace(/\./g, " ")}</p>
                        <p className="text-[9px] text-muted-foreground">{mapping.description ?? `Category: ${mapping.category ?? "auto"}`}</p>
                      </div>
                      <Badge variant="outline" className="text-[8px]">{mapping.category ?? "auto"}</Badge>
                    </div>
                  )) : (
                    ["deal_win", "deal_loss", "lead_scoring", "lead_enrichment", "lead_conversion", "contract_signed", "invoice_payment", "report_generated"].map((evt) => (
                      <div key={evt} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium capitalize">{evt.replace(/_/g, " ")}</p>
                          <p className="text-[9px] text-muted-foreground">Auto-populates knowledge on event</p>
                        </div>
                        <Badge variant="outline" className="text-[8px]">{evt.split("_")[0]}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-info" />
                <h3 className="text-sm font-semibold">Report Delivery Channels</h3>
              </div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-lg glass-surface">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-purple-400" />
                    <h4 className="text-sm font-semibold">Slack Delivery</h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">Send reports as formatted Block Kit messages to Slack channels</p>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Report ID" className="h-8 text-xs bg-white/5 w-24" type="number" onChange={(e) => setDeliverReportId(parseInt(e.target.value) || null)} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        if (!deliverReportId) return;
                        deliverSlack.mutate({ reportId: deliverReportId }, {
                          onSuccess: () => toast({ title: "Delivered to Slack" }),
                          onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                        });
                      }}
                      disabled={deliverSlack.isPending || !deliverReportId}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />Send
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-lg glass-surface">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    <h4 className="text-sm font-semibold">Email Delivery</h4>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">Send reports via email with formatted HTML content</p>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Report ID" className="h-8 text-xs bg-white/5 w-24" type="number" onChange={(e) => setDeliverReportId(parseInt(e.target.value) || null)} />
                    <Input placeholder="email@example.com" className="h-8 text-xs bg-white/5 flex-1" value={deliverEmail} onChange={(e) => setDeliverEmail(e.target.value)} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        if (!deliverReportId || !deliverEmail) return;
                        deliverEmailMut.mutate({ reportId: deliverReportId, email: deliverEmail }, {
                          onSuccess: () => toast({ title: "Delivered via email" }),
                          onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
                        });
                      }}
                      disabled={deliverEmailMut.isPending || !deliverReportId || !deliverEmail}
                    >
                      <Mail className="h-3 w-3 mr-1" />Send
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge base (semantic + keyword)..."
                  value={knowledgeSearch}
                  onChange={(e) => setKnowledgeSearch(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 h-9"
                />
              </div>
              <Select value={knowledgeCategoryFilter} onValueChange={setKnowledgeCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="deal_insights">Deal Insights</SelectItem>
                  <SelectItem value="lead_intelligence">Lead Intelligence</SelectItem>
                  <SelectItem value="market_research">Market Research</SelectItem>
                  <SelectItem value="process">Process</SelectItem>
                  <SelectItem value="competitive">Competitive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={knowledgeTimeFilter} onValueChange={setKnowledgeTimeFilter}>
                <SelectTrigger className="w-[120px] h-9 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {filteredKnowledge.length > 0 ? filteredKnowledge.map((entry: any) => (
                <GlassCard key={entry.id} className="!p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Brain className="h-3.5 w-3.5 text-purple-400" />
                      <p className="text-sm font-semibold">{entry.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] capitalize">{entry.category}</Badge>
                      {entry.confidence !== undefined && (
                        <span className={`text-[9px] font-medium ${entry.confidence >= 80 ? "text-green-400" : entry.confidence >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {entry.confidence}%
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">{entry.source}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{entry.content}</p>
                  {entry.createdAt && <p className="text-[8px] text-muted-foreground mt-1">{new Date(entry.createdAt).toLocaleString()}</p>}
                </GlassCard>
              )) : (
                <div className="py-12 text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No knowledge entries yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Knowledge auto-populates from business events (deal wins, lead scoring, etc.)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "lessons" && (
          <div className="space-y-6">
            <GlassCard glow="crimson" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Campaign Lessons Learned</h3>
                </div>
                <StatusBadge variant="ai-executed" label="AI Analyzed" />
              </div>
              <div className="px-5 pb-4 space-y-3">
                {[
                  { campaign: "LinkedIn Ads — Cybersecurity Awareness", lesson: "Video ads outperformed static images by 3.2x CTR. Focus on short-form video content for awareness campaigns.", impact: "high", domain: "marketing", type: "success" },
                  { campaign: "Cold Email Sequence — Healthcare", lesson: "Personalized subject lines with compliance keywords had 2x open rate. Generic 'security' messaging underperforms in regulated industries.", impact: "high", domain: "outreach", type: "success" },
                  { campaign: "Google Ads — Managed IT Services", lesson: "Broad match keywords drained budget without conversions. Switch to phrase match and add negative keywords for 'free' and 'DIY'.", impact: "critical", domain: "marketing", type: "failure" },
                  { campaign: "Webinar Series — SOC 2 Readiness", lesson: "Post-webinar follow-up within 24 hours converts 4x better than 48+ hour delays. Automate immediate follow-up sequence.", impact: "high", domain: "communications", type: "success" },
                  { campaign: "Referral Outreach Program", lesson: "Existing clients who received quarterly business reviews were 5x more likely to refer. Increase QBR frequency for top accounts.", impact: "medium", domain: "crm", type: "success" },
                ].map((lesson, i) => (
                  <div key={i} className={`p-4 rounded-lg ${lesson.type === "failure" ? "border border-crimson/20 bg-crimson/5" : "glass-surface"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {lesson.type === "success" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-crimson" />}
                        <p className="text-sm font-semibold">{lesson.campaign}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px]">{lesson.domain}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${lesson.impact === "critical" ? "border-crimson/30 text-crimson" : lesson.impact === "high" ? "border-warning/30 text-warning" : ""}`}>{lesson.impact}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{lesson.lesson}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Best-Practice Reuse Index</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { practice: "Video-first content strategy", reuses: 12, successRate: 89, origin: "LinkedIn Campaign Q1" },
                    { practice: "24-hour follow-up automation", reuses: 8, successRate: 94, origin: "Webinar Series" },
                    { practice: "Compliance-specific messaging", reuses: 15, successRate: 82, origin: "Healthcare Outreach" },
                    { practice: "Quarterly business reviews", reuses: 6, successRate: 91, origin: "Client Retention Program" },
                    { practice: "Case study social proof", reuses: 10, successRate: 76, origin: "Financial Services Campaign" },
                  ].map((bp) => (
                    <div key={bp.practice} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{bp.practice}</p>
                        <p className="text-[10px] text-muted-foreground">Origin: {bp.origin}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-success">{bp.successRate}%</p>
                          <p className="text-[9px] text-muted-foreground">{bp.reuses} reuses</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Failed Pattern Detection</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { pattern: "Generic messaging to regulated industries", occurrences: 4, impact: "$12K wasted spend", fix: "Create industry-specific messaging tracks" },
                    { pattern: "Broad match keyword spending", occurrences: 3, impact: "$8.5K wasted spend", fix: "Switch to phrase match + negative keywords" },
                    { pattern: "Delayed follow-ups (>48hr)", occurrences: 7, impact: "23 lost opportunities", fix: "Automate within 24 hours via workflow" },
                    { pattern: "Single-channel campaigns", occurrences: 5, impact: "40% lower conversion", fix: "Run multi-channel sequences (email + LinkedIn + call)" },
                  ].map((fp) => (
                    <div key={fp.pattern} className="p-3 rounded-lg border border-crimson/15 bg-crimson/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-crimson">{fp.pattern}</p>
                        <Badge variant="outline" className="text-[9px] border-crimson/30 text-crimson">{fp.occurrences}x</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Impact: {fp.impact}</p>
                      <p className="text-[10px] text-success mt-1">Fix: {fp.fix}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === "archive" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search archive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 h-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Report Archive</h3>
                <Badge variant="outline" className="text-[10px]">{archiveList.length + filtered.length} total</Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {archiveList.map((report: any, i: number) => (
                  <div key={report.id ?? i} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-info shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{report.title}</p>
                        <p className="text-[9px] text-muted-foreground">{report.domain ?? report.type} &bull; {report.generationType ?? "manual"} &bull; {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px]">{report.status ?? "completed"}</Badge>
                      <Badge variant="outline" className="text-[8px] capitalize">{report.accessLevel ?? "internal"}</Badge>
                    </div>
                  </div>
                ))}
                {filtered.map((doc: any) => (
                  <div key={doc.id} className="p-3 rounded-lg glass-surface flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileBox className="h-4 w-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{doc.title}</p>
                        <p className="text-[9px] text-muted-foreground">{doc.category} &bull; {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px]">{doc.status}</Badge>
                  </div>
                ))}
                {archiveList.length === 0 && filtered.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <FileBox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No archived reports yet</p>
                    <p className="text-[10px] mt-1">Reports appear here after generation. Permission-filtered by role.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Play(props: React.SVGAttributes<SVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="6 3 20 12 6 21 6 3"/></svg>
  );
}
