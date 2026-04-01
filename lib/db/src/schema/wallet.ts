import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";

export const walletTable = pgTable("wallet", {
  id: serial("id").primaryKey(),
  balance: numeric("balance", { precision: 12, scale: 4 }).notNull().default("100.0000"),
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
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});
