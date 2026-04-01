import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, leadsTable, companiesTable, contactsTable } from "@workspace/db";
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
  const [lead] = await db.insert(leadsTable).values(parsed.data).returning();
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
  const [lead] = await db.update(leadsTable).set(parsed.data).where(eq(leadsTable.id, params.data.id)).returning();
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json(UpdateLeadResponse.parse(lead));
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
