import { useState } from "react";
import { useListDocuments, useListOpportunities, useListCampaigns, useListTasks } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKnowledgeLibrary, useSearchKnowledge, useAiGenerateReport } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import {
  FileBox, FileText, Search, BarChart3, Sparkles,
  Download, Clock, Eye, BookOpen, Brain, Loader2, FileDown
} from "lucide-react";
import { apiFetch } from "@/hooks/use-api";

const tabs = [
  { id: "reports", label: "Reports", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "knowledge", label: "Knowledge Library", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: "archive", label: "Document Archive", icon: <FileBox className="h-3.5 w-3.5" /> },
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
  const { toast } = useToast();
  const { isHuman, isHybrid, isAuto } = useAiModeContext();
  const { data: documents } = useListDocuments();
  const { data: opportunities } = useListOpportunities();
  const { data: campaigns } = useListCampaigns();
  const { data: tasks } = useListTasks();
  const { data: knowledge } = useKnowledgeLibrary();
  const { data: searchResults } = useSearchKnowledge(knowledgeSearch);
  const generateReport = useAiGenerateReport();

  const docList = (documents ?? []) as any[];
  const oppList = (opportunities ?? []) as any[];
  const campaignList = (campaigns ?? []) as any[];
  const taskList = (tasks ?? []) as any[];
  const knowledgeList = knowledgeSearch.length > 2 ? (searchResults ?? []) as any[] : (knowledge ?? []) as any[];

  const filteredKnowledge = knowledgeList.filter((entry: any) => {
    if (knowledgeCategoryFilter !== "all" && entry.category !== knowledgeCategoryFilter) return false;
    if (knowledgeTimeFilter !== "all" && entry.createdAt) {
      const now = Date.now();
      const created = new Date(entry.createdAt).getTime();
      const diff = now - created;
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

  const totalPipeline = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const activeTasks = taskList.filter((t: any) => t.status !== "completed").length;
  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);

  const handleGenerateReport = async (domain: string, type: string) => {
    const key = `${domain}-${type}`;
    setGeneratingReport(key);
    try {
      const result = await generateReport.mutateAsync({ domain, reportType: type });
      setGeneratedReport(result.report);
      toast({ title: "Report Generated", description: `AI ${type} report for ${domain} created` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingReport(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Reports & Knowledge"
        subtitle="AI-generated reports, knowledge library, document archive"
        icon={<FileBox className="h-5 w-5" />}
        actions={
          <Button
            className="btn-premium text-white text-sm px-4 py-2 rounded-lg"
            onClick={() => handleGenerateReport("crm", "executive")}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
        }
      />

      <ModeIndicatorBanner />

      <ModeAwareWrapper
        domain="reports"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Reporting Workflow" steps={[
              { id: "1", title: "Select Report Type", description: "Choose which domain report to create — CRM, Marketing, Finance, or Operations", status: "current" as const, action: "Choose Report" },
              { id: "2", title: "Gather Data", description: "Review current metrics and collect data points from relevant domains", status: "upcoming" as const },
              { id: "3", title: "Draft Report", description: "Compile findings into a structured report with key metrics and insights", status: "upcoming" as const },
              { id: "4", title: "Review & Distribute", description: "Review report for accuracy, then share with stakeholders", status: "upcoming" as const },
            ]} icon={<FileBox className="h-5 w-5 text-blue-400" />} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard>
                <h3 className="text-sm font-semibold mb-2">Quick Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pipeline Value</span><span className="font-medium">${totalPipeline.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Active Tasks</span><span className="font-medium">{activeTasks}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Leads Generated</span><span className="font-medium">{totalLeads}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Documents</span><span className="font-medium">{docList.length}</span></div>
                </div>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-semibold mb-2">Knowledge Library ({knowledgeList.length})</h3>
                <div className="space-y-1">
                  {knowledgeList.slice(0, 5).map((k: any) => (
                    <div key={k.id} className="text-xs p-1.5 rounded bg-slate-800/30">
                      <p className="font-medium truncate">{k.title}</p>
                      <p className="text-[10px] text-muted-foreground">{k.category}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-semibold mb-2">Recent Documents</h3>
                <div className="space-y-1">
                  {docList.slice(0, 5).map((d: any) => (
                    <div key={d.id} className="text-xs p-1.5 rounded bg-slate-800/30">
                      <p className="font-medium truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground">{d.category} · {d.status}</p>
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
        {activeTab === "reports" && (
          <div className="space-y-6">
            {generatedReport && (
              <GlassCard glow="crimson" className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-crimson" />
                    <h3 className="text-sm font-semibold">AI Generated Report</h3>
                    <StatusBadge variant="ai-executed" label="AI Generated" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setGeneratedReport(null)} className="text-xs text-slate-400">Dismiss</Button>
                </div>
                <div className="px-5 pb-4">
                  <div className="p-4 rounded-lg glass-surface text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                    {generatedReport}
                  </div>
                </div>
              </GlassCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard glow="crimson" className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Eye className="h-4 w-4 text-crimson" /><h3 className="text-sm font-semibold">Executive Report</h3></div>
                  <StatusBadge variant="ai-executed" label="Leadership" />
                </div>
                <div className="px-5 pb-4 space-y-3">
                  <p className="text-xs text-muted-foreground">Concise, decision-oriented, non-technical overview.</p>
                  <div className="space-y-2">
                    <ReportLine label="Pipeline Health" value={`$${totalPipeline.toLocaleString()} across ${oppList.length} deals`} />
                    <ReportLine label="Campaign Performance" value={`${totalLeads} leads from ${campaignList.length} campaigns`} />
                    <ReportLine label="Operational Status" value={`${activeTasks} active tasks`} />
                    <ReportLine label="Attention Required" value={activeTasks > 5 ? "High task volume" : "Normal operations"} highlight={activeTasks > 5} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button className="btn-glass text-foreground flex-1 text-xs rounded-lg" onClick={() => {
                      const a = document.createElement("a");
                      a.href = `${import.meta.env.VITE_API_BASE_URL || "/api"}/reports/export/leads`;
                      a.download = "leads_export.csv";
                      a.click();
                    }}><Download className="h-3 w-3 mr-1" />Export CSV</Button>
                    <Button
                      className="btn-glass text-foreground flex-1 text-xs rounded-lg"
                      onClick={() => handleGenerateReport("crm", "executive")}
                      disabled={generatingReport === "crm-executive"}
                    >
                      {generatingReport === "crm-executive" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      AI Summary
                    </Button>
                  </div>
                </div>
              </GlassCard>

              <GlassCard glow="blue" className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-info" /><h3 className="text-sm font-semibold">Operational Report</h3></div>
                  <StatusBadge variant="human-assisted" label="Technical" />
                </div>
                <div className="px-5 pb-4 space-y-3">
                  <p className="text-xs text-muted-foreground">Detailed, workflow-aware, traceable operational data.</p>
                  <div className="space-y-2">
                    {oppList.slice(0, 3).map((o: any) => (
                      <ReportLine key={o.id} label={o.title} value={`${o.stage} — $${(o.value ?? 0).toLocaleString()} (${o.probability}%)`} />
                    ))}
                    <ReportLine label="Task Completion" value={`${taskList.filter((t: any) => t.status === "completed").length}/${taskList.length}`} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button className="btn-glass text-foreground flex-1 text-xs rounded-lg" onClick={() => {
                      const a = document.createElement("a");
                      a.href = `${import.meta.env.VITE_API_BASE_URL || "/api"}/reports/export/opportunities`;
                      a.download = "opportunities_export.csv";
                      a.click();
                    }}><Download className="h-3 w-3 mr-1" />Export CSV</Button>
                    <Button
                      className="btn-glass text-foreground flex-1 text-xs rounded-lg"
                      onClick={() => handleGenerateReport("operations", "operational")}
                      disabled={generatingReport === "operations-operational"}
                    >
                      {generatingReport === "operations-operational" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Clock className="h-3 w-3 mr-1" />}
                      Schedule
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Report Types</h3></div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {reportTypes.map((r) => {
                  const key = `${r.domain}-${r.type}`;
                  return (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{r.domain}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{r.type}</Badge>
                        <Button
                          className="btn-glass text-foreground p-1.5 rounded-lg"
                          onClick={() => handleGenerateReport(r.domain, r.type)}
                          disabled={generatingReport === key}
                        >
                          {generatingReport === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                <FileDown className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Data Exports</h3>
              </div>
              <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { entity: "leads", label: "Leads" },
                  { entity: "opportunities", label: "Opportunities" },
                  { entity: "companies", label: "Companies" },
                  { entity: "contacts", label: "Contacts" },
                  { entity: "tasks", label: "Tasks" },
                  { entity: "campaigns", label: "Campaigns" },
                ].map((exp) => (
                  <Button
                    key={exp.entity}
                    variant="outline"
                    className="btn-glass text-foreground text-xs rounded-lg justify-start"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = `${import.meta.env.VITE_API_BASE_URL || "/api"}/reports/export/${exp.entity}`;
                      a.download = `${exp.entity}_export.csv`;
                      a.click();
                    }}
                  >
                    <Download className="h-3 w-3 mr-1.5" />{exp.label} CSV
                  </Button>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge base (natural language)..."
                  className="pl-9 glass-surface border-border/50"
                  value={knowledgeSearch}
                  onChange={(e) => setKnowledgeSearch(e.target.value)}
                />
              </div>
              <Select value={knowledgeCategoryFilter} onValueChange={setKnowledgeCategoryFilter}>
                <SelectTrigger className="w-36 glass-surface border-border/50 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="lead_intelligence">Lead Intelligence</SelectItem>
                  <SelectItem value="market_research">Market Research</SelectItem>
                  <SelectItem value="competitive_analysis">Competitive Analysis</SelectItem>
                  <SelectItem value="scoring">Scoring</SelectItem>
                  <SelectItem value="report">Reports</SelectItem>
                  <SelectItem value="process">Process</SelectItem>
                </SelectContent>
              </Select>
              <Select value={knowledgeTimeFilter} onValueChange={setKnowledgeTimeFilter}>
                <SelectTrigger className="w-32 glass-surface border-border/50 text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">{filteredKnowledge.length} entries</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-crimson">{knowledgeList.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Entries</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-info">{[...new Set(knowledgeList.map((k: any) => k.category))].length}</p>
                <p className="text-[10px] text-muted-foreground">Categories</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-success">{knowledgeList.reduce((s: number, k: any) => s + (k.usageCount ?? 0), 0)}</p>
                <p className="text-[10px] text-muted-foreground">Total Uses</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold text-warning">{[...new Set(knowledgeList.map((k: any) => k.source).filter(Boolean))].length}</p>
                <p className="text-[10px] text-muted-foreground">Sources</p>
              </div>
            </div>

            {filteredKnowledge.length === 0 ? (
              <GlassCard className="py-12 flex flex-col items-center gap-3">
                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-lg font-semibold">Knowledge Library</p>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {knowledgeList.length === 0
                    ? "Auto-populates from AI enrichments, scoring results, generated reports, and system activity. Create a lead to start building your knowledge base."
                    : "No entries match your current filters. Try adjusting the category or time range."
                  }
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {filteredKnowledge.map((entry: any) => (
                  <GlassCard key={entry.id} variant="interactive" className="cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <Brain className="h-5 w-5 text-info shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{entry.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[9px] capitalize">{entry.category}</Badge>
                            {entry.source && <Badge variant="outline" className="text-[9px]">{entry.source}</Badge>}
                            <span className="text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          {entry.relatedTo && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] text-muted-foreground">Related:</span>
                              <Badge variant="outline" className="text-[8px]">{entry.relatedTo}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 ml-3 flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[9px]">{entry.usageCount ?? 0} uses</Badge>
                        {(entry.usageCount ?? 0) > 3 && (
                          <Badge className="text-[8px] bg-crimson/10 text-crimson border-crimson/20">Popular</Badge>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "archive" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search documents..." className="pl-9 glass-surface border-border/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 glass-surface border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{filtered.length} documents</span>
            </div>

            <div className="space-y-2">
              {filtered.map((doc: any) => (
                <GlassCard key={doc.id} variant="interactive" className="cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{doc.content}</p>
                        {doc.tags && (
                          <div className="flex gap-1 mt-1">
                            {doc.tags.split(",").map((tag: string) => <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0">{tag.trim()}</Badge>)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="outline" className="capitalize text-[10px]">{doc.category}</Badge>
                      <StatusBadge variant={doc.status === "published" || doc.status === "approved" ? "human-approved" : "draft"} label={doc.status} />
                      <span className="text-[10px] text-muted-foreground tabular-nums">v{doc.version}</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
              {filtered.length === 0 && (
                <GlassCard className="py-12 flex flex-col items-center gap-3">
                  <FileBox className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No documents found</p>
                </GlassCard>
              )}
            </div>
          </div>
        )}
      </motion.div>
      </ModeAwareWrapper>
    </div>
  );
}

function ReportLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between p-2 rounded-lg glass-surface">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium text-right ml-2 ${highlight ? "text-warning" : ""}`}>{value}</span>
    </div>
  );
}
