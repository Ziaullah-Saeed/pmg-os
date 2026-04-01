import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, contractsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListContractsQueryParams, ListContractsResponse,
  CreateContractBody, GetContractParams, GetContractResponse,
  UpdateContractParams, UpdateContractBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contracts", async (req, res): Promise<void> => {
  const query = ListContractsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(contractsTable.status, query.data.status));
  if (query.data.type) conditions.push(eq(contractsTable.type, query.data.type));
  if (query.data.companyId) conditions.push(eq(contractsTable.companyId!, query.data.companyId));
  if (query.data.reviewStatus) conditions.push(eq(contractsTable.reviewStatus, query.data.reviewStatus));
  const results = await db.select().from(contractsTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListContractsResponse.parse(results));
});

router.post("/contracts", async (req, res): Promise<void> => {
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = {
      ...parsed.data,
      signedAt: parseDate(parsed.data.signedAt),
      effectiveDate: parseDate(parsed.data.effectiveDate),
      expirationDate: parseDate(parsed.data.expirationDate),
      renewalDate: parseDate(parsed.data.renewalDate),
    };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(contractsTable).values(insertData).returning();
  res.status(201).json(GetContractResponse.parse(item));
});

router.get("/contracts/:id", async (req, res): Promise<void> => {
  const params = GetContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(contractsTable).where(eq(contractsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Contract not found" }); return; }
  res.json(GetContractResponse.parse(item));
});

router.patch("/contracts/:id", async (req, res): Promise<void> => {
  const params = UpdateContractParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateContractBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = {
      ...parsed.data,
      signedAt: parseDate(parsed.data.signedAt),
      effectiveDate: parseDate(parsed.data.effectiveDate),
      expirationDate: parseDate(parsed.data.expirationDate),
      renewalDate: parseDate(parsed.data.renewalDate),
    };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(contractsTable).set(updateData).where(eq(contractsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Contract not found" }); return; }
  res.json(GetContractResponse.parse(item));
});

export default router;
