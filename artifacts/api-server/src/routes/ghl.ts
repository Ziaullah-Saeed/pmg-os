import { Router, type IRouter } from "express";
import { getGHLConfig, saveGHLConfig, testGHLConnection, getCRMMode, setCRMMode, pushLeadToGHL, type CRMMode } from "../services/ghl-service";
import { db, integrationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ghl/config", async (_req, res): Promise<void> => {
  const config = await getGHLConfig();
  res.json(config ?? { apiKey: "", locationId: "", baseUrl: "https://services.leadconnectorhq.com", webhookUrl: "", fieldMapping: {}, pipelineMapping: {} });
});

router.put("/ghl/config", async (req, res): Promise<void> => {
  await saveGHLConfig(req.body);
  const config = await getGHLConfig();
  res.json(config);
});

router.post("/ghl/test", async (_req, res): Promise<void> => {
  const result = await testGHLConnection();
  res.json(result);
});

router.get("/ghl/crm-mode", async (_req, res): Promise<void> => {
  const mode = await getCRMMode();
  res.json({ mode });
});

router.put("/ghl/crm-mode", async (req, res): Promise<void> => {
  const { mode } = req.body as { mode: CRMMode };
  if (!["internal", "ghl", "hybrid"].includes(mode)) {
    res.status(400).json({ error: "Invalid mode. Must be internal, ghl, or hybrid" });
    return;
  }
  await setCRMMode(mode);
  res.json({ mode });
});

router.post("/ghl/push-lead", async (req, res): Promise<void> => {
  const result = await pushLeadToGHL(req.body);
  res.json(result);
});

router.get("/ghl/sync-logs", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.type, "gohighlevel"))
    .limit(1);

  if (rows.length === 0) {
    res.json({ logs: [], total: 0 });
    return;
  }

  const config = rows[0].config as any;
  const logs = (config?.syncLogs ?? []).slice(0, limit);
  res.json({ logs, total: logs.length });
});

export default router;
