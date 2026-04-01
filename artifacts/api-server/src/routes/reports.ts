import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, reportsTable, leadsTable, opportunitiesTable, tasksTable, campaignsTable, companiesTable, contactsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListReportsQueryParams, ListReportsResponse,
  CreateReportBody, GetReportParams, GetReportResponse,
  UpdateReportParams, UpdateReportBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports", async (req, res): Promise<void> => {
  const query = ListReportsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(reportsTable.status, query.data.status));
  if (query.data.domain) conditions.push(eq(reportsTable.domain, query.data.domain));
  if (query.data.type) conditions.push(eq(reportsTable.type, query.data.type));
  if (query.data.format) conditions.push(eq(reportsTable.format, query.data.format));
  if (query.data.generationType) conditions.push(eq(reportsTable.generationType, query.data.generationType));
  const results = await db.select().from(reportsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(reportsTable.createdAt)).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListReportsResponse.parse(results));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, scheduledFor: parseDate(parsed.data.scheduledFor), deliveredAt: parseDate(parsed.data.deliveredAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(reportsTable).values(insertData).returning();
  res.status(201).json(GetReportResponse.parse(item));
});

router.get("/reports/:id", async (req, res): Promise<void> => {
  const params = GetReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(reportsTable).where(eq(reportsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(GetReportResponse.parse(item));
});

router.patch("/reports/:id", async (req, res): Promise<void> => {
  const params = UpdateReportParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, scheduledFor: parseDate(parsed.data.scheduledFor), deliveredAt: parseDate(parsed.data.deliveredAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(reportsTable).set(updateData).where(eq(reportsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Report not found" }); return; }
  res.json(GetReportResponse.parse(item));
});

router.get("/reports/export/:entity", async (req, res): Promise<void> => {
  const entity = req.params.entity;
  let rows: any[] = [];
  let headers: string[] = [];

  if (entity === "leads") {
    rows = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt)).limit(500);
    headers = ["ID", "Company", "Contact", "Source", "Status", "Priority", "Score", "Created"];
    rows = rows.map(r => [r.id, r.companyName ?? "", r.contactName ?? "", r.source ?? "", r.status ?? "", r.priority ?? "", r.fitScore ?? "", r.createdAt]);
  } else if (entity === "opportunities") {
    rows = await db.select().from(opportunitiesTable).orderBy(desc(opportunitiesTable.createdAt)).limit(500);
    headers = ["ID", "Title", "Company", "Value", "Stage", "Probability", "Owner", "Created"];
    rows = rows.map(r => [r.id, r.title ?? "", r.companyName ?? "", r.value ?? 0, r.stage ?? "", r.probability ?? 0, r.owner ?? "", r.createdAt]);
  } else if (entity === "tasks") {
    rows = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt)).limit(500);
    headers = ["ID", "Title", "Status", "Priority", "Assignee", "Due Date", "Created"];
    rows = rows.map(r => [r.id, r.title ?? "", r.status ?? "", r.priority ?? "", r.assignee ?? "", r.dueDate ?? "", r.createdAt]);
  } else if (entity === "companies") {
    rows = await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt)).limit(500);
    headers = ["ID", "Name", "Industry", "Size", "Website", "Status", "Created"];
    rows = rows.map(r => [r.id, r.name ?? "", r.industry ?? "", r.size ?? "", r.website ?? "", r.status ?? "", r.createdAt]);
  } else if (entity === "contacts") {
    rows = await db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt)).limit(500);
    headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Title", "Created"];
    rows = rows.map(r => [r.id, r.firstName ?? "", r.lastName ?? "", r.email ?? "", r.phone ?? "", r.title ?? "", r.createdAt]);
  } else if (entity === "campaigns") {
    rows = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt)).limit(500);
    headers = ["ID", "Name", "Type", "Status", "Budget", "Leads Generated", "Created"];
    rows = rows.map(r => [r.id, r.name ?? "", r.type ?? "", r.status ?? "", r.budget ?? 0, r.leadsGenerated ?? 0, r.createdAt]);
  } else {
    res.status(400).json({ error: "Invalid entity type. Supported: leads, opportunities, tasks, companies, contacts, campaigns" });
    return;
  }

  const escapeCsv = (val: any) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [headers.join(","), ...rows.map((r: any[]) => r.map(escapeCsv).join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${entity}_export_${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csv);
});

export default router;
