import { db, integrationsTable, syncLogsTable, leadsTable, contactsTable, companiesTable, opportunitiesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { emit } from "./event-bus";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";

const SUPPORTED_PROVIDERS: Record<string, {
  name: string;
  type: string;
  authMethod: "oauth2" | "api_key" | "webhook_only";
  oauthConfig?: { authorizeUrl: string; tokenUrl: string; scopes: string[] };
  requiredFields: string[];
  entityTypes: string[];
}> = {
  gohighlevel: {
    name: "GoHighLevel",
    type: "crm",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://marketplace.gohighlevel.com/oauth/chooselocation",
      tokenUrl: "https://services.leadconnectorhq.com/oauth/token",
      scopes: ["contacts.readonly", "contacts.write", "opportunities.readonly", "opportunities.write"],
    },
    requiredFields: ["clientId", "clientSecret"],
    entityTypes: ["leads", "contacts", "opportunities"],
  },
  hubspot: {
    name: "HubSpot",
    type: "crm",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://app.hubspot.com/oauth/authorize",
      tokenUrl: "https://api.hubapi.com/oauth/v1/token",
      scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read"],
    },
    requiredFields: ["clientId", "clientSecret"],
    entityTypes: ["contacts", "deals", "companies"],
  },
  salesforce: {
    name: "Salesforce",
    type: "crm",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://login.salesforce.com/services/oauth2/authorize",
      tokenUrl: "https://login.salesforce.com/services/oauth2/token",
      scopes: ["api", "refresh_token"],
    },
    requiredFields: ["clientId", "clientSecret"],
    entityTypes: ["leads", "contacts", "opportunities", "accounts"],
  },
  linkedin: {
    name: "LinkedIn",
    type: "social",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      scopes: ["r_liteprofile", "r_emailaddress", "w_member_social", "rw_organization_admin"],
    },
    requiredFields: ["clientId", "clientSecret"],
    entityTypes: ["posts", "company_page"],
  },
  meta: {
    name: "Meta (Facebook/Instagram)",
    type: "social",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
      scopes: ["pages_manage_posts", "pages_read_engagement", "instagram_basic", "leads_retrieval"],
    },
    requiredFields: ["clientId", "clientSecret"],
    entityTypes: ["posts", "lead_forms", "pages"],
  },
  google_ads: {
    name: "Google Ads",
    type: "advertising",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/adwords"],
    },
    requiredFields: ["clientId", "clientSecret", "developerToken"],
    entityTypes: ["campaigns", "leads"],
  },
  apollo: {
    name: "Apollo.io",
    type: "enrichment",
    authMethod: "api_key",
    requiredFields: ["apiKey"],
    entityTypes: ["contacts", "companies"],
  },
  stripe: {
    name: "Stripe",
    type: "payments",
    authMethod: "api_key",
    requiredFields: ["apiKey"],
    entityTypes: ["invoices", "payments", "customers"],
  },
  slack: {
    name: "Slack",
    type: "messaging",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      scopes: ["chat:write", "channels:read", "incoming-webhook"],
    },
    requiredFields: ["clientId", "clientSecret"],
    entityTypes: ["messages", "channels"],
  },
  mailchimp: {
    name: "Mailchimp",
    type: "email_marketing",
    authMethod: "oauth2",
    oauthConfig: {
      authorizeUrl: "https://login.mailchimp.com/oauth2/authorize",
      tokenUrl: "https://login.mailchimp.com/oauth2/token",
      scopes: [],
    },
    requiredFields: ["clientId", "clientSecret"],
    entityTypes: ["lists", "campaigns", "subscribers"],
  },
};

export function getAvailableConnectors() {
  return Object.entries(SUPPORTED_PROVIDERS).map(([id, p]) => ({
    id, name: p.name, type: p.type, authMethod: p.authMethod,
    scopes: p.oauthConfig?.scopes ?? [],
    requiredFields: p.requiredFields,
    entityTypes: p.entityTypes,
  }));
}

const OAUTH_STATES = new Map<string, number>();

