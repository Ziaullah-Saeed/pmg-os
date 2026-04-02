import { db } from "@workspace/db";
import {
  channelsTable, channelSourcesTable, attributionEventsTable,
  channelFormsTable, landingPagesTable, manualImportsTable,
  leadsTable, contactsTable, companiesTable,
  type InsertChannel, type InsertChannelSource, type InsertAttributionEvent,
  type InsertChannelForm, type InsertLandingPage, type InsertManualImport,
} from "@workspace/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { broadcast } from "./websocket-service";

const CHANNEL_TYPES = [
  { type: "pmg_website", platform: "web", category: "inbound", label: "PMG Website" },
  { type: "pmg_landing_page", platform: "web", category: "inbound", label: "PMG Landing Pages" },
  { type: "client_website", platform: "web", category: "inbound", label: "Client Websites" },
  { type: "client_landing_page", platform: "web", category: "inbound", label: "Client Landing Pages" },
  { type: "linkedin_profile", platform: "linkedin", category: "social", label: "LinkedIn" },
  { type: "linkedin_company", platform: "linkedin", category: "social", label: "LinkedIn Company Page" },
  { type: "linkedin_sales_nav", platform: "linkedin", category: "social", label: "LinkedIn Sales Navigator" },
  { type: "facebook", platform: "meta", category: "social", label: "Facebook / Meta" },
  { type: "instagram", platform: "meta", category: "social", label: "Instagram" },
  { type: "twitter", platform: "twitter", category: "social", label: "X / Twitter" },
  { type: "youtube", platform: "google", category: "social", label: "YouTube" },
  { type: "tiktok", platform: "tiktok", category: "social", label: "TikTok" },
  { type: "email", platform: "email", category: "communication", label: "Email Tools" },
  { type: "phone_sms", platform: "phone", category: "communication", label: "Phone / SMS" },
  { type: "forms", platform: "web", category: "inbound", label: "Forms" },
  { type: "widgets", platform: "web", category: "inbound", label: "Widgets" },
  { type: "webinar", platform: "webinar", category: "events", label: "Webinar Tools" },
  { type: "calendar", platform: "calendar", category: "events", label: "Calendars / Booking" },
  { type: "google_ads", platform: "google", category: "advertising", label: "Google Ads" },
  { type: "meta_ads", platform: "meta", category: "advertising", label: "Meta Ads" },
  { type: "referral", platform: "referral", category: "inbound", label: "Referrals" },
  { type: "direct", platform: "direct", category: "inbound", label: "Direct / Walk-in" },
] as const;

export function getChannelTypeDefinitions() {
  return CHANNEL_TYPES;
}

function stripSecrets(ch: any) {
  if (!ch) return ch;
  const { credentials, webhookSecret, ...safe } = ch;
  return safe;
}

export async function listChannels() {
  const rows = await db.select().from(channelsTable).orderBy(desc(channelsTable.updatedAt));
  return rows.map(stripSecrets);
}

export async function getChannel(id: number) {
  const [ch] = await db.select().from(channelsTable).where(eq(channelsTable.id, id));
  return stripSecrets(ch);
}

export async function getChannelRaw(id: number) {
  const [ch] = await db.select().from(channelsTable).where(eq(channelsTable.id, id));
  return ch;
}

export async function createChannel(data: InsertChannel) {
  const [ch] = await db.insert(channelsTable).values(data).returning();
  broadcast("channel_created", ch);
  return ch;
}

export async function updateChannel(id: number, data: Partial<InsertChannel>) {
  const [ch] = await db.update(channelsTable).set(data).where(eq(channelsTable.id, id)).returning();
  broadcast("channel_updated", ch);
  return ch;
}

export async function deleteChannel(id: number) {
  await db.delete(channelsTable).where(eq(channelsTable.id, id));
  broadcast("channel_deleted", { id });
}

export async function connectChannel(id: number, mode: string, config?: any, credentials?: any) {
  return updateChannel(id, {
    status: "connected",
    isActive: true,
    integrationMode: mode,
    config,
    credentials,
  });
}

