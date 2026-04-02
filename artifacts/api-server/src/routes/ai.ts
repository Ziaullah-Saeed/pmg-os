import { Router } from "express";
import { enrichLead, scoreLead, generateOutreachDraft, summarizeRecord, generateReport, suggestNextAction } from "../services/ai-service";
import { generateICP, analyzeCompetitors, segmentMarket } from "../services/intelligence-service";
import { runFullOutreachPipeline, researchProspect, personalizeOutreach, draftStructuredOutreach, generateOutreachVariants } from "../services/outreach-pipeline-service";
import { handleConfidenceHandoff, classifyConfidence } from "../services/confidence-handoff-service";
import { executeChain, getAllTools, getAllChainTemplates } from "../services/tool-chain-service";

const router = Router();

function handleAIError(err: any, res: any): void {
  if (err.message?.startsWith("AI_BLOCKED")) { res.status(403).json({ error: err.message, requiresHuman: true }); return; }
  if (err.message?.startsWith("WALLET_INSUFFICIENT")) { res.status(402).json({ error: err.message }); return; }
  if (err.message?.startsWith("AI_CALL_FAILED")) { res.status(503).json({ error: err.message }); return; }
  res.status(500).json({ error: err.message });
}

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
    handleAIError(err, res);
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
    handleAIError(err, res);
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
    handleAIError(err, res);
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

router.post("/icp", async (req, res) => {
  try {
    const { industry, customContext } = req.body;
    const result = await generateICP({ industry, customContext });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/competitors", async (req, res) => {
  try {
    const { competitors, focusArea } = req.body;
    const result = await analyzeCompetitors({ competitors, focusArea });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/market-segments", async (req, res) => {
  try {
    const { criteria, icp } = req.body;
    const result = await segmentMarket({ criteria, icp });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/outreach-pipeline", async (req, res) => {
  try {
    const { leadId, channel, generateVariants } = req.body;
    if (!leadId || !channel) { res.status(400).json({ error: "leadId and channel required" }); return; }
    const result = await runFullOutreachPipeline({ leadId, channel, generateVariants });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/research-prospect", async (req, res) => {
  try {
    const { leadName, company, email, industry } = req.body;
    if (!leadName) { res.status(400).json({ error: "leadName required" }); return; }
    const result = await researchProspect({ leadName, company, email, industry });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/personalize-outreach", async (req, res) => {
  try {
    const { leadName, company, channel, research, icpMatch, previousInteractions } = req.body;
    if (!leadName || !channel) { res.status(400).json({ error: "leadName and channel required" }); return; }
    const result = await personalizeOutreach({ leadName, company, channel, research, icpMatch, previousInteractions });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/draft-structured-outreach", async (req, res) => {
  try {
    const { leadName, company, channel, personalization, research, stepNumber, sequenceContext } = req.body;
    if (!leadName || !channel) { res.status(400).json({ error: "leadName and channel required" }); return; }
    const result = await draftStructuredOutreach({ leadName, company, channel, personalization, research, stepNumber, sequenceContext });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/outreach-variants", async (req, res) => {
  try {
    const { leadName, company, channel, baseDraft, variantCount } = req.body;
    if (!leadName || !channel || !baseDraft) { res.status(400).json({ error: "leadName, channel, baseDraft required" }); return; }
    const result = await generateOutreachVariants({ leadName, company, channel, baseDraft, variantCount });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.get("/tools", (_req, res) => {
  const tools = getAllTools().map(t => ({ name: t.name, description: t.description, domain: t.domain, inputKeys: t.inputKeys, outputKeys: t.outputKeys, costCredits: t.costCredits }));
  res.json(tools);
});

router.get("/chains", (_req, res) => {
  const chains = getAllChainTemplates().map(c => ({ name: c.name, description: c.description, domain: c.domain, steps: c.steps.map(s => s.toolName) }));
  res.json(chains);
});

router.post("/chain/execute", async (req, res) => {
  try {
    const { templateName, input, workflowKey, entityType, entityId, triModeAware } = req.body;
    if (!templateName) { res.status(400).json({ error: "templateName required" }); return; }
    const result = await executeChain(templateName, input ?? {}, { workflowKey, entityType, entityId, triModeAware: triModeAware ?? true });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/confidence-check", (req, res) => {
  const { confidence } = req.body;
  if (confidence === undefined) { res.status(400).json({ error: "confidence required" }); return; }
  const decision = classifyConfidence(confidence);
  res.json(decision);
});

export default router;
