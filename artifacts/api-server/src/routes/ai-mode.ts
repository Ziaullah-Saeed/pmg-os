import { Router } from "express";
import { getGlobalMode, setGlobalMode, getWorkflowModes, setWorkflowMode } from "../services/ai-mode-service";

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
    await setGlobalMode(mode);
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
    res.json({ workflowKey: req.params.key, mode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
