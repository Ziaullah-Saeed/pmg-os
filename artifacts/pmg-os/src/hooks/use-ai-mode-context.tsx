import { createContext, useContext, type ReactNode } from "react";
import { useAiMode } from "@/hooks/use-api";

type AiModeType = "ai_autonomous" | "hybrid" | "human_controlled";

interface AiModeContextValue {
  mode: AiModeType;
  isAuto: boolean;
  isHybrid: boolean;
  isHuman: boolean;
}

const AiModeContext = createContext<AiModeContextValue>({
  mode: "ai_autonomous",
  isAuto: true,
  isHybrid: false,
  isHuman: false,
});

export function AiModeProvider({ children }: { children: ReactNode }) {
  const { data: modeData } = useAiMode();
  const mode = (modeData?.mode ?? "ai_autonomous") as AiModeType;

  const value: AiModeContextValue = {
    mode,
    isAuto: mode === "ai_autonomous",
    isHybrid: mode === "hybrid",
    isHuman: mode === "human_controlled",
  };

  return (
    <AiModeContext.Provider value={value}>
      {children}
    </AiModeContext.Provider>
  );
}

export function useAiModeContext() {
  return useContext(AiModeContext);
}
