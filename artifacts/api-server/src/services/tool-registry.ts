import { registerTool, registerChainTemplate } from "./tool-chain-service";
import { enrichLead, scoreLead, generateOutreachDraft, summarizeRecord, suggestNextAction } from "./ai-service";
import { generateICP, analyzeCompetitors, segmentMarket } from "./intelligence-service";
import { researchProspect, personalizeOutreach, draftStructuredOutreach, generateOutreachVariants } from "./outreach-pipeline-service";
import { processTranscript, analyzeCallSentiment, detectObjections, generateFollowUp } from "./communication-intelligence-service";
import { sendEmail, sendSMS } from "./messaging-service";
import { createBooking, getAvailableSlots } from "./booking-service";
import { generateAsset, aiReviewAsset, generateDesignBrief, suggestRevisions, submitForReview, reviewAsset, finalizeAsset, createAssetVersion, routeCreativeRequest, getDefaultBrandKit, type AssetType } from "./production-studio-service";
import {
  transitionInvoice, recordPayment, checkOverdueInvoices,
  submitExpense, reviewExpense,
  reviewContract, generateContractFromTemplate,
  enforceQualityCheckpoints, runQualityCheckpoints,
  checkSOPCompliance, aiAuditSOPCompliance,
} from "./finance-legal-service";
import { db, leadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function registerAllTools(): void {
  registerTool({
    name: "enrich_lead",
    description: "Enrich a lead with firmographic and cybersecurity data",
    domain: "crm",
    inputKeys: ["id", "name", "email", "company", "source"],
    outputKeys: ["enrichment", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await enrichLead({
        id: input.id ?? 0,
        name: input.name ?? "Unknown",
        email: input.email,
        company: input.company,
        source: input.source,
      });
      return { enrichment: result.enrichment, confidence: result.confidence, runId: result.runId };
    },
  });

  registerTool({
    name: "score_lead",
    description: "Score a lead 0-100 based on fit, budget, and urgency",
    domain: "crm",
    inputKeys: ["id", "name", "email", "company", "source", "enrichmentData"],
    outputKeys: ["score", "tier", "reasoning", "confidence"],
    costCredits: 3,
    execute: async (input) => {
      const result = await scoreLead({
        id: input.id ?? 0,
        name: input.name ?? "Unknown",
        email: input.email,
        company: input.company,
        source: input.source,
        enrichmentData: input.enrichmentData ?? input.enrichment,
      });
      return { score: result.score, tier: result.tier, reasoning: result.reasoning, confidence: result.confidence };
    },
  });

  registerTool({
    name: "route_lead",
    description: "Route a qualified lead to the appropriate channel",
    domain: "crm",
    inputKeys: ["id", "score", "tier"],
    outputKeys: ["routing", "channel"],
    costCredits: 1,
    execute: async (input) => {
      const score = input.score ?? 50;
      const tier = input.tier ?? "WARM";
      let channel = "internal_queue";
      let routing = "Standard follow-up";

      if (score >= 80 || tier === "HOT") {
        channel = "immediate_outreach";
        routing = "High priority — immediate outreach recommended";
      } else if (score >= 50) {
        channel = "nurture_sequence";
        routing = "Warm lead — enroll in nurture sequence";
      } else {
        channel = "monitor";
        routing = "Cold lead — monitor for future signals";
      }

      return { routing, channel, score, tier };
    },
  });

  registerTool({
    name: "draft_outreach",
    description: "Draft outreach message using personalization context",
    domain: "outreach",
    inputKeys: ["leadName", "company", "channel", "personalization", "research"],
    outputKeys: ["draft", "subject", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await draftStructuredOutreach({
        leadName: input.leadName ?? "Prospect",
        company: input.company,
        channel: input.channel ?? "email",
        personalization: input.personalization,
        research: input.research,
      });
      return { draft: result.draft, subject: result.subject, confidence: result.confidence };
    },
  });

  registerTool({
    name: "research_prospect",
    description: "Research a prospect and company for outreach angles",
    domain: "outreach",
    inputKeys: ["leadName", "company", "email", "industry"],
    outputKeys: ["research", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await researchProspect({
        leadName: input.leadName ?? input.name ?? "Unknown",
        company: input.company,
        email: input.email,
        industry: input.industry,
      });
      return { research: result.research, confidence: result.confidence };
    },
  });

  registerTool({
    name: "personalize_context",
    description: "Create personalization brief for outreach",
    domain: "outreach",
    inputKeys: ["leadName", "company", "channel", "research"],
    outputKeys: ["personalization", "confidence"],
    costCredits: 3,
    execute: async (input) => {
      const result = await personalizeOutreach({
        leadName: input.leadName ?? input.name ?? "Unknown",
        company: input.company,
        channel: input.channel ?? "email",
        research: input.research,
      });
      return { personalization: result.personalization, confidence: result.confidence };
    },
  });

  registerTool({
    name: "generate_variants",
    description: "Generate A/B variants of outreach draft",
    domain: "outreach",
    inputKeys: ["leadName", "company", "channel", "draft"],
    outputKeys: ["variants", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await generateOutreachVariants({
        leadName: input.leadName ?? "Prospect",
        company: input.company,
        channel: input.channel ?? "email",
        baseDraft: input.draft ?? "",
      });
      return { variants: result.variants, confidence: result.confidence };
    },
  });

  registerTool({
    name: "generate_icp",
    description: "Generate Ideal Customer Profile from deal/company data",
    domain: "intelligence",
    inputKeys: ["industry", "customContext", "dealAnalysis"],
    outputKeys: ["icp", "confidence"],
    costCredits: 8,
    execute: async (input) => {
      const result = await generateICP({
        industry: input.industry,
        customContext: input.customContext ?? input.dealAnalysis,
      });
      return { icp: result.icp, confidence: result.confidence };
    },
  });

  registerTool({
    name: "research_competitors",
    description: "Analyze competitive landscape",
    domain: "intelligence",
    inputKeys: ["competitors", "focusArea"],
    outputKeys: ["competitors", "analysis", "confidence"],
    costCredits: 8,
    execute: async (input) => {
      const result = await analyzeCompetitors({
        competitors: input.competitors,
        focusArea: input.focusArea,
      });
      return { analysis: result.analysis, competitors: result.analysis, confidence: result.confidence };
    },
  });

  registerTool({
    name: "segment_market",
    description: "Segment target market into actionable groups",
    domain: "intelligence",
    inputKeys: ["criteria", "icp"],
    outputKeys: ["segments", "confidence"],
    costCredits: 8,
    execute: async (input) => {
      const result = await segmentMarket({
        criteria: input.criteria,
        icp: input.icp,
      });
      return { segments: result.segments, confidence: result.confidence };
    },
  });

  registerTool({
    name: "analyze_won_deals",
    description: "Analyze won deals for ICP and pattern insights",
    domain: "intelligence",
    inputKeys: [],
    outputKeys: ["dealAnalysis"],
    costCredits: 3,
    execute: async () => {
      const result = await summarizeRecord({
        entityType: "pipeline",
        entityId: 0,
        data: { focus: "won deals analysis for ICP", domain: "crm" },
      });
      return { dealAnalysis: result.summary };
    },
  });

  registerTool({
    name: "map_positioning",
    description: "Map competitive positioning from research",
    domain: "intelligence",
    inputKeys: ["competitors"],
    outputKeys: ["positioning"],
    costCredits: 3,
    execute: async (input) => {
      const result = await summarizeRecord({
        entityType: "competitor",
        entityId: 0,
        data: { competitors: input.competitors, focus: "positioning map" },
      });
      return { positioning: result.summary };
    },
  });

  registerTool({
    name: "find_gaps",
    description: "Find positioning gaps and opportunities",
    domain: "intelligence",
    inputKeys: ["positioning"],
    outputKeys: ["gaps"],
    costCredits: 3,
    execute: async (input) => {
      const result = await suggestNextAction({
        entityType: "market",
        entityId: 0,
        currentStage: "gap_analysis",
        data: { positioning: input.positioning },
      });
      return { gaps: result.suggestion };
    },
  });

  registerTool({
    name: "summarize_record",
    description: "Summarize a business record",
    domain: "system",
    inputKeys: ["entityType", "entityId", "data"],
    outputKeys: ["summary", "confidence"],
    costCredits: 3,
    execute: async (input) => {
      const result = await summarizeRecord({
        entityType: input.entityType ?? "record",
        entityId: input.entityId ?? 0,
        data: input.data ?? input,
      });
      return { summary: result.summary, confidence: result.confidence };
    },
  });

  registerTool({
    name: "suggest_action",
    description: "Suggest next best action for an entity",
    domain: "crm",
    inputKeys: ["entityType", "entityId", "currentStage", "data"],
    outputKeys: ["suggestion", "confidence"],
    costCredits: 3,
    execute: async (input) => {
      const result = await suggestNextAction({
        entityType: input.entityType ?? "deal",
        entityId: input.entityId ?? 0,
        currentStage: input.currentStage ?? "active",
        data: input.data ?? input,
      });
      return { suggestion: result.suggestion, confidence: result.confidence };
    },
  });

  registerTool({
    name: "assess_risk",
    description: "Assess risk level for a deal or entity",
    domain: "crm",
    inputKeys: ["summary", "entityType", "entityId"],
    outputKeys: ["riskAssessment", "confidence"],
    costCredits: 3,
    execute: async (input) => {
      const result = await suggestNextAction({
        entityType: input.entityType ?? "deal",
        entityId: input.entityId ?? 0,
        currentStage: "risk_assessment",
        data: { summary: input.summary },
      });
      return { riskAssessment: result.suggestion, confidence: result.confidence };
    },
  });

  registerTool({
    name: "process_transcript",
    description: "Process call/meeting transcript — extract summary, action items, topics, sentiment, objections",
    domain: "communications",
    inputKeys: ["communicationId", "transcript", "type", "contactName", "companyName"],
    outputKeys: ["summary", "actionItems", "keyTopics", "sentiment", "objections", "nextSteps", "confidence"],
    costCredits: 8,
    execute: async (input) => {
      const result = await processTranscript({
        communicationId: input.communicationId,
        transcript: input.transcript ?? "",
        type: input.type,
        contactName: input.contactName,
        companyName: input.companyName,
      });
      return { summary: result.summary, actionItems: result.actionItems, keyTopics: result.keyTopics, sentiment: result.sentiment, objections: result.objections, nextSteps: result.nextSteps, confidence: result.confidence };
    },
  });

  registerTool({
    name: "analyze_sentiment",
    description: "Analyze sentiment of a call or meeting",
    domain: "communications",
    inputKeys: ["communicationId", "transcript", "summary", "contactName"],
    outputKeys: ["overall", "score", "breakdown", "trendDirection", "keyPhrases", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await analyzeCallSentiment({
        communicationId: input.communicationId,
        transcript: input.transcript,
        summary: input.summary,
        contactName: input.contactName,
      });
      return { overall: result.overall, score: result.score, breakdown: result.breakdown, trendDirection: result.trendDirection, keyPhrases: result.keyPhrases, confidence: result.confidence };
    },
  });

  registerTool({
    name: "detect_objections",
    description: "Detect buyer objections, concerns, and hesitations from conversation",
    domain: "communications",
    inputKeys: ["communicationId", "transcript", "summary", "contactName", "dealContext"],
    outputKeys: ["objections", "objectionCount", "primaryConcern", "overallRisk", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await detectObjections({
        communicationId: input.communicationId,
        transcript: input.transcript,
        summary: input.summary,
        contactName: input.contactName,
        dealContext: input.dealContext,
      });
      return { objections: result.objections, objectionCount: result.objectionCount, primaryConcern: result.primaryConcern, overallRisk: result.overallRisk, confidence: result.confidence };
    },
  });

  registerTool({
    name: "generate_followup",
    description: "Generate follow-up draft from call/meeting conversation",
    domain: "communications",
    inputKeys: ["communicationId", "transcript", "summary", "actionItems", "contactName", "companyName", "channel", "tone"],
    outputKeys: ["draft", "subject", "channel", "tone", "keyPoints", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await generateFollowUp({
        communicationId: input.communicationId,
        transcript: input.transcript,
        summary: input.summary,
        actionItems: input.actionItems,
        contactName: input.contactName,
        companyName: input.companyName,
        channel: input.channel,
        tone: input.tone,
      });
      return { draft: result.draft, subject: result.subject, channel: result.channel, tone: result.tone, keyPoints: result.keyPoints, confidence: result.confidence };
    },
  });

  registerTool({
    name: "send_email",
    description: "Send an email message via SMTP or GoHighLevel",
    domain: "communications",
    inputKeys: ["to", "subject", "body", "contactId", "companyId"],
    outputKeys: ["success", "messageId", "provider", "communicationId"],
    costCredits: 2,
    execute: async (input) => {
      const result = await sendEmail({
        to: input.to ?? "",
        subject: input.subject ?? "(no subject)",
        body: input.body ?? "",
        contactId: input.contactId,
        companyId: input.companyId,
      });
      return { success: result.success, messageId: result.messageId, provider: result.provider, communicationId: result.communicationId };
    },
  });

  registerTool({
    name: "send_sms",
    description: "Send an SMS message via GoHighLevel",
    domain: "communications",
    inputKeys: ["to", "body", "contactId", "companyId"],
    outputKeys: ["success", "messageId", "provider", "communicationId"],
    costCredits: 2,
    execute: async (input) => {
      const result = await sendSMS({
        to: input.to ?? "",
        body: input.body ?? "",
        contactId: input.contactId,
        companyId: input.companyId,
      });
      return { success: result.success, messageId: result.messageId, provider: result.provider, communicationId: result.communicationId };
    },
  });

  registerTool({
    name: "book_meeting",
    description: "Book a meeting with availability checking",
    domain: "communications",
    inputKeys: ["contactId", "companyId", "contactName", "title", "scheduledAt", "durationMinutes"],
    outputKeys: ["success", "bookingId", "scheduledAt", "durationMinutes"],
    costCredits: 1,
    execute: async (input) => {
      const result = await createBooking({
        contactId: input.contactId,
        companyId: input.companyId,
        contactName: input.contactName,
        title: input.title ?? "Meeting",
        scheduledAt: input.scheduledAt ?? new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: input.durationMinutes ?? 30,
      });
      return { success: result.success, bookingId: result.bookingId, scheduledAt: result.scheduledAt, durationMinutes: result.durationMinutes };
    },
  });

  registerTool({
    name: "check_availability",
    description: "Check available meeting slots for a given date",
    domain: "communications",
    inputKeys: ["date", "durationMinutes"],
    outputKeys: ["slots", "availableCount"],
    costCredits: 0,
    execute: async (input) => {
      const slots = await getAvailableSlots({
        date: input.date ?? new Date().toISOString().split("T")[0],
        durationMinutes: input.durationMinutes ?? 30,
      });
      return { slots, availableCount: slots.filter(s => s.available).length };
    },
  });

  registerTool({
    name: "generate_asset",
    description: "Generate a creative asset (image, video, text content) with brand enforcement",
    domain: "production",
    inputKeys: ["type", "title", "prompt", "category", "domain", "campaignId", "brandKitId", "aspectRatio", "durationSeconds"],
    outputKeys: ["assetId", "provider", "type", "title", "version"],
    costCredits: 10,
    execute: async (input) => {
      const result = await generateAsset({
        type: (input.type ?? "social_post") as AssetType,
        title: input.title ?? "Untitled Asset",
        prompt: input.prompt ?? "",
        category: input.category,
        domain: input.domain,
        campaignId: input.campaignId,
        brandKitId: input.brandKitId,
        aspectRatio: input.aspectRatio,
        durationSeconds: input.durationSeconds,
        actor: input.actor,
      });
      return { assetId: result.asset.id, provider: result.provider, type: result.asset.type, title: result.asset.title, version: result.asset.version };
    },
  });

  registerTool({
    name: "ai_review_asset",
    description: "AI creative director reviews an asset for brand compliance and quality",
    domain: "production",
    inputKeys: ["assetId"],
    outputKeys: ["review", "score", "suggestions", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await aiReviewAsset(input.assetId);
      return result;
    },
  });

  registerTool({
    name: "generate_design_brief",
    description: "Generate a comprehensive design brief for asset creation",
    domain: "production",
    inputKeys: ["type", "objective", "targetAudience", "keyMessages", "references"],
    outputKeys: ["brief", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      const result = await generateDesignBrief({
        type: (input.type ?? "social_post") as AssetType,
        objective: input.objective ?? "",
        targetAudience: input.targetAudience,
        keyMessages: input.keyMessages,
        references: input.references,
      });
      return result;
    },
  });

  registerTool({
    name: "suggest_asset_revisions",
    description: "AI suggests specific revisions for a draft or rejected asset",
    domain: "production",
    inputKeys: ["assetId"],
    outputKeys: ["suggestions", "priority", "confidence"],
    costCredits: 3,
    execute: async (input) => {
      return await suggestRevisions(input.assetId);
    },
  });

  registerTool({
    name: "submit_asset_review",
    description: "Submit an asset for human review and approval",
    domain: "production",
    inputKeys: ["assetId", "actor"],
    outputKeys: ["success", "approvalId", "error"],
    costCredits: 0,
    execute: async (input) => {
      return await submitForReview(input.assetId, input.actor);
    },
  });

  registerTool({
    name: "review_asset_decision",
    description: "Approve or request revision on a reviewed asset",
    domain: "production",
    inputKeys: ["assetId", "decision", "reviewNotes", "rejectionReason", "reviewer"],
    outputKeys: ["success", "error"],
    costCredits: 0,
    execute: async (input) => {
      return await reviewAsset({
        assetId: input.assetId,
        decision: input.decision ?? "revision_needed",
        reviewNotes: input.reviewNotes,
        rejectionReason: input.rejectionReason,
        reviewer: input.reviewer ?? "system",
      });
    },
  });

  registerTool({
    name: "finalize_asset",
    description: "Finalize an approved asset for publication/distribution",
    domain: "production",
    inputKeys: ["assetId", "actor"],
    outputKeys: ["success", "error"],
    costCredits: 0,
    execute: async (input) => {
      return await finalizeAsset(input.assetId, input.actor);
    },
  });

  registerTool({
    name: "create_asset_version",
    description: "Create a new version of an existing asset",
    domain: "production",
    inputKeys: ["assetId", "title", "content", "prompt", "actor"],
    outputKeys: ["id", "version", "parentId", "title"],
    costCredits: 0,
    execute: async (input) => {
      const result = await createAssetVersion(input.assetId, { title: input.title, content: input.content, prompt: input.prompt }, input.actor);
      if (!result) return { error: "Asset not found" };
      return { id: result.id, version: result.version, parentId: result.parentId, title: result.title };
    },
  });

  registerTool({
    name: "route_creative",
    description: "Determine the best creative provider for an asset type",
    domain: "production",
    inputKeys: ["assetType"],
    outputKeys: ["provider", "description", "estimatedCredits", "capabilities"],
    costCredits: 0,
    execute: async (input) => {
      return routeCreativeRequest(input.assetType ?? "social_post");
    },
  });

  registerTool({
    name: "get_brand_kit",
    description: "Retrieve the default brand kit for brand enforcement",
    domain: "production",
    inputKeys: [],
    outputKeys: ["id", "name", "primaryColor", "secondaryColor", "accentColor", "headingFont", "bodyFont", "tonOfVoice", "tagline"],
    costCredits: 0,
    execute: async () => {
      const kit = await getDefaultBrandKit();
      if (!kit) return { error: "No brand kit configured" };
      return kit;
    },
  });

  registerChainTemplate({
    name: "call_analysis",
    description: "Full call analysis pipeline: transcript processing → sentiment → objection detection → follow-up draft",
    domain: "communications",
    steps: [
      { toolName: "process_transcript" },
      { toolName: "analyze_sentiment", inputMapping: { transcript: "transcript", summary: "summary", contactName: "contactName" } },
      { toolName: "detect_objections", inputMapping: { transcript: "transcript", summary: "summary", contactName: "contactName" } },
      { toolName: "generate_followup", inputMapping: { transcript: "transcript", summary: "summary", actionItems: "actionItems", contactName: "contactName", companyName: "companyName" } },
    ],
  });

  registerChainTemplate({
    name: "meeting_setup",
    description: "Meeting setup pipeline: check availability → book meeting",
    domain: "communications",
    steps: [
      { toolName: "check_availability" },
      { toolName: "book_meeting", inputMapping: { scheduledAt: "scheduledAt", contactName: "contactName", title: "title" } },
    ],
  });

  registerChainTemplate({
    name: "asset_production",
    description: "Full asset production pipeline: design brief → generate asset → AI review → submit for human review",
    domain: "production",
    steps: [
      { toolName: "generate_design_brief" },
      { toolName: "generate_asset", inputMapping: { prompt: "brief", type: "type", title: "title" } },
      { toolName: "ai_review_asset", inputMapping: { assetId: "assetId" } },
      { toolName: "submit_asset_review", inputMapping: { assetId: "assetId" } },
    ],
  });

  registerChainTemplate({
    name: "asset_revision",
    description: "Asset revision pipeline: suggest revisions → create version → AI review",
    domain: "production",
    steps: [
      { toolName: "suggest_asset_revisions" },
      { toolName: "create_asset_version", inputMapping: { assetId: "assetId", content: "suggestions" } },
      { toolName: "ai_review_asset", inputMapping: { assetId: "id" } },
    ],
  });

  registerTool({
    name: "transition_invoice",
    description: "Transition an invoice through its lifecycle (draft → sent → viewed → overdue → partially_paid → paid)",
    domain: "finance_legal",
    inputKeys: ["invoiceId", "targetStatus", "actor", "notes"],
    outputKeys: ["success", "invoice"],
    costCredits: 0,
    execute: async (input) => {
      return await transitionInvoice({ invoiceId: input.invoiceId, targetStatus: input.targetStatus, actor: input.actor ?? "agent", notes: input.notes });
    },
  });

  registerTool({
    name: "record_payment",
    description: "Record a payment against an invoice and auto-transition status",
    domain: "finance_legal",
    inputKeys: ["invoiceId", "amount", "method", "reference", "notes", "actor"],
    outputKeys: ["success", "payment", "invoice"],
    costCredits: 0,
    execute: async (input) => {
      return await recordPayment({ invoiceId: input.invoiceId, amount: input.amount, method: input.method, reference: input.reference, notes: input.notes, actor: input.actor ?? "agent" });
    },
  });

  registerTool({
    name: "check_overdue_invoices",
    description: "Scan and auto-mark overdue invoices past their due date",
    domain: "finance_legal",
    inputKeys: ["actor"],
    outputKeys: ["overdueCount", "totalOverdue"],
    costCredits: 0,
    execute: async (input) => {
      return await checkOverdueInvoices(input.actor);
    },
  });

  registerTool({
    name: "submit_expense",
    description: "Submit an expense for approval — creates approval record and notifies reviewers",
    domain: "finance_legal",
    inputKeys: ["expenseId", "actor"],
    outputKeys: ["success", "approvalId"],
    costCredits: 0,
    execute: async (input) => {
      return await submitExpense({ expenseId: input.expenseId, actor: input.actor ?? "agent" });
    },
  });

  registerTool({
    name: "review_expense",
    description: "Approve or reject a submitted expense",
    domain: "finance_legal",
    inputKeys: ["expenseId", "decision", "reviewer", "notes", "rejectionReason"],
    outputKeys: ["success"],
    costCredits: 0,
    execute: async (input) => {
      return await reviewExpense({ expenseId: input.expenseId, decision: input.decision, reviewer: input.reviewer ?? "agent", notes: input.notes, rejectionReason: input.rejectionReason });
    },
  });

  registerTool({
    name: "ai_contract_review",
    description: "AI-powered contract review — flags risky clauses, detects missing protections, scores overall risk",
    domain: "finance_legal",
    inputKeys: ["contractId"],
    outputKeys: ["riskScore", "flaggedClauses", "missingClauses", "complianceIssues", "overallAssessment", "confidence"],
    costCredits: 10,
    execute: async (input) => {
      return await reviewContract(input.contractId);
    },
  });

  registerTool({
    name: "generate_contract",
    description: "AI-generate a contract from template parameters (MSA, SOW, NDA, etc.)",
    domain: "finance_legal",
    inputKeys: ["type", "companyName", "companyId", "serviceDescription", "term", "value", "actor"],
    outputKeys: ["contract", "confidence"],
    costCredits: 8,
    execute: async (input) => {
      return await generateContractFromTemplate({ type: input.type, companyName: input.companyName, companyId: input.companyId, serviceDescription: input.serviceDescription, term: input.term, value: input.value, actor: input.actor });
    },
  });

  registerTool({
    name: "quality_checkpoint",
    description: "Run quality checkpoints on an entity — validates required fields, data completeness, and business rules",
    domain: "finance_legal",
    inputKeys: ["entity", "entityType", "entityId", "domain", "actor", "createIssuesOnFailure"],
    outputKeys: ["passed", "results", "criticalFailures"],
    costCredits: 0,
    execute: async (input) => {
      return await enforceQualityCheckpoints({ entity: input.entity, entityType: input.entityType, entityId: input.entityId, domain: input.domain, actor: input.actor, createIssuesOnFailure: input.createIssuesOnFailure !== false });
    },
  });

  registerTool({
    name: "check_sop_compliance",
    description: "Check if required SOPs exist for a business action",
    domain: "finance_legal",
    inputKeys: ["action"],
    outputKeys: ["compliant", "requiredSOPs", "missingSops", "activeSopCount"],
    costCredits: 0,
    execute: async (input) => {
      return await checkSOPCompliance(input.action);
    },
  });

  registerTool({
    name: "ai_sop_audit",
    description: "AI-powered SOP compliance audit — checks whether an action follows established procedures",
    domain: "finance_legal",
    inputKeys: ["action", "entityType", "entityContext"],
    outputKeys: ["compliant", "findings", "recommendations", "confidence"],
    costCredits: 5,
    execute: async (input) => {
      return await aiAuditSOPCompliance({ action: input.action, entityType: input.entityType, entityContext: input.entityContext });
    },
  });

  registerChainTemplate({
    name: "invoice_lifecycle",
    description: "Invoice lifecycle: quality check → send → track overdue",
    domain: "finance_legal",
    steps: [
      { toolName: "quality_checkpoint", inputMapping: { entity: "entity", entityType: "entityType", entityId: "invoiceId", domain: "domain" } },
      { toolName: "transition_invoice", inputMapping: { invoiceId: "invoiceId", targetStatus: "targetStatus", actor: "actor" } },
    ],
  });

  registerChainTemplate({
    name: "contract_review_pipeline",
    description: "Contract review pipeline: AI review → SOP compliance check → quality checkpoint",
    domain: "finance_legal",
    steps: [
      { toolName: "ai_contract_review", inputMapping: { contractId: "contractId" } },
      { toolName: "check_sop_compliance", inputMapping: { action: "action" } },
      { toolName: "quality_checkpoint", inputMapping: { entity: "entity", entityType: "entityType", entityId: "contractId", domain: "domain" } },
    ],
  });

  registerChainTemplate({
    name: "expense_approval_pipeline",
    description: "Expense approval: quality check → submit → (awaits human review)",
    domain: "finance_legal",
    steps: [
      { toolName: "quality_checkpoint", inputMapping: { entity: "entity", entityType: "entityType", entityId: "expenseId", domain: "domain" } },
      { toolName: "submit_expense", inputMapping: { expenseId: "expenseId", actor: "actor" } },
    ],
  });
}
