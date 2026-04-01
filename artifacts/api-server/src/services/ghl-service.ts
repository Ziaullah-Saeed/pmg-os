import { db, integrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { chargeWallet } from "./wallet-service";

type GHLConfig = {
  apiKey: string;
  locationId: string;
  baseUrl: string;
  webhookUrl?: string;
  fieldMapping: Record<string, string>;
  pipelineMapping: Record<string, string>;
};

type SyncResult = {
  success: boolean;
  ghlContactId?: string;
  error?: string;
  timestamp: string;
};

export async function getGHLConfig(): Promise<GHLConfig | null> {
  const rows = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.type, "gohighlevel"));
  if (rows.length === 0) return null;
  const row = rows[0];
  return row.config as GHLConfig;
}

export async function saveGHLConfig(config: Partial<GHLConfig>): Promise<void> {
  const existing = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.type, "gohighlevel"));

  if (existing.length === 0) {
    await db.insert(integrationsTable).values({
      name: "GoHighLevel",
      type: "gohighlevel",
      provider: "gohighlevel",
      status: "configured",
      config,
    });
  } else {
    await db.update(integrationsTable).set({
      config: { ...existing[0].config as object, ...config },
      status: "configured",
    }).where(eq(integrationsTable.id, existing[0].id));
  }
}

export async function testGHLConnection(): Promise<{ connected: boolean; error?: string }> {
  const config = await getGHLConfig();
  if (!config || !config.apiKey) {
    return { connected: false, error: "No GHL API key configured" };
  }

  try {
    const response = await fetch(`${config.baseUrl || "https://services.leadconnectorhq.com"}/locations/${config.locationId}`, {
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Version": "2021-07-28",
      },
    });

    if (response.ok) {
      await db.update(integrationsTable)
        .set({ status: "active", lastSyncAt: new Date() })
        .where(eq(integrationsTable.type, "gohighlevel"));
      return { connected: true };
    }
    return { connected: false, error: `GHL returned status ${response.status}` };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

export async function pushLeadToGHL(lead: {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  score?: number | null;
  aiSummary?: string;
  tags?: string[];
}): Promise<SyncResult> {
  const config = await getGHLConfig();
  if (!config || !config.apiKey) {
    return { success: false, error: "GHL not configured", timestamp: new Date().toISOString() };
  }

  const walletResult = await chargeWallet({
    tool: "ghl-sync-lead",
    domain: "crm",
    action: "push_lead_to_ghl",
    entityType: "lead",
    entityId: lead.id,
  });

  if (!walletResult.success) {
    return { success: false, error: "Insufficient wallet balance for GHL sync", timestamp: new Date().toISOString() };
  }

  const mapping = config.fieldMapping || {};
  const payload: Record<string, unknown> = {
    [mapping.name || "firstName"]: lead.name,
    [mapping.email || "email"]: lead.email,
    [mapping.phone || "phone"]: lead.phone,
    [mapping.company || "companyName"]: lead.company,
    source: lead.source ?? "PMG OS",
    tags: [...(lead.tags ?? []), "pmg-os", `score-${lead.score ?? "unscored"}`],
    customField: {
      pmg_lead_id: lead.id,
      pmg_score: lead.score,
      pmg_ai_summary: lead.aiSummary?.slice(0, 500),
    },
  };

  try {
    const response = await fetch(`${config.baseUrl || "https://services.leadconnectorhq.com"}/contacts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        ...payload,
        locationId: config.locationId,
      }),
    });

    if (response.ok) {
      const data = await response.json() as { contact?: { id?: string } };
      await createNotification({
        type: "ghl_sync_success",
        severity: "info",
        title: "Lead Synced to GHL",
        message: `Lead "${lead.name}" pushed to GoHighLevel successfully`,
        domain: "crm",
        entityType: "lead",
        entityId: lead.id,
        actor: "ghl_sync",
      });
      return {
        success: true,
        ghlContactId: data.contact?.id,
        timestamp: new Date().toISOString(),
      };
    }

    const errorText = await response.text();
    await logSyncFailure(lead.id, "lead", errorText);
    return { success: false, error: errorText, timestamp: new Date().toISOString() };
  } catch (err: any) {
    await logSyncFailure(lead.id, "lead", err.message);
    return { success: false, error: err.message, timestamp: new Date().toISOString() };
  }
}

async function logSyncFailure(entityId: number, entityType: string, error: string) {
  await createNotification({
    type: "ghl_sync_failure",
    severity: "error",
    title: "GHL Sync Failed",
    message: `Failed to sync ${entityType} #${entityId}: ${error.slice(0, 200)}`,
    domain: "crm",
    entityType,
    entityId,
    actor: "ghl_sync",
    metadata: { error, retryable: true },
  });
}

export type CRMMode = "internal" | "ghl" | "hybrid";

export async function getCRMMode(): Promise<CRMMode> {
  const config = await getGHLConfig();
  if (!config) return "internal";
  const mode = (config as any).crmMode;
  return mode ?? "internal";
}

export async function setCRMMode(mode: CRMMode): Promise<void> {
  const config = await getGHLConfig();
  await saveGHLConfig({ ...config, ...({ crmMode: mode } as any) });
}

export async function routeLead(leadId: number, destination: "internal" | "ghl" | "both" | "hold"): Promise<{
  routed: boolean;
  destination: string;
  ghlResult?: SyncResult;
}> {
  if (destination === "hold") {
    return { routed: false, destination: "hold" };
  }

  if (destination === "internal") {
    return { routed: true, destination: "internal" };
  }

  return { routed: false, destination, ghlResult: { success: false, error: "GHL not configured — configure API key first", timestamp: new Date().toISOString() } };
}
