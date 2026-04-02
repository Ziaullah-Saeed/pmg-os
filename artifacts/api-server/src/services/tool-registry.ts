import { registerTool } from "./tool-chain-service";
import { enrichLead, scoreLead, generateOutreachDraft, summarizeRecord, suggestNextAction } from "./ai-service";
import { generateICP, analyzeCompetitors, segmentMarket } from "./intelligence-service";
import { researchProspect, personalizeOutreach, draftStructuredOutreach, generateOutreachVariants } from "./outreach-pipeline-service";
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
}
