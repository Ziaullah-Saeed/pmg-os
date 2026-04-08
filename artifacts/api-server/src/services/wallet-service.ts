import { db, walletTable, walletTransactionsTable, walletSpendThresholdsTable } from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";

const LOW_BALANCE_THRESHOLD = 10;
const CRITICAL_BALANCE_THRESHOLD = 2;
const ANOMALY_MULTIPLIER = 5;

let dummyMode = process.env.NODE_ENV !== "production";

const TOOL_COSTS: Record<string, number> = {
  "ai-enrich-lead": 0.05,
  "ai-score-company": 0.03,
  "ai-generate-outreach": 0.08,
  "ai-summarize-record": 0.04,
  "ai-generate-report": 0.15,
  "ai-suggest-action": 0.03,
  "ai-analyze-sentiment": 0.03,
  "ghl-sync-lead": 0.02,
  "ghl-sync-contact": 0.02,
  "apollo-enrich": 0.10,
  "clay-enrich": 0.12,
  "midjourney-generate": 0.50,
  "elevenlabs-voice": 0.25,
  "perplexity-research": 0.08,
  "exa-search": 0.05,
  "ai-draft-email": 0.04,
  "ai-review-contract": 0.10,
  "ai-generate-asset": 0.20,
  "ai-research-prospect": 0.06,
  "ai-crm-summary": 0.04,
  "ai-manual-guide": 0.05,
  "orchestrated": 0.05,
};

const providerSpendTracker = new Map<string, { daily: number; monthly: number; lastDayReset: string; lastMonthReset: string }>();
const workflowSpendTracker = new Map<string, { daily: number; monthly: number; lastDayReset: string; lastMonthReset: string }>();
const recentCharges: Array<{ amount: number; ts: number; tool: string }> = [];
const reservations = new Map<string, { amount: number; domain: string; tool: string; createdAt: number }>();

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function trackSpend(tracker: Map<string, { daily: number; monthly: number; lastDayReset: string; lastMonthReset: string }>, key: string, amount: number) {
  const today = getToday();
  const month = getMonth();
  const entry = tracker.get(key);
  if (!entry) {
    tracker.set(key, { daily: amount, monthly: amount, lastDayReset: today, lastMonthReset: month });
  } else {
    if (entry.lastMonthReset !== month) {
      entry.monthly = 0;
      entry.lastMonthReset = month;
    }
    if (entry.lastDayReset !== today) {
      entry.daily = 0;
      entry.lastDayReset = today;
    }
    entry.daily += amount;
    entry.monthly += amount;
  }
}

function getSpend(tracker: Map<string, { daily: number; monthly: number; lastDayReset: string; lastMonthReset: string }>, key: string) {
  const today = getToday();
  const month = getMonth();
  const entry = tracker.get(key);
  if (!entry) return { daily: 0, monthly: 0 };
  const daily = entry.lastDayReset === today ? entry.daily : 0;
  const monthly = entry.lastMonthReset === month ? entry.monthly : 0;
  return { daily, monthly };
}

export function setDummyMode(enabled: boolean) {
  dummyMode = enabled;
  broadcast("wallet_dummy_mode", { enabled });
}

export function isDummyMode(): boolean {
  return dummyMode;
}

export function getToolCost(tool: string): number {
  return TOOL_COSTS[tool] ?? 0.01;
}

export async function getWalletBalance(): Promise<{ balance: number; reservedBalance: number; availableBalance: number; id: number }> {
  const rows = await db.select().from(walletTable).limit(1);
  if (rows.length === 0) {
    const [w] = await db.insert(walletTable).values({ balance: "355.0200", reservedBalance: "0.0000" }).returning();
    return { balance: Number(w.balance), reservedBalance: Number(w.reservedBalance), availableBalance: Number(w.balance), id: w.id };
  }
  const bal = Number(rows[0].balance);
  const res = Number(rows[0].reservedBalance);
  return { balance: bal, reservedBalance: res, availableBalance: bal - res, id: rows[0].id };
}

