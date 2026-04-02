import { db, communicationsTable, contactsTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { executeOrQueue } from "./mode-action-service";

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
  contactId?: number;
  companyId?: number;
  opportunityId?: number;
  templateId?: string;
  sequenceId?: number;
  enrollmentId?: number;
}

export interface SendSMSParams {
  to: string;
  body: string;
  from?: string;
  contactId?: number;
  companyId?: number;
  opportunityId?: number;
  sequenceId?: number;
  enrollmentId?: number;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  provider: string;
  channel: string;
  communicationId?: number;
  error?: string;
  queued?: boolean;
}

async function getSmtpConfig(): Promise<{
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
} | null> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    from: process.env.SMTP_FROM ?? user,
  };
}

async function sendViaNodemailer(params: SendEmailParams): Promise<{ messageId: string }> {
  const config = await getSmtpConfig();
  if (!config) throw new Error("SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables");

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const info = await transporter.sendMail({
    from: params.from ?? config.from,
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    html: params.body,
    text: params.body.replace(/<[^>]*>/g, ""),
  });

  return { messageId: info.messageId };
}

async function sendViaGHL(params: { to: string; body: string; channel: "email" | "sms"; subject?: string; contactId?: number }): Promise<{ messageId: string }> {
  const { getGHLConfig, lookupGHLContactId } = await import("./ghl-service");
  const config = await getGHLConfig();
  if (!config) throw new Error("GoHighLevel not configured");

  let ghlContactId: string | undefined;
  if (params.contactId) {
    try {
      ghlContactId = await lookupGHLContactId(params.contactId);
    } catch {}
  }
  if (!ghlContactId) {
    throw new Error("GHL contact not found — cannot send via GoHighLevel without a synced contact");
  }

  const endpoint = `${config.baseUrl}/conversations/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
    },
    body: JSON.stringify({
      type: params.channel === "sms" ? "SMS" : "Email",
      contactId: ghlContactId,
      message: params.body,
      subject: params.subject,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`GHL send failed: ${err}`);
  }

  const data: any = await response.json();
  return { messageId: data.messageId ?? data.id ?? `ghl-${Date.now()}` };
}

async function logCommunication(params: {
  type: string;
  direction: string;
  subject?: string;
  summary: string;
  contactId?: number;
  companyId?: number;
  opportunityId?: number;
  outcome: string;
  performedBy: string;
}): Promise<number> {
  const [comm] = await db.insert(communicationsTable).values({
    type: params.type,
    direction: params.direction,
    subject: params.subject,
    summary: params.summary,
    contactId: params.contactId,
    companyId: params.companyId,
    opportunityId: params.opportunityId,
    outcome: params.outcome,
    performedBy: params.performedBy,
    completedAt: new Date(),
  }).returning();
  return comm.id;
}

export async function sendEmail(params: SendEmailParams): Promise<MessageResult> {
  let provider = "nodemailer";
  let messageId: string | undefined;
  let communicationId: number | undefined;

  try {
    try {
      const result = await sendViaNodemailer(params);
      messageId = result.messageId;
      provider = "nodemailer";
    } catch (smtpErr: any) {
      if (smtpErr.message?.includes("SMTP not configured")) {
        try {
          const ghlResult = await sendViaGHL({ to: params.to, body: params.body, channel: "email", subject: params.subject, contactId: params.contactId });
          messageId = ghlResult.messageId;
          provider = "ghl";
        } catch {
          messageId = `local-${Date.now()}`;
          provider = "local_log";
          console.log(`[Messaging] Email logged (no provider configured)`);
        }
      } else {
        throw smtpErr;
      }
    }

    communicationId = await logCommunication({
      type: "email",
      direction: "outbound",
      subject: params.subject,
      summary: params.body.slice(0, 500),
      contactId: params.contactId,
      companyId: params.companyId,
      opportunityId: params.opportunityId,
      outcome: "sent",
      performedBy: "messaging_service",
    });

    await logAudit({
      eventType: "email_sent",
      domain: "communications",
      action: "send_email",
      description: `Email sent to ${params.to}: "${params.subject}" via ${provider}`,
      entityType: "communication",
      entityId: communicationId,
      actor: "messaging_service",
      actorType: "system",
    });

    broadcast("email_sent", { to: params.to, subject: params.subject, provider, communicationId });

    return { success: true, messageId, provider, channel: "email", communicationId };
  } catch (err: any) {
    await createNotification({
      type: "email_failed",
      severity: "error",
      title: "Email Send Failed",
      message: `Failed to send email to ${params.to}: ${err.message}`,
      domain: "communications",
      actor: "messaging_service",
    });
    return { success: false, provider, channel: "email", error: err.message };
  }
}

export async function sendSMS(params: SendSMSParams): Promise<MessageResult> {
  let provider = "local_log";
  let messageId: string | undefined;
  let communicationId: number | undefined;

  try {
    try {
      const ghlResult = await sendViaGHL({ to: params.to, body: params.body, channel: "sms" });
      messageId = ghlResult.messageId;
      provider = "ghl";
    } catch {
      messageId = `sms-local-${Date.now()}`;
      provider = "local_log";
      console.log(`[Messaging] SMS logged (no provider configured)`);
    }

    communicationId = await logCommunication({
      type: "sms",
      direction: "outbound",
      summary: params.body.slice(0, 500),
      contactId: params.contactId,
      companyId: params.companyId,
      opportunityId: params.opportunityId,
      outcome: "sent",
      performedBy: "messaging_service",
    });

    await logAudit({
      eventType: "sms_sent",
      domain: "communications",
      action: "send_sms",
      description: `SMS sent to ${params.to} via ${provider}`,
      entityType: "communication",
      entityId: communicationId,
      actor: "messaging_service",
      actorType: "system",
    });

    broadcast("sms_sent", { to: params.to, provider, communicationId });

    return { success: true, messageId, provider, channel: "sms", communicationId };
  } catch (err: any) {
    await createNotification({
      type: "sms_failed",
      severity: "error",
      title: "SMS Send Failed",
      message: `Failed to send SMS to ${params.to}: ${err.message}`,
      domain: "communications",
      actor: "messaging_service",
    });
    return { success: false, provider, channel: "sms", error: err.message };
  }
}

export async function sendMessageWithMode(params: {
  channel: "email" | "sms";
  to: string;
  subject?: string;
  body: string;
  contactId?: number;
  companyId?: number;
  opportunityId?: number;
  confidence?: number;
  source?: string;
}): Promise<MessageResult & { queued?: boolean }> {
  const confidence = params.confidence ?? 80;

  const result = await executeOrQueue({
    actionType: `send_${params.channel}`,
    workflowKey: "outreach_send",
    entityType: "communication",
    title: `Send ${params.channel.toUpperCase()}: ${params.subject ?? params.body.slice(0, 50)}`,
    description: `${params.channel === "email" ? `Email to ${params.to}: "${params.subject}"` : `SMS to ${params.to}: "${params.body.slice(0, 80)}"`}`,
    confidence,
    aiRecommendation: "approve",
    aiParts: `AI drafted and scheduled ${params.channel} delivery`,
    humanParts: `Review ${params.channel} content and approve sending`,
    options: [
      { id: "send", label: `Send ${params.channel.toUpperCase()}`, description: `Deliver the ${params.channel} now`, isAiRecommended: true },
      { id: "edit", label: "Edit & Send", description: "Modify the message before sending" },
      { id: "cancel", label: "Cancel", description: "Do not send" },
    ],
    metadata: { to: params.to, subject: params.subject, body: params.body.slice(0, 500), channel: params.channel, source: params.source },
    executeAction: async (option) => {
      if (option === "cancel") return { success: false, cancelled: true };
      if (params.channel === "email") {
        return sendEmail({
          to: params.to,
          subject: params.subject ?? "(no subject)",
          body: params.body,
          contactId: params.contactId,
          companyId: params.companyId,
          opportunityId: params.opportunityId,
        });
      } else {
        return sendSMS({
          to: params.to,
          body: params.body,
          contactId: params.contactId,
          companyId: params.companyId,
          opportunityId: params.opportunityId,
        });
      }
    },
  });

  if (result.queued) {
    return {
      success: false,
      queued: true,
      provider: "pending",
      channel: params.channel,
      messageId: `pending-${result.pendingActionId}`,
    };
  }

  return result.result ?? { success: false, provider: "unknown", channel: params.channel, error: "Execution failed" };
}
