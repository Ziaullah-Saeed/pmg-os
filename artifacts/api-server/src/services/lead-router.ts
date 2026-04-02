import { db, leadsTable, usersTable, activitiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { subscribe, emit } from "./event-bus";
import { pushLeadToGHL, getGHLConfig } from "./ghl-service";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { executeOrQueue, registerActionExecutor } from "./mode-action-service";

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

async function directRouteLead(leadId: number, destination: string, assignee: string | null): Promise<void> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) return;

  let ghlResult = null;
  if (destination === "both" || destination === "ghl") {
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

  const newStatus = destination === "hold" ? "hold" : "routed";
  await db.update(leadsTable).set({
    status: newStatus,
    assignedTo: assignee ?? lead.assignedTo,
  }).where(eq(leadsTable.id, lead.id));

  const tier = getScoreTier(lead.fitScore);

  await db.insert(activitiesTable).values({
    action: "lead_auto_routed",
    description: `Auto-routed: ${tier} lead → ${destination}${assignee ? ` (assigned to ${assignee})` : ""}`,
    entityType: "lead",
    entityId: lead.id,
    performedBy: "lead_router",
    metadata: JSON.stringify({ tier, destination, score: lead.fitScore, assignee, ghlResult }),
  });

  await createNotification({
    type: "lead_routed",
    severity: tier === "HOT" ? "warning" : "info",
    title: `${tier} Lead Routed`,
    message: `Lead #${lead.id} (score: ${lead.fitScore}) routed to ${destination}${assignee ? ` — assigned to ${assignee}` : ""}`,
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
    data: { tier, destination, score: lead.fitScore, assignee },
  });

  await logAudit({
    eventType: "lead_auto_routed",
    domain: "crm",
    action: `lead_routed_${tier.toLowerCase()}`,
    description: `Lead #${lead.id} routed as ${tier} to ${destination}`,
    entityType: "lead",
    entityId: lead.id,
    actor: "lead_router",
    actorType: "system",
    metadata: { tier, score: lead.fitScore, destination },
  });
}

async function autoRouteOnScore(_event: string, payload: any): Promise<void> {
  if (payload.entityType !== "lead" || !payload.entityId) return;

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, payload.entityId));
  if (!lead) return;

  if (lead.status === "routed" || lead.status === "active" || lead.status === "closed_won" || lead.status === "closed_lost") return;

  const tier = getScoreTier(lead.fitScore);
  const rule = ROUTING_RULES[tier];
  const suggestedAssignee = rule.autoAssign && !lead.assignedTo ? await findLeadAssignee() : lead.assignedTo;

  const result = await executeOrQueue({
    actionType: "lead_routing",
    workflowKey: "lead_routing",
    entityType: "lead",
    entityId: lead.id,
    title: `Route ${tier} Lead #${lead.id}`,
    description: `Lead #${lead.id} scored ${lead.fitScore} (${tier}). Recommended destination: ${rule.destination}${suggestedAssignee ? `, assign to ${suggestedAssignee}` : ""}`,
    confidence: lead.fitScore ? Math.min(lead.fitScore + 10, 95) : 50,
    options: [
      { id: "approve", label: `Route to ${rule.destination}${suggestedAssignee ? ` → ${suggestedAssignee}` : ""}`, description: "Accept AI routing recommendation", isAiRecommended: true },
      { id: "route_ghl", label: "Route to GoHighLevel", description: "Send lead to GHL CRM only" },
      { id: "route_internal", label: "Route Internally", description: "Keep lead internal, assign to team" },
      { id: "route_hold", label: "Hold", description: "Place on hold for further review" },
      { id: "skip", label: "Skip Routing", description: "Don't route this lead now" },
    ],
    aiRecommendation: `Route ${tier} lead to ${rule.destination}${suggestedAssignee ? `, assign to ${suggestedAssignee}` : ""}`,
    aiParts: "AI scores lead (0-100), determines tier (HOT/WARM/COLD), selects routing destination based on score thresholds, picks assignee via round-robin",
    humanParts: "Review lead score and tier, confirm or override routing destination, select assignee, approve or hold lead",
    metadata: { leadId: lead.id, score: lead.fitScore, tier, suggestedDestination: rule.destination, suggestedAssignee },
    executeAction: async () => {
      await directRouteLead(lead.id, rule.destination, suggestedAssignee);
    },
  });

  if (result.queued) {
    console.log(`[LeadRouter] Lead #${lead.id} routing queued for ${result.mode} review`);
  }
}

function registerLeadRoutingExecutors(): void {
  registerActionExecutor("lead_routing", async (metadata, option) => {
    const { leadId, suggestedAssignee } = metadata;
    if (option === "approve") {
      await directRouteLead(leadId, metadata.suggestedDestination, suggestedAssignee);
    } else if (option === "route_ghl") {
      await directRouteLead(leadId, "ghl", suggestedAssignee);
    } else if (option === "route_internal") {
      await directRouteLead(leadId, "internal", suggestedAssignee);
    } else if (option === "route_hold") {
      await directRouteLead(leadId, "hold", null);
    }
  });
}

export function initLeadRouter(): void {
  registerLeadRoutingExecutors();
  subscribe("lead.scored", autoRouteOnScore);
  console.log("[LeadRouter] Initialized — tri-mode lead routing");
}

export { getScoreTier, findLeadAssignee, ROUTING_RULES };