export async function reserveBalance(params: {
  amount: number;
  tool: string;
  domain: string;
  reservationId: string;
}): Promise<{ success: boolean; reservationId: string; error?: string }> {
  if (dummyMode) {
    reservations.set(params.reservationId, { amount: params.amount, domain: params.domain, tool: params.tool, createdAt: Date.now() });
    return { success: true, reservationId: params.reservationId };
  }

  const wallet = await getWalletBalance();
  if (wallet.availableBalance < params.amount) {
    return { success: false, reservationId: params.reservationId, error: "Insufficient available balance for reservation" };
  }

  const newReserved = wallet.reservedBalance + params.amount;
  await db.update(walletTable).set({ reservedBalance: newReserved.toFixed(4) }).where(eq(walletTable.id, wallet.id));
  reservations.set(params.reservationId, { amount: params.amount, domain: params.domain, tool: params.tool, createdAt: Date.now() });

  broadcast("wallet_update", { type: "reserve", amount: params.amount, reservedBalance: newReserved });
  return { success: true, reservationId: params.reservationId };
}

export async function commitReserve(reservationId: string, actualAmount?: number): Promise<{ success: boolean; charged: number; balanceAfter: number }> {
  const reservation = reservations.get(reservationId);
  if (!reservation) return { success: false, charged: 0, balanceAfter: 0 };

  const chargeAmount = actualAmount ?? reservation.amount;
  reservations.delete(reservationId);

  if (dummyMode) {
    return { success: true, charged: 0, balanceAfter: 0 };
  }

  const wallet = await getWalletBalance();
  const newBalance = wallet.balance - chargeAmount;
  const newReserved = Math.max(0, wallet.reservedBalance - reservation.amount);

  await db.update(walletTable).set({
    balance: newBalance.toFixed(4),
    reservedBalance: newReserved.toFixed(4),
  }).where(eq(walletTable.id, wallet.id));

  await db.insert(walletTransactionsTable).values({
    type: "charge",
    amount: (-chargeAmount).toFixed(4),
    balanceAfter: newBalance.toFixed(4),
    domain: reservation.domain,
    action: "commit_reserve",
    tool: reservation.tool,
    reservationId,
    description: `Reserved charge committed: ${reservation.tool}`,
  });

  trackSpend(providerSpendTracker, reservation.tool, chargeAmount);
  broadcast("wallet_update", { type: "commit", amount: chargeAmount, balance: newBalance });

  return { success: true, charged: chargeAmount, balanceAfter: newBalance };
}

export async function releaseReserve(reservationId: string): Promise<boolean> {
  const reservation = reservations.get(reservationId);
  if (!reservation) return false;
  reservations.delete(reservationId);

  if (dummyMode) return true;

  const wallet = await getWalletBalance();
  const newReserved = Math.max(0, wallet.reservedBalance - reservation.amount);
  await db.update(walletTable).set({ reservedBalance: newReserved.toFixed(4) }).where(eq(walletTable.id, wallet.id));

  broadcast("wallet_update", { type: "release_reserve", amount: reservation.amount, reservedBalance: newReserved });
  return true;
}

export function getActiveReservations() {
  return Array.from(reservations.entries()).map(([id, r]) => ({
    reservationId: id,
    ...r,
    ageMs: Date.now() - r.createdAt,
  }));
}

async function checkThresholds(tool: string, workflow: string | undefined, amount: number): Promise<{ allowed: boolean; reason?: string }> {
  const thresholds = await db.select().from(walletSpendThresholdsTable).where(eq(walletSpendThresholdsTable.enabled, true));

  for (const t of thresholds) {
    if (t.scopeType === "provider" && t.scopeId === tool) {
      const spend = getSpend(providerSpendTracker, tool);
      if (t.dailyLimit && spend.daily + amount > Number(t.dailyLimit)) {
        return { allowed: false, reason: `Provider ${tool} daily limit ($${t.dailyLimit}) would be exceeded` };
      }
      if (t.monthlyLimit && spend.monthly + amount > Number(t.monthlyLimit)) {
        return { allowed: false, reason: `Provider ${tool} monthly limit ($${t.monthlyLimit}) would be exceeded` };
      }
      if (t.perActionCap && amount > Number(t.perActionCap)) {
        return { allowed: false, reason: `Amount $${amount.toFixed(4)} exceeds per-action cap $${t.perActionCap} for ${tool}` };
      }
    }

    if (t.scopeType === "workflow" && workflow && t.scopeId === workflow) {
      const spend = getSpend(workflowSpendTracker, workflow);
      if (t.dailyLimit && spend.daily + amount > Number(t.dailyLimit)) {
        return { allowed: false, reason: `Workflow ${workflow} daily limit ($${t.dailyLimit}) would be exceeded` };
      }
      if (t.monthlyLimit && spend.monthly + amount > Number(t.monthlyLimit)) {
        return { allowed: false, reason: `Workflow ${workflow} monthly limit ($${t.monthlyLimit}) would be exceeded` };
      }
    }

    if (t.scopeType === "global") {
      const allProviderSpend = Array.from(providerSpendTracker.values()).reduce((s, v) => s + v.daily, 0);
      if (t.dailyLimit && allProviderSpend + amount > Number(t.dailyLimit)) {
        return { allowed: false, reason: `Global daily spend limit ($${t.dailyLimit}) would be exceeded` };
      }
    }
  }

  return { allowed: true };
}

