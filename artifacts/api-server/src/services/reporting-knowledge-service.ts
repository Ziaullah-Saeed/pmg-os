import { db, reportsTable, archiveItemsTable, knowledgeEntriesTable, leadsTable, opportunitiesTable, companiesTable, contactsTable, invoicesTable, contractsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte, count, inArray } from "drizzle-orm";
import { subscribe, emit } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { addKnowledgeEntry } from "./knowledge-service";
import { generateReport as aiGenerateReport } from "./ai-service";
import { registerJobExecutor } from "./scheduler-service";

type ReportConfig = {
  type: string;
  domain: string;
  title: string;
  cronExpression: string;
  format: string;
  recipients?: string;
  deliveryChannel?: string;
};

const REPORT_TEMPLATES: Record<string, ReportConfig> = {
  daily_pipeline: {
    type: "daily",
    domain: "crm",
    title: "Daily Pipeline Report",
    cronExpression: "0 18 * * 1-5",
    format: "executive",
  },
  weekly_revenue: {
    type: "weekly",
    domain: "finance",
    title: "Weekly Revenue Report",
    cronExpression: "0 9 * * 1",
    format: "executive",
  },
  weekly_marketing: {
    type: "weekly",
    domain: "marketing",
    title: "Weekly Marketing Performance",
    cronExpression: "0 9 * * 1",
    format: "executive",
  },
  monthly_executive: {
    type: "monthly",
    domain: "command_center",
    title: "Monthly Executive Summary",
    cronExpression: "0 9 1 * *",
    format: "executive",
  },
  quarterly_business: {
    type: "quarterly",
    domain: "command_center",
    title: "Quarterly Business Review",
    cronExpression: "0 9 1 1,4,7,10 *",
    format: "executive",
  },
};

async function gatherDomainMetrics(domain: string): Promise<Record<string, unknown>> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (domain === "crm" || domain === "command_center") {
    const [leadCount] = await db.select({ count: count() }).from(leadsTable);
    const [recentLeads] = await db.select({ count: count() }).from(leadsTable).where(gte(leadsTable.createdAt, sevenDaysAgo));
    const [oppCount] = await db.select({ count: count() }).from(opportunitiesTable);
    const [wonDeals] = await db.select({ count: count() }).from(opportunitiesTable).where(eq(opportunitiesTable.stage, "won"));
    const [totalPipeline] = await db.select({ total: sql<number>`coalesce(sum(value), 0)` }).from(opportunitiesTable).where(and(
      sql`${opportunitiesTable.stage} NOT IN ('won', 'lost')`,
    ));
    const [companyCount] = await db.select({ count: count() }).from(companiesTable);
    return {
      totalLeads: leadCount?.count ?? 0,
      newLeadsThisWeek: recentLeads?.count ?? 0,
      totalOpportunities: oppCount?.count ?? 0,
      wonDeals: wonDeals?.count ?? 0,
      pipelineValue: totalPipeline?.total ?? 0,
      totalCompanies: companyCount?.count ?? 0,
      reportPeriod: `${sevenDaysAgo.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}`,
    };
  }

  if (domain === "finance") {
    const [invoiceCount] = await db.select({ count: count() }).from(invoicesTable);
    const [paidInvoices] = await db.select({ count: count() }).from(invoicesTable).where(eq(invoicesTable.status, "paid"));
    const [overdueInvoices] = await db.select({ count: count() }).from(invoicesTable).where(eq(invoicesTable.status, "overdue"));
    const [totalRevenue] = await db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(invoicesTable).where(eq(invoicesTable.status, "paid"));
    const [contractCount] = await db.select({ count: count() }).from(contractsTable);
    return {
      totalInvoices: invoiceCount?.count ?? 0,
      paidInvoices: paidInvoices?.count ?? 0,
      overdueInvoices: overdueInvoices?.count ?? 0,
      totalRevenue: totalRevenue?.total ?? 0,
      totalContracts: contractCount?.count ?? 0,
      reportPeriod: `${thirtyDaysAgo.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}`,
    };
  }

  if (domain === "marketing") {
    const [contactCount] = await db.select({ count: count() }).from(contactsTable);
    const [recentContacts] = await db.select({ count: count() }).from(contactsTable).where(gte(contactsTable.createdAt, sevenDaysAgo));
    return {
      totalContacts: contactCount?.count ?? 0,
      newContactsThisWeek: recentContacts?.count ?? 0,
      reportPeriod: `${sevenDaysAgo.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}`,
    };
  }

  return { domain, reportPeriod: `${sevenDaysAgo.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}` };
}

