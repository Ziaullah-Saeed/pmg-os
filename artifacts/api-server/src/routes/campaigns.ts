import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, campaignsTable } from "@workspace/db";
import { parseDate } from "../lib/parse-date";
import {
  ListCampaignsQueryParams,
  ListCampaignsResponse,
  CreateCampaignBody,
  GetCampaignParams,
  GetCampaignResponse,
  UpdateCampaignParams,
  UpdateCampaignBody,
  UpdateCampaignResponse,
  DeleteCampaignParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/campaigns", async (req, res): Promise<void> => {
  const query = ListCampaignsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.search) {
      conditions.push(ilike(campaignsTable.name, `%${query.data.search}%`));
    }
    if (query.data.status) {
      conditions.push(eq(campaignsTable.status, query.data.status));
    }
    if (query.data.channel) {
      conditions.push(eq(campaignsTable.channel, query.data.channel));
    }
  }
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(campaignsTable.createdAt);
  res.json(ListCampaignsResponse.parse(campaigns));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    var insertData = {
      ...parsed.data,
      startDate: parseDate(parsed.data.startDate),
      endDate: parseDate(parsed.data.endDate),
    };
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }
  const [campaign] = await db.insert(campaignsTable).values(insertData).returning();
  res.status(201).json(GetCampaignResponse.parse(campaign));
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(GetCampaignResponse.parse(campaign));
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    var updateData = {
      ...parsed.data,
      startDate: parseDate(parsed.data.startDate),
      endDate: parseDate(parsed.data.endDate),
    };
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }
  const [campaign] = await db.update(campaignsTable).set(updateData).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(UpdateCampaignResponse.parse(campaign));
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [campaign] = await db.delete(campaignsTable).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
