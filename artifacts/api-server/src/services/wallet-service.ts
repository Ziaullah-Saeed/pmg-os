import { db, walletTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";

const LOW_BALANCE_THRESHOLD = 10;
const CRITICAL_BALANCE_THRESHOLD = 2;

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
};

export async function getWalletBalance(): Promise<{ balance: number; id: number }> {
  const rows = await db.select().from(walletTable).limit(1);
  if (rows.length === 0) {
    const [w] = await db.insert(walletTable).values({ balance: "100.0000" }).returning();
    return { balance: Number(w.balance), id: w.id };
  }
  return { balance: Number(rows[0].balance), id: rows[0].id };
}

export async function chargeWallet(params: {
  tool: string;
  domain: string;
  action: string;
  entityType?: string;
  entityId?: number;
  description?: string;
  customAmount?: number;
}): Promise<{ success: boolean; charged: number; balanceAfter: number; transactionId: number } | { success: false; error: string }> {
  const cost = params.customAmount ?? TOOL_COSTS[params.tool] ?? 0.01;
  const wallet = await getWalletBalance();

  if (wallet.balance < cost) {
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
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description ?? `${params.tool}: ${params.action}`,
  }).returning();

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

  broadcast("wallet_update", { type: "charge", amount: cost, balance: newBalance });
  return { success: true, charged: cost, balanceAfter: newBalance, transactionId: tx.id };
}

export async function fundWallet(amount: number): Promise<{ balance: number }> {
  const wallet = await getWalletBalance();
  const newBalance = wallet.balance + amount;
  await db.update(walletTable).set({ balance: newBalance.toFixed(4) }).where(eq(walletTable.id, wallet.id));

  await db.insert(walletTransactionsTable).values({
    type: "fund",
    amount: amount.toFixed(4),
    balanceAfter: newBalance.toFixed(4),
    domain: "system",
    action: "fund_wallet",
    description: `Wallet funded with $${amount.toFixed(2)}`,
  });

  await logAudit({
    eventType: "wallet_funded",
    domain: "system",
    action: "fund_wallet",
    description: `Wallet funded with $${amount.toFixed(2)}. New balance: $${newBalance.toFixed(2)}`,
    actor: "admin",
    actorType: "human",
    severity: "info",
    metadata: { amount, newBalance },
  });

  broadcast("wallet_update", { type: "fund", amount, balance: newBalance });
  return { balance: newBalance };
}

export async function getWalletTransactions(limit = 50) {
  return db.select().from(walletTransactionsTable).orderBy(desc(walletTransactionsTable.createdAt)).limit(limit);
}