export function generateOAuthState(): string {
  const state = randomBytes(32).toString("hex");
  OAUTH_STATES.set(state, Date.now() + 10 * 60 * 1000);
  return state;
}

export function validateOAuthState(state: string): boolean {
  const expiry = OAUTH_STATES.get(state);
  if (!expiry) return false;
  OAUTH_STATES.delete(state);
  return Date.now() < expiry;
}

export function buildOAuthAuthorizeUrl(params: {
  provider: string;
  clientId: string;
  redirectUri: string;
  state: string;
  extraScopes?: string[];
}): { url: string; error?: string } {
  const providerConfig = SUPPORTED_PROVIDERS[params.provider];
  if (!providerConfig) return { url: "", error: `Unknown provider: ${params.provider}` };
  if (providerConfig.authMethod !== "oauth2" || !providerConfig.oauthConfig) {
    return { url: "", error: `Provider ${params.provider} does not support OAuth2` };
  }

  const scopes = [...providerConfig.oauthConfig.scopes, ...(params.extraScopes ?? [])];
  const url = new URL(providerConfig.oauthConfig.authorizeUrl);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", params.state);
  if (scopes.length > 0) url.searchParams.set("scope", scopes.join(" "));

  return { url: url.toString() };
}

export async function exchangeOAuthToken(params: {
  provider: string;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  actor: string;
}): Promise<{ success: boolean; integrationId?: number; error?: string }> {
  const providerConfig = SUPPORTED_PROVIDERS[params.provider];
  if (!providerConfig?.oauthConfig) return { success: false, error: "Invalid provider for OAuth" };

  try {
    const tokenResponse = await fetch(providerConfig.oauthConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: params.code,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return { success: false, error: `Token exchange failed: ${tokenResponse.status} — ${errorText.slice(0, 200)}` };
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    const existing = await db.select().from(integrationsTable)
      .where(eq(integrationsTable.provider, params.provider));

    const credentials = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      tokenType: tokenData.token_type ?? "Bearer",
      scope: tokenData.scope,
    };

    const config = { clientId: params.clientId, clientSecret: params.clientSecret, redirectUri: params.redirectUri };

    let integrationId: number;

    if (existing.length > 0) {
      const [updated] = await db.update(integrationsTable).set({
        status: "connected",
        isActive: true,
        credentials,
        config: { ...(existing[0].config as object ?? {}), ...config },
        lastSyncAt: new Date(),
        lastSyncStatus: "connected",
      }).where(eq(integrationsTable.id, existing[0].id)).returning();
      integrationId = updated.id;
    } else {
      const [created] = await db.insert(integrationsTable).values({
        name: providerConfig.name,
        type: providerConfig.type,
        provider: params.provider,
        status: "connected",
        isActive: true,
        credentials,
        config,
      }).returning();
      integrationId = created.id;
    }

    await logAudit({
      eventType: "integration_connected",
      domain: "system",
      action: "oauth_connect",
      description: `Connected to ${providerConfig.name} via OAuth2`,
      entityType: "integration",
      entityId: integrationId,
      actor: params.actor,
      actorType: "human",
      metadata: { provider: params.provider, type: providerConfig.type },
    });

    await createNotification({
      type: "integration_connected",
      severity: "success",
      title: `${providerConfig.name} Connected`,
      message: `Successfully connected to ${providerConfig.name} via OAuth2.`,
      domain: "system",
      entityType: "integration",
      entityId: integrationId,
      actor: params.actor,
    });

    broadcast("integration_connected", { provider: params.provider, integrationId });

    return { success: true, integrationId };
  } catch (err: any) {
    return { success: false, error: `OAuth exchange error: ${err.message}` };
  }
}