export async function generateScheduledReport(templateKey: string): Promise<{ reportId: number; title: string }> {
  const template = REPORT_TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown report template: ${templateKey}`);

  const metrics = await gatherDomainMetrics(template.domain);

  let content: string;
  let summary: string;
  try {
    const aiResult = await aiGenerateReport({
      domain: template.domain,
      reportType: template.type,
      data: metrics,
    });
    content = aiResult.report;
    summary = content.split("\n").slice(0, 3).join("\n");
  } catch {
    content = `## ${template.title}\n\n### Key Metrics\n${Object.entries(metrics).map(([k, v]) => `- **${k}**: ${v}`).join("\n")}\n\n*AI summary unavailable — raw metrics provided.*`;
    summary = `${template.title} — ${Object.keys(metrics).length} metrics collected`;
  }

  const now = new Date();
  const period = template.type === "daily" ? now.toISOString().slice(0, 10) :
    template.type === "weekly" ? `Week of ${now.toISOString().slice(0, 10)}` :
    template.type === "monthly" ? now.toISOString().slice(0, 7) :
    `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

  const [report] = await db.insert(reportsTable).values({
    title: `${template.title} — ${period}`,
    type: template.type,
    domain: template.domain,
    format: template.format,
    status: "published",
    content,
    summary,
    data: metrics,
    generatedBy: "system",
    generationType: "scheduled",
    scheduledFor: now,
    deliveryChannel: template.deliveryChannel ?? "internal",
    recipients: template.recipients,
    period,
  } as any).returning();

  await logAudit({
    eventType: "report_generated",
    domain: template.domain,
    action: "generate_scheduled_report",
    description: `Scheduled ${template.type} report generated: ${template.title}`,
    entityType: "report",
    entityId: report.id,
    actor: "scheduler",
    actorType: "system",
  });

  await createNotification({
    type: "report_ready",
    severity: "info",
    title: `${template.title} Ready`,
    message: `Your ${template.type} ${template.domain} report for ${period} is ready to view.`,
    domain: template.domain,
    actor: "scheduler",
    entityType: "report",
    entityId: report.id,
  });

  broadcast("report_generated", { reportId: report.id, title: report.title, type: template.type, domain: template.domain });

  await emit("report.generated", {
    entityType: "report",
    entityId: report.id,
    domain: template.domain,
    actor: "scheduler",
    actorType: "system",
    data: { type: template.type, period },
  });

  return { reportId: report.id, title: report.title! };
}

const EVENT_REPORT_TRIGGERS: Record<string, {
  domain: string;
  reportType: string;
  titleFn: (data: Record<string, unknown>) => string;
}> = {
  "opportunity.won": {
    domain: "crm",
    reportType: "milestone",
    titleFn: (d) => `Deal Won Report — ${d.title ?? `Opportunity #${d.entityId}`}`,
  },
  "opportunity.lost": {
    domain: "crm",
    reportType: "milestone",
    titleFn: (d) => `Deal Lost Analysis — ${d.title ?? `Opportunity #${d.entityId}`}`,
  },
  "invoice.paid": {
    domain: "finance",
    reportType: "milestone",
    titleFn: (d) => `Payment Received Report — Invoice #${d.entityId}`,
  },
  "lead.converted": {
    domain: "crm",
    reportType: "milestone",
    titleFn: (d) => `Lead Conversion Report — Lead #${d.entityId}`,
  },
};

