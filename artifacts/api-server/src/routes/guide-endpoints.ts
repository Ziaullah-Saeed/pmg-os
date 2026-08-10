import { Router } from "express";
import { db, leadsTable, campaignsTable, tasksTable, activitiesTable, invoicesTable, contractsTable, documentsTable, companiesTable } from "@workspace/db";
import { callAI } from "../services/ai-service";
import { count, sum, eq, desc, sql } from "drizzle-orm";

const router = Router();

function handleErr(err: any, res: any): void {
  if (err.message?.startsWith("AI_BLOCKED")) { res.status(403).json({ error: err.message, requiresHuman: true }); return; }
  if (err.message?.startsWith("WALLET_INSUFFICIENT")) { res.status(402).json({ error: err.message }); return; }
  if (err.message?.startsWith("AI_CALL_FAILED")) { res.status(503).json({ error: err.message }); return; }
  res.status(500).json({ error: err.message, status: "failed" });
}

async function logActivity(type: string, actor: string, target: string, details: any) {
  try {
    await db.insert(activitiesTable).values({
      action: type,
      description: `${actor} → ${target}`,
      entityType: target,
      entityId: 0,
      performedBy: actor,
      metadata: JSON.stringify({ actor, target, ...details }),
    });
  } catch {}
}

// NOTE: `POST /outreach/find-prospects` (LLM "prospecting") was removed in the
// Apollo migration — real lead-gen is `POST /apollo/search` + `/apollo/import`.
// Presenting LLM-invented companies as prospects was the hallucinated-integration
// anti-pattern this integration exists to kill.