export async function disconnectChannel(id: number) {
  return updateChannel(id, {
    status: "disconnected",
    isActive: false,
    credentials: null,
  });
}

export async function reconnectChannel(id: number) {
  const ch = await getChannel(id);
  if (!ch) throw new Error("Channel not found");
  return updateChannel(id, {
    status: "reconnecting",
    lastSyncStatus: "reconnecting",
  });
}

export async function triggerSync(id: number) {
  const ch = await getChannel(id);
  if (!ch) throw new Error("Channel not found");
  await updateChannel(id, {
    lastSyncAt: new Date(),
    lastSyncStatus: "syncing",
  });
  setTimeout(async () => {
    await updateChannel(id, { lastSyncStatus: "success" });
  }, 2000);
  return { status: "sync_triggered", channelId: id };
}

export async function listChannelSources(channelId: number) {
  return db.select().from(channelSourcesTable)
    .where(eq(channelSourcesTable.channelId, channelId))
    .orderBy(desc(channelSourcesTable.updatedAt));
}

export async function createChannelSource(data: InsertChannelSource) {
  const [src] = await db.insert(channelSourcesTable).values(data).returning();
  return src;
}

export async function updateChannelSource(id: number, data: Partial<InsertChannelSource>) {
  const [src] = await db.update(channelSourcesTable).set(data).where(eq(channelSourcesTable.id, id)).returning();
  return src;
}

export async function deleteChannelSource(id: number) {
  await db.delete(channelSourcesTable).where(eq(channelSourcesTable.id, id));
}

export async function recordAttribution(data: InsertAttributionEvent) {
  const [evt] = await db.insert(attributionEventsTable).values(data).returning();
  if (data.channelId) {
    await db.update(channelsTable)
      .set({ totalLeads: sql`${channelsTable.totalLeads} + 1`, monthlyLeads: sql`${channelsTable.monthlyLeads} + 1` })
      .where(eq(channelsTable.id, data.channelId));
  }
  if (data.sourceId) {
    await db.update(channelSourcesTable)
      .set({ leadsGenerated: sql`${channelSourcesTable.leadsGenerated} + 1` })
      .where(eq(channelSourcesTable.id, data.sourceId));
  }
  return evt;
}

export async function getAttributionEvents(filters?: { leadId?: number; channelId?: number; limit?: number }) {
  const conditions = [];
  if (filters?.leadId) conditions.push(eq(attributionEventsTable.leadId, filters.leadId));
  if (filters?.channelId) conditions.push(eq(attributionEventsTable.channelId, filters.channelId));
  const query = db.select().from(attributionEventsTable)
    .orderBy(desc(attributionEventsTable.createdAt))
    .limit(filters?.limit ?? 100);
  if (conditions.length) return query.where(and(...conditions));
  return query;
}

export async function getAttributionSummary() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const events = await db.select({
    channelId: attributionEventsTable.channelId,
    touchpointType: attributionEventsTable.touchpointType,
    count: sql<number>`count(*)::int`,
  }).from(attributionEventsTable)
    .where(gte(attributionEventsTable.createdAt, thirtyDaysAgo))
    .groupBy(attributionEventsTable.channelId, attributionEventsTable.touchpointType);

  const channels = await listChannels();
  const channelMap = new Map(channels.map(c => [c.id, c]));

  return events.map(e => ({
    ...e,
    channelName: channelMap.get(e.channelId!)?.name ?? "Unknown",
    channelType: channelMap.get(e.channelId!)?.type ?? "unknown",
  }));
}

export async function correctAttribution(eventId: number, updates: { channelId?: number; sourceId?: number; creditWeight?: number; touchpointPosition?: string }) {
  const [evt] = await db.update(attributionEventsTable)
    .set(updates)
    .where(eq(attributionEventsTable.id, eventId))
    .returning();
  return evt;
}

export async function listForms(filters?: { channelId?: number }) {
  if (filters?.channelId) {
    return db.select().from(channelFormsTable)
      .where(eq(channelFormsTable.channelId, filters.channelId))
      .orderBy(desc(channelFormsTable.updatedAt));
  }
  return db.select().from(channelFormsTable).orderBy(desc(channelFormsTable.updatedAt));
}