export async function refreshOAuthTokenForProvider(provider: string): Promise<{ success: boolean; error?: string }> {
  const [integration] = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.provider, provider));
  if (!integration) return { success: false, error: "Integration not found" };

  const creds = integration.credentials as any;
  const config = integration.config as any;
  const providerConfig = SUPPORTED_PROVIDERS[provider];
  if (!providerConfig?.oauthConfig || !creds?.refreshToken) {
    return { success: false, error: "No refresh token available" };
  }

  try {
    const response = await fetch(providerConfig.oauthConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: creds.refreshToken,
        client_id: config?.clientId ?? "",
        client_secret: config?.clientSecret ?? "",
      }).toString(),
    });

    if (!response.ok) return { success: false, error: `Refresh failed: ${response.status}` };

    const data = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number };

    await db.update(integrationsTable).set({
      credentials: {
        ...creds,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? creds.refreshToken,
        expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : creds.expiresAt,
      },
      lastSyncAt: new Date(),
      lastSyncStatus: "token_refreshed",
    }).where(eq(integrationsTable.id, integration.id));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function connectWithApiKey(params: {
  provider: string;
  apiKey: string;
  extraConfig?: Record<string, any>;
  actor: string;
}): Promise<{ success: boolean; integrationId?: number; error?: string }> {
  const providerConfig = SUPPORTED_PROVIDERS[params.provider];
  if (!providerConfig) return { success: false, error: `Unknown provider: ${params.provider}` };
  if (providerConfig.authMethod !== "api_key") {
    return { success: false, error: `Provider ${params.provider} does not use API key auth. Use OAuth instead.` };
  }

  const existing = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.provider, params.provider));

  const credentials = { apiKey: params.apiKey };
  let integrationId: number;

  if (existing.length > 0) {
    const [updated] = await db.update(integrationsTable).set({
      status: "connected",
      isActive: true,
      credentials,
      config: { ...(existing[0].config as object ?? {}), ...(params.extraConfig ?? {}) },
    }).where(eq(integrationsTable.id, existing[0].id)).returning();
    integrationId = updated.id;
  } else {
    const [created] = await db.insert(integrationsTable).values({
      name: providerConfig.name,
      type: providerConfig.type,
      provider: params.provider,
      status: "connected",
      isActive: true,
      credentials,
      config: params.extraConfig ?? {},
    }).returning();
    integrationId = created.id;
  }

  await logAudit({
    eventType: "integration_connected",
    domain: "system",
    action: "api_key_connect",
    description: `Connected to ${providerConfig.name} via API key`,
    entityType: "integration",
    entityId: integrationId,
    actor: params.actor,
    actorType: "human",
    metadata: { provider: params.provider },
  });

  broadcast("integration_connected", { provider: params.provider, integrationId });

  return { success: true, integrationId };
}

export async function disconnectIntegration(params: {
  provider: string;
  actor: string;
}): Promise<{ success: boolean; error?: string }> {
  const [integration] = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.provider, params.provider));
  if (!integration) return { success: false, error: "Integration not found" };

  await db.update(integrationsTable).set({
    status: "disconnected",
    isActive: false,
    credentials: null,
    lastSyncStatus: "disconnected",
  }).where(eq(integrationsTable.id, integration.id));

  await logAudit({
    eventType: "integration_disconnected",
    domain: "system",
    action: "disconnect",
    description: `Disconnected from ${integration.name}`,
    entityType: "integration",
    entityId: integration.id,
    actor: params.actor,
    actorType: "human",
    metadata: { provider: params.provider },
  });

  broadcast("integration_disconnected", { provider: params.provider });

  return { success: true };
}

