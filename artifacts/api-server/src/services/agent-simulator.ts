import { db, aiRunsTable, activitiesTable } from "@workspace/db";
import { chargeWallet } from "./wallet-service.js";
import { getAllAgents, updateAgentStatus, recordAgentRun, type AgentDefinition } from "./agent-registry.js";
import { getGlobalMode } from "./ai-mode-service.js";

const AGENT_TASKS: Record<string, { runType: string; description: string; tool: string; domain: string }[]> = {
  "exec-signal": [{ runType: "signal_detection", description: "Scanning cross-domain signals for executive alerts", tool: "ai-summarize-record", domain: "command_center" }],
  "risk-detect": [{ runType: "risk_analysis", description: "Analyzing pipeline risk factors across open deals", tool: "ai-suggest-action", domain: "command_center" }],
  "bottleneck-detect": [{ runType: "bottleneck_scan", description: "Scanning workflows for stalled processes", tool: "ai-suggest-action", domain: "command_center" }],
  "icp-model": [{ runType: "icp_modeling", description: "Refining ICP model from recent lead data", tool: "ai-score-company", domain: "intelligence" }],
  "lead-enrich": [{ runType: "enrichment", description: "Enriching new leads with firmographic data", tool: "ai-enrich-lead", domain: "outreach" }],
  "confidence-score": [{ runType: "scoring", description: "Scoring lead confidence and readiness", tool: "ai-score-company", domain: "outreach" }],
  "seo-intent": [{ runType: "seo_analysis", description: "Mapping search intent for cybersecurity keywords", tool: "perplexity-research", domain: "marketing" }],
  "content-calendar": [{ runType: "planning", description: "Planning next week's content schedule", tool: "ai-suggest-action", domain: "marketing" }],
  "tone-voice": [{ runType: "validation", description: "Checking brand voice consistency on recent drafts", tool: "ai-analyze-sentiment", domain: "production" }],
  "revision-suggest": [{ runType: "review", description: "Reviewing latest asset drafts for improvements", tool: "ai-summarize-record", domain: "production" }],
  "deal-progress": [{ runType: "monitoring", description: "Monitoring deal stage progression and velocity", tool: "ai-suggest-action", domain: "crm" }],
  "stale-opp": [{ runType: "stale_detection", description: "Flagging opportunities with no activity > 7 days", tool: "ai-suggest-action", domain: "crm" }],
  "revenue-forecast": [{ runType: "forecasting", description: "Generating revenue forecast from pipeline data", tool: "ai-generate-report", domain: "crm" }],
  "invoice-track": [{ runType: "tracking", description: "Checking invoice payment statuses", tool: "ai-suggest-action", domain: "finance_legal" }],
  "qa-review": [{ runType: "quality_review", description: "Running quality checks on recent outputs", tool: "ai-summarize-record", domain: "finance_legal" }],
  "integration-health": [{ runType: "health_check", description: "Monitoring integration connection health", tool: "ai-suggest-action", domain: "system" }],
  "wallet-spend": [{ runType: "spend_control", description: "Analyzing wallet spend patterns and thresholds", tool: "ai-suggest-action", domain: "system" }],
};

let simulationInterval: NodeJS.Timeout | null = null;
let isRunning = false;

async function runRandomAgent() {
  const mode = await getGlobalMode();
  if (mode === "human_controlled") return;

  const agents = getAllAgents();
  const eligibleAgents = agents.filter(a => a.status !== "error" && a.status !== "paused");
  if (eligibleAgents.length === 0) return;

  const agent = eligibleAgents[Math.floor(Math.random() * eligibleAgents.length)];
  const tasks = AGENT_TASKS[agent.id];
  if (!tasks || tasks.length === 0) return;

  const task = tasks[Math.floor(Math.random() * tasks.length)];
  const durationMs = 200 + Math.floor(Math.random() * 3000);
  const success = Math.random() > 0.05;
  const confidence = success ? 70 + Math.floor(Math.random() * 30) : 20 + Math.floor(Math.random() * 30);
  const tokensUsed = 50 + Math.floor(Math.random() * 500);

  updateAgentStatus(agent.id, "running");

  try {
    const chargeResult = await chargeWallet({
      tool: task.tool,
      domain: task.domain,
      action: task.runType,
      description: `${agent.name}: ${task.description}`,
    });

    const costEstimate = chargeResult.success ? (chargeResult as any).charged : 0;

    await db.insert(aiRunsTable).values({
      runType: task.runType,
      domain: task.domain,
      model: "gpt-4o-mini",
      prompt: task.description,
      output: success ? `${agent.name} completed ${task.runType} successfully. ${task.description}` : `${agent.name} encountered an issue during ${task.runType}`,
      status: success ? "completed" : "failed",
      confidenceScore: confidence,
      tokensUsed,
      costEstimate,
      durationMs,
      reviewRequired: mode === "hybrid" ? "yes" : "no",
    });

    await db.insert(activitiesTable).values({
      entityType: "agent",
      action: `${agent.name} — ${task.runType}`,
      description: task.description,
      performedBy: agent.name,
      metadata: JSON.stringify({ agentId: agent.id, domain: task.domain, success, confidence, durationMs }),
    });

    recordAgentRun(agent.id, durationMs, success);
  } catch (err) {
    updateAgentStatus(agent.id, "idle");
  }
}

export function startAgentSimulation(intervalMs = 30000) {
  if (isRunning) return;
  isRunning = true;

  runRandomAgent();

  simulationInterval = setInterval(async () => {
    const batchSize = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < batchSize; i++) {
      await runRandomAgent();
    }
  }, intervalMs);
}

export function stopAgentSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  isRunning = false;
}
