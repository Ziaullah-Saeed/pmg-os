import { useAiMode, useSetAiMode } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { Bot, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

const modes = [
  { value: "ai_autonomous", label: "AI Auto", icon: Bot, color: "text-green-400", bg: "bg-green-500/20", desc: "24/7 autonomous" },
  { value: "hybrid", label: "Hybrid", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/20", desc: "AI + human review" },
  { value: "human_controlled", label: "Human", icon: Users, color: "text-blue-400", bg: "bg-blue-500/20", desc: "Manual control" },
] as const;

export function AiModeToggle({ collapsed }: { collapsed?: boolean }) {
  const { data: modeData } = useAiMode();
  const setMode = useSetAiMode();
  const currentMode = modeData?.mode ?? "ai_autonomous";

  const active = modes.find(m => m.value === currentMode) ?? modes[0];
  const Icon = active.icon;

  if (collapsed) {
    return (
      <button
        onClick={() => {
          const idx = modes.findIndex(m => m.value === currentMode);
          const next = modes[(idx + 1) % modes.length];
          setMode.mutate(next.value);
        }}
        className={cn("p-2 rounded-lg transition-all", active.bg)}
        title={`AI Mode: ${active.label}`}
      >
        <Icon className={cn("h-5 w-5", active.color)} />
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">AI Mode</p>
      <div className="space-y-1">
        {modes.map((mode) => {
          const ModeIcon = mode.icon;
          const isActive = currentMode === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => setMode.mutate(mode.value)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all",
                isActive
                  ? `${mode.bg} ${mode.color} font-medium`
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <ModeIcon className="h-3.5 w-3.5" />
              <span>{mode.label}</span>
              {isActive && (
                <motion.div
                  layoutId="ai-mode-dot"
                  className={cn("ml-auto h-1.5 w-1.5 rounded-full", mode.color.replace("text-", "bg-"))}
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-600 mt-1.5">{active.desc}</p>
    </div>
  );
}
