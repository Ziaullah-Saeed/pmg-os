import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { AiResultPanel } from "@/components/ai-result-panel";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import {
  useAiCreateInvoice,
  useAiManageContracts,
} from "@/hooks/use-api";
import {
  Landmark, Receipt, FileText, TrendingUp, DollarSign,
  Sparkles, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Plus, Send, Eye, Download, ArrowUpRight, ArrowDownRight,
  Calendar, Users, Shield, AlertCircle, BarChart3, Star,
  CreditCard, Wallet, Bell, RefreshCw
} from "lucide-react";

const tabs = [
  { id: "billing", label: "Billing & Revenue", icon: <Receipt className="h-4 w-4" /> },
  { id: "contracts", label: "Contracts & Expenses", icon: <FileText className="h-4 w-4" /> },
];

export default function Finance() {
  const [activeTab, setActiveTab] = useState("billing");
  const [aiResult, setAiResult] = useState<any>(null);
  const { isHuman } = useAiModeContext();
  const createInvoice = useAiCreateInvoice();
  const manageContracts = useAiManageContracts();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Finance"
        subtitle={isHuman ? "Invoicing, payments, contracts, and expenses" : "AI-powered financial management and forecasting"}
        icon={<Landmark className="h-5 w-5" />}
        actions={
          <Button className="btn-premium text-white text-sm">
            <Plus className="h-4 w-4 mr-2" />New Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="MRR" value="$0" icon={<TrendingUp className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Outstanding" value="$0" icon={<Clock className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Collected (MTD)" value="$0" icon={<DollarSign className="h-4 w-4" />} accent="success" />
        <KpiCard label="Active Contracts" value={0} icon={<FileText className="h-4 w-4" />} accent="blue" />
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
          {activeTab === "billing" && <BillingTab isHuman={isHuman} />}
          {activeTab === "contracts" && <ContractsTab isHuman={isHuman} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BillingTab({ isHuman }: { isHuman: boolean }) {
  const createInvoice = useAiCreateInvoice();
  const [aiResult, setAiResult] = useState<any>(null);
  const invoices: {id:string;client:string;amount:number;status:string;type:string;date:string;paidDate:string|null;package:string}[] = [];

  const revenueByClient: {client:string;revenue:number;cost:number;package:string;months:number}[] = [];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Invoice Generation" />}
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
                          <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
                disabled={createInvoice.isPending}
                onClick={() => createInvoice.mutate({ clientName: "All Clients", amount: 5000, services: ["Lead Generation", "Campaign Management"], dueDate: "30 days" }, {
                  onSuccess: (data) => setAiResult({ type: "invoice", data }),
                })}>
                {createInvoice.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Generate Monthly
              </Button>
            
            <Button size="sm" className="btn-premium text-white text-xs">
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
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-400"><Send className="h-3 w-3" /></Button>
                )}
                {inv.status === "overdue" && (
                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-red-400"><Bell className="h-3 w-3" /></Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 px-1.5"><Eye className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5"><Download className="h-3 w-3" /></Button>
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

function ContractsTab({ isHuman }: { isHuman: boolean }) {
  const manageContracts = useAiManageContracts();
  const createInvoice = useAiCreateInvoice();
  const [aiResult, setAiResult] = useState<any>(null);
  const contracts: {client:string;package:string;value:string;start:string;end:string;renewal:string;status:string}[] = [];

  const expenses: {category:string;items:{name:string;cost:number}[];total:number}[] = [];

  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);

  const scenarios: {label:string;revenue:string;newMRR:string}[] = [];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Contract Management" />}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Active Contracts</h3>
                      <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
              disabled={manageContracts.isPending}
              onClick={() => manageContracts.mutate({ clientName: "New Client", serviceType: "Lead Generation", duration: "12 months", monthlyValue: 5000 }, {
                onSuccess: (data) => setAiResult({ type: "contract", data }),
              })}>
              {manageContracts.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Draft New Contract
            </Button>
          
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
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2">
                    <RefreshCw className="h-2.5 w-2.5 mr-1" />Renew
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 px-1.5"><Eye className="h-3 w-3" /></Button>
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
              <p className="text-xs text-success font-bold">$0 profit</p>
              <p className="text-[10px] text-muted-foreground">$0 MRR — ${totalExpenses} expenses</p>
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
                  <Button size="sm" variant="outline" className="mt-3 text-xs border-crimson/30 text-crimson"
            disabled={createInvoice.isPending}
            onClick={() => createInvoice.mutate({ clientName: "Custom Scenario", amount: 10000, services: ["Full Service Package"], dueDate: "NET 15" }, {
              onSuccess: (data) => setAiResult({ type: "scenario", data }),
            })}>
            {createInvoice.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Run Custom Scenario
          </Button>
        
      </GlassCard>
    </div>
  );
}
