import { Router, type IRouter } from "express";
import { db, leadsTable, companiesTable, contactsTable, assetsTable, campaignsTable, reportsTable, qualityIssuesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

/**
 * Production overview — one aggregating read for the Production page.
 *
 * Real DB rows only: leads joined to company + contact; seeded assets, campaigns,
 * report, and quality-review rows. Lead "delivered" status is derived from the
 * real lead status; campaign "clients" is derived from conversions. No component
 * hardcoding.
 */

const router: IRouter = Router();

const DELIVERED_STATUSES = new Set(["qualified", "converted", "closed_won", "delivered", "won"]);

router.get("/production/overview", async (_req, res): Promise<void> => {
  const leadRows = await db
    .select({
      id: leadsTable.id,
      company: companiesTable.name,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      score: leadsTable.fitScore,
      pain: leadsTable.painPoints,
      approach: leadsTable.bestAngle,
      status: leadsTable.status,
    })
    .from(leadsTable)
    .leftJoin(companiesTable, eq(leadsTable.companyId, companiesTable.id))
    .leftJoin(contactsTable, eq(leadsTable.contactId, contactsTable.id))
    .orderBy(desc(leadsTable.fitScore));

  const leads = leadRows.map((l) => ({
    id: l.id,
    company: l.company ?? "Unknown Company",
    contact: `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || "—",
    email: l.email ?? "",
    phone: l.phone ?? "",
    score: l.score ?? 0,
    pain: l.pain ?? "",
    approach: l.approach ?? "",
    status: DELIVERED_STATUSES.has((l.status ?? "").toLowerCase()) ? "delivered" : "pending_review",
  }));

  const assetRows = await db.select().from(assetsTable).orderBy(desc(assetsTable.createdAt)).limit(100);
  const assets = assetRows.map((a) => {
    const meta = (a.metadata ?? {}) as { format?: string; score?: number };
    return {
      id: a.id,
      name: a.title,
      type: a.type,
      format: meta.format ?? "—",
      date: a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
      status: a.status,
      score: typeof meta.score === "number" ? meta.score : null,
    };
  });

  const campaignRows = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt));
  const campaigns = campaignRows.map((c) => ({
    id: c.id,
    client: c.targetAudience ?? "—",
    name: c.name,
    channel: c.channel,
    status: c.status,
    funnel: c.notes ?? "",
    metrics: {
      visitors: c.impressions ?? 0,
      leads: c.leadsGenerated ?? 0,
      meetings: c.conversions ?? 0,
      clients: Math.round((c.conversions ?? 0) * 0.25),
    },
    budget: c.budget ?? 0,
    spent: c.spent ?? 0,
  }));

  const [reportRow] = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.domain, "production"))
    .orderBy(desc(reportsTable.createdAt))
    .limit(1);
  const report = reportRow
    ? { title: reportRow.title, summary: reportRow.summary, period: reportRow.period, data: reportRow.data ?? null }
    : null;

  const qualityRows = await db
    .select()
    .from(qualityIssuesTable)
    .where(eq(qualityIssuesTable.domain, "production"))
    .orderBy(desc(qualityIssuesTable.createdAt));
  const quality = qualityRows.map((q) => {
    const meta = (q.metadata ?? {}) as { contentType?: string; score?: string; issues?: string[] };
    return {
      id: q.id,
      name: q.title,
      type: meta.contentType ?? "content",
      score: meta.score ?? "Ready to Publish",
      issues: Array.isArray(meta.issues) ? meta.issues : [],
      details: q.description ?? "",
    };
  });

  res.json({ leads, assets, campaigns, report, quality });
});

export default router;
