import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, leadsTable, companiesTable, contactsTable, activitiesTable, aiRunsTable } from "@workspace/db";
import { requireRole } from "../middleware/rbac";
import {
  ListLeadsQueryParams,
  ListLeadsResponse,
  CreateLeadBody,
  GetLeadParams,
  GetLeadResponse,
  UpdateLeadParams,
  UpdateLeadBody,
  UpdateLeadResponse,
  DeleteLeadParams,
} from "@workspace/api-zod";
import { enrichLead, scoreLead } from "../services/ai-service";
import { validateTransition, getValidTransitions, getInitialState } from "../services/state-machine";
import { createNotification } from "../services/notification-service";
import { addKnowledgeEntry } from "../services/knowledge-service";
import { routeLead } from "../services/ghl-service";
import { logAudit } from "../services/audit-service";
import { emit } from "../services/event-bus";
import { getSessionUser } from "../middleware/auth";
import { opportunitiesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/leads", async (req, res): Promise<void> => {
  const query = ListLeadsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.search) {
      conditions.push(ilike(companiesTable.name, `%${query.data.search}%`));
    }
    if (query.data.status) {
      conditions.push(eq(leadsTable.status, query.data.status));
    }
    if (query.data.priority) {
      conditions.push(eq(leadsTable.priority, query.data.priority));
    }
  }
  const rows = await db
    .select({
      id: leadsTable.id,
      companyId: leadsTable.companyId,
      companyName: companiesTable.name,
      contactId: leadsTable.contactId,
      contactName: contactsTable.firstName,
      source: leadsTable.source,
      status: leadsTable.status,
      priority: leadsTable.priority,
      fitScore: leadsTable.fitScore,
      confidenceScore: leadsTable.confidenceScore,
      painPoints: leadsTable.painPoints,
      bestAngle: leadsTable.bestAngle,
      nextAction: leadsTable.nextAction,
      assignedTo: leadsTable.assignedTo,
      notes: leadsTable.notes,
      qualifiedAt: leadsTable.qualifiedAt,
      routingDestination: leadsTable.routingDestination,
      retainCopy: leadsTable.retainCopy,
      externalCrmId: leadsTable.externalCrmId,
      routedAt: leadsTable.routedAt,
      lastSyncedAt: leadsTable.lastSyncedAt,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
    })
    .from(leadsTable)
    .leftJoin(companiesTable, eq(leadsTable.companyId, companiesTable.id))
    .leftJoin(contactsTable, eq(leadsTable.contactId, contactsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(leadsTable.createdAt);
  res.json(ListLeadsResponse.parse(rows));
});

