import { Router, type IRouter } from "express";
import { getSessionUser } from "../middleware/auth";
import {
  listUsers, getUser, createUser, updateUser, changeRole,
  updateGovernancePermissions, deactivateUser, reactivateUser,
  resetPassword, getAuditLog, getPermissionSummary,
} from "../services/governance-service";

const router: IRouter = Router();

const VALID_ROLES = ["super_admin", "admin", "manager", "user"];

router.get("/users", async (req, res): Promise<void> => {
  try {
    const users = await listUsers({
      role: req.query.role as string | undefined,
      department: req.query.department as string | undefined,
      isActive: req.query.isActive as string | undefined,
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/users", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (session.role !== "super_admin") { res.status(403).json({ error: "Only Super Admin can create users" }); return; }

  const { email, name, password, role, department, title } = req.body;
  if (!email || !name || !password) { res.status(400).json({ error: "Email, name, and password are required" }); return; }
  if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  if (role && !VALID_ROLES.includes(role)) { res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }); return; }

  try {
    const user = await createUser({ email, name, password, role, department, title }, { id: session.id, name: session.name });
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/users/audit-log", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (session.role !== "super_admin" && session.role !== "admin") {
    res.status(403).json({ error: "Insufficient permissions" }); return;
  }

  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const action = req.query.action as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const logs = await getAuditLog({ userId, action, limit });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users/role-defaults/:role", async (req, res): Promise<void> => {
  try {
    const summary = getPermissionSummary(req.params.role);
    res.json(summary);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const user = await getUser(id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const { role, governancePermissions, isActive, ...profileData } = req.body;
    const user = await updateUser(id, profileData, { id: session.id, name: session.name });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/users/:id/role", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const { role } = req.body;
  if (!role || !VALID_ROLES.includes(role)) { res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }); return; }

  try {
    const user = await changeRole(id, role, { id: session.id, name: session.name, role: session.role });
    res.json(user);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

router.patch("/users/:id/permissions", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (session.role !== "super_admin") { res.status(403).json({ error: "Only Super Admin can modify permissions" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const { permissions } = req.body;
  if (!permissions || typeof permissions !== "object") { res.status(400).json({ error: "Permissions object required" }); return; }

  try {
    const user = await updateGovernancePermissions(id, permissions, {
      id: session.id, name: session.name, role: session.role,
    });
    res.json(user);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

router.post("/users/:id/deactivate", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const user = await deactivateUser(id, { id: session.id, name: session.name, role: session.role });
    res.json(user);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

router.post("/users/:id/reactivate", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  try {
    const user = await reactivateUser(id, { id: session.id, name: session.name, role: session.role });
    res.json(user);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

router.post("/users/:id/reset-password", async (req, res): Promise<void> => {
  const session = getSessionUser(req);
  if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const { password } = req.body;
  if (!password || password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

  try {
    const result = await resetPassword(id, password, { id: session.id, name: session.name, role: session.role });
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

export default router;
