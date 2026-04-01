import { Router } from "express";
import { getGlobalMode, setGlobalMode, getWorkflowModes, setWorkflowMode } from "../services/ai-mode-service";
import { logAudit } from "../services/audit-service";
import { createNotification } from "../services/notification-service";

const router = Router();

router.get("/global", async (_req, res) => {
  try {
    const mode = await getGlobalMode();
    res.json({ mode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/global", async (req, res) => {
  try {
    const { mode } = req.body;
    if (!["ai_autonomous", "hybrid", "human_controlled"].includes(mode)) {
      res.status(400).json({ error: "Invalid mode" });
      return;
    }
    const previousMode = await getGlobalMode();
    await setGlobalMode(mode);

    await logAudit({
      eventType: "mode_change",
      domain: "system",
      action: "global_mode_changed",
      description: `Global AI mode changed from ${previousMode} to ${mode}`,
      actor: "admin",
      actorType: "human",
      severity: mode === "ai_autonomous" ? "warning" : "info",
      metadata: { previousMode, newMode: mode },
    });

    await createNotification({
      type: "mode_change",
      severity: mode === "ai_autonomous" ? "warning" : "info",
      title: "System Mode Changed",
      message: `Global mode switched to ${mode.replace(/_/g, " ")}`,
      domain: "system",
      actor: "admin",
    }).catch(() => {});

    res.json({ mode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/workflows", async (_req, res) => {
  try {
    const workflows = await getWorkflowModes();
    res.json(workflows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/workflows/:key", async (req, res) => {
  try {
    const { mode } = req.body;
    if (!["ai_autonomous", "hybrid", "human_controlled"].includes(mode)) {
      res.status(400).json({ error: "Invalid mode" });
      return;
    }
    await setWorkflowMode(req.params.key, mode);

    await logAudit({
      eventType: "mode_change",
      domain: "system",
      action: "workflow_mode_changed",
      description: `Workflow ${req.params.key} mode changed to ${mode}`,
      actor: "admin",
      actorType: "human",
      metadata: { workflowKey: req.params.key, newMode: mode },
    });

    res.json({ workflowKey: req.params.key, mode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