router.post("/outreach/monitor-channels", async (req, res) => {
  try {
    const { channels } = req.body;
    const channelList = channels || ["linkedin", "facebook", "instagram", "email"];
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a unified inbox AI for PMG Group LLC. Monitor channels and classify incoming messages. For each message classify as: Hot Lead (buyer ready), Warm Inquiry (interested), Cold Question (just asking), or Spam. Return structured JSON.`,
      userPrompt: `Monitor these channels for incoming messages: ${channelList.join(", ")}. For each, extract: sender name, company, message intent, urgency level, recommended response time.`,
      workflowKey: "channel_monitoring",
      tool: "ai-monitor-channels",
      domain: "outreach",
      action: "monitor_channels",
    });
    res.json({ status: "success", section: "outreach", agent: "social-command-center", unifiedInbox: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/outreach/plan-approach", async (req, res) => {
  try {
    const { prospectName, companyName, industryContext, painPoints } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are an outreach strategist for PMG Group LLC. Create multi-touch outreach strategies for cybersecurity/IT prospects. Include: best channels, contact sequence over 2 weeks, trigger points, decision-making map, objection handling, competitive positioning. Be specific and actionable.`,
      userPrompt: `Analyze prospect: ${prospectName} at ${companyName}. Industry: ${industryContext || "Cybersecurity"}. Pain: ${painPoints || "Not enough qualified leads"}. Create a multi-touch outreach strategy.`,
      workflowKey: "outreach_strategy",
      tool: "ai-plan-approach",
      domain: "outreach",
      action: "plan_approach",
    });
    await logActivity("strategy_plan", "system", companyName || "prospect", { strategy: "generated" });
    res.json({ status: "success", section: "outreach", agent: "outreach-strategist", strategy: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/outreach/compose-message", async (req, res) => {
  try {
    const { channel, prospectName, companyName, painPoints, solution } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a message composer for PMG Group LLC. Write personalized outreach messages. Rules: No templates, reference specific company details, keep short and scannable, clear CTA. Sound human, not corporate. Never use: leverage, synergy, cutting-edge, game-changing. Use cybersecurity terminology: NIST, SOC 2, SIEM, EDR, MDR, XDR where relevant.`,
      userPrompt: `Write a personalized ${channel || "linkedin"} message to ${prospectName} at ${companyName}. Their pain: ${painPoints || "low lead volume"}. Solution: ${solution || "We generate 20 qualified leads monthly"}.`,
      workflowKey: "outreach_messaging",
      tool: "ai-compose-message",
      domain: "outreach",
      action: "compose_message",
    });
    await logActivity("message_composed", "system", companyName || "prospect", { channel });
    res.json({ status: "success", section: "outreach", agent: "message-composer", channel: channel || "linkedin", message: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/outreach/schedule-followup", async (req, res) => {
  try {
    const { prospectId, lastContactDate, channel, nextStep } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a follow-up scheduling AI for PMG Group LLC. Generate optimal follow-up timing and strategy. Consider channel norms, previous contact context, and escalation paths. Return: days to wait, follow-up message, escalation path.`,
      userPrompt: `Prospect ${prospectId} was last contacted via ${channel || "email"} on ${lastContactDate || new Date().toISOString()}. Next step: ${nextStep || "wait for response"}. Generate optimal follow-up timing and strategy.`,
      workflowKey: "outreach_followup",
      tool: "ai-schedule-followup",
      domain: "outreach",
      action: "schedule_followup",
    });
    res.json({ status: "success", section: "outreach", agent: "follow-up-engine", followup: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/outreach/analytics", async (req, res) => {
  try {
    const { timeframe } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are an outreach analytics AI for PMG Group LLC. Analyze outreach performance and provide actionable insights. Include: open rates per channel, response rates, reply quality, message effectiveness, best send times, top messages, cost per qualified reply, recommendations.`,
      userPrompt: `Analyze outreach performance for ${timeframe || "weekly"} timeframe. Provide metrics, trends, and recommendations to improve.`,
      workflowKey: "outreach_analytics",
      tool: "ai-outreach-analytics",
      domain: "outreach",
      action: "outreach_analytics",
    });
    await logActivity("analytics_generated", "system", "outreach", { timeframe });
    res.json({ status: "success", section: "outreach", agent: "outreach-analytics", analytics: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/crm/qualify-lead", async (req, res) => {
  try {
    const { leadData, companyName, problemStatement } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a lead qualification AI for PMG Group LLC. Score leads 0-100 based on: Company Fit (30%), Marketing Need (25%), Budget (20%), Timing (15%), Authority (10%). Return EXACTLY: SCORE: [0-100], CATEGORY: [Hot Prospect 80+|Qualified Lead 60-79|Nurture 40-59|Not Qualified <40], REASONING: [explanation], NEXT_ACTION: [recommended action].`,
      userPrompt: `Score this lead: ${companyName || "Unknown Company"}. Problem: ${problemStatement || "Not enough qualified leads"}. Additional data: ${JSON.stringify(leadData || {})}`,
      workflowKey: "lead_scoring",
      tool: "ai-qualify-lead",
      domain: "crm",
      action: "qualify_lead",
    });
    await logActivity("lead_qualified", "system", companyName || "lead", { result: "scored" });
    res.json({ status: "success", section: "crm", agent: "lead-qualification", qualification: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/crm/manage-deal", async (req, res) => {
  try {
    const { dealId, companyName, dealValue, interactions } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a deal intelligence AI for PMG Group LLC. Analyze deals and provide: pipeline stage (Discovery, Demo, Proposal, Negotiation, Closing), deal health (Green=on track, Yellow=at risk, Red=dying), probability to close, risk factors, next action, timeline to close.`,
      userPrompt: `Analyze deal with ${companyName || "Unknown"} (value: $${dealValue || 0}). Past interactions: ${(interactions || []).join(", ") || "none"}. Determine stage, health, probability, risks, and next action.`,
      workflowKey: "deal_management",
      tool: "ai-manage-deal",
      domain: "crm",
      action: "manage_deal",
    });
    res.json({ status: "success", section: "crm", agent: "deal-intelligence", deal: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/crm/prepare-call", async (req, res) => {
  try {
    const { prospectName, companyName, callObjective, priorContext } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a call preparation AI for PMG Group LLC. Prepare call briefings with: 1) Opening statement (30 seconds), 2) Top 3 discovery questions, 3) Likely objections and responses, 4) Buying signals to listen for, 5) Red flags, 6) Closing approach, 7) Follow-up plan if they say no.`,
      userPrompt: `Prepare call briefing for ${prospectName} at ${companyName}. Objective: ${callObjective || "discovery"}. Prior context: ${priorContext || "first conversation"}.`,
      workflowKey: "call_preparation",
      tool: "ai-prepare-call",
      domain: "crm",
      action: "prepare_call",
    });
    res.json({ status: "success", section: "crm", agent: "call-intelligence", briefing: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/crm/create-proposal", async (req, res) => {
  try {
    const { prospectName, companyName, discoveryFindings, budget } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a proposal writer for PMG Group LLC. Create customized proposals with: 1) Executive Summary, 2) Proposed Solution (3 tiers), 3) Timeline (Month 1: audit + 20 leads), 4) Pricing (Starter $2,500/Growth $5,000/Enterprise $10,000), 5) Case studies, 6) ROI projection, 7) Terms & next steps. Use cybersecurity terminology.`,
      userPrompt: `Create proposal for ${companyName}. Challenge: ${discoveryFindings || "Not enough qualified leads"}. Budget: $${budget || 5000}/month. Prospect: ${prospectName}.`,
      workflowKey: "proposal_creation",
      tool: "ai-create-proposal",
      domain: "crm",
      action: "create_proposal",
    });
    res.json({ status: "success", section: "crm", agent: "proposal-contract", proposal: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/crm/sync-ghl", async (req, res) => {
  try {
    const { leadId, companyName, contactEmail, dealValue, platform } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a CRM sync AI for PMG Group LLC. Prepare lead data for syncing to external CRM platforms. Map fields correctly and apply transformation rules. Return: sync format, field mappings, transformation rules.`,
      userPrompt: `Prepare sync for ${platform || "ghl"}: ${companyName}, ${contactEmail}, Deal Value: $${dealValue || 0}. Lead ID: ${leadId}. Map fields and return sync format.`,
      workflowKey: "crm_sync",
      tool: "ai-sync-crm",
      domain: "crm",
      action: "sync_crm",
    });
    res.json({ status: "success", section: "crm", agent: "crm-sync", platform: platform || "ghl", syncResult: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/crm/coaching", async (req, res) => {
  try {
    const { companyName, dealValue, serviceType, stage } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a live-call coaching AI for PMG Group LLC, a cybersecurity/IT marketing agency. Generate 3 objection-handling coaching cards tailored to the specific deal. Return ONLY a JSON array of exactly 3 objects, each: {"trigger": "the exact objection/question a prospect might raise (in quotes)", "response": "a concise, persuasive rep response", "category": "Objection"|"Competitive"|"Trust"|"Stall"|"Discovery"}. Use cybersecurity terminology (NIST, SOC 2, SIEM, EDR) naturally. Return ONLY the JSON array, no prose.`,
      userPrompt: `Deal: ${companyName || "Unknown company"} (value: $${dealValue || 0}, service: ${serviceType || "cybersecurity marketing"}, stage: ${stage || "discovery"}). Generate 3 custom coaching cards for this specific deal.`,
      workflowKey: "call_preparation",
      tool: "ai-prepare-call",
      domain: "crm",
      action: "coaching_cards",
    });
    let cards: Array<{ trigger: string; response: string; category: string }> = [];
    try {
      const match = result.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(match ? match[0] : result);
      if (Array.isArray(parsed)) {
        cards = parsed
          .filter((c: any) => c && (c.trigger || c.response))
          .map((c: any) => ({ trigger: String(c.trigger ?? ""), response: String(c.response ?? ""), category: String(c.category ?? "Objection") }));
      }
    } catch { /* leave cards empty; frontend surfaces raw text fallback */ }
    res.json({ status: "success", section: "crm", agent: "call-intelligence", cards, raw: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/marketing/create-content", async (req, res) => {
  try {
    const { type, description, tone, wordCount } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a content strategist for PMG Group (cybersecurity/IT marketing agency). Create content that sounds human-written with zero AI fluff. Never use: leverage, synergy, cutting-edge, game-changing. Be specific to cybersecurity/IT sector, data-driven, engaging, share-worthy. Use terms like NIST, SOC 2, SIEM, EDR, MDR, XDR naturally.`,
      userPrompt: `Create a ${type || "social_post"} about: ${description}. Tone: ${tone || "professional"}. Length: ~${wordCount || 500} words.`,
      workflowKey: "content_creation",
      tool: "ai-create-content",
      domain: "marketing",
      action: "create_content",
    });
    await logActivity("content_created", "system", type || "content", { description });
    res.json({ status: "success", section: "marketing", agent: "content-strategist", type: type || "social_post", content: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/marketing/create-ad", async (req, res) => {
  try {
    const { platform, audience, objective, briefing } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are an advertising copywriter for PMG Group. Create high-converting ad copy for cybersecurity/IT audience. Return: Headline (max 30 chars), Body copy (150-200 words), Primary CTA button text, Landing page headline. Speak to pain points, clear value proposition.`,
      userPrompt: `Create ${platform || "linkedin"} ad copy for ${audience || "CISOs and IT Directors"}. Objective: ${objective || "lead_gen"}. Briefing: ${briefing || "PMG Group lead generation service - 20 deals in 30 days"}.`,
      workflowKey: "ad_creation",
      tool: "ai-create-ad",
      domain: "marketing",
      action: "create_ad",
    });
    res.json({ status: "success", section: "marketing", agent: "advertising", platform: platform || "linkedin", ad: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/marketing/seo-audit", async (req, res) => {
  try {
    const { websiteUrl, competitors } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are an SEO expert for PMG Group. Perform comprehensive SEO audits analyzing: keyword gaps, on-page issues (title tags, meta, headers), technical SEO (mobile, speed, core web vitals), content gaps, backlink profile. Provide prioritized action plan with ROI estimates.`,
      userPrompt: `SEO audit for: ${websiteUrl || "client website"}. Competitors: ${(competitors || []).join(", ") || "to be determined"}. Analyze and provide prioritized recommendations.`,
      workflowKey: "seo_audit",
      tool: "ai-seo-audit",
      domain: "marketing",
      action: "seo_audit",
    });
    await logActivity("seo_audit_generated", "system", "marketing", { url: websiteUrl });
    res.json({ status: "success", section: "marketing", agent: "seo-growth", url: websiteUrl, audit: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/marketing/orchestrate-campaign", async (req, res) => {
  try {
    const { campaignName, channels, goals, timeline } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a campaign orchestrator for PMG Group. Plan multi-channel campaigns with: week-by-week breakdown, content calendar, A/B test plan, budget allocation per channel, success metrics, tracking setup. Focus on lead generation for cybersecurity/IT companies.`,
      userPrompt: `Plan campaign: "${campaignName || "Q1 Lead Gen"}". Channels: ${(channels || ["linkedin", "email", "ads"]).join(", ")}. Goals: ${goals || "Generate 20 qualified leads"}. Timeline: ${timeline || "4 weeks"}.`,
      workflowKey: "campaign_orchestration",
      tool: "ai-orchestrate-campaign",
      domain: "marketing",
      action: "orchestrate_campaign",
    });
    res.json({ status: "success", section: "marketing", agent: "campaign-orchestrator", campaignName, campaign: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/marketing/competitor-intel", async (req, res) => {
  try {
    const { competitors } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a competitive intelligence AI for PMG Group. Track competitors' content strategy, ad spend, messaging, pricing, testimonials, USPs. Identify gaps PMG can exploit, weaknesses, market opportunities. Create battle cards for sales team.`,
      userPrompt: `Competitive intelligence on: ${(competitors || []).join(", ") || "top cybersecurity marketing agencies"}. Provide detailed analysis and battle cards.`,
      workflowKey: "competitor_intel",
      tool: "ai-competitor-intel",
      domain: "marketing",
      action: "competitor_intel",
    });
    await logActivity("competitor_intel", "system", "marketing", { competitors });
    res.json({ status: "success", section: "marketing", agent: "competitor-intelligence", intelligence: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/onboard-client", async (req, res) => {
  try {
    const { clientName, companyName } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a client onboarding AI for PMG Group LLC. Create comprehensive onboarding checklists: brand assets collection, access setup, target audience deep dive, SLAs, success metrics, 90-day roadmap with milestones.`,
      userPrompt: `Create onboarding checklist for ${clientName} at ${companyName}. Include brand assets, access setup, audience research, SLAs, metrics, and 90-day roadmap.`,
      workflowKey: "client_onboarding",
      tool: "ai-onboard-client",
      domain: "production",
      action: "onboard_client",
    });
    res.json({ status: "success", section: "production", agent: "client-onboarding", onboarding: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/audit-client", async (req, res) => {
  try {
    const { clientId, clientName, websiteUrl } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a marketing audit AI for PMG Group LLC. Deep-analyze: website (SEO, UX, conversion), social media, ads (spend, targeting), email marketing, CAC, sales process. CRITICAL: Identify EXACT reason why they're not getting enough clients. Provide prioritized fix-it plan with timeline & ROI.`,
      userPrompt: `Deep marketing audit for ${clientName}. Website: ${websiteUrl || "N/A"}. Analyze all channels and identify why they're not getting enough qualified leads.`,
      workflowKey: "client_audit",
      tool: "ai-audit-client",
      domain: "production",
      action: "audit_client",
      entityType: "client",
      entityId: clientId || 0,
    });
    res.json({ status: "success", section: "production", agent: "client-marketing-analyst", clientId, audit: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/create-image", async (req, res) => {
  try {
    const { type, description, brandColors } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a creative production AI for PMG Group LLC. Generate detailed DALL-E prompts for professional marketing assets. Include: composition, lighting, style, color emphasis, dimensions. 150-200 word prompts. Cinematic quality, zero AI aesthetic, high contrast.`,
      userPrompt: `Generate DALL-E prompt for ${type || "social_graphic"}. Description: ${description || "cybersecurity marketing visual"}. Brand colors: ${brandColors || "#001a4d #8B0000 #FFD700"}.`,
      workflowKey: "creative_production",
      tool: "ai-create-image-prompt",
      domain: "production",
      action: "create_image_prompt",
    });
    res.json({ status: "success", section: "production", agent: "creative-production-image", imagePrompt: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/create-video", async (req, res) => {
  try {
    const { type, description, duration } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a video production AI for PMG Group LLC. Generate Runway ML video scripts with: scene-by-scene breakdown with timing, visuals, text overlays, pacing notes, sound cues, transitions. Cinematic, professional, engaging. First 3 seconds critical for attention.`,
      userPrompt: `Generate video script for ${type || "social_clip"}. Description: ${description || "product demo"}. Duration: ${duration || 30} seconds. Scene-by-scene breakdown.`,
      workflowKey: "creative_production",
      tool: "ai-create-video-script",
      domain: "production",
      action: "create_video_script",
    });
    res.json({ status: "success", section: "production", agent: "creative-production-video", videoScript: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/create-document", async (req, res) => {
  try {
    const { docType, title, content } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a document production AI for PMG Group LLC. Create professional business documents with: compelling narrative, clear structure, section headers, short paragraphs, strong opening & closing, data-driven recommendations. Return markdown format.`,
      userPrompt: `Create professional ${docType || "proposal"} titled "${title || "Marketing Proposal"}". Content brief: ${content || "Comprehensive lead generation proposal"}.`,
      workflowKey: "document_production",
      tool: "ai-create-document",
      domain: "production",
      action: "create_document",
    });
    res.json({ status: "success", section: "production", agent: "creative-production-document", document: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/generate-leads", async (req, res) => {
  try {
    const { clientId, clientName, targetMarket, industryFocus } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a lead generation AI for PMG Group LLC. Generate 20 ready-to-close leads. For EACH lead provide: Company name, Industry, Size, Decision maker (name + title), Contact info, Primary pain point, Why they'd buy, Readiness score (80+ only), Suggested first outreach. All leads must be highly qualified.`,
      userPrompt: `Generate 20 qualified leads for ${clientName || "PMG Group"}. Market: ${targetMarket || "Enterprise Cybersecurity"}. Industries: ${industryFocus || "Tech, Finance, Healthcare"}.`,
      workflowKey: "lead_generation",
      tool: "ai-generate-leads",
      domain: "production",
      action: "generate_leads",
      entityType: "client",
      entityId: clientId || 0,
    });
    await logActivity("leads_generated", "system", clientName || "client", { count: 20 });
    res.json({ status: "success", section: "production", agent: "client-lead-generator", clientId, leads: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/build-campaign", async (req, res) => {
  try {
    const { clientId, campaignType, targetAudience, marketingGap } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a campaign builder for PMG Group LLC. Build complete campaigns with: landing page copy (headline, sub-headline, benefits, CTA), ad copy variations (3 angles), email nurture sequence (5 emails), funnel stages (awareness → interest → decision), CTAs per stage, follow-up sequences. Everything ready to launch.`,
      userPrompt: `Build ${campaignType || "lead_gen"} campaign for audience: ${targetAudience || "CISOs and IT Directors"}. Their gap: ${marketingGap || "not generating enough leads"}.`,
      workflowKey: "campaign_building",
      tool: "ai-build-campaign",
      domain: "production",
      action: "build_campaign",
      entityType: "client",
      entityId: clientId || 0,
    });
    res.json({ status: "success", section: "production", agent: "client-campaign-funnel", clientId, campaign: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/production/generate-report", async (req, res) => {
  try {
    const { clientId, reportType, timeframe } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a reporting AI for PMG Group LLC. Generate client-facing reports with: executive summary, leads generated (count + quality), meetings scheduled, pipeline value, results vs "20 ready-to-close deals" promise, ROI calculation, top channels, next-month recommendations, success stories. Professional, data-driven.`,
      userPrompt: `Generate ${reportType || "monthly"} report for ${timeframe || "last 30 days"}. Include metrics, ROI, and recommendations.`,
      workflowKey: "client_reporting",
      tool: "ai-generate-client-report",
      domain: "production",
      action: "generate_client_report",
      entityType: "client",
      entityId: clientId || 0,
    });
    res.json({ status: "success", section: "production", agent: "client-report", clientId, report: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/admin/assign-tasks", async (req, res) => {
  try {
    const { teamMembers } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are an operations manager AI for PMG Group LLC. Generate daily action plans with: task assignments by skill/workload, priorities (critical/high/medium/low), deadlines, daily standup talking points, capacity forecasting for next week.`,
      userPrompt: `Generate daily action plan. Team: ${(teamMembers || ["Shershah"]).join(", ")}. Create task assignments, priorities, deadlines, and capacity forecast.`,
      workflowKey: "task_management",
      tool: "ai-assign-tasks",
      domain: "admin",
      action: "assign_tasks",
    });
    res.json({ status: "success", section: "admin", agent: "operations-manager", tasks: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/admin/manage-knowledge", async (req, res) => {
  try {
    const { documentType, topic } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a knowledge management AI for PMG Group LLC. Create comprehensive documents: overview, prerequisites, step-by-step instructions, common mistakes, troubleshooting, tips & best practices. Make it searchable and actionable.`,
      userPrompt: `Create ${documentType || "sop"} for: ${topic || "Standard Operating Procedure"}. Comprehensive, step-by-step, actionable.`,
      workflowKey: "knowledge_management",
      tool: "ai-manage-knowledge",
      domain: "admin",
      action: "manage_knowledge",
    });
    res.json({ status: "success", section: "admin", agent: "knowledge-document", document: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/admin/executive-briefing", async (req, res) => {
  try {
    const [leadsCount] = await db.select({ count: count() }).from(leadsTable);
    const [campaignsCount] = await db.select({ count: count() }).from(campaignsTable);
    const [tasksCount] = await db.select({ count: count() }).from(tasksTable);

    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are an executive briefing AI for PMG Group LLC. Generate morning briefings with: overnight summary, urgent items, today's top 3 priorities, pipeline health, team performance, risk alerts, daily metrics, market news affecting cybersecurity/IT marketing.`,
      userPrompt: `Generate executive morning briefing. Current stats: ${leadsCount.count} leads, ${campaignsCount.count} campaigns, ${tasksCount.count} tasks. Include urgent items, priorities, and risk alerts.`,
      workflowKey: "executive_briefing",
      tool: "ai-executive-briefing",
      domain: "admin",
      action: "executive_briefing",
    });
    await logActivity("briefing_generated", "system", "daily", { timestamp: new Date().toISOString() });
    res.json({ status: "success", section: "admin", agent: "executive-briefing", briefing: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/admin/system-evolution", async (req, res) => {
  try {
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a system evolution AI for PMG Group LLC. Perform weekly market scans reporting: new AI tools for marketing/sales, new social platforms, marketing tech updates, API changes, competitive moves, emerging trends. For each: What's new, Cost/Benefit, Implementation effort (hours), Recommendation (Adopt/Monitor/Skip), Expected ROI.`,
      userPrompt: `Weekly market scan. Report on new tools, platforms, tech updates, and trends relevant to cybersecurity/IT marketing. Include cost/benefit analysis and recommendations.`,
      workflowKey: "system_evolution",
      tool: "ai-system-evolution",
      domain: "admin",
      action: "system_evolution",
    });
    res.json({ status: "success", section: "admin", agent: "system-evolution", report: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/finance/create-invoice", async (req, res) => {
  try {
    const { clientId, clientName, amount, services, dueDate } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a billing AI for PMG Group LLC. Generate professional invoices with: client details, line items with descriptions, subtotal, tax, total, payment terms, due date, payment instructions. Professional formatting.`,
      userPrompt: `Generate invoice for ${clientName || "Client"}. Amount: $${amount || 5000}. Services: ${(services || ["Lead Generation", "Campaign Management"]).join(", ")}. Due: ${dueDate || "30 days"}.`,
      workflowKey: "billing",
      tool: "ai-create-invoice",
      domain: "finance",
      action: "create_invoice",
    });
    res.json({ status: "success", section: "finance", agent: "billing-revenue", invoice: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/finance/manage-contracts", async (req, res) => {
  try {
    const { clientId, clientName, serviceType, duration, monthlyValue } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a contract management AI for PMG Group LLC. Draft service agreements with: scope of work, deliverables, timeline, pricing, SLAs, termination clause, renewal terms, IP ownership, confidentiality, liability limits.`,
      userPrompt: `Draft service agreement for ${clientName || "Client"}. Service: ${serviceType || "Lead Generation"}, Duration: ${duration || "monthly"}, Value: $${monthlyValue || 5000}/month.`,
      workflowKey: "contract_management",
      tool: "ai-manage-contracts",
      domain: "finance",
      action: "manage_contracts",
    });
    res.json({ status: "success", section: "finance", agent: "contract-expense", contract: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/legal/check-compliance", async (req, res) => {
  try {
    const { contentType, content, channel } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a legal compliance AI for PMG Group LLC. Check content compliance: CAN-SPAM (header, unsubscribe, physical address), GDPR (consent, data handling), TCPA (SMS/phone rules), platform ad policies. Return: compliant status, issues found, specific fixes, risk level.`,
      userPrompt: `Check ${contentType || "email"} compliance for ${channel || "email"} channel. Content: "${content || "Marketing message"}". Verify all applicable regulations.`,
      workflowKey: "compliance_check",
      tool: "ai-check-compliance",
      domain: "legal",
      action: "check_compliance",
    });
    await logActivity("compliance_check", "system", contentType || "content", { channel, status: "checked" });
    res.json({ status: "success", section: "legal", agent: "legal-compliance", compliance: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/video/get-guide", async (req, res) => {
  try {
    const { section } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a user guide AI for PMG Group OS. Create interactive guides with: section overview, feature explanations, button-by-button walkthrough, use cases, tips & tricks, common mistakes. Clear hierarchy, short paragraphs, action-oriented.`,
      userPrompt: `Create interactive guide for the ${section || "marketing"} section of PMG OS. Include overview, features, walkthrough, use cases, and tips.`,
      workflowKey: "video_guide",
      tool: "ai-video-guide",
      domain: "system",
      action: "get_guide",
    });
    res.json({ status: "success", section: "general", agent: "video-guide", guide: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/integrations/linkedin/sync", async (req, res) => {
  try {
    const { prospectId, linkedinUrl } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a LinkedIn integration AI for PMG Group LLC. Extract and structure prospect data from LinkedIn profiles. Return: name, title, company, skills, endorsements, connections count.`,
      userPrompt: `Extract prospect data from LinkedIn: ${linkedinUrl || "N/A"}. Prospect ID: ${prospectId}. Structure the data for CRM import.`,
      workflowKey: "linkedin_sync",
      tool: "ai-linkedin-sync",
      domain: "integrations",
      action: "linkedin_sync",
    });
    res.json({ status: "success", section: "integrations", agent: "linkedin-sync", sync: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/integrations/ghl/sync", async (req, res) => {
  try {
    const { leadId, ghlApiKey } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a GoHighLevel integration AI for PMG Group LLC. Prepare lead data for GHL sync. Map fields to GHL contact and deal format. Return: GHL contact format, deal format, field mappings.`,
      userPrompt: `Prepare lead ${leadId} for GoHighLevel sync. Map CRM fields to GHL format and return sync-ready data.`,
      workflowKey: "ghl_sync",
      tool: "ai-ghl-sync",
      domain: "integrations",
      action: "ghl_sync",
    });
    res.json({ status: "success", section: "integrations", agent: "ghl-sync", ghl_sync: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/integrations/google-ads/sync", async (req, res) => {
  try {
    const { campaignId } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a Google Ads integration AI for PMG Group LLC. Prepare campaign data for Google Ads API. Structure: campaign settings, ad groups, keywords, ad copy, bidding strategy, targeting.`,
      userPrompt: `Prepare campaign ${campaignId || "new"} for Google Ads sync. Return API-ready campaign structure.`,
      workflowKey: "google_ads_sync",
      tool: "ai-google-ads-sync",
      domain: "integrations",
      action: "google_ads_sync",
    });
    res.json({ status: "success", section: "integrations", agent: "google-ads-sync", google_ads_sync: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.post("/integrations/stripe/create-payment", async (req, res) => {
  try {
    const { invoiceId, amount, clientName } = req.body;
    const { result, confidence, runId } = await callAI({
      systemPrompt: `You are a payment processing AI for PMG Group LLC. Prepare Stripe payment intent data. Return: payment amount, description, metadata, client instructions, payment link format.`,
      userPrompt: `Create Stripe payment for invoice ${invoiceId || "new"}. Amount: $${amount || 5000}. Client: ${clientName || "Client"}. Return payment intent structure.`,
      workflowKey: "stripe_payment",
      tool: "ai-stripe-payment",
      domain: "finance",
      action: "stripe_payment",
    });
    res.json({ status: "success", section: "finance", agent: "stripe-payment", payment: result, confidence, runId });
  } catch (err: any) { handleErr(err, res); }
});

router.get("/dashboard/stats", async (_req, res) => {
  try {
    const [leadsCount] = await db.select({ count: count() }).from(leadsTable);
    const [companiesCount] = await db.select({ count: count() }).from(companiesTable);
    const [campaignsCount] = await db.select({ count: count() }).from(campaignsTable);
    const [tasksCount] = await db.select({ count: count() }).from(tasksTable);
    res.json({
      status: "success",
      stats: {
        leads: leadsCount.count,
        companies: companiesCount.count,
        campaigns: campaignsCount.count,
        tasks: tasksCount.count,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard/recent-activities", async (_req, res) => {
  try {
    const activities = await db.select().from(activitiesTable).orderBy(desc(activitiesTable.createdAt)).limit(20);
    res.json({ status: "success", activities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
