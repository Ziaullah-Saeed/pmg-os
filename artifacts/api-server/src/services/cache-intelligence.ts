import { db, walletCacheTable } from "@workspace/db";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { cacheGet, cacheSet, TTL } from "./cache-service";
import { createHash } from "crypto";

export type CacheCategory =
  | "reasoning"
  | "enrichment"
  | "research"
  | "report_component"
  | "manual_guide"
  | "production_asset"
  | "crm_summary"
  | "outreach_structure";

const CACHE_TTL: Record<CacheCategory, number> = {
  reasoning: 30 * 60 * 1000,
  enrichment: 60 * 60 * 1000,
  research: 45 * 60 * 1000,
  report_component: 120 * 60 * 1000,
  manual_guide: 240 * 60 * 1000,
  production_asset: 180 * 60 * 1000,
  crm_summary: 30 * 60 * 1000,
  outreach_structure: 90 * 60 * 1000,
};

const DB_TTL: Record<CacheCategory, number> = {
  reasoning: 2 * 60 * 60 * 1000,
  enrichment: 24 * 60 * 60 * 1000,
  research: 12 * 60 * 60 * 1000,
  report_component: 7 * 24 * 60 * 60 * 1000,
  manual_guide: 30 * 24 * 60 * 60 * 1000,
  production_asset: 14 * 24 * 60 * 60 * 1000,
  crm_summary: 4 * 60 * 60 * 1000,
  outreach_structure: 7 * 24 * 60 * 60 * 1000,
};

