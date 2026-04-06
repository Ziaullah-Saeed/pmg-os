import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useAiMode, useSetAiMode } from "@/hooks/use-api";

type AiModeType = "ai_autonomous" | "hybrid" | "human_controlled";

interface AiModeContextValue {
  mode: AiModeType;
  currentMode: string;
  isAuto: boolean;
  isHybrid: boolean;
  isHuman: boolean;
  setMode: (mode: string) => void;
}

const AiModeContext = createContext<AiModeContextValue>({
  mode: "ai_autonomous",
  currentMode: "ai_auto",
  isAuto: true,
  isHybrid: false,
  isHuman: false,
  setMode: () => {},
});

export function AiModeProvider({ children }: { children: ReactNode }) {
  const { data: modeData } = useAiMode();
  const setModeMutation = useSetAiMode();
  const mode = (modeData?.mode ?? "ai_autonomous") as AiModeType;

  const currentMode = mode === "ai_autonomous" ? "ai_auto" : mode === "human_controlled" ? "human" : "hybrid";

  const setMode = useCallback((newMode: string) => {
    const mapped = newMode === "ai_auto" ? "ai_autonomous" : newMode === "human" ? "human_controlled" : newMode;
    setModeMutation.mutate(mapped);
  }, [setModeMutation]);

  const value: AiModeContextValue = {
    mode,
    currentMode,
    isAuto: mode === "ai_autonomous",
    isHybrid: mode === "hybrid",
    isHuman: mode === "human_controlled",
    setMode,
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
