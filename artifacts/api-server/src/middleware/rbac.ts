import type { Request, Response, NextFunction } from "express";

export type Role = "super_admin" | "admin" | "manager" | "user";

const roleHierarchy: Record<Role, number> = {
  super_admin: 100,
  admin: 75,
  manager: 50,
  user: 25,
};

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers["x-user-role"] as Role) || "user";
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
  return (req.headers["x-user-role"] as Role) || "user";
}

export function roleAtLeast(role: Role) {
  return requireRole(role);
}
