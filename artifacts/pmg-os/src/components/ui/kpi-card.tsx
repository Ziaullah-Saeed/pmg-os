import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  accent?: "crimson" | "gold" | "blue" | "success" | "default";
  className?: string;
}

export function KpiCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accent = "default",
  className,
}: KpiCardProps) {
  const accentGlow: Record<string, string> = {
    default: "",
    crimson: "glow-crimson",
    gold: "glow-gold",
    blue: "glow-blue",
    success: "glow-success",
  };

  const accentColor: Record<string, string> = {
    default: "text-foreground",
    crimson: "text-crimson",
    gold: "text-gold",
    blue: "text-info",
    success: "text-success",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "glass-card rounded-lg p-5 flex flex-col gap-3",
        accentGlow[accent],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        {icon && (
          <div className={cn("opacity-60", accentColor[accent])}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn("kpi-number", accentColor[accent])}>
        {value}
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {change > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : change < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-crimson" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={cn(
            "text-xs font-medium",
            change > 0 ? "text-success" : change < 0 ? "text-crimson" : "text-muted-foreground"
          )}>
            {change > 0 ? "+" : ""}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
