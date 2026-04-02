import { db, integrationsTable, leadsTable, contactsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { chargeWallet } from "./wallet-service";
import { logAudit } from "./audit-service";

type GHLConfig = {
  apiKey: string;
  locationId: string;
  baseUrl: string;
  webhookUrl?: string;
  fieldMapping: Record<string, string>;
  pipelineMapping: Record<string, string>;
  oauth?: {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scopes?: string[];
  };
  crmMode?: string;
  syncLogs?: any[];
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
  const token = await getValidAccessToken();
  if (!token) {
    return { connected: false, error: "No GHL credentials configured (set OAuth or API key)" };
  }

  try {
    const response = await fetch(`${config?.baseUrl || "https://services.leadconnectorhq.com"}/locations/${config?.locationId}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
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
  const token = await getValidAccessToken();
  if (!token) {
    return { success: false, error: "GHL not configured — set up OAuth or API key", timestamp: new Date().toISOString() };
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

  const mapping = config?.fieldMapping || {};
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
    const response = await fetch(`${config?.baseUrl || "https://services.leadconnectorhq.com"}/contacts/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        ...payload,
        locationId: config?.locationId,
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

  const config = await getGHLConfig();
  const token = await getValidAccessToken();
  if (!token && (!config || !config.apiKey)) {
    return { routed: false, destination, ghlResult: { success: false, error: "GHL not configured — configure OAuth or API key first", timestamp: new Date().toISOString() } };
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) {
    return { routed: false, destination, ghlResult: { success: false, error: "Lead not found", timestamp: new Date().toISOString() } };
  }

  const ghlResult = await pushLeadToGHL({
    id: lead.id,
    name: lead.assignedTo ?? `Lead #${lead.id}`,
    source: lead.source,
    score: lead.fitScore,
  });

  return {
    routed: ghlResult.success,
    destination,
    ghlResult,
  };
}

export function getOAuthAuthorizeUrl(clientId: string, redirectUri: string, scopes: string[] = ["contacts.readonly", "contacts.write", "locations.readonly"]): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
  });
  return `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `OAuth exchange failed: ${errText}` };
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      locationId: string;
    };

    const config = await getGHLConfig();
    await saveGHLConfig({
      ...config,
      locationId: data.locationId,
      oauth: {
        clientId,
        clientSecret,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        scopes: ["contacts.readonly", "contacts.write", "locations.readonly"],
      },
    } as any);

    await db.update(integrationsTable)
      .set({ status: "active", lastSyncAt: new Date() })
      .where(eq(integrationsTable.type, "gohighlevel"));

    await logAudit({
      eventType: "ghl_oauth_connected",
      domain: "integration",
      action: "oauth_token_exchanged",
      description: "GoHighLevel OAuth connected successfully",
      actor: "system",
      actorType: "system",
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function refreshOAuthToken(): Promise<{ success: boolean; error?: string }> {
  const config = await getGHLConfig();
  if (!config?.oauth?.refreshToken || !config?.oauth?.clientId || !config?.oauth?.clientSecret) {
    return { success: false, error: "No OAuth refresh token available" };
  }

  try {
    const response = await fetch("https://services.leadconnectorhq.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.oauth.refreshToken,
        client_id: config.oauth.clientId,
        client_secret: config.oauth.clientSecret,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Token refresh failed: ${errText}` };
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    await saveGHLConfig({
      ...config,
      oauth: {
        ...config.oauth,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      },
    } as any);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const config = await getGHLConfig();
  if (!config?.oauth?.accessToken) return config?.apiKey ?? null;

  if (config.oauth.expiresAt && Date.now() > config.oauth.expiresAt - 300000) {
    const refreshResult = await refreshOAuthToken();
    if (!refreshResult.success) {
      console.error("[GHL] Token refresh failed:", refreshResult.error);
      return config.apiKey ?? null;
    }
    const updatedConfig = await getGHLConfig();
    return updatedConfig?.oauth?.accessToken ?? updatedConfig?.apiKey ?? null;
  }

  return config.oauth.accessToken;
}