export async function getIntegrationStatus(provider?: string): Promise<any[]> {
  const conditions = provider ? [eq(integrationsTable.provider, provider)] : [];
  const rows = await db.select().from(integrationsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  return rows.map(r => {
    const creds = r.credentials as any;
    return {
      id: r.id,
      name: r.name,
      provider: r.provider,
      type: r.type,
      status: r.status,
      isActive: r.isActive,
      lastSyncAt: r.lastSyncAt,
      lastSyncStatus: r.lastSyncStatus,
      lastSyncError: r.lastSyncError,
      syncFrequency: r.syncFrequency,
      tokenExpired: creds?.expiresAt ? Date.now() > creds.expiresAt : false,
    };
  });
}

const WEBHOOK_SECRETS = new Map<string, string>();

export function generateWebhookSecret(source: string): string {
  const secret = randomBytes(32).toString("hex");
  WEBHOOK_SECRETS.set(source, secret);
  return secret;
}

export function verifyWebhookSignature(source: string, signature: string, body: string): boolean {
  const secret = WEBHOOK_SECRETS.get(source);
  if (!secret) return true;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}

export async function processInboundWebhook(params: {
  source: string;
  event: string;
  payload: any;
  headers?: Record<string, string>;
  signature?: string;
}): Promise<{ processed: boolean; entityType?: string; entityId?: number; queued?: boolean; error?: string }> {
  const hasSecret = WEBHOOK_SECRETS.has(params.source);
  if (hasSecret && !params.signature) {
    return { processed: false, error: "Invalid webhook signature" };
  }
  if (params.signature && !verifyWebhookSignature(params.source, params.signature, JSON.stringify(params.payload))) {
    return { processed: false, error: "Invalid webhook signature" };
  }

  await db.insert(syncLogsTable).values({
    integrationId: params.source,
    direction: "inbound",
    entityType: params.event,
    status: "received",
    payload: params.payload,
  });

  const handler = WEBHOOK_HANDLERS[params.source] ?? WEBHOOK_HANDLERS["generic"];
  if (!handler) return { processed: false, error: `No handler for source: ${params.source}` };

  try {
    const result = await handler(params.event, params.payload);

    await db.insert(syncLogsTable).values({
      integrationId: params.source,
      direction: "inbound",
      entityType: result.entityType ?? params.event,
      entityId: result.entityId?.toString(),
      status: result.processed ? "processed" : "failed",
      error: result.error,
      payload: params.payload,
    });

    if (result.processed) {
      broadcast("webhook_processed", { source: params.source, event: params.event, entityType: result.entityType, entityId: result.entityId });
      await emit(`webhook.${params.source}.${params.event}`, {
        entityType: result.entityType ?? "webhook",
        entityId: result.entityId ?? 0,
        domain: "system",
        actor: params.source,
        actorType: "system",
        data: { event: params.event, source: params.source },
      });
    }

    return result;
  } catch (err: any) {
    await db.insert(syncLogsTable).values({
      integrationId: params.source,
      direction: "inbound",
      entityType: params.event,
      status: "error",
      error: err.message,
      payload: params.payload,
    });
    return { processed: false, error: err.message };
  }
}

type WebhookHandler = (event: string, payload: any) => Promise<{ processed: boolean; entityType?: string; entityId?: number; error?: string }>;

async function handleLeadWebhook(_event: string, payload: any): Promise<{ processed: boolean; entityType: string; entityId?: number; error?: string }> {
  const name = payload.name ?? payload.full_name ?? payload.first_name ?? "Unknown";
  const email = payload.email ?? payload.email_address;
  const phone = payload.phone ?? payload.phone_number;
  const company = payload.company ?? payload.company_name ?? payload.organization;
  const source = payload.source ?? payload.utm_source ?? "webhook";

  let companyId: number | undefined;
  if (company) {
    const [existingCompany] = await db.select().from(companiesTable).where(eq(companiesTable.name, company));
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const [newCompany] = await db.insert(companiesTable).values({
        name: company,
        industry: payload.industry ?? "Unknown",
        status: "prospect",
      }).returning();
      companyId = newCompany.id;
    }
  }

  const [lead] = await db.insert(leadsTable).values({
    companyId,
    source,
    status: "new",
    priority: "medium",
    channelSource: payload.channel ?? payload.form_name ?? "webhook",
    metadata: { webhookPayload: payload, email, phone, name },
  } as any).returning();

  if (email || phone) {
    await db.insert(contactsTable).values({
      firstName: (name.split(" ")[0] ?? name),
      lastName: name.split(" ").slice(1).join(" ") || undefined,
      email,
      phone,
      companyId,
      status: "active",
    } as any).catch(() => {});
  }

  await emit("lead.created", {
    entityType: "lead",
    entityId: lead.id,
    domain: "crm",
    actor: "webhook",
    actorType: "system",
    data: { source, name, company, channel: "webhook" },
  });

  await createNotification({
    type: "lead_from_webhook",
    severity: "info",
    title: `New Lead from Webhook: ${name}`,
    message: `Lead captured via webhook from ${source}${company ? ` — ${company}` : ""}`,
    domain: "crm",
    entityType: "lead",
    entityId: lead.id,
    actor: "webhook",
  });

  return { processed: true, entityType: "lead", entityId: lead.id };
}

