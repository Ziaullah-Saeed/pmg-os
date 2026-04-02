import { db, aiRunsTable, activitiesTable } from "@workspace/db";
import { chargeWallet } from "./wallet-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { createNotification } from "./notification-service";
import { classifyConfidence } from "./confidence-handoff-service";
import { callAI } from "./ai-service";
import { getGlobalMode } from "./ai-mode-service";
import { CREATIVE_PROVIDERS, type CreativeProvider } from "./creative-providers";
import { getTool, executeChain, getAllTools, getAllChainTemplates } from "./tool-chain-service";
import { getAgent, updateAgentStatus, recordAgentRun, type AgentDefinition } from "./agent-registry";
import { getEnhancedAgent, type EnhancedAgentDefinition } from "./agent-registry";

export type TaskPriority = "critical" | "high" | "normal" | "low";
export type TaskStatus = "queued" | "selecting_provider" | "executing" | "processing_result" | "archiving" | "completed" | "failed" | "fallback";

export interface OrchestrationTask {
  id: string;
  agentId: string;
  domain: string;
  taskType: string;
  input: Record<string, any>;
  priority: TaskPriority;
  status: TaskStatus;
  selectedProvider?: string;
  fallbackProviders: string[];
  fallbackAttempt: number;
  result?: OrchestrationResult;
  walletCharge?: number;
  startedAt: number;
  completedAt?: number;
  error?: string;
  pipelineSteps: PipelineStep[];
}

export interface PipelineStep {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  provider?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  output?: any;
  error?: string;
}

export interface OrchestrationResult {
  output: any;
  confidence: number;
  provider: string;
  fallbacksUsed: number;
  totalDurationMs: number;
  totalCost: number;
  archived: boolean;
  archiveId?: string;
}

export interface ProviderScore {
  providerId: string;
  providerName: string;
  score: number;
  reasons: string[];
  estimatedCost: number;
  estimatedDurationMs: number;
}

const activeTasks = new Map<string, OrchestrationTask>();
const completedTasks: OrchestrationTask[] = [];
const MAX_COMPLETED = 500;
let taskCounter = 0;

function generateTaskId(): string {
  return `orch-${Date.now()}-${++taskCounter}`;
}

export function selectProvider(
  taskType: string,
  domain: string,
  preferences?: { quality?: string; speed?: string; budget?: string; preferredProvider?: string }
): ProviderScore[] {
  const toolRegistry = getAllTools();
  const chainRegistry = getAllChainTemplates();

  const scores: ProviderScore[] = [];

  for (const tool of toolRegistry) {
    if (tool.domain === domain || domain === "any") {
      let score = 50;
      const reasons: string[] = [];

      if (tool.name.includes(taskType) || taskType.includes(tool.name)) {
        score += 30;
        reasons.push("Direct task match");
      }

      if (tool.domain === domain) {
        score += 10;
        reasons.push("Domain match");
      }

      const cost = tool.costCredits * 0.01;
      if (preferences?.budget === "low" && cost < 0.05) {
        score += 10;
        reasons.push("Budget friendly");
      }

      scores.push({
        providerId: `tool:${tool.name}`,
        providerName: tool.name,
        score: Math.min(100, score),
        reasons,
        estimatedCost: cost,
        estimatedDurationMs: 2000 + Math.floor(Math.random() * 3000),
      });
    }
  }

  for (const provider of CREATIVE_PROVIDERS) {
    if (provider.status !== "active") continue;
    const assetMatch = provider.assetTypes.some(t => taskType.includes(t) || t.includes(taskType));
    const capMatch = provider.capabilities.some(c => taskType.includes(c) || c.includes(taskType));

    if (assetMatch || capMatch || domain === "production") {
      let score = 40;
      const reasons: string[] = [];

      if (assetMatch) { score += 25; reasons.push("Asset type match"); }
      if (capMatch) { score += 15; reasons.push("Capability match"); }

      if (preferences?.quality === "studio" && provider.qualityTier === "studio") { score += 15; reasons.push("Studio quality"); }
      if (preferences?.quality === "professional" && (provider.qualityTier === "studio" || provider.qualityTier === "professional")) { score += 10; reasons.push("Professional quality"); }
      if (preferences?.speed === "realtime" && provider.speedTier === "realtime") { score += 15; reasons.push("Realtime speed"); }
      if (preferences?.speed === "fast" && (provider.speedTier === "realtime" || provider.speedTier === "fast")) { score += 10; reasons.push("Fast speed"); }

      if (preferences?.preferredProvider === provider.id) { score += 20; reasons.push("User preferred"); }

      scores.push({
        providerId: `creative:${provider.id}`,
        providerName: provider.name,
        score: Math.min(100, score),
        reasons,
        estimatedCost: provider.costPerCredit * 0.01,
        estimatedDurationMs: provider.speedTier === "realtime" ? 1000 : provider.speedTier === "fast" ? 3000 : 8000,
      });
    }
  }

  for (const chain of chainRegistry) {
    if (chain.domain === domain || domain === "any") {
      let score = 45;
      const reasons: string[] = [];

      if (chain.name.includes(taskType) || taskType.includes(chain.name)) {
        score += 25;
        reasons.push("Chain match");
      }

      reasons.push(`${chain.steps.length}-step pipeline`);

      scores.push({
        providerId: `chain:${chain.name}`,
        providerName: chain.name,
        score: Math.min(100, score),
        reasons,
        estimatedCost: chain.steps.length * 0.02,
        estimatedDurationMs: chain.steps.length * 3000,
      });
    }
  }

  return scores.sort((a, b) => b.score - a.score);
}

