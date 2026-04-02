import { db, usersTable, userAuditLogTable, type GovernancePermissions, DEFAULT_PERMISSIONS } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { broadcast } from "./websocket-service";

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 75,
  manager: 50,
  user: 25,
};

const VALID_ROLES = ["super_admin", "admin", "manager", "user"];

function stripPasswordHash(user: any) {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function listUsers(filters?: { role?: string; department?: string; isActive?: string }) {
  const conditions = [];
  if (filters?.role) conditions.push(eq(usersTable.role, filters.role));
  if (filters?.department) conditions.push(eq(usersTable.department!, filters.department));
  if (filters?.isActive === "true") conditions.push(eq(usersTable.isActive, true));
  if (filters?.isActive === "false") conditions.push(eq(usersTable.isActive, false));
  const rows = await db.select().from(usersTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(usersTable.createdAt));
  return rows.map(stripPasswordHash);
}

export async function getUser(id: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return user ? stripPasswordHash(user) : null;
}

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
  department?: string;
  title?: string;
}, performedBy: { id: number; name: string }) {
  const role = data.role || "user";
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  const performerLevel = ROLE_HIERARCHY[performedBy.id === 0 ? "super_admin" : "super_admin"] ?? 0;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, data.email));
  if (existing.length > 0) {
    throw new Error("Email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const governancePermissions = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;

  const [user] = await db.insert(usersTable).values({
    email: data.email,
    name: data.name,
    passwordHash,
    role,
    permissions: role === "super_admin" ? ["*"] : [],
    governancePermissions,
    department: data.department,
    title: data.title,
    isActive: true,
  }).returning();

  await recordAuditLog({
    userId: user.id,
    action: "user_created",
    performedBy: performedBy.id,
    performedByName: performedBy.name,
    details: { email: data.email, role, department: data.department },
  });

  broadcast("user_created", stripPasswordHash(user));
  return stripPasswordHash(user);
}

export async function updateUser(
  id: number,
  data: Partial<{ email: string; name: string; department: string; title: string; avatarUrl: string }>,
  performedBy: { id: number; name: string }
) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) throw new Error("User not found");

  const [updated] = await db.update(usersTable).set(data).where(eq(usersTable.id, id)).returning();

  const changes: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && (existing as any)[key] !== val) {
      changes.push(key);
      await recordAuditLog({
        userId: id,
        action: "user_updated",
        performedBy: performedBy.id,
        performedByName: performedBy.name,
        targetField: key,
        oldValue: String((existing as any)[key] ?? ""),
        newValue: String(val),
      });
    }
  }

  broadcast("user_updated", stripPasswordHash(updated));
  return stripPasswordHash(updated);
}

export async function changeRole(
  userId: number,
  newRole: string,
  performedBy: { id: number; name: string; role: string }
) {
  if (!VALID_ROLES.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const performerLevel = ROLE_HIERARCHY[performedBy.role] ?? 0;
  const targetLevel = ROLE_HIERARCHY[newRole] ?? 0;

  if (performerLevel <= targetLevel && performedBy.role !== "super_admin") {
    throw new Error("Cannot assign a role equal to or higher than your own");
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!existing) throw new Error("User not found");

  const existingLevel = ROLE_HIERARCHY[existing.role] ?? 0;
  if (existingLevel >= performerLevel && performedBy.role !== "super_admin") {
    throw new Error("Cannot modify a user with a role equal to or higher than your own");
  }

  if (userId === performedBy.id) {
    throw new Error("Cannot change your own role");
  }

  const governancePermissions = DEFAULT_PERMISSIONS[newRole] || DEFAULT_PERMISSIONS.user;

  const [updated] = await db.update(usersTable).set({
    role: newRole,
    permissions: newRole === "super_admin" ? ["*"] : [],
    governancePermissions,
  }).where(eq(usersTable.id, userId)).returning();

  await recordAuditLog({
    userId,
    action: "role_changed",
    performedBy: performedBy.id,
    performedByName: performedBy.name,
    targetField: "role",
    oldValue: existing.role,
    newValue: newRole,
  });

  broadcast("user_role_changed", { userId, oldRole: existing.role, newRole });
  return stripPasswordHash(updated);
}

export async function updateGovernancePermissions(
  userId: number,
  permissions: GovernancePermissions,
  performedBy: { id: number; name: string; role: string }
) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!existing) throw new Error("User not found");

  if (performedBy.role !== "super_admin") {
    const performerLevel = ROLE_HIERARCHY[performedBy.role] ?? 0;
    const existingLevel = ROLE_HIERARCHY[existing.role] ?? 0;
    if (existingLevel >= performerLevel) {
      throw new Error("Cannot modify permissions of a user with a role equal to or higher than your own");
    }
  }

  const [updated] = await db.update(usersTable).set({
    governancePermissions: permissions,
  }).where(eq(usersTable.id, userId)).returning();

  const changedFields: string[] = [];
  const oldPerms = existing.governancePermissions as GovernancePermissions | null;
  if (oldPerms) {
    for (const key of Object.keys(permissions) as (keyof GovernancePermissions)[]) {
      if (JSON.stringify(oldPerms[key]) !== JSON.stringify(permissions[key])) {
        changedFields.push(key);
      }
    }
  }

  await recordAuditLog({
    userId,
    action: "permissions_updated",
    performedBy: performedBy.id,
    performedByName: performedBy.name,
    targetField: "governance_permissions",
    oldValue: JSON.stringify(oldPerms),
    newValue: JSON.stringify(permissions),
    details: { changedFields },
  });

  broadcast("user_permissions_updated", { userId, changedFields });
  return stripPasswordHash(updated);
}

