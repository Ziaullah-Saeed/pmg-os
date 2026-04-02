import { Router } from "express";
import { enrichLead, scoreLead, generateOutreachDraft, summarizeRecord, generateReport, suggestNextAction } from "../services/ai-service";
import { generateICP, analyzeCompetitors, segmentMarket } from "../services/intelligence-service";
import { runFullOutreachPipeline, researchProspect, personalizeOutreach, draftStructuredOutreach, generateOutreachVariants } from "../services/outreach-pipeline-service";
import { handleConfidenceHandoff, classifyConfidence } from "../services/confidence-handoff-service";
import { executeChain, getAllTools, getAllChainTemplates } from "../services/tool-chain-service";
import { processTranscript, processTranscriptWithHandoff, analyzeCallSentiment, detectObjections, generateFollowUp, generateFollowUpWithHandoff } from "../services/communication-intelligence-service";
import { sendEmail, sendSMS, sendMessageWithMode } from "../services/messaging-service";
import { getAvailableSlots, createBooking, createBookingWithMode, cancelBooking, getUpcomingMeetings } from "../services/booking-service";
import {
  generateAsset, routeCreativeRequest, getAvailableProviders,
  aiReviewAsset, generateDesignBrief, suggestRevisions,
  submitForReview, reviewAsset, finalizeAsset,
  createAssetVersion, regenerateAssetVersion, getVersionHistory,
  getDefaultBrandKit,
  archiveAsset, getArchivedAssets, restoreAsset,
  CREATIVE_PROVIDERS, routeCreativeTask, getProviderById, getProvidersForAssetType, getAIRoutingRecommendation,
} from "../services/production-studio-service";
import {
  transitionInvoice, recordPayment, checkOverdueInvoices,
  submitExpense, reviewExpense,
  reviewContract, generateContractFromTemplate,
  enforceQualityCheckpoints, getQualityCheckpointsForType, runQualityCheckpoints,
  checkSOPCompliance, aiAuditSOPCompliance,
} from "../services/finance-legal-service";

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