async function executeProvider(
  providerId: string,
  input: Record<string, any>,
  domain: string
): Promise<{ output: any; confidence: number; durationMs: number }> {
  const start = Date.now();

  if (providerId.startsWith("tool:")) {
    const toolName = providerId.replace("tool:", "");
    const tool = getTool(toolName);
    if (!tool) throw new Error(`Tool not found: ${toolName}`);
    const output = await tool.execute(input);
    return { output, confidence: output?.confidence ?? 75, durationMs: Date.now() - start };
  }

  if (providerId.startsWith("chain:")) {
    const chainName = providerId.replace("chain:", "");
    const mode = await getGlobalMode();
    const chainResult = await executeChain(chainName, input, {
      workflowKey: domain,
      triModeAware: mode === "hybrid",
    });
    return {
      output: chainResult.finalOutput,
      confidence: chainResult.success ? 80 : 40,
      durationMs: Date.now() - start,
    };
  }

  if (providerId.startsWith("creative:")) {
    const creativeId = providerId.replace("creative:", "");
    const provider = CREATIVE_PROVIDERS.find(p => p.id === creativeId);
    if (!provider) throw new Error(`Creative provider not found: ${creativeId}`);

    const aiResult = await callAI({
      systemPrompt: `You are the ${provider.name} creative AI provider. Generate a detailed specification for the requested asset. Provider capabilities: ${provider.capabilities.join(", ")}. Quality tier: ${provider.qualityTier}. Output formats: ${provider.outputFormats.join(", ")}.`,
      userPrompt: `Generate asset specification: ${JSON.stringify(input)}`,
      workflowKey: "creative_generation",
      tool: `creative-${creativeId}`,
      domain: "production",
      action: "generate",
    });

    return {
      output: {
        provider: provider.name,
        providerId: creativeId,
        specification: aiResult.result,
        qualityTier: provider.qualityTier,
        format: provider.outputFormats[0],
        generated: true,
      },
      confidence: aiResult.confidence,
      durationMs: Date.now() - start,
    };
  }

  throw new Error(`Unknown provider type: ${providerId}`);
}

function processResult(raw: any, agentDef?: EnhancedAgentDefinition): { processed: any; valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!raw) return { processed: null, valid: false, warnings: ["Empty result"] };

  let processed = raw;
  if (typeof raw === "string") {
    try { processed = JSON.parse(raw); } catch { processed = { text: raw }; }
  }

  if (agentDef?.outputStructure) {
    const required = agentDef.outputStructure.requiredFields || [];
    for (const field of required) {
      if (!(field in processed)) {
        warnings.push(`Missing required field: ${field}`);
      }
    }
  }

  return { processed, valid: warnings.length === 0, warnings };
}

function archiveResult(task: OrchestrationTask): string {
  const archiveId = `arch-${task.id}`;
  return archiveId;
}

