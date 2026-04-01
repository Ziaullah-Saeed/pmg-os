import { useState } from "react";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bot, Users, Zap, CheckCircle2, Circle, ArrowRight, ClipboardList, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ModeAwareWrapperProps {
  children: React.ReactNode;
  humanContent?: React.ReactNode;
  hybridOverlay?: React.ReactNode;
  domain?: string;
}

export function ModeAwareWrapper({ children, humanContent, hybridOverlay, domain }: ModeAwareWrapperProps) {
  const { isHuman, isHybrid } = useAiModeContext();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="relative">
      {isHuman && humanContent && (
        <div className="mb-4 bg-[hsl(214,65%,6%)]/80 border border-blue-500/10 rounded-xl overflow-hidden">
          <button onClick={() => setGuideOpen(!guideOpen)} className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-blue-500/5 transition-colors">
            <ClipboardList className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-100 flex-1">{domain ? `${domain} Workflow Guide` : "Workflow Guide"}</span>
            <Badge variant="outline" className="border-blue-500/20 text-blue-400/70 text-[9px] mr-2">Manual Steps</Badge>
            {guideOpen ? <ChevronUp className="h-3.5 w-3.5 text-blue-400/50" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-400/50" />}
          </button>
          <AnimatePresence>
            {guideOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-blue-500/10">
                  {humanContent}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {children}
      {isHybrid && hybridOverlay}
    </div>
  );
}

export function ModeIndicatorBanner() {
  const { mode, isAuto, isHybrid, isHuman } = useAiModeContext();

  if (isAuto) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "mb-4 px-4 py-2.5 rounded-xl border flex items-center gap-3",
        isHuman
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-yellow-500/5 border-yellow-500/20"
      )}
    >
      {isHuman ? (
        <>
          <Users className="h-4 w-4 text-blue-400" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-400">Human Control Mode</p>
            <p className="text-[10px] text-blue-400/60">AI agents are paused. All actions require manual input.</p>
          </div>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[9px]">Manual</Badge>
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 text-yellow-400" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-yellow-400">Hybrid Mode</p>
            <p className="text-[10px] text-yellow-400/60">AI handles routine tasks. Items marked for human review are highlighted.</p>
          </div>
          <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[9px]">AI + Human</Badge>
        </>
      )}
    </motion.div>
  );
}

interface HumanWorkflowStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  action?: string;
  onAction?: () => void;
}

export function HumanWorkflowGuide({ title, steps, icon }: { title: string; steps: HumanWorkflowStep[]; icon?: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="bg-[hsl(214,65%,6%)]/80 border border-blue-500/10 rounded-xl p-4 mb-4">
      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 w-full text-left">
        {icon ?? <ClipboardList className="h-4 w-4 text-blue-400" />}
        <h3 className="text-xs font-semibold text-blue-100 flex-1">{title}</h3>
        <Badge variant="outline" className="border-blue-500/20 text-blue-400/70 text-[9px] mr-2">Workflow Guide</Badge>
        {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-blue-400/50" /> : <ChevronUp className="h-3.5 w-3.5 text-blue-400/50" />}
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-3 pt-3 border-t border-blue-500/10">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg transition-all",
                    step.status === "current" && "bg-blue-500/5 border border-blue-500/20",
                    step.status === "completed" && "opacity-60",
                    step.status === "upcoming" && "opacity-40"
                  )}
                >
                  <div className="pt-0.5">
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    ) : step.status === "current" ? (
                      <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-[11px] font-medium", step.status === "current" ? "text-blue-200" : "text-slate-300")}>
                      Step {i + 1}: {step.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{step.description}</p>
                  </div>
                  {step.status === "current" && step.action && step.onAction && (
                    <button
                      onClick={(e) => { e.stopPropagation(); step.onAction?.(); }}
                      className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-medium hover:bg-blue-500/30 transition-colors"
                    >
                      {step.action}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HybridItemBadge({ doneBy, needsReview }: { doneBy: "ai" | "human"; needsReview?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {doneBy === "ai" ? (
        <Badge variant="outline" className="text-[8px] px-1 py-0 border-green-500/30 text-green-400">
          <Bot className="h-2.5 w-2.5 mr-0.5" />AI
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[8px] px-1 py-0 border-blue-500/30 text-blue-400">
          <Users className="h-2.5 w-2.5 mr-0.5" />Human
        </Badge>
      )}
      {needsReview && (
        <Badge variant="outline" className="text-[8px] px-1 py-0 border-yellow-500/30 text-yellow-400 animate-pulse">
          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Review
        </Badge>
      )}
    </div>
  );
}