function detectAnomaly(tool: string, amount: number): boolean {
  const now = Date.now();
  const recent = recentCharges.filter(c => c.tool === tool && now - c.ts < 3600000);
  if (recent.length < 3) return false;
  const avg = recent.reduce((s, c) => s + c.amount, 0) / recent.length;
  return amount > avg * ANOMALY_MULTIPLIER;
}

export async function chargeWallet(params: {
  tool: string;
  domain: string;
  action: string;
  provider?: string;
  workflow?: string;
  entityType?: string;
  entityId?: number;
  description?: string;
  customAmount?: number;
  cached?: boolean;
}): Promise<{ success: boolean; charged: number; balanceAfter: number; transactionId: number; cached?: boolean } | { success: false; error: string }> {
  if (params.cached) {
    const wallet = await getWalletBalance();
    const [tx] = await db.insert(walletTransactionsTable).values({
      type: "cache_hit",
      amount: "0.0000",
      balanceAfter: wallet.balance.toFixed(4),
      domain: params.domain,
      action: params.action,
      tool: params.tool,
      provider: params.provider,
      workflow: params.workflow,
      cached: true,
      description: params.description ?? `Cache hit: ${params.tool}`,
    }).returning();

    return { success: true, charged: 0, balanceAfter: wallet.balance, transactionId: tx.id, cached: true };
  }

  const cost = params.customAmount ?? TOOL_COSTS[params.tool] ?? 0.01;

  if (dummyMode) {
    const wallet = await getWalletBalance();
    const [tx] = await db.insert(walletTransactionsTable).values({
      type: "dummy",
      amount: "0.0000",
      balanceAfter: wallet.balance.toFixed(4),
      domain: params.domain,
      action: params.action,
      tool: params.tool,
      provider: params.provider,
      workflow: params.workflow,
      description: `[DUMMY] ${params.description ?? params.tool}: ${params.action}`,
    }).returning();

    return { success: true, charged: 0, balanceAfter: wallet.balance, transactionId: tx.id };
  }

  const thresholdCheck = await checkThresholds(params.tool, params.workflow, cost);
  if (!thresholdCheck.allowed) {
    await createNotification({
      type: "wallet_threshold_blocked",
      severity: "warning",
      title: "Spend Threshold Exceeded",
      message: thresholdCheck.reason!,
      domain: params.domain,
      actor: "wallet_guard",
    }).catch(() => {});
    return { success: false, error: thresholdCheck.reason! };
  }

  if (detectAnomaly(params.tool, cost)) {
    await createNotification({
      type: "wallet_anomaly",
      severity: "warning",
      title: "Spend Anomaly Detected",
      message: `Unusual charge of $${cost.toFixed(4)} for ${params.tool} (${ANOMALY_MULTIPLIER}x above average). Action: ${params.action}`,
      domain: params.domain,
      actor: "wallet_guard",
    }).catch(() => {});
  }

  const wallet = await getWalletBalance();
  if (wallet.availableBalance < cost) {
    return { success: false, error: "Insufficient wallet balance" };
  }

  const newBalance = wallet.balance - cost;
  await db.update(walletTable).set({ balance: newBalance.toFixed(4) }).where(eq(walletTable.id, wallet.id));

  const [tx] = await db.insert(walletTransactionsTable).values({
    type: "charge",
    amount: (-cost).toFixed(4),
    balanceAfter: newBalance.toFixed(4),
    domain: params.domain,
    action: params.action,
    tool: params.tool,
    provider: params.provider ?? params.tool,
    workflow: params.workflow,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description ?? `${params.tool}: ${params.action}`,
  }).returning();

  trackSpend(providerSpendTracker, params.provider ?? params.tool, cost);
  if (params.workflow) trackSpend(workflowSpendTracker, params.workflow, cost);

  recentCharges.push({ amount: cost, ts: Date.now(), tool: params.tool });
  if (recentCharges.length > 500) recentCharges.splice(0, 100);

  if (newBalance <= CRITICAL_BALANCE_THRESHOLD) {
    await createNotification({
      type: "wallet_critical",
      severity: "critical",
      title: "Critical Wallet Balance",
      message: `Wallet balance is $${newBalance.toFixed(2)} — AI operations may be blocked. Fund your wallet immediately.`,
      domain: "system",
      actor: "wallet_guard",
    }).catch(() => {});
  } else if (newBalance <= LOW_BALANCE_THRESHOLD) {
    await createNotification({
      type: "wallet_low_balance",
      severity: "warning",
      title: "Low Wallet Balance",
      message: `Wallet balance is $${newBalance.toFixed(2)}. Consider adding funds to avoid interruptions.`,
      domain: "system",
      actor: "wallet_guard",
    }).catch(() => {});
  }

  broadcast("wallet_update", { type: "charge", amount: cost, balance: newBalance, provider: params.provider, tool: params.tool });
  return { success: true, charged: cost, balanceAfter: newBalance, transactionId: tx.id };
}