async function handleFormSubmission(_event: string, payload: any): Promise<{ processed: boolean; entityType: string; entityId?: number; error?: string }> {
  return handleLeadWebhook("form_submission", { ...payload, source: payload.source ?? "form", channel: payload.form_name ?? "form" });
}

async function handleGenericWebhook(event: string, payload: any): Promise<{ processed: boolean; entityType: string; entityId?: number }> {
  if (payload.email || payload.name || payload.phone) {
    return handleLeadWebhook(event, payload);
  }
  return { processed: true, entityType: "webhook_event" };
}

const WEBHOOK_HANDLERS: Record<string, WebhookHandler> = {
  lead_form: handleLeadWebhook,
  landing_page: handleLeadWebhook,
  facebook_lead: handleFormSubmission,
  typeform: handleFormSubmission,
  jotform: handleFormSubmission,
  gravity_forms: handleFormSubmission,
  zapier: handleGenericWebhook,
  generic: handleGenericWebhook,
};

export function getRegisteredWebhookSources(): string[] {
  return Object.keys(WEBHOOK_HANDLERS);
}

const ENTITY_SCHEMAS: Record<string, { fields: string[]; required: string[]; dbTable: string }> = {
  leads: {
    fields: ["companyName", "source", "status", "priority", "channelSource", "email", "phone", "name"],
    required: ["source"],
    dbTable: "leads",
  },
  contacts: {
    fields: ["firstName", "lastName", "email", "phone", "title", "companyName"],
    required: ["firstName"],
    dbTable: "contacts",
  },
  companies: {
    fields: ["name", "industry", "size", "website", "status", "phone", "email"],
    required: ["name"],
    dbTable: "companies",
  },
  opportunities: {
    fields: ["title", "value", "stage", "probability", "owner", "companyName", "expectedCloseDate"],
    required: ["title"],
    dbTable: "opportunities",
  },
};

export function getImportableEntities(): Array<{ entity: string; fields: string[]; required: string[] }> {
  return Object.entries(ENTITY_SCHEMAS).map(([entity, schema]) => ({
    entity, fields: schema.fields, required: schema.required,
  }));
}

export function validateFieldMapping(entityType: string, mapping: Record<string, string>): {
  valid: boolean;
  errors: string[];
  mappedFields: string[];
  unmappedRequired: string[];
} {
  const schema = ENTITY_SCHEMAS[entityType];
  if (!schema) return { valid: false, errors: [`Unknown entity type: ${entityType}`], mappedFields: [], unmappedRequired: [] };

  const mappedFields = Object.values(mapping).filter(v => schema.fields.includes(v));
  const unmappedRequired = schema.required.filter(f => !Object.values(mapping).includes(f));
  const errors: string[] = [];

  for (const [csvCol, dbField] of Object.entries(mapping)) {
    if (!schema.fields.includes(dbField)) {
      errors.push(`"${dbField}" is not a valid field for ${entityType}. Valid fields: ${schema.fields.join(", ")}`);
    }
  }
  if (unmappedRequired.length > 0) {
    errors.push(`Missing required field mappings: ${unmappedRequired.join(", ")}`);
  }

  return { valid: errors.length === 0, errors, mappedFields, unmappedRequired };
}

export function parseCsvContent(content: string): { headers: string[]; rows: Record<string, string>[]; rowCount: number } {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], rowCount: 0 };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (line[i] === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });

  return { headers, rows, rowCount: rows.length };
}

