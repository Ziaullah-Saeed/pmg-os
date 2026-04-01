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
import { createNotification } from "../services/notification-service";
import { logAudit } from "../services/audit-service";

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, urgent: 1, medium: 2, normal: 2, low: 3 };

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

  const [existing] = await db.select().from(approvalsTable).where(eq(approvalsTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Approval not found" }); return; }

  try {
    var updateData = { ...parsed.data, expiresAt: parseDate(parsed.data.expiresAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(approvalsTable).set(updateData).where(eq(approvalsTable.id, params.data.id)).returning();

  if (parsed.data.status && parsed.data.status !== existing.status) {
    const isApproved = parsed.data.status === "approved";
    const isRejected = parsed.data.status === "rejected";

    if (isApproved || isRejected) {
      await createNotification({
        type: isApproved ? "approval_approved" : "approval_rejected",
        severity: isRejected ? "warning" : "info",
        title: `Approval ${isApproved ? "Approved" : "Rejected"}: ${existing.entityType} #${existing.entityId}`,
        message: `${existing.entityType} #${existing.entityId} in ${existing.domain ?? "system"} was ${parsed.data.status} by ${parsed.data.reviewedBy ?? "reviewer"}`,
        domain: existing.domain ?? "system",
        entityType: existing.entityType,
        entityId: existing.entityId,
        actor: parsed.data.reviewedBy ?? "reviewer",
      }).catch(() => {});

      await db.insert(activitiesTable).values({
        action: `approval_${parsed.data.status}`,
        description: `${existing.entityType} #${existing.entityId} ${parsed.data.status}`,
        entityType: existing.entityType,
        entityId: existing.entityId,
        performedBy: parsed.data.reviewedBy ?? "reviewer",
      }).catch(() => {});

      await logAudit({
        eventType: "approval_decision",
        domain: existing.domain ?? "system",
        action: `approval_${parsed.data.status}`,
        description: `Approval ${params.data.id} for ${existing.entityType} #${existing.entityId} ${parsed.data.status}`,
        entityType: "approval",
        entityId: params.data.id,
        actor: parsed.data.reviewedBy ?? "reviewer",
        actorType: "human",
        severity: isRejected ? "warning" : "info",
      });
    }
  }

  res.json(GetApprovalResponse.parse(item));
});

export default router;
