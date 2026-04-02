import * as cron from "node-cron";
import { db, scheduledJobsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { emit } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";

type JobExecutor = (config: Record<string, unknown>) => Promise<void>;

const jobExecutors = new Map<string, JobExecutor>();
const activeCronJobs = new Map<number, cron.ScheduledTask>();

function registerJobExecutor(jobType: string, executor: JobExecutor) {
  jobExecutors.set(jobType, executor);
}

async function executeJob(jobId: number): Promise<void> {
  const [job] = await db.select().from(scheduledJobsTable).where(eq(scheduledJobsTable.id, jobId));
  if (!job) return;

  const executor = jobExecutors.get(job.jobType);
  if (!executor) {
    console.error(`[Scheduler] No executor for job type: ${job.jobType}`);
    return;
  }

  const startTime = Date.now();
  try {
    await executor((job.config as Record<string, unknown>) ?? {});
    const duration = Date.now() - startTime;

    await db.update(scheduledJobsTable).set({
      lastRunAt: new Date(),
      lastRunStatus: "success",
      lastRunError: null,
      lastRunDurationMs: duration,
      totalRuns: sql`${scheduledJobsTable.totalRuns} + 1`,
    }).where(eq(scheduledJobsTable.id, jobId));

    await emit("scheduler.job_completed", {
      domain: "system",
      actor: "scheduler",
      actorType: "system",
      data: { jobId, jobName: job.name, jobType: job.jobType, durationMs: duration },
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    await db.update(scheduledJobsTable).set({
      lastRunAt: new Date(),
      lastRunStatus: "failed",
      lastRunError: err.message ?? String(err),
      lastRunDurationMs: duration,
      totalRuns: sql`${scheduledJobsTable.totalRuns} + 1`,
      totalFailures: sql`${scheduledJobsTable.totalFailures} + 1`,
    }).where(eq(scheduledJobsTable.id, jobId));

    console.error(`[Scheduler] Job "${job.name}" failed:`, err);
  }
}

function scheduleCronJob(job: { id: number; name: string; cronExpression: string }) {
  if (activeCronJobs.has(job.id)) {
    activeCronJobs.get(job.id)!.stop();
  }

  if (!cron.validate(job.cronExpression)) {
    console.error(`[Scheduler] Invalid cron expression for job "${job.name}": ${job.cronExpression}`);
    return;
  }

  const task = cron.schedule(job.cronExpression, () => {
    executeJob(job.id).catch(err => console.error(`[Scheduler] Job ${job.id} error:`, err));
  });

  activeCronJobs.set(job.id, task);
}

async function seedDefaultJobs(): Promise<void> {
  const [existing] = await db.select({ count: sql<number>`count(*)` }).from(scheduledJobsTable);
  if (existing && Number(existing.count) > 0) return;

  const defaults = [
    {
      name: "Daily Stale Deal Check",
      description: "Find deals with no activity for 7+ days and send alerts",
      cronExpression: "0 9 * * *",
      jobType: "stale_deal_check",
      config: { daysThreshold: 7 },
    },
    {
      name: "Wallet Low Balance Alert",
      description: "Check wallet balance and alert if below threshold",
      cronExpression: "0 */4 * * *",
      jobType: "wallet_balance_check",
      config: { threshold: 500 },
    },
    {
      name: "Advance Outreach Sequences",
      description: "Process pending sequence steps for enrolled contacts",
      cronExpression: "*/15 * * * *",
      jobType: "sequence_advance",
      config: {},
    },
    {
      name: "Daily Summary Report",
      description: "Generate daily summary of key metrics",
      cronExpression: "0 18 * * 1-5",
      jobType: "daily_summary",
      config: {},
    },
  ];

  for (const job of defaults) {
    await db.insert(scheduledJobsTable).values(job);
  }
}

registerJobExecutor("stale_deal_check", async (_config) => {
  const { checkStalePipelineDeals } = await import("./pipeline-engine");
  const alertCount = await checkStalePipelineDeals();

  if (alertCount > 0) {
    await emit("schedule.daily", { domain: "crm", actor: "scheduler", actorType: "system", data: { staleDealCount: alertCount } });
  }
});

registerJobExecutor("wallet_balance_check", async (config) => {
  const { threshold = 500 } = config;
  const { getWalletBalance } = await import("./wallet-service");
  const { balance } = await getWalletBalance();
  if (balance < threshold) {
    await createNotification({
      type: "wallet_low",
      severity: "error",
      title: "Low Wallet Balance",
      message: `Wallet balance ($${balance.toFixed(2)}) is below the $${threshold} threshold`,
      domain: "billing",
      actor: "scheduler",
    });
  }
});

registerJobExecutor("sequence_advance", async () => {
  try {
    const { advanceSequences } = await import("./sequence-engine");
    await advanceSequences();
  } catch (e) {
    console.error("[Scheduler] sequence_advance failed:", e);
  }
});

registerJobExecutor("daily_summary", async () => {
  await createNotification({
    type: "daily_summary",
    severity: "info",
    title: "Daily Summary Generated",
    message: "End-of-day summary has been compiled",
    domain: "command_center",
    actor: "scheduler",
  });
  await emit("schedule.daily", { domain: "system", actor: "scheduler", actorType: "system" });
});

export async function triggerJobManually(jobId: number): Promise<{ success: boolean; error?: string }> {
  const [job] = await db.select().from(scheduledJobsTable).where(eq(scheduledJobsTable.id, jobId));
  if (!job) return { success: false, error: "Job not found" };
  await executeJob(jobId);
  return { success: true };
}

export async function initScheduler(): Promise<void> {
  await seedDefaultJobs();

  const jobs = await db.select().from(scheduledJobsTable).where(eq(scheduledJobsTable.enabled, true));
  for (const job of jobs) {
    scheduleCronJob(job);
  }

  console.log(`[Scheduler] Initialized — ${jobs.length} jobs scheduled`);
}

export async function rescheduleJob(jobId: number): Promise<void> {
  const [job] = await db.select().from(scheduledJobsTable).where(eq(scheduledJobsTable.id, jobId));
  if (!job || !job.enabled) {
    if (activeCronJobs.has(jobId)) {
      activeCronJobs.get(jobId)!.stop();
      activeCronJobs.delete(jobId);
    }
    return;
  }
  scheduleCronJob(job);
}

export { registerJobExecutor };