export async function createForm(data: InsertChannelForm) {
  const [form] = await db.insert(channelFormsTable).values(data).returning();
  broadcast("form_created", form);
  return form;
}

export async function updateForm(id: number, data: Partial<InsertChannelForm>) {
  const [form] = await db.update(channelFormsTable).set(data).where(eq(channelFormsTable.id, id)).returning();
  return form;
}

export async function deleteForm(id: number) {
  await db.delete(channelFormsTable).where(eq(channelFormsTable.id, id));
}

export async function listLandingPages(filters?: { channelId?: number }) {
  if (filters?.channelId) {
    return db.select().from(landingPagesTable)
      .where(eq(landingPagesTable.channelId, filters.channelId))
      .orderBy(desc(landingPagesTable.updatedAt));
  }
  return db.select().from(landingPagesTable).orderBy(desc(landingPagesTable.updatedAt));
}

export async function createLandingPage(data: InsertLandingPage) {
  const [page] = await db.insert(landingPagesTable).values(data).returning();
  broadcast("landing_page_created", page);
  return page;
}

export async function updateLandingPage(id: number, data: Partial<InsertLandingPage>) {
  const [page] = await db.update(landingPagesTable).set(data).where(eq(landingPagesTable.id, id)).returning();
  return page;
}

export async function deleteLandingPage(id: number) {
  await db.delete(landingPagesTable).where(eq(landingPagesTable.id, id));
}

export async function startCsvImport(data: InsertManualImport) {
  const [imp] = await db.insert(manualImportsTable).values(data).returning();
  return imp;
}

export async function processCsvRows(importId: number, rows: any[], fieldMapping: Record<string, string>, entityType: string) {
  const imp = await db.select().from(manualImportsTable).where(eq(manualImportsTable.id, importId));
  if (!imp[0]) throw new Error("Import not found");

  let success = 0;
  let errors = 0;
  let skipped = 0;
  const errorDetails: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const mapped: Record<string, any> = {};
      for (const [csvCol, dbField] of Object.entries(fieldMapping)) {
        if (row[csvCol] !== undefined && row[csvCol] !== "") {
          mapped[dbField] = row[csvCol];
        }
      }

      if (entityType === "leads") {
        if (!mapped.source) mapped.source = "csv_import";
        const existing = mapped.email ? await db.select().from(leadsTable).where(sql`EXISTS (SELECT 1 FROM contacts WHERE contacts.id = leads.contact_id AND contacts.email = ${mapped.email})`) : [];
        if (existing.length > 0) { skipped++; continue; }

        let contactId: number | undefined;
        if (mapped.email || mapped.firstName || mapped.lastName) {
          const [contact] = await db.insert(contactsTable).values({
            firstName: mapped.firstName ?? "",
            lastName: mapped.lastName ?? "",
            email: mapped.email ?? "",
            phone: mapped.phone,
            title: mapped.title,
          }).returning();
          contactId = contact.id;
        }

        let companyId: number | undefined;
        if (mapped.companyName) {
          const existingCo = await db.select().from(companiesTable).where(eq(companiesTable.name, mapped.companyName));
          if (existingCo.length > 0) {
            companyId = existingCo[0].id;
          } else {
            const [co] = await db.insert(companiesTable).values({
              name: mapped.companyName,
              industry: mapped.industry,
            }).returning();
            companyId = co.id;
          }
        }

        await db.insert(leadsTable).values({
          source: mapped.source,
          status: mapped.status ?? "new",
          priority: mapped.priority ?? "medium",
          contactId,
          companyId,
          channelSource: `csv_import_${importId}`,
          notes: mapped.notes,
        });
        success++;
      } else if (entityType === "contacts") {
        if (!mapped.firstName && !mapped.email) { skipped++; continue; }
        if (mapped.email) {
          const existing = await db.select().from(contactsTable).where(eq(contactsTable.email, mapped.email));
          if (existing.length > 0) { skipped++; continue; }
        }
        await db.insert(contactsTable).values({
          firstName: mapped.firstName ?? "",
          lastName: mapped.lastName ?? "",
          email: mapped.email ?? "",
          phone: mapped.phone,
          title: mapped.title,
          linkedinUrl: mapped.linkedinUrl,
        });
        success++;
      } else if (entityType === "companies") {
        if (!mapped.name) { skipped++; continue; }
        const existing = await db.select().from(companiesTable).where(eq(companiesTable.name, mapped.name));
        if (existing.length > 0) { skipped++; continue; }
        await db.insert(companiesTable).values({
          name: mapped.name,
          industry: mapped.industry,
          size: mapped.size,
          location: mapped.location,
        });
        success++;
      }
    } catch (err: any) {
      errors++;
      errorDetails.push({ row: i + 1, error: err.message });
    }
  }

  const [updated] = await db.update(manualImportsTable).set({
    status: "completed",
    processedRows: rows.length,
    successRows: success,
    errorRows: errors,
    skippedRows: skipped,
    errors: errorDetails.length > 0 ? errorDetails : null,
    completedAt: new Date(),
  }).where(eq(manualImportsTable.id, importId)).returning();

  broadcast("import_completed", updated);
  return updated;
}