router.post("/transcript/process", async (req, res) => {
  try {
    const { communicationId, transcript, type, contactName, companyName } = req.body;
    if (!transcript) { res.status(400).json({ error: "transcript required" }); return; }
    const result = await processTranscriptWithHandoff({ communicationId, transcript, type, contactName, companyName });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/transcript/sentiment", async (req, res) => {
  try {
    const { communicationId, transcript, summary, contactName } = req.body;
    if (!transcript && !summary) { res.status(400).json({ error: "transcript or summary required" }); return; }
    const result = await analyzeCallSentiment({ communicationId, transcript, summary, contactName });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/transcript/objections", async (req, res) => {
  try {
    const { communicationId, transcript, summary, contactName, dealContext } = req.body;
    if (!transcript && !summary) { res.status(400).json({ error: "transcript or summary required" }); return; }
    const result = await detectObjections({ communicationId, transcript, summary, contactName, dealContext });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/followup/generate", async (req, res) => {
  try {
    const { communicationId, transcript, summary, actionItems, contactName, companyName, channel, tone } = req.body;
    if (!transcript && !summary) { res.status(400).json({ error: "transcript or summary required" }); return; }
    const result = await generateFollowUpWithHandoff({ communicationId, transcript, summary, actionItems, contactName, companyName, channel, tone });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/send-email", async (req, res) => {
  try {
    const { to, subject, body, contactId, companyId, opportunityId, confidence } = req.body;
    if (!to || !subject || !body) { res.status(400).json({ error: "to, subject, body required" }); return; }
    const result = await sendMessageWithMode({ channel: "email", to, subject, body, contactId, companyId, opportunityId, confidence });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/send-sms", async (req, res) => {
  try {
    const { to, body, contactId, companyId, opportunityId, confidence } = req.body;
    if (!to || !body) { res.status(400).json({ error: "to, body required" }); return; }
    const result = await sendMessageWithMode({ channel: "sms", to, body, contactId, companyId, opportunityId, confidence });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.get("/bookings/slots", async (req, res) => {
  try {
    const { date, durationMinutes } = req.query;
    if (!date) { res.status(400).json({ error: "date required (YYYY-MM-DD)" }); return; }
    const slots = await getAvailableSlots({ date: date as string, durationMinutes: durationMinutes ? parseInt(durationMinutes as string) : undefined });
    res.json(slots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const { contactId, companyId, opportunityId, contactName, contactEmail, title, description, scheduledAt, durationMinutes, meetingType, confidence } = req.body;
    if (!title || !scheduledAt) { res.status(400).json({ error: "title and scheduledAt required" }); return; }
    const result = await createBookingWithMode({ contactId, companyId, opportunityId, contactName, contactEmail, title, description, scheduledAt, durationMinutes, meetingType, confidence });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.delete("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid booking ID" }); return; }
    const result = await cancelBooking(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/bookings/upcoming", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const meetings = await getUpcomingMeetings(limit);
    res.json(meetings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/production/generate", async (req, res) => {
  try {
    const { type, title, prompt, category, domain, campaignId, brandKitId, aspectRatio, durationSeconds, providerId, qualityPreference, speedPreference } = req.body;
    if (!type || !title || !prompt) { res.status(400).json({ error: "type, title, and prompt required" }); return; }
    const qualityNorm: Record<string, string> = { premium: "studio", professional: "professional", standard: "standard", draft: "draft", studio: "studio" };
    const speedNorm: Record<string, string> = { instant: "realtime", fast: "fast", medium: "standard", slow: "slow", realtime: "realtime", standard: "standard" };
    const actor = (req as any).session?.user?.email ?? "system";
    const result = await generateAsset({ type, title, prompt, category, domain, campaignId, brandKitId, aspectRatio, durationSeconds, actor, providerId, qualityPreference: qualityNorm[qualityPreference] ?? qualityPreference, speedPreference: speedNorm[speedPreference] ?? speedPreference });
    res.json({
      assetId: result.asset.id, asset: result.asset, provider: result.provider, generationResult: result.generationResult,
      routing: { primary: result.routing.primary.id, primaryName: result.routing.primary.name, reason: result.routing.reason, estimatedCredits: result.routing.estimatedCredits, estimatedTime: result.routing.estimatedTime, pipeline: result.routing.pipeline.map(s => ({ step: s.step, provider: s.provider.id, providerName: s.provider.name, action: s.action })), alternatives: result.routing.alternatives.map(a => ({ id: a.id, name: a.name })) },
    });
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/production/design-brief", async (req, res) => {
  try {
    const { type, objective, targetAudience, keyMessages, references } = req.body;
    if (!type || !objective) { res.status(400).json({ error: "type and objective required" }); return; }
    const result = await generateDesignBrief({ type, objective, targetAudience, keyMessages, references });
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/production/:id/ai-review", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const result = await aiReviewAsset(id);
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/production/:id/suggest-revisions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const result = await suggestRevisions(id);
    res.json(result);
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.post("/production/:id/submit-review", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const actor = (req as any).session?.user?.email ?? "system";
    const result = await submitForReview(id, actor);
    if (!result.success) { res.status(422).json(result); return; }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/production/:id/review", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const { decision, reviewNotes, rejectionReason } = req.body;
    if (!decision || !["approved", "revision_needed"].includes(decision)) {
      res.status(400).json({ error: 'decision required: "approved" or "revision_needed"' }); return;
    }
    const reviewer = (req as any).session?.user?.email ?? "system";
    const result = await reviewAsset({ assetId: id, decision, reviewNotes, rejectionReason, reviewer });
    if (!result.success) { res.status(422).json(result); return; }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/production/:id/finalize", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const actor = (req as any).session?.user?.email ?? "system";
    const result = await finalizeAsset(id, actor);
    if (!result.success) { res.status(422).json(result); return; }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/production/:id/version", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const { title, content, prompt } = req.body;
    const actor = (req as any).session?.user?.email ?? "system";
    const version = await createAssetVersion(id, { title, content, prompt }, actor);
    if (!version) { res.status(404).json({ error: "Asset not found" }); return; }
    res.json(version);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/production/:id/regenerate", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const { prompt } = req.body;
    if (!prompt) { res.status(400).json({ error: "prompt required for regeneration" }); return; }
    const actor = (req as any).session?.user?.email ?? "system";
    const result = await regenerateAssetVersion(id, prompt, actor);
    if (!result) { res.status(404).json({ error: "Asset not found" }); return; }
    res.json({ assetId: result.asset.id, asset: result.asset, generationResult: result.generationResult });
  } catch (err: any) {
    handleAIError(err, res);
  }
});

router.get("/production/:id/versions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const versions = await getVersionHistory(id);
    res.json({ assetId: id, versions, count: versions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/production/providers", async (_req, res) => {
  res.json(getAvailableProviders());
});

router.get("/production/route/:type", async (req, res) => {
  const route = routeCreativeRequest(req.params.type);
  res.json(route);
});

router.get("/production/brand-kit", async (_req, res) => {
  const kit = await getDefaultBrandKit();
  res.json(kit ?? { message: "No brand kit configured" });
});

router.get("/production/creative-providers", async (_req, res) => {
  res.json({
    providers: CREATIVE_PROVIDERS,
    total: CREATIVE_PROVIDERS.length,
    categories: [...new Set(CREATIVE_PROVIDERS.map(p => p.category))],
  });
});

router.get("/production/creative-providers/:id", async (req, res) => {
  const provider = getProviderById(req.params.id);
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }
  res.json(provider);
});

router.get("/production/creative-providers/category/:category", async (req, res) => {
  const providers = CREATIVE_PROVIDERS.filter(p => p.category === req.params.category && p.status === "active");
  res.json({ providers, total: providers.length });
});

router.get("/production/creative-providers/asset-type/:assetType", async (req, res) => {
  const providers = getProvidersForAssetType(req.params.assetType);
  res.json({ providers, total: providers.length });
});

router.post("/production/creative-route", async (req, res) => {
  try {
    const { assetType, qualityPreference, speedPreference, budgetSensitive, specificProvider, needsAudio, needsEditing } = req.body;
    if (!assetType) { res.status(400).json({ error: "assetType required" }); return; }
    const qualityNorm: Record<string, string> = { premium: "studio", professional: "professional", standard: "standard", draft: "draft", studio: "studio" };
    const speedNorm: Record<string, string> = { instant: "realtime", fast: "fast", medium: "standard", slow: "slow", realtime: "realtime", standard: "standard" };
    const recommendation = routeCreativeTask(assetType, {
      qualityPreference: (qualityNorm[qualityPreference] ?? qualityPreference) as any,
      speedPreference: (speedNorm[speedPreference] ?? speedPreference) as any,
      budgetSensitive, specificProvider, needsAudio, needsEditing,
    });
    res.json({
      primary: { id: recommendation.primary.id, name: recommendation.primary.name, icon: recommendation.primary.icon, category: recommendation.primary.category, qualityTier: recommendation.primary.qualityTier, speedTier: recommendation.primary.speedTier, costPerCredit: recommendation.primary.costPerCredit, description: recommendation.primary.description },
      alternatives: recommendation.alternatives.map(a => ({ id: a.id, name: a.name, icon: a.icon, category: a.category, qualityTier: a.qualityTier, costPerCredit: a.costPerCredit })),
      reason: recommendation.reason,
      estimatedCredits: recommendation.estimatedCredits,
      estimatedTime: recommendation.estimatedTime,
      pipeline: recommendation.pipeline.map(s => ({ step: s.step, providerId: s.provider.id, providerName: s.provider.name, providerIcon: s.provider.icon, action: s.action, outputType: s.outputType })),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/production/ai-route", async (req, res) => {
  try {
    const { assetType, prompt, brandContext } = req.body;
    if (!assetType || !prompt) { res.status(400).json({ error: "assetType and prompt required" }); return; }
    const recommendation = await getAIRoutingRecommendation(assetType, prompt, brandContext);
    const provider = getProviderById(recommendation.providerId);
    res.json({ ...recommendation, provider: provider ? { id: provider.id, name: provider.name, icon: provider.icon, category: provider.category, qualityTier: provider.qualityTier, description: provider.description } : null });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/production/:id/archive", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const actor = (req as any).session?.user?.email ?? "system";
    const result = await archiveAsset(id, actor);
    if (!result) { res.status(404).json({ error: "Asset not found" }); return; }
    res.json({ success: true, asset: result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/production/archive", async (_req, res) => {
  try {
    const archived = await getArchivedAssets();
    res.json({ assets: archived, total: archived.length });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/production/:id/restore", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid asset ID" }); return; }
    const actor = (req as any).session?.user?.email ?? "system";
    const result = await restoreAsset(id, actor);
    if (!result) { res.status(404).json({ error: "Asset not found" }); return; }
    res.json({ success: true, asset: result });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/invoice/transition", async (req, res) => {
  try {
    const { invoiceId, targetStatus, actor, notes } = req.body;
    if (!invoiceId || !targetStatus || !actor) {
      res.status(400).json({ error: "invoiceId, targetStatus, and actor are required" }); return;
    }
    const result = await transitionInvoice({ invoiceId, targetStatus, actor, notes });
    if (!result.success) { res.status(422).json({ error: result.error }); return; }
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/invoice/record-payment", async (req, res) => {
  try {
    const { invoiceId, amount, method, reference, notes, actor } = req.body;
    if (!invoiceId || !amount || !actor) {
      res.status(400).json({ error: "invoiceId, amount, and actor are required" }); return;
    }
    const result = await recordPayment({ invoiceId, amount, method, reference, notes, actor });
    if (!result.success) { res.status(422).json({ error: result.error }); return; }
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/invoice/check-overdue", async (req, res) => {
  try {
    const result = await checkOverdueInvoices(req.body.actor);
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/expense/submit", async (req, res) => {
  try {
    const { expenseId, actor } = req.body;
    if (!expenseId || !actor) {
      res.status(400).json({ error: "expenseId and actor are required" }); return;
    }
    const result = await submitExpense({ expenseId, actor });
    if (!result.success) { res.status(422).json({ error: result.error }); return; }
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/expense/review", async (req, res) => {
  try {
    const { expenseId, decision, reviewer, notes, rejectionReason } = req.body;
    if (!expenseId || !decision || !reviewer) {
      res.status(400).json({ error: "expenseId, decision (approved|rejected), and reviewer are required" }); return;
    }
    if (!["approved", "rejected"].includes(decision)) {
      res.status(400).json({ error: 'decision must be "approved" or "rejected"' }); return;
    }
    const result = await reviewExpense({ expenseId, decision, reviewer, notes, rejectionReason });
    if (!result.success) { res.status(422).json({ error: result.error }); return; }
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/contract/review", async (req, res) => {
  try {
    const { contractId } = req.body;
    if (!contractId) { res.status(400).json({ error: "contractId is required" }); return; }
    const result = await reviewContract(contractId);
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/contract/generate", async (req, res) => {
  try {
    const { type, companyName, companyId, serviceDescription, term, value, actor } = req.body;
    if (!type) { res.status(400).json({ error: "type is required" }); return; }
    const result = await generateContractFromTemplate({ type, companyName, companyId, serviceDescription, term, value, actor });
    res.status(201).json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/quality/check", async (req, res) => {
  try {
    const { entity, entityType, entityId, domain, actor, createIssuesOnFailure } = req.body;
    if (!entity || !entityType || !entityId || !domain) {
      res.status(400).json({ error: "entity, entityType, entityId, and domain are required" }); return;
    }
    const result = await enforceQualityCheckpoints({ entity, entityType, entityId, domain, actor, createIssuesOnFailure });
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.get("/quality/checkpoints/:entityType", async (req, res) => {
  const { entityType } = req.params;
  const domain = req.query.domain as string | undefined;
  res.json(getQualityCheckpointsForType(entityType, domain).map(cp => ({
    domain: cp.domain, entityType: cp.entityType, checkType: cp.checkType, description: cp.description, severity: cp.severity,
  })));
});

router.post("/sop/check", async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) { res.status(400).json({ error: "action is required" }); return; }
    const result = await checkSOPCompliance(action);
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

router.post("/sop/audit", async (req, res) => {
  try {
    const { action, entityType, entityContext } = req.body;
    if (!action || !entityType || !entityContext) {
      res.status(400).json({ error: "action, entityType, and entityContext are required" }); return;
    }
    const result = await aiAuditSOPCompliance({ action, entityType, entityContext });
    res.json(result);
  } catch (err: any) { handleAIError(err, res); }
});

export default router;
