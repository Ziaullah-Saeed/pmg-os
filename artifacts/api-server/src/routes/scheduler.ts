import { Router, type IRouter } from "express";
import { db, scheduledJobsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { triggerJobManually, rescheduleJob } from "../services/scheduler-service";

const router: IRouter = Router();

router.get("/", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(scheduledJobsTable).orderBy(desc(scheduledJobsTable.createdAt));
  res.json({ jobs, total: jobs.length });
});

router.post("/:id/trigger", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  const result = await triggerJobManually(id);
  if (!result.success) { res.status(404).json({ error: result.error }); return; }
  res.json({ success: true, message: "Job triggered" });
});

router.put("/:id/toggle", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  const [existing] = await db.select().from(scheduledJobsTable).where(eq(scheduledJobsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Job not found" }); return; }

  const [updated] = await db.update(scheduledJobsTable)
    .set({ enabled: !existing.enabled })
    .where(eq(scheduledJobsTable.id, id))
    .returning();

  await rescheduleJob(id);
  res.json(updated);
});

router.post("/", async (req, res): Promise<void> => {
  const { name, description, cronExpression, jobType, config, enabled } = req.body;
  if (!name || !cronExpression || !jobType) {
    res.status(400).json({ error: "name, cronExpression, and jobType are required" });
    return;
  }

  const [job] = await db.insert(scheduledJobsTable).values({
    name, description, cronExpression, jobType,
    config: config ?? {},
    enabled: enabled ?? true,
  }).returning();

  await rescheduleJob(job.id);
  res.status(201).json(job);
});

router.delete("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  await db.delete(scheduledJobsTable).where(eq(scheduledJobsTable.id, id));
  await rescheduleJob(id);
  res.status(204).send();
});

export default router;
