import { db, leadsTable, usersTable, activitiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { subscribe, emit } from "./event-bus";
import { pushLeadToGHL, getGHLConfig } from "./ghl-service";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";

const ROUTING_RULES = {
  HOT: { threshold: 80, destination: "both" as const, autoAssign: true },
  WARM: { threshold: 50, destination: "internal" as const, autoAssign: true },
  COLD: { threshold: 0, destination: "hold" as const, autoAssign: false },
};

const assignmentCounters = new Map<string, number>();

function getScoreTier(score: number | null | undefined): "HOT" | "WARM" | "COLD" {
  if (!score) return "COLD";
  if (score >= ROUTING_RULES.HOT.threshold) return "HOT";
  if (score >= ROUTING_RULES.WARM.threshold) return "WARM";
  return "COLD";
}

async function findLeadAssignee(domain: string = "crm"): Promise<string | null> {
  const candidates = await db.select({ name: usersTable.name }).from(usersTable)
    .where(and(
      eq(usersTable.isActive, true),
      sql`${usersTable.role} IN ('manager', 'admin', 'super_admin')`,
    ));

  if (candidates.length === 0) return null;

  const key = `lead:${domain}`;
  const idx = (assignmentCounters.get(key) ?? 0) % candidates.length;
  assignmentCounters.set(key, idx + 1);
  return candidates[idx].name;
}

async function autoRouteOnScore(_event: string, payload: any): Promise<void> {
  if (payload.entityType !== "lead" || !payload.entityId) return;

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, payload.entityId));
  if (!lead) return;

  if (lead.status === "routed" || lead.status === "active" || lead.status === "closed_won" || lead.status === "closed_lost") return;

  const tier = getScoreTier(lead.fitScore);
  const rule = ROUTING_RULES[tier];

  let ghlResult = null;
  if (rule.destination === "both" || rule.destination === "ghl") {
    const config = await getGHLConfig();
    if (config?.apiKey) {
      ghlResult = await pushLeadToGHL({
        id: lead.id,
        name: lead.assignedTo ?? `Lead #${lead.id}`,
        source: lead.source,
        score: lead.fitScore,
      });
    }
  }

  let assignee = lead.assignedTo;
  if (rule.autoAssign && !assignee) {
    assignee = await findLeadAssignee();
  }

  const newStatus = rule.destination === "hold" ? "hold" : "routed";
  await db.update(leadsTable).set({
    status: newStatus,
    assignedTo: assignee,
  }).where(eq(leadsTable.id, lead.id));

  await db.insert(activitiesTable).values({
    action: "lead_auto_routed",
    description: `Auto-routed: ${tier} lead → ${rule.destination}${assignee ? ` (assigned to ${assignee})` : ""}`,
    entityType: "lead",
    entityId: lead.id,
    performedBy: "lead_router",
    metadata: JSON.stringify({ tier, destination: rule.destination, score: lead.fitScore, assignee, ghlResult }),
  });

  await createNotification({
    type: "lead_routed",
    severity: tier === "HOT" ? "warning" : "info",
    title: `${tier} Lead Routed`,
    message: `Lead #${lead.id} (score: ${lead.fitScore}) auto-routed to ${rule.destination}${assignee ? ` — assigned to ${assignee}` : ""}`,
    domain: "crm",
    entityType: "lead",
    entityId: lead.id,
    actor: "lead_router",
  });

  await emit("lead.routed", {
    entityType: "lead",
    entityId: lead.id,
    domain: "crm",
    actor: "lead_router",
    actorType: "system",
    data: { tier, destination: rule.destination, score: lead.fitScore, assignee },
  });

  await logAudit({
    eventType: "lead_auto_routed",
    domain: "crm",
    action: `lead_routed_${tier.toLowerCase()}`,
    description: `Lead #${lead.id} auto-routed as ${tier} to ${rule.destination}`,
    entityType: "lead",
    entityId: lead.id,
    actor: "lead_router",
    actorType: "system",
    metadata: { tier, score: lead.fitScore, destination: rule.destination },
  });
}

export function initLeadRouter(): void {
  subscribe("lead.scored", autoRouteOnScore);
  console.log("[LeadRouter] Initialized — auto-routing leads on score");
}

export { getScoreTier, findLeadAssignee, ROUTING_RULES };
