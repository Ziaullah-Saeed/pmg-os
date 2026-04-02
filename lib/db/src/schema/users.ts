import { pgTable, text, serial, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface GovernancePermissions {
  domainAccess: string[];
  actionPermissions: Record<string, string[]>;
  approvalRights: string[];
  publishingRights: string[];
  financialVisibility: string[];
  crmVisibility: string[];
  archiveVisibility: string[];
  integrationAccess: string[];
  aiModePrivileges: string;
  walletPermissions: string[];
  manualIntegrationPermissions: string[];
}

export const DEFAULT_PERMISSIONS: Record<string, GovernancePermissions> = {
  super_admin: {
    domainAccess: ["dashboard", "intelligence", "outreach", "marketing", "production", "execution", "crm", "communications", "finance", "reports", "admin", "agents", "channels", "system", "quality", "automation"],
    actionPermissions: { "*": ["create", "read", "update", "delete"] },
    approvalRights: ["proposals", "deals", "invoices", "contracts", "campaigns", "content", "budgets", "users"],
    publishingRights: ["content", "campaigns", "landing_pages", "forms", "reports", "emails"],
    financialVisibility: ["invoices", "revenue", "wallet_balance", "cost_data", "budgets", "forecasts", "thresholds"],
    crmVisibility: ["leads", "contacts", "companies", "opportunities", "pipelines", "activities"],
    archiveVisibility: ["reports", "archived_data", "audit_logs", "knowledge_base"],
    integrationAccess: ["connect", "disconnect", "configure", "sync", "import", "export"],
    aiModePrivileges: "full",
    walletPermissions: ["fund", "set_thresholds", "view_transactions", "view_balance", "configure_providers"],
    manualIntegrationPermissions: ["csv_import", "csv_export", "field_mapping", "reconciliation", "manual_sync"],
  },
  admin: {
    domainAccess: ["dashboard", "intelligence", "outreach", "marketing", "production", "execution", "crm", "communications", "finance", "reports", "admin", "agents", "channels", "system", "quality", "automation"],
    actionPermissions: { "*": ["create", "read", "update"] },
    approvalRights: ["proposals", "deals", "invoices", "campaigns", "content"],
    publishingRights: ["content", "campaigns", "landing_pages", "forms", "reports"],
    financialVisibility: ["invoices", "revenue", "wallet_balance", "cost_data", "budgets"],
    crmVisibility: ["leads", "contacts", "companies", "opportunities", "pipelines", "activities"],
    archiveVisibility: ["reports", "archived_data", "audit_logs"],
    integrationAccess: ["connect", "disconnect", "configure", "sync", "import", "export"],
    aiModePrivileges: "full",
    walletPermissions: ["fund", "set_thresholds", "view_transactions", "view_balance"],
    manualIntegrationPermissions: ["csv_import", "csv_export", "field_mapping", "reconciliation"],
  },
  manager: {
    domainAccess: ["dashboard", "intelligence", "outreach", "marketing", "production", "execution", "crm", "communications", "reports", "channels"],
    actionPermissions: { "*": ["create", "read", "update"] },
    approvalRights: ["deals", "content"],
    publishingRights: ["content", "campaigns"],
    financialVisibility: ["invoices", "revenue"],
    crmVisibility: ["leads", "contacts", "companies", "opportunities", "activities"],
    archiveVisibility: ["reports"],
    integrationAccess: ["sync", "import"],
    aiModePrivileges: "hybrid_only",
    walletPermissions: ["view_balance", "view_transactions"],
    manualIntegrationPermissions: ["csv_import", "csv_export"],
  },
  user: {
    domainAccess: ["dashboard", "execution", "crm", "communications"],
    actionPermissions: { "*": ["read"] },
    approvalRights: [],
    publishingRights: [],
    financialVisibility: [],
    crmVisibility: ["leads", "contacts", "activities"],
    archiveVisibility: [],
    integrationAccess: [],
    aiModePrivileges: "read_only",
    walletPermissions: [],
    manualIntegrationPermissions: [],
  },
};

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("user"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  governancePermissions: jsonb("governance_permissions").$type<GovernancePermissions>(),
  avatarUrl: text("avatar_url"),
  department: text("department"),
  title: text("title"),
  isActive: boolean("is_active").notNull().default(true),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  deactivatedBy: integer("deactivated_by"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const userAuditLogTable = pgTable("user_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(),
  performedBy: integer("performed_by").notNull(),
  performedByName: text("performed_by_name"),
  targetField: text("target_field"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  details: jsonb("details").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true, passwordHash: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type UserAuditLog = typeof userAuditLogTable.$inferSelect;
