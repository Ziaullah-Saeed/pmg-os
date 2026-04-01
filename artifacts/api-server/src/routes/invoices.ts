import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, invoicesTable, paymentsTable, expensesTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListInvoicesQueryParams, ListInvoicesResponse,
  CreateInvoiceBody, GetInvoiceParams, GetInvoiceResponse,
  UpdateInvoiceParams, UpdateInvoiceBody,
  ListPaymentsQueryParams, ListPaymentsResponse,
  CreatePaymentBody, GetPaymentParams, GetPaymentResponse,
  ListExpensesQueryParams, ListExpensesResponse,
  CreateExpenseBody, GetExpenseParams, GetExpenseResponse,
  UpdateExpenseParams, UpdateExpenseBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/invoices", async (req, res): Promise<void> => {
  const query = ListInvoicesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(invoicesTable.status, query.data.status));
  if (query.data.type) conditions.push(eq(invoicesTable.type, query.data.type));
  if (query.data.companyId) conditions.push(eq(invoicesTable.companyId!, query.data.companyId));
  const results = await db.select().from(invoicesTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListInvoicesResponse.parse(results));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, dueDate: parseDate(parsed.data.dueDate), paidAt: parseDate(parsed.data.paidAt), issuedAt: parseDate(parsed.data.issuedAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(invoicesTable).values(insertData).returning();
  res.status(201).json(GetInvoiceResponse.parse(item));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(GetInvoiceResponse.parse(item));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, dueDate: parseDate(parsed.data.dueDate), paidAt: parseDate(parsed.data.paidAt), issuedAt: parseDate(parsed.data.issuedAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(GetInvoiceResponse.parse(item));
});

router.get("/payments", async (req, res): Promise<void> => {
  const query = ListPaymentsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(paymentsTable.status, query.data.status));
  if (query.data.invoiceId) conditions.push(eq(paymentsTable.invoiceId!, query.data.invoiceId));
  const results = await db.select().from(paymentsTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListPaymentsResponse.parse(results));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, paidAt: parseDate(parsed.data.paidAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(paymentsTable).values(insertData).returning();
  res.status(201).json(GetPaymentResponse.parse(item));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(GetPaymentResponse.parse(item));
});

router.get("/expenses", async (req, res): Promise<void> => {
  const query = ListExpensesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.status) conditions.push(eq(expensesTable.status, query.data.status));
  if (query.data.category) conditions.push(eq(expensesTable.category, query.data.category));
  const results = await db.select().from(expensesTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListExpensesResponse.parse(results));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var insertData = { ...parsed.data, paidAt: parseDate(parsed.data.paidAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.insert(expensesTable).values(insertData).returning();
  res.status(201).json(GetExpenseResponse.parse(item));
});

router.get("/expenses/:id", async (req, res): Promise<void> => {
  const params = GetExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(expensesTable).where(eq(expensesTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Expense not found" }); return; }
  res.json(GetExpenseResponse.parse(item));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    var updateData = { ...parsed.data, paidAt: parseDate(parsed.data.paidAt) };
  } catch (e: any) { res.status(400).json({ error: e.message }); return; }
  const [item] = await db.update(expensesTable).set(updateData).where(eq(expensesTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Expense not found" }); return; }
  res.json(GetExpenseResponse.parse(item));
});

export default router;
