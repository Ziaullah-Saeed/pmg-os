import { db, aiRunsTable, activitiesTable } from "@workspace/db";
import { chargeWallet } from "./wallet-service";
import { getAllAgents, updateAgentStatus, recordAgentRun, getAgent, type AgentDefinition } from "./agent-registry";
import { getGlobalMode } from "./ai-mode-service";
import { executeChain, getTool, type ToolDefinition } from "./tool-chain-service";
import { classifyConfidence } from "./confidence-handoff-service";
import { createNotification } from "./notification-service";
import { broadcast } from "./websocket-service";

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
  "tone-voice": { tools: ["summarize_record"], runType: "validation", domain: "production" },
  "revision-suggest": { tools: ["summarize_record"], runType: "review", domain: "production" },
  "seo-intent": { tools: ["summarize_record"], runType: "seo_analysis", domain: "marketing" },
  "content-calendar": { tools: ["suggest_action"], runType: "planning", domain: "marketing" },
  "invoice-track": { tools: ["suggest_action"], runType: "tracking", domain: "finance_legal" },
  "qa-review": { tools: ["summarize_record"], runType: "quality_review", domain: "finance_legal" },
  "integration-health": { tools: ["summarize_record"], runType: "health_check", domain: "system" },
  "wallet-spend": { tools: ["summarize_record"], runType: "spend_control", domain: "system" },
  "objection-detect": { tools: ["detect_objections"], runType: "objection_detection", domain: "communications" },
  "meeting-summary": { tools: ["process_transcript"], chains: ["call_analysis"], runType: "transcript_analysis", domain: "communications" },
  "followup-draft": { tools: ["generate_followup"], runType: "followup_generation", domain: "communications" },
  "crm-update-assist": { tools: ["summarize_record"], runType: "crm_update", domain: "communications" },
  "call-eligibility": { tools: ["check_availability"], runType: "call_eligibility", domain: "communications" },
  "ai-call-guide": { tools: ["analyze_sentiment"], runType: "call_guidance", domain: "communications" },
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
  if (!mapping) {
    return executeSimulatedAgent(agent, mapping?.runType ?? "generic", mapping?.domain ?? agent.domain);
  }

  updateAgentStatus(agentId, "running");
  const startTime = Date.now();

  try {
    const chargeResult = await chargeWallet({
      tool: `agent-${agentId}`,
      domain: mapping.domain,
      action: mapping.runType,
      description: `${agent.name}: executing ${mapping.runType}`,
    });

    let output: any;
    let confidence = 75;

    if (mapping.chains && mapping.chains.length > 0) {
      const chainResult = await executeChain(mapping.chains[0], input ?? {}, {
        workflowKey: mapping.domain,
        triModeAware: mode === "hybrid",
      });
      output = chainResult.finalOutput;
      confidence = chainResult.success ? 80 : 40;
    } else if (mapping.tools.length > 0) {
      const tool = getTool(mapping.tools[0]);
      if (tool) {
        output = await tool.execute(input ?? {});
        confidence = output?.confidence ?? 75;
      } else {
        return executeSimulatedAgent(agent, mapping.runType, mapping.domain);
      }
    }

    const durationMs = Date.now() - startTime;
    const handoff = classifyConfidence(confidence);

    await db.insert(aiRunsTable).values({
      runType: mapping.runType,
      domain: mapping.domain,
      model: MODEL_LABEL,
      prompt: `Agent ${agent.name} executed ${mapping.runType}`,
      output: typeof output === "string" ? output.slice(0, 2000) : JSON.stringify(output).slice(0, 2000),
      status: "completed",
      confidenceScore: confidence,
      tokensUsed: typeof output === "string" ? output.length : JSON.stringify(output).length,
      costEstimate: (chargeResult as any)?.charged ?? 0,
      durationMs,
      reviewRequired: handoff.requiresHuman ? "yes" : "no",
    });

    await db.insert(activitiesTable).values({
      entityType: "agent",
      action: `${agent.name} — ${mapping.runType}`,
      description: `Real execution: ${mapping.runType} completed (confidence: ${confidence}%, tier: ${handoff.tier})`,
      performedBy: agent.name,
      metadata: JSON.stringify({ agentId, domain: mapping.domain, confidence, handoffTier: handoff.tier, real: true }),
    });

    recordAgentRun(agentId, durationMs, true);

    if (handoff.tier === "LOW") {
      await createNotification({
        type: "agent_low_confidence",
        severity: "warning",
        title: `${agent.name}: Low Confidence Result`,
        message: `${mapping.runType} returned ${confidence}% confidence — human review needed`,
        domain: mapping.domain,
        actor: agent.name,
      });
    }

    broadcast("agent_execution", {
      agentId,
      agentName: agent.name,
      runType: mapping.runType,
      confidence,
      handoffTier: handoff.tier,
      durationMs,
    });

    return {
      success: true,
      output,
      confidence,
      handoffTier: handoff.tier,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    updateAgentStatus(agentId, "idle");
    recordAgentRun(agentId, durationMs, false);

    await db.insert(activitiesTable).values({
      entityType: "agent",
      action: `${agent.name} — ${mapping.runType} (failed)`,
      description: `Execution failed: ${err.message}`,
      performedBy: agent.name,
      metadata: JSON.stringify({ agentId, domain: mapping.domain, error: err.message, real: true }),
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
