import { Router, type IRouter } from "express";
import { count, sum, eq, desc, sql, gte } from "drizzle-orm";
import { db, companiesTable, contactsTable, leadsTable, opportunitiesTable, campaignsTable, tasksTable, activitiesTable, aiRunsTable, walletTransactionsTable, notificationsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetPipelineSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { getWalletBalance } from "../services/wallet-service";
import { getGlobalMode } from "../services/ai-mode-service";
import { getUnreadCount } from "../services/notification-service";

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
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = [];
  for (let i = 0; i < 12; i++) {
    const startDate = new Date(currentYear, i, 1);
    const endDate = new Date(currentYear, i + 1, 1);
    const [monthData] = await db.select({ total: sum(opportunitiesTable.value) })
      .from(opportunitiesTable)
      .where(sql`${opportunitiesTable.stage} = 'won' AND ${opportunitiesTable.createdAt} >= ${startDate} AND ${opportunitiesTable.createdAt} < ${endDate}`);
    monthlyRevenue.push({ month: months[i], value: Number(monthData?.total || 0) });
  }

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

router.get("/dashboard/command-center", async (_req, res): Promise<void> => {
  try {
    const wallet = await getWalletBalance();
    const aiMode = await getGlobalMode();
    const unreadNotifications = await getUnreadCount();

    const [aiRunsToday] = await db.select({ count: count() }).from(aiRunsTable)
      .where(gte(aiRunsTable.createdAt, new Date(new Date().setHours(0, 0, 0, 0))));

    const [activitiesToday] = await db.select({ count: count() }).from(activitiesTable)
      .where(gte(activitiesTable.createdAt, new Date(new Date().setHours(0, 0, 0, 0))));

    const recentAiRuns = await db.select().from(aiRunsTable)
      .orderBy(desc(aiRunsTable.createdAt)).limit(10);

    const pendingTasks = await db.select({ count: count() }).from(tasksTable)
      .where(eq(tasksTable.status, "pending"));

    const recentNotifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.isDismissed, false))
      .orderBy(desc(notificationsTable.createdAt)).limit(10);

    res.json({
      walletBalance: wallet.balance,
      aiMode,
      unreadNotifications,
      aiRunsToday: aiRunsToday.count,
      activitiesToday: activitiesToday.count,
      pendingTasks: pendingTasks[0].count,
      recentAiRuns,
      recentNotifications,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
