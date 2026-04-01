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
import { Megaphone, Plus, BarChart3, Calendar, Search, Eye, DollarSign, Users, MousePointerClick, TrendingUp, Sparkles } from "lucide-react";
import { useListCampaigns } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function Marketing() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const { data: campaigns, isLoading } = useListCampaigns();
  const campaignList = (campaigns ?? []) as any[];

  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);
  const totalSpent = campaignList.reduce((s: number, c: any) => s + (c.spent ?? 0), 0);
  const totalBudget = campaignList.reduce((s: number, c: any) => s + (c.budget ?? 0), 0);
  const totalImpressions = campaignList.reduce((s: number, c: any) => s + (c.impressions ?? 0), 0);
  const totalClicks = campaignList.reduce((s: number, c: any) => s + (c.clicks ?? 0), 0);
  const totalConversions = campaignList.reduce((s: number, c: any) => s + (c.conversions ?? 0), 0);
  const ctr = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0';
  const costPerLead = totalLeads ? Math.round(totalSpent / totalLeads) : 0;

  const chartData = campaignList.map((c: any) => ({
    name: c.name?.substring(0, 15),
    leads: c.leadsGenerated ?? c.leads_generated ?? 0,
    spent: c.spent ?? 0,
    conversions: c.conversions ?? 0,
  }));

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            Marketing & Campaigns
          </h1>
          <p className="text-muted-foreground mt-1">Campaign management, content calendar, channel strategy, and performance analytics.</p>
        </div>
        <NewCampaignDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <SmallMetric label="Leads Generated" value={totalLeads} accent />
        <SmallMetric label="Total Spent" value={`$${totalSpent.toLocaleString()}`} />
        <SmallMetric label="Cost/Lead" value={`$${costPerLead}`} />
        <SmallMetric label="Impressions" value={totalImpressions.toLocaleString()} />
        <SmallMetric label="CTR" value={`${ctr}%`} />
        <SmallMetric label="Conversions" value={totalConversions} accent />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Megaphone className="h-4 w-4 mr-2" />Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <BarChart3 className="h-4 w-4 mr-2" />Analytics
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Calendar className="h-4 w-4 mr-2" />Content Calendar
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Search className="h-4 w-4 mr-2" />SEO & Topics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 mt-6">
          {campaignList.map((campaign: any) => {
            const leads = campaign.leadsGenerated ?? campaign.leads_generated ?? 0;
            const budgetPct = campaign.budget ? Math.round((campaign.spent ?? 0) / campaign.budget * 100) : 0;
            return (
              <Card key={campaign.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize text-[10px]">{campaign.type}</Badge>
                        <Badge variant="secondary" className="capitalize text-[10px]">{campaign.channel}</Badge>
                        {(campaign.targetAudience ?? campaign.target_audience) && (
                          <span className="text-[10px] text-muted-foreground">Target: {campaign.targetAudience ?? campaign.target_audience}</span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 capitalize text-[10px]">{campaign.status}</Badge>
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <p className="text-sm font-bold text-primary">{leads}</p>
                      <p className="text-[9px] text-muted-foreground">Leads</p>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <p className="text-sm font-bold">{campaign.conversions ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground">Conversions</p>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <p className="text-sm font-bold">{(campaign.impressions ?? 0).toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Impressions</p>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <p className="text-sm font-bold">{(campaign.clicks ?? 0).toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Clicks</p>
                    </div>
                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <p className="text-sm font-bold">{campaign.impressions ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : '0'}%</p>
                      <p className="text-[9px] text-muted-foreground">CTR</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Budget: ${(campaign.spent ?? 0).toLocaleString()} / ${(campaign.budget ?? 0).toLocaleString()}</span>
                      <span>{budgetPct}%</span>
                    </div>
                    <Progress value={budgetPct} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Campaign Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 52%, 18%)" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(214, 65%, 8%)', border: '1px solid hsl(214, 52%, 25%)', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="leads" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Leads" />
                    <Bar dataKey="conversions" fill="hsl(214, 52%, 40%)" radius={[4, 4, 0, 0]} name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Budget Efficiency</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {campaignList.map((c: any) => {
                  const pct = c.budget ? Math.round((c.spent ?? 0) / c.budget * 100) : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 truncate">{c.name}</span>
                      <Progress value={pct} className="h-1.5 w-24" />
                      <span className="text-xs font-medium w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Channel Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(campaignList.reduce((acc: any, c: any) => { acc[c.channel] = (acc[c.channel] ?? 0) + 1; return acc; }, {})).map(([ch, count]) => (
                  <div key={ch} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30">
                    <span className="text-sm font-medium capitalize">{ch}</span>
                    <Badge variant="outline">{count as number} campaigns</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Content Calendar</CardTitle>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs"><Plus className="h-3 w-3 mr-1" />Add Content</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: 'Cybersecurity Compliance Guide', type: 'Blog Post', channel: 'Website', date: 'Apr 7', status: 'scheduled' },
                  { title: 'IT Infrastructure Webinar', type: 'Webinar', channel: 'LinkedIn + Email', date: 'Apr 12', status: 'draft' },
                  { title: 'Case Study: Financial Services', type: 'Case Study', channel: 'Website + Sales', date: 'Apr 18', status: 'in_review' },
                  { title: 'Monthly Newsletter', type: 'Email', channel: 'Email', date: 'Apr 25', status: 'scheduled' },
                  { title: 'Social Campaign: Cyber Awareness', type: 'Social', channel: 'LinkedIn + Twitter', date: 'Apr 28', status: 'draft' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center w-14 shrink-0">
                        <p className="text-xs font-bold text-primary">{item.date}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px]">{item.type}</Badge>
                          <Badge variant="secondary" className="text-[9px]">{item.channel}</Badge>
                        </div>
                      </div>
                    </div>
                    <Badge className={`text-[10px] ${item.status === 'scheduled' ? 'bg-green-500/20 text-green-400' : item.status === 'in_review' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Topic Clusters & SEO Strategy</CardTitle>
                <Button size="sm" variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />AI Generate Topics</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { cluster: 'Cybersecurity Compliance', topics: ['SOC 2 Guide', 'HIPAA Requirements', 'NIST Framework', 'PCI DSS Checklist'], authority: 72, volume: 'High' },
                  { cluster: 'IT Infrastructure', topics: ['Cloud Migration', 'Network Security', 'Disaster Recovery', 'Zero Trust Architecture'], authority: 45, volume: 'Medium' },
                  { cluster: 'Managed IT Services', topics: ['MSP vs In-House', 'IT Cost Optimization', 'Remote Work Security', 'Endpoint Management'], authority: 38, volume: 'Medium' },
                ].map((cluster, i) => (
                  <div key={i} className="p-4 rounded-lg bg-background/50 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{cluster.cluster}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">Volume: {cluster.volume}</Badge>
                        <div className="text-xs"><span className="text-muted-foreground">Authority:</span> <span className="font-bold text-primary">{cluster.authority}%</span></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cluster.topics.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                    <Progress value={cluster.authority} className="h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function SmallMetric({ label, value, accent }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`text-lg font-bold ${accent ? 'text-primary' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewCampaignDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2"><Label>Campaign Name</Label><Input placeholder="e.g., Q2 Cyber Compliance Push" className="bg-background/50" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Type</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem><SelectItem value="social">Social</SelectItem>
                  <SelectItem value="content">Content</SelectItem><SelectItem value="paid">Paid Ads</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Channel</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem><SelectItem value="email">Email</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem><SelectItem value="website">Website</SelectItem>
                  <SelectItem value="multi">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Budget ($)</Label><Input type="number" placeholder="5000" className="bg-background/50" /></div>
            <div className="space-y-2"><Label>Target Audience</Label><Input placeholder="e.g., Mid-market CTOs" className="bg-background/50" /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Campaign objectives and strategy..." className="bg-background/50" rows={3} /></div>
          <Button className="w-full bg-primary hover:bg-primary/90">Launch Campaign</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
