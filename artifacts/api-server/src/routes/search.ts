import { Router, type IRouter } from "express";
import { db, companiesTable, contactsTable, leadsTable, opportunitiesTable, tasksTable, documentsTable, campaignsTable } from "@workspace/db";
import { ilike, or, sql, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = (req.query.q as string || "").trim();
  if (q.length < 2) {
    res.json({ results: [], query: q });
    return;
  }

  const pattern = `%${q}%`;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const [companies, contacts, leads, opportunities, tasks, documents, campaigns] = await Promise.all([
    db.select({ id: companiesTable.id, name: companiesTable.name, type: sql<string>`'company'` })
      .from(companiesTable)
      .where(or(ilike(companiesTable.name, pattern), ilike(companiesTable.industry, pattern)))
      .limit(limit),
    db.select({ id: contactsTable.id, name: sql<string>`${contactsTable.firstName} || ' ' || ${contactsTable.lastName}`, type: sql<string>`'contact'` })
      .from(contactsTable)
      .where(or(ilike(contactsTable.firstName, pattern), ilike(contactsTable.lastName, pattern), ilike(contactsTable.email, pattern)))
      .limit(limit),
    db.select({
        id: leadsTable.id,
        name: sql<string>`COALESCE(${companiesTable.name}, 'Lead #' || ${leadsTable.id})`,
        type: sql<string>`'lead'`,
      })
      .from(leadsTable)
      .leftJoin(companiesTable, eq(leadsTable.companyId, companiesTable.id))
      .where(or(
        ilike(companiesTable.name, pattern),
        ilike(leadsTable.source, pattern),
        ilike(leadsTable.notes, pattern),
        ilike(leadsTable.assignedTo, pattern),
      ))
      .limit(limit),
    db.select({ id: opportunitiesTable.id, name: opportunitiesTable.title, type: sql<string>`'opportunity'` })
      .from(opportunitiesTable)
      .where(ilike(opportunitiesTable.title, pattern))
      .limit(limit),
    db.select({ id: tasksTable.id, name: tasksTable.title, type: sql<string>`'task'` })
      .from(tasksTable)
      .where(or(ilike(tasksTable.title, pattern), ilike(tasksTable.description, pattern)))
      .limit(limit),
    db.select({ id: documentsTable.id, name: documentsTable.title, type: sql<string>`'document'` })
      .from(documentsTable)
      .where(or(ilike(documentsTable.title, pattern), ilike(documentsTable.content, pattern)))
      .limit(limit),
    db.select({ id: campaignsTable.id, name: campaignsTable.name, type: sql<string>`'campaign'` })
      .from(campaignsTable)
      .where(ilike(campaignsTable.name, pattern))
      .limit(limit),
  ]);

  const results = [
    ...companies.map(r => ({ ...r, entityType: "company" })),
    ...contacts.map(r => ({ ...r, entityType: "contact" })),
    ...leads.map(r => ({ ...r, entityType: "lead" })),
    ...opportunities.map(r => ({ ...r, entityType: "opportunity" })),
    ...tasks.map(r => ({ ...r, entityType: "task" })),
    ...documents.map(r => ({ ...r, entityType: "document" })),
    ...campaigns.map(r => ({ ...r, entityType: "campaign" })),
  ].slice(0, limit);

  res.json({ results, query: q, total: results.length });
});

export default router;
