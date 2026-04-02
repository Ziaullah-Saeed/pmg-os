import { createNotification } from "./notification-service";

type StateConfig = {
  transitions: Record<string, string[]>;
  initial: string;
  terminal: string[];
  qualityGates?: Record<string, string[]>;
};

const LEAD_STATES: StateConfig = {
  initial: "new",
  terminal: ["closed_won", "closed_lost", "disqualified"],
  transitions: {
    new: ["enriched", "disqualified"],
    enriched: ["scored", "disqualified"],
    scored: ["qualified", "disqualified"],
    qualified: ["routing", "disqualified"],
    routing: ["routed", "hold"],
    routed: ["active", "hold"],
    hold: ["routing", "disqualified"],
    active: ["closed_won", "closed_lost"],
    closed_won: [],
    closed_lost: [],
    disqualified: [],
  },
  qualityGates: {
    qualified: ["data_completeness", "company_required"],
  },
};

const OPPORTUNITY_STATES: StateConfig = {
  initial: "discovery",
  terminal: ["won", "lost"],
  transitions: {
    discovery: ["qualification", "lost"],
    qualification: ["proposal", "lost"],
    proposal: ["negotiation", "lost"],
    negotiation: ["closing", "proposal", "lost"],
    closing: ["won", "lost", "negotiation"],
    won: [],
    lost: [],
  },
  qualityGates: {
    proposal: ["value_required", "close_date_required"],
    closing: ["value_required", "close_date_required"],
  },
};

const APPROVAL_STATES: StateConfig = {
  initial: "draft",
  terminal: ["approved", "rejected"],
  transitions: {
    draft: ["pending"],
    pending: ["approved", "rejected", "revision_requested"],
    revision_requested: ["pending"],
    approved: [],
    rejected: ["draft"],
  },
};

const ASSET_STATES: StateConfig = {
  initial: "draft",
  terminal: ["published", "archived"],
  transitions: {
    draft: ["review"],
    review: ["approved", "revision_needed"],
    revision_needed: ["review"],
    approved: ["published"],
    published: ["archived"],
    archived: [],
  },
};

const CONTRACT_STATES: StateConfig = {
  initial: "draft",
  terminal: ["active", "terminated"],
  transitions: {
    draft: ["review"],
    review: ["negotiation", "approved", "rejected"],
    negotiation: ["review"],
    approved: ["active"],
    rejected: ["draft"],
    active: ["renewal", "terminated"],
    renewal: ["review", "terminated"],
    terminated: [],
  },
  qualityGates: {
    review: ["content_required", "dates_required"],
    approved: ["content_required", "dates_required"],
  },
};

const TASK_STATES: StateConfig = {
  initial: "pending",
  terminal: ["completed", "cancelled"],
  transitions: {
    pending: ["in_progress", "cancelled"],
    in_progress: ["completed", "blocked", "cancelled"],
    blocked: ["in_progress", "cancelled"],
    completed: [],
    cancelled: [],
  },
};

const STATE_MACHINES: Record<string, StateConfig> = {
  lead: LEAD_STATES,
  opportunity: OPPORTUNITY_STATES,
  approval: APPROVAL_STATES,
  asset: ASSET_STATES,
  contract: CONTRACT_STATES,
  task: TASK_STATES,
};

export function getStateMachine(entityType: string): StateConfig | null {
  return STATE_MACHINES[entityType] ?? null;
}

export function getInitialState(entityType: string): string {
  const machine = STATE_MACHINES[entityType];
  return machine?.initial ?? "new";
}

export function getValidTransitions(entityType: string, currentState: string): string[] {
  const machine = STATE_MACHINES[entityType];
  if (!machine) return [];
  return machine.transitions[currentState] ?? [];
}

export async function validateTransition(params: {
  entityType: string;
  entityId: number;
  currentState: string;
  targetState: string;
  actor?: string;
  entity?: any;
}): Promise<{ valid: boolean; error?: string; qualityIssues?: string[] }> {
  const machine = STATE_MACHINES[params.entityType];
  if (!machine) return { valid: true };

  const allowed = machine.transitions[params.currentState] ?? [];
  if (!allowed.includes(params.targetState)) {
    await createNotification({
      type: "invalid_transition",
      severity: "error",
      title: "Invalid State Transition",
      message: `Cannot move ${params.entityType} #${params.entityId} from "${params.currentState}" to "${params.targetState}". Allowed: ${allowed.join(", ") || "none"}`,
      domain: "system",
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor ?? "system",
    });

    return {
      valid: false,
      error: `Invalid transition: ${params.currentState} → ${params.targetState}. Allowed: ${allowed.join(", ") || "none (terminal state)"}`,
    };
  }

  if (machine.qualityGates && machine.qualityGates[params.targetState] && params.entity) {
    const { runQualityCheckpoints } = await import("./finance-legal-service");
    const result = runQualityCheckpoints(params.entity, params.entityType);
    const requiredChecks = machine.qualityGates[params.targetState];
    const failedGates = result.results.filter(r =>
      !r.passed && requiredChecks.includes(r.checkType)
    );

    if (failedGates.length > 0) {
      const issues = failedGates.map(f => f.issue ?? f.description);
      await createNotification({
        type: "quality_gate_blocked",
        severity: "warning",
        title: `Quality Gate Blocked: ${params.entityType} #${params.entityId}`,
        message: `Cannot transition to "${params.targetState}" — ${failedGates.length} quality check(s) failed: ${issues.join("; ")}`,
        domain: "system",
        entityType: params.entityType,
        entityId: params.entityId,
        actor: params.actor ?? "quality_engine",
      });

      const { emit } = await import("./event-bus");
      await emit("quality.gate_failed", {
        entityType: params.entityType,
        entityId: params.entityId,
        domain: params.entityType === "lead" || params.entityType === "opportunity" ? "crm" : "finance_legal",
        actor: params.actor ?? "quality_engine",
        data: { targetState: params.targetState, criticalFailures: failedGates.length, issues, message: issues.join("; ") },
      });

      return {
        valid: false,
        error: `Quality gate failed for "${params.targetState}": ${issues.join("; ")}`,
        qualityIssues: issues,
      };
    }
  }

  return { valid: true };
}

export function isTerminalState(entityType: string, state: string): boolean {
  const machine = STATE_MACHINES[entityType];
  if (!machine) return false;
  return machine.terminal.includes(state);
}

export function getAllStates(entityType: string): string[] {
  const machine = STATE_MACHINES[entityType];
  if (!machine) return [];
  return Object.keys(machine.transitions);
}
