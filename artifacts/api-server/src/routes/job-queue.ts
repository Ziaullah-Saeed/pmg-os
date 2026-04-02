import { Router, type IRouter } from "express";
import { getQueueStats, retryDeadLetterJob, purgeCompletedJobs } from "../services/job-queue";
import { db, jobQueueTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "../middleware/rbac";

const router: IRouter = Router();

router.get("/job-queue/stats", requireRole("admin"), async (_req, res): Promise<void> => {
  const stats = await getQueueStats();
  res.json(stats);
});

router.get("/job-queue/dead-letter", requireRole("admin"), async (_req, res): Promise<void> => {
  const jobs = await db.select().from(jobQueueTable)
    .where(eq(jobQueueTable.status, "dead_letter"))
    .orderBy(desc(jobQueueTable.updatedAt))
    .limit(50);
  res.json({ items: jobs, total: jobs.length });
});

router.post("/job-queue/retry/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const success = await retryDeadLetterJob(id);
  if (!success) { res.status(404).json({ error: "Job not found or not in dead letter state" }); return; }
  res.json({ success: true, id });
});

router.post("/job-queue/purge", requireRole("super_admin"), async (req, res): Promise<void> => {
  const days = Number(req.body?.olderThanDays ?? 7);
  const purged = await purgeCompletedJobs(days);
  res.json({ purged, olderThanDays: days });
});

export default router;
