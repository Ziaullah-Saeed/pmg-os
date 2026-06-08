import { db, leadsTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { enrichLead, scoreLead } from "./ai-service";
import { addKnowledgeEntry } from "./knowledge-service";
import { createNotification } from "./notification-service";

/**
 * AI enrichment + scoring pipeline for a freshly created lead.
 *
 * Extracted from the inline IIFE in `routes/leads.ts` so the Apollo import path
 * reuses the exact same enrich → score → knowledge → notify flow that manual
 * "Add Lead" triggers. Fire-and-forget: callers should `void` this and not await.
 *
 * Every model call routes through `callAI()` → respects tri-mode + wallet +
 * dummyMode. When `dummyMode` is on, calls are canned and free.
 */
export async function enrichAndScoreLead(
  leadId: number,
  opts: { name: string; company?: string | null; source?: string | null; skipStatusUpdate?: boolean },
): Promise<void> {
  const { name, company, source, skipStatusUpdate = false } = opts;
  try {
    const enrichResult = await enrichLead({
      id: leadId,
      name,
      company: company ?? undefined,
      source: source ?? undefined,
    });
    await db
      .update(leadsTable)
      .set({
        bestAngle: enrichResult.enrichment.slice(0, 500),
        ...(skipStatusUpdate ? {} : { status: "enriched" }),
      })
      .where(eq(leadsTable.id, leadId));

    await db.insert(activitiesTable).values({
      action: "ai_enrichment",
      description: `AI Enrichment Complete — confidence: ${enrichResult.confidence}%`,
      entityType: "lead",
      entityId: leadId,
      performedBy: "ai_system",
      metadata: JSON.stringify({ runId: enrichResult.runId, confidence: enrichResult.confidence }),
    });

    const scoreResult = await scoreLead({
      id: leadId,
      name,
      company: company ?? undefined,
      source: source ?? undefined,
      enrichmentData: enrichResult.enrichment,
    });
    await db
      .update(leadsTable)
      .set({
        fitScore: scoreResult.score,
        confidenceScore: scoreResult.confidence,
        priority: scoreResult.tier === "HOT" ? "urgent" : scoreResult.tier === "WARM" ? "high" : "medium",
        ...(skipStatusUpdate ? {} : { status: "scored" }),
        notes: scoreResult.reasoning,
      })
      .where(eq(leadsTable.id, leadId));

    await db.insert(activitiesTable).values({
      action: "ai_scoring",
      description: `Lead Scored: ${scoreResult.score}/100 (${scoreResult.tier}) — ${scoreResult.reasoning}`,
      entityType: "lead",
      entityId: leadId,
      performedBy: "ai_system",
      metadata: JSON.stringify({ runId: scoreResult.runId, score: scoreResult.score, tier: scoreResult.tier }),
    });

    await addKnowledgeEntry({
      category: "lead_intelligence",
      title: `Lead Intelligence: ${name}`,
      content: `Score: ${scoreResult.score}/100 (${scoreResult.tier})\n${enrichResult.enrichment}`,
      source: "ai_enrichment",
      sourceDomain: "crm",
      sourceEntityType: "lead",
      sourceEntityId: leadId,
      confidence: scoreResult.confidence,
    });

    await createNotification({
      type: "lead_enriched",
      severity: scoreResult.tier === "HOT" ? "warning" : "info",
      title: `New ${scoreResult.tier} Lead: ${name}`,
      message: `Score: ${scoreResult.score}/100 — ${scoreResult.reasoning.slice(0, 150)}`,
      domain: "crm",
      entityType: "lead",
      entityId: leadId,
      actor: "ai_system",
    });
  } catch (err: any) {
    console.error("AI lead enrichment failed:", err.message);
  }
}
