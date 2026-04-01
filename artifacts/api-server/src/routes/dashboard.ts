import { Router, type IRouter } from "express";
import { count, sum, eq, gte, and } from "drizzle-orm";
import { db, companiesTable, contactsTable, leadsTable, opportunitiesTable, campaignsTable, tasksTable, communicationsTable } from "@workspace/db";
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
  const [pipelineVal] = await db.select({ total: sum(opportunitiesTable.value) }).from(opportunitiesTable);
  const [activeCampaignsCount] = await db.select({ count: count() }).from(campaignsTable).where(eq(campaignsTable.status, "active"));
  const [pendingTasksCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "pending"));
  const [commsCount] = await db.select({ count: count() }).from(communicationsTable);

  const leadStatuses = await db.select({ status: leadsTable.status, count: count() }).from(leadsTable).groupBy(leadsTable.status);
  const oppStages = await db.select({ stage: opportunitiesTable.stage, count: count() }).from(opportunitiesTable).groupBy(opportunitiesTable.stage);

  const leadsByStatus: Record<string, number> = {};
  for (const r of leadStatuses) {
    leadsByStatus[r.status] = r.count;
  }

  const opportunitiesByStage: Record<string, number> = {};
  for (const r of oppStages) {
    opportunitiesByStage[r.stage] = r.count;
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueByMonth = months.map((month) => ({
    month,
    value: Math.floor(Math.random() * 50000) + 10000,
  }));

  const summary = {
    totalCompanies: companiesCount.count,
    totalContacts: contactsCount.count,
    totalLeads: leadsCount.count,
    totalOpportunities: oppsCount.count,
    totalPipelineValue: Number(pipelineVal.total || 0),
    activeCampaigns: activeCampaignsCount.count,
    pendingTasks: pendingTasksCount.count,
    recentCommunications: commsCount.count,
    leadsByStatus,
    opportunitiesByStage,
    revenueByMonth,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/pipeline", async (_req, res): Promise<void> => {
  const stageNames = ["discovery", "qualification", "proposal", "negotiation", "closing", "won", "lost"];
  const stageData = [];
  let totalValue = 0;
  let totalDeals = 0;
  let wonDeals = 0;
  let closedDeals = 0;

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
    if (stageName === "won") wonDeals = stageCount.count;
    if (stageName === "won" || stageName === "lost") closedDeals += stageCount.count;
  }

  for (const stage of stageData) {
    stage.percentage = totalDeals > 0 ? Math.round((stage.count / totalDeals) * 100) : 0;
  }

  const pipeline = {
    stages: stageData,
    totalValue,
    totalDeals,
    avgDealSize: totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0,
    winRate: closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0,
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
