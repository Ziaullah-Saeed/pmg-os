import { logAudit } from "./audit-service";

export type EventPayload = {
  entityType?: string;
  entityId?: number;
  domain?: string;
  actor?: string;
  actorType?: "human" | "ai" | "system";
  data?: Record<string, unknown>;
  previousState?: string;
  newState?: string;
};

type EventHandler = (event: string, payload: EventPayload) => Promise<void> | void;

const subscribers = new Map<string, EventHandler[]>();
const wildcardSubscribers: EventHandler[] = [];
let eventLog: Array<{ event: string; timestamp: Date; payload: EventPayload }> = [];
const MAX_LOG_SIZE = 500;

export function subscribe(event: string, handler: EventHandler): () => void {
  if (event === "*") {
    wildcardSubscribers.push(handler);
    return () => {
      const idx = wildcardSubscribers.indexOf(handler);
      if (idx >= 0) wildcardSubscribers.splice(idx, 1);
    };
  }
  if (!subscribers.has(event)) subscribers.set(event, []);
  subscribers.get(event)!.push(handler);
  return () => {
    const handlers = subscribers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  };
}

export async function emit(event: string, payload: EventPayload = {}): Promise<void> {
  eventLog.push({ event, timestamp: new Date(), payload });
  if (eventLog.length > MAX_LOG_SIZE) eventLog = eventLog.slice(-MAX_LOG_SIZE);

  const handlers = subscribers.get(event) ?? [];
  const allHandlers = [...handlers, ...wildcardSubscribers];

  const results = await Promise.allSettled(
    allHandlers.map(handler => Promise.resolve(handler(event, payload)))
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`[EventBus] Handler failed for "${event}":`, result.reason);
    }
  }

  logAudit({
    eventType: "event_bus",
    domain: payload.domain ?? "system",
    action: event,
    description: `Event "${event}" fired with ${allHandlers.length} handler(s)`,
    entityType: payload.entityType,
    entityId: payload.entityId,
    actor: payload.actor ?? "system",
    actorType: payload.actorType ?? "system",
    metadata: { handlersCount: allHandlers.length, event },
  }).catch(() => {});
}

export function getRecentEvents(limit = 50) {
  return [...eventLog].reverse().slice(0, limit);
}

export function getSubscriberCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [event, handlers] of subscribers) {
    counts[event] = handlers.length;
  }
  if (wildcardSubscribers.length > 0) counts["*"] = wildcardSubscribers.length;
  return counts;
}

export function clearAllSubscribers() {
  subscribers.clear();
  wildcardSubscribers.length = 0;
}
