import { Router, type IRouter } from "express";
import { count, sum, eq, desc, sql, gte, lt, ne, and } from "drizzle-orm";
import { db, companiesTable, contactsTable, leadsTable, opportunitiesTable, campaignsTable, tasksTable, activitiesTable, aiRunsTable, walletTransactionsTable, notificationsTable, qualityIssuesTable, invoicesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetPipelineSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { getWalletBalance } from "../services/wallet-service";
import { getGlobalMode } from "../services/ai-mode-service";
import { getUnreadCount } from "../services/notification-service";
import { getAllAgents, getAgentStats, getAgentsByDomain } from "../services/agent-registry";

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

    const { getPendingCount } = await import("../services/mode-action-service");
    const pendingActions = await getPendingCount();

    res.json({
      walletBalance: wallet.balance,
      aiMode,
      unreadNotifications,
      aiRunsToday: aiRunsToday.count,
      activitiesToday: activitiesToday.count,
      pendingTasks: pendingTasks[0].count,
      pendingActions,
      recentAiRuns,
      recentNotifications,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard/ai-recommendations", async (_req, res): Promise<void> => {
  try {
    const staleDealThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleDeals = await db.select().from(opportunitiesTable)
      .where(and(
        lt(opportunitiesTable.updatedAt!, staleDealThreshold),
        ne(opportunitiesTable.stage, "closed_won"),
        ne(opportunitiesTable.stage, "closed_lost")
      ));

    const [pendingTaskCount] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, "pending"));
    const [criticalTaskCount] = await db.select({ count: count() }).from(tasksTable).where(and(eq(tasksTable.priority, "critical"), ne(tasksTable.status, "completed")));
    const highValueOpps = await db.select().from(opportunitiesTable).where(and(ne(opportunitiesTable.stage, "closed_won"), ne(opportunitiesTable.stage, "closed_lost"))).orderBy(desc(opportunitiesTable.value)).limit(3);
    const [newLeadCount] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.status, "new"));
    const wallet = await getWalletBalance();

    const recommendations: { id: string; priority: string; category: string; title: string; description: string; action: string; impact: string }[] = [];

    if (staleDeals.length > 0) {
      recommendations.push({
        id: "stale-deals", priority: "high", category: "revenue",
        title: `${staleDeals.length} stale deal${staleDeals.length > 1 ? "s" : ""} need attention`,
        description: `Deals with no activity for 7+ days: ${staleDeals.map(d => d.title).join(", ")}`,
        action: "Review and follow up on stale deals", impact: `$${staleDeals.reduce((s, d) => s + Number(d.value ?? 0), 0).toLocaleString()} at risk`
      });
    }

    if (criticalTaskCount.count > 0) {
      recommendations.push({
        id: "critical-tasks", priority: "critical", category: "operations",
        title: `${criticalTaskCount.count} critical task${criticalTaskCount.count > 1 ? "s" : ""} unresolved`,
        description: "Critical priority tasks need immediate attention to prevent blockers",
        action: "Assign and resolve critical tasks", impact: "Operational risk"
      });
    }

    if (Number(newLeadCount.count) > 0) {
      recommendations.push({
        id: "new-leads", priority: "medium", category: "pipeline",
        title: `${newLeadCount.count} new lead${Number(newLeadCount.count) > 1 ? "s" : ""} awaiting qualification`,
        description: "Unqualified leads should be scored, enriched, and routed promptly",
        action: "Run AI enrichment and qualification", impact: "Pipeline growth"
      });
    }

    if (highValueOpps.length > 0) {
      const topDeal = highValueOpps[0];
      recommendations.push({
        id: "top-deal", priority: "high", category: "revenue",
        title: `Focus on ${topDeal.title} ($${Number(topDeal.value ?? 0).toLocaleString()})`,
        description: `Highest value open deal at ${topDeal.stage} stage with ${topDeal.probability}% probability`,
        action: "Schedule follow-up and prepare proposal", impact: `$${Number(topDeal.value ?? 0).toLocaleString()} potential`
      });
    }

    if (wallet.balance < 20) {
      recommendations.push({
        id: "low-wallet", priority: "high", category: "system",
        title: "AI wallet balance is low",
        description: `Current balance: $${wallet.balance.toFixed(2)}. AI operations may be limited.`,
        action: "Add funds to AI wallet", impact: "AI capability"
      });
    }

    if (Number(pendingTaskCount.count) > 5) {
      recommendations.push({
        id: "task-backlog", priority: "medium", category: "operations",
        title: `${pendingTaskCount.count} tasks in backlog`,
        description: "Growing task backlog may indicate capacity or prioritization issues",
        action: "Review and prioritize task queue", impact: "Execution velocity"
      });
    }

    res.json({ recommendations: recommendations.sort((a, b) => { const p: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }; return (p[a.priority] ?? 3) - (p[b.priority] ?? 3); }) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard/intervention-queue", async (_req, res): Promise<void> => {
  try {
    const staleDealThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleDeals = await db.select().from(opportunitiesTable)
      .where(and(lt(opportunitiesTable.updatedAt!, staleDealThreshold), ne(opportunitiesTable.stage, "closed_won"), ne(opportunitiesTable.stage, "closed_lost")));

    const criticalTasks = await db.select().from(tasksTable)
      .where(and(eq(tasksTable.priority, "critical"), ne(tasksTable.status, "completed")));

    const openQualityIssues = await db.select().from(qualityIssuesTable)
      .where(eq(qualityIssuesTable.status, "open"));

    const overdueInvoices = await db.select().from(invoicesTable)
      .where(eq(invoicesTable.status, "overdue"));

    const reviewRequiredRuns = await db.select().from(aiRunsTable)
      .where(eq(aiRunsTable.reviewRequired!, "yes"))
      .orderBy(desc(aiRunsTable.createdAt)).limit(10);

    const interventionItems: { id: string; type: string; severity: string; title: string; description: string; entityType: string; entityId?: number; domain: string; createdAt: string }[] = [];

    for (const deal of staleDeals) {
      interventionItems.push({
        id: `stale-deal-${deal.id}`, type: "stale_deal", severity: "high",
        title: `Stale deal: ${deal.title}`, description: `No activity for 7+ days. Value: $${Number(deal.value ?? 0).toLocaleString()}`,
        entityType: "opportunity", entityId: deal.id, domain: "crm",
        createdAt: deal.updatedAt?.toISOString() ?? new Date().toISOString()
      });
    }

    for (const task of criticalTasks) {
      interventionItems.push({
        id: `critical-task-${task.id}`, type: "critical_task", severity: "critical",
        title: `Critical task: ${task.title}`, description: task.description ?? "Needs immediate attention",
        entityType: "task", entityId: task.id, domain: "execution",
        createdAt: task.createdAt?.toISOString() ?? new Date().toISOString()
      });
    }

    for (const issue of openQualityIssues) {
      interventionItems.push({
        id: `quality-${issue.id}`, type: "quality_issue", severity: issue.severity,
        title: `QA: ${issue.title}`, description: issue.description ?? "Quality issue needs review",
        entityType: "quality_issue", entityId: issue.id, domain: issue.domain,
        createdAt: issue.createdAt?.toISOString() ?? new Date().toISOString()
      });
    }

    for (const inv of overdueInvoices) {
      interventionItems.push({
        id: `overdue-inv-${inv.id}`, type: "overdue_invoice", severity: "high",
        title: `Overdue invoice: ${inv.invoiceNumber ?? `INV-${inv.id}`}`, description: `Amount: $${Number(inv.amount ?? 0).toLocaleString()}`,
        entityType: "invoice", entityId: inv.id, domain: "finance",
        createdAt: inv.createdAt?.toISOString() ?? new Date().toISOString()
      });
    }

    for (const run of reviewRequiredRuns) {
      interventionItems.push({
        id: `ai-review-${run.id}`, type: "ai_review", severity: "medium",
        title: `AI output needs review: ${run.runType}`, description: run.output?.slice(0, 200) ?? "AI-generated output awaiting human review",
        entityType: "ai_run", entityId: run.id, domain: run.domain,
        createdAt: run.createdAt?.toISOString() ?? new Date().toISOString()
      });
    }

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    interventionItems.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

    res.json({ items: interventionItems, totalCount: interventionItems.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard/agent-activity", async (_req, res): Promise<void> => {
  try {
    const stats = getAgentStats();
    const agents = getAllAgents();
    const recentRuns = await db.select().from(aiRunsTable).orderBy(desc(aiRunsTable.createdAt)).limit(20);

    const domainActivity: Record<string, { agents: number; running: number; totalRuns: number; avgSuccess: number }> = {};
    for (const agent of agents) {
      if (!domainActivity[agent.domain]) {
        domainActivity[agent.domain] = { agents: 0, running: 0, totalRuns: 0, avgSuccess: 0 };
      }
      domainActivity[agent.domain].agents++;
      if (agent.status === "running") domainActivity[agent.domain].running++;
      domainActivity[agent.domain].totalRuns += agent.totalRuns;
      domainActivity[agent.domain].avgSuccess += agent.successRate;
    }
    for (const d of Object.keys(domainActivity)) {
      domainActivity[d].avgSuccess = Math.round(domainActivity[d].avgSuccess / domainActivity[d].agents);
    }

    res.json({ stats, domainActivity, recentRuns, agents: agents.map(a => ({ id: a.id, name: a.name, domain: a.domain, status: a.status, totalRuns: a.totalRuns, successRate: a.successRate, lastRun: a.lastRun, avgDuration: a.avgDuration })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
