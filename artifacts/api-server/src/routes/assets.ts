import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, assetsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListAssetsQueryParams, ListAssetsResponse,
  CreateAssetBody, GetAssetParams, GetAssetResponse,
  UpdateAssetParams, UpdateAssetBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/assets", async (req, res): Promise<void> => {
  const query = ListAssetsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(assetsTable.status, query.data.status));
  if (query.data.type) conditions.push(eq(assetsTable.type, query.data.type));
  if (query.data.category) conditions.push(eq(assetsTable.category, query.data.category));
  if (query.data.lifecycleStage) conditions.push(eq(assetsTable.lifecycleStage, query.data.lifecycleStage));
  if (query.data.domain) conditions.push(eq(assetsTable.domain!, query.data.domain));
  const results = await db.select().from(assetsTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListAssetsResponse.parse(results));
});

router.post("/assets", async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, publishedAt: parseDate(parsed.data.publishedAt), archivedAt: parseDate(parsed.data.archivedAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(assetsTable).values(insertData).returning();
  res.status(201).json(GetAssetResponse.parse(item));
});

router.get("/assets/:id", async (req, res): Promise<void> => {
  const params = GetAssetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(GetAssetResponse.parse(item));
});

router.patch("/assets/:id", async (req, res): Promise<void> => {
  const params = UpdateAssetParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAssetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, publishedAt: parseDate(parsed.data.publishedAt), archivedAt: parseDate(parsed.data.archivedAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(assetsTable).set(updateData).where(eq(assetsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(GetAssetResponse.parse(item));
});

export default router;
