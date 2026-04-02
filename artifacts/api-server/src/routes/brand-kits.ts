import { Router, type IRouter } from "express";
import { listBrandKits, getBrandKit, createBrandKit, updateBrandKit } from "../services/production-studio-service";

const router: IRouter = Router();

router.get("/brand-kits", async (_req, res): Promise<void> => {
  const kits = await listBrandKits();
  res.json(kits);
});

router.get("/brand-kits/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const kit = await getBrandKit(id);
  if (!kit) { res.status(404).json({ error: "Brand kit not found" }); return; }
  res.json(kit);
});

router.post("/brand-kits", async (req, res): Promise<void> => {
  const { name, ...rest } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const kit = await createBrandKit({ name, ...rest });
  res.status(201).json(kit);
});

router.patch("/brand-kits/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const kit = await updateBrandKit(id, req.body);
  if (!kit) { res.status(404).json({ error: "Brand kit not found" }); return; }
  res.json(kit);
});

export default router;
