import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, archiveItemsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListArchiveItemsQueryParams, ListArchiveItemsResponse,
  CreateArchiveItemBody, GetArchiveItemParams, GetArchiveItemResponse,
  UpdateArchiveItemParams, UpdateArchiveItemBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/archive-items", async (req, res): Promise<void> => {
  const query = ListArchiveItemsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(archiveItemsTable.status, query.data.status));
  if (query.data.domain) conditions.push(eq(archiveItemsTable.domain, query.data.domain));
  if (query.data.category) conditions.push(eq(archiveItemsTable.category, query.data.category));
  if (query.data.sourceType) conditions.push(eq(archiveItemsTable.sourceType, query.data.sourceType));
  if (query.data.accessLevel) conditions.push(eq(archiveItemsTable.accessLevel, query.data.accessLevel));
  const results = await db.select().from(archiveItemsTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListArchiveItemsResponse.parse(results));
});

router.post("/archive-items", async (req, res): Promise<void> => {
  const parsed = CreateArchiveItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, expiresAt: parseDate(parsed.data.expiresAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(archiveItemsTable).values(insertData).returning();
  res.status(201).json(GetArchiveItemResponse.parse(item));
});

router.get("/archive-items/:id", async (req, res): Promise<void> => {
  const params = GetArchiveItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(archiveItemsTable).where(eq(archiveItemsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Archive item not found" }); return; }
  res.json(GetArchiveItemResponse.parse(item));
});

router.patch("/archive-items/:id", async (req, res): Promise<void> => {
  const params = UpdateArchiveItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateArchiveItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, expiresAt: parseDate(parsed.data.expiresAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(archiveItemsTable).set(updateData).where(eq(archiveItemsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Archive item not found" }); return; }
  res.json(GetArchiveItemResponse.parse(item));
});

export default router;
