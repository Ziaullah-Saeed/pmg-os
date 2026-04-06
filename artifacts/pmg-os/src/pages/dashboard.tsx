import { useListLeads, useListOpportunities, useListCompanies, useListTasks } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import {
  LayoutDashboard, Target, Briefcase, TrendingUp, Users, DollarSign,
  ArrowRight, Clock, CheckCircle2, Zap, Activity
} from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: leads } = useListLeads();
  const { data: opportunities } = useListOpportunities();
  const { data: tasks } = useListTasks();
  const { currentMode } = useAiModeContext();

  const leadList = (leads ?? []) as any[];
  const oppList = (opportunities ?? []) as any[];
  const taskList = (tasks ?? []) as any[];

  const qualified = leadList.filter((l: any) => l.status === "qualified").length;
  const activeDeals = oppList.filter((o: any) => o.stage !== "closed_won" && o.stage !== "closed_lost").length;
  const wonDeals = oppList.filter((o: any) => o.stage === "closed_won").length;
  const totalRevenue = oppList
    .filter((o: any) => o.stage === "closed_won")
    .reduce((s: number, o: any) => s + (o.value ?? o.amount ?? 0), 0);
  const pendingTasks = taskList.filter((t: any) => t.status !== "completed" && t.status !== "done").length;

  const quickActions = [
    { label: "Find Prospects", href: "/outreach", icon: Target, color: "text-crimson" },
    { label: "View Pipeline", href: "/crm", icon: Briefcase, color: "text-info" },
    { label: "Create Content", href: "/production", icon: Zap, color: "text-gold" },
    { label: "Open Settings", href: "/settings", icon: Activity, color: "text-success" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="Your business at a glance — every section, every metric, one view"
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Badge variant="outline" className="text-xs px-3 py-1 border-crimson/30 text-crimson">
            {currentMode === "ai_auto" ? "AI Autonomous" : currentMode === "hybrid" ? "Hybrid Mode" : "Manual Mode"}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Leads" value={leadList.length} icon={<Users className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Qualified" value={qualified} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Active Deals" value={activeDeals} icon={<Briefcase className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Won Deals" value={wonDeals} icon={<TrendingUp className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}k`} icon={<DollarSign className="h-4 w-4" />} accent="success" />
        <KpiCard label="Pending Tasks" value={pendingTasks} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-surface rounded-lg p-4 cursor-pointer group flex items-center gap-3"
                >
                  <div className={`p-2 rounded-lg glass-surface ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-foreground transition-colors">{action.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Pipeline Summary</h3>
            <Link href="/crm">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {oppList.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No deals in pipeline yet</p>
                <Link href="/outreach">
                  <Button size="sm" className="mt-3 btn-premium text-white text-xs">
                    Start Prospecting
                  </Button>
                </Link>
              </div>
            ) : (
              oppList.slice(0, 5).map((opp: any) => (
                <div key={opp.id} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{opp.title ?? opp.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{(opp.stage ?? "new").replace(/_/g, " ")}</p>
                  </div>
                  <span className="text-xs font-semibold text-crimson ml-2">${((opp.value ?? opp.amount ?? 0) / 1000).toFixed(0)}k</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Leads</h3>
            <Link href="/outreach">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          {leadList.length === 0 ? (
            <div className="text-center py-6">
              <Target className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No leads yet — start with Outreach</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leadList.slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{lead.firstName ?? lead.first_name ?? ""} {lead.lastName ?? lead.last_name ?? ""}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lead.company ?? lead.companyName ?? ""}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{(lead.status ?? "new").replace(/_/g, " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">System Status</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "AI Engine", status: "online", detail: "Claude (Primary)" },
              { label: "Wallet", status: "active", detail: "Credits available" },
              { label: "Outreach", status: leadList.length > 0 ? "active" : "ready", detail: `${leadList.length} leads tracked` },
              { label: "CRM", status: oppList.length > 0 ? "active" : "ready", detail: `${oppList.length} deals in pipeline` },
              { label: "Marketing", status: "ready", detail: "Coming in Session 3" },
              { label: "Production", status: "ready", detail: "Coming in Session 3" },
            ].map((sys) => (
              <div key={sys.label} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${sys.status === "online" || sys.status === "active" ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`} />
                  <span className="text-xs font-medium">{sys.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{sys.detail}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
