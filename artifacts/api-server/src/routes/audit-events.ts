import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, auditEventsTable } from "@workspace/db";
import {
  ListAuditEventsQueryParams, ListAuditEventsResponse,
  CreateAuditEventBody, GetAuditEventParams, GetAuditEventResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-events", async (req, res): Promise<void> => {
  const query = ListAuditEventsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.domain) conditions.push(eq(auditEventsTable.domain, query.data.domain));
  if (query.data.eventType) conditions.push(eq(auditEventsTable.eventType, query.data.eventType));
  if (query.data.severity) conditions.push(eq(auditEventsTable.severity, query.data.severity));
  if (query.data.actorType) conditions.push(eq(auditEventsTable.actorType, query.data.actorType));
  const results = await db.select().from(auditEventsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(auditEventsTable.createdAt)).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListAuditEventsResponse.parse(results));
});

router.post("/audit-events", async (req, res): Promise<void> => {
  const parsed = CreateAuditEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.insert(auditEventsTable).values(parsed.data).returning();
  res.status(201).json(GetAuditEventResponse.parse(item));
});

router.get("/audit-events/:id", async (req, res): Promise<void> => {
  const params = GetAuditEventParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(auditEventsTable).where(eq(auditEventsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Audit event not found" }); return; }
  res.json(GetAuditEventResponse.parse(item));
});

export default router;
