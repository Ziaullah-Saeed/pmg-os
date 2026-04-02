import { Router, type IRouter } from "express";
import {
  getChannelHealth, getDailyUsage, canSendToday,
  isOptedOut, addOptOut, removeOptOut, getOptOutList,
} from "../services/channel-health-service";
import { getSlackStatus } from "../services/slack-surface-service";
import { requireRole } from "../middleware/rbac";

const router: IRouter = Router();

router.get("/channel-health", async (_req, res): Promise<void> => {
  const health = getChannelHealth();
  const usage = getDailyUsage();
  const limits = {
    email: canSendToday("email"),
    sms: canSendToday("sms"),
    linkedin_message: canSendToday("linkedin_message"),
  };
  res.json({ health, usage, limits });
});

router.get("/channel-health/:channel", async (req, res): Promise<void> => {
  const health = getChannelHealth(req.params.channel);
  const limit = canSendToday(req.params.channel);
  if (!health) { res.status(404).json({ error: "Channel not found" }); return; }
  res.json({ health, limit });
});

router.get("/opt-out", requireRole("manager"), async (_req, res): Promise<void> => {
  res.json({ contacts: getOptOutList(), total: getOptOutList().length });
});

router.post("/opt-out", requireRole("manager"), async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "email is required" }); return; }
  addOptOut(email);
  res.json({ success: true, email });
});

router.delete("/opt-out", requireRole("manager"), async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "email is required" }); return; }
  removeOptOut(email);
  res.json({ success: true, email });
});

router.get("/opt-out/check/:email", async (req, res): Promise<void> => {
  res.json({ email: req.params.email, optedOut: isOptedOut(req.params.email) });
});

router.get("/slack/status", async (_req, res): Promise<void> => {
  const status = await getSlackStatus();
  res.json(status);
});

export default router;
