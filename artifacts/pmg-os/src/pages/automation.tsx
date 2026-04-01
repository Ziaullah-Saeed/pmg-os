import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  useAutomationRules, useAutomationTriggers, useAutomationActions,
  useCreateAutomationRule, useToggleAutomationRule, useDeleteAutomationRule,
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Plus, Play, Pause, Trash2, Settings, ArrowRight,
  Bot, Loader2, CheckCircle2, XCircle, Clock, Workflow
} from "lucide-react";

const tabs = [
  { id: "rules", label: "Automation Rules", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "tools", label: "Tool Orchestration", icon: <Settings className="h-3.5 w-3.5" /> },
  { id: "channels", label: "Channel Intelligence", icon: <Workflow className="h-3.5 w-3.5" /> },
];

const toolIntegrations = [
  { name: "Apollo.io", category: "Prospecting", status: "available", desc: "Lead enrichment & contact data" },
  { name: "Clay", category: "Data Enrichment", status: "available", desc: "Waterfall data enrichment" },
  { name: "ZoomInfo", category: "Intelligence", status: "available", desc: "Company & contact intelligence" },
  { name: "Clearbit", category: "Enrichment", status: "available", desc: "Business data APIs" },
  { name: "Outreach.io", category: "Sales Engagement", status: "available", desc: "Sales engagement platform" },
  { name: "SalesLoft", category: "Sales Engagement", status: "available", desc: "Revenue workflow platform" },
  { name: "LinkedIn Sales Navigator", category: "Social Selling", status: "available", desc: "Social selling & prospecting" },
  { name: "Calendly", category: "Scheduling", status: "available", desc: "Meeting scheduling" },
];

const channels = [
  { name: "Website", leads: 12, conversion: 8.5, revenue: 45000, trend: "up" },
  { name: "LinkedIn", leads: 8, conversion: 12.3, revenue: 32000, trend: "up" },
  { name: "Referral", leads: 5, conversion: 22.1, revenue: 78000, trend: "up" },
  { name: "Cold Outreach", leads: 15, conversion: 3.2, revenue: 18000, trend: "down" },
  { name: "Conference", leads: 3, conversion: 15.7, revenue: 25000, trend: "stable" },
  { name: "Inbound", leads: 7, conversion: 11.4, revenue: 29000, trend: "up" },
  { name: "Partner", leads: 4, conversion: 18.9, revenue: 42000, trend: "up" },
];

