import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type WsEventType = "notification" | "wallet_update" | "mode_change" | "lead_update" | "approval_update" | "system_alert" | "connected";

interface WsMessage {
  type: WsEventType;
  payload: any;
  timestamp: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          switch (msg.type) {
            case "notification":
              qc.invalidateQueries({ queryKey: ["notifications"] });
              break;
            case "wallet_update":
              qc.invalidateQueries({ queryKey: ["wallet"] });
              break;
            case "mode_change":
              qc.invalidateQueries({ queryKey: ["ai-mode"] });
              break;
            case "lead_update":
              qc.invalidateQueries({ queryKey: ["leads"] });
              break;
            case "approval_update":
              qc.invalidateQueries({ queryKey: ["approvals"] });
              break;
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, [qc]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
