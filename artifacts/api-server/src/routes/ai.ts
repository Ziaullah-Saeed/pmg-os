import { Router } from "express";
import { enrichLead, scoreLead, generateOutreachDraft, summarizeRecord, generateReport, suggestNextAction } from "../services/ai-service";

const router = Router();

router.post("/enrich-lead", async (req, res) => {
  try {
    const { id, name, email, company, source } = req.body;
    if (!id || !name) {
      res.status(400).json({ error: "id and name required" });
      return;
    }
    const result = await enrichLead({ id, name, email, company, source });
    res.json(result);
  } catch (err: any) {
    if (err.message.startsWith("AI_BLOCKED")) {
      res.status(403).json({ error: err.message, requiresHuman: true });
      return;
    }
    if (err.message.startsWith("WALLET_INSUFFICIENT")) {
      res.status(402).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/score-lead", async (req, res) => {
  try {
    const { id, name, email, company, source, enrichmentData } = req.body;
    if (!id || !name) {
      res.status(400).json({ error: "id and name required" });
      return;
    }
    const result = await scoreLead({ id, name, email, company, source, enrichmentData });
    res.json(result);
  } catch (err: any) {
    if (err.message.startsWith("AI_BLOCKED")) {
      res.status(403).json({ error: err.message, requiresHuman: true });
      return;
    }
    if (err.message.startsWith("WALLET_INSUFFICIENT")) {
      res.status(402).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-outreach", async (req, res) => {
  try {
    const { leadName, company, context, channel } = req.body;
    if (!leadName || !context || !channel) {
      res.status(400).json({ error: "leadName, context, channel required" });
      return;
    }
    const result = await generateOutreachDraft({ leadName, company, context, channel });
    res.json(result);
  } catch (err: any) {
    if (err.message.startsWith("AI_BLOCKED")) {
      res.status(403).json({ error: err.message, requiresHuman: true });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.post("/summarize", async (req, res) => {
  try {
    const { entityType, entityId, data } = req.body;
    if (!entityType || !entityId || !data) {
      res.status(400).json({ error: "entityType, entityId, data required" });
      return;
    }
    const result = await summarizeRecord({ entityType, entityId, data });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-report", async (req, res) => {
  try {
    const { domain, reportType, data } = req.body;
    if (!domain || !reportType) {
      res.status(400).json({ error: "domain, reportType required" });
      return;
    }
    const result = await generateReport({ domain, reportType, data: data ?? {} });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/suggest-action", async (req, res) => {
  try {
    const { entityType, entityId, currentStage, data } = req.body;
    if (!entityType || !entityId || !currentStage) {
      res.status(400).json({ error: "entityType, entityId, currentStage required" });
      return;
    }
    const result = await suggestNextAction({ entityType, entityId, currentStage, data: data ?? {} });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
