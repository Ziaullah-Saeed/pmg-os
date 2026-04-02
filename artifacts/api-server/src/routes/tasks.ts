import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { emit } from "../services/event-bus";
import { getSessionUser } from "../middleware/auth";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.search) {
      conditions.push(ilike(tasksTable.title, `%${query.data.search}%`));
    }
    if (query.data.status) {
      conditions.push(eq(tasksTable.status, query.data.status));
    }
    if (query.data.priority) {
      conditions.push(eq(tasksTable.priority, query.data.priority));
    }
    if (query.data.assignedTo) {
      conditions.push(eq(tasksTable.assignedTo, query.data.assignedTo));
    }
  }
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tasksTable.createdAt);
  res.json(ListTasksResponse.parse(tasks));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    var insertData = {
      ...parsed.data,
      dueDate: parseDate(parsed.data.dueDate),
    };
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }
  const [task] = await db.insert(tasksTable).values(insertData).returning();

  const sessionUser = getSessionUser(req);
  emit("task.created", {
    entityType: "task",
    entityId: task.id,
    domain: task.domain,
    actor: sessionUser?.name ?? "system",
    actorType: "human",
    data: { title: task.title, priority: task.priority, assignedTo: task.assignedTo },
  }).catch(() => {});

  res.status(201).json(GetTaskResponse.parse(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(GetTaskResponse.parse(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    var updateData = {
      ...parsed.data,
      dueDate: parseDate(parsed.data.dueDate),
    };
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (task.status === "completed" && existing?.status !== "completed") {
    const sessionUser = getSessionUser(req);
    emit("task.completed", {
      entityType: "task",
      entityId: task.id,
      domain: task.domain,
      actor: sessionUser?.name ?? "system",
      actorType: "human",
      previousState: existing?.status,
      newState: "completed",
      data: { title: task.title },
    }).catch(() => {});
  }

  res.json(UpdateTaskResponse.parse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
