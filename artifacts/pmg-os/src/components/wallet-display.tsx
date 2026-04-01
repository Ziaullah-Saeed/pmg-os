import { useWalletBalance } from "@/hooks/use-api";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletDisplay({ collapsed }: { collapsed?: boolean }) {
  const { data: wallet } = useWalletBalance();
  const balance = wallet?.balance ?? 0;

  const color = balance > 50 ? "text-green-400" : balance > 10 ? "text-yellow-400" : "text-red-400";
  const bgColor = balance > 50 ? "bg-green-500/10" : balance > 10 ? "bg-yellow-500/10" : "bg-red-500/10";

  if (collapsed) {
    return (
      <div className={cn("p-2 rounded-lg", bgColor)} title={`$${balance.toFixed(2)}`}>
        <Wallet className={cn("h-5 w-5", color)} />
      </div>
    );
  }

  return (
    <div className={cn("mx-3 px-3 py-2 rounded-lg", bgColor)}>
      <div className="flex items-center gap-2">
        <Wallet className={cn("h-4 w-4", color)} />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">AI Wallet</p>
          <p className={cn("text-sm font-semibold tabular-nums", color)}>
            ${balance.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
