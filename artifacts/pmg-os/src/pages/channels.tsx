import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useChannels, useChannelAnalytics, useConnectChannel, useDisconnectChannel,
  useReconnectChannel, useTriggerChannelSync, useChannelForms, useCreateForm,
  useDeleteFormMut, useLandingPages, useCreateLandingPage, useDeleteLandingPageMut,
  useAttributionSummary, useManualImports, useStartImport, useProcessImport,
  useReconcileImport,
} from "@/hooks/use-api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Radio, Globe, Linkedin, Facebook, Instagram, Twitter, Youtube, Mail, Phone, FileText,
  Calendar, Megaphone, Users, Wifi, WifiOff, RefreshCw, Upload, Download, Link2,
  Unplug, PlugZap, Activity, Target, TrendingUp, Eye, ChevronRight, Plus,
  ArrowRightLeft, CheckCircle2, AlertTriangle, Database, Hash, Video
} from "lucide-react";

const chartTooltipStyle = { backgroundColor: "hsl(214, 65%, 6%)", border: "1px solid hsl(214, 45%, 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210, 40%, 90%)" };
const PIE_COLORS = ["hsl(0,72%,51%)", "hsl(214,60%,50%)", "hsl(142,60%,45%)", "hsl(38,90%,55%)", "hsl(280,60%,55%)"];

const tabs = [
  { id: "overview", label: "Channel Overview", icon: <Radio className="h-3.5 w-3.5" /> },
  { id: "manual", label: "Manual Integration", icon: <Upload className="h-3.5 w-3.5" /> },
  { id: "attribution", label: "Attribution", icon: <Target className="h-3.5 w-3.5" /> },
  { id: "forms_pages", label: "Forms & Pages", icon: <FileText className="h-3.5 w-3.5" /> },
];

const platformIcons: Record<string, any> = {
  web: Globe, linkedin: Linkedin, meta: Facebook, twitter: Twitter, google: Youtube,
  tiktok: Video, email: Mail, phone: Phone, webinar: Megaphone, calendar: Calendar,
  referral: Users, direct: Users,
};

const statusColors: Record<string, string> = {
  connected: "text-emerald-400", disconnected: "text-muted-foreground",
  reconnecting: "text-amber-400", error: "text-crimson",
};

