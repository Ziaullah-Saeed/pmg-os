import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";
import {
  ListActivitiesQueryParams,
  ListActivitiesResponse,
  CreateActivityBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/activities", async (req, res): Promise<void> => {
  const query = ListActivitiesQueryParams.safeParse(req.query);
  const conditions = [];
  let limit = 50;
  if (query.success) {
    if (query.data.entityType) {
      conditions.push(eq(activitiesTable.entityType, query.data.entityType));
    }
    if (query.data.entityId) {
      conditions.push(eq(activitiesTable.entityId, query.data.entityId));
    }
    if (query.data.limit) {
      limit = query.data.limit;
    }
  }
  const activities = await db
    .select()
    .from(activitiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);
  res.json(ListActivitiesResponse.parse(activities));
});

router.post("/activities", async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [activity] = await db.insert(activitiesTable).values(parsed.data).returning();
  res.status(201).json(activity);
});

export default router;
