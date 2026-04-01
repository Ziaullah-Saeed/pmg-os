import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, reportsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListReportsQueryParams, ListReportsResponse,
  CreateReportBody, GetReportParams, GetReportResponse,
  UpdateReportParams, UpdateReportBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports", async (req, res): Promise<void> => {
  const query = ListReportsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(reportsTable.status, query.data.status));
  if (query.data.domain) conditions.push(eq(reportsTable.domain, query.data.domain));
  if (query.data.type) conditions.push(eq(reportsTable.type, query.data.type));
  if (query.data.format) conditions.push(eq(reportsTable.format, query.data.format));
  if (query.data.generationType) conditions.push(eq(reportsTable.generationType, query.data.generationType));
  const results = await db.select().from(reportsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(reportsTable.createdAt)).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListReportsResponse.parse(results));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, scheduledFor: parseDate(parsed.data.scheduledFor), deliveredAt: parseDate(parsed.data.deliveredAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(reportsTable).values(insertData).returning();
  res.status(201).json(GetReportResponse.parse(item));
});

router.get("/reports/:id", async (req, res): Promise<void> => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(reportsTable).where(eq(reportsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(GetReportResponse.parse(item));
});

router.patch("/reports/:id", async (req, res): Promise<void> => {
  const params = UpdateReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, scheduledFor: parseDate(parsed.data.scheduledFor), deliveredAt: parseDate(parsed.data.deliveredAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(reportsTable).set(updateData).where(eq(reportsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(GetReportResponse.parse(item));
});

export default router;
