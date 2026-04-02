import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, approvalsTable, activitiesTable } from "@workspace/db";
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
import { transitionApproval } from "../services/approval-engine";
import { emit } from "../services/event-bus";
import { getSessionUser } from "../middleware/auth";

const router: IRouter = Router();

router.get("/approvals", async (req, res): Promise<void> => {
  const query = ListApprovalsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(approvalsTable.status, query.data.status));
  if (query.data.domain) conditions.push(eq(approvalsTable.domain, query.data.domain));
  if (query.data.entityType) conditions.push(eq(approvalsTable.entityType, query.data.entityType));
  const results = await db.select().from(approvalsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(sql`CASE WHEN ${approvalsTable.priority} = 'critical' THEN 0 WHEN ${approvalsTable.priority} = 'high' THEN 1 WHEN ${approvalsTable.priority} = 'urgent' THEN 1 WHEN ${approvalsTable.priority} = 'medium' THEN 2 WHEN ${approvalsTable.priority} = 'normal' THEN 2 ELSE 3 END ASC`, desc(approvalsTable.createdAt)).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListApprovalsResponse.parse(results));
});

router.post("/approvals", async (req, res): Promise<void> => {
  const parsed = CreateApprovalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, expiresAt: parseDate(parsed.data.expiresAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }

  const sessionUser = getSessionUser(req);
  if (!insertData.requestedBy && sessionUser) {
    (insertData as any).requestedBy = sessionUser.name;
  }

  const [item] = await db.insert(approvalsTable).values(insertData).returning();

  await emit("approval.created", {
    entityType: item.entityType,
    entityId: item.entityId,
    domain: item.domain ?? "system",
    actor: sessionUser?.name ?? "system",
    actorType: "human",
    data: { approvalId: item.id, priority: item.priority },
  });

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

  const sessionUser = getSessionUser(req);

  if (parsed.data.status) {
    const result = await transitionApproval({
      approvalId: params.data.id,
      newStatus: parsed.data.status,
      reviewedBy: parsed.data.reviewedBy ?? sessionUser?.name,
      rejectionReason: parsed.data.rejectionReason,
      notes: parsed.data.notes,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(GetApprovalResponse.parse(result.approval));
    return;
  }

  try {
    var updateData = { ...parsed.data, expiresAt: parseDate(parsed.data.expiresAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(approvalsTable).set(updateData).where(eq(approvalsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Approval not found" }); return; }
  res.json(GetApprovalResponse.parse(item));
});

export default router;
