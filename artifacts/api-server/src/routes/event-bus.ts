import { Router, type IRouter } from "express";
import { getRecentEvents, getSubscriberCounts, emit } from "../services/event-bus";

const router: IRouter = Router();

router.get("/", async (req, res): Promise<void> => {
  const limit = parseInt(req.query?.limit as string) || 50;
  const events = getRecentEvents(limit);
  const subscribers = getSubscriberCounts();
  res.json({ events, subscribers, totalEvents: events.length });
});

router.post("/emit", async (req, res): Promise<void> => {
  const { event, payload } = req.body;
  if (!event) { res.status(400).json({ error: "event is required" }); return; }
  await emit(event, payload ?? {});
  res.json({ success: true, event });
});

export default router;