export async function importCsvData(params: {
  entityType: string;
  csvContent: string;
  fieldMapping: Record<string, string>;
  actor: string;
  skipDuplicates?: boolean;
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  dryRun: boolean;
}> {
  const validation = validateFieldMapping(params.entityType, params.fieldMapping);
  if (!validation.valid) {
    return { success: false, imported: 0, skipped: 0, errors: validation.errors.map(e => ({ row: 0, error: e })), dryRun: !!params.dryRun };
  }

  const { rows } = parseCsvContent(params.csvContent);
  if (rows.length === 0) {
    return { success: false, imported: 0, skipped: 0, errors: [{ row: 0, error: "No data rows found in CSV" }], dryRun: !!params.dryRun };
  }

  const errors: Array<{ row: number; error: string }> = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const csvRow = rows[i];
    const mapped: Record<string, any> = {};

    for (const [csvCol, dbField] of Object.entries(params.fieldMapping)) {
      const value = csvRow[csvCol];
      if (value !== undefined && value !== "") {
        mapped[dbField] = value;
      }
    }

    if (params.dryRun) {
      imported++;
      continue;
    }

    try {
      if (params.entityType === "leads") {
        let companyId: number | undefined;
        if (mapped.companyName) {
          const [existing] = await db.select().from(companiesTable).where(eq(companiesTable.name, mapped.companyName));
          if (existing) {
            companyId = existing.id;
          } else {
            const [newCo] = await db.insert(companiesTable).values({ name: mapped.companyName, industry: "Unknown", status: "prospect" }).returning();
            companyId = newCo.id;
          }
        }
        await db.insert(leadsTable).values({
          companyId,
          source: mapped.source ?? "csv_import",
          status: mapped.status ?? "new",
          priority: mapped.priority ?? "medium",
          channelSource: mapped.channelSource ?? "csv_import",
          metadata: { importedFrom: "csv", email: mapped.email, phone: mapped.phone, name: mapped.name },
        } as any);
        imported++;
      } else if (params.entityType === "contacts") {
        if (params.skipDuplicates && mapped.email) {
          const [dup] = await db.select().from(contactsTable).where(eq(contactsTable.email!, mapped.email));
          if (dup) { skipped++; continue; }
        }
        let companyId: number | undefined;
        if (mapped.companyName) {
          const [existing] = await db.select().from(companiesTable).where(eq(companiesTable.name, mapped.companyName));
          companyId = existing?.id;
        }
        await db.insert(contactsTable).values({
          firstName: mapped.firstName ?? "Unknown",
          lastName: mapped.lastName,
          email: mapped.email,
          phone: mapped.phone,
          title: mapped.title,
          companyId,
          status: "active",
        } as any);
        imported++;
      } else if (params.entityType === "companies") {
        if (params.skipDuplicates) {
          const [dup] = await db.select().from(companiesTable).where(eq(companiesTable.name, mapped.name));
          if (dup) { skipped++; continue; }
        }
        await db.insert(companiesTable).values({
          name: mapped.name,
          industry: mapped.industry ?? "Unknown",
          size: mapped.size,
          website: mapped.website,
          status: mapped.status ?? "prospect",
        } as any);
        imported++;
      } else if (params.entityType === "opportunities") {
        if (params.skipDuplicates) {
          const [dup] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.title, mapped.title));
          if (dup) { skipped++; continue; }
        }
        let companyId: number | undefined;
        if (mapped.companyName) {
          const [existing] = await db.select().from(companiesTable).where(eq(companiesTable.name, mapped.companyName));
          companyId = existing?.id;
        }
        await db.insert(opportunitiesTable).values({
          title: mapped.title,
          value: mapped.value ? parseFloat(mapped.value) : 0,
          stage: mapped.stage ?? "discovery",
          probability: mapped.probability ? parseInt(mapped.probability) : undefined,
          owner: mapped.owner,
          companyId,
          expectedCloseDate: mapped.expectedCloseDate ? new Date(mapped.expectedCloseDate) : undefined,
        } as any);
        imported++;
      }
    } catch (err: any) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  if (!params.dryRun && imported > 0) {
    await logAudit({
      eventType: "csv_import",
      domain: "system",
      action: "csv_import",
      description: `Imported ${imported} ${params.entityType} from CSV (${skipped} skipped, ${errors.length} errors)`,
      entityType: params.entityType,
      entityId: 0,
      actor: params.actor,
      actorType: "human",
      metadata: { imported, skipped, errorCount: errors.length },
    });

    await createNotification({
      type: "csv_import_complete",
      severity: errors.length > 0 ? "warning" : "success",
      title: `CSV Import Complete: ${imported} ${params.entityType}`,
      message: `Imported ${imported} records. ${skipped} duplicates skipped. ${errors.length} errors.`,
      domain: "system",
      entityType: params.entityType,
      entityId: 0,
      actor: params.actor,
    });

    broadcast("csv_import_complete", { entityType: params.entityType, imported, skipped, errors: errors.length });
  }

  return { success: errors.length === 0, imported, skipped, errors, dryRun: !!params.dryRun };
}

