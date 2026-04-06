import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Megaphone, FileText, Search, BarChart3, Globe, Zap
} from "lucide-react";

export default function Marketing() {
  const agents = [
    { name: "Content Strategist", desc: "Content calendar, blog posts, social content, email sequences", icon: <FileText className="h-5 w-5" />, color: "text-crimson" },
    { name: "Advertising Agent", desc: "Campaign builder with targeting, copy, and budget allocation", icon: <Megaphone className="h-5 w-5" />, color: "text-info" },
    { name: "SEO & Growth", desc: "Technical audits, keyword research, backlink analysis", icon: <Search className="h-5 w-5" />, color: "text-success" },
    { name: "Campaign Orchestrator", desc: "Multi-channel coordination across all marketing efforts", icon: <Zap className="h-5 w-5" />, color: "text-gold" },
    { name: "Competitor Intelligence", desc: "Competitive battle cards, positioning analysis, market gaps", icon: <Globe className="h-5 w-5" />, color: "text-blue-400" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Marketing"
        subtitle="Content strategy, advertising, SEO, and campaign orchestration"
        icon={<Megaphone className="h-5 w-5" />}
      />

      <GlassCard variant="insight">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-semibold">Coming in Session 3</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The Marketing section with 5 specialized agents is being built in Session 3.
          Content creation, advertising campaigns, SEO audits, and competitive intelligence will all be fully functional.
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <GlassCard key={agent.name} variant="interactive" className="cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg glass-surface ${agent.color}`}>
                {agent.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{agent.name}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{agent.desc}</p>
            <Badge variant="outline" className="mt-3 text-xs">Session 3</Badge>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
