import { Request, Response, NextFunction } from "express";

export type Role = "super_admin" | "admin" | "manager" | "user";

const roleHierarchy: Record<Role, number> = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

const domainPermissions: Record<string, Record<string, Role>> = {
  system: { read: "admin", write: "super_admin", delete: "super_admin" },
  finance: { read: "admin", write: "admin", delete: "super_admin" },
  crm: { read: "user", write: "manager", delete: "admin" },
  intelligence: { read: "user", write: "manager", delete: "admin" },
  outreach: { read: "user", write: "manager", delete: "admin" },
  marketing: { read: "user", write: "manager", delete: "admin" },
  production: { read: "user", write: "manager", delete: "admin" },
  communications: { read: "user", write: "user", delete: "manager" },
  execution: { read: "user", write: "user", delete: "manager" },
  reports: { read: "user", write: "manager", delete: "admin" },
  approvals: { read: "manager", write: "admin", delete: "super_admin" },
};

export function getCurrentUserRole(req: Request): Role {
  const role = (req.headers["x-user-role"] as Role) || "super_admin";
  return roleHierarchy[role] ? role : "user";
}

export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = getCurrentUserRole(req);
    if (roleHierarchy[userRole] >= roleHierarchy[minRole]) {
      next();
    } else {
      res.status(403).json({
        error: "Forbidden",
        message: `This action requires ${minRole} role or higher`,
        requiredRole: minRole,
        currentRole: userRole,
      });
    }
  };
}

export function requireDomainAccess(domain: string, action: "read" | "write" | "delete") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = getCurrentUserRole(req);
    const perms = domainPermissions[domain];
    if (!perms) { next(); return; }
    const required = perms[action] ?? "user";
    if (roleHierarchy[userRole] >= roleHierarchy[required as Role]) {
      next();
    } else {
      res.status(403).json({
        error: "Forbidden",
        message: `${action} access to ${domain} requires ${required} role`,
        requiredRole: required,
        currentRole: userRole,
      });
    }
  };
}

export function getPermissionMatrix() {
  return {
    roles: Object.keys(roleHierarchy),
    domains: Object.keys(domainPermissions),
    matrix: domainPermissions,
  };
}
