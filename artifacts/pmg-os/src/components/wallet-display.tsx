import { useState } from "react";
import { useWalletBalance, useWalletTransactions, useFundWallet } from "@/hooks/use-api";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, X, TrendingUp, Zap, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function WalletDisplay({ collapsed }: { collapsed?: boolean }) {
  const { data: wallet } = useWalletBalance();
  const { data: transactions } = useWalletTransactions(20);
  const fundWallet = useFundWallet();
  const [showPanel, setShowPanel] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [showFund, setShowFund] = useState(false);
  const { toast } = useToast();

  const balance = wallet?.balance ?? 0;
  const txList = (transactions ?? []) as any[];

  const totalSpent = txList
    .filter((t: any) => t.type === "debit" || t.amount < 0)
    .reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0);
  const totalFunded = txList
    .filter((t: any) => t.type === "credit" || t.amount > 0)
    .reduce((s: number, t: any) => s + Math.abs(t.amount ?? 0), 0);

  const color = balance > 50 ? "text-green-400" : balance > 10 ? "text-yellow-400" : "text-red-400";
  const bgColor = balance > 50 ? "bg-green-500/10" : balance > 10 ? "bg-yellow-500/10" : "bg-red-500/10";
  const borderColor = balance > 50 ? "border-green-500/20" : balance > 10 ? "border-yellow-500/20" : "border-red-500/20";

  const handleFund = () => {
    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) return;
    fundWallet.mutate(amt, {
      onSuccess: () => {
        toast({ title: `$${amt.toFixed(2)} added to wallet` });
        setFundAmount("");
        setShowFund(false);
      },
    });
  };

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
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
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
            style={{ minWidth: "220px" }}
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
                    className="flex gap-1.5"
                  >
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
                      className="h-7 px-2 text-[10px] btn-premium text-white"
                      onClick={handleFund}
                      disabled={fundWallet.isPending}
                    >
                      {fundWallet.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5 text-[10px]"
                      onClick={() => setShowFund(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="actions" className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 flex-1 text-[10px] btn-premium text-white"
                      onClick={() => setShowFund(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />Add Funds
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="max-h-[200px] overflow-y-auto">
              <div className="px-3 py-1.5 sticky top-0 bg-[hsl(222_47%_5%)]">
                <span className="text-[9px] uppercase tracking-wider text-slate-600 font-semibold">Recent Transactions</span>
              </div>
              {txList.length === 0 ? (
                <div className="px-3 py-4 text-center text-[10px] text-slate-600">No transactions yet</div>
              ) : (
                txList.slice(0, 15).map((tx: any, i: number) => {
                  const isCredit = tx.type === "credit" || tx.amount > 0;
                  return (
                    <motion.div
                      key={tx.id ?? i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-3 py-1.5 flex items-center gap-2 hover:bg-white/[0.02] border-b border-white/[0.02] last:border-0"
                    >
                      <div className={cn(
                        "p-1 rounded",
                        isCredit ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        {isCredit
                          ? <ArrowDownRight className="h-2.5 w-2.5 text-green-400" />
                          : <Zap className="h-2.5 w-2.5 text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white truncate">{tx.description ?? (isCredit ? "Funded" : "AI Usage")}</p>
                        <p className="text-[9px] text-slate-600">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold tabular-nums",
                        isCredit ? "text-green-400" : "text-red-400"
                      )}>
                        {isCredit ? "+" : "-"}${Math.abs(tx.amount ?? 0).toFixed(2)}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
