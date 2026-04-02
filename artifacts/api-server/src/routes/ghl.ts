import { Router, type IRouter } from "express";
import {
  getGHLConfig, saveGHLConfig, testGHLConnection, getCRMMode, setCRMMode, pushLeadToGHL,
  getOAuthAuthorizeUrl, exchangeOAuthCode, refreshOAuthToken, handleGHLWebhook, pullContactsFromGHL,
  routeLead, getValidAccessToken,
  type CRMMode
} from "../services/ghl-service";
import { db, integrationsTable, leadsTable, contactsTable, companiesTable, syncLogsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
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

router.get("/ghl/field-mapping", requireRole("manager"), async (_req, res): Promise<void> => {
  const config = await getGHLConfig();
  res.json({
    fieldMapping: config?.fieldMapping ?? {
      name: "firstName",
      email: "email",
      phone: "phone",
      company: "companyName",
    },
    defaults: { name: "firstName", email: "email", phone: "phone", company: "companyName" },
  });
});

router.put("/ghl/field-mapping", requireRole("admin"), async (req, res): Promise<void> => {
  const config = await getGHLConfig();
  await saveGHLConfig({ ...config, fieldMapping: req.body.fieldMapping });
  res.json({ success: true, fieldMapping: req.body.fieldMapping });
});

router.get("/ghl/pipeline-mapping", requireRole("manager"), async (_req, res): Promise<void> => {
  const config = await getGHLConfig();
  res.json({
    pipelineMapping: config?.pipelineMapping ?? {},
    pmgStages: ["discovery", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"],
  });
});

router.put("/ghl/pipeline-mapping", requireRole("admin"), async (req, res): Promise<void> => {
  const config = await getGHLConfig();
  await saveGHLConfig({ ...config, pipelineMapping: req.body.pipelineMapping });
  res.json({ success: true, pipelineMapping: req.body.pipelineMapping });
});

router.post("/ghl/route-lead/:id", requireRole("manager"), async (req, res): Promise<void> => {
  const leadId = parseInt(req.params.id, 10);
  const { destination } = req.body as { destination: "pmg" | "ghl" | "both" | "hold" };

  if (!["pmg", "ghl", "both", "hold"].includes(destination)) {
    res.status(400).json({ error: "Invalid destination. Must be pmg, ghl, both, or hold" });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  await db.update(leadsTable).set({
    routingDestination: destination,
    retainCopy: true,
    routedAt: new Date(),
  }).where(eq(leadsTable.id, leadId));

  let ghlResult = null;
  if (destination === "ghl" || destination === "both") {
    const internalDest = destination === "ghl" ? "ghl" : "both";
    const result = await routeLead(leadId, internalDest);
    ghlResult = result.ghlResult;

    if (result.ghlResult?.ghlContactId) {
      await db.update(leadsTable).set({
        externalCrmId: result.ghlResult.ghlContactId,
        lastSyncedAt: new Date(),
      }).where(eq(leadsTable.id, leadId));
    }

    await db.insert(syncLogsTable).values({
      integrationId: "gohighlevel",
      direction: "outbound",
      entityType: "lead",
      entityId: String(leadId),
      externalId: result.ghlResult?.ghlContactId ?? null,
      status: result.ghlResult?.success ? "success" : "failed",
      error: result.ghlResult?.error ?? null,
      payload: { destination, leadName: lead.assignedTo },
      routingDestination: destination,
    });
  }

  res.json({
    success: true,
    leadId,
    destination,
    retainCopy: true,
    externalCrmId: ghlResult?.ghlContactId ?? lead.externalCrmId,
    ghlResult,
  });
});

router.post("/ghl/route-bulk", requireRole("manager"), async (req, res): Promise<void> => {
  const { leadIds, destination } = req.body as { leadIds: number[]; destination: "pmg" | "ghl" | "both" | "hold" };
  if (!leadIds?.length || !["pmg", "ghl", "both", "hold"].includes(destination)) {
    res.status(400).json({ error: "leadIds and valid destination required" });
    return;
  }

  const results: any[] = [];
  for (const id of leadIds.slice(0, 50)) {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
    if (!lead) { results.push({ id, success: false, error: "Not found" }); continue; }

    await db.update(leadsTable).set({ routingDestination: destination, retainCopy: true, routedAt: new Date() }).where(eq(leadsTable.id, id));

    if (destination === "ghl" || destination === "both") {
      const result = await routeLead(id, destination === "ghl" ? "ghl" : "both");
      if (result.ghlResult?.ghlContactId) {
        await db.update(leadsTable).set({ externalCrmId: result.ghlResult.ghlContactId, lastSyncedAt: new Date() }).where(eq(leadsTable.id, id));
      }
      await db.insert(syncLogsTable).values({
        integrationId: "gohighlevel", direction: "outbound", entityType: "lead",
        entityId: String(id), externalId: result.ghlResult?.ghlContactId ?? null,
        status: result.ghlResult?.success ? "success" : "failed",
        error: result.ghlResult?.error ?? null,
        payload: { destination }, routingDestination: destination,
      });
      results.push({ id, success: result.ghlResult?.success, externalCrmId: result.ghlResult?.ghlContactId });
    } else {
      results.push({ id, success: true, destination });
    }
  }
  res.json({ total: results.length, results });
});

router.post("/ghl/push-lead", requireRole("manager"), async (req, res): Promise<void> => {
  const result = await pushLeadToGHL(req.body);
  if (result.success && req.body.id) {
    await db.update(leadsTable).set({ externalCrmId: result.ghlContactId, lastSyncedAt: new Date() }).where(eq(leadsTable.id, req.body.id));
    await db.insert(syncLogsTable).values({
      integrationId: "gohighlevel", direction: "outbound", entityType: "lead",
      entityId: String(req.body.id), externalId: result.ghlContactId ?? null,
      status: "success", payload: req.body,
    });
  }
  res.json(result);
});

router.get("/ghl/sync-logs", requireRole("manager"), async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const entityType = req.query.entityType as string | undefined;
  const status = req.query.status as string | undefined;
  const direction = req.query.direction as string | undefined;

  let query = db.select().from(syncLogsTable).$dynamic();

  const conditions = [eq(syncLogsTable.integrationId, "gohighlevel")];
  if (entityType) conditions.push(eq(syncLogsTable.entityType, entityType));
  if (status) conditions.push(eq(syncLogsTable.status, status));
  if (direction) conditions.push(eq(syncLogsTable.direction, direction));

  const logs = await db.select().from(syncLogsTable)
    .where(and(...conditions))
    .orderBy(desc(syncLogsTable.createdAt))
    .limit(limit);

  const total = logs.length;
  const failed = logs.filter(l => l.status === "failed").length;
  const succeeded = logs.filter(l => l.status === "success").length;

  res.json({ logs, total, failed, succeeded });
});

router.post("/ghl/sync-retry/:id", requireRole("manager"), async (req, res): Promise<void> => {
  const logId = parseInt(req.params.id, 10);
  if (isNaN(logId)) {
    res.status(400).json({ error: "Invalid log id" });
    return;
  }

  const [log] = await db.select().from(syncLogsTable).where(eq(syncLogsTable.id, logId));
  if (!log) {
    res.status(404).json({ error: "Sync log entry not found" });
    return;
  }

  if (log.entityType === "lead" && log.entityId) {
    const leadId = parseInt(log.entityId, 10);
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const result = await pushLeadToGHL({
      id: lead.id,
      name: lead.assignedTo ?? `Lead #${lead.id}`,
      source: lead.source,
      score: lead.fitScore,
    });

    await db.update(syncLogsTable).set({
      status: result.success ? "retried_success" : "retried_failed",
      retriedAt: new Date(),
      externalId: result.ghlContactId ?? log.externalId,
    }).where(eq(syncLogsTable.id, logId));

    if (result.success && result.ghlContactId) {
      await db.update(leadsTable).set({ externalCrmId: result.ghlContactId, lastSyncedAt: new Date() }).where(eq(leadsTable.id, leadId));
    }

    res.json({ success: result.success, result });
  } else {
    res.status(400).json({ error: "Retry not supported for this entity type yet" });
  }
});

router.get("/ghl/retry-queue", requireRole("manager"), async (_req, res): Promise<void> => {
  const failed = await db.select().from(syncLogsTable)
    .where(and(
      eq(syncLogsTable.integrationId, "gohighlevel"),
      eq(syncLogsTable.status, "failed"),
    ))
    .orderBy(desc(syncLogsTable.createdAt))
    .limit(100);

  res.json({ queue: failed, total: failed.length });
});

router.post("/ghl/retry-all-failed", requireRole("manager"), async (_req, res): Promise<void> => {
  const failed = await db.select().from(syncLogsTable)
    .where(and(
      eq(syncLogsTable.integrationId, "gohighlevel"),
      eq(syncLogsTable.status, "failed"),
    ))
    .orderBy(desc(syncLogsTable.createdAt))
    .limit(20);

  const results: any[] = [];
  for (const log of failed) {
    if (log.entityType === "lead" && log.entityId) {
      const leadId = parseInt(log.entityId, 10);
      const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
      if (!lead) continue;
      const result = await pushLeadToGHL({
        id: lead.id, name: lead.assignedTo ?? `Lead #${lead.id}`, source: lead.source, score: lead.fitScore,
      });
      await db.update(syncLogsTable).set({
        status: result.success ? "retried_success" : "retried_failed", retriedAt: new Date(),
      }).where(eq(syncLogsTable.id, log.id));
      results.push({ logId: log.id, success: result.success });
    }
  }
  res.json({ retried: results.length, results });
});

router.post("/ghl/sync-notes", requireRole("manager"), async (req, res): Promise<void> => {
  const { entityType, entityId, notes } = req.body as { entityType: string; entityId: number; notes: string };
  const token = await getValidAccessToken();
  const config = await getGHLConfig();

  if (!token || !config?.locationId) {
    res.status(400).json({ error: "GHL not configured" });
    return;
  }

  let externalId: string | null = null;
  if (entityType === "lead") {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, entityId));
    externalId = lead?.externalCrmId ?? null;
  } else if (entityType === "contact") {
    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, entityId));
    externalId = contact?.externalCrmId ?? null;
  }

  if (!externalId) {
    res.status(400).json({ error: "No external CRM ID found. Sync entity to GHL first." });
    return;
  }

  try {
    const response = await fetch(`${config.baseUrl || "https://services.leadconnectorhq.com"}/contacts/${externalId}/notes/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({ body: notes, userId: config.locationId }),
    });

    await db.insert(syncLogsTable).values({
      integrationId: "gohighlevel", direction: "outbound", entityType: "note",
      entityId: String(entityId), externalId,
      status: response.ok ? "success" : "failed",
      error: response.ok ? null : `Status ${response.status}`,
      payload: { notes: notes.slice(0, 200) },
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(response.status).json({ error: `GHL returned ${response.status}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/ghl/sync-contact/:id", requireRole("manager"), async (req, res): Promise<void> => {
  const contactId = parseInt(req.params.id, 10);
  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, contactId));
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }

  const token = await getValidAccessToken();
  const config = await getGHLConfig();
  if (!token || !config?.locationId) { res.status(400).json({ error: "GHL not configured" }); return; }

  const mapping = config.fieldMapping || {};
  const payload: Record<string, unknown> = {
    [mapping.name || "firstName"]: contact.firstName,
    lastName: contact.lastName,
    [mapping.email || "email"]: contact.email,
    [mapping.phone || "phone"]: contact.phone,
    [mapping.company || "companyName"]: contact.title,
    locationId: config.locationId,
    tags: ["pmg-os", "contact-sync"],
    customField: { pmg_contact_id: contact.id },
  };

  try {
    const method = contact.externalCrmId ? "PUT" : "POST";
    const url = contact.externalCrmId
      ? `${config.baseUrl || "https://services.leadconnectorhq.com"}/contacts/${contact.externalCrmId}`
      : `${config.baseUrl || "https://services.leadconnectorhq.com"}/contacts/`;

    const response = await fetch(url, {
      method,
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Version": "2021-07-28" },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { contact?: { id?: string } };
    const ghlId = data.contact?.id ?? contact.externalCrmId;

    if (response.ok && ghlId) {
      await db.update(contactsTable).set({ externalCrmId: ghlId, lastSyncedAt: new Date() }).where(eq(contactsTable.id, contactId));
    }

    await db.insert(syncLogsTable).values({
      integrationId: "gohighlevel", direction: "outbound", entityType: "contact",
      entityId: String(contactId), externalId: ghlId ?? null,
      status: response.ok ? "success" : "failed",
      error: response.ok ? null : `Status ${response.status}`,
      payload: { contactName: `${contact.firstName} ${contact.lastName}` },
    });

    res.json({ success: response.ok, externalCrmId: ghlId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ghl/sync-health", requireRole("manager"), async (_req, res): Promise<void> => {
  const allLogs = await db.select().from(syncLogsTable)
    .where(eq(syncLogsTable.integrationId, "gohighlevel"))
    .orderBy(desc(syncLogsTable.createdAt))
    .limit(500);

  const leadsWithExtId = await db.select().from(leadsTable);
  const contactsWithExtId = await db.select().from(contactsTable);

  const leadsSynced = (leadsWithExtId as any[]).filter(l => l.externalCrmId).length;
  const leadsTotal = leadsWithExtId.length;
  const contactsSynced = (contactsWithExtId as any[]).filter(c => c.externalCrmId).length;
  const contactsTotal = contactsWithExtId.length;

  const last24h = allLogs.filter(l => l.createdAt && new Date(l.createdAt).getTime() > Date.now() - 86400000);
  const failedLast24h = last24h.filter(l => l.status === "failed").length;
  const successLast24h = last24h.filter(l => l.status === "success").length;

  const config = await getGHLConfig();
  const mode = config?.crmMode ?? "internal";

  const integration = await db.select().from(integrationsTable).where(eq(integrationsTable.type, "gohighlevel")).limit(1);
  const connectionStatus = integration.length > 0 ? integration[0].status : "disconnected";
  const lastSyncAt = integration.length > 0 ? integration[0].lastSyncAt : null;

  const totalSynced = successLast24h + leadsSynced + contactsSynced;
  const totalFailed = failedLast24h;
  const healthScore = (totalSynced + totalFailed) > 0 ? Math.round((totalSynced / (totalSynced + totalFailed)) * 100) : 100;
  const status = connectionStatus === "active" || config?.apiKey ? "healthy" : "standby";

  res.json({
    connectionStatus,
    status,
    crmMode: mode,
    lastSyncAt,
    totalSynced,
    totalFailed,
    healthScore,
    entities: {
      leads: { synced: leadsSynced, total: leadsTotal, pending: leadsTotal - leadsSynced },
      contacts: { synced: contactsSynced, total: contactsTotal, pending: contactsTotal - contactsSynced },
    },
    last24h: { success: successLast24h, failed: failedLast24h, total: last24h.length },
    retryQueue: allLogs.filter(l => l.status === "failed").length,
  });
});

router.get("/ghl/routing-summary", requireRole("manager"), async (_req, res): Promise<void> => {
  const allLeads = await db.select().from(leadsTable);
  const leads = allLeads as any[];
  const summary = {
    pmg: leads.filter(l => !l.routingDestination || l.routingDestination === "pmg").length,
    ghl: leads.filter(l => l.routingDestination === "ghl").length,
    both: leads.filter(l => l.routingDestination === "both").length,
    hold: leads.filter(l => l.routingDestination === "hold").length,
    total: leads.length,
    withExternalId: leads.filter(l => l.externalCrmId).length,
    retainedCopies: leads.filter(l => l.retainCopy).length,
  };
  res.json(summary);
});

router.post("/ghl/sync-all", requireRole("manager"), async (req, res): Promise<void> => {
  const { entityType, entityIds } = req.body as { entityType?: string; entityIds?: number[] };
  const results: any[] = [];

  if (entityType === "leads" && entityIds?.length) {
    for (const id of entityIds.slice(0, 50)) {
      const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
      if (!lead) { results.push({ id, status: "error", error: "Lead not found" }); continue; }
      const result = await pushLeadToGHL({
        id: lead.id, name: lead.assignedTo ?? `Lead ${lead.id}`, source: lead.source, score: lead.fitScore,
      });
      if (result.success && result.ghlContactId) {
        await db.update(leadsTable).set({ externalCrmId: result.ghlContactId, lastSyncedAt: new Date() }).where(eq(leadsTable.id, id));
      }
      await db.insert(syncLogsTable).values({
        integrationId: "gohighlevel", direction: "outbound", entityType: "lead",
        entityId: String(id), externalId: result.ghlContactId ?? null,
        status: result.success ? "success" : "failed", error: result.error ?? null,
        payload: { name: lead.assignedTo },
      });
      results.push({ id, status: result.success ? "success" : "error", error: result.error, externalCrmId: result.ghlContactId });
    }
  }

  res.json({ synced: results.length, results });
});

router.get("/ghl/oauth/authorize", requireRole("admin"), async (req, res): Promise<void> => {
  const { clientId, redirectUri } = req.query as { clientId?: string; redirectUri?: string };
  if (!clientId || !redirectUri) {
    res.status(400).json({ error: "clientId and redirectUri query params are required" });
    return;
  }
  const url = getOAuthAuthorizeUrl(clientId, redirectUri);
  res.json({ authorizeUrl: url });
});

router.post("/ghl/oauth/callback", requireRole("admin"), async (req, res): Promise<void> => {
  const { code, clientId, clientSecret, redirectUri } = req.body as {
    code: string; clientId: string; clientSecret: string; redirectUri: string;
  };
  if (!code || !clientId || !clientSecret || !redirectUri) {
    res.status(400).json({ error: "code, clientId, clientSecret, and redirectUri are required" });
    return;
  }
  const result = await exchangeOAuthCode(code, clientId, clientSecret, redirectUri);
  if (result.success) {
    res.json({ success: true, message: "OAuth connected successfully" });
  } else {
    res.status(400).json(result);
  }
});

router.post("/ghl/oauth/refresh", requireRole("admin"), async (_req, res): Promise<void> => {
  const result = await refreshOAuthToken();
  res.json(result);
});

router.post("/ghl/pull-contacts", requireRole("manager"), async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.body?.limit) || 50, 200);
  const result = await pullContactsFromGHL(limit);
  res.json(result);
});

export default router;
