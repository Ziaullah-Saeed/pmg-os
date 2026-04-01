import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
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
  const passwordHash = await hashPassword(data.password);
  const [user] = await db.insert(usersTable).values({
    email: data.email,
    name: data.name,
    passwordHash,
    role: data.role || "user",
    department: data.department,
    title: data.title,
    permissions: data.permissions || [],
  }).returning();
  return user;
}

export async function seedDefaultAdmin() {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, "shershah@pmggroup.com"));
  if (existing) {
    if (!existing.passwordHash) {
      const hash = await hashPassword("PMGAdmin2024!");
      await db.update(usersTable).set({
        passwordHash: hash,
        role: "super_admin",
        permissions: ["*"],
      }).where(eq(usersTable.id, existing.id));
    }
    return;
  }
  await createUserWithPassword({
    email: "shershah@pmggroup.com",
    name: "SherShah K.",
    password: "PMGAdmin2024!",
    role: "super_admin",
    department: "Executive",
    title: "CEO & Founder",
    permissions: ["*"],
  });
}
