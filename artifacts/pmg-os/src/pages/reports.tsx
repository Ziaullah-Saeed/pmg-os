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
import {
  FileBox, FileText, Search, Plus, BarChart3, Sparkles,
  Download, Clock, Eye
} from "lucide-react";

const tabs = [
  { id: "reports", label: "Reports", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "archive", label: "Document Archive", icon: <FileBox className="h-3.5 w-3.5" /> },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { data: documents } = useListDocuments();
  const { data: opportunities } = useListOpportunities();
  const { data: campaigns } = useListCampaigns();
  const { data: tasks } = useListTasks();

  const docList = (documents ?? []) as any[];
  const oppList = (opportunities ?? []) as any[];
  const campaignList = (campaigns ?? []) as any[];
  const taskList = (tasks ?? []) as any[];

  const categories = [...new Set(docList.map((d: any) => d.category))];
  const filtered = docList.filter((d: any) => {
    const matchesSearch = !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPipeline = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const activeTasks = taskList.filter((t: any) => t.status !== "completed").length;
  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Reports & Archive"
        subtitle="Executive reports, operational reports, document repository, and knowledge base"
        icon={<FileBox className="h-5 w-5" />}
        actions={<Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg"><Sparkles className="h-4 w-4 mr-2" />Generate Report</Button>}
      />

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "reports" && (
          <div className="space-y-6">
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
                    <Button className="btn-glass text-foreground flex-1 text-xs rounded-lg"><Download className="h-3 w-3 mr-1" />Export PDF</Button>
                    <Button className="btn-glass text-foreground flex-1 text-xs rounded-lg"><Sparkles className="h-3 w-3 mr-1" />AI Summary</Button>
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
                    <Button className="btn-glass text-foreground flex-1 text-xs rounded-lg"><Download className="h-3 w-3 mr-1" />Export CSV</Button>
                    <Button className="btn-glass text-foreground flex-1 text-xs rounded-lg"><Clock className="h-3 w-3 mr-1" />Schedule</Button>
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Report Types</h3></div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "CRM Pipeline Report", domain: "CRM", type: "executive" },
                  { name: "Campaign Performance", domain: "Marketing", type: "operational" },
                  { name: "Communication Summary", domain: "Communications", type: "executive" },
                  { name: "Task Completion Report", domain: "Execution", type: "operational" },
                  { name: "Financial Summary", domain: "Finance", type: "executive" },
                  { name: "System Health Report", domain: "System", type: "operational" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.domain}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{r.type}</Badge>
                      <Button className="btn-glass text-foreground p-1.5 rounded-lg"><Sparkles className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
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
            </div>
          </div>
        )}
      </motion.div>
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