export default function Automation() {
  const [activeTab, setActiveTab] = useState("rules");
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", trigger: "", actions: [] as string[] });
  const { toast } = useToast();
  const { data: rulesData } = useAutomationRules();
  const { data: triggersData } = useAutomationTriggers();
  const { data: actionsData } = useAutomationActions();
  const createRule = useCreateAutomationRule();
  const toggleRule = useToggleAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const rules = rulesData?.rules ?? [];
  const triggers = triggersData?.triggers ?? [];
  const actions = actionsData?.actions ?? [];
  const enabledCount = rules.filter(r => r.enabled).length;
  const totalExecutions = rules.reduce((s, r) => s + (r.executionCount ?? 0), 0);

  const handleCreate = async () => {
    if (!newRule.name || !newRule.trigger) return;
    try {
      await createRule.mutateAsync({
        name: newRule.name,
        trigger: { event: newRule.trigger, conditions: {} },
        actions: newRule.actions.map(a => ({ type: a, config: {} })),
        enabled: true,
      });
      toast({ title: "Rule Created" });
      setShowCreate(false);
      setNewRule({ name: "", trigger: "", actions: [] });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Automation & Intelligence"
        subtitle="Automation rules, tool orchestration, and channel intelligence"
        icon={<Zap className="h-5 w-5" />}
        actions={
          <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />New Rule
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Rules" value={rules.length} icon={<Zap className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Active Rules" value={enabledCount} icon={<Play className="h-4 w-4" />} accent="success" />
        <KpiCard label="Total Executions" value={totalExecutions} icon={<CheckCircle2 className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Tools Available" value={toolIntegrations.length} icon={<Settings className="h-4 w-4" />} accent="gold" />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "rules" && (
          <div className="space-y-3">
            {rules.map((rule) => (
              <GlassCard key={rule.id} variant="interactive">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${rule.enabled ? "bg-green-500/10" : "bg-white/5"}`}>
                      <Zap className={`h-4 w-4 ${rule.enabled ? "text-green-400" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px]">{rule.trigger?.event}</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {(rule.actions ?? []).map((a: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[9px]">{a.type}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{rule.executionCount ?? 0} executions</span>
                        {rule.lastExecuted && <span>Last: {new Date(rule.lastExecuted).toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={rule.enabled ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-white/5 text-muted-foreground"}>
                      {rule.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => toggleRule.mutate(rule.id, { onSuccess: () => toast({ title: rule.enabled ? "Rule Disabled" : "Rule Enabled" }) })}
                    >
                      {rule.enabled ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-green-400" />}
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      onClick={() => { if (confirm("Delete this rule?")) deleteRule.mutate(rule.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
            {rules.length === 0 && (
              <GlassCard className="py-12 flex flex-col items-center gap-3">
                <Bot className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-lg font-semibold">No Automation Rules</p>
                <p className="text-sm text-muted-foreground">Create rules to automate lead scoring, routing, and notifications.</p>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === "tools" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toolIntegrations.map((tool) => (
              <GlassCard key={tool.name} variant="interactive">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
                    <Badge variant="outline" className="text-[9px] mt-1">{tool.category}</Badge>
                  </div>
                  <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg">Configure</Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {activeTab === "channels" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Revenue" value={`$${channels.reduce((s, c) => s + c.revenue, 0).toLocaleString()}`} icon={<CheckCircle2 className="h-4 w-4" />} accent="crimson" />
              <KpiCard label="Top Channel" value={[...channels].sort((a, b) => b.conversion - a.conversion)[0]?.name ?? "N/A"} icon={<Zap className="h-4 w-4" />} accent="success" />
              <KpiCard label="Avg Conversion" value={`${(channels.reduce((s, c) => s + c.conversion, 0) / channels.length).toFixed(1)}%`} icon={<Bot className="h-4 w-4" />} accent="blue" />
              <KpiCard label="Total Leads" value={channels.reduce((s, c) => s + c.leads, 0)} icon={<Clock className="h-4 w-4" />} accent="gold" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Channel Performance Matrix</h3>
                    <Badge variant="outline" className="text-[10px]">{channels.length} Sources</Badge>
                  </div>
                  <div className="px-5 pb-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-muted-foreground uppercase tracking-wider">
                          <th className="text-left py-2 px-2">Channel</th>
                          <th className="text-right py-2 px-2">Leads</th>
                          <th className="text-right py-2 px-2">Conversion %</th>
                          <th className="text-right py-2 px-2">Revenue</th>
                          <th className="text-right py-2 px-2">Quality Score</th>
                          <th className="text-center py-2 px-2">Trend</th>
                          <th className="text-center py-2 px-2">Sync</th>
                        </tr>
                      </thead>
                      <tbody>
                        {channels.map((ch) => {
                          const quality = Math.min(100, Math.round(ch.conversion * 4 + (ch.revenue / 1000)));
                          return (
                            <tr key={ch.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="py-2.5 px-2 font-medium">{ch.name}</td>
                              <td className="py-2.5 px-2 text-right tabular-nums">{ch.leads}</td>
                              <td className="py-2.5 px-2 text-right tabular-nums">{ch.conversion}%</td>
                              <td className="py-2.5 px-2 text-right tabular-nums font-medium">${ch.revenue.toLocaleString()}</td>
                              <td className="py-2.5 px-2 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div className={`h-full rounded-full ${quality > 75 ? "bg-green-400" : quality > 50 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${quality}%` }} />
                                  </div>
                                  <span className="text-[9px] tabular-nums w-6">{quality}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <Badge className={`text-[9px] ${ch.trend === "up" ? "bg-green-500/10 text-green-400" : ch.trend === "down" ? "bg-red-500/10 text-red-400" : "bg-white/5 text-muted-foreground"}`}>
                                  {ch.trend === "up" ? "↑" : ch.trend === "down" ? "↓" : "→"}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mx-auto" title="Healthy" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>

              <div className="space-y-4">
                <GlassCard glow="crimson" className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-crimson" />
                    <h3 className="text-xs font-semibold">Source Attribution Map</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {[...channels].sort((a, b) => b.revenue - a.revenue).map((ch) => {
                      const totalRev = channels.reduce((s, c) => s + c.revenue, 0);
                      const pct = Math.round((ch.revenue / totalRev) * 100);
                      return (
                        <div key={ch.name} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span>{ch.name}</span>
                            <span className="font-medium">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-crimson to-red-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-info" />
                    <h3 className="text-xs font-semibold">AI Recommendations</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {[
                      { action: "Increase Referral investment — highest conversion (22.1%)", priority: "high" },
                      { action: "Re-evaluate Cold Outreach — low conversion (3.2%)", priority: "high" },
                      { action: "Scale LinkedIn presence — strong uptrend", priority: "medium" },
                      { action: "Add Partner co-marketing to amplify 18.9% conversion", priority: "medium" },
                      { action: "Test webinar channel — conference converts well (15.7%)", priority: "low" },
                    ].map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg glass-surface">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${rec.priority === "high" ? "bg-red-400" : rec.priority === "medium" ? "bg-yellow-400" : "bg-blue-400"}`} />
                        <p className="text-[11px]">{rec.action}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold">Manual Integration Queue</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {[
                      { source: "Trade Show Leads (CSV)", count: 45, status: "pending" },
                      { source: "Webinar Attendees", count: 23, status: "pending" },
                      { source: "Partner Referral List", count: 12, status: "imported" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                        <div>
                          <p className="text-[11px] font-medium">{item.source}</p>
                          <p className="text-[9px] text-muted-foreground">{item.count} records</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] ${item.status === "imported" ? "text-green-400 border-green-500/30" : ""}`}>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                    <Button className="w-full btn-glass text-foreground text-xs rounded-lg mt-1">
                      <Plus className="h-3 w-3 mr-1" />Import Manual Source
                    </Button>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[500px] bg-[hsl(214,65%,6%)] border-white/10">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Zap className="h-4 w-4" />New Automation Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-slate-300">Rule Name *</Label><Input value={newRule.name} onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="Auto-score new leads" /></div>
            <div className="space-y-2"><Label className="text-slate-300">Trigger Event *</Label>
              <Select value={newRule.trigger} onValueChange={v => setNewRule(r => ({ ...r, trigger: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select trigger..." /></SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {triggers.map(t => <SelectItem key={t.event} value={t.event} className="text-white">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-slate-300">Actions</Label>
              <div className="flex flex-wrap gap-2">
                {actions.map(a => (
                  <button key={a.type} onClick={() => setNewRule(r => ({ ...r, actions: r.actions.includes(a.type) ? r.actions.filter(x => x !== a.type) : [...r.actions, a.type] }))}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${newRule.actions.includes(a.type) ? "border-crimson/40 bg-crimson/10 text-crimson-400" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancel</Button></DialogClose>
            <Button onClick={handleCreate} disabled={createRule.isPending || !newRule.name || !newRule.trigger} className="bg-crimson-600 hover:bg-crimson-700 text-white">
              {createRule.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
