import { db, aiRunsTable, activitiesTable } from "@workspace/db";
import { chargeWallet } from "./wallet-service";
import { getAllAgents, updateAgentStatus, recordAgentRun, getAgent, getEnhancedAgent, type AgentDefinition } from "./agent-registry";
import { getGlobalMode } from "./ai-mode-service";
import { executeChain, getTool, type ToolDefinition } from "./tool-chain-service";
import { classifyConfidence } from "./confidence-handoff-service";
import { createNotification } from "./notification-service";
import { broadcast } from "./websocket-service";
import { orchestrate } from "./orchestration-engine";

const AGENT_TOOL_MAP: Record<string, { tools: string[]; chains?: string[]; runType: string; domain: string }> = {
  "lead-enrich": { tools: ["enrich_lead"], chains: ["lead_qualification"], runType: "enrichment", domain: "outreach" },
  "confidence-score": { tools: ["score_lead"], runType: "scoring", domain: "outreach" },
  "icp-model": { tools: ["generate_icp"], chains: ["icp_analysis"], runType: "icp_modeling", domain: "intelligence" },
  "competitor-map": { tools: ["research_competitors"], chains: ["competitor_intel"], runType: "competitor_mapping", domain: "intelligence" },
  "market-segment": { tools: ["segment_market"], runType: "segmentation", domain: "intelligence" },
  "personalization": { tools: ["personalize_context"], chains: ["outreach_pipeline"], runType: "personalization", domain: "outreach" },
  "outreach-angle": { tools: ["research_prospect"], runType: "prospect_research", domain: "outreach" },
  "deal-progress": { tools: ["suggest_action"], chains: ["deal_assessment"], runType: "monitoring", domain: "crm" },
  "stale-opp": { tools: ["suggest_action"], runType: "stale_detection", domain: "crm" },
  "revenue-forecast": { tools: ["summarize_record"], runType: "forecasting", domain: "crm" },
  "exec-signal": { tools: ["summarize_record"], runType: "signal_detection", domain: "command_center" },
  "risk-detect": { tools: ["suggest_action"], runType: "risk_analysis", domain: "command_center" },
  "bottleneck-detect": { tools: ["suggest_action"], runType: "bottleneck_scan", domain: "command_center" },
  "seo-intent": { tools: ["summarize_record"], runType: "seo_analysis", domain: "marketing" },
  "content-calendar": { tools: ["suggest_action"], runType: "planning", domain: "marketing" },
  "invoice-track": { tools: ["transition_invoice", "record_payment", "check_overdue_invoices"], chains: ["invoice_lifecycle"], runType: "tracking", domain: "finance_legal" },
  "payment-risk": { tools: ["check_overdue_invoices", "transition_invoice"], runType: "risk_analysis", domain: "finance_legal" },
  "profitability": { tools: ["summarize_record", "check_overdue_invoices"], runType: "profitability_analysis", domain: "finance_legal" },
  "legal-review": { tools: ["ai_contract_review", "generate_contract"], chains: ["contract_review_pipeline"], runType: "legal_review", domain: "finance_legal" },
  "compliance-check": { tools: ["check_sop_compliance", "ai_sop_audit", "quality_checkpoint"], runType: "compliance_check", domain: "finance_legal" },
  "sop-structure": { tools: ["check_sop_compliance", "ai_sop_audit"], runType: "sop_management", domain: "finance_legal" },
  "qa-review": { tools: ["quality_checkpoint", "check_sop_compliance"], chains: ["expense_approval_pipeline"], runType: "quality_review", domain: "finance_legal" },
  "rejection-reason": { tools: ["review_expense", "quality_checkpoint"], runType: "rejection_tracking", domain: "finance_legal" },
  "integration-health": { tools: ["summarize_record"], runType: "health_check", domain: "system" },
  "wallet-spend": { tools: ["summarize_record"], runType: "spend_control", domain: "system" },
  "objection-detect": { tools: ["detect_objections"], runType: "objection_detection", domain: "communications" },
  "meeting-summary": { tools: ["process_transcript"], chains: ["call_analysis"], runType: "transcript_analysis", domain: "communications" },
  "followup-draft": { tools: ["generate_followup"], runType: "followup_generation", domain: "communications" },
  "crm-update-assist": { tools: ["summarize_record"], runType: "crm_update", domain: "communications" },
  "call-eligibility": { tools: ["check_availability"], runType: "call_eligibility", domain: "communications" },
  "ai-call-guide": { tools: ["analyze_sentiment"], runType: "call_guidance", domain: "communications" },
  "brand-strategy": { tools: ["get_brand_kit", "generate_design_brief"], runType: "brand_strategy", domain: "production" },
  "tone-voice": { tools: ["get_brand_kit", "ai_review_asset"], runType: "tone_validation", domain: "production" },
  "design-brief": { tools: ["generate_design_brief", "route_creative"], chains: ["asset_production"], runType: "design_brief", domain: "production" },
  "visual-concept": { tools: ["generate_asset", "route_creative"], runType: "visual_concept", domain: "production" },
  "asset-layout": { tools: ["generate_asset"], runType: "asset_layout", domain: "production" },
  "deck-structure": { tools: ["generate_asset"], runType: "deck_generation", domain: "production" },
  "proposal-draft": { tools: ["generate_asset"], runType: "proposal_draft", domain: "production" },
  "script-draft": { tools: ["generate_asset"], runType: "script_draft", domain: "production" },
  "storyboard": { tools: ["generate_asset", "generate_design_brief"], runType: "storyboard", domain: "production" },
  "revision-suggest": { tools: ["suggest_asset_revisions", "ai_review_asset"], chains: ["asset_revision"], runType: "revision_review", domain: "production" },
  "preview-prep": { tools: ["ai_review_asset"], runType: "preview_preparation", domain: "production" },
  "approval-route-prod": { tools: ["submit_asset_review", "review_asset_decision"], runType: "approval_routing", domain: "production" },
  "finalization-ready": { tools: ["finalize_asset", "ai_review_asset"], runType: "finalization_check", domain: "production" },
  "asset-archive": { tools: ["create_asset_version", "finalize_asset"], runType: "asset_archive", domain: "production" },
};

