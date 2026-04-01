import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bot, Users, Zap, CheckCircle2, Circle, ArrowRight, ClipboardList, MessageSquare, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ModeAwareWrapperProps {
  children: React.ReactNode;
  humanContent?: React.ReactNode;
  hybridOverlay?: React.ReactNode;
  domain?: string;
}

export function ModeAwareWrapper({ children, humanContent, hybridOverlay, domain }: ModeAwareWrapperProps) {
  const { mode, isHuman, isHybrid } = useAiModeContext();

  return (
    <AnimatePresence mode="wait">
      {isHuman && humanContent ? (
        <motion.div
          key="human"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {humanContent}
        </motion.div>
      ) : (
        <motion.div
          key="ai"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {children}
          {isHybrid && hybridOverlay}
        </motion.div>
      )}
    </AnimatePresence>
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
            <p className="text-[10px] text-blue-400/60">AI agents are paused. Manual guides and step-by-step workflows are active.</p>
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
  return (
    <div className="bg-[hsl(214,65%,6%)]/80 border border-blue-500/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon ?? <ClipboardList className="h-5 w-5 text-blue-400" />}
        <h3 className="text-sm font-semibold text-blue-100">{title}</h3>
        <Badge variant="outline" className="ml-auto border-blue-500/20 text-blue-400/70 text-[9px]">Manual Workflow</Badge>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg transition-all",
              step.status === "current" && "bg-blue-500/5 border border-blue-500/20",
              step.status === "completed" && "opacity-60",
              step.status === "upcoming" && "opacity-40"
            )}
          >
            <div className="pt-0.5">
              {step.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : step.status === "current" ? (
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <ArrowRight className="h-4 w-4 text-blue-400" />
                </motion.div>
              ) : (
                <Circle className="h-4 w-4 text-slate-600" />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                "text-xs font-medium",
                step.status === "current" ? "text-blue-200" : "text-slate-300"
              )}>
                Step {i + 1}: {step.title}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{step.description}</p>
            </div>
            {step.status === "current" && step.action && step.onAction && (
              <button
                onClick={step.onAction}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-medium hover:bg-blue-500/30 transition-colors"
              >
                {step.action}
              </button>
            )}
          </div>
        ))}
      </div>
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
