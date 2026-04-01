import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceMeter({ score, showLabel = true, size = "md", className }: ConfidenceMeterProps) {
  const level = score >= 75 ? "high" : score >= 40 ? "medium" : "low";

  const levelColors: Record<string, string> = {
    high: "confidence-fill-high",
    medium: "confidence-fill-medium",
    low: "confidence-fill-low",
  };

  const levelLabels: Record<string, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  const levelTextColors: Record<string, string> = {
    high: "text-success",
    medium: "text-warning",
    low: "text-crimson",
  };

  const sizeClasses: Record<string, string> = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("confidence-bar flex-1", sizeClasses[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-700", levelColors[level])}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium tabular-nums", levelTextColors[level])}>
          {score}%
        </span>
      )}
    </div>
  );
}
