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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useInvoices, useContracts, useCreateInvoiceMut } from "@/hooks/use-api";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import {
  Landmark, DollarSign, TrendingUp, FileText, Plus, Receipt,
  Scale, AlertTriangle, Download
} from "lucide-react";

const chartTooltipStyle = { backgroundColor: "hsl(214, 65%, 6%)", border: "1px solid hsl(214, 45%, 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210, 40%, 90%)" };

const tabs = [
  { id: "overview", label: "Financial Overview", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "invoices", label: "Invoices", icon: <Receipt className="h-3.5 w-3.5" /> },
  { id: "contracts", label: "Contracts", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "legal", label: "Legal", icon: <Scale className="h-3.5 w-3.5" /> },
];

const expenses = [
  { category: "Software & Tools", amount: 3200, pct: 18 },
  { category: "Marketing", amount: 5500, pct: 31 },
  { category: "Personnel", amount: 8000, pct: 45 },
  { category: "Operations", amount: 1100, pct: 6 },
];

const defaultInvoiceForm = { clientName: "", amount: "", description: "", status: "pending", dueDate: "" };

export default function Finance() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(defaultInvoiceForm);
  const { data: opportunities } = useListOpportunities();
  const { data: documents } = useListDocuments();
  const { data: invoiceData } = useInvoices();
  const { data: contractData } = useContracts();
  const { isHuman } = useAiModeContext();
  const createInvoice = useCreateInvoiceMut();
  const oppList = (opportunities ?? []) as any[];
  const docList = ((documents ?? []) as any[]).filter((d: any) => d.category === "legal");
  const invoiceList = (invoiceData ?? []) as any[];
  const contractList = (contractData ?? []) as any[];

  const totalPipeline = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const weightedRevenue = oppList.reduce((s: number, o: any) => s + ((o.value ?? 0) * (o.probability ?? 0)) / 100, 0);
  const wonDeals = oppList.filter((o: any) => o.stage === "closed_won");
  const realizedRevenue = wonDeals.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const avgDealSize = oppList.length ? Math.round(totalPipeline / oppList.length) : 0;

  const totalInvoiced = invoiceList.reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
  const paidInvoices = invoiceList.filter((inv: any) => inv.status === "paid");
  const pendingInvoices = invoiceList.filter((inv: any) => inv.status === "pending" || inv.status === "sent");
  const overdueInvoices = invoiceList.filter((inv: any) => inv.status === "overdue");

  const revenueData = [
    { month: "Pipeline", revenue: totalPipeline, expenses: 0 },
    { month: "Weighted", revenue: Math.round(weightedRevenue), expenses: 0 },
    { month: "Invoiced", revenue: totalInvoiced, expenses: expenses.reduce((s, e) => s + e.amount, 0) },
    { month: "Realized", revenue: realizedRevenue, expenses: 0 },
  ];

  function handleCreateInvoice() {
    createInvoice.mutate({
      clientName: invoiceForm.clientName,
      amount: Number(invoiceForm.amount),
      description: invoiceForm.description || undefined,
      status: invoiceForm.status,
      dueDate: invoiceForm.dueDate || undefined,
    }, {
      onSuccess: () => {
        setShowCreateInvoice(false);
        setInvoiceForm(defaultInvoiceForm);
      },
    });
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Finance & Legal"
        subtitle="Invoicing, contracts, profitability, legal documents, and compliance"
        icon={<Landmark className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateInvoice(true)}><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
            <Button className="btn-glass text-foreground text-sm px-4 py-2 rounded-lg"><Scale className="h-4 w-4 mr-2" />Legal Templates</Button>
          </div>
        }
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Pipeline Value" value={`$${totalPipeline.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Weighted Revenue" value={`$${Math.round(weightedRevenue).toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Total Invoiced" value={`$${totalInvoiced.toLocaleString()}`} icon={<Receipt className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Avg Deal Size" value={`$${avgDealSize.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Contracts" value={contractList.length} icon={<FileText className="h-4 w-4" />} accent="blue" />
      </div>

      <ModeAwareWrapper
        domain="finance"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Financial Operations Workflow" steps={[
              { id: "1", title: "Review Outstanding Invoices", description: "Check pending and overdue invoices, follow up on payments", status: "current" as const, action: "View Invoices" },
              { id: "2", title: "Create New Invoice", description: "Draft invoice for completed services with line items and terms", status: "upcoming" as const },
              { id: "3", title: "Review Expenses", description: "Categorize and approve monthly expenses by department", status: "upcoming" as const },
              { id: "4", title: "Profitability Check", description: "Compare revenue vs expenses, identify margin improvements", status: "upcoming" as const },
              { id: "5", title: "Legal Compliance", description: "Review contract renewals, NDA status, and compliance deadlines", status: "upcoming" as const },
            ]} icon={<Landmark className="h-5 w-5 text-blue-400" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Invoice Status ({invoiceList.length})</h3>
                <div className="space-y-2">
                  {invoiceList.slice(0, 6).map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                      <div>
                        <p className="text-sm font-medium">INV-{String(inv.id).padStart(3, "0")} — {inv.clientName ?? inv.client_name ?? "Client"}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.description ?? ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${Number(inv.amount ?? 0).toLocaleString()}</p>
                        <StatusBadge variant={inv.status === "paid" ? "ai-approved" : inv.status === "overdue" ? "ai-flagged" : "pending"} label={inv.status} />
                      </div>
                    </div>
                  ))}
                  {invoiceList.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No invoices yet</p>}
                </div>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Active Contracts ({contractList.length})</h3>
                <div className="space-y-2">
                  {contractList.slice(0, 6).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                      <div>
                        <p className="text-sm font-medium">{c.title ?? "Contract"}</p>
                        <p className="text-[10px] text-muted-foreground">{c.type ?? c.contractType ?? "agreement"}</p>
                      </div>
                      <StatusBadge variant={c.status === "active" ? "active" : c.status === "draft" ? "draft" : "pending"} label={c.status} />
                    </div>
                  ))}
                  {contractList.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No contracts yet</p>}
                </div>
              </GlassCard>
            </div>
          </div>
        }
      >
      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-2"><h3 className="text-sm font-semibold">Revenue Pipeline</h3></div>
                <div className="px-2 pb-4 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 45%, 15%)" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(215, 20%, 40%)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(215, 20%, 40%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                      <RechartsTooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="revenue" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Revenue" />
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

            <div className="grid grid-cols-4 gap-4">
              <GlassCard className="text-center">
                <p className="text-2xl font-bold gradient-text-crimson">{invoiceList.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Invoices</p>
              </GlassCard>
              <GlassCard className="text-center">
                <p className="text-2xl font-bold text-success">{paidInvoices.length}</p>
                <p className="text-[10px] text-muted-foreground">Paid</p>
              </GlassCard>
              <GlassCard className="text-center">
                <p className="text-2xl font-bold text-warning">{pendingInvoices.length}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </GlassCard>
              <GlassCard className="text-center">
                <p className="text-2xl font-bold text-crimson">{overdueInvoices.length}</p>
                <p className="text-[10px] text-muted-foreground">Overdue</p>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Invoices ({invoiceList.length})</h3>
              <div className="flex gap-2">
                <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"><Download className="h-3 w-3 mr-1" />Export</Button>
                <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg" onClick={() => setShowCreateInvoice(true)}><Plus className="h-3 w-3 mr-1" />New</Button>
              </div>
            </div>
            <div className="px-5 pb-4 space-y-2">
              {invoiceList.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">INV-{String(inv.id).padStart(3, "0")} — {inv.clientName ?? inv.client_name ?? "Client"}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.description ?? ""} &bull; {inv.dueDate ? new Date(inv.dueDate ?? inv.due_date).toLocaleDateString() : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold gradient-text-crimson">${Number(inv.amount ?? 0).toLocaleString()}</span>
                    <StatusBadge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "critical" : "pending"} label={inv.status} />
                  </div>
                </div>
              ))}
              {invoiceList.length === 0 && (
                <div className="py-8 text-center">
                  <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                  <Button className="btn-premium text-white text-xs mt-3 rounded-lg" onClick={() => setShowCreateInvoice(true)}><Plus className="h-3 w-3 mr-1" />Create First Invoice</Button>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {activeTab === "contracts" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contracts ({contractList.length})</h3>
              <Button className="btn-premium text-white text-xs px-3 py-1.5 rounded-lg"><Plus className="h-3 w-3 mr-1" />New Contract</Button>
            </div>
            <div className="px-5 pb-4 space-y-2">
              {contractList.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium">{c.title ?? "Contract"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.type ?? c.contractType ?? "agreement"} &bull;
                      {c.startDate ? ` ${new Date(c.startDate ?? c.start_date).toLocaleDateString()}` : ""}
                      {c.endDate ? ` — ${new Date(c.endDate ?? c.end_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {c.value && <span className="text-sm font-semibold tabular-nums">${Number(c.value).toLocaleString()}</span>}
                    <StatusBadge variant={c.status === "active" ? "active" : c.status === "approved" ? "human-approved" : c.status === "draft" ? "draft" : "pending"} label={c.status} />
                  </div>
                </div>
              ))}
              {contractList.length === 0 && (
                <div className="py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No contracts yet</p>
                </div>
              )}
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
      </ModeAwareWrapper>

      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="glass-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Client Name</Label>
              <Input className="glass-input mt-1" value={invoiceForm.clientName} onChange={(e) => setInvoiceForm(f => ({ ...f, clientName: e.target.value }))} placeholder="TechCorp Solutions" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount ($)</Label>
                <Input className="glass-input mt-1" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm(f => ({ ...f, amount: e.target.value }))} placeholder="25000" />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input className="glass-input mt-1" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input className="glass-input mt-1" value={invoiceForm.description} onChange={(e) => setInvoiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Penetration Testing Services" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={invoiceForm.status} onValueChange={(v) => setInvoiceForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="btn-glass text-foreground flex-1 rounded-lg" onClick={() => setShowCreateInvoice(false)}>Cancel</Button>
              <Button className="btn-premium text-white flex-1 rounded-lg" onClick={handleCreateInvoice} disabled={!invoiceForm.clientName || !invoiceForm.amount || createInvoice.isPending}>
                {createInvoice.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