function hashInput(input: any): string {
  const normalized = typeof input === "string" ? input : JSON.stringify(input, Object.keys(input).sort());
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

function buildCacheKey(category: CacheCategory, domain: string | undefined, inputHash: string): string {
  return `icache:${category}:${domain ?? "global"}:${inputHash}`;
}

export async function getCachedResult(params: {
  category: CacheCategory;
  domain?: string;
  input: any;
  tool?: string;
}): Promise<{ hit: boolean; result?: any; confidence?: number; cacheId?: number }> {
  const inputHash = hashInput(params.input);
  const cacheKey = buildCacheKey(params.category, params.domain, inputHash);

  const memCached = cacheGet<{ result: any; confidence: number; cacheId: number }>(cacheKey);
  if (memCached) {
    db.update(walletCacheTable)
      .set({
        hitCount: sql`${walletCacheTable.hitCount} + 1`,
        lastHitAt: new Date(),
        costSaved: sql`${walletCacheTable.costSaved} + ${walletCacheTable.originalCost}`,
      })
      .where(eq(walletCacheTable.id, memCached.cacheId))
      .catch(() => {});

    return { hit: true, result: memCached.result, confidence: memCached.confidence, cacheId: memCached.cacheId };
  }

  const rows = await db.select().from(walletCacheTable)
    .where(and(
      eq(walletCacheTable.cacheKey, cacheKey),
      eq(walletCacheTable.inputHash, inputHash),
      gt(walletCacheTable.expiresAt, new Date()),
    ))
    .limit(1);

  if (rows.length > 0) {
    const row = rows[0];
    const ttl = CACHE_TTL[params.category] ?? TTL.AI_RESPONSE;
    cacheSet(cacheKey, { result: row.result, confidence: Number(row.confidence), cacheId: row.id }, ttl);

    await db.update(walletCacheTable)
      .set({
        hitCount: sql`${walletCacheTable.hitCount} + 1`,
        lastHitAt: new Date(),
        costSaved: sql`${walletCacheTable.costSaved} + ${walletCacheTable.originalCost}`,
      })
      .where(eq(walletCacheTable.id, row.id));

    return { hit: true, result: row.result, confidence: Number(row.confidence), cacheId: row.id };
  }

  return { hit: false };
}

export async function setCachedResult(params: {
  category: CacheCategory;
  domain?: string;
  input: any;
  result: any;
  confidence?: number;
  originalCost: number;
  tool?: string;
}): Promise<number> {
  const inputHash = hashInput(params.input);
  const cacheKey = buildCacheKey(params.category, params.domain, inputHash);
  const ttlMs = DB_TTL[params.category] ?? 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  const existing = await db.select({ id: walletCacheTable.id }).from(walletCacheTable)
    .where(and(
      eq(walletCacheTable.cacheKey, cacheKey),
      eq(walletCacheTable.inputHash, inputHash),
    )).limit(1);

  let cacheId: number;

  if (existing.length > 0) {
    await db.update(walletCacheTable).set({
      result: params.result,
      confidence: params.confidence?.toFixed(2),
      originalCost: params.originalCost.toFixed(4),
      expiresAt,
    }).where(eq(walletCacheTable.id, existing[0].id));
    cacheId = existing[0].id;
  } else {
    const [row] = await db.insert(walletCacheTable).values({
      cacheKey,
      cacheType: params.category,
      domain: params.domain,
      inputHash,
      result: params.result,
      confidence: params.confidence?.toFixed(2),
      originalCost: params.originalCost.toFixed(4),
      expiresAt,
    }).returning();
    cacheId = row.id;
  }

  const memTtl = CACHE_TTL[params.category] ?? TTL.AI_RESPONSE;
  cacheSet(cacheKey, { result: params.result, confidence: params.confidence, cacheId }, memTtl);

  return cacheId;
}

export async function invalidateCache(params: {
  category?: CacheCategory;
  domain?: string;
}): Promise<number> {
  const conditions: any[] = [];
  if (params.category) conditions.push(eq(walletCacheTable.cacheType, params.category));
  if (params.domain) conditions.push(eq(walletCacheTable.domain, params.domain));

  if (conditions.length === 0) {
    const result = await db.delete(walletCacheTable);
    return 0;
  }

  await db.delete(walletCacheTable).where(and(...conditions));
  return 1;
}

export async function getCacheStats() {
  const byType = await db.select({
    cacheType: walletCacheTable.cacheType,
    entries: sql<number>`COUNT(*)`,
    totalHits: sql<number>`SUM(${walletCacheTable.hitCount})`,
    totalSaved: sql<string>`COALESCE(SUM(CAST(${walletCacheTable.costSaved} AS NUMERIC)), 0)`,
  }).from(walletCacheTable)
    .where(gt(walletCacheTable.expiresAt, new Date()))
    .groupBy(walletCacheTable.cacheType);

  const [totals] = await db.select({
    totalEntries: sql<number>`COUNT(*)`,
    totalHits: sql<number>`COALESCE(SUM(${walletCacheTable.hitCount}), 0)`,
    totalSaved: sql<string>`COALESCE(SUM(CAST(${walletCacheTable.costSaved} AS NUMERIC)), 0)`,
    avgConfidence: sql<string>`COALESCE(AVG(CAST(${walletCacheTable.confidence} AS NUMERIC)), 0)`,
  }).from(walletCacheTable)
    .where(gt(walletCacheTable.expiresAt, new Date()));

  const recentEntries = await db.select().from(walletCacheTable)
    .where(gt(walletCacheTable.expiresAt, new Date()))
    .orderBy(desc(walletCacheTable.lastHitAt))
    .limit(10);

  return {
    totalEntries: Number(totals?.totalEntries ?? 0),
    totalHits: Number(totals?.totalHits ?? 0),
    totalSaved: Number(totals?.totalSaved ?? 0),
    avgConfidence: Number(Number(totals?.avgConfidence ?? 0).toFixed(1)),
    byType: byType.map(t => ({
      type: t.cacheType,
      entries: Number(t.entries),
      hits: Number(t.totalHits),
      saved: Number(t.totalSaved),
    })),
    recentEntries: recentEntries.map(e => ({
      id: e.id,
      type: e.cacheType,
      domain: e.domain,
      hits: e.hitCount,
      saved: Number(e.costSaved),
      confidence: Number(e.confidence),
      expiresAt: e.expiresAt,
      lastHitAt: e.lastHitAt,
    })),
  };
}

export async function cleanExpiredCache(): Promise<number> {
  const result = await db.delete(walletCacheTable).where(
    sql`${walletCacheTable.expiresAt} < NOW()`
  );
  return 0;
}

export function categorizeAICall(params: {
  workflowKey?: string;
  tool?: string;
  domain?: string;
  action?: string;
}): CacheCategory | null {
  const key = params.workflowKey ?? params.action ?? "";
  const tool = params.tool ?? "";

  if (key.includes("enrich") || tool.includes("enrich")) return "enrichment";
  if (key.includes("research") || tool.includes("research")) return "research";
  if (key.includes("report") || key.includes("generate_report")) return "report_component";
  if (key.includes("guide") || key.includes("manual") || key.includes("sop")) return "manual_guide";
  if (key.includes("asset") || key.includes("generate") || key.includes("creative")) return "production_asset";
  if (key.includes("summary") || key.includes("summarize") || key.includes("crm")) return "crm_summary";
  if (key.includes("outreach") || key.includes("sequence") || key.includes("email_draft")) return "outreach_structure";
  if (key.includes("reason") || key.includes("analyze") || key.includes("score") || key.includes("suggest")) return "reasoning";

  return null;
}
