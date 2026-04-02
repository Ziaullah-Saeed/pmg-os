import { db, tasksTable, usersTable } from "@workspace/db";
import { eq, and, sql, ne } from "drizzle-orm";
import { subscribe } from "./event-bus";
import { createNotification } from "./notification-service";
import { broadcast } from "./websocket-service";

type AssignmentRule = {
  domain: string;
  roles: string[];
  fallbackRole: string;
};

const DOMAIN_ASSIGNMENT_RULES: AssignmentRule[] = [
  { domain: "crm", roles: ["manager", "admin", "super_admin"], fallbackRole: "admin" },
  { domain: "execution", roles: ["user", "manager", "admin"], fallbackRole: "manager" },
  { domain: "outreach", roles: ["user", "manager"], fallbackRole: "manager" },
  { domain: "command_center", roles: ["admin", "super_admin"], fallbackRole: "super_admin" },
  { domain: "billing", roles: ["admin", "super_admin"], fallbackRole: "admin" },
  { domain: "compliance", roles: ["manager", "admin"], fallbackRole: "admin" },
  { domain: "library", roles: ["user", "manager"], fallbackRole: "manager" },
  { domain: "system", roles: ["admin", "super_admin"], fallbackRole: "super_admin" },
];

const roundRobinCounters = new Map<string, number>();

async function findBestAssignee(domain: string, priority?: string): Promise<string | null> {
  const rule = DOMAIN_ASSIGNMENT_RULES.find(r => r.domain === domain);
  const roles = rule?.roles ?? ["admin", "super_admin"];

  const candidates = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
  }).from(usersTable)
    .where(and(
      eq(usersTable.isActive, true),
      sql`${usersTable.role} = ANY(ARRAY[${sql.raw(roles.map(r => `'${r}'`).join(","))}])`,
    ));

  if (candidates.length === 0) return null;

  if (priority === "critical" || priority === "high") {
    const admins = candidates.filter(c => c.role === "admin" || c.role === "super_admin");
    if (admins.length > 0) {
      const key = `${domain}:high`;
      const idx = (roundRobinCounters.get(key) ?? 0) % admins.length;
      roundRobinCounters.set(key, idx + 1);
      return admins[idx].name;
    }
  }

  const key = `${domain}:normal`;
  const idx = (roundRobinCounters.get(key) ?? 0) % candidates.length;
  roundRobinCounters.set(key, idx + 1);
  return candidates[idx].name;
}

async function autoAssignTask(taskId: number): Promise<void> {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task || task.assignedTo) return;

  const assignee = await findBestAssignee(task.domain, task.priority);
  if (!assignee) return;

  await db.update(tasksTable).set({ assignedTo: assignee }).where(eq(tasksTable.id, taskId));

  await createNotification({
    type: "task_assigned",
    severity: "info",
    title: `Task Assigned: ${task.title}`,
    message: `Task "${task.title}" has been auto-assigned to ${assignee}`,
    domain: task.domain,
    entityType: "task",
    entityId: taskId,
    actor: "assignment_router",
  });

  broadcast("task_assigned", { taskId, assignee, title: task.title });
}

export function initAssignmentRouter(): void {
  subscribe("task.created", async (_event, payload) => {
    if (payload.entityType === "task" && payload.entityId) {
      await autoAssignTask(payload.entityId);
    }
  });

  console.log("[AssignmentRouter] Initialized — auto-assigning tasks on creation");
}

export { autoAssignTask, findBestAssignee };
