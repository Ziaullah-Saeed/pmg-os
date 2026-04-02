import type { Request, Response, NextFunction } from "express";
import { DEFAULT_PERMISSIONS, type GovernancePermissions } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userEmail: string;
    userName: string;
    userRole: string;
    userPermissions: string[];
    userGovernancePermissions: GovernancePermissions | null;
  }
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  governancePermissions: GovernancePermissions | null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
    return;
  }
  next();
}

export function getSessionUser(req: Request): AuthenticatedUser | null {
  if (!req.session?.userId) return null;
  return {
    id: req.session.userId,
    email: req.session.userEmail!,
    name: req.session.userName!,
    role: req.session.userRole!,
    permissions: req.session.userPermissions || [],
    governancePermissions: req.session.userGovernancePermissions || null,
  };
}

const PERMISSION_MAP: Record<string, { roles: string[]; permissions: string[] }> = {
  "GET:/leads": { roles: ["user", "manager", "admin", "super_admin"], permissions: ["leads.read"] },
  "POST:/leads": { roles: ["manager", "admin", "super_admin"], permissions: ["leads.create"] },
  "PATCH:/leads": { roles: ["manager", "admin", "super_admin"], permissions: ["leads.update"] },
  "DELETE:/leads": { roles: ["admin", "super_admin"], permissions: ["leads.delete"] },

  "GET:/opportunities": { roles: ["user", "manager", "admin", "super_admin"], permissions: ["deals.read"] },
  "POST:/opportunities": { roles: ["manager", "admin", "super_admin"], permissions: ["deals.create"] },
  "PATCH:/opportunities": { roles: ["manager", "admin", "super_admin"], permissions: ["deals.update"] },
  "DELETE:/opportunities": { roles: ["admin", "super_admin"], permissions: ["deals.delete"] },

  "GET:/companies": { roles: ["user", "manager", "admin", "super_admin"], permissions: ["companies.read"] },
  "POST:/companies": { roles: ["manager", "admin", "super_admin"], permissions: ["companies.create"] },

  "GET:/contacts": { roles: ["user", "manager", "admin", "super_admin"], permissions: ["contacts.read"] },
  "POST:/contacts": { roles: ["manager", "admin", "super_admin"], permissions: ["contacts.create"] },

  "PUT:/ai-mode": { roles: ["admin", "super_admin"], permissions: ["ai.control"] },
  "DELETE:/ai-mode": { roles: ["admin", "super_admin"], permissions: ["ai.control"] },

  "POST:/wallet": { roles: ["admin", "super_admin"], permissions: ["wallet.manage"] },
  "GET:/wallet": { roles: ["user", "manager", "admin", "super_admin"], permissions: ["wallet.read"] },

  "GET:/users": { roles: ["admin", "super_admin"], permissions: ["users.read"] },
  "POST:/users": { roles: ["super_admin"], permissions: ["users.create"] },
  "PATCH:/users": { roles: ["super_admin"], permissions: ["users.update"] },

  "GET:/audit-events": { roles: ["admin", "super_admin"], permissions: ["audit.read"] },

  "POST:/approvals": { roles: ["manager", "admin", "super_admin"], permissions: ["approvals.create"] },
  "PATCH:/approvals": { roles: ["manager", "admin", "super_admin"], permissions: ["approvals.decide"] },

  "POST:/invoices": { roles: ["manager", "admin", "super_admin"], permissions: ["finance.manage"] },
  "GET:/invoices": { roles: ["manager", "admin", "super_admin"], permissions: ["finance.read"] },

  "POST:/contracts": { roles: ["manager", "admin", "super_admin"], permissions: ["contracts.manage"] },
  "GET:/contracts": { roles: ["manager", "admin", "super_admin"], permissions: ["contracts.read"] },

  "GET:/channels": { roles: ["manager", "admin", "super_admin"], permissions: ["channels.read"] },
  "POST:/channels": { roles: ["admin", "super_admin"], permissions: ["channels.manage"] },
  "PATCH:/channels": { roles: ["admin", "super_admin"], permissions: ["channels.manage"] },

  "GET:/reports": { roles: ["manager", "admin", "super_admin"], permissions: ["reports.read"] },
  "POST:/reports": { roles: ["admin", "super_admin"], permissions: ["reports.create"] },

  "GET:/campaigns": { roles: ["user", "manager", "admin", "super_admin"], permissions: ["campaigns.read"] },
  "POST:/campaigns": { roles: ["manager", "admin", "super_admin"], permissions: ["campaigns.create"] },

  "GET:/assets": { roles: ["user", "manager", "admin", "super_admin"], permissions: ["assets.read"] },
  "POST:/assets": { roles: ["manager", "admin", "super_admin"], permissions: ["assets.create"] },
};

const ROUTE_DOMAIN_MAP: Record<string, string> = {
  "/leads": "crm",
  "/opportunities": "crm",
  "/companies": "crm",
  "/contacts": "crm",
  "/invoices": "finance",
  "/contracts": "finance",
  "/wallet": "finance",
  "/campaigns": "marketing",
  "/assets": "production",
  "/channels": "channels",
  "/reports": "reports",
  "/users": "system",
  "/ai-mode": "system",
  "/agents": "agents",
  "/automation": "automation",
  "/quality": "quality",
};

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100,
  admin: 75,
  manager: 50,
  user: 25,
};

export function requirePermission(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (user.permissions.includes("*")) {
    next();
    return;
  }

  const method = req.method;
  const basePath = "/" + req.path.split("/").filter(Boolean)[0];
  const key = `${method}:${basePath}`;
  const rule = PERMISSION_MAP[key];

  const domain = ROUTE_DOMAIN_MAP[basePath];
  if (domain && user.role !== "super_admin" && !user.permissions.includes("*")) {
    const govPerms = user.governancePermissions || DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS.user;
    const domainAccess = govPerms.domainAccess || [];
    if (!domainAccess.includes(domain)) {
      res.status(403).json({
        error: "Forbidden",
        message: `You do not have access to the ${domain} domain`,
      });
      return;
    }
  }

  if (!rule) {
    const minRole = ROLE_HIERARCHY[user.role] ?? 0;
    if (minRole >= ROLE_HIERARCHY["manager"]) {
      next();
      return;
    }
    if (method === "GET") {
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden", message: `No permission rule for ${method} ${basePath}. Write access requires manager role or higher.` });
    return;
  }

  const userRoleLevel = ROLE_HIERARCHY[user.role] ?? 0;
  const hasRole = rule.roles.some(r => userRoleLevel >= (ROLE_HIERARCHY[r] ?? 0));
  const hasPerm = rule.permissions.some(p => user.permissions.includes(p));

  if (hasRole || hasPerm) {
    next();
    return;
  }

  res.status(403).json({
    error: "Forbidden",
    message: `Insufficient permissions for ${method} ${basePath}`,
    requiredRoles: rule.roles,
    requiredPermissions: rule.permissions,
  });
}