export default function Channels() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [formData, setFormData] = useState({ name: "", formType: "contact", channelId: "" });
  const [pageData, setPageData] = useState({ name: "", pageType: "landing", url: "", channelId: "" });
  const [importData, setImportData] = useState({ entityType: "leads", channelId: "", csvText: "" });
  const [reconcileNotes, setReconcileNotes] = useState("");

  const { data: channels } = useChannels();
  const { data: analytics } = useChannelAnalytics();
  const { data: forms } = useChannelForms();
  const { data: pages } = useLandingPages();
  const { data: attribution } = useAttributionSummary();
  const { data: imports } = useManualImports();
  const connectChannel = useConnectChannel();
  const disconnectChannel = useDisconnectChannel();
  const reconnectChannel = useReconnectChannel();
  const triggerSync = useTriggerChannelSync();
  const createForm = useCreateForm();
  const deleteForm = useDeleteFormMut();
  const createPage = useCreateLandingPage();
  const deletePage = useDeleteLandingPageMut();
  const startImport = useStartImport();
  const processImport = useProcessImport();
  const reconcileImport = useReconcileImport();
  const { toast } = useToast();

  const channelList = (channels ?? []) as any[];
  const filteredChannels = filterCategory === "all" ? channelList : channelList.filter((c: any) => c.category === filterCategory);

  function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
      return row;
    });
    return { headers, rows };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channels & Integrations"
        subtitle="Manage all inbound sources, social platforms, and manual integrations"
        icon={<Radio className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">{analytics?.connectedChannels ?? 0}/{analytics?.totalChannels ?? 0} Connected</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Channels" value={analytics?.totalChannels ?? 0} icon={<Radio className="h-4 w-4" />} />
        <KpiCard label="Connected" value={analytics?.connectedChannels ?? 0} icon={<Wifi className="h-4 w-4" />} accent="success" />
        <KpiCard label="Total Leads" value={analytics?.totalLeads ?? 0} icon={<Users className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Conversions" value={analytics?.totalConversions ?? 0} icon={<Target className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Monthly Leads" value={analytics?.monthlyLeads ?? 0} icon={<TrendingUp className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Conv. Rate" value={`${analytics?.overallConversionRate ?? 0}%`} icon={<Activity className="h-4 w-4" />} />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter:</span>
            {["all", "inbound", "social", "communication", "events", "advertising"].map(cat => (
              <Button key={cat} size="sm" variant={filterCategory === cat ? "default" : "outline"}
                className={`h-6 text-[10px] rounded-full ${filterCategory === cat ? "bg-crimson hover:bg-crimson/80 text-white" : "btn-glass text-foreground"}`}
                onClick={() => setFilterCategory(cat)}>
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredChannels.map((ch: any) => {
              const Icon = platformIcons[ch.platform] ?? Globe;
              return (
                <motion.div key={ch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <GlassCard className="p-4 hover:border-crimson/30 transition-colors cursor-pointer" onClick={() => setSelectedChannel(ch)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${ch.status === "connected" ? "bg-emerald-500/10" : "bg-white/5"}`}>
                          <Icon className={`h-4 w-4 ${statusColors[ch.status] ?? "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold truncate max-w-[150px]">{ch.name}</h4>
                          <span className="text-[10px] text-muted-foreground">{ch.platform}</span>
                        </div>
                      </div>
                      <StatusBadge variant={ch.status === "connected" ? "success" : ch.status === "reconnecting" ? "warning" : "inactive"} label={ch.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xs font-semibold">{ch.totalLeads}</div>
                        <div className="text-[9px] text-muted-foreground">Leads</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{ch.totalConversions}</div>
                        <div className="text-[9px] text-muted-foreground">Conv</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{ch.monthlyLeads}</div>
                        <div className="text-[9px] text-muted-foreground">Monthly</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                      <Badge variant="outline" className="text-[9px]">{ch.integrationMode}</Badge>
                      <div className="flex gap-1">
                        {ch.status === "connected" ? (
                          <>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); triggerSync.mutate(ch.id, { onSuccess: () => toast({ title: "Sync triggered" }), onError: () => toast({ title: "Sync failed", variant: "destructive" }) }); }}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-crimson" onClick={(e) => { e.stopPropagation(); disconnectChannel.mutate(ch.id, { onSuccess: () => toast({ title: "Disconnected" }), onError: () => toast({ title: "Disconnect failed", variant: "destructive" }) }); }}>
                              <Unplug className="h-3 w-3" />
                            </Button>
                          </>
                        ) : ch.status === "disconnected" ? (
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-emerald-400" onClick={(e) => { e.stopPropagation(); connectChannel.mutate({ id: ch.id, mode: "manual" }, { onSuccess: () => toast({ title: "Connected" }), onError: () => toast({ title: "Connect failed", variant: "destructive" }) }); }}>
                            <PlugZap className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-amber-400" onClick={(e) => { e.stopPropagation(); reconnectChannel.mutate(ch.id, { onSuccess: () => toast({ title: "Reconnecting..." }), onError: () => toast({ title: "Reconnect failed", variant: "destructive" }) }); }}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-3">Leads by Category</h3>
              {analytics?.byCategory && analytics.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 45%, 15%)" />
                    <XAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(210,40%,60%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(210,40%,60%)" }} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="leads" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="conversions" fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No lead data yet. Connect channels to start tracking.</p>
              )}
            </GlassCard>

            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-3">Channels by Platform</h3>
              {analytics?.byPlatform && analytics.byPlatform.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={analytics.byPlatform} dataKey="channels" nameKey="platform" cx="50%" cy="50%" outerRadius={70} label={({ platform, channels }: any) => `${platform} (${channels})`}>
                      {analytics.byPlatform.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No platform data yet</p>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === "manual" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">CSV Import</h3>
                  <Button size="sm" className="bg-crimson hover:bg-crimson/80 text-white h-7 text-xs" onClick={() => setShowImport(true)}>
                    <Upload className="h-3 w-3 mr-1" /> New Import
                  </Button>
                </div>
                <div className="space-y-2">
                  {(imports ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No imports yet. Start a CSV import to bring in leads, contacts, or companies.</p>}
                  {(imports ?? []).map((imp: any) => (
                    <div key={imp.id} className="flex items-center justify-between py-2 px-3 rounded bg-white/[0.03] text-xs">
                      <div className="flex items-center gap-3">
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{imp.fileName ?? `Import #${imp.id}`}</span>
                          <span className="text-muted-foreground ml-2">{imp.entityType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {imp.successRows > 0 && <span className="text-emerald-400">{imp.successRows} ok</span>}
                          {imp.errorRows > 0 && <span className="text-crimson">{imp.errorRows} err</span>}
                          {imp.skippedRows > 0 && <span className="text-muted-foreground">{imp.skippedRows} skip</span>}
                        </div>
                        <StatusBadge variant={imp.status === "completed" ? "success" : imp.status === "failed" ? "critical" : "warning"} label={imp.status} />
                        {imp.status === "completed" && !imp.reconciliationStatus && (
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] text-amber-400" onClick={() => {
                            reconcileImport.mutate({ id: imp.id, notes: "Reviewed and approved" }, { onSuccess: () => toast({ title: "Reconciled" }) });
                          }}>Reconcile</Button>
                        )}
                        {imp.reconciliationStatus && <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30">Reconciled</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">Manual Integration Capabilities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { icon: Upload, label: "CSV Import", desc: "Bulk import leads, contacts, companies" },
                    { icon: Download, label: "CSV Export", desc: "Export data for external tools" },
                    { icon: ArrowRightLeft, label: "Field Mapping", desc: "Map CSV columns to system fields" },
                    { icon: RefreshCw, label: "Manual Sync", desc: "Trigger sync on any channel" },
                    { icon: CheckCircle2, label: "Reconciliation", desc: "Verify and approve imported data" },
                    { icon: Target, label: "Attribution Fix", desc: "Correct lead source attribution" },
                    { icon: Link2, label: "Reconnect", desc: "Re-establish broken connections" },
                    { icon: Hash, label: "Dedup Check", desc: "Skip duplicates during import" },
                    { icon: Eye, label: "Dry Run", desc: "Preview before committing" },
                  ].map((cap) => (
                    <div key={cap.label} className="flex items-start gap-2 p-2 rounded bg-white/[0.02]">
                      <cap.icon className="h-3.5 w-3.5 text-crimson mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-medium">{cap.label}</div>
                        <div className="text-[9px] text-muted-foreground">{cap.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-4">
              <GlassCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button size="sm" className="w-full h-8 text-xs bg-crimson hover:bg-crimson/80" onClick={() => setShowImport(true)}>
                    <Upload className="h-3 w-3 mr-1" /> Import CSV
                  </Button>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs btn-glass text-foreground">
                    <Download className="h-3 w-3 mr-1" /> Export All Leads
                  </Button>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs btn-glass text-foreground" onClick={() => {
                    const connected = channelList.filter((c: any) => c.status === "connected");
                    connected.forEach((c: any) => triggerSync.mutate(c.id));
                    toast({ title: `Syncing ${connected.length} channels` });
                  }}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Sync All Connected
                  </Button>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <h3 className="text-sm font-semibold mb-3">Supported Import Entities</h3>
                <div className="space-y-1.5 text-xs">
                  {["Leads", "Contacts", "Companies"].map(entity => (
                    <div key={entity} className="flex items-center gap-2 py-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>{entity}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {activeTab === "attribution" && (
        <div className="space-y-6">
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3">Attribution Summary (30 days)</h3>
            {(attribution ?? []).length > 0 ? (
              <div className="space-y-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={attribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 45%, 15%)" />
                    <XAxis dataKey="channelName" tick={{ fontSize: 10, fill: "hsl(210,40%,60%)" }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(210,40%,60%)" }} />
                    <RechartsTooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-4">
                  {(attribution ?? []).map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded bg-white/[0.03] text-xs">
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-crimson" />
                        <span className="font-medium">{a.channelName}</span>
                        <Badge variant="outline" className="text-[9px]">{a.touchpointType}</Badge>
                      </div>
                      <span className="font-semibold">{a.count} events</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No attribution data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Attribution events are recorded when leads enter through connected channels</p>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3">Attribution Models</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "First Touch", desc: "100% credit to first interaction", active: true },
                { name: "Last Touch", desc: "100% credit to last interaction", active: false },
                { name: "Linear", desc: "Equal credit across all touches", active: false },
                { name: "Time Decay", desc: "More credit to recent touches", active: false },
              ].map(model => (
                <div key={model.name} className={`p-3 rounded-lg border ${model.active ? "border-crimson/50 bg-crimson/5" : "border-border/30 bg-white/[0.02]"}`}>
                  <div className="text-xs font-semibold">{model.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{model.desc}</div>
                  {model.active && <Badge variant="outline" className="text-[9px] mt-2 text-crimson border-crimson/30">Active</Badge>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "forms_pages" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Forms</h3>
                <Button size="sm" className="bg-crimson hover:bg-crimson/80 text-white h-7 text-xs" onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-3 w-3 mr-1" /> New Form
                </Button>
              </div>
              {(forms ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No forms created yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(forms ?? []).map((form: any) => (
                    <div key={form.id} className="flex items-center justify-between py-2 px-3 rounded bg-white/[0.03] text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-crimson" />
                        <div>
                          <span className="font-medium">{form.name}</span>
                          <span className="text-muted-foreground ml-1">({form.formType})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{form.submissions} submissions</span>
                        <StatusBadge variant={form.status === "active" ? "success" : "inactive"} label={form.status} />
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-crimson" onClick={() => deleteForm.mutate(form.id)}>×</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Landing Pages</h3>
                <Button size="sm" className="bg-crimson hover:bg-crimson/80 text-white h-7 text-xs" onClick={() => setShowCreatePage(true)}>
                  <Plus className="h-3 w-3 mr-1" /> New Page
                </Button>
              </div>
              {(pages ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No landing pages created yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(pages ?? []).map((page: any) => (
                    <div key={page.id} className="flex items-center justify-between py-2 px-3 rounded bg-white/[0.03] text-xs">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-blue-400" />
                        <div>
                          <span className="font-medium">{page.name}</span>
                          {page.url && <span className="text-muted-foreground ml-1 text-[10px]">{page.url}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{page.visits} visits</span>
                        <span className="text-emerald-400">{page.conversions} conv</span>
                        <StatusBadge variant={page.status === "published" || page.isPublished ? "success" : "warning"} label={page.isPublished ? "published" : page.status} />
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-crimson" onClick={() => deletePage.mutate(page.id)}>×</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      <Dialog open={selectedChannel !== null} onOpenChange={() => setSelectedChannel(null)}>
        <DialogContent className="glass-card border-border/30">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedChannel?.name}</DialogTitle>
          </DialogHeader>
          {selectedChannel && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Type:</span> <span className="ml-1">{selectedChannel.type}</span></div>
                <div><span className="text-muted-foreground">Platform:</span> <span className="ml-1">{selectedChannel.platform}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <span className="ml-1">{selectedChannel.category}</span></div>
                <div><span className="text-muted-foreground">Mode:</span> <span className="ml-1">{selectedChannel.integrationMode}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge variant={selectedChannel.status === "connected" ? "success" : "inactive"} label={selectedChannel.status} /></div>
                <div><span className="text-muted-foreground">Auto Sync:</span> <span className="ml-1">{selectedChannel.autoSync ? "Yes" : "No"}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded bg-white/[0.03]">
                  <div className="font-semibold text-sm">{selectedChannel.totalLeads}</div>
                  <div className="text-[9px] text-muted-foreground">Total Leads</div>
                </div>
                <div className="p-2 rounded bg-white/[0.03]">
                  <div className="font-semibold text-sm">{selectedChannel.totalConversions}</div>
                  <div className="text-[9px] text-muted-foreground">Conversions</div>
                </div>
                <div className="p-2 rounded bg-white/[0.03]">
                  <div className="font-semibold text-sm">{selectedChannel.monthlyLeads}</div>
                  <div className="text-[9px] text-muted-foreground">This Month</div>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedChannel.status === "connected" ? (
                  <>
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => { triggerSync.mutate(selectedChannel.id, { onSuccess: () => { toast({ title: "Sync triggered" }); setSelectedChannel(null); } }); }}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Sync Now
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs text-crimson border-crimson/30" onClick={() => { disconnectChannel.mutate(selectedChannel.id, { onSuccess: () => { toast({ title: "Disconnected" }); setSelectedChannel(null); } }); }}>
                      <Unplug className="h-3 w-3 mr-1" /> Disconnect
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => { connectChannel.mutate({ id: selectedChannel.id, mode: "automatic" }, { onSuccess: () => { toast({ title: "Connected (Auto)" }); setSelectedChannel(null); } }); }}>
                      <PlugZap className="h-3 w-3 mr-1" /> Auto Connect
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs btn-glass text-foreground" onClick={() => { connectChannel.mutate({ id: selectedChannel.id, mode: "manual" }, { onSuccess: () => { toast({ title: "Connected (Manual)" }); setSelectedChannel(null); } }); }}>
                      <Link2 className="h-3 w-3 mr-1" /> Manual Connect
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="glass-card border-border/30">
          <DialogHeader><DialogTitle>Create Form</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Form Name</Label>
              <Input className="glass-input mt-1" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Contact Us Form" />
            </div>
            <div>
              <Label className="text-xs">Form Type</Label>
              <Select value={formData.formType} onValueChange={(v) => setFormData(f => ({ ...f, formType: v }))}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="lead_capture">Lead Capture</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="quote">Quote Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="btn-glass text-foreground flex-1" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button className="bg-crimson hover:bg-crimson/80 text-white flex-1" onClick={() => {
                if (!formData.name) return;
                createForm.mutate({ name: formData.name, formType: formData.formType, channelId: formData.channelId ? parseInt(formData.channelId) : undefined }, {
                  onSuccess: () => { setShowCreateForm(false); setFormData({ name: "", formType: "contact", channelId: "" }); toast({ title: "Form created" }); },
                  onError: () => toast({ title: "Failed to create form", variant: "destructive" }),
                });
              }} disabled={!formData.name || createForm.isPending}>
                {createForm.isPending ? "Creating..." : "Create Form"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreatePage} onOpenChange={setShowCreatePage}>
        <DialogContent className="glass-card border-border/30">
          <DialogHeader><DialogTitle>Create Landing Page</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Page Name</Label>
              <Input className="glass-input mt-1" value={pageData.name} onChange={(e) => setPageData(f => ({ ...f, name: e.target.value }))} placeholder="Cybersecurity Assessment" />
            </div>
            <div>
              <Label className="text-xs">Page Type</Label>
              <Select value={pageData.pageType} onValueChange={(v) => setPageData(f => ({ ...f, pageType: v }))}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing">Landing Page</SelectItem>
                  <SelectItem value="service">Service Page</SelectItem>
                  <SelectItem value="campaign">Campaign Page</SelectItem>
                  <SelectItem value="webinar">Webinar Registration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">URL</Label>
              <Input className="glass-input mt-1" value={pageData.url} onChange={(e) => setPageData(f => ({ ...f, url: e.target.value }))} placeholder="https://pmggroup-llc.com/assessment" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="btn-glass text-foreground flex-1" onClick={() => setShowCreatePage(false)}>Cancel</Button>
              <Button className="bg-crimson hover:bg-crimson/80 text-white flex-1" onClick={() => {
                if (!pageData.name) return;
                createPage.mutate({ name: pageData.name, pageType: pageData.pageType, url: pageData.url || undefined, channelId: pageData.channelId ? parseInt(pageData.channelId) : undefined }, {
                  onSuccess: () => { setShowCreatePage(false); setPageData({ name: "", pageType: "landing", url: "", channelId: "" }); toast({ title: "Landing page created" }); },
                  onError: () => toast({ title: "Failed to create page", variant: "destructive" }),
                });
              }} disabled={!pageData.name || createPage.isPending}>
                {createPage.isPending ? "Creating..." : "Create Page"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="glass-card border-border/30 max-w-lg">
          <DialogHeader><DialogTitle>CSV Import</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Entity Type</Label>
              <Select value={importData.entityType} onValueChange={(v) => setImportData(f => ({ ...f, entityType: v }))}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="companies">Companies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">CSV Data (paste here)</Label>
              <textarea
                className="w-full h-32 mt-1 p-2 text-xs bg-white/5 border border-border/30 rounded-lg font-mono resize-y focus:outline-none focus:ring-1 focus:ring-crimson/50"
                placeholder={'firstName,lastName,email,companyName,phone\nJohn,Doe,john@example.com,Acme Inc,555-1234'}
                value={importData.csvText}
                onChange={(e) => setImportData(f => ({ ...f, csvText: e.target.value }))}
              />
            </div>
            {importData.csvText && (() => {
              const { headers, rows } = parseCsv(importData.csvText);
              return headers.length > 0 ? (
                <div className="text-xs">
                  <span className="text-muted-foreground">Preview: {rows.length} rows, {headers.length} columns</span>
                  <div className="text-[10px] text-muted-foreground mt-1">Columns: {headers.join(", ")}</div>
                </div>
              ) : null;
            })()}
            <div className="flex gap-2 pt-2">
              <Button className="btn-glass text-foreground flex-1" onClick={() => setShowImport(false)}>Cancel</Button>
              <Button className="bg-crimson hover:bg-crimson/80 text-white flex-1" onClick={async () => {
                if (!importData.csvText) return;
                const { headers, rows } = parseCsv(importData.csvText);
                if (rows.length === 0) { toast({ title: "No data rows found", variant: "destructive" }); return; }
                const autoMapping: Record<string, string> = {};
                headers.forEach(h => { autoMapping[h] = h; });
                try {
                  const imp = await startImport.mutateAsync({
                    entityType: importData.entityType,
                    importType: "csv",
                    fileName: `manual_paste_${Date.now()}.csv`,
                    totalRows: rows.length,
                    fieldMapping: autoMapping,
                    channelId: importData.channelId ? parseInt(importData.channelId) : undefined,
                  });
                  await processImport.mutateAsync({ id: imp.id, rows, fieldMapping: autoMapping, entityType: importData.entityType });
                  toast({ title: `Imported ${rows.length} rows` });
                  setShowImport(false);
                  setImportData({ entityType: "leads", channelId: "", csvText: "" });
                } catch (err: any) {
                  toast({ title: err.message ?? "Import failed", variant: "destructive" });
                }
              }} disabled={!importData.csvText || startImport.isPending || processImport.isPending}>
                {startImport.isPending || processImport.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