export async function fundWallet(amount: number): Promise<{ balance: number }> {
  const wallet = await getWalletBalance();
  const newBalance = wallet.balance + amount;
  if (newBalance < 0) throw new Error("Insufficient balance for withdrawal");
  await db.update(walletTable).set({ balance: newBalance.toFixed(4) }).where(eq(walletTable.id, wallet.id));

  const isWithdrawal = amount < 0;
  const absAmount = Math.abs(amount);

  await db.insert(walletTransactionsTable).values({
    type: isWithdrawal ? "debit" : "fund",
    amount: amount.toFixed(4),
    balanceAfter: newBalance.toFixed(4),
    domain: "system",
    action: isWithdrawal ? "withdraw_wallet" : "fund_wallet",
    description: isWithdrawal ? `Wallet withdrawal of $${absAmount.toFixed(2)}` : `Wallet funded with $${absAmount.toFixed(2)}`,
  });

  await logAudit({
    eventType: isWithdrawal ? "wallet_withdrawal" : "wallet_funded",
    domain: "system",
    action: isWithdrawal ? "withdraw_wallet" : "fund_wallet",
    description: isWithdrawal
      ? `Wallet withdrawal of $${absAmount.toFixed(2)}. New balance: $${newBalance.toFixed(2)}`
      : `Wallet funded with $${absAmount.toFixed(2)}. New balance: $${newBalance.toFixed(2)}`,
    actor: "admin",
    actorType: "human",
    severity: "info",
    metadata: { amount, newBalance },
  });

  broadcast("wallet_update", { type: isWithdrawal ? "withdrawal" : "fund", amount, balance: newBalance });
  return { balance: newBalance };
}

export async function getWalletTransactions(limit = 50) {
  return db.select().from(walletTransactionsTable).orderBy(desc(walletTransactionsTable.createdAt)).limit(limit);
}

export async function getActionLedger(params: {
  limit?: number;
  domain?: string;
  tool?: string;
  provider?: string;
  workflow?: string;
  type?: string;
  from?: Date;
  to?: Date;
}) {
  const conditions: any[] = [];
  if (params.domain) conditions.push(eq(walletTransactionsTable.domain, params.domain));
  if (params.tool) conditions.push(eq(walletTransactionsTable.tool, params.tool));
  if (params.provider) conditions.push(eq(walletTransactionsTable.provider, params.provider));
  if (params.workflow) conditions.push(eq(walletTransactionsTable.workflow, params.workflow));
  if (params.type) conditions.push(eq(walletTransactionsTable.type, params.type));
  if (params.from) conditions.push(gte(walletTransactionsTable.createdAt, params.from));

  const query = conditions.length > 0
    ? db.select().from(walletTransactionsTable).where(and(...conditions)).orderBy(desc(walletTransactionsTable.createdAt)).limit(params.limit ?? 100)
    : db.select().from(walletTransactionsTable).orderBy(desc(walletTransactionsTable.createdAt)).limit(params.limit ?? 100);

  return query;
}

