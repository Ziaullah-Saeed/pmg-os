import { useState } from "react";
import { useWalletBalance, useWalletTransactions, useFundWallet } from "@/hooks/use-api";
import { Wallet, Plus, Minus, ArrowUpRight, ArrowDownRight, X, TrendingUp, Zap, CreditCard, Loader2, BarChart3, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const DOMAIN_COLORS: Record<string, string> = {
  intelligence: "#8b5cf6",
  outreach: "#f97316",
  marketing: "#ec4899",
  production: "#10b981",
  crm: "#3b82f6",
  communications: "#06b6d4",
  execution: "#eab308",
  finance: "#ef4444",
  reports: "#6366f1",
  system: "#64748b",
};

const ACTION_COSTS: Record<string, string> = {
  "ai-enrich-lead": "$0.05",
  "ai-score-lead": "$0.03",
  "ai-generate-report": "$0.15",
  "ai-draft-email": "$0.08",
  "ai-analyze-sentiment": "$0.04",
  "ai-generate-content": "$0.12",
  "midjourney-generate": "$0.50",
  "ai-research": "$0.10",
};

export function WalletDisplay({ collapsed }: { collapsed?: boolean }) {
  const { data: wallet } = useWalletBalance();
  const { data: transactions } = useWalletTransactions(50);
  const fundWallet = useFundWallet();
  const [showPanel, setShowPanel] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [showFund, setShowFund] = useState<"add" | "decrease" | null>(null);
  const [activeTab, setActiveTab] = useState<"transactions" | "breakdown" | "costs">("transactions");
  const [paymentMethod, setPaymentMethod] = useState("visa_4242");
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const { toast } = useToast();

  const balance = wallet?.balance ?? 0;
  const txList = (transactions ?? []) as any[];

  const totalSpent = txList
    .filter((t: any) => t.type === "debit" || t.amount < 0)
    .reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0);
  const totalFunded = txList
    .filter((t: any) => t.type === "credit" || t.amount > 0)
    .reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0);

  const domainSpend: Record<string, number> = {};
  txList.filter((t: any) => t.type === "debit" || t.amount < 0).forEach((t: any) => {
    const d = t.domain ?? "system";
    domainSpend[d] = (domainSpend[d] ?? 0) + Math.abs(t.amount ?? 0);
  });
  const sortedDomains = Object.entries(domainSpend).sort((a, b) => b[1] - a[1]);

  const color = balance > 50 ? "text-green-400" : balance > 10 ? "text-yellow-400" : "text-red-400";
  const bgColor = balance > 50 ? "bg-green-500/10" : balance > 10 ? "bg-yellow-500/10" : "bg-red-500/10";
  const borderColor = balance > 50 ? "border-green-500/20" : balance > 10 ? "border-yellow-500/20" : "border-red-500/20";

  const handleFund = () => {
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) return;
    if (showFund === "decrease") {
      if (amt > balance) {
        toast({ title: "Cannot withdraw more than current balance", variant: "destructive" });
        return;
      }
      fundWallet.mutate(-amt, {
        onSuccess: () => {
          toast({ title: `$${amt.toFixed(2)} withdrawn from wallet` });
          setFundAmount("");
          setShowFund(null);
        },
      });
    } else {
      fundWallet.mutate(amt, {
        onSuccess: () => {
          toast({ title: `$${amt.toFixed(2)} added to wallet` });
          setFundAmount("");
          setShowFund(null);
        },
      });
    }
  };

  const paymentMethods = [
    { id: "visa_4242", label: "Visa ••4242", icon: "💳" },
    { id: "mc_8888", label: "Mastercard ••8888", icon: "💳" },
    { id: "amex_1234", label: "Amex ••1234", icon: "💳" },
    { id: "bank_ach", label: "Bank ACH ••7890", icon: "🏦" },
  ];

  if (collapsed) {
    return (
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={cn("p-2 rounded-lg border transition-all hover:scale-105", bgColor, borderColor)}
        title={`$${balance.toFixed(2)}`}
      >
        <Wallet className={cn("h-5 w-5", color)} />
      </button>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowPanel(!showPanel)}
        className={cn(
          "w-full mx-0 px-3 py-2.5 rounded-lg border cursor-pointer transition-all",
          bgColor, borderColor,
          showPanel && "ring-1 ring-white/10"
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("p-1 rounded", bgColor)}>
            <Wallet className={cn("h-4 w-4", color)} />
          </div>
          <div className="text-left flex-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">AI Wallet</p>
            <motion.p
              key={balance}
              initial={{ scale: 1.2, opacity: 0, y: -5 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className={cn("text-sm font-bold tabular-nums", color)}
            >
              ${balance.toFixed(2)}
            </motion.p>
          </div>
          <motion.div
            animate={{ rotate: showPanel ? 180 : 0 }}
            className="text-slate-500"
          >
            <ArrowUpRight className="h-3 w-3" />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/10 bg-[hsl(222_47%_5%)] shadow-2xl shadow-black/50 overflow-hidden"
            style={{ minWidth: "240px" }}
          >
            <div className="p-3 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Wallet Overview</span>
                <button onClick={() => setShowPanel(false)} className="text-slate-500 hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-1 mb-0.5">
                    <ArrowDownRight className="h-2.5 w-2.5 text-green-400" />
                    <span className="text-[9px] text-green-400/70">Funded</span>
                  </div>
                  <p className="text-xs font-bold text-green-400 tabular-nums">${totalFunded.toFixed(2)}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-1 mb-0.5">
                    <ArrowUpRight className="h-2.5 w-2.5 text-red-400" />
                    <span className="text-[9px] text-red-400/70">Spent</span>
                  </div>
                  <p className="text-xs font-bold text-red-400 tabular-nums">${totalSpent.toFixed(2)}</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {showFund ? (
                  <motion.div
                    key="fund"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      {showFund === "add" ? "Add Funds" : "Withdraw Funds"}
                    </p>
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Amount"
                        value={fundAmount}
                        onChange={e => setFundAmount(e.target.value)}
                        className="h-7 text-xs bg-white/5 border-white/10 text-white flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className={cn("h-7 px-2 text-[10px] text-white", showFund === "add" ? "btn-premium" : "bg-red-500/20 border border-red-500/30 hover:bg-red-500/30")}
                        onClick={handleFund}
                        disabled={fundWallet.isPending}
                      >
                        {fundWallet.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : showFund === "add" ? "Add" : "Withdraw"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-1.5 text-[10px]"
                        onClick={() => setShowFund(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                ) : showPaymentMethod ? (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Payment Method</p>
                      <button onClick={() => setShowPaymentMethod(false)} className="text-slate-500 hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {paymentMethods.map(pm => (
                      <button
                        key={pm.id}
                        onClick={() => {
                          setPaymentMethod(pm.id);
                          toast({ title: `Payment method changed to ${pm.label}` });
                          setShowPaymentMethod(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all text-[10px]",
                          paymentMethod === pm.id
                            ? "bg-crimson/10 border border-crimson/30 text-white"
                            : "bg-white/[0.02] border border-white/5 text-slate-400 hover:bg-white/5"
                        )}
                      >
                        <span>{pm.icon}</span>
                        <span className="flex-1">{pm.label}</span>
                        {paymentMethod === pm.id && <span className="text-[8px] text-crimson font-bold">ACTIVE</span>}
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="actions" className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 flex-1 text-[10px] btn-premium text-white"
                        onClick={() => setShowFund("add")}
                      >
                        <Plus className="h-3 w-3 mr-1" />Add Funds
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-[10px] border-red-500/20 text-red-400 hover:bg-red-500/10"
                        onClick={() => setShowFund("decrease")}
                      >
                        <Minus className="h-3 w-3 mr-1" />Withdraw
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-full text-[10px] border-white/10 text-slate-400 hover:text-white"
                      onClick={() => setShowPaymentMethod(true)}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />Change Payment Method
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex border-b border-white/5">
              {(["transactions", "breakdown", "costs"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1.5 text-[9px] uppercase tracking-wider font-semibold transition-colors",
                    activeTab === tab ? "text-white border-b-2 border-crimson" : "text-slate-600 hover:text-slate-400"
                  )}
                >
                  {tab === "transactions" ? "History" : tab === "breakdown" ? "By Domain" : "Costs"}
                </button>
              ))}
            </div>

            <div className="max-h-[220px] overflow-y-auto">
              {activeTab === "transactions" && (
                <>
                  {txList.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[10px] text-slate-600">No transactions yet</div>
                  ) : (
                    txList.slice(0, 20).map((tx: any, i: number) => {
                      const isCredit = tx.type === "credit" || tx.amount > 0;
                      return (
                        <motion.div
                          key={tx.id ?? i}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="px-3 py-1.5 flex items-center gap-2 hover:bg-white/[0.02] border-b border-white/[0.02] last:border-0"
                        >
                          <div className={cn("p-1 rounded", isCredit ? "bg-green-500/10" : "bg-red-500/10")}>
                            {isCredit
                              ? <ArrowDownRight className="h-2.5 w-2.5 text-green-400" />
                              : <Zap className="h-2.5 w-2.5 text-red-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-white truncate">{tx.description ?? (isCredit ? "Funded" : "AI Usage")}</p>
                            <p className="text-[9px] text-slate-600">
                              {tx.domain && <span className="text-slate-500 mr-1">{tx.domain}</span>}
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                          </div>
                          <span className={cn("text-[10px] font-bold tabular-nums", isCredit ? "text-green-400" : "text-red-400")}>
                            {isCredit ? "+" : "-"}${Math.abs(tx.amount ?? 0).toFixed(2)}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </>
              )}

              {activeTab === "breakdown" && (
                <div className="p-3 space-y-2">
                  {sortedDomains.length === 0 ? (
                    <div className="py-4 text-center text-[10px] text-slate-600">No spend data yet</div>
                  ) : (
                    sortedDomains.map(([domain, amount]) => {
                      const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                      const domainColor = DOMAIN_COLORS[domain] ?? "#64748b";
                      return (
                        <div key={domain} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-300 capitalize">{domain}</span>
                            <span className="text-[10px] font-bold tabular-nums text-slate-200">${amount.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.1, duration: 0.5 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: domainColor }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-600">{pct.toFixed(0)}% of total spend</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "costs" && (
                <div className="p-3 space-y-1.5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Cost Per Action</p>
                  {Object.entries(ACTION_COSTS).map(([action, cost]) => (
                    <div key={action} className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04]">
                      <span className="text-[10px] text-slate-300">{action.replace(/^ai-/, "").replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase())}</span>
                      <span className="text-[10px] font-bold text-crimson tabular-nums">{cost}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
