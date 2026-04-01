import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, leadsTable, companiesTable, contactsTable, activitiesTable, aiRunsTable } from "@workspace/db";
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
  const parsed = CreateLeadBody.safeParse(req.body);
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
      const validation = await validateTransition({
        entityType: "lead",
        entityId: params.data.id,
        currentState: current.status ?? "new",
        targetState: parsed.data.status,
        actor: "user",
      });
      if (!validation.valid) {
        res.status(400).json({ error: validation.error, validTransitions: getValidTransitions("lead", current.status ?? "new") });
        return;
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

  res.json(UpdateLeadResponse.parse(lead));
});

router.post("/leads/:id/route", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { destination } = req.body;
  if (!["internal", "ghl", "both", "hold"].includes(destination)) {
    res.status(400).json({ error: "Destination must be internal, ghl, both, or hold" });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const result = await routeLead(id, destination);

  const newStatus = destination === "hold" ? "hold" : "routed";
  await db.update(leadsTable).set({ status: newStatus }).where(eq(leadsTable.id, id));

  await db.insert(activitiesTable).values({
    action: "lead_routed",
    description: `Lead Routed → ${destination} — ${result.routed ? "Success" : "Pending"}`,
    entityType: "lead",
    entityId: id,
    performedBy: "system",
    metadata: JSON.stringify({ destination, result }),
  });

  res.json({ success: true, ...result });
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
