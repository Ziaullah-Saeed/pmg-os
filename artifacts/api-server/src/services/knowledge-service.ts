import { db, knowledgeEntriesTable } from "@workspace/db";
import { eq, desc, ilike, or, sql } from "drizzle-orm";

export async function addKnowledgeEntry(params: {
  category: string;
  subcategory?: string;
  title: string;
  content: string;
  source: string;
  sourceDomain?: string;
  sourceEntityType?: string;
  sourceEntityId?: number;
  tags?: string[];
  confidence?: number;
}) {
  const [entry] = await db.insert(knowledgeEntriesTable).values({
    category: params.category,
    subcategory: params.subcategory,
    title: params.title,
    content: params.content,
    source: params.source,
    sourceDomain: params.sourceDomain,
    sourceEntityType: params.sourceEntityType,
    sourceEntityId: params.sourceEntityId,
    tags: params.tags ?? [],
    confidence: params.confidence,
  }).returning();

  import("./embedding-service").then(({ embedKnowledgeEntry }) => {
    embedKnowledgeEntry(entry.id).catch(() => {});
  }).catch(() => {});

  return entry;
}

export async function searchKnowledge(query: string, limit = 20) {
  const results = await db.select().from(knowledgeEntriesTable)
    .where(or(
      ilike(knowledgeEntriesTable.title, `%${query}%`),
      ilike(knowledgeEntriesTable.content, `%${query}%`),
      ilike(knowledgeEntriesTable.category, `%${query}%`),
    ))
    .orderBy(desc(knowledgeEntriesTable.updatedAt))
    .limit(limit);
  return results;
}

export async function getKnowledgeByCategory(category: string, limit = 50) {
  return db.select().from(knowledgeEntriesTable)
    .where(eq(knowledgeEntriesTable.category, category))
    .orderBy(desc(knowledgeEntriesTable.updatedAt))
    .limit(limit);
}

export async function getAllKnowledge(limit = 100) {
  return db.select().from(knowledgeEntriesTable)
    .where(eq(knowledgeEntriesTable.isActive, true))
    .orderBy(desc(knowledgeEntriesTable.updatedAt))
    .limit(limit);
}

export async function incrementUsage(id: number) {
  await db.update(knowledgeEntriesTable).set({
    usageCount: sql`${knowledgeEntriesTable.usageCount} + 1`,
    lastUsedAt: new Date(),
  }).where(eq(knowledgeEntriesTable.id, id));
}

export async function getRecentKnowledgeContext(domain: string, limit = 5): Promise<string> {
  const entries = await db.select().from(knowledgeEntriesTable)
    .where(eq(knowledgeEntriesTable.sourceDomain, domain))
    .orderBy(desc(knowledgeEntriesTable.updatedAt))
    .limit(limit);

  if (entries.length === 0) return "";

  return entries.map(e => `[${e.category}] ${e.title}: ${e.content.slice(0, 200)}`).join("\n");
}
