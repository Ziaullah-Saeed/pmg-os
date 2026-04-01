import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import {
  ListCompaniesQueryParams,
  ListCompaniesResponse,
  CreateCompanyBody,
  GetCompanyParams,
  GetCompanyResponse,
  UpdateCompanyParams,
  UpdateCompanyBody,
  UpdateCompanyResponse,
  DeleteCompanyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/companies", async (req, res): Promise<void> => {
  const query = ListCompaniesQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.search) {
      conditions.push(ilike(companiesTable.name, `%${query.data.search}%`));
    }
    if (query.data.status) {
      conditions.push(eq(companiesTable.status, query.data.status));
    }
    if (query.data.industry) {
      conditions.push(eq(companiesTable.industry, query.data.industry));
    }
  }
  const companies = await db
    .select()
    .from(companiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(companiesTable.createdAt);
  res.json(ListCompaniesResponse.parse(companies));
});

router.post("/companies", async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [company] = await db.insert(companiesTable).values(parsed.data).returning();
  res.status(201).json(GetCompanyResponse.parse(company));
});

router.get("/companies/:id", async (req, res): Promise<void> => {
  const params = GetCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, params.data.id));
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(GetCompanyResponse.parse(company));
});

router.patch("/companies/:id", async (req, res): Promise<void> => {
  const params = UpdateCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [company] = await db.update(companiesTable).set(parsed.data).where(eq(companiesTable.id, params.data.id)).returning();
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(UpdateCompanyResponse.parse(company));
});

router.delete("/companies/:id", async (req, res): Promise<void> => {
  const params = DeleteCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [company] = await db.delete(companiesTable).where(eq(companiesTable.id, params.data.id)).returning();
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
