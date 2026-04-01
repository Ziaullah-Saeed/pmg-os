import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Plus, DollarSign, TrendingUp, Clock, AlertTriangle, ArrowRight, FileText, Phone, Calendar, ChevronRight } from "lucide-react";
import { useListOpportunities, useListCommunications, useListTasks, useListCompanies } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const stages = ['discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const;
const stageLabels: Record<string, string> = { discovery: 'Discovery', qualification: 'Qualification', proposal: 'Proposal', negotiation: 'Negotiation', closed_won: 'Won', closed_lost: 'Lost' };
const stageColors: Record<string, string> = { discovery: 'border-blue-500/50', qualification: 'border-yellow-500/50', proposal: 'border-orange-500/50', negotiation: 'border-primary/50', closed_won: 'border-green-500/50', closed_lost: 'border-muted' };

export default function CRM() {
  const [activeTab, setActiveTab] = useState("pmg");
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const { data: opportunities, isLoading } = useListOpportunities();
  const { data: communications } = useListCommunications();
  const { data: tasks } = useListTasks();
  const { data: companies } = useListCompanies();

  const oppList = (opportunities ?? []) as any[];
  const commList = (communications ?? []) as any[];
  const taskList = (tasks ?? []) as any[];
  const companyList = (companies ?? []) as any[];

  const totalValue = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const weightedValue = oppList.reduce((s: number, o: any) => s + ((o.value ?? 0) * (o.probability ?? 0) / 100), 0);
  const activeDeals = oppList.filter((o: any) => o.stage !== 'closed_won' && o.stage !== 'closed_lost');

  const staleDays = 7;
  const staleDeals = activeDeals.filter((o: any) => {
    const days = (Date.now() - new Date(o.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > staleDays;
  });

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            CRM & Revenue Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">Opportunity tracking, deal progression, and revenue management.</p>
        </div>
        <NewDealDialog companies={companyList} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="pmg" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">PMG CRM</TabsTrigger>
          <TabsTrigger value="client" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Client CRM</TabsTrigger>
        </TabsList>

        <TabsContent value="pmg" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Pipeline Value" value={`$${totalValue.toLocaleString()}`} icon={DollarSign} accent />
            <MetricCard label="Weighted Revenue" value={`$${Math.round(weightedValue).toLocaleString()}`} icon={TrendingUp} />
            <MetricCard label="Active Deals" value={activeDeals.length} icon={Briefcase} />
            <MetricCard label="Avg Probability" value={`${activeDeals.length ? Math.round(activeDeals.reduce((s: number, o: any) => s + (o.probability ?? 0), 0) / activeDeals.length) : 0}%`} icon={Clock} />
            <MetricCard label="Stale Deals" value={staleDeals.length} icon={AlertTriangle} warning={staleDeals.length > 0} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-full bg-muted/20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">
              {stages.slice(0, 4).map(stage => {
                const stageOpps = oppList.filter((o: any) => o.stage === stage);
                const stageValue = stageOpps.reduce((s: number, o: any) => s + (o.value ?? 0), 0);

                return (
                  <div key={stage} className="space-y-3">
                    <div className={`flex items-center justify-between pb-2 border-b-2 ${stageColors[stage]}`}>
                      <div>
                        <h3 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground">{stageLabels[stage]}</h3>
                        <p className="text-[10px] text-muted-foreground/60">${stageValue.toLocaleString()}</p>
                      </div>
                      <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-medium">{stageOpps.length}</span>
                    </div>

                    <div className="space-y-2">
                      {stageOpps.map((opp: any) => {
                        const isStale = staleDeals.includes(opp);
                        return (
                          <motion.div key={opp.id} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
                            <Card
                              className={`bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all cursor-pointer group ${isStale ? 'border-yellow-500/30' : ''}`}
                              onClick={() => setSelectedOpp(opp)}
                            >
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="font-medium text-sm leading-tight">{opp.title}</div>
                                  {isStale && <AlertTriangle className="h-3 w-3 text-yellow-400 shrink-0 mt-0.5" />}
                                </div>
                                <p className="text-[10px] text-muted-foreground">{opp.companyName}</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-muted-foreground">{opp.probability}% likely</span>
                                    <span className="text-primary font-semibold">${(opp.value ?? 0).toLocaleString()}</span>
                                  </div>
                                  <Progress value={opp.probability ?? 0} className="h-1" />
                                </div>
                                <div className="flex items-center gap-1 text-[10px]">
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{opp.proposalStatus ?? opp.proposal_status ?? 'pending'}</Badge>
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 capitalize">{opp.serviceType ?? opp.service_type}</Badge>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span>View details</span>
                                  <ChevronRight className="h-3 w-3" />
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                      {stageOpps.length === 0 && (
                        <div className="p-6 border border-dashed border-border/50 rounded-lg text-center text-[10px] text-muted-foreground bg-background/20">
                          No deals in {stageLabels[stage]}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="client" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold">Client CRM</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Client-facing CRM instances for deployed client pipelines. Supports PMG Internal CRM, GoHighLevel, and HubSpot integration modes.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge variant="outline">PMG Internal CRM</Badge>
                <Badge variant="outline">GoHighLevel</Badge>
                <Badge variant="outline">HubSpot</Badge>
              </div>
              <Button variant="outline" className="mt-6">
                <Plus className="h-4 w-4 mr-2" />
                Create Client Instance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedOpp && (
        <DealDetailModal opp={selectedOpp} onClose={() => setSelectedOpp(null)} communications={commList} tasks={taskList} />
      )}
    </motion.div>
  );
}

function MetricCard({ label, value, icon: Icon, accent, warning }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className={`text-lg font-bold ${accent ? 'text-primary' : warning ? 'text-yellow-400' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewDealDialog({ companies }: { companies: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Deal Title</Label>
            <Input placeholder="e.g., CompanyName - Service Type" className="bg-background/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select defaultValue="discovery">
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.slice(0, 4).map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deal Value ($)</Label>
              <Input type="number" placeholder="50000" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Win Probability (%)</Label>
              <Input type="number" placeholder="50" className="bg-background/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select>
              <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_gen">Lead Generation</SelectItem>
                <SelectItem value="crm_ops">CRM + Sales Ops</SelectItem>
                <SelectItem value="content">Content Production</SelectItem>
                <SelectItem value="branding">Branding & Design</SelectItem>
                <SelectItem value="consulting">Strategic Consulting</SelectItem>
                <SelectItem value="full_service">Full Service Package</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90">Create Opportunity</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DealDetailModal({ opp, onClose, communications, tasks }: { opp: any; onClose: () => void; communications: any[]; tasks: any[] }) {
  const relatedComms = communications.filter((c: any) => c.opportunityId === opp.id || c.opportunity_id === opp.id);
  const relatedTasks = tasks.filter((t: any) => t.entityType === 'opportunity' && t.entityId === opp.id);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{opp.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold text-primary">${(opp.value ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Deal Value</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold">{opp.probability}%</p>
              <p className="text-[10px] text-muted-foreground">Win Probability</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold text-green-400">${Math.round((opp.value ?? 0) * (opp.probability ?? 0) / 100).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Weighted Value</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" />Stage Progression</h4>
            <div className="flex items-center gap-1">
              {stages.slice(0, 4).map((s, i) => {
                const current = stages.indexOf(opp.stage as any);
                const active = i <= current;
                return (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`h-1.5 rounded-full flex-1 transition-colors ${active ? 'bg-primary' : 'bg-muted'}`} />
                    {i < 3 && <ChevronRight className={`h-3 w-3 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              {stages.slice(0, 4).map(s => <span key={s} className={opp.stage === s ? 'text-primary font-bold' : ''}>{stageLabels[s]}</span>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Company</span>
              <p className="font-medium">{opp.companyName}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Service Type</span>
              <p className="font-medium capitalize">{opp.serviceType ?? opp.service_type}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Proposal Status</span>
              <Badge variant="outline" className="capitalize mt-0.5">{opp.proposalStatus ?? opp.proposal_status}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Owner</span>
              <p className="font-medium">{opp.owner}</p>
            </div>
          </div>

          {relatedComms.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />Communications ({relatedComms.length})</h4>
              {relatedComms.map((c: any) => (
                <div key={c.id} className="p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.subject}</p>
                    <Badge variant="secondary" className="text-[9px] capitalize">{c.type}</Badge>
                  </div>
                  {c.summary && <p className="text-xs text-muted-foreground mt-1">{c.summary}</p>}
                </div>
              ))}
            </div>
          )}

          {relatedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Tasks ({relatedTasks.length})</h4>
              {relatedTasks.map((t: any) => (
                <div key={t.id} className="p-3 rounded-lg bg-background/50 border border-border/30 flex items-center justify-between">
                  <p className="text-sm">{t.title}</p>
                  <Badge variant="outline" className="text-[9px] capitalize">{t.status?.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1"><FileText className="h-4 w-4 mr-2" />Generate Proposal</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90"><ArrowRight className="h-4 w-4 mr-2" />Advance Stage</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
