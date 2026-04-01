import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import {
  ListDocumentsQueryParams,
  ListDocumentsResponse,
  CreateDocumentBody,
  GetDocumentParams,
  GetDocumentResponse,
  UpdateDocumentParams,
  UpdateDocumentBody,
  UpdateDocumentResponse,
  DeleteDocumentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents", async (req, res): Promise<void> => {
  const query = ListDocumentsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success) {
    if (query.data.search) {
      conditions.push(ilike(documentsTable.title, `%${query.data.search}%`));
    }
    if (query.data.category) {
      conditions.push(eq(documentsTable.category, query.data.category));
    }
    if (query.data.status) {
      conditions.push(eq(documentsTable.status, query.data.status));
    }
  }
  const documents = await db
    .select()
    .from(documentsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(documentsTable.createdAt);
  res.json(ListDocumentsResponse.parse(documents));
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doc] = await db.insert(documentsTable).values(parsed.data).returning();
  res.status(201).json(GetDocumentResponse.parse(doc));
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, params.data.id));
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(GetDocumentResponse.parse(doc));
});

router.patch("/documents/:id", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doc] = await db.update(documentsTable).set(parsed.data).where(eq(documentsTable.id, params.data.id)).returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(UpdateDocumentResponse.parse(doc));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db.delete(documentsTable).where(eq(documentsTable.id, params.data.id)).returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
