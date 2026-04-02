import OpenAI from "openai";
import { db, knowledgeEntriesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.slice(0, 8000);
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function embedKnowledgeEntry(entryId: number): Promise<void> {
  const [entry] = await db.select().from(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entryId));
  if (!entry) return;

  const textToEmbed = `${entry.title}\n${entry.category}${entry.subcategory ? ` > ${entry.subcategory}` : ""}\n${entry.content}`;
  const embedding = await generateEmbedding(textToEmbed);

  await db.execute(sql`UPDATE knowledge_entries SET embedding = ${JSON.stringify(embedding)}::jsonb WHERE id = ${entryId}`);
}

export async function semanticSearch(query: string, limit = 10, minScore = 0.3): Promise<Array<{
  id: number;
  title: string;
  content: string;
  category: string;
  subcategory: string | null;
  score: number;
  tags: unknown;
  source: string;
  confidence: number | null;
}>> {
  const queryEmbedding = await generateEmbedding(query);

  const rows = await db.execute(sql`
    SELECT id, title, content, category, subcategory, tags, source, source_domain, confidence, embedding
    FROM knowledge_entries
    WHERE is_active = true AND embedding IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 200
  `);

  const results: Array<{
    id: number;
    title: string;
    content: string;
    category: string;
    subcategory: string | null;
    score: number;
    tags: unknown;
    source: string;
    sourceDomain: string | null;
    confidence: number | null;
  }> = [];

  for (const row of rows as any[]) {
    const embedding = typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding;
    if (!Array.isArray(embedding) || embedding.length !== queryEmbedding.length) continue;

    const score = cosineSimilarity(queryEmbedding, embedding);
    if (score >= minScore) {
      results.push({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        subcategory: row.subcategory,
        score: Math.round(score * 1000) / 1000,
        tags: row.tags,
        source: row.source,
        sourceDomain: row.source_domain,
        confidence: row.confidence,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function embedAllKnowledge(): Promise<{ embedded: number; errors: number }> {
  const entries = await db.select({ id: knowledgeEntriesTable.id })
    .from(knowledgeEntriesTable)
    .where(eq(knowledgeEntriesTable.isActive, true))
    .orderBy(desc(knowledgeEntriesTable.updatedAt));

  let embedded = 0, errors = 0;
  for (const entry of entries) {
    try {
      await embedKnowledgeEntry(entry.id);
      embedded++;
    } catch {
      errors++;
    }
  }
  return { embedded, errors };
}

export async function getSemanticContext(query: string, domain?: string, limit = 5): Promise<string> {
  const results = await semanticSearch(query, limit * 2);
  const filtered = domain
    ? results.filter(r => !domain || r.category === domain || (r as any).sourceDomain === domain || r.source?.includes(domain))
    : results;
  const final = (filtered.length > 0 ? filtered : results).slice(0, limit);
  if (final.length === 0) return "";

  const { incrementUsage } = await import("./knowledge-service");
  for (const r of final) {
    incrementUsage(r.id).catch(() => {});
  }

  return final.map(r => `[${r.category}|score:${r.score}] ${r.title}: ${r.content.slice(0, 300)}`).join("\n");
}

export async function initEmbeddingColumn(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS embedding jsonb DEFAULT NULL
  `);
}
