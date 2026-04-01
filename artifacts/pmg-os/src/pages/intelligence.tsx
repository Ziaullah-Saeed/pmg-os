import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Building2, Users, TrendingUp, Target, Shield, Search, Plus, Sparkles, Eye, ChevronRight, MapPin, Globe, Zap } from "lucide-react";
import { useListCompanies, useListContacts, useListLeads } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Intelligence() {
  const [activeTab, setActiveTab] = useState("companies");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const { data: companies } = useListCompanies();
  const { data: contacts } = useListContacts();
  const { data: leads } = useListLeads();

  const companyList = (companies ?? []) as any[];
  const contactList = (contacts ?? []) as any[];
  const leadList = (leads ?? []) as any[];

  const avgFitScore = leadList.length
    ? Math.round(leadList.reduce((sum: number, l: any) => sum + (l.fitScore ?? l.fit_score ?? 0), 0) / leadList.length)
    : 0;

  const decisionMakers = contactList.filter((c: any) => c.isDecisionMaker ?? c.is_decision_maker);

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BrainCircuit className="h-8 w-8 text-primary" />
            Intelligence Engine
          </h1>
          <p className="text-muted-foreground mt-1">Market research, ICP modeling, competitor analysis, and strategic intelligence.</p>
        </div>
        <div className="flex gap-2">
          <ICPBuilderDialog />
          <Button variant="outline"><Sparkles className="h-4 w-4 mr-2" />AI Enrich</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SmallMetric label="Companies Tracked" value={companyList.length} icon={Building2} />
        <SmallMetric label="Contacts Mapped" value={contactList.length} icon={Users} />
        <SmallMetric label="Decision Makers" value={decisionMakers.length} icon={Shield} accent />
        <SmallMetric label="Avg Fit Score" value={`${avgFitScore}%`} icon={Target} accent />
        <SmallMetric label="Active Leads" value={leadList.length} icon={TrendingUp} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="companies" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Building2 className="h-4 w-4 mr-2" />Company Intelligence
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Users className="h-4 w-4 mr-2" />Decision Maker Map
          </TabsTrigger>
          <TabsTrigger value="icp" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Target className="h-4 w-4 mr-2" />ICP Analysis
          </TabsTrigger>
          <TabsTrigger value="competitors" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Eye className="h-4 w-4 mr-2" />Competitor Watch
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4 mt-6">
          {companyList.map((company: any) => (
            <motion.div key={company.id} whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }}>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedCompany(company)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {company.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base">{company.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Globe className="h-3 w-3" />{company.industry}
                            <MapPin className="h-3 w-3 ml-1" />{company.location}
                            <span className="ml-1">{company.size} employees</span>
                          </div>
                        </div>
                      </div>
                      {(company.painPoints ?? company.pain_points) && (
                        <div className="ml-13 p-2 rounded-md bg-orange-500/5 border border-orange-500/10">
                          <p className="text-xs text-orange-300"><span className="font-semibold">Pain Points:</span> {company.painPoints ?? company.pain_points}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{company.fitScore ?? company.fit_score}%</div>
                        <div className="text-[10px] text-muted-foreground">Fit Score</div>
                        <Progress value={company.fitScore ?? company.fit_score ?? 0} className="h-1 w-16 mt-1" />
                      </div>
                      <Badge variant={company.status === 'active_client' ? 'default' : 'secondary'} className="capitalize">
                        {company.status?.replace(/_/g, ' ')}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contactList.map((contact: any) => {
              const company = companyList.find((c: any) => c.id === contact.companyId || c.id === contact.company_id);
              const authorityLevel = contact.authorityLevel ?? contact.authority_level ?? 'unknown';
              const authorityColor = authorityLevel === 'c_level' ? 'text-primary' : authorityLevel === 'vp' ? 'text-orange-400' : authorityLevel === 'director' ? 'text-yellow-400' : 'text-muted-foreground';
              return (
                <Card key={contact.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {(contact.firstName ?? contact.first_name ?? '?').charAt(0)}{(contact.lastName ?? contact.last_name ?? '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{contact.firstName ?? contact.first_name} {contact.lastName ?? contact.last_name}</h3>
                          {(contact.isDecisionMaker ?? contact.is_decision_maker) && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px]">Decision Maker</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{contact.title}</p>
                        <p className="text-xs text-muted-foreground">{company?.name ?? 'Unknown Company'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold capitalize ${authorityColor}`}>{authorityLevel?.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-muted-foreground">Authority</p>
                        <div className="flex gap-1 mt-1">
                          {contact.email && <Badge variant="outline" className="text-[9px] px-1">Email</Badge>}
                          {contact.phone && <Badge variant="outline" className="text-[9px] px-1">Phone</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="icp" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Ideal Customer Profile — PMG Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Firmographics</h4>
                  <IcpItem label="Industry" value="IT Services, Financial Services, Healthcare, SaaS" />
                  <IcpItem label="Company Size" value="50-500 employees" />
                  <IcpItem label="Revenue" value="$5M - $100M ARR" />
                  <IcpItem label="Geography" value="United States, Canada" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Pain Signals</h4>
                  <IcpItem label="Primary" value="Cybersecurity compliance gaps" />
                  <IcpItem label="Secondary" value="IT infrastructure scaling challenges" />
                  <IcpItem label="Trigger" value="Recent breach, audit finding, growth phase" />
                  <IcpItem label="Urgency" value="Regulatory deadline or board mandate" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Decision Criteria</h4>
                  <IcpItem label="Buyer" value="CTO, CISO, VP Engineering" />
                  <IcpItem label="Budget" value="$50K - $500K annually" />
                  <IcpItem label="Timeline" value="30-90 day decision cycle" />
                  <IcpItem label="Competition" value="Accenture, Deloitte, boutique firms" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ICP Fit Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {companyList.map((c: any) => {
                  const fit = c.fitScore ?? c.fit_score ?? 0;
                  const fitColor = fit >= 80 ? 'text-green-400' : fit >= 60 ? 'text-yellow-400' : 'text-red-400';
                  return (
                    <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-border/30">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{c.name?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.industry} &bull; {c.size} employees</p>
                      </div>
                      <div className="w-32">
                        <Progress value={fit} className="h-2" />
                      </div>
                      <span className={`text-sm font-bold ${fitColor} w-12 text-right`}>{fit}%</span>
                      <Badge variant={fit >= 80 ? 'default' : 'secondary'} className="text-[10px]">{fit >= 80 ? 'Strong Fit' : fit >= 60 ? 'Moderate' : 'Weak'}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4 mt-6">
          {[
            { name: 'Accenture Security', strength: 'Global brand, enterprise relationships', weakness: 'Expensive, slow engagement', threat: 'High', segments: ['Enterprise', 'Government'] },
            { name: 'Deloitte Cyber', strength: 'Compliance expertise, audit integration', weakness: 'Complex procurement, long timelines', threat: 'Medium', segments: ['Financial Services', 'Healthcare'] },
            { name: 'CrowdStrike Services', strength: 'Tech-first, strong detection platform', weakness: 'Limited managed services depth', threat: 'Medium', segments: ['Technology', 'SaaS'] },
            { name: 'Boutique IT Firms', strength: 'Price competitive, local presence', weakness: 'Limited scale, narrow expertise', threat: 'Low', segments: ['SMB', 'Local'] },
          ].map((comp, i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm">{comp.name.charAt(0)}</div>
                      <div>
                        <h3 className="font-semibold">{comp.name}</h3>
                        <div className="flex gap-1 mt-0.5">
                          {comp.segments.map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 rounded bg-green-500/5 border border-green-500/10">
                        <p className="text-[10px] font-semibold text-green-400 mb-0.5">Strength</p>
                        <p className="text-xs text-muted-foreground">{comp.strength}</p>
                      </div>
                      <div className="p-2 rounded bg-red-500/5 border border-red-500/10">
                        <p className="text-[10px] font-semibold text-red-400 mb-0.5">Weakness</p>
                        <p className="text-xs text-muted-foreground">{comp.weakness}</p>
                      </div>
                    </div>
                  </div>
                  <Badge className={`shrink-0 ml-4 ${comp.threat === 'High' ? 'bg-red-500/20 text-red-400' : comp.threat === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                    {comp.threat} Threat
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {selectedCompany && <CompanyDetailModal company={selectedCompany} contacts={contactList} leads={leadList} onClose={() => setSelectedCompany(null)} />}
    </motion.div>
  );
}

function SmallMetric({ label, value, icon: Icon, accent }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className={`text-xl font-bold ${accent ? 'text-primary' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function IcpItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-background/50 border border-border/30">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className="text-xs">{value}</p>
    </div>
  );
}

function ICPBuilderDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Build ICP</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />ICP Builder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Target Industry</Label>
            <Input placeholder="e.g., Financial Services, Healthcare" className="bg-background/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-50">1-50</SelectItem>
                  <SelectItem value="50-200">50-200</SelectItem>
                  <SelectItem value="200-500">200-500</SelectItem>
                  <SelectItem value="500+">500+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Revenue Range</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5m">$1M - $5M</SelectItem>
                  <SelectItem value="5-25m">$5M - $25M</SelectItem>
                  <SelectItem value="25-100m">$25M - $100M</SelectItem>
                  <SelectItem value="100m+">$100M+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Primary Pain Points</Label>
            <Textarea placeholder="Describe the primary pain points this ICP experiences..." className="bg-background/50" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Decision Maker Titles</Label>
            <Input placeholder="e.g., CTO, CISO, VP Engineering" className="bg-background/50" />
          </div>
          <div className="space-y-2">
            <Label>Buying Triggers</Label>
            <Textarea placeholder="What events trigger a purchase decision?" className="bg-background/50" rows={2} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1"><Sparkles className="h-4 w-4 mr-2" />AI Generate</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90">Save ICP</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompanyDetailModal({ company, contacts, leads, onClose }: any) {
  const companyContacts = contacts.filter((c: any) => (c.companyId ?? c.company_id) === company.id);
  const companyLeads = leads.filter((l: any) => (l.companyId ?? l.company_id) === company.id);
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">{company.name?.charAt(0)}</div>
            <div>
              <div>{company.name}</div>
              <div className="text-sm font-normal text-muted-foreground">{company.industry} &bull; {company.location}</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold text-primary">{company.fitScore ?? company.fit_score}%</p>
              <p className="text-[10px] text-muted-foreground">Fit Score</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold">{company.size}</p>
              <p className="text-[10px] text-muted-foreground">Employees</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant={company.status === 'active_client' ? 'default' : 'secondary'} className="capitalize">{company.status?.replace(/_/g, ' ')}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Status</p>
            </div>
          </div>

          {(company.painPoints ?? company.pain_points) && (
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
              <p className="text-xs font-semibold text-orange-400 mb-1">Identified Pain Points</p>
              <p className="text-sm text-muted-foreground">{company.painPoints ?? company.pain_points}</p>
            </div>
          )}

          {companyContacts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Key Contacts</h4>
              <div className="space-y-2">
                {companyContacts.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{c.firstName ?? c.first_name} {c.lastName ?? c.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.title}</p>
                    </div>
                    <div className="flex gap-1">
                      {(c.isDecisionMaker ?? c.is_decision_maker) && <Badge className="bg-primary/20 text-primary text-[9px]">DM</Badge>}
                      <Badge variant="outline" className="text-[9px] capitalize">{(c.authorityLevel ?? c.authority_level)?.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1"><Sparkles className="h-4 w-4 mr-2" />AI Enrich</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90"><Zap className="h-4 w-4 mr-2" />Create Outreach</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
