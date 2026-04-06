import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import {
  Landmark, Receipt, FileText, Shield, TrendingUp
} from "lucide-react";

export default function Finance() {
  const agents = [
    { name: "Billing & Revenue", desc: "Invoice creation, payment tracking, wallet management, revenue dashboard", icon: <Receipt className="h-5 w-5" />, color: "text-crimson" },
    { name: "Contract & Expense", desc: "Contract lifecycle tracking, expense management, revenue forecasting", icon: <FileText className="h-5 w-5" />, color: "text-info" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Finance"
        subtitle="Billing, invoicing, contracts, expenses, and revenue forecasting"
        icon={<Landmark className="h-5 w-5" />}
      />

      <GlassCard variant="insight">
        <div className="flex items-center gap-3 mb-2">
          <Landmark className="h-5 w-5 text-gold" />
          <h3 className="text-sm font-semibold">Coming in Session 4</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The Finance section with 2 specialized agents is being built in Session 4.
          Full billing, invoicing, contract management, and revenue forecasting.
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
