import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, contactsTable, companiesTable } from "@workspace/db";
import {
  ListContactsQueryParams,
  ListContactsResponse,
  CreateContactBody,
  GetContactParams,
  GetContactResponse,
  UpdateContactParams,
  UpdateContactBody,
  UpdateContactResponse,
  DeleteContactParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contacts", async (req, res): Promise<void> => {
  const query = ListContactsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.search) {
      conditions.push(ilike(contactsTable.firstName, `%${query.data.search}%`));
    }
    if (query.data.companyId) {
      conditions.push(eq(contactsTable.companyId, query.data.companyId));
    }
  }
  const rows = await db
    .select({
      id: contactsTable.id,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      title: contactsTable.title,
      role: contactsTable.role,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      isDecisionMaker: contactsTable.isDecisionMaker,
      authorityLevel: contactsTable.authorityLevel,
      linkedinUrl: contactsTable.linkedinUrl,
      status: contactsTable.status,
      notes: contactsTable.notes,
      createdAt: contactsTable.createdAt,
      updatedAt: contactsTable.updatedAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(contactsTable.createdAt);
  res.json(ListContactsResponse.parse(rows));
});

router.post("/contacts", async (req, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contact] = await db.insert(contactsTable).values(parsed.data).returning();
  res.status(201).json(GetContactResponse.parse(contact));
});

router.get("/contacts/:id", async (req, res): Promise<void> => {
  const params = GetContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [contact] = await db
    .select({
      id: contactsTable.id,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      title: contactsTable.title,
      role: contactsTable.role,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      isDecisionMaker: contactsTable.isDecisionMaker,
      authorityLevel: contactsTable.authorityLevel,
      linkedinUrl: contactsTable.linkedinUrl,
      status: contactsTable.status,
      notes: contactsTable.notes,
      createdAt: contactsTable.createdAt,
      updatedAt: contactsTable.updatedAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(eq(contactsTable.id, params.data.id));
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(GetContactResponse.parse(contact));
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const params = UpdateContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contact] = await db.update(contactsTable).set(parsed.data).where(eq(contactsTable.id, params.data.id)).returning();
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(UpdateContactResponse.parse(contact));
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const params = DeleteContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [contact] = await db.delete(contactsTable).where(eq(contactsTable.id, params.data.id)).returning();
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
