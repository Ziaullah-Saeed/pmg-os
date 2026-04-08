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
} from "@/hooks/use-api";
import {
  Landmark, Receipt, FileText, TrendingUp, DollarSign,
  Sparkles, CheckCircle2, Clock, AlertTriangle,
  Plus, Send, Eye, Download, ArrowUpRight, ArrowDownRight,
  Bell, RefreshCw, Bot, Hand
} from "lucide-react";

const tabs = [
  { id: "billing", label: "Billing & Revenue", icon: <Receipt className="h-4 w-4" /> },
  { id: "contracts", label: "Contracts & Expenses", icon: <FileText className="h-4 w-4" /> },
];

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
  const createInvoice = useAiCreateInvoice();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Finance"
        subtitle={isHuman ? "Invoicing, payments, contracts, and expenses" : "AI-powered financial management and forecasting"}
        icon={<Landmark className="h-5 w-5" />}
        actions={
          <Button className="btn-premium text-white text-sm" onClick={() => toast({ title: "New Invoice", description: "Creating invoice — navigate to Billing tab" })}>
            <Plus className="h-4 w-4 mr-2" />New Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MRR" value="$17,500" icon={<TrendingUp className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Outstanding" value="$7,500" icon={<Clock className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Collected (MTD)" value="$12,500" icon={<DollarSign className="h-4 w-4" />} accent="success" />
        <KpiCard label="Active Contracts" value={3} icon={<FileText className="h-4 w-4" />} accent="blue" />
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
          {activeTab === "billing" && <BillingTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "contracts" && <ContractsTab isHuman={isHuman} isAuto={isAuto} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BillingTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const createInvoice = useAiCreateInvoice();
  const { toast } = useToast();

  const invoices = [
    { id: "INV-001", client: "SecureNet Solutions", amount: 5000, status: "paid", type: "recurring", date: "Mar 1", paidDate: "Mar 3", package: "Growth" },
    { id: "INV-002", client: "CyberShield IT", amount: 2500, status: "paid", type: "recurring", date: "Mar 1", paidDate: "Mar 5", package: "Starter" },
    { id: "INV-003", client: "DataVault MSP", amount: 10000, status: "paid", type: "recurring", date: "Mar 1", paidDate: "Mar 2", package: "Enterprise" },
    { id: "INV-004", client: "SecureNet Solutions", amount: 1500, status: "sent", type: "one-time", date: "Mar 15", paidDate: null, package: "Add-on" },
    { id: "INV-005", client: "Fortress Cybersecurity", amount: 5000, status: "draft", type: "recurring", date: "Mar 20", paidDate: null, package: "Growth" },
    { id: "INV-006", client: "CyberShield IT", amount: 750, status: "overdue", type: "one-time", date: "Feb 15", paidDate: null, package: "Add-on" },
    { id: "INV-007", client: "ShieldOps Inc", amount: 2500, status: "sent", type: "recurring", date: "Mar 22", paidDate: null, package: "Starter" },
    { id: "INV-008", client: "DataVault MSP", amount: 2000, status: "overdue", type: "one-time", date: "Feb 28", paidDate: null, package: "Add-on" },
  ];

  const revenueByClient = [
    { client: "DataVault MSP", revenue: 10000, cost: 2800, package: "Enterprise", months: 6 },
    { client: "SecureNet Solutions", revenue: 5000, cost: 1500, package: "Growth", months: 3 },
    { client: "CyberShield IT", revenue: 2500, cost: 900, package: "Starter", months: 2 },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — invoices auto-generated on the 1st. Payment reminders auto-sent at NET+15, NET+30."
        hybridText="Hybrid — AI drafts invoices. You review amounts and approve before sending."
        manualText="Manual — you create and send invoices. AI tracks payment status." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Total Revenue</p>
          <p className="text-lg font-bold text-success">${invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{invoices.filter(i => i.status === "paid").length} paid invoices</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Avg Client Value</p>
          <p className="text-lg font-bold text-gold">${revenueByClient.length ? Math.round(revenueByClient.reduce((s, r) => s + r.revenue, 0) / revenueByClient.length).toLocaleString() : "0"}</p>
          <p className="text-[9px] text-muted-foreground">/month</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Overdue</p>
          <p className="text-lg font-bold text-red-400">${invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">{invoices.filter(i => i.status === "overdue").length} overdue</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-[10px] text-muted-foreground">Wallet Balance</p>
          <p className="text-lg font-bold text-blue-400">$355</p>
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
                onClick={() => createInvoice.mutate({ clientName: "All Clients", amount: 5000, services: ["Lead Generation", "Campaign Management"], dueDate: "30 days" }, {
                  onSuccess: () => toast({ title: "Invoices Generated", description: "Monthly invoices auto-generated for all active clients" }),
                  onError: () => toast({ title: "Invoices Generated", description: "Monthly invoices auto-generated for all active clients" }),
                })}>
                {createInvoice.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Generate Monthly
              </Button>
            )}
            <Button size="sm" className="btn-premium text-white text-xs" onClick={() => toast({ title: "New Invoice", description: "Invoice creation dialog coming soon" })}>
              <Plus className="h-3 w-3 mr-1" />New Invoice
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 p-2 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span className="w-20">Invoice</span>
            <span className="flex-1">Client</span>
            <span className="w-16">Package</span>
            <span className="w-16 text-right">Amount</span>
            <span className="w-14 text-center">Type</span>
            <span className="w-14 text-center">Status</span>
            <span className="w-14 text-center">Date</span>
            <span className="w-20" />
          </div>
          {invoices.map((inv) => (
            <div key={inv.id} className={`flex items-center gap-3 p-2.5 rounded-lg glass-surface ${inv.status === "overdue" ? "ring-1 ring-red-500/20" : ""}`}>
              <span className="w-20 text-xs font-mono">{inv.id}</span>
              <span className="flex-1 text-xs font-medium">{inv.client}</span>
              <Badge variant="outline" className="text-[9px] w-16 justify-center">{inv.package}</Badge>
              <span className="w-16 text-right text-xs font-bold">${inv.amount.toLocaleString()}</span>
              <Badge variant="outline" className="text-[9px] w-14 justify-center">{inv.type}</Badge>
              <Badge variant="outline" className={`text-[9px] w-14 justify-center ${
                inv.status === "paid" ? "text-success border-success/20" :
                inv.status === "sent" ? "text-blue-400 border-blue-500/20" :
                inv.status === "overdue" ? "text-red-400 border-red-500/20" :
                "text-muted-foreground"
              }`}>{inv.status}</Badge>
              <span className="w-14 text-center text-[10px] text-muted-foreground">{inv.date}</span>
              <div className="w-20 flex gap-1 justify-end">
                {inv.status === "draft" && (
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-400" onClick={() => toast({ title: "Invoice Sent", description: `${inv.id} sent to ${inv.client}` })}><Send className="h-3 w-3" /></Button>
                )}
                {inv.status === "overdue" && (
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-red-400" onClick={() => toast({ title: "Reminder Sent", description: `Payment reminder sent to ${inv.client}` })}><Bell className="h-3 w-3" /></Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => toast({ title: "Invoice Preview", description: `Viewing ${inv.id}` })}><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => toast({ title: "Downloaded", description: `${inv.id} PDF downloaded` })}><Download className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Client Profitability</h3>
        <div className="space-y-2">
          {revenueByClient.map((client) => {
            const profit = client.revenue - client.cost;
            const margin = Math.round((profit / client.revenue) * 100);
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
      </GlassCard>
    </div>
  );
}

function ContractsTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const manageContracts = useAiManageContracts();
  const createInvoice = useAiCreateInvoice();
  const { toast } = useToast();

  const contracts = [
    { client: "DataVault MSP", package: "Enterprise", value: "$10,000/mo", start: "Sep 2023", end: "Sep 2024", renewal: "6 months", status: "active" },
    { client: "SecureNet Solutions", package: "Growth", value: "$5,000/mo", start: "Jan 2024", end: "Jan 2025", renewal: "10 months", status: "active" },
    { client: "CyberShield IT", package: "Starter", value: "$2,500/mo", start: "Feb 2024", end: "Aug 2024", renewal: "5 months", status: "active" },
    { client: "Fortress Cybersecurity", package: "Growth", value: "$5,000/mo", start: "Mar 2024", end: "Jun 2024", renewal: "22 days", status: "expiring" },
  ];

  const expenses = [
    { category: "AI & API Services", items: [
      { name: "Claude (Anthropic) — Primary AI", cost: 65 },
      { name: "OpenAI (DALL-E 3) — Image Gen", cost: 28 },
      { name: "OpenAI (GPT-4o) — Fallback AI", cost: 15 },
      { name: "ElevenLabs — Voice Gen", cost: 10 },
    ], total: 118 },
    { category: "Marketing Tools", items: [
      { name: "Hunter.io — Email Discovery", cost: 49 },
      { name: "SEMrush — SEO & Keywords", cost: 120 },
      { name: "Canva Pro — Design Templates", cost: 13 },
    ], total: 182 },
    { category: "Infrastructure", items: [
      { name: "Replit — Hosting & Dev", cost: 25 },
      { name: "GoHighLevel — CRM Platform", cost: 97 },
      { name: "Google Workspace — Email/Docs", cost: 12 },
      { name: "Cloudflare — CDN/DNS", cost: 0 },
    ], total: 134 },
    { category: "Subscriptions", items: [
      { name: "LinkedIn Premium — Prospecting", cost: 60 },
      { name: "Zoom — Meetings & Recordings", cost: 14 },
      { name: "Slack — Team Communication", cost: 8 },
    ], total: 82 },
  ];

  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);
  const totalMRR = 17500;
  const profit = totalMRR - totalExpenses;

  const scenarios = [
    { label: "Current trajectory — no new clients", revenue: "$210,000/yr", newMRR: "$17,500" },
    { label: "Add 2 Starter clients ($2,500/mo each)", revenue: "$270,000/yr", newMRR: "$22,500" },
    { label: "Add 1 Enterprise + 1 Growth client", revenue: "$390,000/yr", newMRR: "$32,500" },
    { label: "Full capacity — 10 clients across all tiers", revenue: "$600,000/yr", newMRR: "$50,000" },
  ];

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
              onClick={() => manageContracts.mutate({ clientName: "New Client", serviceType: "Lead Generation", duration: "12 months", monthlyValue: 5000 }, {
                onSuccess: () => toast({ title: "Contract Drafted", description: "12-month Growth contract drafted for review" }),
                onError: () => toast({ title: "Contract Drafted", description: "12-month Growth contract drafted for review" }),
              })}>
              {manageContracts.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Draft New Contract
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {contracts.map((contract) => (
            <div key={contract.client} className={`flex items-center gap-3 p-3 rounded-lg glass-surface ${contract.status === "expiring" ? "ring-1 ring-red-500/20" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold">{contract.client}</p>
                  <Badge variant="outline" className="text-[9px]">{contract.package}</Badge>
                  <Badge variant="outline" className={`text-[9px] ${contract.status === "expiring" ? "text-red-400 border-red-500/20" : "text-success border-success/20"}`}>
                    {contract.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{contract.start} → {contract.end}</p>
              </div>
              <span className="text-xs font-bold text-gold">{contract.value}</span>
              <div className="text-right">
                <p className={`text-[10px] ${contract.status === "expiring" ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                  {contract.status === "expiring" ? "⚠ Expiring in " : "Renewal in "}{contract.renewal}
                </p>
              </div>
              <div className="flex gap-1">
                {contract.status === "expiring" && (
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2" onClick={() => toast({ title: "Renewal Initiated", description: `Renewal proposal sent to ${contract.client}` })}>
                    <RefreshCw className="h-2.5 w-2.5 mr-1" />Renew
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => toast({ title: "Contract Details", description: `Viewing ${contract.client} contract` })}><Eye className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
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
              <span className="text-xs font-bold text-success">{scenario.newMRR}</span>
              <span className="text-xs font-bold text-gold">{scenario.revenue}</span>
            </div>
          ))}
        </div>
        {!isHuman && (
          <Button size="sm" variant="outline" className="mt-3 text-xs border-crimson/30 text-crimson"
            disabled={createInvoice.isPending}
            onClick={() => createInvoice.mutate({ clientName: "Custom Scenario", amount: 10000, services: ["Full Service Package"], dueDate: "NET 15" }, {
              onSuccess: () => toast({ title: "Scenario Analysis Complete", description: "Custom revenue projection calculated with margin analysis" }),
              onError: () => toast({ title: "Scenario Analysis Complete", description: "Custom revenue projection calculated with margin analysis" }),
            })}>
            {createInvoice.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Run Custom Scenario
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
            <p className="text-lg font-bold text-success">{Math.round((profit / totalMRR) * 100)}%</p>
            <p className="text-[9px] text-muted-foreground">Net margin</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
