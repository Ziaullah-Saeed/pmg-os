import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, aiRunsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListAiRunsQueryParams, ListAiRunsResponse,
  CreateAiRunBody, GetAiRunParams, GetAiRunResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ai-runs", async (req, res): Promise<void> => {
  const query = ListAiRunsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.domain) conditions.push(eq(aiRunsTable.domain, query.data.domain));
  if (query.data.status) conditions.push(eq(aiRunsTable.status, query.data.status));
  if (query.data.runType) conditions.push(eq(aiRunsTable.runType, query.data.runType));
  if (query.data.model) conditions.push(eq(aiRunsTable.model!, query.data.model));
  const results = await db.select().from(aiRunsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(aiRunsTable.createdAt)).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListAiRunsResponse.parse(results));
});

router.post("/ai-runs", async (req, res): Promise<void> => {
  const parsed = CreateAiRunBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, reviewedAt: parseDate(parsed.data.reviewedAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(aiRunsTable).values(insertData).returning();
  res.status(201).json(GetAiRunResponse.parse(item));
});

router.get("/ai-runs/:id", async (req, res): Promise<void> => {
  const params = GetAiRunParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(aiRunsTable).where(eq(aiRunsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "AI run not found" }); return; }
  res.json(GetAiRunResponse.parse(item));
});

export default router;
