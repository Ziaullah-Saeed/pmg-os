import { db, jobQueueTable } from "@workspace/db";
import { eq, and, lte, sql, asc, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { emit } from "./event-bus";

type JobExecutor = (payload: any) => Promise<any>;

const executors = new Map<string, JobExecutor>();

const RETRY_DELAYS = [5_000, 15_000, 60_000, 300_000, 900_000];

export function registerJobExecutor(type: string, executor: JobExecutor): void {
  executors.set(type, executor);
}

export async function enqueueJob(params: {
  type: string;
  payload?: any;
  priority?: number;
  maxAttempts?: number;
  scheduledFor?: Date;
  domain?: string;
  entityType?: string;
  entityId?: number;
}): Promise<number> {
  const [row] = await db.insert(jobQueueTable).values({
    type: params.type,
    payload: params.payload ?? {},
    priority: params.priority ?? 0,
    maxAttempts: params.maxAttempts ?? 3,
    scheduledFor: params.scheduledFor ?? new Date(),
    domain: params.domain,
    entityType: params.entityType,
    entityId: params.entityId,
    status: "pending",
    attempts: 0,
  }).returning({ id: jobQueueTable.id });

  return row.id;
}

export async function processJobs(batchSize = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
  const now = new Date();
  let processed = 0, succeeded = 0, failed = 0;

  const jobs = await db.select().from(jobQueueTable)
    .where(and(
      inArray(jobQueueTable.status, ["pending", "retry"]),
      lte(jobQueueTable.scheduledFor, now),
    ))
    .orderBy(asc(jobQueueTable.priority), asc(jobQueueTable.scheduledFor))
    .limit(batchSize);

  for (const job of jobs) {
    const executor = executors.get(job.type);
    if (!executor) {
      logger.warn({ jobId: job.id, type: job.type }, "No executor registered for job type");
      await db.update(jobQueueTable)
        .set({ status: "dead_letter", lastError: `No executor registered for type: ${job.type}` })
        .where(eq(jobQueueTable.id, job.id));
      processed++;
      failed++;
      continue;
    }

    await db.update(jobQueueTable)
      .set({ status: "running", startedAt: now, attempts: sql`${jobQueueTable.attempts} + 1` })
      .where(eq(jobQueueTable.id, job.id));

    try {
      const result = await executor(job.payload);
      await db.update(jobQueueTable)
        .set({ status: "completed", completedAt: new Date(), result: result ?? {} })
        .where(eq(jobQueueTable.id, job.id));
      succeeded++;
    } catch (err: any) {
      const nextAttempt = job.attempts + 1;
      if (nextAttempt >= job.maxAttempts) {
        await db.update(jobQueueTable)
          .set({ status: "dead_letter", lastError: err.message, completedAt: new Date() })
          .where(eq(jobQueueTable.id, job.id));
        logger.error({ jobId: job.id, type: job.type, attempts: nextAttempt, err: err.message }, "Job moved to dead letter queue");
        await emit("job.dead_letter", {
          entityType: job.entityType ?? "job",
          entityId: job.id,
          domain: job.domain ?? "system",
          actor: "job_queue",
          data: { type: job.type, error: err.message, attempts: nextAttempt },
        });
      } else {
        const delayMs = RETRY_DELAYS[Math.min(nextAttempt - 1, RETRY_DELAYS.length - 1)];
        const retryAt = new Date(Date.now() + delayMs);
        await db.update(jobQueueTable)
          .set({ status: "retry", lastError: err.message, scheduledFor: retryAt })
          .where(eq(jobQueueTable.id, job.id));
        logger.warn({ jobId: job.id, type: job.type, attempt: nextAttempt, retryAt }, "Job scheduled for retry");
      }
      failed++;
    }

    processed++;
  }

  return { processed, succeeded, failed };
}

export async function getQueueStats(): Promise<{
  pending: number;
  running: number;
  completed: number;
  failed: number;
  deadLetter: number;
  retry: number;
}> {
  const rows = await db.select({
    status: jobQueueTable.status,
    count: sql<number>`count(*)::int`,
  }).from(jobQueueTable)
    .groupBy(jobQueueTable.status);

  const stats: Record<string, number> = {};
  for (const r of rows) stats[r.status] = r.count;

  return {
    pending: stats["pending"] ?? 0,
    running: stats["running"] ?? 0,
    completed: stats["completed"] ?? 0,
    failed: stats["failed"] ?? 0,
    deadLetter: stats["dead_letter"] ?? 0,
    retry: stats["retry"] ?? 0,
  };
}

export async function retryDeadLetterJob(jobId: number): Promise<boolean> {
  const [job] = await db.select().from(jobQueueTable).where(eq(jobQueueTable.id, jobId));
  if (!job || job.status !== "dead_letter") return false;

  await db.update(jobQueueTable)
    .set({ status: "pending", attempts: 0, lastError: null, scheduledFor: new Date() })
    .where(eq(jobQueueTable.id, jobId));

  return true;
}

export async function purgeCompletedJobs(olderThanDays = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await db.delete(jobQueueTable)
    .where(and(
      eq(jobQueueTable.status, "completed"),
      lte(jobQueueTable.completedAt, cutoff),
    ));

  return (result as any).rowCount ?? 0;
}

let processingInterval: ReturnType<typeof setInterval> | null = null;

export function startJobProcessing(intervalMs = 10_000): void {
  if (processingInterval) return;
  processingInterval = setInterval(async () => {
    try {
      const result = await processJobs();
      if (result.processed > 0) {
        logger.info({ ...result }, "Job queue batch processed");
      }
    } catch (err: any) {
      logger.error({ err: err.message }, "Job queue processing error");
    }
  }, intervalMs);
  logger.info({ intervalMs }, "[JobQueue] Started periodic processing");
}

export function stopJobProcessing(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
}