const agentRateLimits = new Map<string, { lastRun: number; minInterval: number }>();

function acquireAgentLock(agentId: string): boolean {
  const limit = agentRateLimits.get(agentId);
  const now = Date.now();
  if (limit && now - limit.lastRun < limit.minInterval) return false;
  agentRateLimits.set(agentId, { lastRun: now, minInterval: 60000 });
  return true;
}

export async function executeAgent(agentId: string, input?: Record<string, any>): Promise<{
  success: boolean;
  output?: any;
  confidence?: number;
  handoffTier?: string;
  durationMs: number;
  error?: string;
}> {
  const agent = getAgent(agentId);
  if (!agent) return { success: false, durationMs: 0, error: "Agent not found" };

  if (!acquireAgentLock(agentId)) {
    return { success: false, durationMs: 0, error: "Rate limited" };
  }

  const mode = await getGlobalMode();
  if (mode === "human_controlled") {
    return { success: false, durationMs: 0, error: "Human controlled mode — agent execution paused" };
  }

  const mapping = AGENT_TOOL_MAP[agentId];
  const enhanced = getEnhancedAgent(agentId);

  if (!mapping && !enhanced) {
    return executeSimulatedAgent(agent, "generic", agent.domain);
  }

  const runType = mapping?.runType ?? "orchestrated";
  const domain = mapping?.domain ?? agent.domain;

  updateAgentStatus(agentId, "running");
  const startTime = Date.now();

  try {
    const orchResult = await orchestrate({
      agentId,
      taskType: runType,
      input: input ?? {},
      preferences: {},
    });

    const durationMs = Date.now() - startTime;
    const handoff = classifyConfidence(orchResult.confidence);

    broadcast("agent_execution", {
      agentId,
      agentName: agent.name,
      runType,
      confidence: orchResult.confidence,
      handoffTier: handoff.tier,
      durationMs,
      provider: orchResult.provider,
      fallbacksUsed: orchResult.fallbacksUsed,
      orchestrated: true,
    });

    return {
      success: true,
      output: orchResult.output,
      confidence: orchResult.confidence,
      handoffTier: handoff.tier,
      durationMs,
      provider: orchResult.provider,
      fallbacksUsed: orchResult.fallbacksUsed,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    updateAgentStatus(agentId, "idle");
    recordAgentRun(agentId, durationMs, false);

    await db.insert(activitiesTable).values({
      entityType: "agent",
      action: `${agent.name} — ${runType} (failed)`,
      description: `Orchestrated execution failed: ${err.message}`,
      performedBy: agent.name,
      metadata: JSON.stringify({ agentId, domain, error: err.message, orchestrated: true }),
    });

    return { success: false, durationMs, error: err.message };
  }
}

const MODEL_LABEL = "gpt-4o-mini";

async function executeSimulatedAgent(
  agent: AgentDefinition,
  runType: string,
  domain: string
): Promise<{ success: boolean; output?: any; confidence?: number; handoffTier?: string; durationMs: number }> {
  updateAgentStatus(agent.id, "running");
  const startTime = Date.now();
  const durationMs = 200 + Math.floor(Math.random() * 2000);
  const success = Math.random() > 0.05;
  const confidence = success ? 70 + Math.floor(Math.random() * 30) : 20 + Math.floor(Math.random() * 30);

  try {
    await chargeWallet({
      tool: `agent-${agent.id}`,
      domain,
      action: runType,
      description: `${agent.name}: ${runType} (simulated)`,
    });

    await db.insert(aiRunsTable).values({
      runType,
      domain,
      model: MODEL_LABEL,
      prompt: `${agent.name}: ${runType}`,
      output: success ? `${agent.name} completed ${runType}` : `${agent.name} encountered issue in ${runType}`,
      status: success ? "completed" : "failed",
      confidenceScore: confidence,
      tokensUsed: 50 + Math.floor(Math.random() * 200),
      durationMs,
      reviewRequired: "no",
    });

    await db.insert(activitiesTable).values({
      entityType: "agent",
      action: `${agent.name} — ${runType}`,
      description: `${runType} (simulated)`,
      performedBy: agent.name,
      metadata: JSON.stringify({ agentId: agent.id, domain, success, confidence, simulated: true }),
    });

    recordAgentRun(agent.id, durationMs, success);
    const handoff = classifyConfidence(confidence);
    return { success, output: `Simulated: ${runType}`, confidence, handoffTier: handoff.tier, durationMs };
  } catch {
    updateAgentStatus(agent.id, "idle");
    return { success: false, durationMs: Date.now() - startTime };
  }
}

let isRunning = false;
let stopRequested = false;

async function runScheduledLoop(intervalMs: number) {
  while (!stopRequested) {
    try {
      const mode = await getGlobalMode();
      if (mode !== "human_controlled") {
        const agents = getAllAgents();
        const eligible = agents.filter(a => a.status !== "error" && a.status !== "paused");
        if (eligible.length > 0) {
          const batchSize = 1 + Math.floor(Math.random() * 2);
          for (let i = 0; i < batchSize; i++) {
            const agent = eligible[Math.floor(Math.random() * eligible.length)];
            await executeAgent(agent.id).catch(() => {});
          }
        }
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  isRunning = false;
}

export function startAgentExecution(intervalMs = 45000): void {
  if (isRunning) return;
  isRunning = true;
  stopRequested = false;
  runScheduledLoop(intervalMs);
}

export function stopAgentExecution(): void {
  stopRequested = true;
}
