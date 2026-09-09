import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { logger } from "../lib/logger";

let wss: WebSocketServer | null = null;

export type WsEventType =
  | "notification"
  | "wallet_update"
  | "mode_change"
  | "lead_update"
  | "approval_update"
  | "system_alert"
  | "social_message"
  | "social_interaction"
  | "social_intent_scored"
  | "social_conversation_converted";

interface WsMessage {
  type: WsEventType;
  payload: any;
  timestamp: string;
}

export function initWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    logger.info("WebSocket client connected");
    ws.send(JSON.stringify({ type: "connected", payload: { message: "PMG OS realtime connected" }, timestamp: new Date().toISOString() }));

    ws.on("ping", () => ws.pong());

    ws.on("close", () => {
      logger.info("WebSocket client disconnected");
    });
  });

  logger.info("WebSocket server initialized on /ws");
  return wss;
}

export function broadcast(type: WsEventType, payload: any): void {
  if (!wss) return;
  const msg: WsMessage = { type, payload, timestamp: new Date().toISOString() };
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function getConnectionCount(): number {
  if (!wss) return 0;
  let count = 0;
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) count++; });
  return count;
}
