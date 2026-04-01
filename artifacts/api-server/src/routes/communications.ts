import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, communicationsTable, contactsTable, companiesTable } from "@workspace/db";
import {
  ListCommunicationsQueryParams,
  ListCommunicationsResponse,
  CreateCommunicationBody,
  GetCommunicationParams,
  GetCommunicationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/communications", async (req, res): Promise<void> => {
  const query = ListCommunicationsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.type) {
      conditions.push(eq(communicationsTable.type, query.data.type));
    }
    if (query.data.contactId) {
      conditions.push(eq(communicationsTable.contactId, query.data.contactId));
    }
    if (query.data.companyId) {
      conditions.push(eq(communicationsTable.companyId, query.data.companyId));
    }
  }
  const rows = await db
    .select({
      id: communicationsTable.id,
      type: communicationsTable.type,
      direction: communicationsTable.direction,
      subject: communicationsTable.subject,
      summary: communicationsTable.summary,
      contactId: communicationsTable.contactId,
      contactName: contactsTable.firstName,
      companyId: communicationsTable.companyId,
      companyName: companiesTable.name,
      opportunityId: communicationsTable.opportunityId,
      duration: communicationsTable.duration,
      outcome: communicationsTable.outcome,
      nextSteps: communicationsTable.nextSteps,
      sentiment: communicationsTable.sentiment,
      recordingUrl: communicationsTable.recordingUrl,
      transcript: communicationsTable.transcript,
      performedBy: communicationsTable.performedBy,
      scheduledAt: communicationsTable.scheduledAt,
      completedAt: communicationsTable.completedAt,
      createdAt: communicationsTable.createdAt,
    })
    .from(communicationsTable)
    .leftJoin(contactsTable, eq(communicationsTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(communicationsTable.companyId, companiesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(communicationsTable.createdAt);
  res.json(ListCommunicationsResponse.parse(rows));
});

router.post("/communications", async (req, res): Promise<void> => {
  const parsed = CreateCommunicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [comm] = await db.insert(communicationsTable).values(parsed.data).returning();
  res.status(201).json(GetCommunicationResponse.parse(comm));
});

router.get("/communications/:id", async (req, res): Promise<void> => {
  const params = GetCommunicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [comm] = await db
    .select({
      id: communicationsTable.id,
      type: communicationsTable.type,
      direction: communicationsTable.direction,
      subject: communicationsTable.subject,
      summary: communicationsTable.summary,
      contactId: communicationsTable.contactId,
      contactName: contactsTable.firstName,
      companyId: communicationsTable.companyId,
      companyName: companiesTable.name,
      opportunityId: communicationsTable.opportunityId,
      duration: communicationsTable.duration,
      outcome: communicationsTable.outcome,
      nextSteps: communicationsTable.nextSteps,
      sentiment: communicationsTable.sentiment,
      recordingUrl: communicationsTable.recordingUrl,
      transcript: communicationsTable.transcript,
      performedBy: communicationsTable.performedBy,
      scheduledAt: communicationsTable.scheduledAt,
      completedAt: communicationsTable.completedAt,
      createdAt: communicationsTable.createdAt,
    })
    .from(communicationsTable)
    .leftJoin(contactsTable, eq(communicationsTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(communicationsTable.companyId, companiesTable.id))
    .where(eq(communicationsTable.id, params.data.id));
  if (!comm) {
    res.status(404).json({ error: "Communication not found" });
    return;
  }
  res.json(GetCommunicationResponse.parse(comm));
});

export default router;
