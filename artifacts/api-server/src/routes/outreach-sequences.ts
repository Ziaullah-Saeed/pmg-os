import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, outreachSequencesTable } from "@workspace/db";
import {
  ListOutreachSequencesQueryParams, ListOutreachSequencesResponse,
  CreateOutreachSequenceBody, GetOutreachSequenceParams, GetOutreachSequenceResponse,
  UpdateOutreachSequenceParams, UpdateOutreachSequenceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/outreach-sequences", async (req, res): Promise<void> => {
  const query = ListOutreachSequencesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(outreachSequencesTable.status, query.data.status));
  if (query.data.type) conditions.push(eq(outreachSequencesTable.type, query.data.type));
  if (query.data.channel) conditions.push(eq(outreachSequencesTable.channel, query.data.channel));
  const results = await db.select().from(outreachSequencesTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListOutreachSequencesResponse.parse(results));
});

router.post("/outreach-sequences", async (req, res): Promise<void> => {
  const parsed = CreateOutreachSequenceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.insert(outreachSequencesTable).values(parsed.data).returning();
  res.status(201).json(GetOutreachSequenceResponse.parse(item));
});

router.get("/outreach-sequences/:id", async (req, res): Promise<void> => {
  const params = GetOutreachSequenceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(outreachSequencesTable).where(eq(outreachSequencesTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Outreach sequence not found" }); return; }
  res.json(GetOutreachSequenceResponse.parse(item));
});

router.patch("/outreach-sequences/:id", async (req, res): Promise<void> => {
  const params = UpdateOutreachSequenceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateOutreachSequenceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.update(outreachSequencesTable).set(parsed.data).where(eq(outreachSequencesTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Outreach sequence not found" }); return; }
  res.json(GetOutreachSequenceResponse.parse(item));
});

export default router;
