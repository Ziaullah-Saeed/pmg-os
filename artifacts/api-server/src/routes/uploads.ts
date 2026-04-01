import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, fileUploadsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser, requireAuth } from "../middleware/auth";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain", "text/csv",
      "application/zip", "application/json",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

const router: IRouter = Router();

router.post("/uploads", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const user = getSessionUser(req);
  const { entityType, entityId, category } = req.body;

  const [record] = await db.insert(fileUploadsTable).values({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: `/api/uploads/files/${req.file.filename}`,
    entityType: entityType || null,
    entityId: entityId ? parseInt(entityId) : null,
    category: category || "general",
    uploadedBy: user?.name || "system",
  }).returning();

  res.status(201).json(record);
});

router.post("/uploads/multi", requireAuth, upload.array("files", 10), async (req, res): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    res.status(400).json({ error: "No files uploaded" });
    return;
  }

  const user = getSessionUser(req);
  const { entityType, entityId, category } = req.body;

  const records = await Promise.all(files.map(async (file) => {
    const [record] = await db.insert(fileUploadsTable).values({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: `/api/uploads/files/${file.filename}`,
      entityType: entityType || null,
      entityId: entityId ? parseInt(entityId) : null,
      category: category || "general",
      uploadedBy: user?.name || "system",
    }).returning();
    return record;
  }));

  res.status(201).json(records);
});

router.get("/uploads/files/:filename", (req, res): void => {
  const { filename } = req.params;
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

router.get("/uploads", requireAuth, async (req, res): Promise<void> => {
  const { entityType, entityId, category } = req.query;
  const conditions = [];
  if (entityType) conditions.push(eq(fileUploadsTable.entityType, entityType as string));
  if (entityId) conditions.push(eq(fileUploadsTable.entityId, parseInt(entityId as string)));
  if (category) conditions.push(eq(fileUploadsTable.category, category as string));

  const files = await db.select().from(fileUploadsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(fileUploadsTable.createdAt);
  res.json(files);
});

router.delete("/uploads/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [file] = await db.select().from(fileUploadsTable).where(eq(fileUploadsTable.id, id));
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, file.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await db.delete(fileUploadsTable).where(eq(fileUploadsTable.id, id));
  res.sendStatus(204);
});

export default router;
