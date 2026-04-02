import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, knowledgeEntriesTable } from "@workspace/db";
import { addKnowledgeEntry, searchKnowledge, getKnowledgeByCategory, getAllKnowledge, incrementUsage } from "../services/knowledge-service";
import { semanticSearch, embedKnowledgeEntry, embedAllKnowledge } from "../services/embedding-service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const entries = await getAllKnowledge(limit);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) {
      res.status(400).json({ error: "Query parameter q required" });
      return;
    }
    const results = await searchKnowledge(q);
    for (const entry of results) {
      incrementUsage(entry.id).catch(() => {});
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/category/:category", async (req, res) => {
  try {
    const entries = await getKnowledgeByCategory(req.params.category);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const entry = await addKnowledgeEntry(req.body);
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { title, content, category, subcategory, tags, isActive } = req.body;
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory;
    if (tags !== undefined) updateData.tags = tags;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (Object.keys(updateData).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
    const [entry] = await db.update(knowledgeEntriesTable).set(updateData).where(eq(knowledgeEntriesTable.id, id)).returning();
    if (!entry) { res.status(404).json({ error: "Knowledge entry not found" }); return; }
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [entry] = await db.update(knowledgeEntriesTable).set({ isActive: false }).where(eq(knowledgeEntriesTable.id, id)).returning();
    if (!entry) { res.status(404).json({ error: "Knowledge entry not found" }); return; }
    res.json({ success: true, deactivated: entry.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/track-usage", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await incrementUsage(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/semantic-search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) { res.status(400).json({ error: "Query parameter q required" }); return; }
    const limit = parseInt(req.query.limit as string) || 10;
    const minScore = parseFloat(req.query.minScore as string) || 0.3;
    const results = await semanticSearch(q, limit, minScore);
    for (const entry of results) {
      incrementUsage(entry.id).catch(() => {});
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/embed-all", async (req, res) => {
  try {
    const result = await embedAllKnowledge();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/embed", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await embedKnowledgeEntry(id);
    res.json({ success: true, embedded: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
