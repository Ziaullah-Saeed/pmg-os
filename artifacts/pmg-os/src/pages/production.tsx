import { useState } from "react";
import { useListDocuments } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useUpdateDocumentMut } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import {
  Palette, FileText, CheckCircle2, Clock, Edit, Plus, Eye, EyeOff, Image, Film, Layout, Type,
  RotateCcw, ArrowRight, Sparkles, History, Ban, Layers, Settings, Download,
  ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, PanelLeftClose, PanelRightClose,
  Wand2, RefreshCw, MessageSquare, Star, Folder, Search, Grid3X3, List, Monitor,
  Smartphone, Tablet, Play, Pause, SkipForward, Volume2, Paintbrush, Shapes,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Copy, Trash2,
  Move, SquareDashedBottom, BookOpen, Pen, Video, Mic, Camera, Globe, FileImage,
  PenTool, Brush, Crop, FlipHorizontal, RotateCw, Save, Upload, Send, Check,
  Lock, Unlock, AlertTriangle, Users, Shield, Package, Megaphone, Mail,
  ChevronDown, ChevronUp, Pin, ThumbsUp, ThumbsDown, UserCheck, FileCheck,
  Rocket, ExternalLink, Printer, Share2
} from "lucide-react";
import { CreateDocumentForm } from "@/components/forms/create-document-form";

const lifecycleStages = ["generate", "preview", "review", "revise", "approve", "finalize"] as const;
const statusForStage: Record<string, string> = { generate: "draft", preview: "draft", review: "in_review", revise: "draft", approve: "approved", finalize: "published" };

function mapDocStatus(status: string): string {
  if (status === "draft") return "generate";
  if (status === "pending" || status === "in_review") return "review";
  if (status === "approved") return "approve";
  if (status === "published") return "finalize";
  return "generate";
}

const projectTypes = [
  { id: "design", label: "Design", icon: <Paintbrush className="h-4 w-4" />, color: "text-pink-400" },
  { id: "deck", label: "Deck / Slides", icon: <Layout className="h-4 w-4" />, color: "text-blue-400" },
  { id: "proposal", label: "Proposal", icon: <FileText className="h-4 w-4" />, color: "text-green-400" },
  { id: "video", label: "Video", icon: <Film className="h-4 w-4" />, color: "text-purple-400" },
  { id: "landing", label: "Landing Page", icon: <Globe className="h-4 w-4" />, color: "text-cyan-400" },
  { id: "social", label: "Social Creative", icon: <Camera className="h-4 w-4" />, color: "text-orange-400" },
  { id: "thumbnail", label: "Thumbnail", icon: <FileImage className="h-4 w-4" />, color: "text-yellow-400" },
  { id: "script", label: "Script / Copy", icon: <Pen className="h-4 w-4" />, color: "text-emerald-400" },
  { id: "brand", label: "Brand Asset", icon: <Star className="h-4 w-4" />, color: "text-amber-400" },
];

