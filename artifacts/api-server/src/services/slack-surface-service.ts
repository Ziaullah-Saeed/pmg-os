import { db, integrationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { subscribe } from "./event-bus";

type SlackMessage = {
  channel?: string;
  text: string;
  blocks?: any[];
};

type SlackConfig = {
  accessToken: string;
  defaultChannel: string;
};

async function getSlackConfig(): Promise<SlackConfig | null> {
  const [integration] = await db.select().from(integrationsTable)
    .where(and(eq(integrationsTable.provider, "slack"), eq(integrationsTable.isActive, true)));
  if (!integration) return null;

  const creds = integration.credentials as Record<string, string> | null;
  const config = integration.config as Record<string, string> | null;
  const accessToken = creds?.access_token ?? creds?.bot_token;
  if (!accessToken) return null;

  return { accessToken, defaultChannel: config?.default_channel ?? "#general" };
}

async function postMessage(msg: SlackMessage): Promise<{ ok: boolean; error?: string }> {
  const config = await getSlackConfig();
  if (!config) return { ok: false, error: "Slack not connected" };

  try {
    const resp = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.accessToken}` },
      body: JSON.stringify({
        channel: msg.channel ?? config.defaultChannel,
        text: msg.text,
        ...(msg.blocks ? { blocks: msg.blocks } : {}),
      }),
    });
    const data = await resp.json() as any;
    return { ok: !!data.ok, error: data.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

function formatDealAlert(data: any): SlackMessage {
  return {
    channel: "#deals",
    text: `Deal Alert: ${data.title ?? "New opportunity"}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "Deal Update" } },
      { type: "section", text: { type: "mrkdwn", text: `*${data.title ?? "Opportunity"}*\nStage: ${data.stage ?? "unknown"} | Value: $${data.value ?? 0}\nOwner: ${data.owner ?? "unassigned"}` } },
    ],
  };
}

function formatAgentAlert(data: any): SlackMessage {
  return {
    text: `Agent Alert: ${data.agentId ?? "unknown"} — ${data.status ?? "notification"}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "AI Agent Alert" } },
      { type: "section", text: { type: "mrkdwn", text: `*Agent:* ${data.agentId ?? data.agentName ?? "unknown"}\n*Domain:* ${data.domain ?? "system"}\n*Status:* ${data.status ?? "info"}\n${data.message ?? ""}` } },
    ],
  };
}

function formatApprovalRequest(data: any): SlackMessage {
  return {
    channel: "#approvals",
    text: `Approval Needed: ${data.title ?? data.actionType ?? "Pending review"}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "Approval Required" } },
      { type: "section", text: { type: "mrkdwn", text: `*${data.title ?? "Action"}*\n${data.description ?? ""}\n*AI Recommendation:* ${data.aiRecommendation ?? "None"}\n*Confidence:* ${data.confidence ?? "N/A"}%` } },
      { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "Review in PMG OS" }, url: data.reviewUrl ?? "#", action_id: "review_action" },
      ]},
    ],
  };
}

function formatQualityAlert(data: any): SlackMessage {
  return {
    channel: "#quality",
    text: `Quality Alert: ${data.title ?? "Issue detected"}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "Quality Gate Alert" } },
      { type: "section", text: { type: "mrkdwn", text: `*Entity:* ${data.entityType ?? "unknown"} #${data.entityId ?? ""}\n*Domain:* ${data.domain ?? ""}\n*Issues:* ${data.criticalFailures ?? 0} critical failures\n${data.message ?? ""}` } },
    ],
  };
}

function formatFinanceAlert(data: any): SlackMessage {
  return {
    channel: "#finance",
    text: `Finance Alert: ${data.action ?? "notification"} — ${data.entityType ?? ""} #${data.entityId ?? ""}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "Finance Update" } },
      { type: "section", text: { type: "mrkdwn", text: `*Action:* ${data.action ?? "update"}\n*Amount:* $${data.amount ?? 0}\n*Status:* ${data.status ?? "pending"}\n${data.description ?? ""}` } },
    ],
  };
}

function formatChannelHealthAlert(data: any): SlackMessage {
  return {
    channel: "#ops",
    text: `Channel Health Alert: ${data.channel ?? "unknown"} — score ${data.healthScore ?? 0}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "Channel Health Warning" } },
      { type: "section", text: { type: "mrkdwn", text: `*Channel:* ${data.channel ?? "unknown"}\n*Health Score:* ${data.healthScore ?? 0}/100\n*Bounce Rate:* ${data.bounceRate ?? "N/A"}\n*Action:* ${data.message ?? "Review outreach settings"}` } },
    ],
  };
}

function setupSlackEventRouting(): void {
  subscribe("opportunity.stage_changed", async (_eventName, payload) => {
    if (payload.data?.stage === "closing" || payload.data?.stage === "won") {
      await postMessage(formatDealAlert(payload.data));
    }
  });

  subscribe("opportunity.created", async (_eventName, payload) => {
    if (payload.data?.value && payload.data.value >= 50000) {
      await postMessage(formatDealAlert({ ...payload.data, title: `High-Value Deal: ${payload.data.title}` }));
    }
  });

  subscribe("pending_action.created", async (_eventName, payload) => {
    await postMessage(formatApprovalRequest(payload.data ?? payload));
  });

  subscribe("agent.error", async (_eventName, payload) => {
    await postMessage(formatAgentAlert({ ...payload.data, status: "error" }));
  });

  subscribe("agent.completed", async (_eventName, payload) => {
    if (payload.data?.confidence && payload.data.confidence < 50) {
      await postMessage(formatAgentAlert({ ...payload.data, status: "low-confidence", message: `Confidence: ${payload.data.confidence}% — human review recommended` }));
    }
  });

  subscribe("quality.gate_failed", async (_eventName, payload) => {
    await postMessage(formatQualityAlert(payload.data ?? payload));
  });

  subscribe("invoice.paid", async (_eventName, payload) => {
    await postMessage(formatFinanceAlert({ ...payload.data, action: "Invoice Paid" }));
  });

  subscribe("expense.approved", async (_eventName, payload) => {
    if (payload.data?.amount >= 5000) {
      await postMessage(formatFinanceAlert({ ...payload.data, action: "High-Value Expense Approved" }));
    }
  });

  subscribe("channel_health.critical", async (_eventName, payload) => {
    await postMessage(formatChannelHealthAlert(payload.data ?? payload));
  });

  subscribe("contract.requires_review", async (_eventName, payload) => {
    await postMessage({
      channel: "#legal",
      text: `Legal Review Required: ${payload.data?.title ?? "Contract"} #${payload.data?.entityId ?? ""}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Legal Review Required" } },
        { type: "section", text: { type: "mrkdwn", text: `*Contract:* ${payload.data?.title ?? "Unknown"}\n*Type:* ${payload.data?.type ?? "standard"}\nThis contract has been flagged for human legal review.` } },
      ],
    });
  });
}

export async function sendSlackNotification(channel: string, text: string, blocks?: any[]): Promise<{ ok: boolean; error?: string }> {
  return postMessage({ channel, text, blocks });
}

export async function getSlackStatus(): Promise<{ connected: boolean; defaultChannel?: string }> {
  const config = await getSlackConfig();
  return { connected: !!config, defaultChannel: config?.defaultChannel };
}

export function initSlackSurfaceService(): void {
  setupSlackEventRouting();
  console.log("[SlackSurface] Initialized — routing deals, approvals, agents, quality, finance, legal alerts to Slack channels");
}
