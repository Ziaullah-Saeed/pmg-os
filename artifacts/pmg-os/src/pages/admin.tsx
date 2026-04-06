import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ClipboardList, BookOpen, BarChart3, RefreshCw
} from "lucide-react";

export default function Admin() {
  const agents = [
    { name: "Operations Manager", desc: "Task assignment, daily action plans, team workload dashboard", icon: <ClipboardList className="h-5 w-5" />, color: "text-crimson" },
    { name: "Knowledge & Documents", desc: "Searchable knowledge base, SOPs, auto-learning from operations", icon: <BookOpen className="h-5 w-5" />, color: "text-info" },
    { name: "Executive Briefing", desc: "Morning briefing dashboard, risk alerts, key metrics at a glance", icon: <BarChart3 className="h-5 w-5" />, color: "text-gold" },
    { name: "System Evolution", desc: "Weekly market scan, monthly reports, quarterly roadmap, auto-updates", icon: <RefreshCw className="h-5 w-5" />, color: "text-success" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Operations management, knowledge base, executive briefing, and system evolution"
        icon={<Shield className="h-5 w-5" />}
      />

      <GlassCard variant="insight">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-semibold">Coming in Session 4</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The Admin section with 4 specialized agents is being built in Session 4.
          Operations management, knowledge base, executive briefings, and the self-updating system evolution agent.
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Badge variant="outline" className="mt-3 text-xs">Session 4</Badge>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