function recordCompletion(task: OrchestrationTask): void {
  completedTasks.push({ ...task });
  if (completedTasks.length > MAX_COMPLETED) completedTasks.shift();
}

export async function orchestrate(params: {
  agentId: string;
  taskType: string;
  input: Record<string, any>;
  priority?: TaskPriority;
  preferences?: { quality?: string; speed?: string; budget?: string; preferredProvider?: string };
}): Promise<OrchestrationResult> {
  const enhancedAgent = getEnhancedAgent(params.agentId);
  const agent = getAgent(params.agentId);
  if (!agent) throw new Error(`Agent not found: ${params.agentId}`);

  const taskId = generateTaskId();
  const task: OrchestrationTask = {
    id: taskId,
    agentId: params.agentId,
    domain: agent.domain,
    taskType: params.taskType,
    input: params.input,
    priority: params.priority ?? "normal",
    status: "queued",
    fallbackProviders: [],
    fallbackAttempt: 0,
    startedAt: Date.now(),
    pipelineSteps: [
      { name: "provider_selection", status: "pending" },
      { name: "wallet_charge", status: "pending" },
      { name: "execution", status: "pending" },
      { name: "result_processing", status: "pending" },
      { name: "confidence_check", status: "pending" },
      { name: "archive", status: "pending" },
      { name: "audit_log", status: "pending" },
      { name: "reporting", status: "pending" },
    ],
  };

  activeTasks.set(taskId, task);
  broadcast("orchestration_started", { taskId, agentId: params.agentId, taskType: params.taskType });

  try {
    updateStep(task, "provider_selection", "running");
    task.status = "selecting_provider";
    const providers = selectProvider(params.taskType, agent.domain, params.preferences);

    if (providers.length === 0) {
      const aiProviderScore: ProviderScore = {
        providerId: "tool:ai_general",
        providerName: "AI General (GPT-4o-mini)",
        score: 50,
        reasons: ["Fallback general AI"],
        estimatedCost: 0.01,
        estimatedDurationMs: 3000,
      };
      providers.push(aiProviderScore);
    }

    task.selectedProvider = providers[0].providerId;
    task.fallbackProviders = providers.slice(1, 4).map(p => p.providerId);
    updateStep(task, "provider_selection", "completed", { selectedProvider: providers[0].providerName, alternatives: providers.length - 1 });

    updateStep(task, "wallet_charge", "running");
    const walletBehavior = enhancedAgent?.walletBehavior;
    const maxCharge = walletBehavior?.maxChargePerRun ?? 1.00;
    const estimatedCost = providers[0].estimatedCost;

    if (estimatedCost > maxCharge) {
      updateStep(task, "wallet_charge", "failed", { error: `Cost $${estimatedCost} exceeds agent max $${maxCharge}` });
      throw new Error(`Estimated cost $${estimatedCost} exceeds agent limit $${maxCharge}`);
    }

    const chargeResult = await chargeWallet({
      tool: `agent-${params.agentId}`,
      domain: agent.domain,
      action: params.taskType,
      description: `${agent.name}: ${params.taskType} via ${providers[0].providerName}`,
      customAmount: estimatedCost > 0.01 ? estimatedCost : undefined,
    });

    task.walletCharge = (chargeResult as any)?.charged ?? 0;
    updateStep(task, "wallet_charge", "completed", { charged: task.walletCharge });

    updateStep(task, "execution", "running");
    task.status = "executing";
    updateAgentStatus(params.agentId, "running");

    let execResult: { output: any; confidence: number; durationMs: number };
    let usedProvider = task.selectedProvider;
    let fallbacksUsed = 0;

    try {
      execResult = await executeProvider(task.selectedProvider, params.input, agent.domain);
    } catch (primaryErr: any) {
      const fallbackBehavior = enhancedAgent?.fallbackBehavior;
      const maxFallbacks = fallbackBehavior?.maxRetries ?? 2;

      let fallbackSuccess = false;
      for (let i = 0; i < Math.min(maxFallbacks, task.fallbackProviders.length); i++) {
        task.fallbackAttempt = i + 1;
        task.status = "fallback";
        const fbProvider = task.fallbackProviders[i];

        try {
          execResult = await executeProvider(fbProvider, params.input, agent.domain);
          usedProvider = fbProvider;
          fallbacksUsed = i + 1;
          fallbackSuccess = true;
          break;
        } catch {
          continue;
        }
      }

      if (!fallbackSuccess) {
        if (fallbackBehavior?.strategy === "degrade_gracefully") {
          execResult = {
            output: { degraded: true, message: `All providers failed for ${params.taskType}`, originalError: primaryErr.message },
            confidence: 20,
            durationMs: Date.now() - task.startedAt,
          };
          fallbacksUsed = task.fallbackProviders.length;
        } else {
          throw primaryErr;
        }
      }
    }

    updateStep(task, "execution", "completed", {
      provider: usedProvider,
      durationMs: execResult!.durationMs,
      fallbacksUsed,
    });

    updateStep(task, "result_processing", "running");
    task.status = "processing_result";
    const { processed, valid, warnings } = processResult(execResult!.output, enhancedAgent);
    updateStep(task, "result_processing", "completed", { valid, warnings });

    updateStep(task, "confidence_check", "running");
    const confidence = execResult!.confidence;
    const handoff = classifyConfidence(confidence);
    const confModel = enhancedAgent?.confidenceModel;
    const minConfidence = confModel?.minConfidence ?? 50;

    if (confidence < minConfidence && handoff.requiresHuman) {
      await createNotification({
        type: "agent_low_confidence",
        severity: "warning",
        title: `${agent.name}: Low Confidence — Human Review`,
        message: `${params.taskType} returned ${confidence}% confidence (min: ${minConfidence}%). Provider: ${usedProvider}`,
        domain: agent.domain,
        actor: agent.name,
      });
    }
    updateStep(task, "confidence_check", "completed", { confidence, tier: handoff.tier, requiresHuman: handoff.requiresHuman });

    updateStep(task, "archive", "running");
    task.status = "archiving";
    const archiveBehavior = enhancedAgent?.archiveBehavior;
    let archived = false;
    let archiveId: string | undefined;

    if (archiveBehavior?.autoArchive !== false) {
      archiveId = archiveResult(task);
      archived = true;
    }
    updateStep(task, "archive", "completed", { archived, archiveId });

    updateStep(task, "audit_log", "running");
    await logAudit({
      eventType: "orchestration_complete",
      domain: agent.domain,
      action: params.taskType,
      description: `Agent ${agent.name} completed ${params.taskType} via ${usedProvider} (confidence: ${confidence}%, fallbacks: ${fallbacksUsed})`,
      actor: agent.name,
      actorType: "agent",
      severity: confidence < minConfidence ? "warning" : "info",
      metadata: {
        taskId,
        agentId: params.agentId,
        provider: usedProvider,
        confidence,
        fallbacksUsed,
        walletCharged: task.walletCharge,
        durationMs: Date.now() - task.startedAt,
      },
    });

    await db.insert(aiRunsTable).values({
      runType: params.taskType,
      domain: agent.domain,
      model: usedProvider,
      prompt: `Orchestrated: ${agent.name} → ${params.taskType}`,
      output: JSON.stringify(processed).slice(0, 2000),
      status: "completed",
      confidenceScore: confidence,
      tokensUsed: JSON.stringify(processed).length,
      costEstimate: task.walletCharge ?? 0,
      durationMs: Date.now() - task.startedAt,
      reviewRequired: handoff.requiresHuman ? "yes" : "no",
    });

    await db.insert(activitiesTable).values({
      entityType: "agent",
      action: `${agent.name} — ${params.taskType} (orchestrated)`,
      description: `Orchestrated execution via ${usedProvider}: ${params.taskType} (confidence: ${confidence}%, fallbacks: ${fallbacksUsed})`,
      performedBy: agent.name,
      metadata: JSON.stringify({
        agentId: params.agentId,
        taskId,
        provider: usedProvider,
        confidence,
        fallbacksUsed,
        orchestrated: true,
      }),
    });
    updateStep(task, "audit_log", "completed");

    updateStep(task, "reporting", "running");
    const totalDurationMs = Date.now() - task.startedAt;
    recordAgentRun(params.agentId, totalDurationMs, true);
    updateAgentStatus(params.agentId, "idle");

    const result: OrchestrationResult = {
      output: processed,
      confidence,
      provider: usedProvider,
      fallbacksUsed,
      totalDurationMs,
      totalCost: task.walletCharge ?? 0,
      archived,
      archiveId,
    };

    task.result = result;
    task.status = "completed";
    task.completedAt = Date.now();
    updateStep(task, "reporting", "completed");

    recordCompletion(task);

    broadcast("orchestration_completed", {
      taskId,
      agentId: params.agentId,
      agentName: agent.name,
      taskType: params.taskType,
      confidence,
      provider: usedProvider,
      fallbacksUsed,
      durationMs: totalDurationMs,
    });

    activeTasks.delete(taskId);
    return result;

  } catch (err: any) {
    const durationMs = Date.now() - task.startedAt;
    task.status = "failed";
    task.error = err.message;
    task.completedAt = Date.now();

    updateAgentStatus(params.agentId, "idle");
    recordAgentRun(params.agentId, durationMs, false);

    await logAudit({
      eventType: "orchestration_failed",
      domain: agent.domain,
      action: params.taskType,
      description: `Agent ${agent.name} failed ${params.taskType}: ${err.message}`,
      actor: agent.name,
      actorType: "agent",
      severity: "error",
      metadata: { taskId, agentId: params.agentId, error: err.message, fallbackAttempt: task.fallbackAttempt },
    });

    await db.insert(activitiesTable).values({
      entityType: "agent",
      action: `${agent.name} — ${params.taskType} (failed)`,
      description: `Orchestration failed: ${err.message}`,
      performedBy: agent.name,
      metadata: JSON.stringify({ agentId: params.agentId, taskId, error: err.message, orchestrated: true }),
    });

    broadcast("orchestration_failed", { taskId, agentId: params.agentId, error: err.message });

    activeTasks.delete(taskId);
    completedTasks.push({ ...task });
    if (completedTasks.length > MAX_COMPLETED) completedTasks.shift();

    throw err;
  }
}

