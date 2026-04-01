import { useState } from "react";
import { useListCampaigns } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
  Megaphone, Plus, BarChart3, Calendar, Search, DollarSign,
  Users, TrendingUp, Sparkles, MousePointerClick
} from "lucide-react";

const chartTooltipStyle = { backgroundColor: "hsl(214, 65%, 6%)", border: "1px solid hsl(214, 45%, 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210, 40%, 90%)" };

const tabs = [
  { id: "campaigns", label: "Campaigns", icon: <Megaphone className="h-3.5 w-3.5" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "calendar", label: "Content Calendar", icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: "seo", label: "SEO & Topics", icon: <Search className="h-3.5 w-3.5" /> },
];

export default function Marketing() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const { data: campaigns } = useListCampaigns();
  const campaignList = (campaigns ?? []) as any[];

  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);
  const totalSpent = campaignList.reduce((s: number, c: any) => s + (c.spent ?? 0), 0);
  const totalImpressions = campaignList.reduce((s: number, c: any) => s + (c.impressions ?? 0), 0);
  const totalClicks = campaignList.reduce((s: number, c: any) => s + (c.clicks ?? 0), 0);
  const totalConversions = campaignList.reduce((s: number, c: any) => s + (c.conversions ?? 0), 0);
  const ctr = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";
  const costPerLead = totalLeads ? Math.round(totalSpent / totalLeads) : 0;

  const chartData = campaignList.map((c: any) => ({
    name: c.name?.substring(0, 15),
    leads: c.leadsGenerated ?? c.leads_generated ?? 0,
    conversions: c.conversions ?? 0,
  }));

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Marketing & Campaigns"
        subtitle="Campaign management, content calendar, channel strategy, and performance analytics"
        icon={<Megaphone className="h-5 w-5" />}
        actions={<Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg"><Plus className="h-4 w-4 mr-2" />New Campaign</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KpiCard label="Leads Generated" value={totalLeads} icon={<Users className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Total Spent" value={`$${totalSpent.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard label="Cost/Lead" value={`$${costPerLead}`} icon={<TrendingUp className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Impressions" value={totalImpressions.toLocaleString()} icon={<Megaphone className="h-4 w-4" />} />
        <KpiCard label="CTR" value={`${ctr}%`} icon={<MousePointerClick className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Conversions" value={totalConversions} icon={<TrendingUp className="h-4 w-4" />} accent="success" />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "campaigns" && (
          <div className="space-y-3">
            {campaignList.map((campaign: any) => {
              const leads = campaign.leadsGenerated ?? campaign.leads_generated ?? 0;
              const budgetPct = campaign.budget ? Math.round(((campaign.spent ?? 0) / campaign.budget) * 100) : 0;
              return (
                <GlassCard key={campaign.id} variant="interactive" className="cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{campaign.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize text-[10px]">{campaign.type}</Badge>
                        <Badge variant="outline" className="capitalize text-[10px]">{campaign.channel}</Badge>
                        {(campaign.targetAudience ?? campaign.target_audience) && (
                          <span className="text-[10px] text-muted-foreground">Target: {campaign.targetAudience ?? campaign.target_audience}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge variant="active" label={campaign.status} />
                  </div>
                  <div className="grid grid-cols-5 gap-3 text-center mb-3">
                    {[
                      { v: leads, l: "Leads", accent: true },
                      { v: campaign.conversions ?? 0, l: "Conversions" },
                      { v: (campaign.impressions ?? 0).toLocaleString(), l: "Impressions" },
                      { v: (campaign.clicks ?? 0).toLocaleString(), l: "Clicks" },
                      { v: campaign.impressions ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) + "%" : "0%", l: "CTR" },
                    ].map((m) => (
                      <div key={m.l} className="p-2 rounded-lg glass-surface">
                        <p className={`text-sm font-bold ${m.accent ? "gradient-text-crimson" : ""}`}>{m.v}</p>
                        <p className="text-[9px] text-muted-foreground">{m.l}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Budget: ${(campaign.spent ?? 0).toLocaleString()} / ${(campaign.budget ?? 0).toLocaleString()}</span>
                      <span>{budgetPct}%</span>
                    </div>
                    <div className="confidence-bar"><div className="confidence-fill" style={{ width: `${budgetPct}%` }} /></div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-2"><h3 className="text-sm font-semibold">Campaign Performance Comparison</h3></div>
              <div className="px-2 pb-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 45%, 15%)" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(215, 20%, 40%)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215, 20%, 40%)" fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="leads" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Leads" />
                    <Bar dataKey="conversions" fill="hsl(214, 60%, 50%)" radius={[4, 4, 0, 0]} name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "calendar" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Content Calendar</h3>
              <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="h-3 w-3 mr-1" />Add Content</Button>
            </div>
            <div className="px-5 pb-4 space-y-2">
              {[
                { title: "Cybersecurity Compliance Guide", type: "Blog Post", channel: "Website", date: "Apr 7", status: "scheduled" },
                { title: "IT Infrastructure Webinar", type: "Webinar", channel: "LinkedIn + Email", date: "Apr 12", status: "draft" },
                { title: "Case Study: Financial Services", type: "Case Study", channel: "Website + Sales", date: "Apr 18", status: "in_review" },
                { title: "Monthly Newsletter", type: "Email", channel: "Email", date: "Apr 25", status: "scheduled" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center w-14 shrink-0"><p className="text-xs font-bold text-crimson">{item.date}</p></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{item.type}</Badge>
                        <Badge variant="outline" className="text-[9px]">{item.channel}</Badge>
                      </div>
                    </div>
                  </div>
                  <StatusBadge variant={item.status === "scheduled" ? "active" : item.status === "in_review" ? "awaiting-review" : "draft"} label={item.status.replace("_", " ")} />
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === "seo" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Topic Clusters & SEO Strategy</h3>
              <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"><Sparkles className="h-3 w-3 mr-1" />AI Generate Topics</Button>
            </div>
            <div className="px-5 pb-4 space-y-3">
              {[
                { cluster: "Cybersecurity Compliance", topics: ["SOC 2 Guide", "HIPAA Requirements", "NIST Framework", "PCI DSS Checklist"], authority: 72, volume: "High" },
                { cluster: "IT Infrastructure", topics: ["Cloud Migration", "Network Security", "Disaster Recovery", "Zero Trust Architecture"], authority: 45, volume: "Medium" },
                { cluster: "Managed IT Services", topics: ["MSP vs In-House", "IT Cost Optimization", "Remote Work Security", "Endpoint Management"], authority: 38, volume: "Medium" },
              ].map((cluster, i) => (
                <div key={i} className="p-4 rounded-lg glass-surface space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{cluster.cluster}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">Volume: {cluster.volume}</Badge>
                      <span className="text-xs font-bold gradient-text-crimson">{cluster.authority}%</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cluster.topics.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                  <ConfidenceMeter score={cluster.authority} />
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}