export async function listImports(filters?: { channelId?: number; limit?: number }) {
  const query = db.select().from(manualImportsTable).orderBy(desc(manualImportsTable.createdAt)).limit(filters?.limit ?? 50);
  if (filters?.channelId) return query.where(eq(manualImportsTable.channelId, filters.channelId));
  return query;
}

export async function reconcileImport(importId: number, notes: string) {
  const [imp] = await db.update(manualImportsTable).set({
    reconciliationStatus: "reconciled",
    reconciliationNotes: notes,
  }).where(eq(manualImportsTable.id, importId)).returning();
  return imp;
}

export async function getChannelAnalytics() {
  const channels = await listChannels();
  const totalChannels = channels.length;
  const connectedChannels = channels.filter(c => c.status === "connected").length;
  const totalLeads = channels.reduce((s, c) => s + c.totalLeads, 0);
  const totalConversions = channels.reduce((s, c) => s + c.totalConversions, 0);
  const monthlyLeads = channels.reduce((s, c) => s + c.monthlyLeads, 0);

  const byCategory: Record<string, { channels: number; leads: number; conversions: number }> = {};
  for (const ch of channels) {
    const cat = ch.category;
    if (!byCategory[cat]) byCategory[cat] = { channels: 0, leads: 0, conversions: 0 };
    byCategory[cat].channels++;
    byCategory[cat].leads += ch.totalLeads;
    byCategory[cat].conversions += ch.totalConversions;
  }

  const byPlatform: Record<string, { channels: number; leads: number }> = {};
  for (const ch of channels) {
    const plat = ch.platform;
    if (!byPlatform[plat]) byPlatform[plat] = { channels: 0, leads: 0 };
    byPlatform[plat].channels++;
    byPlatform[plat].leads += ch.totalLeads;
  }

  return {
    totalChannels,
    connectedChannels,
    totalLeads,
    totalConversions,
    monthlyLeads,
    overallConversionRate: totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 10000) / 100 : 0,
    byCategory: Object.entries(byCategory).map(([k, v]) => ({ category: k, ...v })),
    byPlatform: Object.entries(byPlatform).map(([k, v]) => ({ platform: k, ...v })),
    channels: channels.map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      platform: ch.platform,
      status: ch.status,
      isActive: ch.isActive,
      integrationMode: ch.integrationMode,
      totalLeads: ch.totalLeads,
      monthlyLeads: ch.monthlyLeads,
      conversionRate: ch.conversionRate,
      lastSyncAt: ch.lastSyncAt,
      lastSyncStatus: ch.lastSyncStatus,
    })),
  };
}

export async function seedDefaultChannels() {
  const existing = await db.select({ id: channelsTable.id }).from(channelsTable);
  if (existing.length > 0) return;

  const defaults = CHANNEL_TYPES.map(ct => ({
    name: ct.label,
    type: ct.type,
    platform: ct.platform,
    category: ct.category,
    status: "disconnected" as const,
    isActive: false,
    integrationMode: "manual" as const,
  }));
  await db.insert(channelsTable).values(defaults);
}