const SYNC_INTERVALS: Record<string, NodeJS.Timeout | null> = {};
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 60000];

export async function logSync(params: {
  integrationId: string;
  direction: "inbound" | "outbound";
  entityType: string;
  entityId?: string;
  externalId?: string;
  status: string;
  error?: string;
  payload?: any;
}): Promise<void> {
  await db.insert(syncLogsTable).values(params);
}

export async function getSyncLogs(params: {
  integrationId?: string;
  direction?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: any[]; total: number }> {
  const conditions = [];
  if (params.integrationId) conditions.push(eq(syncLogsTable.integrationId, params.integrationId));
  if (params.direction) conditions.push(eq(syncLogsTable.direction, params.direction));
  if (params.status) conditions.push(eq(syncLogsTable.status, params.status));

  const logs = await db.select().from(syncLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(syncLogsTable.createdAt))
    .limit(params.limit ?? 50)
    .offset(params.offset ?? 0);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(syncLogsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  return { logs, total: Number(countResult?.count ?? 0) };
}

async function executeSync(integrationId: number, retryCount = 0): Promise<{ success: boolean; synced: number; errors: number }> {
  const [integration] = await db.select().from(integrationsTable)
    .where(eq(integrationsTable.id, integrationId));
  if (!integration || !integration.isActive) return { success: false, synced: 0, errors: 0 };

  const creds = integration.credentials as any;
  if (creds?.expiresAt && Date.now() > creds.expiresAt) {
    const refreshResult = await refreshOAuthTokenForProvider(integration.provider);
    if (!refreshResult.success) {
      await db.update(integrationsTable).set({
        lastSyncStatus: "token_expired",
        lastSyncError: "OAuth token expired and refresh failed",
      }).where(eq(integrationsTable.id, integrationId));

      await logSync({
        integrationId: integrationId.toString(),
        direction: "outbound",
        entityType: "token_refresh",
        status: "failed",
        error: refreshResult.error,
      });

      return { success: false, synced: 0, errors: 1 };
    }
  }

  try {
    await db.update(integrationsTable).set({
      lastSyncAt: new Date(),
      lastSyncStatus: "syncing",
    }).where(eq(integrationsTable.id, integrationId));

    await logSync({
      integrationId: integrationId.toString(),
      direction: "outbound",
      entityType: "sync_cycle",
      status: "started",
    });

    await db.update(integrationsTable).set({
      lastSyncStatus: "success",
      lastSyncError: null,
    }).where(eq(integrationsTable.id, integrationId));

    await logSync({
      integrationId: integrationId.toString(),
      direction: "outbound",
      entityType: "sync_cycle",
      status: "completed",
    });

    return { success: true, synced: 0, errors: 0 };
  } catch (err: any) {
    if (retryCount < MAX_RETRIES) {
      await logSync({
        integrationId: integrationId.toString(),
        direction: "outbound",
        entityType: "sync_cycle",
        status: "retrying",
        error: `Attempt ${retryCount + 1}/${MAX_RETRIES}: ${err.message}`,
      });

      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount] ?? 60000));
      return executeSync(integrationId, retryCount + 1);
    }

    await db.update(integrationsTable).set({
      lastSyncStatus: "failed",
      lastSyncError: err.message,
    }).where(eq(integrationsTable.id, integrationId));

    await logSync({
      integrationId: integrationId.toString(),
      direction: "outbound",
      entityType: "sync_cycle",
      status: "failed",
      error: `Failed after ${MAX_RETRIES} retries: ${err.message}`,
    });

    await createNotification({
      type: "sync_failed",
      severity: "error",
      title: `Sync Failed: ${integration.name}`,
      message: `Sync with ${integration.name} failed after ${MAX_RETRIES} retries. Error: ${err.message}`,
      domain: "system",
      entityType: "integration",
      entityId: integrationId,
      actor: "sync_engine",
    });

    return { success: false, synced: 0, errors: 1 };
  }
}

