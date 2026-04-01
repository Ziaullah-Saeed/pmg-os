import { cn } from "@/lib/utils";
import { Bot, User, AlertTriangle, Check, Clock, Sparkles } from "lucide-react";

type BadgeVariant =
  | "ai-executed"
  | "human-assisted"
  | "human-required"
  | "human-approved"
  | "awaiting-review"
  | "ai-recommended"
  | "ai-drafted"
  | "manually-completed"
  | "active"
  | "inactive"
  | "warning"
  | "critical"
  | "success"
  | "pending"
  | "draft";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

const badgeConfig: Record<BadgeVariant, { icon: React.ReactNode; defaultLabel: string; className: string }> = {
  "ai-executed": {
    icon: <Bot className="h-3 w-3" />,
    defaultLabel: "AI Executed",
    className: "ai-badge",
  },
  "human-assisted": {
    icon: <User className="h-3 w-3" />,
    defaultLabel: "Human Assisted",
    className: "human-badge",
  },
  "human-required": {
    icon: <AlertTriangle className="h-3 w-3" />,
    defaultLabel: "Human Required",
    className: "bg-crimson/15 border border-crimson/30 text-crimson",
  },
  "human-approved": {
    icon: <Check className="h-3 w-3" />,
    defaultLabel: "Approved",
    className: "bg-success/15 border border-success/30 text-success",
  },
  "awaiting-review": {
    icon: <Clock className="h-3 w-3" />,
    defaultLabel: "Awaiting Review",
    className: "bg-warning/15 border border-warning/30 text-warning",
  },
  "ai-recommended": {
    icon: <Sparkles className="h-3 w-3" />,
    defaultLabel: "AI Recommended",
    className: "ai-badge",
  },
  "ai-drafted": {
    icon: <Bot className="h-3 w-3" />,
    defaultLabel: "AI Drafted",
    className: "ai-badge",
  },
  "manually-completed": {
    icon: <User className="h-3 w-3" />,
    defaultLabel: "Manual",
    className: "human-badge",
  },
  active: {
    icon: <div className="status-dot-active" />,
    defaultLabel: "Active",
    className: "bg-success/10 border border-success/20 text-success",
  },
  inactive: {
    icon: <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />,
    defaultLabel: "Inactive",
    className: "bg-muted border border-border text-muted-foreground",
  },
  warning: {
    icon: <AlertTriangle className="h-3 w-3" />,
    defaultLabel: "Warning",
    className: "bg-warning/15 border border-warning/30 text-warning",
  },
  critical: {
    icon: <AlertTriangle className="h-3 w-3" />,
    defaultLabel: "Critical",
    className: "bg-crimson/15 border border-crimson/30 text-crimson",
  },
  success: {
    icon: <Check className="h-3 w-3" />,
    defaultLabel: "Success",
    className: "bg-success/15 border border-success/30 text-success",
  },
  pending: {
    icon: <Clock className="h-3 w-3" />,
    defaultLabel: "Pending",
    className: "bg-warning/10 border border-warning/20 text-warning",
  },
  draft: {
    icon: <Clock className="h-3 w-3" />,
    defaultLabel: "Draft",
    className: "bg-muted border border-border text-muted-foreground",
  },
};

export function StatusBadge({ variant, label, className: extraClass }: StatusBadgeProps) {
  const config = badgeConfig[variant];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      config.className,
      extraClass
    )}>
      {config.icon}
      {label || config.defaultLabel}
    </span>
  );
}
