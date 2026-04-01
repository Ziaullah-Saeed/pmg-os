import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, ArrowUpRight, AlertCircle, CheckCircle2, Plus, Sparkles, Users, Zap, ArrowRight, Filter, ListChecks, Send } from "lucide-react";
import { useListLeads, useListCompanies } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Outreach() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: leads } = useListLeads();
  const { data: companies } = useListCompanies();
  const leadList = (leads ?? []) as any[];
  const companyList = (companies ?? []) as any[];

  const filtered = statusFilter === 'all' ? leadList : leadList.filter((l: any) => l.status === statusFilter);

  const totalLeads = leadList.length;
  const qualified = leadList.filter((l: any) => l.status === 'qualified').length;
  const contacted = leadList.filter((l: any) => l.status === 'contacted').length;
  const avgConfidence = totalLeads ? Math.round(leadList.reduce((s: number, l: any) => s + (l.confidenceScore ?? l.confidence_score ?? 0), 0) / totalLeads) : 0;
  const avgFit = totalLeads ? Math.round(leadList.reduce((s: number, l: any) => s + (l.fitScore ?? l.fit_score ?? 0), 0) / totalLeads) : 0;

  const priorityColor: Record<string, string> = { critical: 'border-l-red-500', high: 'border-l-orange-500', medium: 'border-l-yellow-500', low: 'border-l-muted' };

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Outreach & Prospecting
          </h1>
          <p className="text-muted-foreground mt-1">Target discovery, lead scoring, qualification, and CRM handoff.</p>
        </div>
        <div className="flex gap-2">
          <NewLeadDialog companies={companyList} />
          <Button variant="outline"><Sparkles className="h-4 w-4 mr-2" />AI Prospect</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SmallMetric label="Total Leads" value={totalLeads} icon={Users} />
        <SmallMetric label="Qualified" value={qualified} accent="green" />
        <SmallMetric label="Contacted" value={contacted} accent="blue" />
        <SmallMetric label="Avg Confidence" value={`${avgConfidence}%`} accent="primary" />
        <SmallMetric label="Avg Fit Score" value={`${avgFit}%`} accent="primary" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Target className="h-4 w-4 mr-2" />Lead Pipeline
          </TabsTrigger>
          <TabsTrigger value="sequences" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Send className="h-4 w-4 mr-2" />Outbound Sequences
          </TabsTrigger>
          <TabsTrigger value="qualification" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <ListChecks className="h-4 w-4 mr-2" />Qualification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4 mt-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-card/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="disqualified">Disqualified</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} leads</span>
          </div>

          {filtered.map((lead: any) => (
            <motion.div key={lead.id} whileHover={{ scale: 1.003 }}>
              <Card
                className={`bg-card/50 backdrop-blur-sm border-border/50 border-l-4 ${priorityColor[lead.priority] ?? 'border-l-muted'} hover:border-primary/30 transition-colors cursor-pointer`}
                onClick={() => setSelectedLead(lead)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold uppercase text-[10px] ${lead.priority === 'critical' ? 'text-red-400' : lead.priority === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>
                          {lead.priority}
                        </span>
                        <Badge variant="secondary" className="capitalize text-[10px]">{lead.status}</Badge>
                        <Badge variant="outline" className="capitalize text-[10px]">{lead.source}</Badge>
                      </div>
                      {(lead.painPoints ?? lead.pain_points) && (
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-400" />
                          {lead.painPoints ?? lead.pain_points}
                        </p>
                      )}
                      {(lead.bestAngle ?? lead.best_angle) && (
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-400" />
                          {lead.bestAngle ?? lead.best_angle}
                        </p>
                      )}
                      {(lead.nextAction ?? lead.next_action) && (
                        <p className="text-sm font-medium flex items-center gap-2 text-primary">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Next: {lead.nextAction ?? lead.next_action}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <div className="text-center">
                        <p className="text-sm font-bold text-primary">{lead.fitScore ?? lead.fit_score}%</p>
                        <p className="text-[9px] text-muted-foreground">Fit</p>
                        <Progress value={lead.fitScore ?? lead.fit_score ?? 0} className="h-1 w-14 mt-0.5" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{lead.confidenceScore ?? lead.confidence_score}%</p>
                        <p className="text-[9px] text-muted-foreground">Confidence</p>
                        <Progress value={lead.confidenceScore ?? lead.confidence_score ?? 0} className="h-1 w-14 mt-0.5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Outbound Sequences</CardTitle>
                <Button size="sm" className="bg-primary hover:bg-primary/90"><Plus className="h-3 w-3 mr-1" />New Sequence</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Cybersecurity Compliance Gap', steps: 5, enrolled: 12, replied: 3, status: 'active', channel: 'Email + LinkedIn' },
                { name: 'IT Infrastructure Scaling', steps: 4, enrolled: 8, replied: 2, status: 'active', channel: 'Email' },
                { name: 'Post-Breach Response', steps: 3, enrolled: 4, replied: 1, status: 'paused', channel: 'Email + Call' },
              ].map((seq, i) => (
                <div key={i} className="p-4 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{seq.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{seq.channel} &bull; {seq.steps} steps</p>
                    </div>
                    <Badge className={seq.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>{seq.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-sm font-bold">{seq.enrolled}</p>
                      <p className="text-[9px] text-muted-foreground">Enrolled</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-sm font-bold text-primary">{seq.replied}</p>
                      <p className="text-[9px] text-muted-foreground">Replied</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-sm font-bold">{seq.enrolled ? Math.round(seq.replied / seq.enrolled * 100) : 0}%</p>
                      <p className="text-[9px] text-muted-foreground">Reply Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualification" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" />Qualification Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {leadList.filter((l: any) => l.status !== 'disqualified').map((lead: any) => (
                  <div key={lead.id} className="p-4 rounded-lg bg-background/50 border border-border/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-[10px]">{lead.status}</Badge>
                        <span className="text-sm font-medium">Fit: {lead.fitScore ?? lead.fit_score}%</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-7"><ArrowRight className="h-3 w-3 mr-1" />Handoff to CRM</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Budget identified', checked: (lead.fitScore ?? lead.fit_score) > 70 },
                        { label: 'Decision maker contacted', checked: lead.status === 'qualified' || lead.status === 'contacted' },
                        { label: 'Pain point confirmed', checked: !!(lead.painPoints ?? lead.pain_points) },
                        { label: 'Timeline established', checked: lead.status === 'qualified' },
                        { label: 'Competition assessed', checked: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={item.checked} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                          <span className={item.checked ? '' : 'text-muted-foreground'}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedLead && <LeadDetailModal lead={selectedLead} companies={companyList} onClose={() => setSelectedLead(null)} />}
    </motion.div>
  );
}

function SmallMetric({ label, value, icon: Icon, accent }: any) {
  const accentClass = accent === 'green' ? 'text-green-400' : accent === 'blue' ? 'text-blue-400' : accent === 'primary' ? 'text-primary' : '';
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`text-xl font-bold ${accentClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewLeadDialog({ companies }: { companies: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />New Lead</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader><DialogTitle>Create Lead</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pain Points</Label>
            <Textarea placeholder="What challenges is this prospect facing?" className="bg-background/50" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Best Approach Angle</Label>
            <Textarea placeholder="What's the best way to approach this lead?" className="bg-background/50" rows={2} />
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90">Create Lead</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetailModal({ lead, companies, onClose }: any) {
  const company = companies.find((c: any) => c.id === (lead.companyId ?? lead.company_id));
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-xl max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold text-primary">{lead.fitScore ?? lead.fit_score}%</p>
              <p className="text-[10px] text-muted-foreground">Fit Score</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold">{lead.confidenceScore ?? lead.confidence_score}%</p>
              <p className="text-[10px] text-muted-foreground">Confidence</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant="secondary" className="capitalize">{lead.status}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Status</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">Company</span><p className="font-medium">{company?.name ?? 'Unknown'}</p></div>
            <div><span className="text-muted-foreground text-xs">Source</span><p className="font-medium capitalize">{lead.source}</p></div>
            <div><span className="text-muted-foreground text-xs">Priority</span><Badge className="capitalize mt-0.5">{lead.priority}</Badge></div>
            <div><span className="text-muted-foreground text-xs">Next Action</span><p className="font-medium text-primary">{lead.nextAction ?? lead.next_action}</p></div>
          </div>

          {(lead.painPoints ?? lead.pain_points) && (
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <p className="text-[10px] font-semibold text-orange-400 mb-1">Pain Points</p>
              <p className="text-sm">{lead.painPoints ?? lead.pain_points}</p>
            </div>
          )}
          {(lead.bestAngle ?? lead.best_angle) && (
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <p className="text-[10px] font-semibold text-green-400 mb-1">Best Approach</p>
              <p className="text-sm">{lead.bestAngle ?? lead.best_angle}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1"><Sparkles className="h-4 w-4 mr-2" />AI Qualify</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90"><ArrowRight className="h-4 w-4 mr-2" />Handoff to CRM</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
