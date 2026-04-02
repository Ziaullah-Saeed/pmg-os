import { pgTable, serial, text, integer, numeric, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const walletTable = pgTable("wallet", {
  id: serial("id").primaryKey(),
  balance: numeric("balance", { precision: 12, scale: 4 }).notNull().default("100.0000"),
  reservedBalance: numeric("reserved_balance", { precision: 12, scale: 4 }).notNull().default("0.0000"),
  currency: text("currency").notNull().default("USD"),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 4 }).notNull(),
  domain: text("domain").notNull(),
  action: text("action").notNull(),
  tool: text("tool"),
  provider: text("provider"),
  workflow: text("workflow"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  description: text("description"),
  cached: boolean("cached").default(false),
  reservationId: text("reservation_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletSpendThresholdsTable = pgTable("wallet_spend_thresholds", {
  id: serial("id").primaryKey(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id").notNull(),
  dailyLimit: numeric("daily_limit", { precision: 12, scale: 4 }),
  monthlyLimit: numeric("monthly_limit", { precision: 12, scale: 4 }),
  perActionCap: numeric("per_action_cap", { precision: 12, scale: 4 }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const walletCacheTable = pgTable("wallet_cache", {
  id: serial("id").primaryKey(),
  cacheKey: text("cache_key").notNull(),
  cacheType: text("cache_type").notNull(),
  domain: text("domain"),
  inputHash: text("input_hash").notNull(),
  result: jsonb("result").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  hitCount: integer("hit_count").notNull().default(0),
  costSaved: numeric("cost_saved", { precision: 12, scale: 4 }).notNull().default("0.0000"),
  originalCost: numeric("original_cost", { precision: 12, scale: 4 }).notNull().default("0.0000"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastHitAt: timestamp("last_hit_at"),
});