const brandKit = {
  colors: [
    { name: "Crimson", hex: "#DC2626" },
    { name: "Navy", hex: "#1E3A5F" },
    { name: "Golden Yellow", hex: "#F59E0B" },
    { name: "Dark BG", hex: "#0A1628" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Slate", hex: "#64748B" },
  ],
  fonts: ["Inter", "Space Grotesk", "JetBrains Mono"],
  sizes: ["1920×1080", "1080×1080", "1080×1920", "1200×628", "800×418"],
};

const assetTemplates = [
  { id: "linkedin-post", name: "LinkedIn Post", size: "1200×628", type: "social" },
  { id: "instagram-story", name: "Instagram Story", size: "1080×1920", type: "social" },
  { id: "pitch-deck", name: "Pitch Deck", size: "1920×1080", type: "deck" },
  { id: "one-pager", name: "One-Pager", size: "Letter", type: "proposal" },
  { id: "email-header", name: "Email Header", size: "600×200", type: "design" },
  { id: "youtube-thumb", name: "YouTube Thumbnail", size: "1280×720", type: "thumbnail" },
  { id: "vsl-script", name: "VSL Script", size: "—", type: "script" },
  { id: "brand-guide", name: "Brand Guide", size: "Letter", type: "brand" },
];

export default function Production() {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<"properties" | "brand" | "layers" | "comments" | "history" | "finalize">("properties");
  const [leftPanel, setLeftPanel] = useState<"projects" | "assets" | "templates">("projects");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [searchQuery, setSearchQuery] = useState("");
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const { data: documents } = useListDocuments();
  const { isHuman, isAuto, isHybrid } = useAiModeContext();
  const updateDoc = useUpdateDocumentMut();
  const { toast } = useToast();
  const docList = (documents ?? []) as any[];
  const enriched = docList.map((d) => ({ ...d, lifecycle: mapDocStatus(d.status) }));

  const filtered = searchQuery
    ? enriched.filter(d => d.title?.toLowerCase().includes(searchQuery.toLowerCase()) || d.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    : enriched;

  function handleAdvance(doc: any) {
    const currentIdx = lifecycleStages.indexOf(doc.lifecycle as any);
    if (currentIdx < 0 || currentIdx >= lifecycleStages.length - 1) return;
    const next = lifecycleStages[currentIdx + 1];
    const newStatus = statusForStage[next] || "draft";
    updateDoc.mutate({ id: doc.id, data: { status: newStatus } }, {
      onSuccess: () => toast({ title: `Advanced to ${next}` }),
    });
  }

  function handleReject(doc: any) {
    updateDoc.mutate({ id: doc.id, data: { status: "draft" } }, {
      onSuccess: () => toast({ title: "Sent back to drafts" }),
    });
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden -mx-6 -mt-6">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[hsl(214,65%,5%)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-crimson" />
            <h1 className="text-sm font-bold tracking-tight">Production Studio</h1>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className={`h-7 px-2 text-[10px] ${leftPanel === "projects" ? "bg-white/10" : ""}`} onClick={() => { setLeftPanel("projects"); setLeftSidebarOpen(true); }}>
              <Folder className="h-3 w-3 mr-1" />Projects
            </Button>
            <Button variant="ghost" size="sm" className={`h-7 px-2 text-[10px] ${leftPanel === "assets" ? "bg-white/10" : ""}`} onClick={() => { setLeftPanel("assets"); setLeftSidebarOpen(true); }}>
              <Image className="h-3 w-3 mr-1" />Assets
            </Button>
            <Button variant="ghost" size="sm" className={`h-7 px-2 text-[10px] ${leftPanel === "templates" ? "bg-white/10" : ""}`} onClick={() => { setLeftPanel("templates"); setLeftSidebarOpen(true); }}>
              <Grid3X3 className="h-3 w-3 mr-1" />Templates
            </Button>
          </div>
          {isAuto && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px]">
              <Sparkles className="h-2.5 w-2.5 mr-1" />AI Auto
            </Badge>
          )}
          {isHybrid && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px]">
              <Wand2 className="h-2.5 w-2.5 mr-1" />Hybrid
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuto && (
            <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] text-green-400 border border-green-500/30 hover:bg-green-500/10">
              <Sparkles className="h-3 w-3 mr-1" />AI Generate
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] text-crimson border border-crimson/30 hover:bg-crimson/10" onClick={() => setShowCreateDoc(true)}>
            <Plus className="h-3 w-3 mr-1" />New Project
          </Button>
          {selectedProject && (
            <>
              <div className="h-4 w-px bg-white/10" />
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setShowReviewPanel(!showReviewPanel)}>
                <MessageSquare className="h-3 w-3 mr-1" />Review
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleAdvance(selectedProject)} disabled={updateDoc.isPending || selectedProject.lifecycle === "finalize"}>
                <ArrowRight className="h-3 w-3 mr-1" />Advance
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-green-400">
                <Download className="h-3 w-3 mr-1" />Export
              </Button>
            </>
          )}
        </div>
      </div>

      {selectedProject && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/5 bg-[hsl(214,65%,6%)]">
          <div className="flex items-center gap-1 border-r border-white/10 pr-3">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Bold className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Italic className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Underline className="h-3 w-3" /></Button>
          </div>
          <div className="flex items-center gap-1 border-r border-white/10 pr-3">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><AlignLeft className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><AlignCenter className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><AlignRight className="h-3 w-3" /></Button>
          </div>
          <div className="flex items-center gap-1 border-r border-white/10 pr-3">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Move className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Crop className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><FlipHorizontal className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><RotateCw className="h-3 w-3" /></Button>
          </div>
          <div className="flex items-center gap-1 border-r border-white/10 pr-3">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Copy className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Trash2 className="h-3 w-3 text-red-400" /></Button>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${previewDevice === "desktop" ? "bg-white/10" : ""}`} onClick={() => setPreviewDevice("desktop")}><Monitor className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${previewDevice === "tablet" ? "bg-white/10" : ""}`} onClick={() => setPreviewDevice("tablet")}><Tablet className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${previewDevice === "mobile" ? "bg-white/10" : ""}`} onClick={() => setPreviewDevice("mobile")}><Smartphone className="h-3 w-3" /></Button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}><ZoomOut className="h-3 w-3" /></Button>
            <span className="text-[10px] text-muted-foreground w-8 text-center tabular-nums">{zoomLevel}%</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}><ZoomIn className="h-3 w-3" /></Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoomLevel(100)}><Maximize2 className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {leftSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-[hsl(214,65%,5%)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-semibold capitalize">{leftPanel}</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setLeftSidebarOpen(false)}>
                  <PanelLeftClose className="h-3 w-3" />
                </Button>
              </div>

              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-7 pl-7 text-xs bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
                {leftPanel === "projects" && filtered.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedProject(doc)}
                    className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      selectedProject?.id === doc.id ? "bg-crimson/20 border border-crimson/30" : "hover:bg-white/5"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      doc.lifecycle === "finalize" ? "bg-green-500/20" :
                      doc.lifecycle === "review" ? "bg-yellow-500/20" :
                      doc.lifecycle === "approve" ? "bg-blue-500/20" :
                      "bg-white/5"
                    }`}>
                      {doc.type === "video" ? <Film className="h-3.5 w-3.5" /> :
                       doc.type === "design" ? <Paintbrush className="h-3.5 w-3.5" /> :
                       doc.type === "proposal" ? <FileText className="h-3.5 w-3.5" /> :
                       <FileText className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{doc.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-muted-foreground capitalize">{doc.lifecycle}</span>
                        <span className="text-[9px] text-muted-foreground">· v{doc.version}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {leftPanel === "assets" && (
                  <div className="space-y-3 px-1 pt-1">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Media Library</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {["Brand Logos", "Product Shots", "Team Photos", "Icons Pack", "Social Covers", "Backgrounds"].map(item => (
                          <div key={item} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                            <Image className="h-5 w-5 text-muted-foreground mb-1 mx-auto" />
                            <p className="text-[9px] text-center truncate">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upload</p>
                      <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:border-crimson/40 cursor-pointer transition-colors">
                        <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                        <p className="text-[10px] text-muted-foreground">Drop files or click</p>
                      </div>
                    </div>
                  </div>
                )}

                {leftPanel === "templates" && assetTemplates.map(tmpl => (
                  <div key={tmpl.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <Layout className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{tmpl.name}</p>
                      <p className="text-[9px] text-muted-foreground">{tmpl.size}</p>
                    </div>
                  </div>
                ))}

                {leftPanel === "projects" && filtered.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No projects yet</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs text-crimson" onClick={() => setShowCreateDoc(true)}>
                      <Plus className="h-3 w-3 mr-1" />Create Project
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden bg-[hsl(214,65%,4%)]">
          {!leftSidebarOpen && (
            <Button variant="ghost" size="sm" className="absolute left-2 top-1/2 z-10 h-8 w-6 p-0 bg-white/5" onClick={() => setLeftSidebarOpen(true)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}

          {selectedProject ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <div
                  className={`relative bg-[hsl(214,65%,8%)] rounded-xl border border-white/10 shadow-2xl transition-all duration-300 ${
                    previewDevice === "desktop" ? "w-full max-w-4xl aspect-video" :
                    previewDevice === "tablet" ? "w-[600px] aspect-[3/4]" :
                    "w-[375px] aspect-[9/16]"
                  }`}
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-md text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-crimson/20 flex items-center justify-center mx-auto">
                        {selectedProject.type === "video" ? <Film className="h-8 w-8 text-crimson" /> :
                         selectedProject.type === "design" ? <Paintbrush className="h-8 w-8 text-crimson" /> :
                         <FileText className="h-8 w-8 text-crimson" />}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{selectedProject.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{selectedProject.category} · {selectedProject.type}</p>
                      </div>
                      {selectedProject.content && (
                        <div className="text-left bg-white/5 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                          <p className="text-xs text-slate-300 whitespace-pre-wrap">{selectedProject.content}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <StatusBadge variant={selectedProject.lifecycle === "finalize" ? "human-approved" : selectedProject.lifecycle === "review" ? "awaiting-review" : "draft"} label={selectedProject.lifecycle} />
                        <Badge variant="outline" className="text-[10px]">v{selectedProject.version}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge className="bg-black/50 text-white/60 text-[8px] border-0">{previewDevice === "desktop" ? "1920×1080" : previewDevice === "tablet" ? "768×1024" : "375×812"}</Badge>
                  </div>
                </div>
              </div>

              {selectedProject.type === "video" && (
                <div className="border-t border-white/5 bg-[hsl(214,65%,5%)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Play className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Pause className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><SkipForward className="h-3 w-3" /></Button>
                      <span className="text-[10px] text-muted-foreground ml-2 tabular-nums">00:00 / 01:30</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full relative">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-crimson rounded-full" />
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Volume2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className={`w-16 h-10 rounded-md shrink-0 flex items-center justify-center text-[8px] ${i < 3 ? "bg-crimson/20 border border-crimson/30" : "bg-white/5 border border-white/10"}`}>
                        Scene {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showReviewPanel && (
                <div className="border-t border-white/5 bg-[hsl(214,65%,5%)] px-4 py-3 max-h-[280px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-crimson" />Review & Approval
                    </h3>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-400" onClick={() => handleReject(selectedProject)} disabled={updateDoc.isPending}>
                        <Ban className="h-3 w-3 mr-1" />Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-yellow-400" onClick={() => updateDoc.mutate({ id: selectedProject.id, data: { status: "draft" } }, { onSuccess: () => toast({ title: "Sent for revision" }) })} disabled={updateDoc.isPending}>
                        <RotateCcw className="h-3 w-3 mr-1" />Revise
                      </Button>
                      <Button size="sm" className="h-6 px-2 text-[10px] btn-premium text-white" onClick={() => handleAdvance(selectedProject)} disabled={updateDoc.isPending || selectedProject.lifecycle === "finalize"}>
                        <Check className="h-3 w-3 mr-1" />Approve
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Comments & Annotations</p>
                      {[
                        { initials: "SK", name: "SherShah K.", time: "Just now", text: "Ready for review. Check brand alignment and messaging accuracy.", pinned: true, resolved: false },
                        { initials: "AI", name: "AI Review Agent", time: "2 min ago", text: "Brand colors verified ✓ · Font hierarchy consistent ✓ · CTA contrast ratio passes WCAG AA", pinned: false, resolved: false },
                        { initials: "JD", name: "Design Lead", time: "15 min ago", text: "Headline spacing could be tighter — reduce top margin by 8px.", pinned: false, resolved: true },
                      ].map((c, i) => (
                        <div key={i} className={`p-2 rounded-lg ${c.resolved ? "bg-green-500/5 border border-green-500/10" : "bg-white/5"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${c.initials === "AI" ? "bg-green-500/30" : "bg-crimson/30"}`}>{c.initials}</div>
                            <span className="text-[10px] font-medium">{c.name}</span>
                            {c.pinned && <Pin className="h-2.5 w-2.5 text-yellow-400" />}
                            {c.resolved && <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />}
                            <span className="text-[9px] text-muted-foreground ml-auto">{c.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-300">{c.text}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Button variant="ghost" size="sm" className="h-4 px-1 text-[8px]"><ThumbsUp className="h-2 w-2 mr-0.5" />Agree</Button>
                            <Button variant="ghost" size="sm" className="h-4 px-1 text-[8px]"><MessageSquare className="h-2 w-2 mr-0.5" />Reply</Button>
                            {!c.resolved && <Button variant="ghost" size="sm" className="h-4 px-1 text-[8px] text-green-400"><Check className="h-2 w-2 mr-0.5" />Resolve</Button>}
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Add review comment..." className="h-7 text-[11px] bg-white/5 border-white/10 flex-1" />
                        <Button size="sm" className="h-7 px-3 text-[10px] btn-premium text-white"><Send className="h-3 w-3" /></Button>
                      </div>
                    </div>

                    <div className="w-44 space-y-3">
                      <div>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Approval Matrix</p>
                        {[
                          { role: "Creative Lead", name: "SherShah K.", status: "approved" },
                          { role: "Brand Manager", name: "Pending", status: "pending" },
                          { role: "Client Rep", name: "Pending", status: "pending" },
                        ].map((a, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-1">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${a.status === "approved" ? "bg-green-500/20" : "bg-white/10"}`}>
                              {a.status === "approved" ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-medium truncate">{a.role}</p>
                              <p className="text-[8px] text-muted-foreground truncate">{a.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">QA Checklist</p>
                        {["Brand colors correct", "Copy proofread", "CTA visible", "Mobile responsive", "Legal disclaimer"].map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${i < 3 ? "bg-green-500/20 border-green-500/40" : "border-white/20"}`}>
                              {i < 3 && <Check className="h-2 w-2 text-green-400" />}
                            </div>
                            <span className="text-[9px]">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Palette className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h2 className="text-lg font-semibold mb-1">Production Studio</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">Select a project from the sidebar or create a new one to start designing, editing, and producing assets.</p>
              <div className="flex gap-3">
                <Button className="btn-premium text-white text-sm" onClick={() => setShowCreateDoc(true)}>
                  <Plus className="h-4 w-4 mr-2" />New Project
                </Button>
                {isAuto && (
                  <Button variant="outline" className="text-sm border-green-500/30 text-green-400 hover:bg-green-500/10">
                    <Sparkles className="h-4 w-4 mr-2" />AI Auto-Generate
                  </Button>
                )}
              </div>

              <div className="mt-8 w-full max-w-2xl">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Start Templates</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {projectTypes.slice(0, 8).map(pt => (
                    <div key={pt.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors border border-white/5 hover:border-white/10">
                      <div className={pt.color}>{pt.icon}</div>
                      <p className="text-xs font-medium mt-1.5">{pt.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {enriched.length > 0 && (
                <div className="mt-8 w-full max-w-2xl">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lifecycle Overview</h3>
                  <div className="grid grid-cols-6 gap-2">
                    {lifecycleStages.map((stage) => {
                      const count = enriched.filter(d => d.lifecycle === stage).length;
                      return (
                        <div key={stage} className={`p-3 rounded-lg text-center ${count > 0 ? "bg-crimson/10 border border-crimson/20" : "bg-white/5 border border-white/5"}`}>
                          <p className="text-lg font-bold">{count}</p>
                          <p className="text-[9px] text-muted-foreground capitalize">{stage}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!rightSidebarOpen && selectedProject && (
            <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 z-10 h-8 w-6 p-0 bg-white/5" onClick={() => setRightSidebarOpen(true)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
          )}
        </div>

        <AnimatePresence>
          {rightSidebarOpen && selectedProject && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/5 bg-[hsl(214,65%,5%)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <div className="flex gap-0.5">
                  {([
                    { id: "properties", icon: <Settings className="h-3 w-3" />, label: "Props" },
                    { id: "brand", icon: <Star className="h-3 w-3" />, label: "Brand" },
                    { id: "layers", icon: <Layers className="h-3 w-3" />, label: "Layers" },
                    { id: "comments", icon: <MessageSquare className="h-3 w-3" />, label: "Comments" },
                    { id: "history", icon: <History className="h-3 w-3" />, label: "History" },
                    { id: "finalize", icon: <Rocket className="h-3 w-3" />, label: "Finalize" },
                  ] as const).map(tab => (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-2 text-[9px] ${rightPanel === tab.id ? "bg-white/10" : ""}`}
                      onClick={() => setRightPanel(tab.id)}
                    >
                      {tab.icon}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setRightSidebarOpen(false)}>
                  <PanelRightClose className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {rightPanel === "properties" && (
                  <>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Project Details</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">Title</label>
                          <Input value={selectedProject.title} readOnly className="h-7 text-xs bg-white/5 border-white/10 mt-0.5" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Category</label>
                          <Input value={selectedProject.category ?? ""} readOnly className="h-7 text-xs bg-white/5 border-white/10 mt-0.5" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Type</label>
                          <Input value={selectedProject.type ?? ""} readOnly className="h-7 text-xs bg-white/5 border-white/10 mt-0.5" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lifecycle</p>
                      <div className="flex items-center gap-1">
                        {lifecycleStages.map((s, i) => {
                          const currentIdx = lifecycleStages.indexOf(selectedProject.lifecycle as any);
                          return (
                            <div key={s} className={`h-1.5 rounded-full flex-1 ${i <= currentIdx ? "bg-crimson" : "bg-white/10"}`} />
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        {lifecycleStages.map(s => (
                          <span key={s} className={`text-[7px] capitalize ${s === selectedProject.lifecycle ? "text-crimson font-bold" : "text-muted-foreground"}`}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
                      <div className="space-y-1.5">
                        {selectedProject.lifecycle !== "finalize" && (
                          <>
                            <Button className="w-full h-7 text-[10px] btn-premium text-white" onClick={() => handleAdvance(selectedProject)} disabled={updateDoc.isPending}>
                              <ArrowRight className="h-3 w-3 mr-1" />Advance to Next Stage
                            </Button>
                            <Button variant="outline" className="w-full h-7 text-[10px] border-white/10" onClick={() => handleReject(selectedProject)} disabled={updateDoc.isPending}>
                              <RotateCcw className="h-3 w-3 mr-1" />Send Back
                            </Button>
                          </>
                        )}
                        {selectedProject.lifecycle === "finalize" && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <span className="text-[10px] text-green-400 font-medium">Finalized & Published</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isHuman && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Manual Guide</p>
                        <div className="space-y-1.5 text-[10px] text-slate-400">
                          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                            <p className="font-medium text-blue-400 mb-1">Current: {selectedProject.lifecycle}</p>
                            <p>1. Review asset content and brand alignment</p>
                            <p>2. Check all required fields are complete</p>
                            <p>3. Use "Advance" to move to next stage</p>
                            <p>4. Use "Send Back" if revisions needed</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {rightPanel === "brand" && (
                  <>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Brand Colors</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {brandKit.colors.map(color => (
                          <div key={color.name} className="text-center cursor-pointer group">
                            <div
                              className="w-full h-8 rounded-lg border border-white/10 group-hover:ring-2 ring-crimson/40 transition-all"
                              style={{ backgroundColor: color.hex }}
                            />
                            <p className="text-[8px] text-muted-foreground mt-1">{color.name}</p>
                            <p className="text-[7px] text-muted-foreground">{color.hex}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Typography</p>
                      <div className="space-y-1.5">
                        {brandKit.fonts.map(font => (
                          <div key={font} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-xs" style={{ fontFamily: font }}>{font}</span>
                            <Badge variant="outline" className="text-[8px]">Aa</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Canvas Sizes</p>
                      <div className="space-y-1">
                        {brandKit.sizes.map(size => (
                          <div key={size} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                            <span className="text-[10px]">{size}</span>
                            <SquareDashedBottom className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {rightPanel === "layers" && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Layer Stack</p>
                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[8px]"><Plus className="h-2.5 w-2.5 mr-0.5" />Add</Button>
                      </div>
                      <div className="space-y-1">
                        {[
                          { name: "Logo", type: "image", visible: true, locked: true, opacity: 100 },
                          { name: "Header Text", type: "text", visible: true, locked: false, opacity: 100 },
                          { name: "Body Copy", type: "text", visible: true, locked: false, opacity: 100 },
                          { name: "CTA Button", type: "shape", visible: true, locked: false, opacity: 95 },
                          { name: "Accent Shape", type: "shape", visible: true, locked: false, opacity: 60 },
                          { name: "Background", type: "fill", visible: true, locked: true, opacity: 100 },
                        ].map((layer, i) => (
                          <div key={layer.name} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${i === 0 ? "bg-crimson/10 border border-crimson/20" : "bg-white/5 hover:bg-white/10"} cursor-pointer group`}>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-50 group-hover:opacity-100">
                              {layer.visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-50 group-hover:opacity-100">
                              {layer.locked ? <Lock className="h-2.5 w-2.5 text-yellow-400" /> : <Unlock className="h-2.5 w-2.5" />}
                            </Button>
                            <span className="text-[10px] flex-1 truncate">{layer.name}</span>
                            <span className="text-[8px] text-muted-foreground">{layer.opacity}%</span>
                            <GlassCard className="!p-0 w-4 h-4 rounded flex items-center justify-center">
                              <span className="text-[7px]">{6 - i}</span>
                            </GlassCard>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isAuto && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Regenerate</p>
                        <div className="space-y-1.5">
                          <Textarea placeholder="Describe changes... e.g. 'Make CTA more prominent, use golden gradient'" className="text-[10px] bg-white/5 border-white/10 min-h-[60px] resize-none" />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 px-2 text-[9px] flex-1 bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30">
                              <Sparkles className="h-2.5 w-2.5 mr-1" />Regenerate Selected
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[9px]">
                              <RefreshCw className="h-2.5 w-2.5 mr-1" />Variations
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Layer Actions</p>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { icon: <ChevronUp className="h-3 w-3" />, label: "Up" },
                          { icon: <ChevronDown className="h-3 w-3" />, label: "Down" },
                          { icon: <Copy className="h-3 w-3" />, label: "Dupe" },
                          { icon: <Trash2 className="h-3 w-3" />, label: "Delete" },
                          { icon: <Lock className="h-3 w-3" />, label: "Lock" },
                          { icon: <Eye className="h-3 w-3" />, label: "Show" },
                        ].map(a => (
                          <Button key={a.label} variant="ghost" size="sm" className="h-7 text-[9px] flex-col gap-0.5">
                            {a.icon}
                            <span>{a.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {rightPanel === "comments" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Review Comments</p>
                      <div className="space-y-2">
                        {[
                          { initials: "SK", name: "SherShah K.", time: "5 min ago", text: "Ensure CTA placement follows brand guide. Check headline contrast ratio.", pinned: true, resolved: false },
                          { initials: "AI", name: "Brand Agent", time: "10 min ago", text: "Automated check: colors ✓, fonts ✓, logo placement ✓, spacing ✓", pinned: false, resolved: false },
                          { initials: "TM", name: "Team Member", time: "1h ago", text: "Can we try a darker gradient overlay? Current version feels too washed out.", pinned: false, resolved: true },
                        ].map((c, i) => (
                          <div key={i} className={`p-2 rounded-lg ${c.resolved ? "bg-green-500/5 border border-green-500/10" : "bg-white/5"}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${c.initials === "AI" ? "bg-green-500/30" : "bg-crimson/30"}`}>{c.initials}</div>
                              <span className="text-[9px] font-medium flex-1">{c.name}</span>
                              {c.pinned && <Pin className="h-2 w-2 text-yellow-400" />}
                              {c.resolved && <CheckCircle2 className="h-2 w-2 text-green-400" />}
                            </div>
                            <p className="text-[10px] text-slate-300 leading-relaxed">{c.text}</p>
                            <div className="flex gap-1 mt-1">
                              <Button variant="ghost" size="sm" className="h-4 px-1 text-[7px]"><ThumbsUp className="h-2 w-2" /></Button>
                              <Button variant="ghost" size="sm" className="h-4 px-1 text-[7px]"><MessageSquare className="h-2 w-2" /></Button>
                              {!c.resolved && <Button variant="ghost" size="sm" className="h-4 px-1 text-[7px] text-green-400"><Check className="h-2 w-2" /></Button>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <Input placeholder="Add comment..." className="h-6 text-[10px] bg-white/5 border-white/10 flex-1" />
                        <Button size="sm" className="h-6 w-6 p-0 btn-premium text-white"><Send className="h-2.5 w-2.5" /></Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stakeholder Sign-offs</p>
                      {[
                        { role: "Creative Director", signed: true, by: "SherShah K." },
                        { role: "Brand Manager", signed: false, by: "—" },
                        { role: "Client Approver", signed: false, by: "—" },
                      ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                          {s.signed ? <UserCheck className="h-3 w-3 text-green-400" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-medium">{s.role}</p>
                            <p className="text-[8px] text-muted-foreground">{s.by}</p>
                          </div>
                          {!s.signed && <Button variant="ghost" size="sm" className="h-5 px-2 text-[8px] text-crimson">Request</Button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rightPanel === "history" && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Version History</p>
                    <div className="space-y-1.5">
                      {[
                        { ver: `v${selectedProject.version}`, action: "Current version", time: "Now", actor: "You", changes: "+3 layers, copy update" },
                        { ver: `v${Math.max(1, (selectedProject.version ?? 1) - 1)}`, action: "Review feedback applied", time: "2h ago", actor: isAuto ? "AI Agent" : "You", changes: "CTA color, headline size" },
                        { ver: "v1", action: "Initial draft", time: "Yesterday", actor: isAuto ? "AI Auto" : "Manual", changes: "Created from template" },
                      ].map((h, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold ${i === 0 ? "bg-crimson/30" : "bg-white/10"}`}>
                              {h.ver.replace("v", "")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-medium">{h.action}</p>
                              <p className="text-[8px] text-muted-foreground">{h.actor} · {h.time}</p>
                            </div>
                            {i > 0 && <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[8px]"><RotateCcw className="h-2.5 w-2.5" /></Button>}
                          </div>
                          <p className="text-[8px] text-muted-foreground mt-1 ml-7">{h.changes}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Compare Versions</p>
                      <div className="flex gap-1.5">
                        <Select defaultValue="current">
                          <SelectTrigger className="h-6 text-[9px] bg-white/5 border-white/10 flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="current">Current (v{selectedProject.version})</SelectItem><SelectItem value="prev">Previous</SelectItem></SelectContent>
                        </Select>
                        <span className="text-[9px] text-muted-foreground self-center">vs</span>
                        <Select defaultValue="prev">
                          <SelectTrigger className="h-6 text-[9px] bg-white/5 border-white/10 flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="prev">v{Math.max(1, (selectedProject.version ?? 1) - 1)}</SelectItem><SelectItem value="v1">v1</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full h-6 text-[9px] mt-1.5 border border-white/10"><Eye className="h-2.5 w-2.5 mr-1" />Side-by-Side Diff</Button>
                    </div>
                  </div>
                )}

                {rightPanel === "finalize" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pre-Flight Checklist</p>
                      {[
                        { label: "Brand compliance verified", done: true },
                        { label: "Copy proofread & approved", done: true },
                        { label: "All stakeholders signed off", done: false },
                        { label: "Responsive preview checked", done: true },
                        { label: "Accessibility audit passed", done: false },
                        { label: "Legal/disclaimer present", done: true },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.done ? "bg-green-500/20 border-green-500/40" : "border-white/20"}`}>
                            {item.done && <Check className="h-2.5 w-2.5 text-green-400" />}
                          </div>
                          <span className={`text-[10px] ${item.done ? "text-slate-300" : "text-muted-foreground"}`}>{item.label}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                        <AlertTriangle className="h-3 w-3 text-yellow-400 shrink-0" />
                        <span className="text-[9px] text-yellow-400">2 items incomplete — resolve before finalizing</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Export Formats</p>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { format: "PNG", desc: "High-res raster" },
                          { format: "PDF", desc: "Print-ready" },
                          { format: "SVG", desc: "Vector format" },
                          { format: "MP4", desc: "Video render" },
                        ].map(f => (
                          <Button key={f.format} variant="ghost" size="sm" className="h-10 text-[9px] flex-col gap-0.5 bg-white/5 border border-white/10 hover:bg-white/10">
                            <Download className="h-3 w-3" />
                            <span className="font-bold">{f.format}</span>
                            <span className="text-muted-foreground text-[7px]">{f.desc}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Publish Destinations</p>
                      <div className="space-y-1">
                        {[
                          { dest: "GoHighLevel CRM", icon: <Globe className="h-3 w-3" />, status: "ready" },
                          { dest: "Social Channels", icon: <Share2 className="h-3 w-3" />, status: "ready" },
                          { dest: "Email Campaign", icon: <Mail className="h-3 w-3" />, status: "draft" },
                          { dest: "Client Portal", icon: <ExternalLink className="h-3 w-3" />, status: "ready" },
                          { dest: "Print Queue", icon: <Printer className="h-3 w-3" />, status: "pending" },
                        ].map(d => (
                          <div key={d.dest} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                            <div className="text-muted-foreground">{d.icon}</div>
                            <span className="text-[10px] flex-1">{d.dest}</span>
                            <Badge className={`text-[7px] ${d.status === "ready" ? "bg-green-500/20 text-green-400 border-green-500/30" : d.status === "draft" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>{d.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Button className="w-full h-8 text-[10px] btn-premium text-white" onClick={() => { updateDoc.mutate({ id: selectedProject.id, data: { status: "published" } }, { onSuccess: () => toast({ title: "Asset finalized & published!" }) }); }} disabled={updateDoc.isPending || selectedProject.lifecycle === "finalize"}>
                        <Rocket className="h-3 w-3 mr-1" />Finalize & Publish
                      </Button>
                      {selectedProject.lifecycle === "finalize" && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <div>
                            <p className="text-[10px] text-green-400 font-medium">Published & Live</p>
                            <p className="text-[8px] text-green-400/60">All destinations delivered</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateDocumentForm open={showCreateDoc} onOpenChange={setShowCreateDoc} />
    </div>
  );
}