export async function getSpendAnalytics() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todaySpend] = await db.select({
    total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(walletTransactionsTable)
    .where(and(
      eq(walletTransactionsTable.type, "charge"),
      gte(walletTransactionsTable.createdAt, todayStart),
    ));

  const [monthSpend] = await db.select({
    total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(walletTransactionsTable)
    .where(and(
      eq(walletTransactionsTable.type, "charge"),
      gte(walletTransactionsTable.createdAt, monthStart),
    ));

  const providerBreakdown = await db.select({
    provider: sql<string>`COALESCE(${walletTransactionsTable.provider}, ${walletTransactionsTable.tool}, 'unknown')`,
    total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.type, "charge"))
    .groupBy(sql`COALESCE(${walletTransactionsTable.provider}, ${walletTransactionsTable.tool}, 'unknown')`)
    .orderBy(sql`SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))) DESC`)
    .limit(20);

  const workflowBreakdown = await db.select({
    workflow: walletTransactionsTable.workflow,
    total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(walletTransactionsTable)
    .where(and(
      eq(walletTransactionsTable.type, "charge"),
      sql`${walletTransactionsTable.workflow} IS NOT NULL`,
    ))
    .groupBy(walletTransactionsTable.workflow)
    .orderBy(sql`SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))) DESC`)
    .limit(20);

  const domainBreakdown = await db.select({
    domain: walletTransactionsTable.domain,
    total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.type, "charge"))
    .groupBy(walletTransactionsTable.domain)
    .orderBy(sql`SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))) DESC`);

  const cacheHits = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.type, "cache_hit"));

  const totalSaved = await db.select({
    total: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactionsTable.amount} AS NUMERIC))), 0)`,
  }).from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.type, "cache_hit"));

  return {
    today: { spent: Number(todaySpend.total), transactions: Number(todaySpend.count) },
    month: { spent: Number(monthSpend.total), transactions: Number(monthSpend.count) },
    byProvider: providerBreakdown.map(p => ({ provider: p.provider, spent: Number(p.total), transactions: Number(p.count) })),
    byWorkflow: workflowBreakdown.map(w => ({ workflow: w.workflow, spent: Number(w.total), transactions: Number(w.count) })),
    byDomain: domainBreakdown.map(d => ({ domain: d.domain, spent: Number(d.total), transactions: Number(d.count) })),
    cacheStats: { hits: Number(cacheHits[0]?.count ?? 0), totalSaved: Number(totalSaved[0]?.total ?? 0) },
    dummyMode,
  };
}

export async function getSpendThresholds() {
  return db.select().from(walletSpendThresholdsTable).orderBy(walletSpendThresholdsTable.scopeType);
}

export async function upsertSpendThreshold(params: {
  scopeType: string;
  scopeId: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  perActionCap?: number;
  enabled?: boolean;
}) {
  const existing = await db.select().from(walletSpendThresholdsTable)
    .where(and(
      eq(walletSpendThresholdsTable.scopeType, params.scopeType),
      eq(walletSpendThresholdsTable.scopeId, params.scopeId),
    )).limit(1);

  if (existing.length > 0) {
    const [updated] = await db.update(walletSpendThresholdsTable).set({
      dailyLimit: params.dailyLimit?.toFixed(4),
      monthlyLimit: params.monthlyLimit?.toFixed(4),
      perActionCap: params.perActionCap?.toFixed(4),
      enabled: params.enabled,
    }).where(eq(walletSpendThresholdsTable.id, existing[0].id)).returning();
    return updated;
  }

  const [created] = await db.insert(walletSpendThresholdsTable).values({
    scopeType: params.scopeType,
    scopeId: params.scopeId,
    dailyLimit: params.dailyLimit?.toFixed(4),
    monthlyLimit: params.monthlyLimit?.toFixed(4),
    perActionCap: params.perActionCap?.toFixed(4),
    enabled: params.enabled ?? true,
  }).returning();
  return created;
}

export async function deleteSpendThreshold(id: number) {
  await db.delete(walletSpendThresholdsTable).where(eq(walletSpendThresholdsTable.id, id));
}

export function getProviderSpendSummary() {
  const result: Record<string, { daily: number; monthly: number }> = {};
  for (const [key, val] of providerSpendTracker) {
    result[key] = getSpend(providerSpendTracker, key);
  }
  return result;
}

export function getWorkflowSpendSummary() {
  const result: Record<string, { daily: number; monthly: number }> = {};
  for (const [key, val] of workflowSpendTracker) {
    result[key] = getSpend(workflowSpendTracker, key);
  }
  return result;
}
