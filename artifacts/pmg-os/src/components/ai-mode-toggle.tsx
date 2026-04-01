import { useAiMode, useSetAiMode } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { Bot, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

const modes = [
  { value: "ai_autonomous", label: "AI Auto", icon: Bot, color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30", glow: "shadow-green-500/20", desc: "24/7 autonomous", trackColor: "#22c55e" },
  { value: "hybrid", label: "Hybrid", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30", glow: "shadow-yellow-500/20", desc: "AI + human review", trackColor: "#eab308" },
  { value: "human_controlled", label: "Human", icon: Users, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", glow: "shadow-blue-500/20", desc: "Manual control", trackColor: "#3b82f6" },
] as const;

export function AiModeToggle({ collapsed }: { collapsed?: boolean }) {
  const { data: modeData } = useAiMode();
  const setMode = useSetAiMode();
  const currentMode = modeData?.mode ?? "ai_autonomous";

  const activeIdx = modes.findIndex(m => m.value === currentMode);
  const active = modes[activeIdx] ?? modes[0];
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

      <div className="relative mx-2 mb-1">
        <div className="flex justify-between mb-3">
          {modes.map((mode, i) => {
            const ModeIcon = mode.icon;
            const isActive = currentMode === mode.value;
            return (
              <motion.button
                key={mode.value}
                onClick={() => setMode.mutate(mode.value)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all relative",
                  isActive ? `${mode.bg} ${mode.border} border` : "border border-transparent hover:bg-white/5"
                )}
              >
                <div className={cn("p-1.5 rounded-lg transition-all", isActive ? mode.bg : "bg-white/5")}>
                  <ModeIcon className={cn("h-4 w-4 transition-colors", isActive ? mode.color : "text-slate-500")} />
                </div>
                <span className={cn("text-[10px] font-medium transition-colors", isActive ? mode.color : "text-slate-500")}>
                  {mode.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mode-dot"
                    className={cn("absolute -bottom-1 h-1 w-4 rounded-full", mode.color.replace("text-", "bg-"))}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="absolute top-0 h-full rounded-full"
            initial={false}
            animate={{
              left: `${(activeIdx / (modes.length - 1)) * 100}%`,
              width: "33.33%",
              x: activeIdx === 0 ? 0 : activeIdx === modes.length - 1 ? "-100%" : "-50%",
              backgroundColor: active.trackColor,
            }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            style={{ opacity: 0.6 }}
          />
          {modes.map((mode, i) => (
            <button
              key={mode.value}
              onClick={() => setMode.mutate(mode.value)}
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 cursor-pointer z-10"
              style={{
                left: `${(i / (modes.length - 1)) * 100}%`,
                transform: `translateX(${i === 0 ? "0%" : i === modes.length - 1 ? "-100%" : "-50%"}) translateY(-50%)`,
                borderColor: currentMode === mode.value ? mode.trackColor : "rgba(255,255,255,0.15)",
                backgroundColor: currentMode === mode.value ? mode.trackColor : "rgba(255,255,255,0.05)",
                boxShadow: currentMode === mode.value ? `0 0 8px ${mode.trackColor}40` : "none",
              }}
            />
          ))}
        </div>
      </div>
      <p className="text-[10px] text-slate-600 mt-2 px-2">{active.desc}</p>
    </div>
  );
}

export function useCurrentAiMode() {
  const { data: modeData } = useAiMode();
  return modeData?.mode ?? "ai_autonomous";
}
