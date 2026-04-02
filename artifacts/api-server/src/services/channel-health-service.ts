import { db, sequenceEnrollmentsTable, communicationsTable } from "@workspace/db";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { emit, subscribe } from "./event-bus";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";

type ChannelMetrics = {
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  replied: number;
  bounceRate: number;
  complaintRate: number;
  replyRate: number;
  healthScore: number;
  status: "healthy" | "warning" | "critical" | "paused";
};

type DailyUsage = {
  channel: string;
  count: number;
  date: string;
};

const channelMetrics: Record<string, ChannelMetrics> = {};
const dailySendCounts: Map<string, number> = new Map();
const optOutList: Set<string> = new Set();

const DAILY_LIMITS: Record<string, number> = {
  email: 200,
  sms: 100,
  linkedin_message: 50,
};

const HEALTH_THRESHOLDS = {
  bounceRateWarning: 0.03,
  bounceRateCritical: 0.08,
  complaintRateWarning: 0.001,
  complaintRateCritical: 0.005,
};

function getDailyKey(channel: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${channel}:${date}`;
}

export function getChannelHealth(channel?: string): Record<string, ChannelMetrics> | ChannelMetrics | null {
  if (channel) return channelMetrics[channel] ?? null;
  return { ...channelMetrics };
}

export function getDailyUsage(): DailyUsage[] {
  const result: DailyUsage[] = [];
  for (const [key, count] of dailySendCounts.entries()) {
    const [channel, date] = key.split(":");
    result.push({ channel, count, date });
  }
  return result;
}

export function isOptedOut(contactEmail: string): boolean {
  return optOutList.has(contactEmail.toLowerCase().trim());
}

export function addOptOut(contactEmail: string): void {
  optOutList.add(contactEmail.toLowerCase().trim());
}

export function removeOptOut(contactEmail: string): void {
  optOutList.delete(contactEmail.toLowerCase().trim());
}

export function getOptOutList(): string[] {
  return Array.from(optOutList);
}

export function canSendToday(channel: string): { allowed: boolean; sent: number; limit: number; remaining: number } {
  const key = getDailyKey(channel);
  const sent = dailySendCounts.get(key) ?? 0;
  const limit = DAILY_LIMITS[channel] ?? 500;
  return { allowed: sent < limit, sent, limit, remaining: Math.max(0, limit - sent) };
}

export function recordSend(channel: string): void {
  const key = getDailyKey(channel);
  const current = dailySendCounts.get(key) ?? 0;
  dailySendCounts.set(key, current + 1);

  if (!channelMetrics[channel]) {
    channelMetrics[channel] = {
      sent: 0, delivered: 0, bounced: 0, complained: 0, replied: 0,
      bounceRate: 0, complaintRate: 0, replyRate: 0, healthScore: 100, status: "healthy",
    };
  }
  channelMetrics[channel].sent++;
  recalculateHealth(channel);
}

export function recordBounce(channel: string): void {
  if (!channelMetrics[channel]) return;
  channelMetrics[channel].bounced++;
  recalculateHealth(channel);
}

export function recordComplaint(channel: string): void {
  if (!channelMetrics[channel]) return;
  channelMetrics[channel].complained++;
  recalculateHealth(channel);
}

export function recordReply(channel: string, contactEmail?: string): void {
  if (!channelMetrics[channel]) return;
  channelMetrics[channel].replied++;
  recalculateHealth(channel);
}

export function recordDelivery(channel: string): void {
  if (!channelMetrics[channel]) return;
  channelMetrics[channel].delivered++;
  recalculateHealth(channel);
}

function recalculateHealth(channel: string): void {
  const m = channelMetrics[channel];
  if (!m || m.sent === 0) return;

  m.bounceRate = m.bounced / m.sent;
  m.complaintRate = m.complained / m.sent;
  m.replyRate = m.replied / m.sent;

  let score = 100;
  if (m.bounceRate > HEALTH_THRESHOLDS.bounceRateCritical) score -= 40;
  else if (m.bounceRate > HEALTH_THRESHOLDS.bounceRateWarning) score -= 15;

  if (m.complaintRate > HEALTH_THRESHOLDS.complaintRateCritical) score -= 40;
  else if (m.complaintRate > HEALTH_THRESHOLDS.complaintRateWarning) score -= 15;

  if (m.replyRate > 0.1) score += 10;
  else if (m.replyRate < 0.01 && m.sent > 50) score -= 10;

  m.healthScore = Math.max(0, Math.min(100, score));

  if (m.healthScore < 30) m.status = "critical";
  else if (m.healthScore < 60) m.status = "warning";
  else m.status = "healthy";

  if (m.status === "critical") {
    createNotification({
      type: "channel_health_critical",
      severity: "error",
      title: `Channel Health Critical: ${channel}`,
      message: `${channel} health score dropped to ${m.healthScore}. Bounce rate: ${(m.bounceRate * 100).toFixed(1)}%, Complaint rate: ${(m.complaintRate * 100).toFixed(3)}%. Consider pausing outreach.`,
      domain: "outreach",
      actor: "channel_health_service",
    });

    emit("channel_health.critical", {
      entityType: "channel",
      entityId: 0,
      domain: "outreach",
      actor: "channel_health_service",
      data: { channel, healthScore: m.healthScore, bounceRate: m.bounceRate, complaintRate: m.complaintRate },
    });
  }
}

export async function checkCrossSequenceCollision(
  contactEmail: string,
  excludeSequenceId?: number
): Promise<{ hasCollision: boolean; activeSequences: number; sequenceIds: number[] }> {
  const enrollments = await db.select({
    sequenceId: sequenceEnrollmentsTable.sequenceId,
  }).from(sequenceEnrollmentsTable)
    .where(and(
      eq(sequenceEnrollmentsTable.contactEmail, contactEmail),
      eq(sequenceEnrollmentsTable.status, "active"),
    ));

  const sequenceIds = enrollments
    .map(e => e.sequenceId)
    .filter(id => id !== excludeSequenceId);

  return {
    hasCollision: sequenceIds.length > 0,
    activeSequences: sequenceIds.length,
    sequenceIds,
  };
}

function setupEventListeners(): void {
  subscribe("communication.completed", (_eventName, payload) => {
    const channel = payload.data?.channel ?? payload.data?.type;
    if (channel) recordDelivery(channel);
  });

  subscribe("communication.bounced", (_eventName, payload) => {
    const channel = payload.data?.channel ?? "email";
    recordBounce(channel);
  });

  subscribe("communication.complained", (_eventName, payload) => {
    const channel = payload.data?.channel ?? "email";
    recordComplaint(channel);
  });

  subscribe("communication.replied", (_eventName, payload) => {
    const channel = payload.data?.channel ?? "email";
    recordReply(channel, payload.data?.contactEmail);
  });
}

export function initChannelHealthService(): void {
  for (const ch of ["email", "sms", "linkedin_message"]) {
    channelMetrics[ch] = {
      sent: 0, delivered: 0, bounced: 0, complained: 0, replied: 0,
      bounceRate: 0, complaintRate: 0, replyRate: 0, healthScore: 100, status: "healthy",
    };
  }
  setupEventListeners();
  console.log("[ChannelHealth] Initialized — tracking bounce rates, complaints, daily limits, opt-outs, cross-sequence collision");
}