router.post("/leads", async (req, res): Promise<void> => {
  const { firstName, lastName, email, phone, company, title, ...rest } = req.body;
  let companyId = rest.companyId;
  let contactId = rest.contactId;

  if (!companyId && company) {
    const existing = await db.select().from(companiesTable).where(eq(companiesTable.name, company)).limit(1);
    if (existing.length) {
      companyId = existing[0].id;
    } else {
      const [newCo] = await db.insert(companiesTable).values({ name: company, industry: "cybersecurity", status: "lead" }).returning();
      companyId = newCo.id;
    }
  }

  if (!contactId && (firstName || lastName)) {
    const [newContact] = await db.insert(contactsTable).values({
      firstName: firstName || "",
      lastName: lastName || "",
      email: email || null,
      phone: phone || null,
      title: title || null,
      companyId: companyId || null,
    }).returning();
    contactId = newContact.id;
  }

  const bodyForValidation = { ...rest, companyId, contactId };
  const parsed = CreateLeadBody.safeParse(bodyForValidation);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const values = { ...parsed.data, status: parsed.data.status ?? getInitialState("lead") };
  const [lead] = await db.insert(leadsTable).values(values).returning();

  await db.insert(activitiesTable).values({
    action: "lead_created",
    description: `Lead created from source: ${lead.source ?? "manual"}`,
    entityType: "lead",
    entityId: lead.id,
    performedBy: "system",
  });

  const companyName = parsed.data.companyId
    ? (await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, parsed.data.companyId)))[0]?.name
    : undefined;

  (async () => {
    try {
      const enrichResult = await enrichLead({
        id: lead.id,
        name: companyName ?? `Lead #${lead.id}`,
        company: companyName,
        source: lead.source,
      });
      await db.update(leadsTable).set({
        bestAngle: enrichResult.enrichment.slice(0, 500),
        status: "enriched",
      }).where(eq(leadsTable.id, lead.id));

      await db.insert(activitiesTable).values({
        action: "ai_enrichment",
        description: `AI Enrichment Complete — confidence: ${enrichResult.confidence}%`,
        entityType: "lead",
        entityId: lead.id,
        performedBy: "ai_system",
        metadata: JSON.stringify({ runId: enrichResult.runId, confidence: enrichResult.confidence }),
      });

      const scoreResult = await scoreLead({
        id: lead.id,
        name: companyName ?? `Lead #${lead.id}`,
        company: companyName,
        source: lead.source,
        enrichmentData: enrichResult.enrichment,
      });
      await db.update(leadsTable).set({
        fitScore: scoreResult.score,
        confidenceScore: scoreResult.confidence,
        priority: scoreResult.tier === "HOT" ? "urgent" : scoreResult.tier === "WARM" ? "high" : "medium",
        status: "scored",
        notes: scoreResult.reasoning,
      }).where(eq(leadsTable.id, lead.id));

      await db.insert(activitiesTable).values({
        action: "ai_scoring",
        description: `Lead Scored: ${scoreResult.score}/100 (${scoreResult.tier}) — ${scoreResult.reasoning}`,
        entityType: "lead",
        entityId: lead.id,
        performedBy: "ai_system",
        metadata: JSON.stringify({ runId: scoreResult.runId, score: scoreResult.score, tier: scoreResult.tier }),
      });

      await addKnowledgeEntry({
        category: "lead_intelligence",
        title: `Lead Intelligence: ${companyName ?? `Lead #${lead.id}`}`,
        content: `Score: ${scoreResult.score}/100 (${scoreResult.tier})\n${enrichResult.enrichment}`,
        source: "ai_enrichment",
        sourceDomain: "crm",
        sourceEntityType: "lead",
        sourceEntityId: lead.id,
        confidence: scoreResult.confidence,
      });

      await createNotification({
        type: "lead_enriched",
        severity: scoreResult.tier === "HOT" ? "warning" : "info",
        title: `New ${scoreResult.tier} Lead: ${companyName ?? `Lead #${lead.id}`}`,
        message: `Score: ${scoreResult.score}/100 — ${scoreResult.reasoning.slice(0, 150)}`,
        domain: "crm",
        entityType: "lead",
        entityId: lead.id,
        actor: "ai_system",
      });
    } catch (err: any) {
      console.error("AI lead enrichment failed:", err.message);
    }
  })();

  await logAudit({
    eventType: "entity_created",
    domain: "crm",
    action: "lead_created",
    description: `Lead created from source: ${lead.source ?? "manual"}`,
    entityType: "lead",
    entityId: lead.id,
    actor: "user",
    actorType: "human",
  });

  const sessionUser = getSessionUser(req);
  emit("lead.created", {
    entityType: "lead",
    entityId: lead.id,
    domain: "crm",
    actor: sessionUser?.name ?? "system",
    actorType: "human",
    data: { source: lead.source, companyId: lead.companyId },
  }).catch(() => {});

  res.status(201).json(GetLeadResponse.parse(lead));
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lead] = await db
    .select({
      id: leadsTable.id,
      companyId: leadsTable.companyId,
      companyName: companiesTable.name,
      contactId: leadsTable.contactId,
      contactName: contactsTable.firstName,
      source: leadsTable.source,
      status: leadsTable.status,
      priority: leadsTable.priority,
      fitScore: leadsTable.fitScore,
      confidenceScore: leadsTable.confidenceScore,
      painPoints: leadsTable.painPoints,
      bestAngle: leadsTable.bestAngle,
      nextAction: leadsTable.nextAction,
      assignedTo: leadsTable.assignedTo,
      notes: leadsTable.notes,
      qualifiedAt: leadsTable.qualifiedAt,
      routingDestination: leadsTable.routingDestination,
      retainCopy: leadsTable.retainCopy,
      externalCrmId: leadsTable.externalCrmId,
      routedAt: leadsTable.routedAt,
      lastSyncedAt: leadsTable.lastSyncedAt,
      createdAt: leadsTable.createdAt,
      updatedAt: leadsTable.updatedAt,
    })
    .from(leadsTable)
    .leftJoin(companiesTable, eq(leadsTable.companyId, companiesTable.id))
    .leftJoin(contactsTable, eq(leadsTable.contactId, contactsTable.id))
    .where(eq(leadsTable.id, params.data.id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json(GetLeadResponse.parse(lead));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.status) {
    const [current] = await db.select({ status: leadsTable.status }).from(leadsTable).where(eq(leadsTable.id, params.data.id));
    if (current) {
      const currentStatus = current.status ?? "new";
      const targetStatus = parsed.data.status;
      const validation = await validateTransition({
        entityType: "lead",
        entityId: params.data.id,
        currentState: currentStatus,
        targetState: targetStatus,
        actor: "user",
      });
      if (!validation.valid) {
        const progressionPath: Record<string, string> = {
          new: "enriched",
          enriched: "scored",
          scored: "qualified",
          qualified: "routing",
          routing: "routed",
          routed: "active",
        };
        if (targetStatus === "qualified" && (currentStatus === "new" || currentStatus === "enriched" || currentStatus === "scored")) {
          let stepStatus = currentStatus;
          while (stepStatus !== "qualified" && progressionPath[stepStatus]) {
            const nextStep = progressionPath[stepStatus];
            await db.update(leadsTable).set({ status: nextStep }).where(eq(leadsTable.id, params.data.id));
            stepStatus = nextStep;
          }
          parsed.data.status = "qualified";
        } else {
          res.status(400).json({ error: validation.error, validTransitions: getValidTransitions("lead", currentStatus) });
          return;
        }
      }
    }
  }

  const [lead] = await db.update(leadsTable).set(parsed.data).where(eq(leadsTable.id, params.data.id)).returning();
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  await db.insert(activitiesTable).values({
    action: "lead_updated",
    description: `Lead Updated${parsed.data.status ? ` → ${parsed.data.status}` : ""} — fields: ${Object.keys(parsed.data).join(", ")}`,
    entityType: "lead",
    entityId: lead.id,
    performedBy: "user",
  });

  await logAudit({
    eventType: "entity_updated",
    domain: "crm",
    action: "lead_updated",
    description: `Lead ${lead.id} updated — fields: ${Object.keys(parsed.data).join(", ")}`,
    entityType: "lead",
    entityId: lead.id,
    actor: "user",
    actorType: "human",
    metadata: { changedFields: Object.keys(parsed.data) },
  });

  if (parsed.data.status) {
    const sessionUser = getSessionUser(req);
    const eventName = parsed.data.status === "qualified" ? "lead.qualified" :
      parsed.data.status === "scored" ? "lead.scored" :
      parsed.data.status === "routed" ? "lead.routed" :
      `lead.status_changed`;
    emit(eventName, {
      entityType: "lead",
      entityId: lead.id,
      domain: "crm",
      actor: sessionUser?.name ?? "system",
      actorType: "human",
      newState: parsed.data.status,
      data: { fitScore: lead.fitScore, status: parsed.data.status },
    }).catch(() => {});
  }

  res.json(UpdateLeadResponse.parse(lead));
});

