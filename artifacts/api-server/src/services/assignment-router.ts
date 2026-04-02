import { db, tasksTable, usersTable } from "@workspace/db";
import { eq, and, sql, ne } from "drizzle-orm";
import { subscribe } from "./event-bus";
import { createNotification } from "./notification-service";
import { broadcast } from "./websocket-service";
import { executeOrQueue, registerActionExecutor } from "./mode-action-service";

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

async function directAssignTask(taskId: number, assigneeOverride?: string): Promise<void> {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) return;

  const assignee = assigneeOverride ?? await findBestAssignee(task.domain, task.priority);
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

async function autoAssignTask(taskId: number): Promise<void> {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task || task.assignedTo) return;

  const suggestedAssignee = await findBestAssignee(task.domain, task.priority);

  const candidates = await db.select({ name: usersTable.name, role: usersTable.role }).from(usersTable)
    .where(eq(usersTable.isActive, true));

  const options = [
    { id: "approve", label: `Assign to ${suggestedAssignee ?? "recommended user"}`, description: "Accept AI-recommended assignment", isAiRecommended: true },
    ...candidates.slice(0, 5).map(c => ({
      id: `assign_${c.name}`,
      label: `Assign to ${c.name} (${c.role})`,
      description: `Manually assign to ${c.name}`,
    })),
    { id: "skip", label: "Leave Unassigned", description: "Do not assign this task automatically" },
  ];

  const result = await executeOrQueue({
    actionType: "task_assignment",
    workflowKey: "task_creation",
    entityType: "task",
    entityId: taskId,
    title: `Auto-assign: ${task.title}`,
    description: `Task "${task.title}" (${task.domain}, ${task.priority} priority) needs assignment`,
    confidence: 85,
    options,
    aiRecommendation: suggestedAssignee ? `Assign to ${suggestedAssignee} based on domain (${task.domain}) and workload balancing` : "No suitable assignee found",
    aiParts: "AI selects optimal assignee via round-robin across domain-qualified team members, considering priority escalation rules",
    humanParts: "Review suggested assignee, optionally select a different team member, confirm or skip assignment",
    metadata: { taskId, taskTitle: task.title, domain: task.domain, priority: task.priority, suggestedAssignee },
    executeAction: async () => {
      await directAssignTask(taskId);
    },
  });

  if (result.queued) {
    console.log(`[AssignmentRouter] Task #${taskId} assignment queued for ${result.mode} review`);
  }
}

function registerAssignmentExecutors(): void {
  registerActionExecutor("task_assignment", async (metadata, option) => {
    if (option === "approve") {
      await directAssignTask(metadata.taskId, metadata.suggestedAssignee);
    } else if (option.startsWith("assign_")) {
      const assignee = option.replace("assign_", "");
      await directAssignTask(metadata.taskId, assignee);
    }
  });
}

export function initAssignmentRouter(): void {
  registerAssignmentExecutors();

  subscribe("task.created", async (_event, payload) => {
    if (payload.entityType === "task" && payload.entityId) {
      await autoAssignTask(payload.entityId);
    }
  });

  console.log("[AssignmentRouter] Initialized — tri-mode task assignment");
}

export { autoAssignTask, findBestAssignee };