async function handleEventTriggeredReport(event: string, entityId: number, eventData: Record<string, unknown>): Promise<void> {
  const trigger = EVENT_REPORT_TRIGGERS[event];
  if (!trigger) return;

  const metrics = await gatherDomainMetrics(trigger.domain);
  const combinedData = { ...metrics, triggerEvent: event, ...eventData };

  let content: string;
  try {
    const aiResult = await aiGenerateReport({
      domain: trigger.domain,
      reportType: trigger.reportType,
      data: combinedData,
    });
    content = aiResult.report;
  } catch {
    content = `## ${trigger.titleFn(eventData)}\n\nTriggered by: ${event}\n\n### Context\n${Object.entries(eventData).map(([k, v]) => `- **${k}**: ${JSON.stringify(v)}`).join("\n")}\n\n### Domain Metrics\n${Object.entries(metrics).map(([k, v]) => `- **${k}**: ${v}`).join("\n")}`;
  }

  const title = trigger.titleFn({ ...eventData, entityId });

  const [report] = await db.insert(reportsTable).values({
    title,
    type: trigger.reportType,
    domain: trigger.domain,
    format: "executive",
    status: "published",
    content,
    summary: `Auto-generated on ${event}`,
    data: combinedData,
    generatedBy: "event_trigger",
    generationType: "event_triggered",
    deliveryChannel: "internal",
    period: new Date().toISOString().slice(0, 10),
  } as any).returning();

  await createNotification({
    type: "report_ready",
    severity: "info",
    title: `Milestone Report: ${title}`,
    message: `An event-triggered report was generated for ${event}.`,
    domain: trigger.domain,
    actor: "event_trigger",
    entityType: "report",
    entityId: report.id,
  });

  broadcast("report_generated", { reportId: report.id, title, type: "event_triggered", event });
}

