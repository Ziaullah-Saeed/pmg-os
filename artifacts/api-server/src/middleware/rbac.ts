import type { Request, Response, NextFunction } from "express";

export type Role = "super_admin" | "admin" | "manager" | "user";

const roleHierarchy: Record<Role, number> = {
  super_admin: 100,
  admin: 75,
  manager: 50,
  user: 25,
};

function getSessionRole(req: Request): Role {
  const session = (req as any).session;
  if (session?.user?.role) {
    const role = session.user.role as Role;
    if (role in roleHierarchy) return role;
  }
  return "user";
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = getSessionRole(req);
    const isAllowed = allowedRoles.some(
      (role) => roleHierarchy[userRole] >= roleHierarchy[role]
    );
    if (!isAllowed) {
      res.status(403).json({
        error: "Forbidden",
        message: `Requires one of: ${allowedRoles.join(", ")}`,
        currentRole: userRole,
      });
      return;
    }
    next();
  };
}

export function getCurrentRole(req: Request): Role {
  return getSessionRole(req);
}

export function roleAtLeast(role: Role) {
  return requireRole(role);
}