export async function deactivateUser(
  userId: number,
  performedBy: { id: number; name: string; role: string }
) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!existing) throw new Error("User not found");

  if (userId === performedBy.id) {
    throw new Error("Cannot deactivate your own account");
  }

  const performerLevel = ROLE_HIERARCHY[performedBy.role] ?? 0;
  const existingLevel = ROLE_HIERARCHY[existing.role] ?? 0;
  if (existingLevel >= performerLevel && performedBy.role !== "super_admin") {
    throw new Error("Cannot deactivate a user with a role equal to or higher than your own");
  }

  const [updated] = await db.update(usersTable).set({
    isActive: false,
    deactivatedAt: new Date(),
    deactivatedBy: performedBy.id,
  }).where(eq(usersTable.id, userId)).returning();

  await recordAuditLog({
    userId,
    action: "user_deactivated",
    performedBy: performedBy.id,
    performedByName: performedBy.name,
    details: { previousRole: existing.role },
  });

  broadcast("user_deactivated", { userId });
  return stripPasswordHash(updated);
}

export async function reactivateUser(
  userId: number,
  performedBy: { id: number; name: string; role: string }
) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!existing) throw new Error("User not found");

  if (performedBy.role !== "super_admin" && performedBy.role !== "admin") {
    throw new Error("Only Super Admin or Admin can reactivate users");
  }

  const [updated] = await db.update(usersTable).set({
    isActive: true,
    deactivatedAt: null,
    deactivatedBy: null,
  }).where(eq(usersTable.id, userId)).returning();

  await recordAuditLog({
    userId,
    action: "user_reactivated",
    performedBy: performedBy.id,
    performedByName: performedBy.name,
  });

  broadcast("user_reactivated", { userId });
  return stripPasswordHash(updated);
}

export async function resetPassword(
  userId: number,
  newPassword: string,
  performedBy: { id: number; name: string; role: string }
) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!existing) throw new Error("User not found");

  if (performedBy.role !== "super_admin" && performedBy.id !== userId) {
    throw new Error("Only Super Admin can reset other users' passwords");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));

  await recordAuditLog({
    userId,
    action: "password_reset",
    performedBy: performedBy.id,
    performedByName: performedBy.name,
  });

  return { success: true };
}

export async function recordAuditLog(entry: {
  userId: number;
  action: string;
  performedBy: number;
  performedByName?: string;
  targetField?: string;
  oldValue?: string;
  newValue?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  const [log] = await db.insert(userAuditLogTable).values(entry).returning();
  return log;
}

export async function getAuditLog(filters?: { userId?: number; action?: string; limit?: number }) {
  const conditions = [];
  if (filters?.userId) conditions.push(eq(userAuditLogTable.userId, filters.userId));
  if (filters?.action) conditions.push(eq(userAuditLogTable.action, filters.action));
  return db.select().from(userAuditLogTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(userAuditLogTable.createdAt))
    .limit(filters?.limit ?? 100);
}

export function hasGovernancePermission(
  user: { role: string; permissions: string[]; governancePermissions?: GovernancePermissions | null },
  category: keyof GovernancePermissions,
  value: string
): boolean {
  if (user.permissions?.includes("*")) return true;
  if (user.role === "super_admin") return true;

  const perms = user.governancePermissions;
  if (!perms) {
    const defaults = DEFAULT_PERMISSIONS[user.role];
    if (!defaults) return false;
    return checkPermissionValue(defaults, category, value);
  }

  return checkPermissionValue(perms, category, value);
}

function checkPermissionValue(perms: GovernancePermissions, category: keyof GovernancePermissions, value: string): boolean {
  const catValue = perms[category];
  if (Array.isArray(catValue)) {
    return catValue.includes(value);
  }
  if (typeof catValue === "string") {
    return catValue === value || catValue === "full";
  }
  if (typeof catValue === "object" && catValue !== null) {
    const wildcard = (catValue as Record<string, string[]>)["*"];
    if (wildcard && wildcard.includes(value)) return true;
    for (const vals of Object.values(catValue as Record<string, string[]>)) {
      if (vals.includes(value)) return true;
    }
  }
  return false;
}

export function hasDomainAccess(
  user: { role: string; permissions: string[]; governancePermissions?: GovernancePermissions | null },
  domain: string
): boolean {
  return hasGovernancePermission(user, "domainAccess", domain);
}

export function getPermissionSummary(role: string): GovernancePermissions {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;
}
