import { Router, type IRouter } from "express";
import { authenticateUser, createUserWithPassword, seedDefaultAdmin } from "../services/auth-service";
import { getSessionUser, requireAuth } from "../middleware/auth";
import { logAudit } from "../services/audit-service";

const router: IRouter = Router();

seedDefaultAdmin().catch(console.error);

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.userId = user.id;
  req.session.userEmail = user.email;
  req.session.userName = user.name;
  req.session.userRole = user.role;
  req.session.userPermissions = user.permissions;
  req.session.userGovernancePermissions = (user as any).governancePermissions || null;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => err ? reject(err) : resolve());
  });

  await logAudit({
    eventType: "auth",
    domain: "system",
    action: "user_login",
    description: `User ${user.name} logged in`,
    actor: user.name,
    actorType: "human",
    metadata: { userId: user.id, email: user.email },
  });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    governancePermissions: (user as any).governancePermissions,
    avatarUrl: user.avatarUrl,
    department: user.department,
    title: user.title,
  });
});

router.post("/auth/logout", (req, res): void => {
  const user = getSessionUser(req);
  req.session.destroy(() => {
    res.clearCookie("pmg.sid");
    res.json({ success: true });
  });
  if (user) {
    logAudit({
      eventType: "auth",
      domain: "system",
      action: "user_logout",
      description: `User ${user.name} logged out`,
      actor: user.name,
      actorType: "human",
    }).catch(() => {});
  }
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const user = getSessionUser(req);
  res.json(user);
});

router.post("/auth/register", requireAuth, async (req, res): Promise<void> => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser || (sessionUser.role !== "super_admin" && sessionUser.role !== "admin")) {
    res.status(403).json({ error: "Only admins can register users" });
    return;
  }

  const { email, name, password, role, department, title, permissions } = req.body;
  if (!email || !name || !password) {
    res.status(400).json({ error: "Email, name, and password required" });
    return;
  }

  try {
    const user = await createUserWithPassword({
      email, name, password,
      role: role || "user",
      department, title,
      permissions: permissions || [],
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err: any) {
    if (err.message?.includes("unique")) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
});

export default router;