const KNOWLEDGE_EVENT_MAP: Record<string, {
  category: string;
  subcategory?: string;
  titleFn: (data: Record<string, unknown>) => string;
  contentFn: (event: string, data: Record<string, unknown>) => string;
  domain: string;
  entityType: string;
}> = {
  "opportunity.won": {
    category: "deal_intelligence",
    subcategory: "won_deals",
    titleFn: (d) => `Won Deal: ${d.title ?? `Opportunity #${d.entityId}`}`,
    contentFn: (_e, d) => `Deal won. Value: $${d.value ?? "N/A"}. Stage progression from ${d.previousStage ?? "unknown"} to won. Key factors: ${d.wonReason ?? "not specified"}.`,
    domain: "crm",
    entityType: "opportunity",
  },
  "opportunity.lost": {
    category: "deal_intelligence",
    subcategory: "lost_deals",
    titleFn: (d) => `Lost Deal: ${d.title ?? `Opportunity #${d.entityId}`}`,
    contentFn: (_e, d) => `Deal lost. Value: $${d.value ?? "N/A"}. Reason: ${d.lostReason ?? "not specified"}. Competitor: ${d.competitor ?? "unknown"}.`,
    domain: "crm",
    entityType: "opportunity",
  },
  "opportunity.stage_changed": {
    category: "sales_knowledge",
    subcategory: "pipeline_movement",
    titleFn: (d) => `Pipeline Move: ${d.title ?? `Opp #${d.entityId}`} → ${d.newStage ?? "unknown"}`,
    contentFn: (_e, d) => `Opportunity moved from ${d.previousStage ?? "unknown"} to ${d.newStage ?? "unknown"}. Value: $${d.value ?? "N/A"}.`,
    domain: "crm",
    entityType: "opportunity",
  },
  "lead.scored": {
    category: "lead_intelligence",
    subcategory: "scoring",
    titleFn: (d) => `Lead Scored: ${d.name ?? `Lead #${d.entityId}`} — Score ${d.fitScore ?? "N/A"}`,
    contentFn: (_e, d) => `Lead scored with fit score ${d.fitScore ?? "N/A"}. Source: ${d.source ?? "unknown"}. Industry: ${d.industry ?? "unknown"}.`,
    domain: "crm",
    entityType: "lead",
  },
  "lead.enriched": {
    category: "lead_intelligence",
    subcategory: "enrichment",
    titleFn: (d) => `Enriched Lead: ${d.name ?? `Lead #${d.entityId}`}`,
    contentFn: (_e, d) => `Lead enrichment data captured. Company: ${d.company ?? "N/A"}. Technologies: ${d.technologies ?? "N/A"}. Revenue: ${d.revenue ?? "N/A"}.`,
    domain: "crm",
    entityType: "lead",
  },
  "lead.converted": {
    category: "lead_intelligence",
    subcategory: "conversions",
    titleFn: (d) => `Lead Converted: ${d.name ?? `Lead #${d.entityId}`}`,
    contentFn: (_e, d) => `Lead converted to opportunity. Source: ${d.source ?? "unknown"}. Time to convert: ${d.daysToConvert ?? "N/A"} days.`,
    domain: "crm",
    entityType: "lead",
  },
  "contract.signed": {
    category: "legal_intelligence",
    subcategory: "contracts",
    titleFn: (d) => `Contract Signed: ${d.title ?? `Contract #${d.entityId}`}`,
    contentFn: (_e, d) => `Contract signed. Type: ${d.contractType ?? "N/A"}. Value: $${d.value ?? "N/A"}. Key terms captured for future reference.`,
    domain: "legal",
    entityType: "contract",
  },
  "report.generated": {
    category: "reporting",
    subcategory: "generated_reports",
    titleFn: (d) => `Report: ${d.type ?? "report"} — ${d.period ?? "current"}`,
    contentFn: (_e, d) => `Report generated for ${d.domain ?? "system"} domain. Type: ${d.type ?? "ad-hoc"}. Period: ${d.period ?? "current"}.`,
    domain: "system",
    entityType: "report",
  },
  "invoice.paid": {
    category: "finance_intelligence",
    subcategory: "payments",
    titleFn: (d) => `Payment Received: Invoice #${d.entityId}`,
    contentFn: (_e, d) => `Invoice payment received. Amount: $${d.amount ?? "N/A"}. Client: ${d.client ?? "N/A"}.`,
    domain: "finance",
    entityType: "invoice",
  },
  "campaign.launched": {
    category: "campaign_lesson",
    subcategory: "campaign_launches",
    titleFn: (d) => `Campaign Launched: ${d.name ?? `Campaign #${d.entityId}`}`,
    contentFn: (_e, d) => `Campaign launched. Type: ${d.type ?? "N/A"}. Channels: ${d.channels ?? "N/A"}. Budget: $${d.budget ?? "N/A"}.`,
    domain: "marketing",
    entityType: "campaign",
  },
  "campaign.completed": {
    category: "campaign_lesson",
    subcategory: "campaign_results",
    titleFn: (d) => `Campaign Completed: ${d.name ?? `Campaign #${d.entityId}`}`,
    contentFn: (_e, d) => `Campaign completed. ROI: ${d.roi ?? "N/A"}. Leads generated: ${d.leadsGenerated ?? "N/A"}. Conversions: ${d.conversions ?? "N/A"}.`,
    domain: "marketing",
    entityType: "campaign",
  },
  "task.completed": {
    category: "workflow",
    subcategory: "task_completions",
    titleFn: (d) => `Task Completed: ${d.title ?? `Task #${d.entityId}`}`,
    contentFn: (_e, d) => `Task completed in ${d.domain ?? "system"} domain. Assignee: ${d.assignee ?? "N/A"}. Duration: ${d.duration ?? "N/A"}.`,
    domain: "execution",
    entityType: "task",
  },
  "workflow.executed": {
    category: "workflow",
    subcategory: "workflow_runs",
    titleFn: (d) => `Workflow Run: ${d.name ?? `Workflow #${d.entityId}`}`,
    contentFn: (_e, d) => `Workflow executed. Status: ${d.status ?? "completed"}. Steps: ${d.steps ?? "N/A"}. Duration: ${d.duration ?? "N/A"}ms.`,
    domain: "system",
    entityType: "workflow",
  },
  "ai.output_corrected": {
    category: "correction",
    subcategory: "ai_corrections",
    titleFn: (d) => `AI Correction: ${d.tool ?? "AI output"} by ${d.correctedBy ?? "human"}`,
    contentFn: (_e, d) => `AI output corrected. Tool: ${d.tool ?? "N/A"}. Reason: ${d.reason ?? "not specified"}.`,
    domain: "system",
    entityType: "ai_run",
  },
  "ai.output_approved": {
    category: "approval",
    subcategory: "ai_approvals",
    titleFn: (d) => `AI Output Approved: ${d.tool ?? "AI output"} by ${d.approvedBy ?? "human"}`,
    contentFn: (_e, d) => `AI output approved and accepted. Tool: ${d.tool ?? "N/A"}. Confidence: ${d.confidence ?? "N/A"}%.`,
    domain: "system",
    entityType: "ai_run",
  },
  "ai.output_rejected": {
    category: "rejection",
    subcategory: "ai_rejections",
    titleFn: (d) => `AI Output Rejected: ${d.tool ?? "AI output"} — ${d.reason ?? "no reason"}`,
    contentFn: (_e, d) => `AI output rejected. Tool: ${d.tool ?? "N/A"}. Reason: ${d.reason ?? "not specified"}.`,
    domain: "system",
    entityType: "ai_run",
  },
  "meeting.recorded": {
    category: "meeting_transcript",
    subcategory: "meetings",
    titleFn: (d) => `Meeting: ${d.title ?? `Meeting #${d.entityId}`}`,
    contentFn: (_e, d) => `Meeting recorded. Attendees: ${d.attendees ?? "N/A"}. Duration: ${d.duration ?? "N/A"} min. Key topics: ${d.topics ?? "N/A"}.`,
    domain: "crm",
    entityType: "meeting",
  },
  "call.completed": {
    category: "sales_knowledge",
    subcategory: "call_outcomes",
    titleFn: (d) => `Call: ${d.contactName ?? `Contact #${d.entityId}`} — ${d.outcome ?? "completed"}`,
    contentFn: (_e, d) => `Call completed. Contact: ${d.contactName ?? "N/A"}. Duration: ${d.duration ?? "N/A"} min. Outcome: ${d.outcome ?? "N/A"}. Notes: ${d.notes ?? "N/A"}.`,
    domain: "crm",
    entityType: "call",
  },
  "performance.snapshot": {
    category: "performance_data",
    subcategory: "snapshots",
    titleFn: (d) => `Performance: ${d.domain ?? "system"} — ${d.period ?? "current"}`,
    contentFn: (_e, d) => `Performance snapshot for ${d.domain ?? "system"}. Period: ${d.period ?? "current"}. Key metrics: ${JSON.stringify(d.metrics ?? {}).slice(0, 500)}.`,
    domain: "system",
    entityType: "performance",
  },
  "sop.created": {
    category: "sop",
    subcategory: "standard_procedures",
    titleFn: (d) => `SOP Created: ${d.title ?? `SOP #${d.entityId}`}`,
    contentFn: (_e, d) => `Standard Operating Procedure created. Title: ${d.title ?? "N/A"}. Domain: ${d.domain ?? "system"}. Version: ${d.version ?? "1.0"}.`,
    domain: "system",
    entityType: "sop",
  },
  "strategy.updated": {
    category: "strategy",
    subcategory: "strategy_updates",
    titleFn: (d) => `Strategy Update: ${d.title ?? `Strategy #${d.entityId}`}`,
    contentFn: (_e, d) => `Business strategy updated. Area: ${d.area ?? "general"}. Key changes: ${d.changes ?? "N/A"}.`,
    domain: "command_center",
    entityType: "strategy",
  },
};

