import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBox, FileText, Search, Tag, Plus, BarChart3, Sparkles, Download, Clock, Eye, Filter } from "lucide-react";
import { useListDocuments, useListOpportunities, useListCampaigns, useListTasks } from "@workspace/api-client-react";
import { motion } from "framer-motion";

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
    const matchesSearch = !searchQuery || d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPipeline = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const activeTasks = taskList.filter((t: any) => t.status !== 'completed').length;
  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileBox className="h-8 w-8 text-primary" />
            Reports & Archive
          </h1>
          <p className="text-muted-foreground mt-1">Executive reports, operational reports, document repository, and knowledge base.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90"><Sparkles className="h-4 w-4 mr-2" />Generate Report</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="reports" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <BarChart3 className="h-4 w-4 mr-2" />Reports
          </TabsTrigger>
          <TabsTrigger value="archive" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <FileBox className="h-4 w-4 mr-2" />Document Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Executive Report</CardTitle>
                  <Badge className="bg-primary/20 text-primary text-[10px]">Leadership</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Concise, decision-oriented, non-technical overview.</p>
                <div className="space-y-2">
                  <ReportLine label="Pipeline Health" value={`$${totalPipeline.toLocaleString()} across ${oppList.length} deals`} />
                  <ReportLine label="Campaign Performance" value={`${totalLeads} leads generated from ${campaignList.length} campaigns`} />
                  <ReportLine label="Operational Status" value={`${activeTasks} active tasks, ${taskList.filter((t: any) => t.priority === 'critical').length} critical`} />
                  <ReportLine label="Attention Required" value={activeTasks > 5 ? 'High task volume — review priorities' : 'Normal operations'} highlight={activeTasks > 5} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="text-xs flex-1"><Download className="h-3 w-3 mr-1" />Export PDF</Button>
                  <Button size="sm" variant="outline" className="text-xs flex-1"><Sparkles className="h-3 w-3 mr-1" />AI Summary</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-400" />Operational Report</CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Technical</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Detailed, workflow-aware, traceable operational data.</p>
                <div className="space-y-2">
                  {oppList.slice(0, 3).map((o: any) => (
                    <ReportLine key={o.id} label={o.title} value={`${o.stage} — $${(o.value ?? 0).toLocaleString()} (${o.probability}%)`} />
                  ))}
                  <ReportLine label="Task Completion" value={`${taskList.filter((t: any) => t.status === 'completed').length}/${taskList.length} completed`} />
                  <ReportLine label="Document Status" value={`${docList.filter((d: any) => d.status === 'published' || d.status === 'approved').length}/${docList.length} finalized`} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="text-xs flex-1"><Download className="h-3 w-3 mr-1" />Export CSV</Button>
                  <Button size="sm" variant="outline" className="text-xs flex-1"><Clock className="h-3 w-3 mr-1" />Schedule</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Report Types</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: 'CRM Pipeline Report', domain: 'CRM', type: 'executive' },
                  { name: 'Campaign Performance', domain: 'Marketing', type: 'operational' },
                  { name: 'Communication Summary', domain: 'Communications', type: 'executive' },
                  { name: 'Task Completion Report', domain: 'Execution', type: 'operational' },
                  { name: 'Financial Summary', domain: 'Finance', type: 'executive' },
                  { name: 'System Health Report', domain: 'System', type: 'operational' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.domain}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{r.type}</Badge>
                      <Button variant="ghost" size="sm" className="text-xs h-7"><Sparkles className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archive" className="space-y-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-9 bg-card/50 border-border/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 bg-card/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} documents</span>
          </div>

          <div className="space-y-2">
            {filtered.map((doc: any) => (
              <Card key={doc.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{doc.content}</p>
                      {doc.tags && (
                        <div className="flex gap-1 mt-1">
                          {doc.tags.split(',').map((tag: string) => <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0">{tag.trim()}</Badge>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="secondary" className="capitalize text-[10px]">{doc.category}</Badge>
                    <Badge variant={doc.status === 'published' || doc.status === 'approved' ? 'default' : 'secondary'} className="capitalize text-[10px]">{doc.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">v{doc.version}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function ReportLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between p-2 rounded bg-background/50 border border-border/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium text-right ml-2 ${highlight ? 'text-yellow-400' : ''}`}>{value}</span>
    </div>
  );
}
