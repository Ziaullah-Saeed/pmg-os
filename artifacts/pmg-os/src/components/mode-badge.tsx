import { Badge } from "@/components/ui/badge";
import { Bot, Users, Hand } from "lucide-react";

const MODE_CONFIG: Record<string, { label: string; icon: typeof Bot; className: string }> = {
  ai_auto: { label: "AI Auto", icon: Bot, className: "bg-crimson/15 text-crimson border-crimson/30" },
  hybrid: { label: "Hybrid", icon: Users, className: "bg-blue-400/15 text-blue-400 border-blue-400/30" },
  human: { label: "Human", icon: Hand, className: "bg-gold/15 text-gold border-gold/30" },
};

export function ModeBadge({ mode }: { mode: string }) {
  const config = MODE_CONFIG[mode];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-[9px] gap-0.5 px-1.5 py-0 shrink-0 ${config.className}`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
}
