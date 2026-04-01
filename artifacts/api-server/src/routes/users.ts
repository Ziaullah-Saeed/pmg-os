import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  ListUsersQueryParams, ListUsersResponse,
  CreateUserBody, GetUserParams, GetUserResponse,
  UpdateUserParams, UpdateUserBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const conditions = [];
  if (query.data.role) conditions.push(eq(usersTable.role, query.data.role));
  if (query.data.department) conditions.push(eq(usersTable.department!, query.data.department));
  if (query.data.isActive === "true") conditions.push(eq(usersTable.isActive, true));
  if (query.data.isActive === "false") conditions.push(eq(usersTable.isActive, false));
  const results = await db.select().from(usersTable).where(conditions.length ? and(...conditions) : undefined).limit(query.data.limit ?? 100).offset(query.data.offset ?? 0);
  res.json(ListUsersResponse.parse(results));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.insert(usersTable).values(parsed.data).returning();
  res.status(201).json(GetUserResponse.parse(item));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "User not found" }); return; }
  res.json(GetUserResponse.parse(item));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "User not found" }); return; }
  res.json(GetUserResponse.parse(item));
});

export default router;
