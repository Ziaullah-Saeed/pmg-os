import { createNotification } from "./notification-service";

type StateConfig = {
  transitions: Record<string, string[]>;
  initial: string;
  terminal: string[];
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
}): Promise<{ valid: boolean; error?: string }> {
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