async function directProcessWebhook(event: string, ghlContact: any): Promise<void> {
  const email = ghlContact.email;
  if (email) {
    const [existing] = await db.select().from(contactsTable).where(eq(contactsTable.email, email));
    if (existing) {
      await db.update(contactsTable).set({
        firstName: ghlContact.firstName ?? existing.firstName,
        lastName: ghlContact.lastName ?? existing.lastName,
        phone: ghlContact.phone ?? existing.phone,
      }).where(eq(contactsTable.id, existing.id));
    } else {
      await db.insert(contactsTable).values({
        firstName: ghlContact.firstName ?? "Unknown",
        lastName: ghlContact.lastName ?? "",
        email,
        phone: ghlContact.phone,
        status: "active",
      });
    }
  }

  await logAudit({
    eventType: "ghl_webhook_processed",
    domain: "integration",
    action: event.toLowerCase(),
    description: `GHL webhook: ${event} for ${email ?? "unknown contact"}`,
    actor: "ghl_webhook",
    actorType: "system",
    metadata: { ghlEvent: event, email },
  });
}

export async function handleGHLWebhook(event: string, payload: any): Promise<{ processed: boolean; queued?: boolean }> {
  try {
    if (event === "ContactCreate" || event === "ContactUpdate") {
      const ghlContact = payload;
      const email = ghlContact.email;

      const { executeOrQueue } = await import("./mode-action-service");
      const result = await executeOrQueue({
        actionType: "ghl_webhook_sync",
        workflowKey: "lead_routing",
        entityType: "contact",
        title: `GHL Sync: ${event} — ${email ?? "unknown"}`,
        description: `GoHighLevel ${event} webhook received for ${ghlContact.firstName ?? ""} ${ghlContact.lastName ?? ""} (${email ?? "no email"}). This will ${event === "ContactCreate" ? "create" : "update"} the contact in PMG OS.`,
        confidence: 90,
        options: [
          { id: "approve", label: "Sync Contact", description: `${event === "ContactCreate" ? "Create" : "Update"} contact from GHL data`, isAiRecommended: true },
          { id: "skip", label: "Ignore", description: "Don't sync this contact" },
        ],
        aiRecommendation: `Sync ${event === "ContactCreate" ? "new" : "updated"} contact from GHL`,
        aiParts: "System receives GHL webhook, maps contact fields (name, email, phone), detects existing records by email",
        humanParts: "Review incoming GHL contact data, confirm sync into PMG OS, approve or reject",
        metadata: { event, ghlContact },
        executeAction: async () => {
          await directProcessWebhook(event, ghlContact);
        },
      });

      return { processed: result.executed, queued: result.queued };
    }

    return { processed: false };
  } catch (err: any) {
    console.error("[GHL Webhook] Error:", err.message);
    return { processed: false };
  }
}

export async function pullContactsFromGHL(limit: number = 50): Promise<{
  imported: number;
  errors: string[];
}> {
  const token = await getValidAccessToken();
  const config = await getGHLConfig();
  if (!token || !config?.locationId) {
    return { imported: 0, errors: ["GHL not configured or no valid token"] };
  }

  try {
    const response = await fetch(
      `${config.baseUrl || "https://services.leadconnectorhq.com"}/contacts/?locationId=${config.locationId}&limit=${limit}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Version": "2021-07-28",
        },
      }
    );

    if (!response.ok) {
      return { imported: 0, errors: [`GHL API returned ${response.status}`] };
    }

    const data = await response.json() as { contacts?: any[] };
    const contacts = data.contacts ?? [];
    let imported = 0;
    const errors: string[] = [];

    for (const c of contacts) {
      try {
        const email = c.email;
        if (email) {
          const [existing] = await db.select().from(contactsTable).where(eq(contactsTable.email, email));
          if (!existing) {
            await db.insert(contactsTable).values({
              firstName: c.firstName ?? c.name ?? "Unknown",
              lastName: c.lastName ?? "",
              email,
              phone: c.phone,
              status: "active",
            });
            imported++;
          }
        }
      } catch (err: any) {
        errors.push(`Failed to import ${c.email ?? "unknown"}: ${err.message}`);
      }
    }

    return { imported, errors };
  } catch (err: any) {
    return { imported: 0, errors: [err.message] };
  }
}

export async function lookupGHLContactId(internalContactId: number): Promise<string | undefined> {
  const rows = await db.select().from(integrationsTable).where(eq(integrationsTable.type, "gohighlevel"));
  if (rows.length === 0) return undefined;
  const config = rows[0].config as GHLConfig;
  const syncLogs = config?.syncLogs ?? [];
  const match = syncLogs.find((l: any) => l.internalId === internalContactId && l.ghlContactId);
  return match?.ghlContactId;
}

export function registerGHLExecutors(): void {
  const { registerActionExecutor } = require("./mode-action-service");

  registerActionExecutor("ghl_webhook_sync", async (metadata: any, option: string) => {
    if (option === "approve") {
      await directProcessWebhook(metadata.event, metadata.ghlContact);
    }
  });
}
