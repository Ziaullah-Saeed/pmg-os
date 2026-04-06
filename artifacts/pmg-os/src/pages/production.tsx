import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import {
  Palette, Image, Video, FileText, Folder, PenTool, UserCheck, BookOpen
} from "lucide-react";

export default function Production() {
  const agents = [
    { name: "Client Onboarding", desc: "Step-by-step checklist when deals close — intake, kickoff, access setup", icon: <UserCheck className="h-5 w-5" />, color: "text-success" },
    { name: "Creative Director", desc: "Brand guidelines, design briefs, visual direction", icon: <PenTool className="h-5 w-5" />, color: "text-crimson" },
    { name: "Image Generator", desc: "Text-to-image via DALL-E 3 — social graphics, ads, thumbnails", icon: <Image className="h-5 w-5" />, color: "text-info" },
    { name: "Video Producer", desc: "Text-to-video via Runway ML — marketing clips, demos, social reels", icon: <Video className="h-5 w-5" />, color: "text-gold" },
    { name: "Document Creator", desc: "Proposals, case studies, white papers, one-pagers — all downloadable PDF", icon: <FileText className="h-5 w-5" />, color: "text-blue-400" },
    { name: "Brand Kit Manager", desc: "Logos, colors, fonts, tone of voice — one source of truth", icon: <Palette className="h-5 w-5" />, color: "text-purple-400" },
    { name: "Content Library", desc: "All created assets organized with status, versioning, and search", icon: <Folder className="h-5 w-5" />, color: "text-orange-400" },
    { name: "Quality Reviewer", desc: "AI reviews all content for brand consistency, accuracy, and tone", icon: <BookOpen className="h-5 w-5" />, color: "text-green-400" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Production"
        subtitle="Creative production, client onboarding, brand management, and content library"
        icon={<Palette className="h-5 w-5" />}
      />

      <GlassCard variant="insight">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-semibold">Coming in Session 3</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The Production section with 8 specialized agents is being built in Session 3.
          Full creative production with AI image/video generation, document creation, brand management, and content library.
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <GlassCard key={agent.name} variant="interactive" className="cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg glass-surface ${agent.color}`}>
                {agent.icon}
              </div>
              <p className="text-sm font-semibold">{agent.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">{agent.desc}</p>
            <Badge variant="outline" className="mt-3 text-xs">Session 3</Badge>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