router.post("/leads/:id/route", requireRole("manager"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { destination } = req.body;
  const validDests = ["internal", "pmg", "ghl", "both", "hold"];
  if (!validDests.includes(destination)) {
    res.status(400).json({ error: "Destination must be pmg, ghl, both, or hold" });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const normalizedDest = destination === "internal" ? "pmg" : destination;
  const routeArg = normalizedDest === "pmg" ? "internal" : normalizedDest;
  const result = await routeLead(id, routeArg as any);

  const newStatus = destination === "hold" ? "hold" : "routed";
  const updateData: any = { status: newStatus, routingDestination: normalizedDest, retainCopy: true, routedAt: new Date() };
  if (result.ghlResult?.ghlContactId) {
    updateData.externalCrmId = result.ghlResult.ghlContactId;
    updateData.lastSyncedAt = new Date();
  }
  await db.update(leadsTable).set(updateData).where(eq(leadsTable.id, id));

  await db.insert(activitiesTable).values({
    action: "lead_routed",
    description: `Lead Routed → ${normalizedDest} — ${result.routed ? "Success" : "Pending"}`,
    entityType: "lead",
    entityId: id,
    performedBy: "system",
    metadata: JSON.stringify({ destination: normalizedDest, result }),
  });

  res.json({ success: true, ...result, routingDestination: normalizedDest, retainCopy: true });
});

router.get("/leads/:id/activities", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const activities = await db.select().from(activitiesTable)
    .where(and(eq(activitiesTable.entityType, "lead"), eq(activitiesTable.entityId, id)))
    .orderBy(activitiesTable.createdAt);
  res.json(activities);
});