async function autoPopulateKnowledge(event: string, entityId: number, eventData: Record<string, unknown>): Promise<void> {
  const mapping = KNOWLEDGE_EVENT_MAP[event];
  if (!mapping) return;

  const dataWithId = { ...eventData, entityId };

  try {
    await addKnowledgeEntry({
      category: mapping.category,
      subcategory: mapping.subcategory,
      title: mapping.titleFn(dataWithId),
      content: mapping.contentFn(event, dataWithId),
      source: `event:${event}`,
      sourceDomain: mapping.domain,
      sourceEntityType: mapping.entityType,
      sourceEntityId: entityId,
      tags: [event, mapping.category, mapping.domain],
      confidence: 85,
    });
  } catch (err) {
    console.error(`[ReportingKnowledge] Failed to auto-populate knowledge for ${event}:`, err);
  }
}

export function getArchiveAccessFilter(userRole: string, userId?: number) {
  const ROLE_ACCESS: Record<string, string[]> = {
    super_admin: ["internal", "confidential", "restricted", "public", "client"],
    admin: ["internal", "confidential", "public", "client"],
    manager: ["internal", "public", "client"],
    user: ["public"],
  };

  const allowedLevels = ROLE_ACCESS[userRole] ?? ["public"];
  return { allowedLevels };
}

