import { db, aiRunsTable, activitiesTable } from "@workspace/db";
import { chargeWallet } from "./wallet-service";
import { shouldAiAct } from "./ai-mode-service";
import { executeOrQueue } from "./mode-action-service";
import { createNotification } from "./notification-service";

export interface ToolDefinition {
  name: string;
  description: string;
  domain: string;
  inputKeys: string[];
  outputKeys: string[];
  costCredits: number;
  execute: (input: Record<string, any>) => Promise<Record<string, any>>;
}

export interface ChainStep {
  toolName: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  optional?: boolean;
  condition?: (context: Record<string, any>) => boolean;
}

export interface ChainTemplate {
  name: string;
  description: string;
  domain: string;
  steps: ChainStep[];
}

export type ChainResult = {
  success: boolean;
  steps: Array<{
    toolName: string;
    status: "completed" | "failed" | "skipped" | "queued";
    durationMs: number;
    output?: Record<string, any>;
    error?: string;
  }>;
  finalOutput: Record<string, any>;
  totalDurationMs: number;
  totalCost: number;
};

const tools = new Map<string, ToolDefinition>();
const chainTemplates = new Map<string, ChainTemplate>();

export function registerTool(tool: ToolDefinition): void {
  tools.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(tools.values());
}

export function registerChainTemplate(template: ChainTemplate): void {
  chainTemplates.set(template.name, template);
}

export function getChainTemplate(name: string): ChainTemplate | undefined {
  return chainTemplates.get(name);
}

export function getAllChainTemplates(): ChainTemplate[] {
  return Array.from(chainTemplates.values());
}

function mapInputs(step: ChainStep, context: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = { ...context };
  if (step.inputMapping) {
    for (const [targetKey, sourceKey] of Object.entries(step.inputMapping)) {
      mapped[targetKey] = context[sourceKey];
    }
  }
  return mapped;
}

function mapOutputs(step: ChainStep, output: Record<string, any>): Record<string, any> {
  if (!step.outputMapping) return output;
  const mapped: Record<string, any> = {};
  for (const [newKey, srcKey] of Object.entries(step.outputMapping)) {
    mapped[newKey] = output[srcKey];
  }
  return mapped;
}