export async function triggerSync(integrationId: number): Promise<{ success: boolean; synced: number; errors: number }> {
  return executeSync(integrationId);
}

export async function startSyncSchedule(integrationId: number, frequencyMs: number): Promise<{ success: boolean }> {
  stopSyncSchedule(integrationId);

  const key = `sync_${integrationId}`;
  SYNC_INTERVALS[key] = setInterval(async () => {
    await executeSync(integrationId);
  }, frequencyMs);

  const freqLabel = frequencyMs >= 3600000 ? `${frequencyMs / 3600000}h` : `${frequencyMs / 60000}m`;
  await db.update(integrationsTable).set({
    syncFrequency: freqLabel,
  }).where(eq(integrationsTable.id, integrationId));

  return { success: true };
}

export function stopSyncSchedule(integrationId: number): void {
  const key = `sync_${integrationId}`;
  if (SYNC_INTERVALS[key]) {
    clearInterval(SYNC_INTERVALS[key]!);
    SYNC_INTERVALS[key] = null;
  }
}

export async function retrySyncLog(syncLogId: number): Promise<{ success: boolean; error?: string }> {
  const [log] = await db.select().from(syncLogsTable).where(eq(syncLogsTable.id, syncLogId));
  if (!log) return { success: false, error: "Sync log not found" };
  if (!["failed", "error"].includes(log.status)) return { success: false, error: "Only failed sync logs can be retried" };

  try {
    if (log.direction === "inbound" && log.payload) {
      const result = await processInboundWebhook({
        source: log.integrationId,
        event: log.entityType,
        payload: log.payload,
      });

      await db.update(syncLogsTable).set({ status: result.processed ? "retried" : "retry_failed" })
        .where(eq(syncLogsTable.id, syncLogId));

      return { success: result.processed, error: result.error };
    }

    if (log.direction === "outbound") {
      const integrationId = parseInt(log.integrationId);
      if (!isNaN(integrationId)) {
        const result = await executeSync(integrationId);
        return { success: result.success };
      }
    }

    return { success: false, error: "Cannot retry this sync log type" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getSyncHealth(): Promise<{
  activeIntegrations: number;
  failedSyncs: number;
  lastSyncAt: string | null;
  pendingRetries: number;
}> {
  const active = await db.select({ count: sql<number>`count(*)` }).from(integrationsTable)
    .where(eq(integrationsTable.isActive, true));

  const failed = await db.select({ count: sql<number>`count(*)` }).from(syncLogsTable)
    .where(eq(syncLogsTable.status, "failed"));

  const [latestSync] = await db.select({ latest: sql<string>`max(created_at)` }).from(syncLogsTable);

  const pending = await db.select({ count: sql<number>`count(*)` }).from(syncLogsTable)
    .where(eq(syncLogsTable.status, "retrying"));

  return {
    activeIntegrations: Number(active[0]?.count ?? 0),
    failedSyncs: Number(failed[0]?.count ?? 0),
    lastSyncAt: latestSync?.latest ?? null,
    pendingRetries: Number(pending[0]?.count ?? 0),
  };
}

export function initIntegrationHub(): void {
  console.log("[IntegrationHub] Initialized — OAuth flows, webhook receiver, CSV import, sync engine with retry");
}
