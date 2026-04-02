import { db, activitiesTable } from "@workspace/db";
import { createNotification } from "./notification-service";
import { broadcast } from "./websocket-service";
import { executeOrQueue } from "./mode-action-service";

export type HandoffTier = "HIGH" | "MEDIUM" | "LOW";

export interface HandoffDecision {
  tier: HandoffTier;
  confidence: number;
  action: "auto_continue" | "ai_with_review" | "human_takeover";
  requiresHuman: boolean;
  message: string;
}

export function classifyConfidence(confidence: number): HandoffDecision {
  if (confidence >= 80) {
    return {
      tier: "HIGH",
      confidence,
      action: "auto_continue",
      requiresHuman: false,
      message: `High confidence (${confidence}%) — auto-continuing`,
    };
  }
  if (confidence >= 50) {
    return {
      tier: "MEDIUM",
      confidence,
      action: "ai_with_review",
      requiresHuman: true,
      message: `Medium confidence (${confidence}%) — AI result with human review recommended`,
    };
  }
  return {
    tier: "LOW",
    confidence,
    action: "human_takeover",
    requiresHuman: true,
    message: `Low confidence (${confidence}%) — full human takeover required`,
  };
}

export async function handleConfidenceHandoff(params: {
  confidence: number;
  actionType: string;
  workflowKey: string;
  domain: string;
  entityType?: string;
  entityId?: number;
  aiResult: any;
  aiResultSummary: string;
  executeAction: (result: any) => Promise<any>;
}): Promise<{
  decision: HandoffDecision;
  executed: boolean;
  queued: boolean;
  result?: any;
}> {
  const decision = classifyConfidence(params.confidence);

  await db.insert(activitiesTable).values({
    entityType: params.entityType ?? "system",
    entityId: params.entityId,
    action: `confidence_handoff_${decision.tier.toLowerCase()}`,
    description: decision.message,
    performedBy: "confidence_handoff",
    metadata: JSON.stringify({
      confidence: params.confidence,
      tier: decision.tier,
      action: decision.action,
      actionType: params.actionType,
    }),
  });

  if (decision.tier === "HIGH") {
    try {
      const result = await params.executeAction(params.aiResult);
      return { decision, executed: true, queued: false, result };
    } catch (err: any) {
      await createNotification({
        type: "handoff_execution_failed",
        severity: "error",
        title: `High-confidence action failed: ${params.actionType}`,
        message: `Despite ${params.confidence}% confidence, execution failed: ${err.message}`,
        domain: params.domain,
        entityType: params.entityType,
        entityId: params.entityId,
        actor: "confidence_handoff",
      });
      return { decision, executed: false, queued: false };
    }
  }

  if (decision.tier === "MEDIUM") {
    const queueResult = await executeOrQueue({
      actionType: `handoff_${params.actionType}`,
      workflowKey: params.workflowKey,
      entityType: params.entityType,
      entityId: params.entityId,
      title: `Review AI Result: ${params.actionType}`,
      description: `AI produced result with ${params.confidence}% confidence. ${params.aiResultSummary}`,
      confidence: params.confidence,
      aiRecommendation: "approve",
      aiParts: `AI analysis complete with ${params.confidence}% confidence`,
      humanParts: `Review AI output, verify accuracy, approve or modify`,
      options: [
        { id: "approve", label: "Approve AI Result", description: "Accept and apply the AI-generated result", isAiRecommended: true },
        { id: "modify", label: "Modify & Apply", description: "Edit the result before applying" },
        { id: "reject", label: "Reject", description: "Discard AI result, handle manually" },
      ],
      metadata: { aiResult: params.aiResult, confidence: params.confidence, originalAction: params.actionType },
      executeAction: async (option) => {
        if (option === "approve" || option === "modify") {
          return params.executeAction(params.aiResult);
        }
      },
    });

    return {
      decision,
      executed: queueResult.executed,
      queued: queueResult.queued,
      result: queueResult.result,
    };
  }

  await createNotification({
    type: "human_takeover",
    severity: "error",
    title: `Human Takeover Required: ${params.actionType}`,
    message: `AI confidence too low (${params.confidence}%). ${params.aiResultSummary}. Manual handling required.`,
    domain: params.domain,
    entityType: params.entityType,
    entityId: params.entityId,
    actor: "confidence_handoff",
    metadata: { confidence: params.confidence, aiResult: params.aiResult },
  });

  broadcast("human_takeover", {
    actionType: params.actionType,
    confidence: params.confidence,
    entityType: params.entityType,
    entityId: params.entityId,
    message: decision.message,
  });

  const queueResult = await executeOrQueue({
    actionType: `human_takeover_${params.actionType}`,
    workflowKey: params.workflowKey,
    entityType: params.entityType,
    entityId: params.entityId,
    title: `Manual Action Required: ${params.actionType}`,
    description: `AI confidence critically low (${params.confidence}%). The AI result is unreliable — manual handling needed.`,
    confidence: params.confidence,
    aiParts: `AI attempted ${params.actionType} but confidence is too low to trust`,
    humanParts: `Perform ${params.actionType} manually. AI result available for reference but not recommended.`,
    options: [
      { id: "handle_manually", label: "Handle Manually", description: "Perform this action yourself", isAiRecommended: true },
      { id: "retry_ai", label: "Retry AI", description: "Re-run the AI with adjusted parameters" },
      { id: "dismiss", label: "Dismiss", description: "No action needed" },
    ],
    metadata: { aiResult: params.aiResult, confidence: params.confidence, originalAction: params.actionType },
    executeAction: async (option) => {
      if (option === "retry_ai") {
        return { retryRequested: true };
      }
    },
  });

  return {
    decision,
    executed: false,
    queued: queueResult.queued,
  };
}

export function getHandoffStats(activities: Array<{ metadata: string | null }>): {
  high: number;
  medium: number;
  low: number;
  total: number;
} {
  const stats = { high: 0, medium: 0, low: 0, total: 0 };
  for (const a of activities) {
    if (!a.metadata) continue;
    try {
      const meta = typeof a.metadata === "string" ? JSON.parse(a.metadata) : a.metadata;
      if (meta.tier === "HIGH") stats.high++;
      else if (meta.tier === "MEDIUM") stats.medium++;
      else if (meta.tier === "LOW") stats.low++;
      stats.total++;
    } catch {}
  }
  return stats;
}