export async function executeChain(
  templateName: string,
  initialInput: Record<string, any>,
  options?: {
    workflowKey?: string;
    entityType?: string;
    entityId?: number;
    triModeAware?: boolean;
  }
): Promise<ChainResult> {
  const template = chainTemplates.get(templateName);
  if (!template) {
    return {
      success: false,
      steps: [],
      finalOutput: { error: `Chain template "${templateName}" not found` },
      totalDurationMs: 0,
      totalCost: 0,
    };
  }

  const chainStart = Date.now();
  const context: Record<string, any> = { ...initialInput };
  const stepResults: ChainResult["steps"] = [];
  let totalCost = 0;

  for (const step of template.steps) {
    const tool = tools.get(step.toolName);
    if (!tool) {
      if (step.optional) {
        stepResults.push({ toolName: step.toolName, status: "skipped", durationMs: 0, error: "Tool not found" });
        continue;
      }
      stepResults.push({ toolName: step.toolName, status: "failed", durationMs: 0, error: "Tool not found" });
      return {
        success: false,
        steps: stepResults,
        finalOutput: context,
        totalDurationMs: Date.now() - chainStart,
        totalCost,
      };
    }

    if (step.condition && !step.condition(context)) {
      stepResults.push({ toolName: step.toolName, status: "skipped", durationMs: 0 });
      continue;
    }

    if (options?.triModeAware) {
      const modeCheck = await shouldAiAct(
        options.workflowKey ?? template.domain,
        undefined,
        options.entityType,
        options.entityId
      );
      if (!modeCheck.canAct) {
        const queueResult = await executeOrQueue({
          actionType: `chain_${templateName}_${step.toolName}`,
          workflowKey: options.workflowKey ?? template.domain,
          entityType: options.entityType,
          entityId: options.entityId,
          title: `Chain Step: ${tool.name}`,
          description: `Step in "${template.name}" chain — ${tool.description}`,
          aiParts: `Automated tool execution: ${tool.name}`,
          humanParts: `Review and approve ${tool.name} execution`,
          confidence: 75,
          metadata: { chainName: templateName, stepTool: step.toolName, context },
          executeAction: async () => {
            const input = mapInputs(step, context);
            return tool.execute(input);
          },
        });

        stepResults.push({
          toolName: step.toolName,
          status: queueResult.queued ? "queued" : (queueResult.executed ? "completed" : "failed"),
          durationMs: 0,
          output: queueResult.result,
        });

        if (queueResult.queued) {
          return {
            success: false,
            steps: stepResults,
            finalOutput: { ...context, _queuedAt: step.toolName },
            totalDurationMs: Date.now() - chainStart,
            totalCost,
          };
        }
        continue;
      }
    }

    const stepStart = Date.now();
    try {
      const input = mapInputs(step, context);
      const output = await tool.execute(input);
      const mapped = mapOutputs(step, output);
      Object.assign(context, mapped);
      totalCost += tool.costCredits;

      stepResults.push({
        toolName: step.toolName,
        status: "completed",
        durationMs: Date.now() - stepStart,
        output: mapped,
      });
    } catch (err: any) {
      stepResults.push({
        toolName: step.toolName,
        status: "failed",
        durationMs: Date.now() - stepStart,
        error: err.message,
      });

      if (!step.optional) {
        return {
          success: false,
          steps: stepResults,
          finalOutput: context,
          totalDurationMs: Date.now() - chainStart,
          totalCost,
        };
      }
    }
  }

  await db.insert(activitiesTable).values({
    entityType: "tool_chain",
    action: `chain_${templateName}`,
    description: `Tool chain "${template.name}" completed: ${stepResults.filter(s => s.status === "completed").length}/${template.steps.length} steps`,
    performedBy: "tool_chain_engine",
    metadata: JSON.stringify({
      templateName,
      steps: stepResults.map(s => ({ tool: s.toolName, status: s.status, ms: s.durationMs })),
      totalCost,
    }),
  });

  return {
    success: true,
    steps: stepResults,
    finalOutput: context,
    totalDurationMs: Date.now() - chainStart,
    totalCost,
  };
}

export function initToolChainTemplates(): void {
  registerChainTemplate({
    name: "lead_qualification",
    description: "Full lead qualification pipeline: enrich → score → route",
    domain: "crm",
    steps: [
      { toolName: "enrich_lead" },
      { toolName: "score_lead", inputMapping: { enrichmentData: "enrichment" } },
      { toolName: "route_lead", inputMapping: { score: "score", tier: "tier" } },
    ],
  });

  registerChainTemplate({
    name: "outreach_pipeline",
    description: "Full outreach pipeline: research → personalize → draft → generate variants",
    domain: "outreach",
    steps: [
      { toolName: "research_prospect" },
      { toolName: "personalize_context", inputMapping: { research: "research" } },
      { toolName: "draft_outreach", inputMapping: { personalization: "personalization" } },
      { toolName: "generate_variants", inputMapping: { draft: "draft" }, optional: true },
    ],
  });

  registerChainTemplate({
    name: "icp_analysis",
    description: "ICP analysis pipeline: analyze deals → build ICP → segment market",
    domain: "intelligence",
    steps: [
      { toolName: "analyze_won_deals" },
      { toolName: "generate_icp", inputMapping: { dealAnalysis: "dealAnalysis" } },
      { toolName: "segment_market", inputMapping: { icp: "icp" } },
    ],
  });

  registerChainTemplate({
    name: "competitor_intel",
    description: "Competitive intelligence: research competitors → map positioning → find gaps",
    domain: "intelligence",
    steps: [
      { toolName: "research_competitors" },
      { toolName: "map_positioning", inputMapping: { competitors: "competitors" } },
      { toolName: "find_gaps", inputMapping: { positioning: "positioning" }, optional: true },
    ],
  });

  registerChainTemplate({
    name: "deal_assessment",
    description: "Deal health check: summarize → assess risk → suggest next action",
    domain: "crm",
    steps: [
      { toolName: "summarize_record" },
      { toolName: "assess_risk", inputMapping: { summary: "summary" } },
      { toolName: "suggest_action", inputMapping: { riskAssessment: "riskAssessment" } },
    ],
  });
}