export async function getPermissionFilteredArchive(params: {
  userRole: string;
  userId?: number;
  domain?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { allowedLevels } = getArchiveAccessFilter(params.userRole);

  const conditions = [
    inArray(archiveItemsTable.accessLevel, allowedLevels),
  ];

  if (params.userRole === "user" && params.userId) {
    conditions.push(
      sql`(${archiveItemsTable.accessLevel} = 'public' OR ${archiveItemsTable.owner} = ${params.userId.toString()})`
    );
  } else if (params.userRole === "manager" && params.userId) {
    conditions.push(
      sql`(${archiveItemsTable.accessLevel} != 'confidential' OR ${archiveItemsTable.owner} = ${params.userId.toString()})`
    );
  }

  if (params.domain) conditions.push(eq(archiveItemsTable.domain, params.domain));
  if (params.category) conditions.push(eq(archiveItemsTable.category, params.category));
  if (params.status) conditions.push(eq(archiveItemsTable.status, params.status ?? "active"));

  const results = await db.select().from(archiveItemsTable)
    .where(and(...conditions))
    .orderBy(desc(archiveItemsTable.createdAt))
    .limit(params.limit ?? 50)
    .offset(params.offset ?? 0);

  const [totalResult] = await db.select({ count: count() }).from(archiveItemsTable)
    .where(and(...conditions));

  return { items: results, total: totalResult?.count ?? 0, accessLevels: allowedLevels };
}

export async function deliverReportToSlack(reportId: number): Promise<{ success: boolean; error?: string }> {
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
  if (!report) return { success: false, error: "Report not found" };

  const { db: dbInstance, integrationsTable } = await import("@workspace/db");
  const [slackIntegration] = await dbInstance.select().from(integrationsTable)
    .where(and(eq(integrationsTable.provider, "slack"), eq(integrationsTable.isActive, true)));

  if (!slackIntegration) return { success: false, error: "Slack not connected" };

  const credentials = slackIntegration.credentials as Record<string, string> | null;
  const accessToken = credentials?.access_token;
  if (!accessToken) return { success: false, error: "Slack access token not available" };

  const channel = (slackIntegration.config as Record<string, string> | null)?.default_channel ?? "#general";

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 ${report.title}`, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: report.summary ?? report.content?.slice(0, 500) ?? "Report generated." },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `*Domain:* ${report.domain} | *Type:* ${report.type} | *Period:* ${report.period ?? "Current"}` },
      ],
    },
  ];

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel, blocks, text: `Report: ${report.title}` }),
    });

    const result = await response.json() as { ok: boolean; error?: string };
    if (!result.ok) return { success: false, error: `Slack API error: ${result.error}` };

    await db.update(reportsTable).set({
      deliveredAt: new Date(),
      deliveryChannel: "slack",
    }).where(eq(reportsTable.id, reportId));

    await logAudit({
      eventType: "report_delivered",
      domain: report.domain!,
      action: "deliver_to_slack",
      description: `Report "${report.title}" delivered to Slack channel ${channel}`,
      entityType: "report",
      entityId: report.id,
      actor: "system",
      actorType: "system",
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Slack delivery failed: ${err.message}` };
  }
}

