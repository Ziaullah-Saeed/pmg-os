import { Router, type IRouter } from "express";
import { db, sequenceEnrollmentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { enrollContact, pauseEnrollment, resumeEnrollment, removeEnrollment, advanceSequences } from "../services/sequence-engine";
import { getSessionUser } from "../middleware/auth";

const router: IRouter = Router();

router.get("/", async (req, res): Promise<void> => {
  const { sequenceId, status } = req.query;
  const conditions = [];
  if (sequenceId) conditions.push(eq(sequenceEnrollmentsTable.sequenceId, parseInt(sequenceId as string)));
  if (status) conditions.push(eq(sequenceEnrollmentsTable.status, status as string));

  const enrollments = await db.select().from(sequenceEnrollmentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(sequenceEnrollmentsTable.createdAt))
    .limit(100);

  res.json({ enrollments, total: enrollments.length });
});

router.post("/", async (req, res): Promise<void> => {
  const { sequenceId, contactEmail, contactName, leadId } = req.body;
  if (!sequenceId || !contactEmail) {
    res.status(400).json({ error: "sequenceId and contactEmail are required" });
    return;
  }

  const sessionUser = getSessionUser(req);
  const result = await enrollContact({
    sequenceId,
    contactEmail,
    contactName,
    leadId,
    enrolledBy: sessionUser?.name ?? "system",
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(201).json({ enrollmentId: result.enrollmentId });
});

router.post("/:id/pause", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const success = await pauseEnrollment(id);
  if (!success) { res.status(400).json({ error: "Cannot pause enrollment" }); return; }
  res.json({ success: true });
});

router.post("/:id/resume", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const success = await resumeEnrollment(id);
  if (!success) { res.status(400).json({ error: "Cannot resume enrollment" }); return; }
  res.json({ success: true });
});

router.delete("/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const success = await removeEnrollment(id);
  if (!success) { res.status(404).json({ error: "Enrollment not found" }); return; }
  res.status(204).send();
});

router.post("/advance", async (_req, res): Promise<void> => {
  const result = await advanceSequences();
  res.json(result);
});

export default router;
