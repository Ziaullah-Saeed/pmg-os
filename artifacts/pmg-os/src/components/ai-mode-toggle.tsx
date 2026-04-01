import { useAiMode, useSetAiMode } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { Bot, Users, Zap, GripVertical, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useState } from "react";

const modes = [
  { value: "ai_autonomous", label: "AI Auto", icon: Bot, color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30", glow: "shadow-green-500/20", desc: "24/7 autonomous" },
  { value: "hybrid", label: "Hybrid", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30", glow: "shadow-yellow-500/20", desc: "AI + human review" },
  { value: "human_controlled", label: "Human", icon: Users, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", glow: "shadow-blue-500/20", desc: "Manual control" },
] as const;

export function AiModeToggle({ collapsed }: { collapsed?: boolean }) {
  const { data: modeData } = useAiMode();
  const setMode = useSetAiMode();
  const currentMode = modeData?.mode ?? "ai_autonomous";
  const [showSelector, setShowSelector] = useState(false);

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
        className={cn("p-2 rounded-lg transition-all border", active.bg, active.border)}
        title={`AI Mode: ${active.label}`}
      >
        <Icon className={cn("h-5 w-5", active.color)} />
      </button>
    );
  }

  return (
    <div className="px-1 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 px-2">AI Mode</p>

      <div className="space-y-1">
        {modes.map((mode) => {
          const ModeIcon = mode.icon;
          const isActive = currentMode === mode.value;
          return (
            <motion.button
              key={mode.value}
              onClick={() => setMode.mutate(mode.value)}
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all border relative overflow-hidden",
                isActive
                  ? `${mode.bg} ${mode.color} ${mode.border} font-semibold shadow-lg ${mode.glow}`
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="ai-mode-bg"
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `radial-gradient(circle at 20% 50%, ${mode.color.includes('green') ? '#22c55e' : mode.color.includes('yellow') ? '#eab308' : '#3b82f6'}40, transparent 70%)`
                  }}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <div className="relative flex items-center gap-2 w-full">
                <div className={cn(
                  "p-1 rounded",
                  isActive ? mode.bg : "bg-transparent"
                )}>
                  <ModeIcon className="h-3.5 w-3.5" />
                </div>
                <span>{mode.label}</span>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn("ml-auto h-2 w-2 rounded-full animate-pulse", mode.color.replace("text-", "bg-"))}
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-600 mt-1.5 px-2">{active.desc}</p>
    </div>
  );
}

export function useCurrentAiMode() {
  const { data: modeData } = useAiMode();
  return modeData?.mode ?? "ai_autonomous";
}