export async function deliverReportSummaryByEmail(reportId: number, recipientEmail: string): Promise<{ success: boolean; error?: string }> {
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
  if (!report) return { success: false, error: "Report not found" };

  try {
    const { sendEmail } = await import("./messaging-service");
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: `PMG Report: ${report.title}`,
      body: `${report.summary ?? ""}\n\n${report.content ?? "Report content unavailable."}`,
      actor: "report_delivery",
    });

    if (emailResult && !(emailResult as any).success) {
      return { success: false, error: `Email delivery failed: ${(emailResult as any).error ?? "unknown"}` };
    }

    await db.update(reportsTable).set({
      deliveredAt: new Date(),
      deliveryChannel: "email",
      recipients: recipientEmail,
    }).where(eq(reportsTable.id, reportId));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Email delivery failed: ${err.message}` };
  }
}

export function getReportTemplates() {
  return Object.entries(REPORT_TEMPLATES).map(([key, t]) => ({
    key,
    title: t.title,
    type: t.type,
    domain: t.domain,
    cronExpression: t.cronExpression,
    format: t.format,
  }));
}

export function getEventReportTriggers() {
  return Object.entries(EVENT_REPORT_TRIGGERS).map(([event, t]) => ({
    event,
    domain: t.domain,
    reportType: t.reportType,
  }));
}

export function getKnowledgeEventMappings() {
  return Object.entries(KNOWLEDGE_EVENT_MAP).map(([event, m]) => ({
    event,
    category: m.category,
    subcategory: m.subcategory,
    domain: m.domain,
    entityType: m.entityType,
  }));
}

function registerReportSchedulerJobs() {
  registerJobExecutor("scheduled_report_daily_pipeline", async () => {
    await generateScheduledReport("daily_pipeline");
  });

  registerJobExecutor("scheduled_report_weekly_revenue", async () => {
    await generateScheduledReport("weekly_revenue");
  });

  registerJobExecutor("scheduled_report_weekly_marketing", async () => {
    await generateScheduledReport("weekly_marketing");
  });

  registerJobExecutor("scheduled_report_monthly_executive", async () => {
    await generateScheduledReport("monthly_executive");
  });

  registerJobExecutor("scheduled_report_quarterly_business", async () => {
    await generateScheduledReport("quarterly_business");
  });
}

async function seedReportScheduledJobs() {
  const { scheduledJobsTable } = await import("@workspace/db");
  const { rescheduleJob } = await import("./scheduler-service");

  const reportJobs = [
    {
      name: "Daily Pipeline Report",
      description: "Auto-generate daily CRM pipeline report at 6 PM weekdays",
      cronExpression: "0 18 * * 1-5",
      jobType: "scheduled_report_daily_pipeline",
      config: { template: "daily_pipeline" },
    },
    {
      name: "Weekly Revenue Report",
      description: "Auto-generate weekly finance/revenue report Monday 9 AM",
      cronExpression: "0 9 * * 1",
      jobType: "scheduled_report_weekly_revenue",
      config: { template: "weekly_revenue" },
    },
    {
      name: "Weekly Marketing Report",
      description: "Auto-generate weekly marketing performance Monday 9 AM",
      cronExpression: "0 9 * * 1",
      jobType: "scheduled_report_weekly_marketing",
      config: { template: "weekly_marketing" },
    },
    {
      name: "Monthly Executive Summary",
      description: "Auto-generate monthly executive summary 1st of each month",
      cronExpression: "0 9 1 * *",
      jobType: "scheduled_report_monthly_executive",
      config: { template: "monthly_executive" },
    },
    {
      name: "Quarterly Business Review",
      description: "Auto-generate quarterly business review report",
      cronExpression: "0 9 1 1,4,7,10 *",
      jobType: "scheduled_report_quarterly_business",
      config: { template: "quarterly_business" },
    },
  ];

  for (const job of reportJobs) {
    const [existing] = await db.select().from(scheduledJobsTable).where(eq(scheduledJobsTable.jobType, job.jobType));
    if (!existing) {
      const [inserted] = await db.insert(scheduledJobsTable).values(job).returning();
      await rescheduleJob(inserted.id);
    }
  }
}

function subscribeToReportEvents() {
  for (const eventName of Object.keys(EVENT_REPORT_TRIGGERS)) {
    subscribe(eventName, async (_event, payload) => {
      try {
        await handleEventTriggeredReport(eventName, payload.entityId ?? 0, {
          ...payload.data,
          previousState: payload.previousState,
          newState: payload.newState,
        });
      } catch (err) {
        console.error(`[ReportingKnowledge] Event report failed for ${eventName}:`, err);
      }
    });
  }
}

function subscribeToKnowledgeEvents() {
  for (const eventName of Object.keys(KNOWLEDGE_EVENT_MAP)) {
    subscribe(eventName, async (_event, payload) => {
      try {
        await autoPopulateKnowledge(eventName, payload.entityId ?? 0, {
          ...payload.data,
          previousState: payload.previousState,
          newState: payload.newState,
        });
      } catch (err) {
        console.error(`[ReportingKnowledge] Knowledge auto-pop failed for ${eventName}:`, err);
      }
    });
  }
}

export async function initReportingKnowledge(): Promise<void> {
  registerReportSchedulerJobs();
  await seedReportScheduledJobs();
  subscribeToReportEvents();
  subscribeToKnowledgeEvents();
  console.log("[ReportingKnowledge] Initialized — scheduled reports, event-triggered reports, knowledge auto-population, permission-aware archive, delivery channels");
}
