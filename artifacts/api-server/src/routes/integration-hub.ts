import { Router, type IRouter } from "express";
import {
  getAvailableConnectors, buildOAuthAuthorizeUrl, generateOAuthState, validateOAuthState,
  exchangeOAuthToken, refreshOAuthTokenForProvider, connectWithApiKey,
  disconnectIntegration, getIntegrationStatus,
  processInboundWebhook, getRegisteredWebhookSources, generateWebhookSecret,
  getImportableEntities, validateFieldMapping, parseCsvContent, importCsvData,
  getSyncLogs, triggerSync, startSyncSchedule, stopSyncSchedule,
  retrySyncLog, getSyncHealth,
} from "../services/integration-hub-service";
import { getSessionUser } from "../middleware/auth";

const router: IRouter = Router();

router.get("/integration-hub/connectors", async (_req, res): Promise<void> => {
  res.json(getAvailableConnectors());
});

router.get("/integration-hub/status", async (req, res): Promise<void> => {
  const provider = req.query.provider as string | undefined;
  const statuses = await getIntegrationStatus(provider);
  res.json(statuses);
});

router.post("/integration-hub/oauth/authorize", async (req, res): Promise<void> => {
  const { provider, clientId, redirectUri, extraScopes } = req.body;
  if (!provider || !clientId || !redirectUri) {
    res.status(400).json({ error: "provider, clientId, and redirectUri are required" }); return;
  }
  const state = generateOAuthState();
  const result = buildOAuthAuthorizeUrl({ provider, clientId, redirectUri, state, extraScopes });
  if (result.error) { res.status(400).json({ error: result.error }); return; }
  res.json({ authorizeUrl: result.url, state });
});

router.post("/integration-hub/oauth/callback", async (req, res): Promise<void> => {
  const { provider, code, clientId, clientSecret, redirectUri, state } = req.body;
  if (!provider || !code || !clientId || !clientSecret || !redirectUri) {
    res.status(400).json({ error: "provider, code, clientId, clientSecret, and redirectUri are required" }); return;
  }
  if (!state || !validateOAuthState(state)) {
    res.status(403).json({ error: "Invalid or expired OAuth state" }); return;
  }
  const user = getSessionUser(req);
  const result = await exchangeOAuthToken({ provider, code, clientId, clientSecret, redirectUri, actor: user?.name ?? "admin" });
  if (!result.success) { res.status(400).json(result); return; }
  res.json(result);
});

router.post("/integration-hub/oauth/refresh", async (req, res): Promise<void> => {
  const { provider } = req.body;
  if (!provider) { res.status(400).json({ error: "provider is required" }); return; }
  const result = await refreshOAuthTokenForProvider(provider);
  res.json(result);
});

router.post("/integration-hub/connect-api-key", async (req, res): Promise<void> => {
  const { provider, apiKey, extraConfig } = req.body;
  if (!provider || !apiKey) { res.status(400).json({ error: "provider and apiKey are required" }); return; }
  const user = getSessionUser(req);
  const result = await connectWithApiKey({ provider, apiKey, extraConfig, actor: user?.name ?? "admin" });
  if (!result.success) { res.status(400).json(result); return; }
  res.json(result);
});

router.post("/integration-hub/disconnect", async (req, res): Promise<void> => {
  const { provider } = req.body;
  if (!provider) { res.status(400).json({ error: "provider is required" }); return; }
  const user = getSessionUser(req);
  const result = await disconnectIntegration({ provider, actor: user?.name ?? "admin" });
  if (!result.success) { res.status(400).json(result); return; }
  res.json(result);
});

router.get("/integration-hub/sync/logs", async (req, res): Promise<void> => {
  const { integrationId, direction, status, limit, offset } = req.query as Record<string, string | undefined>;
  const result = await getSyncLogs({
    integrationId, direction, status,
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
  });
  res.json(result);
});

router.get("/integration-hub/sync/health", async (_req, res): Promise<void> => {
  const health = await getSyncHealth();
  res.json(health);
});

router.post("/integration-hub/sync/trigger", async (req, res): Promise<void> => {
  const { integrationId } = req.body;
  if (!integrationId) { res.status(400).json({ error: "integrationId is required" }); return; }
  const result = await triggerSync(integrationId);
  res.json(result);
});

router.post("/integration-hub/sync/schedule", async (req, res): Promise<void> => {
  const { integrationId, frequencyMinutes } = req.body;
  if (!integrationId || !frequencyMinutes) {
    res.status(400).json({ error: "integrationId and frequencyMinutes are required" }); return;
  }
  const freq = Number(frequencyMinutes);
  if (!Number.isFinite(freq) || freq < 1 || freq > 1440) {
    res.status(400).json({ error: "frequencyMinutes must be between 1 and 1440" }); return;
  }
  const result = await startSyncSchedule(integrationId, freq * 60 * 1000);
  res.json(result);
});

router.post("/integration-hub/sync/stop", async (req, res): Promise<void> => {
  const { integrationId } = req.body;
  if (!integrationId) { res.status(400).json({ error: "integrationId is required" }); return; }
  stopSyncSchedule(integrationId);
  res.json({ success: true });
});

router.post("/integration-hub/sync/retry/:logId", async (req, res): Promise<void> => {
  const logId = parseInt(req.params.logId);
  if (isNaN(logId)) { res.status(400).json({ error: "Invalid log ID" }); return; }
  const result = await retrySyncLog(logId);
  if (!result.success) { res.status(422).json(result); return; }
  res.json(result);
});

router.get("/integration-hub/import/entities", async (_req, res): Promise<void> => {
  res.json(getImportableEntities());
});

router.post("/integration-hub/import/validate-mapping", async (req, res): Promise<void> => {
  const { entityType, fieldMapping } = req.body;
  if (!entityType || !fieldMapping) {
    res.status(400).json({ error: "entityType and fieldMapping are required" }); return;
  }
  const result = validateFieldMapping(entityType, fieldMapping);
  res.json(result);
});

router.post("/integration-hub/import/preview", async (req, res): Promise<void> => {
  const { csvContent } = req.body;
  if (!csvContent) { res.status(400).json({ error: "csvContent is required" }); return; }
  const parsed = parseCsvContent(csvContent);
  res.json({ headers: parsed.headers, sampleRows: parsed.rows.slice(0, 5), totalRows: parsed.rowCount });
});

router.post("/integration-hub/import/execute", async (req, res): Promise<void> => {
  const { entityType, csvContent, fieldMapping, skipDuplicates, dryRun } = req.body;
  if (!entityType || !csvContent || !fieldMapping) {
    res.status(400).json({ error: "entityType, csvContent, and fieldMapping are required" }); return;
  }
  const user = getSessionUser(req);
  const result = await importCsvData({
    entityType, csvContent, fieldMapping,
    actor: user?.name ?? "admin",
    skipDuplicates: skipDuplicates ?? true,
    dryRun: dryRun ?? false,
  });
  res.json(result);
});

router.get("/integration-hub/webhook/sources", async (_req, res): Promise<void> => {
  res.json(getRegisteredWebhookSources());
});

router.post("/integration-hub/webhook/generate-secret", async (req, res): Promise<void> => {
  const { source } = req.body;
  if (!source) { res.status(400).json({ error: "source is required" }); return; }
  const secret = generateWebhookSecret(source);
  res.json({ source, secret, instruction: "Set this as the webhook secret in your external tool. Webhooks will be verified using HMAC-SHA256." });
});

export default router;
