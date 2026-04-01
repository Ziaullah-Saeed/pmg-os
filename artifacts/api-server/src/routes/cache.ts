import { Router, type IRouter } from "express";
import { cacheStats, cacheClear, cacheInvalidatePattern } from "../services/cache-service";

const router: IRouter = Router();

router.get("/cache/stats", (_req, res): void => {
  res.json(cacheStats());
});

router.post("/cache/clear", (_req, res): void => {
  cacheClear();
  res.json({ success: true, message: "Cache cleared" });
});

router.post("/cache/invalidate", (req, res): void => {
  const { pattern } = req.body;
  if (!pattern) {
    res.status(400).json({ error: "Pattern required" });
    return;
  }
  const count = cacheInvalidatePattern(pattern);
  res.json({ success: true, invalidated: count });
});

export default router;