router.get("/leads/:id/ai-runs", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const runs = await db.select().from(aiRunsTable)
    .where(and(eq(aiRunsTable.entityType, "lead"), eq(aiRunsTable.entityId, id)))
    .orderBy(aiRunsTable.createdAt);
  res.json(runs);
});

router.post("/leads/:id/convert", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [lead] = await db.select().from(leadsTable)
    .leftJoin(companiesTable, eq(leadsTable.companyId, companiesTable.id))
    .where(eq(leadsTable.id, id));
  if (!lead || !lead.leads) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const l = lead.leads;
  if (["closed_won", "closed_lost", "disqualified"].includes(l.status)) {
    res.status(400).json({ error: `Cannot convert a lead with status "${l.status}"` });
    return;
  }

  const { title, value, serviceType, owner } = req.body as {
    title?: string; value?: number; serviceType?: string; owner?: string;
  };

  const oppTitle = title ?? `${lead.companies?.name ?? "Lead"} — Opportunity`;
  const [opp] = await db.insert(opportunitiesTable).values({
    title: oppTitle,
    companyId: l.companyId,
    contactId: l.contactId,
    leadId: l.id,
    stage: "discovery",
    value: value ?? 0,
    probability: 10,
    serviceType: serviceType ?? "cybersecurity",
    owner: owner ?? l.assignedTo,
  }).returning();

  await db.update(leadsTable).set({ status: "active" }).where(eq(leadsTable.id, id));

  await db.insert(activitiesTable).values({
    action: "lead_converted",
    description: `Lead converted to opportunity "${oppTitle}" (ID: ${opp.id})`,
    entityType: "lead",
    entityId: id,
    performedBy: getSessionUser(req)?.name ?? "system",
    metadata: JSON.stringify({ opportunityId: opp.id, title: oppTitle, value: opp.value }),
  });

  const sessionUser = getSessionUser(req);
  emit("lead.converted", {
    entityType: "lead",
    entityId: id,
    domain: "crm",
    actor: sessionUser?.name ?? "system",
    actorType: "human",
    data: { opportunityId: opp.id, title: oppTitle, value: opp.value },
  }).catch(() => {});

  emit("opportunity.created", {
    entityType: "opportunity",
    entityId: opp.id,
    domain: "crm",
    actor: sessionUser?.name ?? "system",
    actorType: "human",
    data: { title: oppTitle, value: opp.value, stage: "discovery", fromLead: id },
  }).catch(() => {});

  res.status(201).json({ lead: { id, status: "active" }, opportunity: opp });
});

router.post("/leads/:id/close", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { reason, notes: closeNotes } = req.body as { reason: "won" | "lost" | "disqualified"; notes?: string };

  if (!["won", "lost", "disqualified"].includes(reason)) {
    res.status(400).json({ error: "Reason must be won, lost, or disqualified" });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (["closed_won", "closed_lost", "disqualified"].includes(lead.status)) {
    res.status(400).json({ error: `Lead is already closed (${lead.status})` });
    return;
  }

  const newStatus = reason === "won" ? "closed_won" : reason === "lost" ? "closed_lost" : "disqualified";
  const combinedNotes = closeNotes
    ? `${lead.notes ?? ""}\n---Closed (${reason})---\n${closeNotes}`.trim()
    : lead.notes;

  const [updated] = await db.update(leadsTable).set({
    status: newStatus,
    notes: combinedNotes,
  }).where(eq(leadsTable.id, id)).returning();

  await db.insert(activitiesTable).values({
    action: "lead_closed",
    description: `Lead closed as ${reason}${closeNotes ? `: ${closeNotes.slice(0, 150)}` : ""}`,
    entityType: "lead",
    entityId: id,
    performedBy: getSessionUser(req)?.name ?? "system",
    metadata: JSON.stringify({ reason, closeNotes }),
  });

  const sessionUser = getSessionUser(req);
  emit("lead.closed", {
    entityType: "lead",
    entityId: id,
    domain: "crm",
    actor: sessionUser?.name ?? "system",
    actorType: "human",
    newState: newStatus,
    data: { closeReason: reason, notes: closeNotes },
  }).catch(() => {});

  res.json({ success: true, lead: updated });
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lead] = await db.delete(leadsTable).where(eq(leadsTable.id, params.data.id)).returning();
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
