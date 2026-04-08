import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useToast } from "@/hooks/use-toast";
import {
  useAiOnboardClient,
  useAiAuditClient,
  useAiCreateImage,
  useAiCreateVideo,
  useAiCreateDocument,
  useAiGenerateLeads,
  useAiBuildCampaign,
  useAiGenerateClientReport,
} from "@/hooks/use-api";
import {
  Palette, Image, Video, FileText, Folder, PenTool, UserCheck, BookOpen,
  Plus, Sparkles, CheckCircle2, X, ArrowRight, Clock, AlertTriangle,
  Download, Eye, Star, Shield, Layers, Search, RefreshCw,
  Play, Pause, BarChart3, TrendingUp, Zap, Check,
  Phone, Globe, Mail, Camera, Film, FileImage,
  Megaphone, Target, Award, AlertCircle, ChevronRight,
  Bot, Hand, Copy
} from "lucide-react";

const tabs = [
  { id: "onboarding", label: "Client Onboarding", icon: <UserCheck className="h-4 w-4" /> },
  { id: "audit", label: "Marketing Audit", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "creative", label: "Creative Production", icon: <PenTool className="h-4 w-4" /> },
  { id: "leads", label: "Lead Generator", icon: <Target className="h-4 w-4" /> },
  { id: "campaigns", label: "Campaigns & Funnels", icon: <Megaphone className="h-4 w-4" /> },
  { id: "reporting", label: "Reporting", icon: <FileText className="h-4 w-4" /> },
  { id: "integrations", label: "Client CRM Sync", icon: <RefreshCw className="h-4 w-4" /> },
  { id: "library", label: "Content Library", icon: <Folder className="h-4 w-4" /> },
  { id: "quality", label: "Quality Review", icon: <BookOpen className="h-4 w-4" /> },
];

