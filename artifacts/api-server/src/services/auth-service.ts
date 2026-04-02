import bcrypt from "bcryptjs";
import { db, usersTable, DEFAULT_PERMISSIONS } from "@workspace/db";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(email: string, password: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.passwordHash) return null;
  if (!user.isActive) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: (user.permissions as string[]) || [],
    governancePermissions: user.governancePermissions,
    avatarUrl: user.avatarUrl,
    department: user.department,
    title: user.title,
  };
}

export async function createUserWithPassword(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
  department?: string;
  title?: string;
  permissions?: string[];
}) {
  const role = data.role || "user";
  const passwordHash = await hashPassword(data.password);
  const governancePermissions = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;
  const [user] = await db.insert(usersTable).values({
    email: data.email,
    name: data.name,
    passwordHash,
    role,
    department: data.department,
    title: data.title,
    permissions: data.permissions || [],
    governancePermissions,
  }).returning();
  return user;
}

export async function seedDefaultAdmin() {
  const ADMIN_EMAIL = "shershah_nawabi@pmggroup-llc.com";

  const superAdminPerms = DEFAULT_PERMISSIONS.super_admin;

  const [oldAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, "shershah@pmggroup-llc.com"));
  if (oldAdmin) {
    const hash = oldAdmin.passwordHash || await hashPassword("PMGAdmin2024!");
    await db.update(usersTable).set({
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: "super_admin",
      permissions: ["*"],
      governancePermissions: superAdminPerms,
    }).where(eq(usersTable.id, oldAdmin.id));
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
  if (existing) {
    const updates: any = {};
    if (!existing.passwordHash) updates.passwordHash = await hashPassword("PMGAdmin2024!");
    if (!existing.governancePermissions) updates.governancePermissions = superAdminPerms;
    updates.role = "super_admin";
    updates.permissions = ["*"];
    await db.update(usersTable).set(updates).where(eq(usersTable.id, existing.id));
    return;
  }

  await createUserWithPassword({
    email: ADMIN_EMAIL,
    name: "SherShah K.",
    password: "PMGAdmin2024!",
    role: "super_admin",
    department: "Executive",
    title: "CEO & Founder",
    permissions: ["*"],
  });
}
