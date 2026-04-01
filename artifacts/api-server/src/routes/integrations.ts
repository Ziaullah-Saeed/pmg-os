import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, integrationsTable } from "@workspace/db";
import {
  ListIntegrationsQueryParams, ListIntegrationsResponse,
  CreateIntegrationBody, GetIntegrationParams, GetIntegrationResponse,
  UpdateIntegrationParams, UpdateIntegrationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/integrations", async (req, res): Promise<void> => {
  const query = ListIntegrationsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(integrationsTable.status, query.data.status));
  if (query.data.type) conditions.push(eq(integrationsTable.type, query.data.type));
  if (query.data.provider) conditions.push(eq(integrationsTable.provider, query.data.provider));
  const results = await db.select().from(integrationsTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListIntegrationsResponse.parse(results));
});

router.post("/integrations", async (req, res): Promise<void> => {
  const parsed = CreateIntegrationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.insert(integrationsTable).values(parsed.data).returning();
  res.status(201).json(GetIntegrationResponse.parse(item));
});

router.get("/integrations/:id", async (req, res): Promise<void> => {
  const params = GetIntegrationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(integrationsTable).where(eq(integrationsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Integration not found" }); return; }
  res.json(GetIntegrationResponse.parse(item));
});

router.patch("/integrations/:id", async (req, res): Promise<void> => {
  const params = UpdateIntegrationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateIntegrationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.update(integrationsTable).set(parsed.data).where(eq(integrationsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Integration not found" }); return; }
  res.json(GetIntegrationResponse.parse(item));
});

export default router;
