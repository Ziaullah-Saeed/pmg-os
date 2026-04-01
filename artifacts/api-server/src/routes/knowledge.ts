import { Router } from "express";
import { addKnowledgeEntry, searchKnowledge, getKnowledgeByCategory, getAllKnowledge } from "../services/knowledge-service";

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

export default router;
