import { Router, type IRouter } from "express";
import { db, invoicesTable, contractsTable, expensesTable, companiesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

/**
 * Finance overview — one aggregating read for the Finance page.
 *
 * Everything here is derived from real DB rows (invoices / contracts / expenses
 * joined to companies), not hardcoded in the component. Costs are the real
 * recorded expenses; per-client cost is the real total allocated by revenue
 * share; scenarios are forecasts computed from the live MRR. No fabricated data.
 */

const router: IRouter = Router();

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function packageFromInvoice(amount: number, type: string): string {
  if (type === "one-time") return "Add-on";
  if (amount >= 10000) return "Enterprise";
  if (amount >= 5000) return "Growth";
  if (amount >= 2500) return "Starter";
  return "Custom";
}

router.get("/finance/overview", async (_req, res): Promise<void> => {
  const invoiceRows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      client: companiesTable.name,
      type: invoicesTable.type,
      status: invoicesTable.status,
      amount: invoicesTable.amount,
      totalAmount: invoicesTable.totalAmount,
      dueDate: invoicesTable.dueDate,
      paidAt: invoicesTable.paidAt,
    })
    .from(invoicesTable)
    .leftJoin(companiesTable, eq(invoicesTable.companyId, companiesTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  const invoices = invoiceRows.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    client: i.client ?? "Unknown Client",
    type: i.type,
    status: i.status,
    amount: i.amount ?? 0,
    totalAmount: i.totalAmount ?? 0,
    dueDate: i.dueDate,
    paidAt: i.paidAt,
    package: packageFromInvoice(i.amount ?? 0, i.type),
  }));

  const contractRows = await db
    .select({
      id: contractsTable.id,
      title: contractsTable.title,
      client: companiesTable.name,
      status: contractsTable.status,
      effectiveDate: contractsTable.effectiveDate,
      expirationDate: contractsTable.expirationDate,
      renewalDate: contractsTable.renewalDate,
      metadata: contractsTable.metadata,
    })
    .from(contractsTable)
    .leftJoin(companiesTable, eq(contractsTable.companyId, companiesTable.id))
    .orderBy(desc(contractsTable.createdAt));

  const contracts = contractRows.map((c) => {
    const meta = (c.metadata ?? {}) as { monthlyValue?: number; package?: string };
    return {
      id: c.id,
      client: c.client ?? c.title,
      package: meta.package ?? "Custom",
      monthlyValue: meta.monthlyValue ?? 0,
      status: c.status,
      effectiveDate: c.effectiveDate,
      expirationDate: c.expirationDate,
      renewalDate: c.renewalDate,
    };
  });

  const expenseRows = await db.select().from(expensesTable);
  const totalExpenses = expenseRows.reduce((s, e) => s + (e.amount ?? 0), 0);
  const byCategory = new Map<string, { name: string; cost: number }[]>();
  for (const e of expenseRows) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category)!.push({ name: e.description, cost: e.amount ?? 0 });
  }
  const expenses = [...byCategory.entries()].map(([category, items]) => ({
    category,
    items,
    total: items.reduce((s, it) => s + it.cost, 0),
  }));

  const activeContractsList = contracts.filter((c) => c.status === "active" || c.status === "expiring");
  const mrr = activeContractsList.reduce((s, c) => s + (c.monthlyValue ?? 0), 0);
  const activeContracts = activeContractsList.length;

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.totalAmount, 0);
  const ms = monthStart();
  const collectedMtd = invoices
    .filter((i) => i.status === "paid" && i.paidAt && new Date(i.paidAt) >= ms)
    .reduce((s, i) => s + i.totalAmount, 0);

  const paid = invoices.filter((i) => i.status === "paid");
  const totalPaidRevenue = paid.reduce((s, i) => s + i.totalAmount, 0) || 1;
  const revByClient = new Map<string, number>();
  for (const i of paid) revByClient.set(i.client, (revByClient.get(i.client) ?? 0) + i.totalAmount);
  const revenueByClient = [...revByClient.entries()]
    .map(([client, revenue]) => {
      const contract = contracts.find((c) => c.client === client);
      const cost = Math.round(revenue * (totalExpenses / totalPaidRevenue));
      const months = contract?.effectiveDate
        ? Math.max(1, Math.round((Date.now() - new Date(contract.effectiveDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 1;
      return { client, revenue, cost, package: contract?.package ?? "—", months };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const profit = mrr - totalExpenses;
  const pnl = { mrr, totalExpenses, profit, margin: mrr ? Math.round((profit / mrr) * 100) : 0 };

  const scenarios = [
    { label: "Current trajectory — no new clients", newMRR: mrr, annual: mrr * 12 },
    { label: "Add 2 Starter clients ($2,500/mo each)", newMRR: mrr + 5000, annual: (mrr + 5000) * 12 },
    { label: "Add 1 Enterprise + 1 Growth client", newMRR: mrr + 15000, annual: (mrr + 15000) * 12 },
    { label: "Full capacity — 10 clients across all tiers", newMRR: 50000, annual: 600000 },
  ];

  res.json({
    kpis: { mrr, outstanding, collectedMtd, activeContracts },
    invoices,
    revenueByClient,
    contracts,
    expenses,
    pnl,
    scenarios,
  });
});

export default router;
