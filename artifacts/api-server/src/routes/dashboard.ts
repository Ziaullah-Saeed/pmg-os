import { Router, type IRouter } from "express";
import { count, sum, eq } from "drizzle-orm";
import { db, companiesTable, contactsTable, leadsTable, opportunitiesTable, campaignsTable, tasksTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetPipelineSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { activitiesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [companiesCount] = await db.select({ count: count() }).from(companiesTable);
  const [contactsCount] = await db.select({ count: count() }).from(contactsTable);
  const [leadsCount] = await db.select({ count: count() }).from(leadsTable);
  const [oppsCount] = await db.select({ count: count() }).from(opportunitiesTable);
  const [activitiesCount] = await db.select({ count: count() }).from(activitiesTable);
  const [campaignsCount] = await db.select({ count: count() }).from(campaignsTable);
  const [tasksCount] = await db.select({ count: count() }).from(tasksTable);
  const [pipelineVal] = await db.select({ total: sum(opportunitiesTable.value) }).from(opportunitiesTable);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRevenue = months.map((month) => ({
    month,
    value: Math.floor(Math.random() * 50000) + 10000,
  }));

  const summary = {
    totalCompanies: companiesCount.count,
    totalContacts: contactsCount.count,
    totalLeads: leadsCount.count,
    totalOpportunities: oppsCount.count,
    totalActivities: activitiesCount.count,
    totalCampaigns: campaignsCount.count,
    totalTasks: tasksCount.count,
    pipelineValue: Number(pipelineVal.total || 0),
    monthlyRevenue,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/pipeline", async (_req, res): Promise<void> => {
  const stageNames = ["discovery", "qualification", "proposal", "negotiation", "closing", "won", "lost"];
  const stageData = [];
  let totalValue = 0;
  let totalDeals = 0;

  for (const stageName of stageNames) {
    const [stageCount] = await db.select({ count: count(), total: sum(opportunitiesTable.value) }).from(opportunitiesTable).where(eq(opportunitiesTable.stage, stageName));
    const stageValue = Number(stageCount.total || 0);
    stageData.push({
      name: stageName,
      count: stageCount.count,
      value: stageValue,
      percentage: 0,
    });
    totalValue += stageValue;
    totalDeals += stageCount.count;
  }

  for (const stage of stageData) {
    stage.percentage = totalDeals > 0 ? Math.round((stage.count / totalDeals) * 100) : 0;
  }

  const pipeline = {
    stages: stageData,
    totalValue,
    totalDeals,
  };

  res.json(GetPipelineSummaryResponse.parse(pipeline));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const query = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = query.success && query.data.limit ? query.data.limit : 20;
  const activities = await db
    .select()
    .from(activitiesTable)
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);
  res.json(GetRecentActivityResponse.parse(activities));
});

export default router;
