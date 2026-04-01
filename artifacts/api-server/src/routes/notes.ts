import { Router, type IRouter } from "express";
import { db, notesTable, followUpsTable, sopsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notes", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.query;
  let query = db.select().from(notesTable).orderBy(desc(notesTable.createdAt));
  if (entityType && entityId) {
    const results = await db.select().from(notesTable)
      .where(and(eq(notesTable.entityType, String(entityType)), eq(notesTable.entityId, String(entityId))))
      .orderBy(desc(notesTable.createdAt));
    res.json(results);
    return;
  }
  const results = await query.limit(100);
  res.json(results);
});

router.post("/notes", async (req, res): Promise<void> => {
  const { entityType, entityId, content, author, domain } = req.body;
  const [note] = await db.insert(notesTable).values({ entityType, entityId, content, author, domain }).returning();
  res.status(201).json(note);
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  await db.delete(notesTable).where(eq(notesTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

router.get("/follow-ups", async (req, res): Promise<void> => {
  const { entityType, entityId, status } = req.query;
  let results;
  if (entityType && entityId) {
    results = await db.select().from(followUpsTable)
      .where(and(eq(followUpsTable.entityType, String(entityType)), eq(followUpsTable.entityId, String(entityId))))
      .orderBy(desc(followUpsTable.dueDate));
  } else if (status) {
    results = await db.select().from(followUpsTable)
      .where(eq(followUpsTable.status, String(status)))
      .orderBy(desc(followUpsTable.dueDate));
  } else {
    results = await db.select().from(followUpsTable).orderBy(desc(followUpsTable.dueDate)).limit(100);
  }
  res.json(results);
});

router.post("/follow-ups", async (req, res): Promise<void> => {
  const { entityType, entityId, title, description, dueDate, assignedTo, domain } = req.body;
  const [followUp] = await db.insert(followUpsTable).values({
    entityType, entityId, title, description,
    dueDate: new Date(dueDate), assignedTo, domain,
  }).returning();
  res.status(201).json(followUp);
});

router.put("/follow-ups/:id", async (req, res): Promise<void> => {
  const { status } = req.body;
  const updates: any = { status };
  if (status === "completed") updates.completedAt = new Date();
  const [updated] = await db.update(followUpsTable).set(updates)
    .where(eq(followUpsTable.id, parseInt(req.params.id))).returning();
  res.json(updated);
});

router.get("/sops", async (req, res): Promise<void> => {
  const { category, domain } = req.query;
  let results;
  if (category) {
    results = await db.select().from(sopsTable).where(eq(sopsTable.category, String(category))).orderBy(desc(sopsTable.updatedAt));
  } else if (domain) {
    results = await db.select().from(sopsTable).where(eq(sopsTable.domain, String(domain))).orderBy(desc(sopsTable.updatedAt));
  } else {
    results = await db.select().from(sopsTable).orderBy(desc(sopsTable.updatedAt)).limit(100);
  }
  res.json(results);
});

router.post("/sops", async (req, res): Promise<void> => {
  const { title, category, content, version, domain, createdBy } = req.body;
  const [sop] = await db.insert(sopsTable).values({ title, category, content, version, domain, createdBy }).returning();
  res.status(201).json(sop);
});

router.put("/sops/:id", async (req, res): Promise<void> => {
  const { title, content, version, status } = req.body;
  const [updated] = await db.update(sopsTable).set({
    ...(title && { title }),
    ...(content && { content }),
    ...(version && { version }),
    ...(status && { status }),
    updatedAt: new Date(),
  }).where(eq(sopsTable.id, parseInt(req.params.id))).returning();
  res.json(updated);
});

router.delete("/sops/:id", async (req, res): Promise<void> => {
  await db.delete(sopsTable).where(eq(sopsTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});

export default router;
