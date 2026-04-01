import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, opportunitiesTable, companiesTable, contactsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListOpportunitiesQueryParams,
  ListOpportunitiesResponse,
  CreateOpportunityBody,
  GetOpportunityParams,
  GetOpportunityResponse,
  UpdateOpportunityParams,
  UpdateOpportunityBody,
  UpdateOpportunityResponse,
  DeleteOpportunityParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/opportunities", async (req, res): Promise<void> => {
  const query = ListOpportunitiesQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.search) {
      conditions.push(ilike(opportunitiesTable.title, `%${query.data.search}%`));
    }
    if (query.data.stage) {
      conditions.push(eq(opportunitiesTable.stage, query.data.stage));
    }
  }
  const rows = await db
    .select({
      id: opportunitiesTable.id,
      title: opportunitiesTable.title,
      companyId: opportunitiesTable.companyId,
      companyName: companiesTable.name,
      contactId: opportunitiesTable.contactId,
      contactName: contactsTable.firstName,
      leadId: opportunitiesTable.leadId,
      stage: opportunitiesTable.stage,
      value: opportunitiesTable.value,
      probability: opportunitiesTable.probability,
      expectedCloseDate: opportunitiesTable.expectedCloseDate,
      owner: opportunitiesTable.owner,
      serviceType: opportunitiesTable.serviceType,
      proposalStatus: opportunitiesTable.proposalStatus,
      contractStatus: opportunitiesTable.contractStatus,
      notes: opportunitiesTable.notes,
      wonAt: opportunitiesTable.wonAt,
      lostAt: opportunitiesTable.lostAt,
      lostReason: opportunitiesTable.lostReason,
      createdAt: opportunitiesTable.createdAt,
      updatedAt: opportunitiesTable.updatedAt,
    })
    .from(opportunitiesTable)
    .leftJoin(companiesTable, eq(opportunitiesTable.companyId, companiesTable.id))
    .leftJoin(contactsTable, eq(opportunitiesTable.contactId, contactsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(opportunitiesTable.createdAt);
  res.json(ListOpportunitiesResponse.parse(rows));
});

router.post("/opportunities", async (req, res): Promise<void> => {
  const parsed = CreateOpportunityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    var insertData = {
      ...parsed.data,
      expectedCloseDate: parseDate(parsed.data.expectedCloseDate),
    };
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }
  const [opp] = await db.insert(opportunitiesTable).values(insertData).returning();
  res.status(201).json(GetOpportunityResponse.parse(opp));
});

router.get("/opportunities/:id", async (req, res): Promise<void> => {
  const params = GetOpportunityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [opp] = await db
    .select({
      id: opportunitiesTable.id,
      title: opportunitiesTable.title,
      companyId: opportunitiesTable.companyId,
      companyName: companiesTable.name,
      contactId: opportunitiesTable.contactId,
      contactName: contactsTable.firstName,
      leadId: opportunitiesTable.leadId,
      stage: opportunitiesTable.stage,
      value: opportunitiesTable.value,
      probability: opportunitiesTable.probability,
      expectedCloseDate: opportunitiesTable.expectedCloseDate,
      owner: opportunitiesTable.owner,
      serviceType: opportunitiesTable.serviceType,
      proposalStatus: opportunitiesTable.proposalStatus,
      contractStatus: opportunitiesTable.contractStatus,
      notes: opportunitiesTable.notes,
      wonAt: opportunitiesTable.wonAt,
      lostAt: opportunitiesTable.lostAt,
      lostReason: opportunitiesTable.lostReason,
      createdAt: opportunitiesTable.createdAt,
      updatedAt: opportunitiesTable.updatedAt,
    })
    .from(opportunitiesTable)
    .leftJoin(companiesTable, eq(opportunitiesTable.companyId, companiesTable.id))
    .leftJoin(contactsTable, eq(opportunitiesTable.contactId, contactsTable.id))
    .where(eq(opportunitiesTable.id, params.data.id));
  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  res.json(GetOpportunityResponse.parse(opp));
});

router.patch("/opportunities/:id", async (req, res): Promise<void> => {
  const params = UpdateOpportunityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOpportunityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    var updateData = {
      ...parsed.data,
      expectedCloseDate: parseDate(parsed.data.expectedCloseDate),
    };
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }
  const [opp] = await db.update(opportunitiesTable).set(updateData).where(eq(opportunitiesTable.id, params.data.id)).returning();
  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  res.json(UpdateOpportunityResponse.parse(opp));
});

router.delete("/opportunities/:id", async (req, res): Promise<void> => {
  const params = DeleteOpportunityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [opp] = await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, params.data.id)).returning();
  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
