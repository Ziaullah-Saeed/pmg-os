import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "interactive" | "kpi" | "insight" | "alert-critical" | "alert-warning";
  glow?: "none" | "crimson" | "gold" | "blue" | "success";
  children: React.ReactNode;
}

export function GlassCard({
  variant = "default",
  glow = "none",
  className,
  children,
  ...props
}: GlassCardProps) {
  const variantClasses: Record<string, string> = {
    default: "glass-card",
    interactive: "glass-card-interactive",
    kpi: "glass-card",
    insight: "glass-card shimmer",
    "alert-critical": "alert-card-critical",
    "alert-warning": "alert-card-warning",
  };

  const glowClasses: Record<string, string> = {
    none: "",
    crimson: "glow-crimson",
    gold: "glow-gold",
    blue: "glow-blue",
    success: "glow-success",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "rounded-lg p-4",
        variantClasses[variant],
        glowClasses[glow],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
