import { Router, type IRouter } from "express";
import { db, aiGeneratedOutputsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Persisted AI-generated outputs (briefings, evolution scans, SEO audits,
 * competitor analyses, deal coaching, transcript analyses). Generic list/create
 * so every AI-output tab reads its real history instead of hardcoded content.
 */

const router: IRouter = Router();

router.get("/ai-outputs", async (req, res): Promise<void> => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const domain = typeof req.query.domain === "string" ? req.query.domain : undefined;
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const entityId = req.query.entityId != null ? Number(req.query.entityId) : undefined;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const conds = [];
  if (kind) conds.push(eq(aiGeneratedOutputsTable.kind, kind));
  if (domain) conds.push(eq(aiGeneratedOutputsTable.domain, domain));
  if (entityType) conds.push(eq(aiGeneratedOutputsTable.entityType, entityType));
  if (entityId != null && Number.isFinite(entityId)) conds.push(eq(aiGeneratedOutputsTable.entityId, entityId));

  const rows = await db
    .select()
    .from(aiGeneratedOutputsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(aiGeneratedOutputsTable.createdAt))
    .limit(limit);
  res.json(rows);
});

router.post("/ai-outputs", async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.domain || !b.kind || !b.title) {
    res.status(400).json({ error: "domain, kind, and title are required" });
    return;
  }
  const [row] = await db
    .insert(aiGeneratedOutputsTable)
    .values({
      domain: String(b.domain),
      kind: String(b.kind),
      title: String(b.title),
      summary: b.summary ?? null,
      data: b.data ?? null,
      status: b.status ?? "generated",
      entityType: b.entityType ?? null,
      entityId: typeof b.entityId === "number" ? b.entityId : null,
      generatedBy: b.generatedBy ?? null,
    })
    .returning();
  res.status(201).json(row);
});

export default router;
