import { useState } from "react";
import { useListOpportunities, useListDocuments } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
  Landmark, DollarSign, TrendingUp, FileText, Plus, Receipt,
  Scale, AlertTriangle, Download
} from "lucide-react";

const chartTooltipStyle = { backgroundColor: "hsl(214, 65%, 6%)", border: "1px solid hsl(214, 45%, 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210, 40%, 90%)" };

const tabs = [
  { id: "overview", label: "Financial Overview", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "invoices", label: "Invoices", icon: <Receipt className="h-3.5 w-3.5" /> },
  { id: "quotations", label: "Quotations", icon: <DollarSign className="h-3.5 w-3.5" /> },
  { id: "legal", label: "Legal", icon: <Scale className="h-3.5 w-3.5" /> },
];

const invoices = [
  { id: "INV-001", client: "TechCorp Solutions", amount: 25000, status: "paid", date: "2025-03-15", service: "Penetration Testing" },
  { id: "INV-002", client: "SecureNet Financial", amount: 45000, status: "pending", date: "2025-03-22", service: "Compliance Assessment" },
  { id: "INV-003", client: "GlobalHealth IT", amount: 18000, status: "overdue", date: "2025-02-28", service: "Infrastructure Audit" },
];

const quotations = [
  { id: "QUO-001", client: "TechCorp Solutions", amount: 75000, status: "accepted", service: "Full Security Package" },
  { id: "QUO-002", client: "SecureNet Financial", amount: 120000, status: "pending", service: "SOC 2 Compliance + vCISO" },
  { id: "QUO-003", client: "GlobalHealth IT", amount: 35000, status: "draft", service: "HIPAA Compliance Assessment" },
];

const expenses = [
  { category: "Software & Tools", amount: 3200, pct: 18 },
  { category: "Marketing", amount: 5500, pct: 31 },
  { category: "Personnel", amount: 8000, pct: 45 },
  { category: "Operations", amount: 1100, pct: 6 },
];

const revenueData = [
  { month: "Jan", revenue: 32000, expenses: 15000 },
  { month: "Feb", revenue: 45000, expenses: 18000 },
  { month: "Mar", revenue: 38000, expenses: 16500 },
];

export default function Finance() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: opportunities } = useListOpportunities();
  const { data: documents } = useListDocuments();
  const oppList = (opportunities ?? []) as any[];
  const docList = ((documents ?? []) as any[]).filter((d: any) => d.category === "legal");

  const totalPipeline = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const weightedRevenue = oppList.reduce((s: number, o: any) => s + ((o.value ?? 0) * (o.probability ?? 0)) / 100, 0);
  const wonDeals = oppList.filter((o: any) => o.stage === "closed_won");
  const realizedRevenue = wonDeals.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const avgDealSize = oppList.length ? Math.round(totalPipeline / oppList.length) : 0;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Finance & Legal"
        subtitle="Invoicing, quotations, profitability, legal documents, and compliance"
        icon={<Landmark className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg"><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
            <Button className="btn-glass text-foreground text-sm px-4 py-2 rounded-lg"><Scale className="h-4 w-4 mr-2" />Legal Templates</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Pipeline Value" value={`$${totalPipeline.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Weighted Revenue" value={`$${Math.round(weightedRevenue).toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Realized Revenue" value={`$${realizedRevenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="success" />
        <KpiCard label="Avg Deal Size" value={`$${avgDealSize.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Legal Docs" value={docList.length} icon={<Scale className="h-4 w-4" />} />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-2"><h3 className="text-sm font-semibold">Revenue vs Expenses</h3></div>
                <div className="px-2 pb-4 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 45%, 15%)" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(215, 20%, 40%)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(215, 20%, 40%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="revenue" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="expenses" fill="hsl(214, 60%, 50%)" radius={[4, 4, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-2"><h3 className="text-sm font-semibold">Expense Breakdown</h3></div>
                <div className="px-5 pb-4 space-y-3">
                  {expenses.map((exp) => (
                    <div key={exp.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{exp.category}</span>
                        <span className="font-medium tabular-nums">${exp.amount.toLocaleString()} ({exp.pct}%)</span>
                      </div>
                      <ConfidenceMeter score={exp.pct} showLabel={false} />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/30 flex justify-between text-sm font-semibold">
                    <span>Total Monthly Expenses</span>
                    <span className="gradient-text-crimson">${expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Invoices</h3>
              <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"><Download className="h-3 w-3 mr-1" />Export</Button>
            </div>
            <div className="px-5 pb-4 space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{inv.id} — {inv.client}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.service} &bull; {inv.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold gradient-text-crimson">${inv.amount.toLocaleString()}</span>
                    <StatusBadge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "critical" : "pending"} label={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === "quotations" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Quotations & Estimates</h3>
              <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="h-3 w-3 mr-1" />New Quote</Button>
            </div>
            <div className="px-5 pb-4 space-y-2">
              {quotations.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium">{q.id} — {q.client}</p>
                    <p className="text-[10px] text-muted-foreground">{q.service}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">${q.amount.toLocaleString()}</span>
                    <StatusBadge variant={q.status === "accepted" ? "human-approved" : q.status === "pending" ? "pending" : "draft"} label={q.status} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === "legal" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Legal Document Templates</h3></div>
              <div className="px-5 pb-4 space-y-2">
                {[
                  { name: "Non-Disclosure Agreement (NDA)", type: "nda", status: "active", lastUpdated: "2025-01-15" },
                  { name: "Master Service Agreement (MSA)", type: "msa", status: "active", lastUpdated: "2025-02-01" },
                  { name: "Statement of Work (SOW)", type: "sow", status: "active", lastUpdated: "2025-02-10" },
                  { name: "Data Processing Agreement (DPA)", type: "dpa", status: "active", lastUpdated: "2025-01-25" },
                  { name: "Privacy Policy", type: "privacy", status: "active", lastUpdated: "2025-01-10" },
                ].map((tmpl) => (
                  <div key={tmpl.type} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                    <div className="flex items-center gap-3">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{tmpl.name}</p>
                        <p className="text-[10px] text-muted-foreground">Updated: {tmpl.lastUpdated}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="active" label={tmpl.status} />
                      <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg">Use Template</Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard variant="alert-warning">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Legal Boundary Notice</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a matter exceeds standard template boundaries, the system will flag it with: <StatusBadge variant="human-required" />. Always consult qualified legal counsel.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
    </div>
  );
}
