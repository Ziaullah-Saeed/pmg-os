import { Router, type IRouter } from "express";
import { getGHLConfig, saveGHLConfig, testGHLConnection, getCRMMode, setCRMMode, pushLeadToGHL, type CRMMode } from "../services/ghl-service";
import { db, integrationsTable, leadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middleware/rbac";

const router: IRouter = Router();

router.get("/ghl/config", requireRole("admin"), async (_req, res): Promise<void> => {
  const config = await getGHLConfig();
  res.json(config ?? { apiKey: "", locationId: "", baseUrl: "https://services.leadconnectorhq.com", webhookUrl: "", fieldMapping: {}, pipelineMapping: {} });
});

router.put("/ghl/config", requireRole("admin"), async (req, res): Promise<void> => {
  await saveGHLConfig(req.body);
  const config = await getGHLConfig();
  res.json(config);
});

router.post("/ghl/test", requireRole("admin"), async (_req, res): Promise<void> => {
  const result = await testGHLConnection();
  res.json(result);
});

router.get("/ghl/crm-mode", async (_req, res): Promise<void> => {
  const mode = await getCRMMode();
  res.json({ mode });
});

router.put("/ghl/crm-mode", requireRole("admin"), async (req, res): Promise<void> => {
  const { mode } = req.body as { mode: CRMMode };
  if (!["internal", "ghl", "hybrid"].includes(mode)) {
    res.status(400).json({ error: "Invalid mode. Must be internal, ghl, or hybrid" });
    return;
  }
  await setCRMMode(mode);
  res.json({ mode });
});

router.post("/ghl/push-lead", requireRole("manager"), async (req, res): Promise<void> => {
  const result = await pushLeadToGHL(req.body);
  res.json(result);
});

router.get("/ghl/sync-logs", requireRole("manager"), async (req, res): Promise<void> => {
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

router.post("/ghl/sync-retry/:logIndex", requireRole("manager"), async (req, res): Promise<void> => {
  const logIndex = parseInt(req.params.logIndex, 10);
  if (isNaN(logIndex)) {
    res.status(400).json({ error: "Invalid log index" });
    return;
  }

  const rows = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.type, "gohighlevel"))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "No GHL integration configured" });
    return;
  }

  const config = rows[0].config as any;
  const logs = config?.syncLogs ?? [];
  if (logIndex < 0 || logIndex >= logs.length) {
    res.status(404).json({ error: "Sync log entry not found" });
    return;
  }

  const entry = logs[logIndex];
  const leadPayload = entry.payload ?? entry.data ?? {};
  const result = await pushLeadToGHL(leadPayload);
  logs[logIndex] = {
    ...entry,
    status: result.success ? "retried" : "retry_failed",
    retriedAt: new Date().toISOString(),
    result,
  };
  await db.update(integrationsTable)
    .set({ config: { ...config, syncLogs: logs } })
    .where(eq(integrationsTable.id, rows[0].id));

  if (result.success) {
    res.json({ success: true, result });
  } else {
    res.status(500).json({ success: false, error: result.error, result });
  }
});

router.post("/ghl/sync-all", requireRole("manager"), async (req, res): Promise<void> => {
  const { entityType, entityIds } = req.body as { entityType?: string; entityIds?: number[] };
  const results: any[] = [];

  if (entityType === "leads" && entityIds?.length) {
    for (const id of entityIds.slice(0, 50)) {
      const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
      if (!lead) {
        results.push({ id, status: "error", error: "Lead not found" });
        continue;
      }
      const result = await pushLeadToGHL({
        id: lead.id,
        name: lead.assignedTo ?? `Lead ${lead.id}`,
        source: lead.source,
        score: lead.fitScore,
      });
      results.push({ id, status: result.success ? "success" : "error", error: result.error, result });
    }
  }

  res.json({ synced: results.length, results });
});

export default router;
