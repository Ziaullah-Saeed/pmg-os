import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { AiResultPanel } from "@/components/ai-result-panel";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
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
  Download, Eye, Star, Shield, Layers, Search, Filter, RefreshCw,
  Upload, Play, Pause, BarChart3, TrendingUp, Zap, Check,
  Clipboard, Phone, Globe, Mail, Camera, Film, FileImage,
  Megaphone, Target, Award, AlertCircle, ChevronRight
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
  const [aiResult, setAiResult] = useState<any>(null);
  const { isHuman } = useAiModeContext();
  const onboardClient = useAiOnboardClient();
  const auditClient = useAiAuditClient();
  const createImage = useAiCreateImage();
  const createVideo = useAiCreateVideo();
  const createDocument = useAiCreateDocument();
  const generateLeads = useAiGenerateLeads();
  const buildCampaign = useAiBuildCampaign();
  const generateReport = useAiGenerateClientReport();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Production"
        subtitle={isHuman ? "Client delivery, creative assets, and content management" : "AI-powered production engine — onboarding to delivery"}
        icon={<Palette className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
                          <Button variant="outline" className="text-sm border-crimson/30 text-crimson hover:bg-crimson/10"
                disabled={createImage.isPending}
                onClick={() => createImage.mutate({ type: "social_graphic", description: "Cybersecurity marketing visual", brandColors: "#001a4d #8B0000 #FFD700" }, {
                  onSuccess: (data) => setAiResult({ type: "image_prompt", data }),
                })}>
                {createImage.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Generate Assets
              </Button>
            
            <Button className="btn-premium text-white text-sm">
              <Plus className="h-4 w-4 mr-2" />New Client
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Clients" value={3} icon={<UserCheck className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Assets Created" value={47} icon={<Image className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Pending Review" value={5} icon={<BookOpen className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Quality Score" value="94%" icon={<Star className="h-4 w-4" />} accent="success" />
      </div>

      <div className="flex gap-1 border-b border-white/5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
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
          {activeTab === "onboarding" && <OnboardingTab isHuman={isHuman} />}
          {activeTab === "audit" && <AuditTab isHuman={isHuman} />}
          {activeTab === "creative" && <CreativeTab isHuman={isHuman} />}
          {activeTab === "leads" && <LeadGenTab isHuman={isHuman} />}
          {activeTab === "campaigns" && <CampaignsFunnelsTab isHuman={isHuman} />}
          {activeTab === "reporting" && <ReportingTab isHuman={isHuman} />}
          {activeTab === "integrations" && <IntegrationsTab isHuman={isHuman} />}
          {activeTab === "library" && <LibraryTab isHuman={isHuman} />}
          {activeTab === "quality" && <QualityTab isHuman={isHuman} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OnboardingTab({ isHuman }: { isHuman: boolean }) {
  const clients = [
    {
      name: "SecureNet Solutions",
      status: "in_progress",
      progress: 5,
      total: 7,
      currentStep: "Choose CRM setup",
      startDate: "2024-03-15",
    },
    {
      name: "CyberGuard MSP",
      status: "completed",
      progress: 7,
      total: 7,
      currentStep: "Complete",
      startDate: "2024-02-01",
    },
    {
      name: "ShieldTech IT",
      status: "new",
      progress: 1,
      total: 7,
      currentStep: "Collect brand assets",
      startDate: "2024-03-28",
    },
  ];

  const checklistSteps = [
    { step: 1, label: "Collect brand assets (logo, colors, fonts, guidelines)", icon: <Palette className="h-3.5 w-3.5" /> },
    { step: 2, label: "Get access (website, socials, analytics, CRM)", icon: <Globe className="h-3.5 w-3.5" /> },
    { step: 3, label: "Define target audience", icon: <Target className="h-3.5 w-3.5" /> },
    { step: 4, label: "Document services and differentiators", icon: <FileText className="h-3.5 w-3.5" /> },
    { step: 5, label: "Set goals (leads, revenue, growth targets)", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { step: 6, label: "Choose CRM: PMG's (included) or GHL/HubSpot", icon: <RefreshCw className="h-3.5 w-3.5" /> },
    { step: 7, label: "Configure partner close & GHL sub-account sync", icon: <Zap className="h-3.5 w-3.5" /> },
  ];

  const [expanded, setExpanded] = useState<string | null>("SecureNet Solutions");

  return (
    <div className="space-y-4">
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
        {clients.map((client) => (
          <GlassCard key={client.name} variant="interactive" className="cursor-pointer" onClick={() => setExpanded(expanded === client.name ? null : client.name)}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg glass-surface ${
                client.status === "completed" ? "text-success" :
                client.status === "in_progress" ? "text-gold" : "text-blue-400"
              }`}>
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{client.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${
                    client.status === "completed" ? "text-success border-success/20" :
                    client.status === "in_progress" ? "text-gold border-gold/20" :
                    "text-blue-400 border-blue-500/20"
                  }`}>{client.status === "in_progress" ? "In Progress" : client.status === "completed" ? "Complete" : "New"}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Step {client.progress}/{client.total} — {client.currentStep}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded bg-white/5">
                  <div
                    className={`h-full rounded ${client.status === "completed" ? "bg-success" : "bg-crimson"}`}
                    style={{ width: `${(client.progress / client.total) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{Math.round((client.progress / client.total) * 100)}%</span>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === client.name ? "rotate-90" : ""}`} />
              </div>
            </div>

            {expanded === client.name && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
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
                        <Button size="sm" className="ml-auto btn-premium text-white text-[10px] h-6 px-2">
                          <ArrowRight className="h-2.5 w-2.5 mr-1" />Start
                        </Button>
                      )}
                    </div>
                  );
                })}
                {client.status === "completed" && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson">
                      <BarChart3 className="h-3 w-3 mr-1" />Run Marketing Audit
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />View 90-Day Plan
                    </Button>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ isHuman }: { isHuman: boolean }) {
  const auditClient = useAiAuditClient();
  const [aiResult, setAiResult] = useState<any>(null);
  const auditResults = [
    { area: "Website", score: 42, issues: ["No clear value proposition above fold", "Missing case studies page", "No lead capture forms", "Page load 5.1s mobile"], priority: "critical" },
    { area: "Social Media", score: 28, issues: ["LinkedIn: 2 posts/month (need 12+)", "No consistent branding across platforms", "Zero engagement strategy", "No video content"], priority: "critical" },
    { area: "Advertising", score: 15, issues: ["No active paid campaigns", "No retargeting pixels installed", "No landing pages for campaigns", "No conversion tracking"], priority: "critical" },
    { area: "Email Marketing", score: 55, issues: ["Email list exists but no automation", "No segmentation", "Generic newsletter — not targeted"], priority: "high" },
    { area: "SEO", score: 38, issues: ["Ranking for 0 cybersecurity keywords", "Missing meta descriptions on 80% pages", "No blog content strategy", "No backlinks from industry sites"], priority: "high" },
    { area: "Competitor Position", score: 60, issues: ["Strong service offering but invisible online", "No lead guarantee differentiator promoted", "Pricing not competitive on website"], priority: "medium" },
  ];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Client Audit" />}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Client Marketing Audit</h3>
          <p className="text-xs text-muted-foreground">Brutally honest assessment of current marketing effectiveness</p>
        </div>
                  <Button size="sm" className="btn-premium text-white text-xs"
            disabled={auditClient.isPending}
            onClick={() => auditClient.mutate({ clientName: "Client", websiteUrl: "https://example.com" }, {
              onSuccess: (data) => setAiResult({ type: "audit", data }),
            })}>
            {auditClient.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Run Full Audit
          </Button>
        
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
                <Badge variant="outline" className={`text-[10px] ${
                  item.priority === "critical" ? "text-red-400 border-red-500/20" :
                  item.priority === "high" ? "text-yellow-400 border-yellow-500/20" :
                  "text-blue-400 border-blue-500/20"
                }`}>{item.priority}</Badge>
                <span className={`text-xs font-bold ml-auto ${item.score >= 60 ? "text-success" : item.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                  {item.score}/100
                </span>
              </div>
              <ul className="space-y-1">
                {item.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <AlertCircle className="h-2.5 w-2.5 text-red-400 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
                              <Button size="sm" variant="outline" className="mt-2 text-[10px] border-crimson/20 text-crimson h-6 px-2"
                  disabled={auditClient.isPending}
                  onClick={() => auditClient.mutate({ clientName: item.area, websiteUrl: "https://example.com" }, {
                    onSuccess: (data) => setAiResult({ type: "fix_plan", data }),
                  })}>
                  {auditClient.isPending ? <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" /> : <Sparkles className="h-2.5 w-2.5 mr-1" />}Generate Fix Plan
                </Button>
              
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function CreativeTab({ isHuman }: { isHuman: boolean }) {
  const createImage = useAiCreateImage();
  const createVideo = useAiCreateVideo();
  const createDocument = useAiCreateDocument();
  const [aiResult, setAiResult] = useState<any>(null);
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

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Creative Assets" />}
              <GlassCard className="border border-crimson/10 bg-crimson/5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-crimson" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Creative Production Engine</p>
              <p className="text-xs text-muted-foreground">Describe what you need. AI generates preview. Review and download in any format.</p>
            </div>
            <Button size="sm" className="btn-premium text-white text-xs">
              <Plus className="h-3 w-3 mr-1" />Create Asset
            </Button>
          </div>
        </GlassCard>
      

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Image className="h-4 w-4 text-crimson" />Text-to-Image
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {imageTypes.map((item) => (
            <div key={item.type} className="rounded-lg glass-surface p-3 text-center hover:ring-1 hover:ring-crimson/20 transition-all cursor-pointer">
              <div className="text-crimson mx-auto mb-2">{item.icon}</div>
              <p className="text-xs font-semibold">{item.type}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{item.tool}</p>
              <p className="text-[8px] text-muted-foreground/60">{item.formats}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Video className="h-4 w-4 text-gold" />Text-to-Video
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {videoTypes.map((item) => (
            <div key={item.type} className="rounded-lg glass-surface p-3 text-center hover:ring-1 hover:ring-gold/20 transition-all cursor-pointer">
              <div className="text-gold mx-auto mb-2">{item.icon}</div>
              <p className="text-xs font-semibold">{item.type}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{item.tool}</p>
              <p className="text-[8px] text-muted-foreground/60">{item.formats}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" />Documents
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {docTypes.map((item) => (
            <div key={item.type} className="rounded-lg glass-surface p-3 text-center hover:ring-1 hover:ring-blue-400/20 transition-all cursor-pointer">
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

function LeadGenTab({ isHuman }: { isHuman: boolean }) {
  const generateLeads = useAiGenerateLeads();
  const [aiResult, setAiResult] = useState<any>(null);
  const sampleLeads = [
    { company: "Fortress Cybersecurity", contact: "James Chen, CEO", email: "j.chen@fortresscyber.com", phone: "(512) 555-0142", score: 92, pain: "No marketing presence, losing to competitors with worse service", approach: "Reference competitor analysis showing their gap", status: "delivered" },
    { company: "DataVault MSP", contact: "Sarah Williams, VP Sales", email: "sarah@datavaultmsp.com", phone: "(213) 555-0198", score: 88, pain: "Spending $4k/mo on ads with zero leads", approach: "Show ROI data from similar-sized MSP client", status: "delivered" },
    { company: "CyberShield IT", contact: "Mike Torres, Founder", email: "mike@cybershieldit.io", phone: "(312) 555-0267", score: 85, pain: "Growing team but all leads from referrals only", approach: "Discuss scalable lead gen beyond referral ceiling", status: "pending_review" },
    { company: "TrustLayer Security", contact: "Priya Patel, CMO", email: "priya@trustlayer.com", phone: "(415) 555-0334", score: 81, pain: "Website gets 200 visits/mo, competitors get 5000+", approach: "SEO audit showing quick wins for traffic growth", status: "pending_review" },
  ];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Lead Generation" />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Leads Delivered (Month)</p>
          <p className="text-lg font-bold text-success">14</p>
          <p className="text-[9px] text-muted-foreground">Target: 20</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Avg Quality Score</p>
          <p className="text-lg font-bold text-gold">86.5</p>
          <p className="text-[9px] text-muted-foreground">Min threshold: 80</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Meetings Booked</p>
          <p className="text-lg font-bold text-crimson">6</p>
          <p className="text-[9px] text-muted-foreground">From delivered leads</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Pipeline Value</p>
          <p className="text-lg font-bold text-blue-400">$42,000</p>
          <p className="text-[9px] text-muted-foreground">From generated leads</p>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Generated Leads — Quality Verified (80+ Score Only)</h3>
                      <Button size="sm" className="btn-premium text-white text-xs"
              disabled={generateLeads.isPending}
              onClick={() => generateLeads.mutate({ clientName: "PMG Group", targetMarket: "Enterprise Cybersecurity", industryFocus: "Tech, Finance, Healthcare" }, {
                onSuccess: (data) => setAiResult({ type: "leads", data }),
              })}>
              {generateLeads.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Generate More Leads
            </Button>
          
        </div>
        <div className="space-y-2">
          {sampleLeads.map((lead) => (
            <div key={lead.company} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-sm font-semibold">{lead.company}</p>
                <Badge variant="outline" className={`text-[10px] ${lead.score >= 90 ? "text-success border-success/20" : "text-gold border-gold/20"}`}>
                  Score: {lead.score}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${lead.status === "delivered" ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"}`}>
                  {lead.status === "delivered" ? "Delivered" : "Pending Review"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div><span className="text-muted-foreground">Contact:</span> <span className="text-white">{lead.contact}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="text-white">{lead.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="text-white">{lead.phone}</span></div>
                <div><span className="text-muted-foreground">Approach:</span> <span className="text-white">{lead.approach}</span></div>
              </div>
              <p className="text-[10px] text-red-300 mt-1.5">
                <AlertCircle className="h-2.5 w-2.5 inline mr-1" />Pain: {lead.pain}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="border border-success/10 bg-success/5">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-semibold">PMG Core Promise: 20 Ready-to-Close Leads / Month</p>
            <p className="text-xs text-muted-foreground">14 of 20 delivered this month. Each lead scored 80+ with verified contacts and approach strategy.</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-success">70%</p>
            <p className="text-[9px] text-muted-foreground">Monthly target</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function CampaignsFunnelsTab({ isHuman }: { isHuman: boolean }) {
  const buildCampaign = useAiBuildCampaign();
  const [aiResult, setAiResult] = useState<any>(null);
  const campaigns = [
    {
      client: "SecureNet Solutions",
      name: "EDR Solutions LinkedIn Campaign",
      channel: "LinkedIn Ads",
      status: "active",
      funnel: "Ad → Landing Page → Form → Email Nurture → Sales Call",
      metrics: { visitors: 1240, leads: 68, meetings: 12, clients: 3 },
      conversionRate: "5.5%",
      budget: "$800",
      spent: "$620",
    },
    {
      client: "CyberGuard MSP",
      name: "Google Search — Managed Security",
      channel: "Google Ads",
      status: "active",
      funnel: "Search → Landing Page → Lead Capture → Retarget → Call",
      metrics: { visitors: 890, leads: 42, meetings: 8, clients: 2 },
      conversionRate: "4.7%",
      budget: "$600",
      spent: "$445",
    },
    {
      client: "ShieldTech IT",
      name: "Facebook Lead Gen — Compliance Audit",
      channel: "Facebook Ads",
      status: "draft",
      funnel: "Ad → Lead Form → Email Sequence → Booking Page",
      metrics: { visitors: 0, leads: 0, meetings: 0, clients: 0 },
      conversionRate: "—",
      budget: "$500",
      spent: "$0",
    },
  ];

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
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Campaign Builder" />}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Client Campaigns & Funnels</h3>
          <p className="text-xs text-muted-foreground">Build campaigns, landing pages, and conversion funnels for clients</p>
        </div>
        <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
              disabled={buildCampaign.isPending}
              onClick={() => buildCampaign.mutate({ campaignType: "lead_gen", targetAudience: "CISOs and IT Directors", marketingGap: "not generating enough leads" }, {
                onSuccess: (data) => setAiResult({ type: "campaign", data }),
              })}>
              {buildCampaign.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Build Funnel
            </Button>
          
          <Button size="sm" className="btn-premium text-white text-xs">
            <Plus className="h-3 w-3 mr-1" />New Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Active Campaigns</p>
          <p className="text-lg font-bold text-crimson">2</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Total Leads Generated</p>
          <p className="text-lg font-bold text-success">110</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Avg Conversion Rate</p>
          <p className="text-lg font-bold text-gold">5.1%</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Pipeline from Campaigns</p>
          <p className="text-lg font-bold text-blue-400">$62,500</p>
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
              {idx < funnelStages.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <GlassCard key={campaign.name}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg glass-surface ${campaign.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{campaign.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${
                    campaign.status === "active" ? "text-success border-success/20" : "text-muted-foreground"
                  }`}>{campaign.status}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{campaign.client} · {campaign.channel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">{campaign.spent} / {campaign.budget}</p>
                <p className="text-[9px] text-muted-foreground">Budget</p>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] mb-3">
              <p className="text-[10px] text-muted-foreground mb-1">Funnel Flow</p>
              <p className="text-[10px] text-white font-mono">{campaign.funnel}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded glass-surface">
                <p className="text-sm font-bold">{campaign.metrics.visitors.toLocaleString()}</p>
                <p className="text-[8px] text-muted-foreground">Visitors</p>
              </div>
              <div className="text-center p-2 rounded glass-surface">
                <p className="text-sm font-bold text-blue-400">{campaign.metrics.leads}</p>
                <p className="text-[8px] text-muted-foreground">Leads</p>
              </div>
              <div className="text-center p-2 rounded glass-surface">
                <p className="text-sm font-bold text-gold">{campaign.metrics.meetings}</p>
                <p className="text-[8px] text-muted-foreground">Meetings</p>
              </div>
              <div className="text-center p-2 rounded glass-surface">
                <p className="text-sm font-bold text-success">{campaign.metrics.clients}</p>
                <p className="text-[8px] text-muted-foreground">Clients Won</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                <Eye className="h-2.5 w-2.5 mr-1" />View Funnel
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                <BarChart3 className="h-2.5 w-2.5 mr-1" />A/B Tests
              </Button>
              {campaign.status === "draft" && (
                <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2">
                  <Play className="h-2.5 w-2.5 mr-1" />Launch
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

function ReportingTab({ isHuman }: { isHuman: boolean }) {
  const generateReport = useAiGenerateClientReport();
  const [aiResult, setAiResult] = useState<any>(null);
  const reportSections = [
    { name: "Lead Generation", metric: "14 leads delivered", change: "+40% vs last month", status: "positive" },
    { name: "Content Performance", metric: "12 pieces published", change: "3.2% avg engagement", status: "positive" },
    { name: "Campaign ROI", metric: "$42K pipeline", change: "From $2.1K ad spend = 20x ROI", status: "positive" },
    { name: "Pipeline Progress", metric: "6 meetings booked", change: "3 proposals sent", status: "neutral" },
    { name: "Client Satisfaction", metric: "NPS: 72", change: "Above industry avg (45)", status: "positive" },
  ];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Performance Report" />}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Client Performance Report</h3>
        <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
              disabled={generateReport.isPending}
              onClick={() => generateReport.mutate({ reportType: "monthly", timeframe: "last 30 days" }, {
                onSuccess: (data) => setAiResult({ type: "report", data }),
              })}>
              {generateReport.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Generate Report
            </Button>
          
          <Button size="sm" variant="outline" className="text-xs">
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
              <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${section.status === "positive" ? "text-success" : "text-yellow-400"}`} />
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
          <p className="text-[10px] text-muted-foreground mt-1">"$42K pipeline from $5K total spend = 8.4x ROI. On track for 20 deals promise. 3 proposals in negotiation."</p>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Progress: "20 Ready-to-Close Leads / Month"</h3>
        <div className="flex items-end gap-2 h-24">
          {[
            { week: "Wk 1", leads: 3, meetings: 1 },
            { week: "Wk 2", leads: 5, meetings: 2 },
            { week: "Wk 3", leads: 4, meetings: 2 },
            { week: "Wk 4", leads: 2, meetings: 1 },
          ].map((w) => (
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

function IntegrationsTab({ isHuman }: { isHuman: boolean }) {
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
      <div className="space-y-3">
        {integrations.map((integration) => (
          <GlassCard key={integration.name}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg glass-surface ${
                integration.health === "healthy" ? "text-success" :
                integration.health === "setup" ? "text-yellow-400" : "text-red-400"
              }`}>
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{integration.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${
                    integration.status === "connected" ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"
                  }`}>{integration.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{integration.direction}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Last sync: {integration.lastSync} · {integration.records} records
                </p>
              </div>
              <div className="flex gap-2">
                {integration.status === "connected" && (
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    <RefreshCw className="h-3 w-3 mr-1" />Sync Now
                  </Button>
                )}
                {integration.status === "pending" && (
                  <Button size="sm" className="btn-premium text-white text-xs h-7">
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

      <GlassCard>
        <h3 className="text-sm font-semibold mb-2">Custom Field Mapping</h3>
        <p className="text-xs text-muted-foreground mb-3">Map PMG OS fields to your CRM fields for seamless data sync</p>
        <div className="space-y-1.5">
          {[
            { pmg: "Lead Score", crm: "custom_lead_score", synced: true },
            { pmg: "Pain Points", crm: "custom_pain_points", synced: true },
            { pmg: "Approach Strategy", crm: "notes", synced: true },
            { pmg: "Source Campaign", crm: "utm_source", synced: false },
          ].map((mapping) => (
            <div key={mapping.pmg} className="flex items-center gap-3 p-2 rounded-lg glass-surface text-xs">
              <span className="flex-1">{mapping.pmg}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="flex-1 text-muted-foreground">{mapping.crm}</span>
              <Badge variant="outline" className={`text-[9px] ${mapping.synced ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"}`}>
                {mapping.synced ? "Synced" : "Pending"}
              </Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function LibraryTab({ isHuman }: { isHuman: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const assets = [
    { name: "LinkedIn Post — NIST Framework", type: "content", format: "Text", date: "Mar 28", status: "published", score: 95 },
    { name: "SecureNet Case Study", type: "document", format: "PDF", date: "Mar 25", status: "approved", score: 92 },
    { name: "Cyber Marketing Guide Header", type: "image", format: "PNG", date: "Mar 22", status: "approved", score: 88 },
    { name: "Product Demo — MDR Services", type: "video", format: "MP4", date: "Mar 20", status: "in_review", score: null },
    { name: "Monthly Newsletter — March", type: "content", format: "HTML", date: "Mar 18", status: "published", score: 90 },
    { name: "Facebook Ad — Lead Gen Campaign", type: "image", format: "JPG", date: "Mar 15", status: "approved", score: 85 },
    { name: "SOC 2 Compliance Infographic", type: "image", format: "PNG", date: "Mar 12", status: "draft", score: null },
    { name: "Proposal Template — Growth Tier", type: "document", format: "PDF", date: "Mar 10", status: "approved", score: 94 },
  ];

  const types = ["all", "content", "image", "video", "document"];

  const filtered = assets.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
        </div>
        <div className="flex gap-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-1 text-[10px] rounded transition-colors capitalize ${
                filterType === t ? "bg-crimson/20 text-crimson" : "text-muted-foreground hover:text-white"
              }`}
            >
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
                <div className={`flex-shrink-0 ${
                  asset.type === "image" ? "text-crimson" :
                  asset.type === "video" ? "text-gold" :
                  asset.type === "document" ? "text-blue-400" : "text-success"
                }`}>
                  {asset.type === "image" ? <Image className="h-3.5 w-3.5" /> :
                   asset.type === "video" ? <Video className="h-3.5 w-3.5" /> :
                   asset.type === "document" ? <FileText className="h-3.5 w-3.5" /> :
                   <PenTool className="h-3.5 w-3.5" />}
                </div>
                <span className="text-xs truncate">{asset.name}</span>
              </div>
              <Badge variant="outline" className="text-[9px] w-16 justify-center capitalize">{asset.type}</Badge>
              <span className="w-12 text-center text-[10px] text-muted-foreground">{asset.format}</span>
              <span className="w-14 text-center text-[10px] text-muted-foreground">{asset.date}</span>
              <Badge variant="outline" className={`text-[9px] w-16 justify-center ${
                asset.status === "published" ? "text-success border-success/20" :
                asset.status === "approved" ? "text-blue-400 border-blue-500/20" :
                asset.status === "in_review" ? "text-yellow-400 border-yellow-500/20" :
                "text-muted-foreground"
              }`}>{asset.status.replace("_", " ")}</Badge>
              <span className={`w-12 text-center text-[10px] font-semibold ${
                asset.score && asset.score >= 90 ? "text-success" : asset.score ? "text-gold" : "text-muted-foreground"
              }`}>{asset.score ?? "—"}</span>
              <div className="w-20 flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-6 px-1.5"><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5"><Download className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function QualityTab({ isHuman }: { isHuman: boolean }) {
  const auditClient = useAiAuditClient();
  const [aiResult, setAiResult] = useState<any>(null);
  const reviewQueue = [
    { name: "LinkedIn Post — EDR vs MDR Comparison", type: "content", score: "Ready to Publish", issues: [], details: "Human tone verified. Correct terminology. 1,200 characters — within LinkedIn limits." },
    { name: "Product Demo — MDR Services", type: "video", score: "Needs Minor Edits", issues: ["Audio volume inconsistent at 0:42-0:55", "End card missing PMG logo"], details: "Content accurate. Brand colors correct. Good pacing." },
    { name: "SOC 2 Compliance Infographic", type: "image", score: "Needs Rewrite", issues: ["SOC 2 Type I vs Type II distinction incorrect", "Color scheme doesn't match brand guide", "Font is not Inter"], details: "Factual error in compliance flow. Visual brand violations." },
    { name: "Email Sequence — Nurture Week 2", type: "content", score: "Ready to Publish", issues: [], details: "CAN-SPAM compliant. Unsubscribe link present. No AI-sounding phrases. Strong CTA." },
    { name: "Facebook Ad — Lead Gen V2", type: "image", score: "Needs Minor Edits", issues: ["Text exceeds 20% of image area (Facebook will limit reach)"], details: "Design strong. Copy compelling. Just needs text area reduction." },
  ];

  const qualityMetrics = [
    { label: "Total Reviewed", value: 47, period: "This Month" },
    { label: "Ready to Publish", value: 31, period: "66%" },
    { label: "Needs Minor Edits", value: 12, period: "26%" },
    { label: "Needs Rewrite", value: 4, period: "8%" },
  ];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Quality Review" />}
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
          <Badge variant="outline" className="text-xs">{reviewQueue.length} pending</Badge>
        </div>
        <div className="space-y-3">
          {reviewQueue.map((item) => (
            <div key={item.name} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex-shrink-0 ${
                  item.type === "content" ? "text-success" :
                  item.type === "video" ? "text-gold" : "text-crimson"
                }`}>
                  {item.type === "content" ? <PenTool className="h-3.5 w-3.5" /> :
                   item.type === "video" ? <Video className="h-3.5 w-3.5" /> :
                   <Image className="h-3.5 w-3.5" />}
                </div>
                <span className="text-xs font-medium flex-1">{item.name}</span>
                <Badge variant="outline" className={`text-[10px] ${
                  item.score === "Ready to Publish" ? "text-success border-success/20" :
                  item.score === "Needs Minor Edits" ? "text-yellow-400 border-yellow-500/20" :
                  "text-red-400 border-red-500/20"
                }`}>{item.score}</Badge>
              </div>
              {item.issues.length > 0 && (
                <ul className="space-y-0.5 mb-2">
                  {item.issues.map((issue, idx) => (
                    <li key={idx} className="text-[10px] text-red-300 flex items-center gap-1.5">
                      <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />{issue}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-muted-foreground">{item.details}</p>
              <div className="flex gap-2 mt-2">
                {item.score === "Ready to Publish" && (
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Approve & Publish
                  </Button>
                )}
                {item.score === "Needs Minor Edits" && (
                  <>
                    <Button size="sm" variant="outline" className="text-[10px] border-yellow-500/20 text-yellow-400 h-6 px-2">
                      <PenTool className="h-2.5 w-2.5 mr-1" />Edit
                    </Button>
                                          <Button size="sm" variant="outline" className="text-[10px] border-crimson/20 text-crimson h-6 px-2">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />Auto-Fix
                      </Button>
                    
                  </>
                )}
                {item.score === "Needs Rewrite" && !isHuman && (
                  <Button size="sm" variant="outline" className="text-[10px] border-crimson/20 text-crimson h-6 px-2">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />Regenerate
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
