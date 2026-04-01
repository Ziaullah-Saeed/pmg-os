import { Router } from "express";
import { getNotifications, getUnreadCount, markRead, markAllRead, dismiss } from "../services/notification-service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await getNotifications(limit);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/unread-count", async (_req, res) => {
  try {
    const count = await getUnreadCount();
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/read", async (req, res) => {
  try {
    await markRead(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/read-all", async (_req, res) => {
  try {
    await markAllRead();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await dismiss(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
