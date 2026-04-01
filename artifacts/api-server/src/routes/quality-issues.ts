import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, qualityIssuesTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListQualityIssuesQueryParams, ListQualityIssuesResponse,
  CreateQualityIssueBody, GetQualityIssueParams, GetQualityIssueResponse,
  UpdateQualityIssueParams, UpdateQualityIssueBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/quality-issues", async (req, res): Promise<void> => {
  const query = ListQualityIssuesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(qualityIssuesTable.status, query.data.status));
  if (query.data.domain) conditions.push(eq(qualityIssuesTable.domain, query.data.domain));
  if (query.data.severity) conditions.push(eq(qualityIssuesTable.severity, query.data.severity));
  if (query.data.entityType) conditions.push(eq(qualityIssuesTable.entityType, query.data.entityType));
  if (query.data.assignedTo) conditions.push(eq(qualityIssuesTable.assignedTo!, query.data.assignedTo));
  const results = await db.select().from(qualityIssuesTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListQualityIssuesResponse.parse(results));
});

router.post("/quality-issues", async (req, res): Promise<void> => {
  const parsed = CreateQualityIssueBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, resolvedAt: parseDate(parsed.data.resolvedAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(qualityIssuesTable).values(insertData).returning();
  res.status(201).json(GetQualityIssueResponse.parse(item));
});

router.get("/quality-issues/:id", async (req, res): Promise<void> => {
  const params = GetQualityIssueParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(qualityIssuesTable).where(eq(qualityIssuesTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Quality issue not found" }); return; }
  res.json(GetQualityIssueResponse.parse(item));
});

router.patch("/quality-issues/:id", async (req, res): Promise<void> => {
  const params = UpdateQualityIssueParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateQualityIssueBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, resolvedAt: parseDate(parsed.data.resolvedAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(qualityIssuesTable).set(updateData).where(eq(qualityIssuesTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Quality issue not found" }); return; }
  res.json(GetQualityIssueResponse.parse(item));
});

export default router;
