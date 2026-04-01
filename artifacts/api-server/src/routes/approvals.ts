import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, approvalsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListApprovalsQueryParams,
  ListApprovalsResponse,
  CreateApprovalBody,
  GetApprovalParams,
  GetApprovalResponse,
  UpdateApprovalParams,
  UpdateApprovalBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/approvals", async (req, res): Promise<void> => {
  const query = ListApprovalsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(approvalsTable.status, query.data.status));
  if (query.data.domain) conditions.push(eq(approvalsTable.domain, query.data.domain));
  if (query.data.entityType) conditions.push(eq(approvalsTable.entityType, query.data.entityType));
  const results = await db.select().from(approvalsTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListApprovalsResponse.parse(results));
});

router.post("/approvals", async (req, res): Promise<void> => {
  const parsed = CreateApprovalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, expiresAt: parseDate(parsed.data.expiresAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(approvalsTable).values(insertData).returning();
  res.status(201).json(GetApprovalResponse.parse(item));
});

router.get("/approvals/:id", async (req, res): Promise<void> => {
  const params = GetApprovalParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(approvalsTable).where(eq(approvalsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Approval not found" }); return; }
  res.json(GetApprovalResponse.parse(item));
});

router.patch("/approvals/:id", async (req, res): Promise<void> => {
  const params = UpdateApprovalParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateApprovalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, expiresAt: parseDate(parsed.data.expiresAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(approvalsTable).set(updateData).where(eq(approvalsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Approval not found" }); return; }
  res.json(GetApprovalResponse.parse(item));
});

export default router;
