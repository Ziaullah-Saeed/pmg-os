import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import {
  useListCampaigns,
  useCreateCampaignMut,
  useUpdateCampaignMut,
  useDeleteCampaignMut,
} from "@/hooks/use-api";
import {
  Megaphone, FileText, Search, BarChart3, Globe, Zap, Plus,
  Sparkles, Calendar, TrendingUp, DollarSign, Users, Eye,
  CheckCircle2, X, ArrowRight, Target, Filter, RefreshCw,
  Layers, PenTool, Send, Clock, AlertTriangle, Star,
  ExternalLink, ArrowUpRight, ArrowDownRight, Shield,
  Linkedin, Facebook, Instagram, Youtube, Mail, Phone
} from "lucide-react";

const tabs = [
  { id: "content", label: "Content Strategy", icon: <FileText className="h-4 w-4" /> },
  { id: "campaigns", label: "Campaigns", icon: <Megaphone className="h-4 w-4" /> },
  { id: "seo", label: "SEO & Growth", icon: <Search className="h-4 w-4" /> },
  { id: "orchestrator", label: "Orchestrator", icon: <Zap className="h-4 w-4" /> },
  { id: "competitors", label: "Competitor Intel", icon: <Globe className="h-4 w-4" /> },
];

export default function Marketing() {
  const [activeTab, setActiveTab] = useState("content");
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const { data: campaigns } = useListCampaigns();
  const { isHuman } = useAiModeContext();

  const campaignList = useMemo(() => (campaigns ?? []) as any[], [campaigns]);

  const activeCampaigns = campaignList.filter((c: any) => c.status === "active").length;
  const totalBudget = campaignList.reduce((s: number, c: any) => s + (c.budget ?? 0), 0);
  const totalSpent = campaignList.reduce((s: number, c: any) => s + (c.spent ?? 0), 0);
  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? 0), 0);
  const totalImpressions = campaignList.reduce((s: number, c: any) => s + (c.impressions ?? 0), 0);

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Marketing"
        subtitle={isHuman ? "Content strategy, advertising, and growth" : "AI-powered marketing engine for cybersecurity lead generation"}
        icon={<Megaphone className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            {!isHuman && (
              <Button variant="outline" className="text-sm border-crimson/30 text-crimson hover:bg-crimson/10">
                <Sparkles className="h-4 w-4 mr-2" />AI Content Plan
              </Button>
            )}
            <Button className="btn-premium text-white text-sm" onClick={() => { setActiveTab("campaigns"); setShowNewCampaign(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Campaign
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Active Campaigns" value={activeCampaigns} icon={<Megaphone className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Total Budget" value={`$${totalBudget.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Total Spent" value={`$${totalSpent.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Leads Generated" value={totalLeads} icon={<Users className="h-4 w-4" />} accent="success" />
        <KpiCard label="Impressions" value={totalImpressions > 1000 ? `${(totalImpressions / 1000).toFixed(1)}k` : totalImpressions} icon={<Eye className="h-4 w-4" />} accent="blue" />
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-crimson text-white"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "content" && <ContentStrategyTab campaigns={campaignList} isHuman={isHuman} />}
          {activeTab === "campaigns" && <CampaignsTab campaigns={campaignList} isHuman={isHuman} showNew={showNewCampaign} setShowNew={setShowNewCampaign} />}
          {activeTab === "seo" && <SeoGrowthTab isHuman={isHuman} />}
          {activeTab === "orchestrator" && <OrchestratorTab campaigns={campaignList} isHuman={isHuman} />}
          {activeTab === "competitors" && <CompetitorIntelTab isHuman={isHuman} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ContentStrategyTab({ campaigns, isHuman }: { campaigns: any[]; isHuman: boolean }) {
  const contentCalendar = [
    { day: "Mon", channel: "LinkedIn", type: "Article", topic: "Why MSSPs Need Dedicated Marketing Partners", status: "scheduled" },
    { day: "Mon", channel: "X/Twitter", type: "Thread", topic: "5 Signs Your Cybersecurity Company Needs Marketing Help", status: "draft" },
    { day: "Tue", channel: "Facebook", type: "Post", topic: "Case Study: 20 Leads in 30 Days for SecureNet", status: "scheduled" },
    { day: "Wed", channel: "LinkedIn", type: "Post", topic: "NIST Framework Marketing Angle", status: "draft" },
    { day: "Wed", channel: "Blog", type: "Article", topic: "The Complete Guide to Marketing for Cybersecurity Companies", status: "published" },
    { day: "Thu", channel: "Instagram", type: "Carousel", topic: "Cybersecurity Marketing Do's and Don'ts", status: "draft" },
    { day: "Thu", channel: "Email", type: "Newsletter", topic: "Weekly Cyber Marketing Digest", status: "scheduled" },
    { day: "Fri", channel: "LinkedIn", type: "Post", topic: "Friday Wins: Client Results This Week", status: "draft" },
    { day: "Fri", channel: "YouTube", type: "Short", topic: "60-Second Marketing Tip for IT Companies", status: "draft" },
  ];

  const channelSchedule = [
    { channel: "LinkedIn", frequency: "3/week", icon: <Linkedin className="h-4 w-4" />, color: "text-blue-400" },
    { channel: "Facebook/Instagram", frequency: "5/week", icon: <Facebook className="h-4 w-4" />, color: "text-blue-500" },
    { channel: "Blog", frequency: "2/month", icon: <FileText className="h-4 w-4" />, color: "text-crimson" },
    { channel: "X/Twitter", frequency: "Daily", icon: <Globe className="h-4 w-4" />, color: "text-white" },
    { channel: "YouTube", frequency: "2/month", icon: <Youtube className="h-4 w-4" />, color: "text-red-500" },
    { channel: "Email", frequency: "Bi-weekly", icon: <Mail className="h-4 w-4" />, color: "text-gold" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {channelSchedule.map((ch) => (
          <div key={ch.channel} className="rounded-lg glass-surface p-3 text-center">
            <div className={`mx-auto mb-1.5 ${ch.color}`}>{ch.icon}</div>
            <p className="text-xs font-semibold">{ch.channel}</p>
            <p className="text-[10px] text-muted-foreground">{ch.frequency}</p>
          </div>
        ))}
      </div>

      {!isHuman && (
        <GlassCard className="border border-crimson/10 bg-crimson/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg glass-surface text-crimson">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Content Repurposing Engine</p>
              <p className="text-xs text-muted-foreground">1 blog post auto-generates: LinkedIn article + 5 social posts + email excerpt + video script</p>
            </div>
            <Button size="sm" className="btn-premium text-white text-xs">
              <PenTool className="h-3 w-3 mr-1" />Generate Content
            </Button>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Content Calendar — This Week</h3>
          <Badge variant="outline" className="text-xs">{contentCalendar.length} items</Badge>
        </div>
        <div className="space-y-2">
          {contentCalendar.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg glass-surface">
              <span className="text-[10px] font-medium text-muted-foreground w-8">{item.day}</span>
              <Badge variant="outline" className="text-[10px] w-24 justify-center">{item.channel}</Badge>
              <Badge variant="outline" className="text-[10px] w-16 justify-center">{item.type}</Badge>
              <span className="text-xs flex-1 truncate">{item.topic}</span>
              <Badge variant="outline" className={`text-[10px] ${
                item.status === "published" ? "text-success border-success/20" :
                item.status === "scheduled" ? "text-blue-400 border-blue-500/20" :
                "text-muted-foreground"
              }`}>{item.status}</Badge>
              <div className="flex gap-1">
                {item.status === "draft" && !isHuman && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-crimson">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />Write
                  </Button>
                )}
                {item.status === "draft" && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]">
                    <Send className="h-2.5 w-2.5 mr-0.5" />Schedule
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Brand Voice Guidelines</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Tone", value: "Authoritative, data-driven, honest", color: "text-crimson" },
            { label: "Audience", value: "Cybersecurity CISOs, IT Directors, MSP owners", color: "text-blue-400" },
            { label: "Terminology", value: "NIST, SOC 2, SIEM, EDR, MDR, XDR", color: "text-gold" },
            { label: "Never", value: "No AI fluff, no generic advice, no jargon without context", color: "text-red-400" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg glass-surface">
              <p className={`text-xs font-semibold ${item.color}`}>{item.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function CampaignsTab({ campaigns, isHuman, showNew, setShowNew }: { campaigns: any[]; isHuman: boolean; showNew: boolean; setShowNew: (v: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("all");
  const createCampaign = useCreateCampaignMut();
  const updateCampaign = useUpdateCampaignMut();
  const deleteCampaign = useDeleteCampaignMut();

  const [form, setForm] = useState({ name: "", type: "awareness", channel: "linkedin", budget: "", targetAudience: "Cybersecurity companies 50-500 employees" });

  const filtered = campaigns.filter((c: any) => {
    if (search && !(c.name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterChannel !== "all" && c.channel !== filterChannel) return false;
    return true;
  });

  const handleCreate = () => {
    if (!form.name) return;
    createCampaign.mutate({
      name: form.name,
      type: form.type,
      channel: form.channel,
      budget: parseFloat(form.budget) || 0,
      targetAudience: form.targetAudience,
      status: "draft",
    }, {
      onSuccess: () => {
        setShowNew(false);
        setForm({ name: "", type: "awareness", channel: "linkedin", budget: "", targetAudience: "Cybersecurity companies 50-500 employees" });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateCampaign.mutate({ id, data: { status } });
  };

  const channels = ["all", "linkedin", "facebook", "google", "instagram", "email", "youtube"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
        </div>
        <div className="flex gap-1">
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-2 py-1 text-[10px] rounded transition-colors capitalize ${
                filterChannel === ch ? "bg-crimson/20 text-crimson" : "text-muted-foreground hover:text-white"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        <Button className="btn-premium text-white text-sm ml-auto" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4 mr-2" />{showNew ? "Cancel" : "New Campaign"}
        </Button>
      </div>

      {showNew && (
        <GlassCard className="border border-crimson/20">
          <h3 className="text-sm font-semibold mb-3">Create Campaign</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm">
              <option value="awareness">Awareness</option>
              <option value="lead_gen">Lead Generation</option>
              <option value="retargeting">Retargeting</option>
              <option value="nurture">Nurture</option>
            </select>
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm">
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
              <option value="google">Google Ads</option>
              <option value="instagram">Instagram</option>
              <option value="email">Email</option>
              <option value="youtube">YouTube</option>
            </select>
            <Input placeholder="Budget ($)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="bg-white/5 border-white/10" />
            <Button onClick={handleCreate} disabled={!form.name || createCampaign.isPending} className="btn-premium text-white">
              {createCampaign.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
          <Input placeholder="Target audience" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} className="bg-white/5 border-white/10 mt-2" />
        </GlassCard>
      )}

      {filtered.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-sm font-semibold mb-2">No Campaigns Yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Create your first campaign to start generating leads for cybersecurity companies.</p>
            <Button className="btn-premium text-white text-sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Campaign
            </Button>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((campaign: any) => (
            <GlassCard key={campaign.id} variant="interactive">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{campaign.name}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{campaign.channel}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{campaign.type}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${
                      campaign.status === "active" ? "text-success border-success/20" :
                      campaign.status === "paused" ? "text-yellow-400 border-yellow-500/20" :
                      campaign.status === "completed" ? "text-blue-400 border-blue-500/20" :
                      "text-muted-foreground"
                    }`}>{campaign.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">Budget: <span className="text-gold font-medium">${(campaign.budget ?? 0).toLocaleString()}</span></span>
                    <span className="text-[10px] text-muted-foreground">Spent: <span className="text-crimson font-medium">${(campaign.spent ?? 0).toLocaleString()}</span></span>
                    <span className="text-[10px] text-muted-foreground">Leads: <span className="text-success font-medium">{campaign.leadsGenerated ?? 0}</span></span>
                    {campaign.impressions && <span className="text-[10px] text-muted-foreground">Impressions: {(campaign.impressions / 1000).toFixed(1)}k</span>}
                    {campaign.clicks && <span className="text-[10px] text-muted-foreground">Clicks: {campaign.clicks}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {campaign.status === "draft" && (
                    <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={() => handleStatusChange(campaign.id, "active")}>
                      <ArrowRight className="h-3 w-3 mr-1" />Launch
                    </Button>
                  )}
                  {campaign.status === "active" && (
                    <Button size="sm" variant="outline" className="text-xs border-yellow-500/30 text-yellow-400 h-7" onClick={() => handleStatusChange(campaign.id, "paused")}>
                      Pause
                    </Button>
                  )}
                  {campaign.status === "paused" && (
                    <Button size="sm" variant="outline" className="text-xs border-success/30 text-success h-7" onClick={() => handleStatusChange(campaign.id, "active")}>
                      Resume
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs border-red-500/20 text-red-300 h-7" onClick={() => deleteCampaign.mutate(campaign.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {!isHuman && campaigns.length > 0 && (
        <GlassCard className="border border-crimson/10 bg-crimson/5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-crimson" />
            <div className="flex-1">
              <p className="text-sm font-semibold">AI Campaign Optimization</p>
              <p className="text-xs text-muted-foreground">Shift budget from underperforming channels to top converters. Generates A/B test recommendations.</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson">Optimize</Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function SeoGrowthTab({ isHuman }: { isHuman: boolean }) {
  const [showAudit, setShowAudit] = useState(false);

  const keywords = [
    { keyword: "cybersecurity marketing agency", volume: 1200, difficulty: 45, position: 8, trend: "up" },
    { keyword: "IT company lead generation", volume: 890, difficulty: 38, position: 12, trend: "up" },
    { keyword: "MSP marketing services", volume: 720, difficulty: 32, position: 5, trend: "stable" },
    { keyword: "cybersecurity SEO", volume: 540, difficulty: 28, position: 3, trend: "up" },
    { keyword: "MSSP marketing", volume: 480, difficulty: 25, position: 15, trend: "down" },
    { keyword: "managed security marketing", volume: 390, difficulty: 22, position: null, trend: "new" },
    { keyword: "cybersecurity content marketing", volume: 650, difficulty: 35, position: 7, trend: "stable" },
    { keyword: "IT services marketing agency", volume: 820, difficulty: 42, position: 18, trend: "up" },
  ];

  const auditItems = [
    { category: "Technical", issue: "Missing meta descriptions on 12 pages", priority: "high", fix: "Add unique meta descriptions targeting primary keywords" },
    { category: "Content", issue: "Blog posts under 1000 words not ranking", priority: "high", fix: "Expand top 5 posts to 2000+ words with data and examples" },
    { category: "Speed", issue: "Mobile page load 4.2s (target: <2.5s)", priority: "medium", fix: "Compress images, enable lazy loading, defer scripts" },
    { category: "Backlinks", issue: "Only 23 referring domains vs competitor avg 85", priority: "high", fix: "Guest post strategy: target 5 cybersecurity publications" },
    { category: "Schema", issue: "No FAQ schema on service pages", priority: "medium", fix: "Add FAQ structured data to top 10 service pages" },
    { category: "Internal", issue: "Orphaned pages (6 with no internal links)", priority: "low", fix: "Add contextual links from related blog posts" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Tracked Keywords</p>
          <p className="text-lg font-bold">{keywords.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Top 10 Rankings</p>
          <p className="text-lg font-bold text-success">{keywords.filter(k => k.position && k.position <= 10).length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Avg Position</p>
          <p className="text-lg font-bold text-gold">{Math.round(keywords.filter(k => k.position).reduce((s, k) => s + (k.position ?? 0), 0) / keywords.filter(k => k.position).length)}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Audit Issues</p>
          <p className="text-lg font-bold text-crimson">{auditItems.length}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {!isHuman && (
          <Button variant="outline" className="text-sm border-crimson/30 text-crimson" onClick={() => setShowAudit(!showAudit)}>
            <Sparkles className="h-4 w-4 mr-2" />{showAudit ? "Hide Audit" : "Run SEO Audit"}
          </Button>
        )}
        <Button variant="outline" className="text-sm" onClick={() => setShowAudit(!showAudit)}>
          <Search className="h-4 w-4 mr-2" />{showAudit ? "Show Keywords" : "View Audit"}
        </Button>
      </div>

      {!showAudit ? (
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Keyword Rankings</h3>
            <Badge variant="outline" className="text-xs">Cybersecurity Niche</Badge>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 p-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span className="flex-1">Keyword</span>
              <span className="w-16 text-center">Volume</span>
              <span className="w-16 text-center">Difficulty</span>
              <span className="w-16 text-center">Position</span>
              <span className="w-16 text-center">Trend</span>
            </div>
            {keywords.map((kw) => (
              <div key={kw.keyword} className="flex items-center gap-3 p-2.5 rounded-lg glass-surface">
                <span className="text-xs flex-1 font-medium">{kw.keyword}</span>
                <span className="w-16 text-center text-xs text-muted-foreground">{kw.volume.toLocaleString()}</span>
                <span className={`w-16 text-center text-xs ${kw.difficulty > 40 ? "text-red-400" : kw.difficulty > 25 ? "text-yellow-400" : "text-success"}`}>{kw.difficulty}</span>
                <span className={`w-16 text-center text-xs font-semibold ${kw.position && kw.position <= 10 ? "text-success" : kw.position ? "text-yellow-400" : "text-muted-foreground"}`}>
                  {kw.position ?? "—"}
                </span>
                <span className="w-16 text-center">
                  {kw.trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-success inline" />}
                  {kw.trend === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-red-400 inline" />}
                  {kw.trend === "stable" && <span className="text-[10px] text-muted-foreground">—</span>}
                  {kw.trend === "new" && <Badge variant="outline" className="text-[8px] text-blue-400">NEW</Badge>}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">SEO Audit Report</h3>
            <Badge variant="outline" className="text-xs">{auditItems.filter(a => a.priority === "high").length} High Priority</Badge>
          </div>
          <div className="space-y-2">
            {auditItems.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${
                    item.priority === "high" ? "text-red-400 border-red-500/20" :
                    item.priority === "medium" ? "text-yellow-400 border-yellow-500/20" :
                    "text-blue-400 border-blue-500/20"
                  }`}>{item.priority}</Badge>
                </div>
                <p className="text-xs font-medium">{item.issue}</p>
                <p className="text-[10px] text-success mt-1">Fix: {item.fix}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function OrchestratorTab({ campaigns, isHuman }: { campaigns: any[]; isHuman: boolean }) {
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active");

  const timeline = [
    { week: "Week 1", phase: "Awareness", channels: ["LinkedIn", "Blog"], actions: ["Publish 3 thought leadership posts", "Run awareness ads", "SEO content push"], status: "active" },
    { week: "Week 2", phase: "Engagement", channels: ["Email", "LinkedIn", "Facebook"], actions: ["Retarget blog visitors", "Send nurture sequence", "Share case studies"], status: "upcoming" },
    { week: "Week 3", phase: "Conversion", channels: ["LinkedIn", "Google", "Email"], actions: ["Run lead gen campaigns", "Book meetings from warm leads", "Send personalized outreach"], status: "upcoming" },
    { week: "Week 4", phase: "Analysis", channels: ["All"], actions: ["Compile performance report", "Reallocate budget to winners", "Plan next sprint"], status: "upcoming" },
  ];

  const journeyStages = [
    { stage: "Impression", count: 15200, color: "bg-blue-500" },
    { stage: "Visit", count: 3400, color: "bg-cyan-500" },
    { stage: "Form Fill", count: 420, color: "bg-gold" },
    { stage: "Lead", count: 85, color: "bg-orange-500" },
    { stage: "Meeting", count: 22, color: "bg-crimson" },
    { stage: "Client", count: 6, color: "bg-success" },
  ];

  return (
    <div className="space-y-4">
      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Full Journey Funnel</h3>
        <div className="flex items-end gap-2 h-32">
          {journeyStages.map((stage, idx) => {
            const maxCount = journeyStages[0].count;
            const height = Math.max(15, (stage.count / maxCount) * 100);
            return (
              <div key={stage.stage} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold">{stage.count > 1000 ? `${(stage.count / 1000).toFixed(1)}k` : stage.count}</span>
                <div className={`w-full rounded-t ${stage.color}`} style={{ height: `${height}%` }} />
                <span className="text-[9px] text-muted-foreground">{stage.stage}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5">
          <span className="text-xs text-muted-foreground">Conversion Rate:</span>
          <span className="text-sm font-bold text-success">{((journeyStages[journeyStages.length - 1].count / journeyStages[0].count) * 100).toFixed(2)}%</span>
          <span className="text-xs text-muted-foreground">end-to-end</span>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Campaign Sprint Timeline</h3>
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson">
              <Sparkles className="h-3 w-3 mr-1" />AI Plan Sprint
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {timeline.map((week) => (
            <div key={week.week} className={`p-3 rounded-lg glass-surface ${week.status === "active" ? "ring-1 ring-crimson/30" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-[10px] ${week.status === "active" ? "text-crimson border-crimson/30" : "text-muted-foreground"}`}>
                  {week.week}
                </Badge>
                <span className="text-xs font-semibold">{week.phase}</span>
                <div className="flex gap-1 ml-auto">
                  {week.channels.map((ch) => (
                    <Badge key={ch} variant="outline" className="text-[9px]">{ch}</Badge>
                  ))}
                </div>
              </div>
              <ul className="space-y-1">
                {week.actions.map((action, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className={`h-3 w-3 flex-shrink-0 ${week.status === "active" ? "text-success" : "text-muted-foreground/30"}`} />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Budget Allocation</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { channel: "LinkedIn", pct: 35, color: "bg-blue-400" },
            { channel: "Google", pct: 25, color: "bg-gold" },
            { channel: "Facebook", pct: 15, color: "bg-blue-600" },
            { channel: "Email", pct: 10, color: "bg-crimson" },
            { channel: "YouTube", pct: 10, color: "bg-red-500" },
            { channel: "Other", pct: 5, color: "bg-muted-foreground" },
          ].map((item) => (
            <div key={item.channel} className="p-2 rounded-lg glass-surface text-center">
              <div className={`w-full h-1.5 rounded ${item.color} mb-2`} style={{ opacity: item.pct / 35 }} />
              <p className="text-xs font-semibold">{item.pct}%</p>
              <p className="text-[10px] text-muted-foreground">{item.channel}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function CompetitorIntelTab({ isHuman }: { isHuman: boolean }) {
  const competitors = [
    {
      name: "CyberFunnel Agency",
      positioning: "General cybersecurity marketing",
      strengths: ["Large team", "Enterprise clients", "Strong PPC"],
      weaknesses: ["No lead guarantee", "Generic content", "Expensive ($8k+ minimum)"],
      battleCard: "They can't guarantee leads. We guarantee 20 in month one. They charge 3x more for generic campaigns.",
    },
    {
      name: "SecureGrowth Marketing",
      positioning: "IT/MSP marketing specialist",
      strengths: ["MSP niche focus", "Good SEO", "Webinar expertise"],
      weaknesses: ["No cybersecurity depth", "Slow turnaround", "Template-based approach"],
      battleCard: "They know MSPs but not cybersecurity buyers. Our content uses real terminology (SIEM, SOC 2, EDR) that their content misses.",
    },
    {
      name: "TechMarket Pro",
      positioning: "Tech industry marketing agency",
      strengths: ["Wide tech coverage", "Good design", "Social media"],
      weaknesses: ["Not specialized in cybersecurity", "No outbound capabilities", "Content sounds AI-generated"],
      battleCard: "Generalist agency pretending to know your sector. Ask what NIST framework is and watch them stumble. We live in this space.",
    },
  ];

  const gaps = [
    "No competitor offers a 20-lead guarantee with performance-based pricing",
    "Most competitors use generic content that doesn't resonate with CISOs",
    "No competitor has an integrated AI system for prospect intelligence",
    "Competitors charge 2-4x more without measurable ROI commitments",
    "No competitor combines outbound prospecting with inbound marketing",
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Competitors Tracked</p>
          <p className="text-lg font-bold">{competitors.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Market Gaps Found</p>
          <p className="text-lg font-bold text-success">{gaps.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Last Updated</p>
          <p className="text-sm font-bold">This month</p>
        </div>
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">PMG Competitive Advantages</h3>
        <div className="space-y-2">
          {gaps.map((gap, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg glass-surface">
              <Shield className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-xs">{gap}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Battle Cards</h3>
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson">
              <Sparkles className="h-3 w-3 mr-1" />Refresh Analysis
            </Button>
          )}
        </div>
        {competitors.map((comp) => (
          <GlassCard key={comp.name}>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-crimson" />
              <p className="text-sm font-semibold">{comp.name}</p>
              <Badge variant="outline" className="text-[10px]">{comp.positioning}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-2 rounded-lg glass-surface">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Strengths</p>
                <ul className="space-y-0.5">
                  {comp.strengths.map((s) => (
                    <li key={s} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-2.5 w-2.5 text-red-400" />{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-2 rounded-lg glass-surface">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Weaknesses</p>
                <ul className="space-y-0.5">
                  {comp.weaknesses.map((w) => (
                    <li key={w} className="text-[10px] text-success flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-crimson/5 border border-crimson/10">
              <p className="text-[10px] text-crimson uppercase tracking-wider mb-0.5">Sales Battle Card</p>
              <p className="text-xs">{comp.battleCard}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
