import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useToast } from "@/hooks/use-toast";
import {
  useListCampaigns,
  useCreateCampaignMut,
  useUpdateCampaignMut,
  useDeleteCampaignMut,
  useAiCreateContent,
  useAiCreateAd,
  useAiSeoAudit,
  useAiOrchestrateCampaign,
  useAiCompetitorIntel,
  useAiOutputs,
  useSaveAiOutput,
} from "@/hooks/use-api";
import {
  Megaphone, FileText, Search, Globe, Zap, Plus,
  Sparkles, Calendar, TrendingUp, DollarSign, Users, Eye,
  CheckCircle2, X, ArrowRight, RefreshCw,
  PenTool, Send, AlertTriangle,
  ArrowUpRight, ArrowDownRight,
  Linkedin, Facebook, Instagram, Youtube, Mail,
  Bot, Hand, Copy, Play, Pause
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
  const [aiResult, setAiResult] = useState<any>(null);
  const { data: campaigns } = useListCampaigns();
  const { isHuman, isAuto, currentMode } = useAiModeContext();
  const { toast } = useToast();
  const createContent = useAiCreateContent();

  const campaignList = useMemo(() => (campaigns ?? []) as any[], [campaigns]);

  const activeCampaigns = campaignList.filter((c: any) => c.status === "active").length;
  const totalBudget = campaignList.reduce((s: number, c: any) => s + (c.budget ?? 0), 0);
  const totalSpent = campaignList.reduce((s: number, c: any) => s + (c.spent ?? 0), 0);
  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? 0), 0);
  const totalImpressions = campaignList.reduce((s: number, c: any) => s + (c.impressions ?? 0), 0);

  const [contentPlan, setContentPlan] = useState<any>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const handleAiContentPlan = () => {
    setGeneratingPlan(true);
    createContent.mutate({ type: "content_plan", description: "Weekly content plan for cybersecurity marketing", tone: "professional", wordCount: 1000 }, {
      onSuccess: (data) => {
        setContentPlan(data);
        setGeneratingPlan(false);
        toast({ title: "Content Plan Generated", description: "Weekly content strategy created by AI" });
      },
      onError: (err: any) => {
        setGeneratingPlan(false);
        toast({ title: "Content plan failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Marketing"
        subtitle={isHuman ? "Content strategy, advertising, and growth" : "AI-powered marketing engine for cybersecurity lead generation"}
        icon={<Megaphone className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="text-sm border-crimson/30 text-crimson hover:bg-crimson/10"
              disabled={generatingPlan}
              onClick={handleAiContentPlan}>
              {generatingPlan ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Content Plan
            </Button>
            <Button className="btn-premium text-white text-sm" onClick={() => { setActiveTab("campaigns"); setShowNewCampaign(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Campaign
            </Button>
          </div>
        }
      />

      {contentPlan && (
        <GlassCard className="border border-crimson/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-crimson" />
              <h3 className="text-sm font-semibold">AI-Generated Content Plan</h3>
            </div>
            <button onClick={() => setContentPlan(null)} className="p-1 hover:bg-white/10 rounded"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            {(contentPlan.weeklyPlan || []).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg glass-surface">
                <span className="text-[10px] font-medium text-muted-foreground w-16">{item.day}</span>
                <Badge variant="outline" className="text-[10px] w-20 justify-center">{item.channel}</Badge>
                <Badge variant="outline" className="text-[10px] w-28 justify-center">{item.type}</Badge>
                <span className="text-xs flex-1 truncate">{item.topic}</span>
                <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 border-success/30 text-success"
                  disabled title="Content scheduling integration not configured yet">
                  <Calendar className="h-2.5 w-2.5 mr-0.5" />Add
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

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
          {activeTab === "content" && <ContentStrategyTab campaigns={campaignList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} />}
          {activeTab === "campaigns" && <CampaignsTab campaigns={campaignList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} showNew={showNewCampaign} setShowNew={setShowNewCampaign} />}
          {activeTab === "seo" && <SeoGrowthTab isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} />}
          {activeTab === "orchestrator" && <OrchestratorTab campaigns={campaignList} isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} />}
          {activeTab === "competitors" && <CompetitorIntelTab isHuman={isHuman} isAuto={isAuto} currentMode={currentMode} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ContentStrategyTab({ campaigns, isHuman, isAuto, currentMode }: { campaigns: any[]; isHuman: boolean; isAuto: boolean; currentMode: string }) {
  const createContent = useAiCreateContent();
  const { toast } = useToast();
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, any>>({});
  const [createType, setCreateType] = useState("blog_post");
  const [createTopic, setCreateTopic] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [contentStatus] = useState<Record<string, string>>({});

  const channelSchedule = [
    { channel: "LinkedIn", frequency: "3/week", icon: <Linkedin className="h-4 w-4" />, color: "text-blue-400" },
    { channel: "Facebook/Instagram", frequency: "5/week", icon: <Facebook className="h-4 w-4" />, color: "text-blue-500" },
    { channel: "Blog", frequency: "2/month", icon: <FileText className="h-4 w-4" />, color: "text-crimson" },
    { channel: "X/Twitter", frequency: "Daily", icon: <Globe className="h-4 w-4" />, color: "text-white" },
    { channel: "YouTube", frequency: "2/month", icon: <Youtube className="h-4 w-4" />, color: "text-red-500" },
    { channel: "Email", frequency: "Bi-weekly", icon: <Mail className="h-4 w-4" />, color: "text-gold" },
  ];

  const contentCalendar = [
    { day: "Mon", channel: "LinkedIn", type: "Post", topic: "Why 90% of Cybersecurity Companies Fail at Lead Generation", status: contentStatus["0"] || "draft" },
    { day: "Mon", channel: "X/Twitter", type: "Thread", topic: "5 signs your MSSP needs a marketing overhaul (thread)", status: contentStatus["1"] || "scheduled" },
    { day: "Tue", channel: "Blog", type: "Article", topic: "The CISO's Guide to Evaluating MDR Provider Marketing Claims", status: contentStatus["2"] || "draft" },
    { day: "Tue", channel: "Facebook", type: "Visual", topic: "SOC 2 compliance checklist infographic for IT decision makers", status: contentStatus["3"] || "draft" },
    { day: "Wed", channel: "LinkedIn", type: "Case Study", topic: "How CloudFortress Generated 47 SQLs in 30 Days with PMG", status: contentStatus["4"] || "published" },
    { day: "Wed", channel: "Email", type: "Newsletter", topic: "Weekly: Cybersecurity Marketing ROI Benchmarks for Q2", status: contentStatus["5"] || "scheduled" },
    { day: "Thu", channel: "LinkedIn", type: "Poll", topic: "What's your biggest lead gen challenge? (Budget / Content / Targeting / Time)", status: contentStatus["6"] || "draft" },
    { day: "Thu", channel: "Instagram", type: "Carousel", topic: "NIST Framework essentials every MSP buyer should know", status: contentStatus["7"] || "draft" },
    { day: "Fri", channel: "LinkedIn", type: "Data Post", topic: "73% of cybersecurity buyers start their research on Google — is your SEO ready?", status: contentStatus["8"] || "draft" },
    { day: "Fri", channel: "YouTube", type: "Video Script", topic: "Why Your EDR Company's Website Isn't Converting (and How to Fix It)", status: contentStatus["9"] || "draft" },
  ];

  const handleCreateContent = () => {
    if (!createTopic.trim()) return;
    setGeneratingContent("custom");
    createContent.mutate({ type: createType, description: createTopic, tone: "professional", wordCount: 800 }, {
      onSuccess: (data: any) => {
        setGeneratedContent(prev => ({ ...prev, custom: data }));
        setGeneratingContent(null);
        toast({ title: "Content Created", description: `${createType.replace(/_/g, " ")} generated successfully` });
      },
      onError: (err: any) => {
        setGeneratingContent(null);
        toast({ title: "Content creation failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  const handleGenerateForSlot = (idx: number) => {
    const item = contentCalendar[idx];
    setGeneratingContent(String(idx));
    createContent.mutate({ type: item.type.toLowerCase(), description: item.topic, tone: "professional", wordCount: 400 }, {
      onSuccess: (data: any) => {
        setGeneratedContent(prev => ({ ...prev, [idx]: data }));
        setGeneratingContent(null);
        toast({ title: "Content Generated", description: `${item.type} for ${item.channel} ready for review` });
      },
      onError: (err: any) => {
        setGeneratingContent(null);
        toast({ title: "Content generation failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — calendar auto-populated. Content auto-generated and scheduled per brand voice guidelines.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — AI suggests calendar and drafts content. You approve, modify, or reject before scheduling.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — you build the calendar. AI assists with writing content for slots you assign.</span></>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {channelSchedule.map((ch) => (
          <div key={ch.channel} className="rounded-lg glass-surface p-3 text-center">
            <div className={`mx-auto mb-1.5 ${ch.color}`}>{ch.icon}</div>
            <p className="text-xs font-semibold">{ch.channel}</p>
            <p className="text-[10px] text-muted-foreground">{ch.frequency}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="text-sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <PenTool className="h-4 w-4 mr-2" />{showCreateForm ? "Close" : "Create Content"}
        </Button>
      </div>

      {showCreateForm && (
        <GlassCard className="border border-crimson/20">
          <h3 className="text-sm font-semibold mb-3">Create New Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={createType} onChange={(e) => setCreateType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm">
              <option value="blog_post">Blog Post</option>
              <option value="linkedin_post">LinkedIn Post</option>
              <option value="email">Email Newsletter</option>
              <option value="social_graphic">Social Media Post</option>
              <option value="video_script">Video Script</option>
              <option value="case_study">Case Study</option>
              <option value="whitepaper">Whitepaper</option>
            </select>
            <Input placeholder="Topic or description..." value={createTopic} onChange={(e) => setCreateTopic(e.target.value)}
              className="bg-white/5 border-white/10 md:col-span-2" />
            <Button onClick={handleCreateContent} disabled={!createTopic.trim() || generatingContent === "custom"} className="btn-premium text-white">
              {generatingContent === "custom" ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate</>}
            </Button>
          </div>

          {generatedContent.custom && (
            <div className="mt-3 p-3 rounded-lg glass-surface">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-crimson">{generatedContent.custom.type || createType.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="text-[10px] text-blue-400">Draft</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => {
                    navigator.clipboard.writeText(generatedContent.custom.content || "");
                    toast({ title: "Copied", description: "Content copied to clipboard" });
                  }}>
                    <Copy className="h-3 w-3 mr-0.5" />Copy
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-6 border-success/30 text-success"
                    disabled title="Content approval workflow not built yet">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-6 border-blue-500/30 text-blue-400"
                    disabled title="Channel publishing integration not configured yet">
                    <Send className="h-3 w-3 mr-0.5" />Publish
                  </Button>
                </div>
              </div>
              <p className="text-xs whitespace-pre-line text-muted-foreground">{generatedContent.custom.content}</p>
            </div>
          )}
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
              <Badge variant="outline" className="text-[10px] w-20 justify-center">{item.type}</Badge>
              <span className="text-xs flex-1 truncate">{item.topic}</span>
              <Badge variant="outline" className={`text-[10px] ${
                item.status === "published" ? "text-success border-success/20" :
                item.status === "scheduled" ? "text-blue-400 border-blue-500/20" :
                item.status === "approved" ? "text-gold border-gold/20" :
                "text-muted-foreground"
              }`}>{item.status}</Badge>
              <div className="flex gap-1">
                {item.status === "draft" && !isHuman && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-crimson"
                    disabled={generatingContent === String(idx)}
                    onClick={() => handleGenerateForSlot(idx)}>
                    {generatingContent === String(idx) ? <RefreshCw className="h-2.5 w-2.5 mr-0.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5 mr-0.5" />}Write
                  </Button>
                )}
                {item.status === "draft" && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                    disabled title="Content scheduling integration not configured yet">
                    <Send className="h-2.5 w-2.5 mr-0.5" />Schedule
                  </Button>
                )}
                {item.status === "scheduled" && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-success"
                    disabled title="Channel publishing integration not configured yet">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Publish
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {Object.keys(generatedContent).filter(k => k !== "custom").length > 0 && (
        <GlassCard className="border border-crimson/10">
          <h3 className="text-sm font-semibold mb-3">Generated Content Preview</h3>
          {Object.entries(generatedContent).filter(([k]) => k !== "custom").map(([key, val]: [string, any]) => (
            <div key={key} className="p-3 rounded-lg glass-surface mb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">{contentCalendar[parseInt(key)]?.topic}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => {
                    navigator.clipboard.writeText(val.content || "");
                    toast({ title: "Copied", description: "Content copied to clipboard" });
                  }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-6 border-success/30 text-success"
                    disabled title="Content approval workflow not built yet">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" />Approve
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{val.content}</p>
            </div>
          ))}
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Content Repurposing Engine</h3>
          <Badge variant="outline" className="text-[10px]">AI-Powered</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">1 blog post auto-generates: LinkedIn article + 5 social posts + email excerpt + video script</p>
        <div className="grid grid-cols-5 gap-2">
          {["Blog → LinkedIn", "Blog → 5 Social", "Blog → Email", "Blog → Video Script", "Blog → Infographic"].map((flow) => (
            <div key={flow} className="p-2 rounded-lg glass-surface text-center">
              <ArrowRight className="h-3 w-3 mx-auto text-crimson mb-1" />
              <p className="text-[10px] font-medium">{flow}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Brand Voice Guidelines</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Tone", value: "Authoritative, data-driven, honest", color: "text-crimson" },
            { label: "Audience", value: "CISOs, IT Directors, MSP/MSSP owners", color: "text-blue-400" },
            { label: "Terminology", value: "NIST, SOC 2, SIEM, EDR, MDR, XDR", color: "text-gold" },
            { label: "Never Use", value: "No: leverage, synergy, cutting-edge, AI fluff", color: "text-red-400" },
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

function CampaignsTab({ campaigns, isHuman, isAuto, currentMode, showNew, setShowNew }: { campaigns: any[]; isHuman: boolean; isAuto: boolean; currentMode: string; showNew: boolean; setShowNew: (v: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("all");
  const createCampaign = useCreateCampaignMut();
  const updateCampaign = useUpdateCampaignMut();
  const deleteCampaign = useDeleteCampaignMut();
  const createAd = useAiCreateAd();
  const { toast } = useToast();
  const [generatingAd, setGeneratingAd] = useState<number | null>(null);
  const [adCopy, setAdCopy] = useState<Record<number, any>>({});

  const [form, setForm] = useState({
    name: "", type: "awareness", channel: "linkedin", budget: "",
    targetAudience: "Cybersecurity companies 50-500 employees"
  });

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
        toast({ title: "Campaign Created", description: `"${form.name}" created as draft` });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateCampaign.mutate({ id, data: { status } }, {
      onSuccess: () => {
        const labels: Record<string, string> = { active: "launched", paused: "paused", completed: "completed" };
        toast({ title: `Campaign ${labels[status] || status}`, description: `Campaign status updated to ${status}` });
      }
    });
  };

  const handleGenerateAd = (campaign: any) => {
    setGeneratingAd(campaign.id);
    createAd.mutate({ platform: campaign.channel, objective: campaign.type, audience: campaign.targetAudience }, {
      onSuccess: (data: any) => {
        setAdCopy(prev => ({ ...prev, [campaign.id]: data }));
        setGeneratingAd(null);
        toast({ title: "Ad Copy Generated", description: `A/B variations created for ${campaign.name}` });
      },
      onError: (err: any) => {
        setGeneratingAd(null);
        toast({ title: "Ad copy generation failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  const channels = ["all", "linkedin", "facebook", "google", "instagram", "email", "youtube"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — campaigns auto-generated. Never auto-publishes ads (safety rule). Team always reviews before launch.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — AI generates campaign packages. You review every element and manually launch.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — build campaigns yourself. AI provides suggestions for copy and targeting on request.</span></>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
        </div>
        <div className="flex gap-1">
          {channels.map((ch) => (
            <button key={ch} onClick={() => setFilterChannel(ch)}
              className={`px-2 py-1 text-[10px] rounded transition-colors capitalize ${filterChannel === ch ? "bg-crimson/20 text-crimson" : "text-muted-foreground hover:text-white"}`}>
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
              <option value="brand">Brand Building</option>
              <option value="event">Event Promotion</option>
              <option value="product_launch">Product Launch</option>
            </select>
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm">
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
              <option value="google">Google Ads</option>
              <option value="instagram">Instagram</option>
              <option value="email">Email</option>
              <option value="youtube">YouTube</option>
              <option value="multi_channel">Multi-Channel</option>
            </select>
            <Input placeholder="Budget ($)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="bg-white/5 border-white/10" />
            <Button onClick={handleCreate} disabled={!form.name || createCampaign.isPending} className="btn-premium text-white">
              {createCampaign.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
          <Input placeholder="Target audience (e.g., Cybersecurity CISOs at companies with 50-500 employees)" value={form.targetAudience}
            onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} className="bg-white/5 border-white/10 mt-2" />
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
        <div className="space-y-3">
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
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {!isHuman && (
                    <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson h-7"
                      disabled={generatingAd === campaign.id}
                      onClick={() => handleGenerateAd(campaign)}>
                      {generatingAd === campaign.id ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      {adCopy[campaign.id] ? "Regenerate" : "AI Ad Copy"}
                    </Button>
                  )}
                  {campaign.status === "draft" && (
                    <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={() => handleStatusChange(campaign.id, "active")}>
                      <Play className="h-3 w-3 mr-1" />Launch
                    </Button>
                  )}
                  {campaign.status === "active" && (
                    <Button size="sm" variant="outline" className="text-xs border-yellow-500/30 text-yellow-400 h-7" onClick={() => handleStatusChange(campaign.id, "paused")}>
                      <Pause className="h-3 w-3 mr-1" />Pause
                    </Button>
                  )}
                  {campaign.status === "paused" && (
                    <Button size="sm" variant="outline" className="text-xs border-success/30 text-success h-7" onClick={() => handleStatusChange(campaign.id, "active")}>
                      <Play className="h-3 w-3 mr-1" />Resume
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs border-red-500/20 text-red-300 h-7"
                    onClick={() => { deleteCampaign.mutate(campaign.id); toast({ title: "Campaign Deleted" }); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {adCopy[campaign.id] && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">AI-Generated Ad Variations (A/B Test)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    {(adCopy[campaign.id].variations || []).map((v: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg glass-surface">
                        <Badge variant="outline" className="text-[9px] mb-1.5">Variation {String.fromCharCode(65 + i)}</Badge>
                        <p className="text-xs font-bold mb-1">{v.headline}</p>
                        <p className="text-[10px] text-muted-foreground mb-1.5">{v.body}</p>
                        <Button size="sm" className="w-full text-[10px] h-6 btn-premium text-white">{v.cta}</Button>
                      </div>
                    ))}
                  </div>
                  {adCopy[campaign.id].targeting && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-lg glass-surface">
                        <p className="text-[10px] text-muted-foreground">Targeting</p>
                        <p className="text-xs">{adCopy[campaign.id].targeting.audience}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(adCopy[campaign.id].targeting.interests || []).slice(0, 3).map((int: string) => (
                            <Badge key={int} variant="outline" className="text-[8px]">{int}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg glass-surface">
                        <p className="text-[10px] text-muted-foreground">Company Size</p>
                        <p className="text-xs">{adCopy[campaign.id].targeting.companySize}</p>
                      </div>
                      <div className="p-2 rounded-lg glass-surface">
                        <p className="text-[10px] text-muted-foreground">Budget Split</p>
                        <p className="text-xs">Daily: {adCopy[campaign.id].budgetAllocation?.daily}</p>
                        <p className="text-[10px] text-muted-foreground">Testing: {adCopy[campaign.id].budgetAllocation?.testing}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-red-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Safety: Ads never auto-publish. Team must manually review and launch all campaigns.
                  </p>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function SeoGrowthTab({ isHuman, isAuto, currentMode }: { isHuman: boolean; isAuto: boolean; currentMode: string }) {
  const seoAudit = useAiSeoAudit();
  const saveOutput = useSaveAiOutput();
  const { data: audits } = useAiOutputs("seo_audit", { domain: "marketing", limit: 10 });
  const { toast } = useToast();
  const [showAudit, setShowAudit] = useState(false);
  const [generatingAudit, setGeneratingAudit] = useState(false);

  const auditList = audits ?? [];

  const keywords = [
    { keyword: "managed detection and response", volume: 2400, difficulty: 68, position: 34, trend: "up" as const },
    { keyword: "MDR services", volume: 1800, difficulty: 55, position: 28, trend: "up" as const },
    { keyword: "SOC as a service", volume: 1200, difficulty: 62, position: 42, trend: "stable" as const },
    { keyword: "cybersecurity managed services", volume: 900, difficulty: 48, position: 51, trend: "down" as const },
    { keyword: "endpoint detection and response", volume: 3600, difficulty: 72, position: null, trend: "new" as const },
    { keyword: "MSSP marketing", volume: 320, difficulty: 22, position: 8, trend: "up" as const },
    { keyword: "cybersecurity lead generation", volume: 480, difficulty: 35, position: 12, trend: "up" as const },
    { keyword: "IT security marketing agency", volume: 210, difficulty: 18, position: 5, trend: "stable" as const },
  ];

  const handleRunAudit = () => {
    setGeneratingAudit(true);
    seoAudit.mutate({ websiteUrl: "client website", competitors: ["Arctic Wolf", "Expel"] }, {
      onSuccess: (data: any) => {
        setGeneratingAudit(false);
        setShowAudit(true);
        const text = String(data?.audit ?? data?.result ?? "");
        saveOutput.mutate({
          domain: "marketing",
          kind: "seo_audit",
          title: `SEO Audit — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          summary: text.slice(0, 280),
          data: { content: text },
        });
        toast({ title: "SEO Audit Complete", description: "Saved to audit history" });
      },
      onError: (err: any) => {
        setGeneratingAudit(false);
        toast({ title: "SEO audit failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — audit runs monthly. High-priority content auto-created for keyword gaps.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — you click to run audits. Review results. Click "Create Content" per gap.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — run audit when needed. Implement fixes and create content manually.</span></>}
      </div>

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
          <p className="text-[10px] text-muted-foreground">Audits Run</p>
          <p className="text-lg font-bold text-crimson">{auditList.length}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="text-sm border-crimson/30 text-crimson"
          disabled={generatingAudit}
          onClick={handleRunAudit}>
          {generatingAudit ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Run SEO Audit
        </Button>
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
                <span className={`w-16 text-center text-xs ${kw.difficulty > 60 ? "text-red-400" : kw.difficulty > 40 ? "text-yellow-400" : "text-success"}`}>{kw.difficulty}</span>
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

          <div className="mt-4 pt-3 border-t border-white/5">
            <h4 className="text-xs font-semibold mb-2">Competitor Comparison</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "Arctic Wolf", traffic: "~45K/mo", keywords: 2800, backlinks: 4200 },
                { name: "Expel", traffic: "~28K/mo", keywords: 1900, backlinks: 2100 },
                { name: "Your Site", traffic: "~1,200/mo", keywords: keywords.length, backlinks: 23 },
              ].map((comp) => (
                <div key={comp.name} className={`p-2.5 rounded-lg glass-surface ${comp.name === "Your Site" ? "ring-1 ring-crimson/30" : ""}`}>
                  <p className="text-xs font-semibold">{comp.name}</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">Traffic: <span className="text-white">{comp.traffic}</span></p>
                    <p className="text-[10px] text-muted-foreground">Keywords: <span className="text-white">{comp.keywords}</span></p>
                    <p className="text-[10px] text-muted-foreground">Backlinks: <span className="text-white">{comp.backlinks}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      ) : auditList.length === 0 ? (
        <GlassCard>
          <div className="text-center py-10">
            <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No audit run yet{isHuman ? "." : " — click Run SEO Audit."}</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {auditList.map((a) => (
            <GlassCard key={a.id} className="border border-crimson/10">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                <Search className="h-4 w-4 text-crimson" />
                <p className="text-sm font-semibold flex-1">{a.title}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{(a.data?.content ?? a.summary) || "—"}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function OrchestratorTab({ campaigns, isHuman, isAuto, currentMode }: { campaigns: any[]; isHuman: boolean; isAuto: boolean; currentMode: string }) {
  const orchestrateCampaign = useAiOrchestrateCampaign();
  const { toast } = useToast();
  const [sprintPlan, setSprintPlan] = useState<any>(null);
  const [generatingSprint, setGeneratingSprint] = useState(false);
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active");

  const journeyStages = [
    { stage: "Impressions", count: 12400, color: "bg-blue-500" },
    { stage: "Clicks", count: 890, color: "bg-blue-400" },
    { stage: "Landing", count: 620, color: "bg-cyan-400" },
    { stage: "Leads", count: 85, color: "bg-gold" },
    { stage: "MQLs", count: 42, color: "bg-orange-400" },
    { stage: "SQLs", count: 22, color: "bg-crimson" },
    { stage: "Meetings", count: 14, color: "bg-crimson" },
    { stage: "Closed", count: 6, color: "bg-success" },
  ];

  const timeline = [
    { week: "Week 1-2", phase: "Awareness", channels: ["LinkedIn", "Blog", "Google"], actions: ["Publish 4 SEO blog posts targeting MDR/SIEM keywords", "Launch LinkedIn thought leadership series (3x/week)", "Start Google Ads for 'MDR services' and 'SOC as a service'", "Create CISO's Guide to Vendor Evaluation (gated PDF)"], status: "completed" },
    { week: "Week 3-4", phase: "Engagement", channels: ["Email", "LinkedIn", "Webinar"], actions: ["Host live webinar: 'Building a Security-First Marketing Strategy'", "Launch email nurture sequence (5-part series)", "Retarget website visitors with case study ads", "Publish 2 customer success stories"], status: "active" },
    { week: "Week 5-8", phase: "Conversion", channels: ["All Channels", "SDR"], actions: ["Deploy bottom-funnel ads with ROI calculator CTA", "SDR outreach to warm MQLs with personalized messaging", "A/B test landing pages for demo requests", "Launch referral program for existing clients"], status: "upcoming" },
    { week: "Week 9-12", phase: "Optimization", channels: ["Analytics", "All"], actions: ["Analyze campaign ROI across all channels", "Kill underperforming ads, scale winners", "Refine targeting based on closed-won data", "Plan Q3 campaign based on learnings"], status: "upcoming" },
  ];

  const handleGenerateSprint = () => {
    setGeneratingSprint(true);
    orchestrateCampaign.mutate({ campaignName: "Sprint Campaign", channels: ["linkedin", "email", "ads"], goals: "Generate 20 qualified leads", timeline: "4 weeks" }, {
      onSuccess: (data: any) => {
        setSprintPlan(data);
        setGeneratingSprint(false);
        toast({ title: "Sprint Plan Generated", description: "90-day campaign orchestration plan created" });
      },
      onError: (err: any) => {
        setGeneratingSprint(false);
        toast({ title: "Sprint plan failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — orchestrator coordinates all campaigns automatically. Budget rebalanced weekly.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — AI plans sprints and suggests optimizations. You approve budget changes.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — you coordinate campaigns and allocate budget across channels.</span></>}
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Full Journey Funnel</h3>
        <div className="flex items-end gap-2 h-32">
          {journeyStages.map((stage) => {
            const maxCount = journeyStages[0]?.count || 1;
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
          <span className="text-xs text-muted-foreground">End-to-end conversion:</span>
          <span className="text-sm font-bold text-success">{((journeyStages[journeyStages.length - 1].count / journeyStages[0].count) * 100).toFixed(2)}%</span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs text-muted-foreground">Cost per SQL:</span>
          <span className="text-sm font-bold text-gold">$204</span>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Campaign Sprint Timeline</h3>
          <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
            disabled={generatingSprint}
            onClick={handleGenerateSprint}>
            {generatingSprint ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Plan Sprint
          </Button>
        </div>

        {sprintPlan && (
          <div className="mb-4 p-3 rounded-lg glass-surface border border-crimson/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-crimson" />
              <p className="text-xs font-bold">{sprintPlan.name || "AI Sprint Plan"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="p-2 rounded glass-surface">
                <p className="text-[10px] text-muted-foreground">Budget</p>
                <p className="text-xs font-semibold text-gold">{sprintPlan.budget}</p>
              </div>
              <div className="p-2 rounded glass-surface">
                <p className="text-[10px] text-muted-foreground">Goal</p>
                <p className="text-xs font-semibold text-success">{sprintPlan.goal}</p>
              </div>
            </div>
            {(sprintPlan.phases || []).map((phase: any, i: number) => (
              <div key={i} className="mt-2 p-2 rounded glass-surface">
                <p className="text-xs font-semibold text-crimson">{phase.name}</p>
                <ul className="mt-1 space-y-0.5">
                  {(phase.tasks || []).map((task: string, j: number) => (
                    <li key={j} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-muted-foreground/30 flex-shrink-0" />{task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {timeline.map((week) => (
            <div key={week.week} className={`p-3 rounded-lg glass-surface ${week.status === "active" ? "ring-1 ring-crimson/30" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-[10px] ${
                  week.status === "active" ? "text-crimson border-crimson/30" :
                  week.status === "completed" ? "text-success border-success/20" :
                  "text-muted-foreground"
                }`}>
                  {week.week}
                </Badge>
                <span className="text-xs font-semibold">{week.phase}</span>
                {week.status === "active" && <Badge className="bg-crimson text-white text-[9px]">Current</Badge>}
                {week.status === "completed" && <Badge variant="outline" className="text-[9px] text-success border-success/20">Done</Badge>}
                <div className="flex gap-1 ml-auto">
                  {week.channels.map((ch) => (
                    <Badge key={ch} variant="outline" className="text-[9px]">{ch}</Badge>
                  ))}
                </div>
              </div>
              <ul className="space-y-1">
                {week.actions.map((action, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className={`h-3 w-3 flex-shrink-0 ${week.status === "completed" ? "text-success" : week.status === "active" ? "text-crimson" : "text-muted-foreground/30"}`} />
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

function CompetitorIntelTab({ isHuman, isAuto, currentMode }: { isHuman: boolean; isAuto: boolean; currentMode: string }) {
  const competitorIntel = useAiCompetitorIntel();
  const saveOutput = useSaveAiOutput();
  const { data: reports } = useAiOutputs("competitor", { domain: "marketing", limit: 10 });
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const reportList = reports ?? [];
  const lastUpdated = reportList[0]?.createdAt ? new Date(reportList[0].createdAt).toLocaleDateString() : "Never";

  const handleRefresh = () => {
    setRefreshing(true);
    competitorIntel.mutate({ competitors: ["Directive", "SmartBug", "Bora"] }, {
      onSuccess: (data: any) => {
        setRefreshing(false);
        const text = String(data?.intelligence ?? data?.result ?? "");
        saveOutput.mutate({
          domain: "marketing",
          kind: "competitor",
          title: `Competitor Intel — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          summary: text.slice(0, 280),
          data: { content: text },
        });
        toast({ title: "Analysis Complete", description: "Saved to intel history" });
      },
      onError: (err: any) => {
        setRefreshing(false);
        toast({ title: "Analysis refresh failed", description: err?.message || "Request failed", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 px-1">
        {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">Auto — analysis runs monthly. Battle cards auto-distributed to CRM for sales calls.</span></>}
        {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">Hybrid — you trigger analysis. Review battle cards before using in sales conversations.</span></>}
        {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">Manual — request analysis when needed. Use battle cards for competitive positioning.</span></>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Reports Generated</p>
          <p className="text-lg font-bold">{reportList.length}</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Latest Report</p>
          <p className="text-sm font-bold text-gold">{lastUpdated}</p>
        </div>
        <div className="rounded-lg glass-surface p-3 flex items-center justify-center">
          <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
            disabled={refreshing || isHuman}
            title={isHuman ? "Switch out of Human mode to run AI analysis" : undefined}
            onClick={handleRefresh}>
            {refreshing ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Run Analysis
          </Button>
        </div>
      </div>

      {reportList.length === 0 ? (
        <GlassCard>
          <div className="text-center py-10">
            <Globe className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No competitor analysis yet{isHuman ? "." : " — click Run Analysis to generate battle cards and market gaps."}</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {reportList.map((r) => (
            <GlassCard key={r.id}>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                <Globe className="h-4 w-4 text-crimson" />
                <p className="text-sm font-semibold flex-1">{r.title}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => {
                  navigator.clipboard.writeText(String(r.data?.content ?? r.summary ?? ""));
                  toast({ title: "Copied", description: "Competitor intel copied to clipboard" });
                }}>
                  <Copy className="h-3 w-3 mr-0.5" />Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{(r.data?.content ?? r.summary) || "—"}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
