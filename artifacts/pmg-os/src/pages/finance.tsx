import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useToast } from "@/hooks/use-toast";
import {
  useAiCreateInvoice,
  useAiManageContracts,
  useFinanceOverview,
  useWalletBalance,
  useAiOutputs,
  useSaveAiOutput,
  type FinanceOverview,
} from "@/hooks/use-api";
import {
  Landmark, Receipt, FileText, TrendingUp, DollarSign,
  Sparkles, Clock,
  Plus, Send, Eye, Download,
  Bell, RefreshCw, Bot, Hand
} from "lucide-react";

const tabs = [
  { id: "billing", label: "Billing & Revenue", icon: <Receipt className="h-4 w-4" /> },
  { id: "contracts", label: "Contracts & Expenses", icon: <FileText className="h-4 w-4" /> },
];

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Days from now to a date, or null. */
function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.round(ms / (1000 * 60 * 60 * 24));
}

function renewalLabel(d: string | null): string {
  const days = daysUntil(d);
  if (days == null) return "—";
  if (days <= 0) return "now";
  if (days < 45) return `${days} days`;
  return `${Math.round(days / 30)} months`;
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

export default function Finance() {
  const [activeTab, setActiveTab] = useState("billing");
  const { isHuman, isAuto } = useAiModeContext();
  const { toast } = useToast();
  const { data: overview, isLoading } = useFinanceOverview();
  const k = overview?.kpis;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Finance"
        subtitle={isHuman ? "Invoicing, payments, contracts, and expenses" : "AI-powered financial management and forecasting"}
        icon={<Landmark className="h-5 w-5" />}
        actions={
          <Button className="btn-premium text-white text-sm" onClick={() => setActiveTab("billing")}>
            <Plus className="h-4 w-4 mr-2" />New Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={k ? `$${k.mrr.toLocaleString()}` : (isLoading ? "…" : "$0")} icon={<TrendingUp className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Outstanding" value={k ? `$${k.outstanding.toLocaleString()}` : (isLoading ? "…" : "$0")} icon={<Clock className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Collected (MTD)" value={k ? `$${k.collectedMtd.toLocaleString()}` : (isLoading ? "…" : "$0")} icon={<DollarSign className="h-4 w-4" />} accent="success" />
        <KpiCard label="Active Contracts" value={k?.activeContracts ?? 0} icon={<FileText className="h-4 w-4" />} accent="blue" />
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
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
          {activeTab === "billing" && <BillingTab isHuman={isHuman} isAuto={isAuto} overview={overview} />}
          {activeTab === "contracts" && <ContractsTab isHuman={isHuman} isAuto={isAuto} overview={overview} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BillingTab({ isHuman, isAuto, overview }: { isHuman: boolean; isAuto: boolean; overview?: FinanceOverview }) {
  const createInvoice = useAiCreateInvoice();
  const saveOutput = useSaveAiOutput();
  const { data: invoiceDrafts } = useAiOutputs("invoice_draft", { domain: "finance", limit: 10 });
  const { toast } = useToast();
  const { data: wallet } = useWalletBalance();

  const draftList = invoiceDrafts ?? [];
  const invoices = overview?.invoices ?? [];
  const revenueByClient = overview?.revenueByClient ?? [];
  const paidTotal = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.totalAmount, 0);
  const overdue = invoices.filter(i => i.status === "overdue");

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — invoices auto-generated on the 1st. Payment reminders auto-sent at NET+15, NET+30."
        hybridText="Hybrid — AI drafts invoices. You review amounts and approve before sending."
        manualText="Manual — you create and send invoices. AI tracks payment status." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Total Revenue</p>
          <p className="text-lg font-bold text-success">${paidTotal.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{invoices.filter(i => i.status === "paid").length} paid invoices</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Avg Client Value</p>
          <p className="text-lg font-bold text-gold">${revenueByClient.length ? Math.round(revenueByClient.reduce((s, r) => s + r.revenue, 0) / revenueByClient.length).toLocaleString() : "0"}</p>
          <p className="text-[9px] text-muted-foreground">/month</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Overdue</p>
          <p className="text-lg font-bold text-red-400">${overdue.reduce((s, i) => s + i.totalAmount, 0).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{overdue.length} overdue</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Wallet Balance</p>
          <p className="text-lg font-bold text-blue-400">{wallet ? `$${wallet.balance.toLocaleString()}` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">AI API credits</p>
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Invoices</h3>
          <div className="flex gap-2">
            {!isHuman && (
              <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
                disabled={createInvoice.isPending}
                onClick={() => createInvoice.mutate({ services: ["Lead Generation", "Campaign Management"], dueDate: "30 days" }, {
                  onSuccess: (data: any) => {
                    const text = String(data?.invoice ?? data?.result ?? "");
                    saveOutput.mutate({
                      domain: "finance",
                      kind: "invoice_draft",
                      title: `AI Invoice Draft — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                      summary: text.slice(0, 280),
                      data: { content: text },
                    });
                    toast({ title: "Invoice Draft Generated", description: "AI draft saved to history below" });
                  },
                  onError: (err: any) => toast({ title: "Invoice generation failed", description: err?.message || "Request failed", variant: "destructive" }),
                })}>
                {createInvoice.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Invoice Draft
              </Button>
            )}
            <Button size="sm" className="btn-premium text-white text-xs" disabled title="Manual invoice creation form not built yet">
              <Plus className="h-3 w-3 mr-1" />New Invoice
            </Button>
          </div>
        </div>
        {invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No invoices yet.</p>
        ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 p-2 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span className="w-24">Invoice</span>
            <span className="flex-1">Client</span>
            <span className="w-16">Package</span>
            <span className="w-16 text-right">Amount</span>
            <span className="w-14 text-center">Type</span>
            <span className="w-14 text-center">Status</span>
            <span className="w-14 text-center">Due</span>
            <span className="w-20" />
          </div>
          {invoices.map((inv) => (
            <div key={inv.id} className={`flex items-center gap-3 p-2.5 rounded-lg glass-surface ${inv.status === "overdue" ? "ring-1 ring-red-500/20" : ""}`}>
              <span className="w-24 text-xs font-mono">{inv.invoiceNumber}</span>
              <span className="flex-1 text-xs font-medium">{inv.client}</span>
              <Badge variant="outline" className="text-[9px] w-16 justify-center">{inv.package}</Badge>
              <span className="w-16 text-right text-xs font-bold">${inv.totalAmount.toLocaleString()}</span>
              <Badge variant="outline" className="text-[9px] w-14 justify-center">{inv.type}</Badge>
              <Badge variant="outline" className={`text-[9px] w-14 justify-center ${
                inv.status === "paid" ? "text-success border-success/20" :
                inv.status === "sent" ? "text-blue-400 border-blue-500/20" :
                inv.status === "overdue" ? "text-red-400 border-red-500/20" :
                "text-muted-foreground"
              }`}>{inv.status}</Badge>
              <span className="w-14 text-center text-[10px] text-muted-foreground">{fmtDate(inv.dueDate)}</span>
              <div className="w-20 flex gap-1 justify-end">
                {inv.status === "draft" && (
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-400" disabled title="Email integration not configured yet"><Send className="h-3 w-3" /></Button>
                )}
                {inv.status === "overdue" && (
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-red-400" disabled title="Email integration not configured yet"><Bell className="h-3 w-3" /></Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 px-1.5" disabled title="Invoice preview not built yet"><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5" disabled title="PDF export not built yet"><Download className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
        )}
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">AI Invoice Drafts</h3>
          <Badge variant="outline" className="text-[10px]">{draftList.length} saved</Badge>
        </div>
        {draftList.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No AI drafts yet{isHuman ? "." : " — click AI Invoice Draft to generate one."}</p>
        ) : (
          <div className="space-y-3">
            {draftList.map((d) => (
              <div key={d.id} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                  <FileText className="h-3.5 w-3.5 text-crimson" />
                  <p className="text-xs font-semibold flex-1">{d.title}</p>
                  <span className="text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</span>
                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => {
                    navigator.clipboard.writeText(String(d.data?.content ?? d.summary ?? ""));
                    toast({ title: "Copied", description: "Invoice draft copied to clipboard" });
                  }}>
                    <Download className="h-3 w-3 mr-0.5" />Copy
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{(d.data?.content ?? d.summary) || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Client Profitability</h3>
        {revenueByClient.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No paid revenue yet.</p>
        ) : (
        <div className="space-y-2">
          {revenueByClient.map((client) => {
            const profit = client.revenue - client.cost;
            const margin = client.revenue ? Math.round((profit / client.revenue) * 100) : 0;
            return (
              <div key={client.client} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
                <div className="flex-1">
                  <p className="text-xs font-semibold">{client.client}</p>
                  <p className="text-[10px] text-muted-foreground">{client.package} · {client.months} months</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-success font-semibold">${profit.toLocaleString()} profit</p>
                  <p className="text-[10px] text-muted-foreground">${client.revenue.toLocaleString()} rev — ${client.cost.toLocaleString()} cost</p>
                </div>
                <div className="w-16 text-center">
                  <p className="text-sm font-bold text-success">{margin}%</p>
                  <p className="text-[9px] text-muted-foreground">margin</p>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </GlassCard>
    </div>
  );
}

function ContractsTab({ isHuman, isAuto, overview }: { isHuman: boolean; isAuto: boolean; overview?: FinanceOverview }) {
  const manageContracts = useAiManageContracts();
  const saveOutput = useSaveAiOutput();
  const { data: contractDrafts } = useAiOutputs("contract_draft", { domain: "finance", limit: 10 });
  const { toast } = useToast();

  const draftList = contractDrafts ?? [];
  const contracts = overview?.contracts ?? [];
  const expenses = overview?.expenses ?? [];
  const scenarios = overview?.scenarios ?? [];
  const pnl = overview?.pnl ?? { mrr: 0, totalExpenses: 0, profit: 0, margin: 0 };
  const totalExpenses = pnl.totalExpenses;
  const totalMRR = pnl.mrr;
  const profit = pnl.profit;

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — contracts auto-tracked. Renewal alerts sent 30/60/90 days before expiry."
        hybridText="Hybrid — AI drafts contracts and tracks renewals. You review and sign."
        manualText="Manual — you manage contracts. AI alerts you before expiration." />

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Active Contracts</h3>
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
              disabled={manageContracts.isPending}
              onClick={() => manageContracts.mutate({ serviceType: "Lead Generation", duration: "12 months", monthlyValue: 5000 }, {
                onSuccess: (data: any) => {
                  const text = String(data?.contract ?? data?.result ?? "");
                  saveOutput.mutate({
                    domain: "finance",
                    kind: "contract_draft",
                    title: `AI Contract Draft — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                    summary: text.slice(0, 280),
                    data: { content: text },
                  });
                  toast({ title: "Contract Draft Generated", description: "AI draft saved to history below" });
                },
                onError: (err: any) => toast({ title: "Contract drafting failed", description: err?.message || "Request failed", variant: "destructive" }),
              })}>
              {manageContracts.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}AI Contract Draft
            </Button>
          )}
        </div>
        {contracts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No contracts yet.</p>
        ) : (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <div key={contract.id} className={`flex items-center gap-3 p-3 rounded-lg glass-surface ${contract.status === "expiring" ? "ring-1 ring-red-500/20" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold">{contract.client}</p>
                  <Badge variant="outline" className="text-[9px]">{contract.package}</Badge>
                  <Badge variant="outline" className={`text-[9px] ${contract.status === "expiring" ? "text-red-400 border-red-500/20" : "text-success border-success/20"}`}>
                    {contract.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(contract.effectiveDate)} → {fmtDate(contract.expirationDate)}</p>
              </div>
              <span className="text-xs font-bold text-gold">${contract.monthlyValue.toLocaleString()}/mo</span>
              <div className="text-right">
                <p className={`text-[10px] ${contract.status === "expiring" ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                  {contract.status === "expiring" ? "⚠ Expiring in " : "Renewal in "}{renewalLabel(contract.renewalDate ?? contract.expirationDate)}
                </p>
              </div>
              <div className="flex gap-1">
                {contract.status === "expiring" && (
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2" disabled title="Contract renewal flow not built yet">
                    <RefreshCw className="h-2.5 w-2.5 mr-1" />Renew
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 px-1.5" disabled title="Contract detail view not built yet"><Eye className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
        )}
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">AI Contract Drafts</h3>
          <Badge variant="outline" className="text-[10px]">{draftList.length} saved</Badge>
        </div>
        {draftList.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No AI drafts yet{isHuman ? "." : " — click AI Contract Draft to generate one."}</p>
        ) : (
          <div className="space-y-3">
            {draftList.map((d) => (
              <div key={d.id} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                  <FileText className="h-3.5 w-3.5 text-crimson" />
                  <p className="text-xs font-semibold flex-1">{d.title}</p>
                  <span className="text-[10px] text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</span>
                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => {
                    navigator.clipboard.writeText(String(d.data?.content ?? d.summary ?? ""));
                    toast({ title: "Copied", description: "Contract draft copied to clipboard" });
                  }}>
                    <Download className="h-3 w-3 mr-0.5" />Copy
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{(d.data?.content ?? d.summary) || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Monthly Expenses — ${totalExpenses.toLocaleString()}</h3>
        <div className="space-y-3">
          {expenses.map((cat) => (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold">{cat.category}</p>
                <span className="text-xs font-bold text-crimson">${cat.total}/mo</span>
              </div>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-lg glass-surface text-[10px]">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="text-white font-medium">${item.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between p-3 rounded-lg bg-crimson/5 border border-crimson/10">
            <span className="text-xs font-semibold">Monthly P&L</span>
            <div className="text-right">
              <p className="text-xs text-success font-bold">${profit.toLocaleString()} profit</p>
              <p className="text-[10px] text-muted-foreground">${totalMRR.toLocaleString()} MRR — ${totalExpenses.toLocaleString()} expenses</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Revenue Forecasting — Scenarios</h3>
        <div className="space-y-2">
          {scenarios.map((scenario) => (
            <div key={scenario.label} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
              <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-xs flex-1">{scenario.label}</span>
              <span className="text-xs font-bold text-success">${scenario.newMRR.toLocaleString()}</span>
              <span className="text-xs font-bold text-gold">${scenario.annual.toLocaleString()}/yr</span>
            </div>
          ))}
        </div>
        {!isHuman && (
          <Button size="sm" variant="outline" className="mt-3 text-xs border-crimson/30 text-crimson"
            disabled title="Revenue forecasting engine not built yet — scenarios above are from live data">
            <Sparkles className="h-3 w-3 mr-1" />Run Custom Scenario
          </Button>
        )}
      </GlassCard>

      <GlassCard className="border border-success/10 bg-success/5">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-success" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Pricing Tiers</p>
            <p className="text-xs text-muted-foreground">Starter $2,500/mo · Growth $5,000/mo · Enterprise $10,000/mo</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-success">{totalMRR ? Math.round((profit / totalMRR) * 100) : 0}%</p>
            <p className="text-[9px] text-muted-foreground">Net margin</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