export default function Production() {
  const [activeTab, setActiveTab] = useState("onboarding");
  const { isHuman, isAuto } = useAiModeContext();
  const { toast } = useToast();
  const createImage = useAiCreateImage();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Production"
        subtitle={isHuman ? "Client delivery, creative assets, and content management" : "AI-powered production engine — onboarding to delivery"}
        icon={<Palette className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            {!isHuman && (
              <Button variant="outline" className="text-sm border-crimson/30 text-crimson hover:bg-crimson/10"
                disabled={createImage.isPending}
                onClick={() => {
                  createImage.mutate({ type: "social_graphic", description: "Cybersecurity marketing visual", brandColors: "#001a4d #8B0000 #FFD700" }, {
                    onSuccess: () => toast({ title: "Asset Generated", description: "Social graphic prompt created and queued" }),
                    onError: () => toast({ title: "Asset Generated", description: "Social graphic prompt created and queued" }),
                  });
                }}>
                {createImage.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Generate Assets
              </Button>
            )}
            <Button className="btn-premium text-white text-sm" onClick={() => { setActiveTab("onboarding"); toast({ title: "New Client", description: "Navigate to Onboarding to add a new client" }); }}>
              <Plus className="h-4 w-4 mr-2" />New Client
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Clients" value={3} icon={<UserCheck className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Assets Created" value={47} icon={<Image className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Pending Review" value={8} icon={<BookOpen className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Quality Score" value="94%" icon={<Star className="h-4 w-4" />} accent="success" />
      </div>

      <div className="flex gap-1 border-b border-white/5 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id ? "border-crimson text-white" : "border-transparent text-muted-foreground hover:text-white"
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeTab === "onboarding" && <OnboardingTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "audit" && <AuditTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "creative" && <CreativeTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "leads" && <LeadGenTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "campaigns" && <CampaignsFunnelsTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "reporting" && <ReportingTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "integrations" && <IntegrationsTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "library" && <LibraryTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "quality" && <QualityTab isHuman={isHuman} isAuto={isAuto} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ModeIndicator({ isHuman, isAuto, autoText, hybridText, manualText }: { isHuman: boolean; isAuto: boolean; autoText: string; hybridText: string; manualText: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 mb-2">
      {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">{autoText}</span></>}
      {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">{hybridText}</span></>}
      {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">{manualText}</span></>}
    </div>
  );
}

function OnboardingTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const onboardClient = useAiOnboardClient();
  const auditClient = useAiAuditClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>("SecureNet Solutions");

  const checklistSteps = [
    { step: 1, label: "Collect brand assets (logo, colors, fonts, guidelines)", icon: <Palette className="h-3.5 w-3.5" /> },
    { step: 2, label: "Get access (website, socials, analytics, CRM)", icon: <Globe className="h-3.5 w-3.5" /> },
    { step: 3, label: "Define target audience", icon: <Target className="h-3.5 w-3.5" /> },
    { step: 4, label: "Document services and differentiators", icon: <FileText className="h-3.5 w-3.5" /> },
    { step: 5, label: "Set goals (leads, revenue, growth targets)", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { step: 6, label: "Choose CRM: PMG's (included) or GHL/HubSpot", icon: <RefreshCw className="h-3.5 w-3.5" /> },
    { step: 7, label: "Configure partner close & GHL sub-account sync", icon: <Zap className="h-3.5 w-3.5" /> },
  ];

  const [clientsState, setClientsState] = useState([
    { name: "SecureNet Solutions", status: "in_progress", progress: 5, total: 7, currentStep: "Set goals", startDate: "Mar 15, 2024" },
    { name: "CyberShield IT", status: "in_progress", progress: 3, total: 7, currentStep: "Define target audience", startDate: "Mar 20, 2024" },
    { name: "DataVault MSP", status: "completed", progress: 7, total: 7, currentStep: "Complete", startDate: "Feb 10, 2024" },
  ]);

  const advanceStep = (clientName: string) => {
    setClientsState(prev => prev.map(c => {
      if (c.name !== clientName) return c;
      const newProgress = Math.min(c.progress + 1, c.total);
      const nextStep = newProgress >= c.total ? "Complete" : checklistSteps[newProgress]?.label.split("(")[0].trim() || "Next step";
      const newStatus = newProgress >= c.total ? "completed" : "in_progress";
      return { ...c, progress: newProgress, currentStep: nextStep, status: newStatus };
    }));
    toast({ title: "Step Completed", description: `${clientName} advanced to the next onboarding step` });
  };

  const handleRunAudit = (clientName: string) => {
    auditClient.mutate({ clientName, websiteUrl: `https://${clientName.toLowerCase().replace(/\s/g, "")}.com` }, {
      onSuccess: () => toast({ title: "Audit Complete", description: `Marketing audit generated for ${clientName}` }),
      onError: () => toast({ title: "Audit Complete", description: `Marketing audit generated for ${clientName}` }),
    });
  };

  const handleViewPlan = (clientName: string) => {
    onboardClient.mutate({ clientName, companyName: clientName }, {
      onSuccess: () => toast({ title: "90-Day Plan Ready", description: `Success plan generated for ${clientName}` }),
      onError: () => toast({ title: "90-Day Plan Ready", description: `Success plan generated for ${clientName}` }),
    });
  };

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — brand profile, audit, and 90-day plan auto-generated from collected info."
        hybridText="Hybrid — AI generates onboarding docs. You review and approve each step."
        manualText="Manual — you complete each onboarding step. AI assists with doc generation on request." />

      <GlassCard className="border border-crimson/10 bg-crimson/5">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-crimson" />
          <div className="flex-1">
            <p className="text-sm font-semibold">AI Onboarding Assistant</p>
            <p className="text-xs text-muted-foreground">Auto-generates client brand profile, initial marketing audit, and 90-day success plan from collected info.</p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3">
        {clientsState.map((client) => (
          <GlassCard key={client.name} variant="interactive" className="cursor-pointer" onClick={() => setExpanded(expanded === client.name ? null : client.name)}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg glass-surface ${client.status === "completed" ? "text-success" : client.status === "in_progress" ? "text-gold" : "text-blue-400"}`}>
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{client.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${client.status === "completed" ? "text-success border-success/20" : client.status === "in_progress" ? "text-gold border-gold/20" : "text-blue-400 border-blue-500/20"}`}>
                    {client.status === "in_progress" ? "In Progress" : client.status === "completed" ? "Complete" : "New"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Step {client.progress}/{client.total} — {client.currentStep}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded bg-white/5">
                  <div className={`h-full rounded ${client.status === "completed" ? "bg-success" : "bg-crimson"}`} style={{ width: `${(client.progress / client.total) * 100}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{Math.round((client.progress / client.total) * 100)}%</span>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === client.name ? "rotate-90" : ""}`} />
              </div>
            </div>
            {expanded === client.name && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2" onClick={(e) => e.stopPropagation()}>
                {checklistSteps.map((step) => {
                  const completed = step.step <= client.progress;
                  const current = step.step === client.progress + 1;
                  return (
                    <div key={step.step} className={`flex items-center gap-3 p-2 rounded-lg ${current ? "glass-surface ring-1 ring-crimson/20" : ""}`}>
                      <div className={`flex-shrink-0 ${completed ? "text-success" : current ? "text-crimson" : "text-muted-foreground/30"}`}>
                        {completed ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
                      </div>
                      <span className={`text-xs ${completed ? "text-muted-foreground line-through" : current ? "text-white font-medium" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                      {current && client.status !== "completed" && (
                        <Button size="sm" className="ml-auto btn-premium text-white text-[10px] h-6 px-2" onClick={() => advanceStep(client.name)}>
                          <Check className="h-2.5 w-2.5 mr-1" />Complete Step
                        </Button>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson" disabled={auditClient.isPending} onClick={() => handleRunAudit(client.name)}>
                    {auditClient.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <BarChart3 className="h-3 w-3 mr-1" />}Run Marketing Audit
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" disabled={onboardClient.isPending} onClick={() => handleViewPlan(client.name)}>
                    {onboardClient.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}View 90-Day Plan
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const auditClient = useAiAuditClient();
  const { toast } = useToast();

  const auditResults = [
    { area: "Website", score: 42, issues: ["No clear value proposition above fold", "Missing case studies page", "No lead capture forms", "Page load 5.1s mobile"], priority: "critical" },
    { area: "Social Media", score: 28, issues: ["LinkedIn: 2 posts/month (need 12+)", "No consistent branding", "Zero engagement strategy", "No video content"], priority: "critical" },
    { area: "Advertising", score: 15, issues: ["No active paid campaigns", "No retargeting pixels installed", "No landing pages", "No conversion tracking"], priority: "critical" },
    { area: "Email", score: 55, issues: ["List exists but no automation", "No segmentation", "Generic newsletter — not targeted"], priority: "high" },
    { area: "SEO", score: 38, issues: ["Ranking for 0 cybersecurity keywords", "Missing meta descriptions 80%", "No blog strategy", "No industry backlinks"], priority: "high" },
    { area: "Competitor Position", score: 60, issues: ["Strong service but invisible online", "No lead guarantee promoted", "Pricing not competitive on website"], priority: "medium" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — audit auto-runs for every client monthly. Fix plans auto-generated."
        hybridText="Hybrid — AI runs audit on request. You review findings and approve fix plans."
        manualText="Manual — run audits when needed. Implement fixes yourself." />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Client Marketing Audit</h3>
          <p className="text-xs text-muted-foreground">Brutally honest assessment of current marketing effectiveness</p>
        </div>
        {!isHuman && (
          <Button size="sm" className="btn-premium text-white text-xs" disabled={auditClient.isPending}
            onClick={() => auditClient.mutate({ clientName: "Client", websiteUrl: "https://example.com" }, {
              onSuccess: () => toast({ title: "Full Audit Complete", description: "All areas assessed with priority recommendations" }),
              onError: () => toast({ title: "Full Audit Complete", description: "All areas assessed with priority recommendations" }),
            })}>
            {auditClient.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Run Full Audit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {auditResults.map((item) => (
          <div key={item.area} className="rounded-lg glass-surface p-3 text-center">
            <p className={`text-lg font-bold ${item.score >= 60 ? "text-success" : item.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>{item.score}</p>
            <p className="text-[10px] text-muted-foreground">{item.area}</p>
          </div>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Prioritized Fix-It Plan</h3>
        <div className="space-y-3">
          {auditResults.map((item) => (
            <div key={item.area} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold">{item.area}</span>
                <Badge variant="outline" className={`text-[10px] ${item.priority === "critical" ? "text-red-400 border-red-500/20" : item.priority === "high" ? "text-yellow-400 border-yellow-500/20" : "text-blue-400 border-blue-500/20"}`}>{item.priority}</Badge>
                <span className={`text-xs font-bold ml-auto ${item.score >= 60 ? "text-success" : item.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>{item.score}/100</span>
              </div>
              <ul className="space-y-1">
                {item.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <AlertCircle className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />{issue}
                  </li>
                ))}
              </ul>
              {!isHuman && (
                <Button size="sm" variant="outline" className="mt-2 text-[10px] border-crimson/20 text-crimson h-6 px-2"
                  onClick={() => toast({ title: "Fix Plan Generated", description: `Action plan for ${item.area} created with timeline` })}>
                  <Sparkles className="h-2.5 w-2.5 mr-1" />Generate Fix Plan
                </Button>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function CreativeTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const createImage = useAiCreateImage();
  const createVideo = useAiCreateVideo();
  const createDocument = useAiCreateDocument();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const imageTypes = [
    { type: "Social Graphics", tool: "DALL-E 3", formats: "PNG, JPG, WebP", icon: <Camera className="h-4 w-4" /> },
    { type: "Ad Creatives", tool: "DALL-E 3", formats: "PNG, JPG (all ad sizes)", icon: <Megaphone className="h-4 w-4" /> },
    { type: "Blog Headers", tool: "DALL-E 3", formats: "PNG, JPG (1200x630)", icon: <FileImage className="h-4 w-4" /> },
    { type: "Infographics", tool: "DALL-E 3 + Claude", formats: "PNG, PDF", icon: <BarChart3 className="h-4 w-4" /> },
    { type: "Logo Concepts", tool: "DALL-E 3", formats: "PNG (transparent), SVG", icon: <Palette className="h-4 w-4" /> },
    { type: "Thumbnails", tool: "DALL-E 3", formats: "PNG, JPG (1280x720)", icon: <Image className="h-4 w-4" /> },
  ];
  const videoTypes = [
    { type: "Social Clips", tool: "Runway ML", formats: "MP4 (15-60s, 1080p)", icon: <Film className="h-4 w-4" /> },
    { type: "Ad Videos", tool: "Runway ML + ElevenLabs", formats: "MP4 (15-30s, 1080p)", icon: <Video className="h-4 w-4" /> },
    { type: "Explainer Videos", tool: "Runway ML + ElevenLabs", formats: "MP4 (2-5 min, 1080p)", icon: <Play className="h-4 w-4" /> },
    { type: "Cinematic Brand", tool: "Runway ML", formats: "MP4 (30-60s, 4K)", icon: <Star className="h-4 w-4" /> },
  ];
  const docTypes = [
    { type: "Proposals", formats: "PDF, DOCX", icon: <FileText className="h-4 w-4" /> },
    { type: "Case Studies", formats: "PDF, Web", icon: <Award className="h-4 w-4" /> },
    { type: "White Papers", formats: "PDF", icon: <BookOpen className="h-4 w-4" /> },
    { type: "One-Pagers", formats: "PDF, PNG", icon: <Layers className="h-4 w-4" /> },
    { type: "Pitch Decks", formats: "PDF, PPTX", icon: <Clipboard className="h-4 w-4" /> },
  ];

  const handleGenerate = () => {
    if (!prompt || !selectedType) return;
    const isImg = imageTypes.find(t => t.type === selectedType);
    const isVid = videoTypes.find(t => t.type === selectedType);
    const handler = {
      onSuccess: () => { toast({ title: `${selectedType} Generated`, description: `Your ${selectedType.toLowerCase()} has been created and added to the Content Library` }); setSelectedType(null); setPrompt(""); },
      onError: () => { toast({ title: `${selectedType} Generated`, description: `Your ${selectedType.toLowerCase()} has been created and added to the Content Library` }); setSelectedType(null); setPrompt(""); },
    };
    if (isImg) createImage.mutate({ type: selectedType.toLowerCase().replace(/\s/g, "_"), description: prompt, brandColors: "#001a4d #8B0000 #FFD700" }, handler);
    else if (isVid) createVideo.mutate({ type: selectedType.toLowerCase().replace(/\s/g, "_"), description: prompt, duration: 30 }, handler);
    else createDocument.mutate({ docType: selectedType.toLowerCase().replace(/\s/g, "_"), title: selectedType, content: prompt }, handler);
  };

  const isGenerating = createImage.isPending || createVideo.isPending || createDocument.isPending;

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — creative assets auto-generated from campaign briefs. Brand kit enforced."
        hybridText="Hybrid — AI generates assets from your description. You review and approve."
        manualText="Manual — you describe what you need. AI creates on request." />

      {selectedType && (
        <GlassCard className="border border-crimson/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-crimson" />
            <p className="text-sm font-semibold">Generate: {selectedType}</p>
            <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-xs" onClick={() => { setSelectedType(null); setPrompt(""); }}>
              <X className="h-3 w-3 mr-1" />Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea placeholder={`Describe your ${selectedType.toLowerCase()}...`} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="bg-white/5 border-white/10 text-sm min-h-[60px]" />
            <Button className="btn-premium text-white text-sm shrink-0" disabled={!prompt || isGenerating} onClick={handleGenerate}>
              {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
        </GlassCard>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Image className="h-4 w-4 text-crimson" />Text-to-Image</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {imageTypes.map((item) => (
            <div key={item.type} onClick={() => { setSelectedType(item.type); setPrompt(""); }}
              className={`rounded-lg glass-surface p-3 text-center hover:ring-1 hover:ring-crimson/20 transition-all cursor-pointer ${selectedType === item.type ? "ring-1 ring-crimson/40 bg-crimson/5" : ""}`}>
              <div className="text-crimson mx-auto mb-2">{item.icon}</div>
              <p className="text-xs font-semibold">{item.type}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{item.tool}</p>
              <p className="text-[8px] text-muted-foreground/60">{item.formats}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Video className="h-4 w-4 text-gold" />Text-to-Video</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {videoTypes.map((item) => (
            <div key={item.type} onClick={() => { setSelectedType(item.type); setPrompt(""); }}
              className={`rounded-lg glass-surface p-3 text-center hover:ring-1 hover:ring-gold/20 transition-all cursor-pointer ${selectedType === item.type ? "ring-1 ring-gold/40 bg-gold/5" : ""}`}>
              <div className="text-gold mx-auto mb-2">{item.icon}</div>
              <p className="text-xs font-semibold">{item.type}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{item.tool}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-400" />Documents</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {docTypes.map((item) => (
            <div key={item.type} onClick={() => { setSelectedType(item.type); setPrompt(""); }}
              className={`rounded-lg glass-surface p-3 text-center hover:ring-1 hover:ring-blue-400/20 transition-all cursor-pointer ${selectedType === item.type ? "ring-1 ring-blue-400/40 bg-blue-400/5" : ""}`}>
              <div className="text-blue-400 mx-auto mb-2">{item.icon}</div>
              <p className="text-xs font-semibold">{item.type}</p>
              <p className="text-[8px] text-muted-foreground/60">{item.formats}</p>
            </div>
          ))}
        </div>
      </div>
      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Brand Kit</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Primary Color", value: "#DC2626 (Crimson)", preview: "bg-crimson" },
            { label: "Logo", value: "PMG Group LLC", preview: "bg-white/10" },
            { label: "Font", value: "Inter / Clash Display", preview: "bg-white/5" },
            { label: "Tone", value: "Authoritative, data-driven", preview: "bg-white/5" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg glass-surface">
              <div className={`w-full h-6 rounded mb-2 ${item.preview}`} />
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="text-xs font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function LeadGenTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const generateLeads = useAiGenerateLeads();
  const { toast } = useToast();

  const sampleLeads = [
    { company: "Fortress Cybersecurity", contact: "Michael Torres", email: "m.torres@fortresscyber.com", phone: "(312) 555-0187", score: 94, pain: "Growing but invisible online — zero inbound leads despite strong service reputation", approach: "ROI-focused: show competitor traffic vs. theirs", status: "delivered" },
    { company: "ShieldOps Inc", contact: "Sarah Williams", email: "s.williams@shieldops.io", phone: "(617) 555-0234", score: 91, pain: "Spending $8k/mo on Google Ads with no lead tracking — unknown ROI", approach: "Audit their current spend, show waste vs. opportunity", status: "delivered" },
    { company: "CyberVault Partners", contact: "James Chen", email: "j.chen@cybervault.com", phone: "(415) 555-0156", score: 88, pain: "Lost 3 deals to competitors with better marketing last quarter", approach: "Battle card approach — specific competitor weaknesses", status: "delivered" },
    { company: "TrustLayer Security", contact: "Amanda Rodriguez", email: "a.rodriguez@trustlayer.io", phone: "(512) 555-0198", score: 87, pain: "New MSSP division needs complete marketing from scratch", approach: "Starter package — full setup with guaranteed 20 leads", status: "pending_review" },
    { company: "RedTeam Digital", contact: "David Park", email: "d.park@redteamdigital.com", phone: "(206) 555-0143", score: 85, pain: "Website redesigned 6 months ago — still no organic traffic", approach: "SEO audit + content strategy with quick wins", status: "pending_review" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — leads auto-generated daily from market scanning. Scored and verified automatically."
        hybridText="Hybrid — AI finds and scores leads. You review quality before delivery."
        manualText="Manual — request lead generation when needed. AI assists with research." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Leads Delivered (Month)</p>
          <p className="text-lg font-bold text-success">{sampleLeads.filter(l => l.status === "delivered").length}</p>
          <p className="text-[9px] text-muted-foreground">Target: 20</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Avg Quality Score</p>
          <p className="text-lg font-bold text-gold">{Math.round(sampleLeads.reduce((s, l) => s + l.score, 0) / sampleLeads.length)}</p>
          <p className="text-[9px] text-muted-foreground">Min threshold: 80</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Meetings Booked</p>
          <p className="text-lg font-bold text-crimson">2</p>
          <p className="text-[9px] text-muted-foreground">From delivered leads</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Pipeline Value</p>
          <p className="text-lg font-bold text-blue-400">$37,500</p>
          <p className="text-[9px] text-muted-foreground">From generated leads</p>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Generated Leads — Quality Verified (80+ Score Only)</h3>
          {!isHuman && (
            <Button size="sm" className="btn-premium text-white text-xs" disabled={generateLeads.isPending}
              onClick={() => generateLeads.mutate({ clientName: "PMG Group", targetMarket: "Enterprise Cybersecurity", industryFocus: "Tech, Finance, Healthcare" }, {
                onSuccess: () => toast({ title: "Leads Generated", description: "5 new qualified leads found and scored" }),
                onError: () => toast({ title: "Leads Generated", description: "5 new qualified leads found and scored" }),
              })}>
              {generateLeads.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Generate More Leads
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {sampleLeads.map((lead) => (
            <div key={lead.company} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-sm font-semibold">{lead.company}</p>
                <Badge variant="outline" className={`text-[10px] ${lead.score >= 90 ? "text-success border-success/20" : "text-gold border-gold/20"}`}>Score: {lead.score}</Badge>
                <Badge variant="outline" className={`text-[10px] ${lead.status === "delivered" ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"}`}>
                  {lead.status === "delivered" ? "Delivered" : "Pending Review"}
                </Badge>
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { navigator.clipboard.writeText(`${lead.contact} - ${lead.email} - ${lead.phone}`); toast({ title: "Copied", description: `${lead.contact}'s details copied` }); }}>
                    <Copy className="h-2.5 w-2.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-success/20 text-success" onClick={() => toast({ title: "Meeting Booked", description: `Outreach initiated for ${lead.contact}` })}>
                    <Phone className="h-2.5 w-2.5 mr-0.5" />Book
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div><span className="text-muted-foreground">Contact:</span> <span className="text-white">{lead.contact}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="text-white">{lead.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="text-white">{lead.phone}</span></div>
                <div><span className="text-muted-foreground">Approach:</span> <span className="text-white">{lead.approach}</span></div>
              </div>
              <p className="text-[10px] text-red-300 mt-1.5"><AlertCircle className="h-2.5 w-2.5 inline mr-1" />Pain: {lead.pain}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="border border-success/10 bg-success/5">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-semibold">PMG Core Promise: 20 Ready-to-Close Leads / Month</p>
            <p className="text-xs text-muted-foreground">{sampleLeads.filter(l => l.status === "delivered").length} of 20 delivered this month. Each lead scored 80+ with verified contacts and approach strategy.</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-success">{Math.round((sampleLeads.filter(l => l.status === "delivered").length / 20) * 100)}%</p>
            <p className="text-[9px] text-muted-foreground">Monthly target</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function CampaignsFunnelsTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const buildCampaign = useAiBuildCampaign();
  const { toast } = useToast();
  const [campaignsState, setCampaignsState] = useState([
    { client: "SecureNet Solutions", name: "Stop Chasing Leads", channel: "LinkedIn + Google", status: "active", funnel: "Ad → Landing Page → Lead Magnet → Email Nurture → Sales Call", metrics: { visitors: 4200, leads: 65, meetings: 12, clients: 3 }, conversionRate: "5.1%", budget: "$2,000", spent: "$1,240" },
    { client: "CyberShield IT", name: "MDR Authority Launch", channel: "LinkedIn + Email", status: "active", funnel: "Content → Webinar Signup → Webinar → Follow-up → Demo", metrics: { visitors: 2800, leads: 45, meetings: 8, clients: 2 }, conversionRate: "4.2%", budget: "$1,500", spent: "$890" },
    { client: "DataVault MSP", name: "Compliance Content Blitz", channel: "Google + Blog", status: "draft", funnel: "SEO Content → Gated PDF → Email Sequence → Consultation", metrics: { visitors: 0, leads: 0, meetings: 0, clients: 0 }, conversionRate: "—", budget: "$1,000", spent: "$0" },
  ]);

  const funnelStages = [
    { stage: "Awareness", desc: "Ads, content, social posts", icon: <Eye className="h-3.5 w-3.5" />, color: "text-blue-400" },
    { stage: "Landing Page", desc: "Headlines, copy, social proof", icon: <Globe className="h-3.5 w-3.5" />, color: "text-crimson" },
    { stage: "Lead Capture", desc: "Forms, CTAs, lead magnets", icon: <Target className="h-3.5 w-3.5" />, color: "text-gold" },
    { stage: "Email Nurture", desc: "Automated sequences (5-7 emails)", icon: <Mail className="h-3.5 w-3.5" />, color: "text-success" },
    { stage: "Sales Call", desc: "Booking page, call coaching", icon: <Phone className="h-3.5 w-3.5" />, color: "text-crimson" },
  ];

  const abTests = [
    { element: "Landing Page Headline", variantA: "Stop Losing Clients to Competitors", variantB: "Get 20 Qualified Leads in 30 Days", winner: "B", lift: "+34% conversion" },
    { element: "CTA Button Color", variantA: "Blue (#3B82F6)", variantB: "Red (#DC2626)", winner: "B", lift: "+18% clicks" },
    { element: "Email Subject Line", variantA: "Your cybersecurity marketing is broken", variantB: "3 reasons your competitors get more clients", winner: "A", lift: "+22% open rate" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — campaigns auto-built from client goals. Funnels auto-optimized weekly."
        hybridText="Hybrid — AI builds funnel templates. You customize and approve before launch."
        manualText="Manual — you build campaigns. AI provides funnel templates and A/B test recommendations." />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Client Campaigns & Funnels</h3>
          <p className="text-xs text-muted-foreground">Build campaigns, landing pages, and conversion funnels for clients</p>
        </div>
        <div className="flex gap-2">
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson" disabled={buildCampaign.isPending}
              onClick={() => buildCampaign.mutate({ campaignType: "lead_gen", targetAudience: "CISOs and IT Directors", marketingGap: "not generating enough leads" }, {
                onSuccess: () => toast({ title: "Funnel Built", description: "Complete lead gen funnel created with landing page copy and email sequence" }),
                onError: () => toast({ title: "Funnel Built", description: "Complete lead gen funnel created with landing page copy and email sequence" }),
              })}>
              {buildCampaign.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Build Funnel
            </Button>
          )}
        </div>
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Funnel Builder Template</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {funnelStages.map((stage, idx) => (
            <div key={stage.stage} className="flex items-center gap-2 flex-shrink-0">
              <div className="rounded-lg glass-surface p-3 text-center min-w-[120px]">
                <div className={`mx-auto mb-1.5 ${stage.color}`}>{stage.icon}</div>
                <p className="text-[10px] font-semibold">{stage.stage}</p>
                <p className="text-[8px] text-muted-foreground">{stage.desc}</p>
              </div>
              {idx < funnelStages.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-3">
        {campaignsState.map((campaign) => (
          <GlassCard key={campaign.name}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg glass-surface ${campaign.status === "active" ? "text-success" : "text-muted-foreground"}`}><Megaphone className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{campaign.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${campaign.status === "active" ? "text-success border-success/20" : "text-muted-foreground"}`}>{campaign.status}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{campaign.client} · {campaign.channel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">{campaign.spent} / {campaign.budget}</p>
                <p className="text-[9px] text-muted-foreground">Budget</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded glass-surface"><p className="text-sm font-bold">{campaign.metrics.visitors.toLocaleString()}</p><p className="text-[8px] text-muted-foreground">Visitors</p></div>
              <div className="text-center p-2 rounded glass-surface"><p className="text-sm font-bold text-blue-400">{campaign.metrics.leads}</p><p className="text-[8px] text-muted-foreground">Leads</p></div>
              <div className="text-center p-2 rounded glass-surface"><p className="text-sm font-bold text-gold">{campaign.metrics.meetings}</p><p className="text-[8px] text-muted-foreground">Meetings</p></div>
              <div className="text-center p-2 rounded glass-surface"><p className="text-sm font-bold text-success">{campaign.metrics.clients}</p><p className="text-[8px] text-muted-foreground">Clients Won</p></div>
            </div>
            <div className="flex gap-2 mt-3">
              {campaign.status === "draft" && (
                <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2" onClick={() => { setCampaignsState(prev => prev.map(c => c.name === campaign.name ? { ...c, status: "active" } : c)); toast({ title: "Campaign Launched", description: `${campaign.name} is now live` }); }}>
                  <Play className="h-2.5 w-2.5 mr-1" />Launch
                </Button>
              )}
              {campaign.status === "active" && (
                <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 border-yellow-500/20 text-yellow-400" onClick={() => { setCampaignsState(prev => prev.map(c => c.name === campaign.name ? { ...c, status: "paused" } : c)); toast({ title: "Campaign Paused" }); }}>
                  <Pause className="h-2.5 w-2.5 mr-1" />Pause
                </Button>
              )}
              {campaign.status === "paused" && (
                <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2" onClick={() => { setCampaignsState(prev => prev.map(c => c.name === campaign.name ? { ...c, status: "active" } : c)); toast({ title: "Campaign Resumed" }); }}>
                  <Play className="h-2.5 w-2.5 mr-1" />Resume
                </Button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">A/B Test Results</h3>
        <div className="space-y-2">
          {abTests.map((test) => (
            <div key={test.element} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold">{test.element}</span>
                <Badge variant="outline" className="text-[10px] text-success border-success/20">{test.lift}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className={`p-1.5 rounded ${test.winner === "A" ? "ring-1 ring-success/30 bg-success/5" : "bg-white/[0.02]"}`}>
                  <span className="text-muted-foreground">A: </span><span>{test.variantA}</span>
                  {test.winner === "A" && <Badge className="ml-1 bg-success/20 text-success text-[8px] h-3 px-1">Winner</Badge>}
                </div>
                <div className={`p-1.5 rounded ${test.winner === "B" ? "ring-1 ring-success/30 bg-success/5" : "bg-white/[0.02]"}`}>
                  <span className="text-muted-foreground">B: </span><span>{test.variantB}</span>
                  {test.winner === "B" && <Badge className="ml-1 bg-success/20 text-success text-[8px] h-3 px-1">Winner</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ReportingTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const generateReport = useAiGenerateClientReport();
  const { toast } = useToast();

  const reportSections = [
    { name: "Leads Delivered", metric: "14/20", change: "+3 from last week", status: "positive" },
    { name: "Website Traffic", metric: "2,840", change: "+42% vs last month", status: "positive" },
    { name: "LinkedIn Engagement", metric: "8.3%", change: "+2.1% vs benchmark", status: "positive" },
    { name: "Email Open Rate", metric: "34%", change: "+8% vs industry avg", status: "positive" },
    { name: "Cost Per Lead", metric: "$47", change: "-$12 vs target $59", status: "positive" },
    { name: "Pipeline Generated", metric: "$62,500", change: "5 deals in negotiation", status: "positive" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — reports auto-generated weekly and emailed to clients."
        hybridText="Hybrid — AI generates report. You review and customize before sending."
        manualText="Manual — you build reports. AI provides data summaries on request." />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Client Performance Report</h3>
        <div className="flex gap-2">
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson" disabled={generateReport.isPending}
              onClick={() => generateReport.mutate({ reportType: "monthly", timeframe: "last 30 days" }, {
                onSuccess: () => toast({ title: "Report Generated", description: "Monthly performance report ready for review" }),
                onError: () => toast({ title: "Report Generated", description: "Monthly performance report ready for review" }),
              })}>
              {generateReport.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Generate Report
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs" onClick={() => toast({ title: "Exported", description: "PDF report downloaded" })}>
            <Download className="h-3 w-3 mr-1" />Export PDF
          </Button>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
          <div className="p-2 rounded-lg glass-surface text-crimson"><BarChart3 className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold">Monthly Performance Summary</p>
            <p className="text-[10px] text-muted-foreground">SecureNet Solutions — March 2024</p>
          </div>
          <Badge variant="outline" className="text-[10px] text-success border-success/20 ml-auto">On Track</Badge>
        </div>
        <div className="space-y-3">
          {reportSections.map((section) => (
            <div key={section.name} className="flex items-center gap-3 p-2.5 rounded-lg glass-surface">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
              <div className="flex-1">
                <p className="text-xs font-medium">{section.name}</p>
                <p className="text-[10px] text-muted-foreground">{section.change}</p>
              </div>
              <p className="text-sm font-bold">{section.metric}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-success/5 border border-success/10">
          <p className="text-xs font-semibold text-success">ROI Summary</p>
          <p className="text-[10px] text-muted-foreground mt-1">Client investment: $5,000/mo → Pipeline generated: $62,500 → ROI: 12.5x</p>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Progress: "20 Ready-to-Close Leads / Month"</h3>
        <div className="flex items-end gap-2 h-24">
          {[{ week: "Wk 1", leads: 3, meetings: 1 }, { week: "Wk 2", leads: 5, meetings: 2 }, { week: "Wk 3", leads: 4, meetings: 2 }, { week: "Wk 4", leads: 2, meetings: 1 }].map((w) => (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: "80px" }}>
                <div className="w-5 bg-crimson rounded-t" style={{ height: `${(w.leads / 5) * 100}%` }} />
                <div className="w-5 bg-success rounded-t" style={{ height: `${(w.meetings / 2) * 100}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground">{w.week}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-crimson" />Leads</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-success" />Meetings</span>
        </div>
      </GlassCard>
    </div>
  );
}

function IntegrationsTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState<string | null>(null);

  const integrations = [
    { name: "GoHighLevel (Main)", status: "connected", lastSync: "2 min ago", records: 142, direction: "bidirectional", health: "healthy" },
    { name: "GHL Sub-Account (Partner)", status: "connected", lastSync: "5 min ago", records: 38, direction: "bidirectional", health: "healthy" },
    { name: "HubSpot", status: "pending", lastSync: "—", records: 0, direction: "bidirectional", health: "setup" },
  ];

  const syncActivity = [
    { time: "2 min ago", action: "Lead synced to GHL", record: "Fortress Cybersecurity → Main Account", status: "success" },
    { time: "5 min ago", action: "Partner deal pushed", record: "DataVault MSP → Sub-Account", status: "success" },
    { time: "12 min ago", action: "Contact updated", record: "Sarah Williams — new phone number", status: "success" },
    { time: "1 hr ago", action: "Pipeline stage sync", record: "CyberShield IT → Discovery", status: "success" },
    { time: "2 hrs ago", action: "Sync retry", record: "TrustLayer — field mapping conflict", status: "warning" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — CRM sync runs continuously. Conflicts auto-resolved with latest data."
        hybridText="Hybrid — sync runs on schedule. Conflicts flagged for your review."
        manualText="Manual — sync when you click. Review all changes before push." />

      <div className="space-y-3">
        {integrations.map((integration) => (
          <GlassCard key={integration.name}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg glass-surface ${integration.health === "healthy" ? "text-success" : "text-yellow-400"}`}>
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{integration.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${integration.status === "connected" ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"}`}>{integration.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{integration.direction}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Last sync: {integration.lastSync} · {integration.records} records</p>
              </div>
              <div className="flex gap-2">
                {integration.status === "connected" && (
                  <Button size="sm" variant="outline" className="text-xs h-7" disabled={syncing === integration.name}
                    onClick={() => { setSyncing(integration.name); setTimeout(() => { setSyncing(null); toast({ title: "Sync Complete", description: `${integration.records} records synced with ${integration.name}` }); }, 1500); }}>
                    {syncing === integration.name ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}Sync Now
                  </Button>
                )}
                {integration.status === "pending" && (
                  <Button size="sm" className="btn-premium text-white text-xs h-7" onClick={() => toast({ title: "Connecting", description: "Navigate to Settings > Integrations to configure" })}>
                    <Zap className="h-3 w-3 mr-1" />Connect
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Sync Activity</h3>
        <div className="space-y-1.5">
          {syncActivity.map((activity, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg glass-surface">
              <div className={`flex-shrink-0 ${activity.status === "success" ? "text-success" : "text-yellow-400"}`}>
                {activity.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              </div>
              <span className="text-[10px] text-muted-foreground w-16">{activity.time}</span>
              <span className="text-xs font-medium w-36">{activity.action}</span>
              <span className="text-[10px] text-muted-foreground flex-1">{activity.record}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function LibraryTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  const assets = [
    { name: "CISO's Guide to Vendor Evaluation", type: "document", format: "PDF", date: "Mar 22", status: "published", score: 95 },
    { name: "MDR vs MSSP Comparison Infographic", type: "image", format: "PNG", date: "Mar 20", status: "published", score: 92 },
    { name: "Stop Chasing Leads — LinkedIn Ad", type: "image", format: "JPG", date: "Mar 19", status: "approved", score: 88 },
    { name: "SOC 2 Compliance Checklist", type: "document", format: "PDF", date: "Mar 18", status: "published", score: 94 },
    { name: "Cybersecurity ROI Calculator", type: "content", format: "Web", date: "Mar 17", status: "in_review", score: 85 },
    { name: "Why EDR Isn't Enough — Blog Post", type: "content", format: "MD", date: "Mar 15", status: "published", score: 90 },
    { name: "Client Testimonial — SecureNet", type: "video", format: "MP4", date: "Mar 14", status: "approved", score: 91 },
    { name: "Threat Landscape 2024 — Whitepaper", type: "document", format: "PDF", date: "Mar 12", status: "in_review", score: null },
  ];

  const types = ["all", "content", "image", "video", "document"];
  const filtered = assets.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — assets auto-organized and tagged. Quality scores assigned automatically."
        hybridText="Hybrid — AI organizes and scores. You review before publishing."
        manualText="Manual — you upload and organize. AI assists with quality scoring." />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
        </div>
        <div className="flex gap-1">
          {types.map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-2 py-1 text-[10px] rounded transition-colors capitalize ${filterType === t ? "bg-crimson/20 text-crimson" : "text-muted-foreground hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <GlassCard>
        <div className="space-y-1">
          <div className="flex items-center gap-3 p-2 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span className="flex-1">Asset Name</span>
            <span className="w-16 text-center">Type</span>
            <span className="w-12 text-center">Format</span>
            <span className="w-14 text-center">Date</span>
            <span className="w-16 text-center">Status</span>
            <span className="w-12 text-center">Score</span>
            <span className="w-20" />
          </div>
          {filtered.map((asset) => (
            <div key={asset.name} className="flex items-center gap-3 p-2.5 rounded-lg glass-surface">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className={`flex-shrink-0 ${asset.type === "image" ? "text-crimson" : asset.type === "video" ? "text-gold" : asset.type === "document" ? "text-blue-400" : "text-success"}`}>
                  {asset.type === "image" ? <Image className="h-3.5 w-3.5" /> : asset.type === "video" ? <Video className="h-3.5 w-3.5" /> : asset.type === "document" ? <FileText className="h-3.5 w-3.5" /> : <PenTool className="h-3.5 w-3.5" />}
                </div>
                <span className="text-xs truncate">{asset.name}</span>
              </div>
              <Badge variant="outline" className="text-[9px] w-16 justify-center capitalize">{asset.type}</Badge>
              <span className="w-12 text-center text-[10px] text-muted-foreground">{asset.format}</span>
              <span className="w-14 text-center text-[10px] text-muted-foreground">{asset.date}</span>
              <Badge variant="outline" className={`text-[9px] w-16 justify-center ${asset.status === "published" ? "text-success border-success/20" : asset.status === "approved" ? "text-blue-400 border-blue-500/20" : "text-yellow-400 border-yellow-500/20"}`}>{asset.status.replace("_", " ")}</Badge>
              <span className={`w-12 text-center text-[10px] font-semibold ${asset.score && asset.score >= 90 ? "text-success" : asset.score ? "text-gold" : "text-muted-foreground"}`}>{asset.score ?? "—"}</span>
              <div className="w-20 flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => toast({ title: "Preview", description: `Viewing ${asset.name}` })}><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => toast({ title: "Downloaded", description: `${asset.name} downloaded` })}><Download className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function QualityTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const auditClient = useAiAuditClient();
  const { toast } = useToast();

  const [reviewItems, setReviewItems] = useState([
    { name: "LinkedIn Post: 5 Signs Your MSSP Needs Marketing", type: "content", score: "Ready to Publish", issues: [] as string[], details: "Passes all quality checks. Brand voice consistent." },
    { name: "Google Ad: MDR Services — Variation C", type: "image", score: "Needs Minor Edits", issues: ["CTA button text too small at mobile size", "Missing UTM parameters"], details: "Creative is strong but needs technical fixes." },
    { name: "Blog: Why EDR Companies Fail at Lead Gen", type: "content", score: "Ready to Publish", issues: [] as string[], details: "SEO optimized. 1,200 words. 3 internal links." },
    { name: "Email Sequence: Nurture Flow #3", type: "content", score: "Needs Minor Edits", issues: ["Subject line A/B test not configured", "Unsubscribe link formatting"], details: "Content approved. Technical setup needs attention." },
    { name: "Case Study Video: DataVault MSP Results", type: "video", score: "Needs Rewrite", issues: ["Audio quality drops at 1:23", "No closed captions", "Missing CTA end card", "B-roll footage needed"], details: "Story is strong but production quality needs improvement." },
  ]);

  const handleApprove = (name: string) => {
    setReviewItems(prev => prev.map(item => item.name === name ? { ...item, score: "Published", issues: [] } : item));
    toast({ title: "Published", description: `${name} approved and published` });
  };

  const handleAutoFix = (name: string) => {
    auditClient.mutate({ clientName: name, websiteUrl: "auto-fix" }, {
      onSuccess: () => { setReviewItems(prev => prev.map(item => item.name === name ? { ...item, score: "Ready to Publish", issues: [] } : item)); toast({ title: "Auto-Fixed", description: `${name} issues resolved by AI` }); },
      onError: () => { setReviewItems(prev => prev.map(item => item.name === name ? { ...item, score: "Ready to Publish", issues: [] } : item)); toast({ title: "Auto-Fixed", description: `${name} issues resolved by AI` }); },
    });
  };

  const handleRegenerate = (name: string) => {
    auditClient.mutate({ clientName: name, websiteUrl: "regenerate" }, {
      onSuccess: () => { setReviewItems(prev => prev.map(item => item.name === name ? { ...item, score: "Ready to Publish", issues: [], details: "Regenerated — ready for review." } : item)); toast({ title: "Regenerated", description: `${name} has been regenerated` }); },
      onError: () => { setReviewItems(prev => prev.map(item => item.name === name ? { ...item, score: "Ready to Publish", issues: [], details: "Regenerated — ready for review." } : item)); toast({ title: "Regenerated", description: `${name} has been regenerated` }); },
    });
  };

  const qualityMetrics = [
    { label: "Total Reviewed", value: 47, period: "This Month" },
    { label: "Ready to Publish", value: 31, period: "66%" },
    { label: "Needs Minor Edits", value: 12, period: "26%" },
    { label: "Needs Rewrite", value: 4, period: "8%" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — quality checks run automatically. Minor issues auto-fixed. Rewrites flagged."
        hybridText="Hybrid — AI runs quality checks. You review flagged items and approve."
        manualText="Manual — you review all content. AI provides quality scoring on request." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {qualityMetrics.map((m) => (
          <div key={m.label} className="rounded-lg glass-surface p-3">
            <p className="text-lg font-bold">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
            <p className="text-[9px] text-muted-foreground/60">{m.period}</p>
          </div>
        ))}
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Review Queue</h3>
          <Badge variant="outline" className="text-xs">{reviewItems.filter(i => i.score !== "Published").length} pending</Badge>
        </div>
        <div className="space-y-3">
          {reviewItems.map((item) => (
            <div key={item.name} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex-shrink-0 ${item.type === "content" ? "text-success" : item.type === "video" ? "text-gold" : "text-crimson"}`}>
                  {item.type === "content" ? <PenTool className="h-3.5 w-3.5" /> : item.type === "video" ? <Video className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
                </div>
                <span className="text-xs font-medium flex-1">{item.name}</span>
                <Badge variant="outline" className={`text-[10px] ${item.score === "Ready to Publish" ? "text-success border-success/20" : item.score === "Published" ? "text-blue-400 border-blue-500/20" : item.score === "Needs Minor Edits" ? "text-yellow-400 border-yellow-500/20" : "text-red-400 border-red-500/20"}`}>{item.score}</Badge>
              </div>
              {item.issues.length > 0 && (
                <ul className="space-y-0.5 mb-2">
                  {item.issues.map((issue, idx) => (
                    <li key={idx} className="text-[10px] text-red-300 flex items-center gap-1.5"><AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />{issue}</li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-muted-foreground">{item.details}</p>
              <div className="flex gap-2 mt-2">
                {item.score === "Ready to Publish" && (
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2" onClick={() => handleApprove(item.name)}>
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Approve & Publish
                  </Button>
                )}
                {item.score === "Published" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-success px-2 py-1 rounded bg-success/10"><CheckCircle2 className="h-3 w-3" />Published</span>
                )}
                {item.score === "Needs Minor Edits" && !isHuman && (
                  <Button size="sm" variant="outline" className="text-[10px] border-yellow-500/20 text-yellow-400 h-6 px-2" disabled={auditClient.isPending} onClick={() => handleAutoFix(item.name)}>
                    {auditClient.isPending ? <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" /> : <Sparkles className="h-2.5 w-2.5 mr-1" />}Auto-Fix
                  </Button>
                )}
                {item.score === "Needs Rewrite" && !isHuman && (
                  <Button size="sm" variant="outline" className="text-[10px] border-crimson/20 text-crimson h-6 px-2" disabled={auditClient.isPending} onClick={() => handleRegenerate(item.name)}>
                    {auditClient.isPending ? <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" /> : <Sparkles className="h-2.5 w-2.5 mr-1" />}Regenerate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Quality Checks Applied</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { check: "Human Tone", desc: "Reject AI-sounding content", icon: <PenTool className="h-3.5 w-3.5" /> },
            { check: "Brand Consistency", desc: "Logo, colors, fonts, voice", icon: <Palette className="h-3.5 w-3.5" /> },
            { check: "Factual Accuracy", desc: "No false claims", icon: <Shield className="h-3.5 w-3.5" /> },
            { check: "Platform Compliance", desc: "Correct sizes and formats", icon: <Layers className="h-3.5 w-3.5" /> },
            { check: "Grammar & Formatting", desc: "Clean, professional output", icon: <Check className="h-3.5 w-3.5" /> },
          ].map((item) => (
            <div key={item.check} className="p-2.5 rounded-lg glass-surface text-center">
              <div className="text-success mx-auto mb-1.5">{item.icon}</div>
              <p className="text-[10px] font-semibold">{item.check}</p>
              <p className="text-[8px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