function updateStep(task: OrchestrationTask, stepName: string, status: PipelineStep["status"], output?: any) {
  const step = task.pipelineSteps.find(s => s.name === stepName);
  if (!step) return;
  step.status = status;
  if (status === "running") step.startedAt = Date.now();
  if (status === "completed" || status === "failed") {
    step.completedAt = Date.now();
    step.durationMs = step.startedAt ? step.completedAt - step.startedAt : 0;
  }
  if (output) step.output = output;
}

export function getActiveTasks(): OrchestrationTask[] {
  return Array.from(activeTasks.values());
}

export function getCompletedTasks(limit = 50): OrchestrationTask[] {
  return completedTasks.slice(-limit).reverse();
}

export function getTaskById(taskId: string): OrchestrationTask | undefined {
  return activeTasks.get(taskId) ?? completedTasks.find(t => t.id === taskId);
}

export function getOrchestrationStats() {
  const completed = completedTasks.filter(t => t.status === "completed");
  const failed = completedTasks.filter(t => t.status === "failed");

  const providerUsage: Record<string, number> = {};
  const domainUsage: Record<string, number> = {};
  let totalFallbacks = 0;
  let totalCost = 0;
  let totalDuration = 0;
  let totalConfidence = 0;

  for (const t of completed) {
    const provider = t.result?.provider ?? "unknown";
    providerUsage[provider] = (providerUsage[provider] ?? 0) + 1;
    domainUsage[t.domain] = (domainUsage[t.domain] ?? 0) + 1;
    totalFallbacks += t.result?.fallbacksUsed ?? 0;
    totalCost += t.result?.totalCost ?? 0;
    totalDuration += t.result?.totalDurationMs ?? 0;
    totalConfidence += t.result?.confidence ?? 0;
  }

  return {
    active: activeTasks.size,
    completed: completed.length,
    failed: failed.length,
    totalExecutions: completed.length + failed.length,
    avgConfidence: completed.length > 0 ? Math.round(totalConfidence / completed.length) : 0,
    avgDurationMs: completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
    totalCost: Math.round(totalCost * 100) / 100,
    totalFallbacks,
    providerUsage,
    domainUsage,
  };
}
