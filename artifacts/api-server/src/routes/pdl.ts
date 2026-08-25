import { Router, type IRouter } from "express";
import { getPdlStatus, testPdlConnection, PdlError } from "../services/pdl-service";

const router: IRouter = Router();

// Connection state (DB only, no external call). live | off.
router.get("/pdl/status", async (_req, res): Promise<void> => {
  res.json(await getPdlStatus());
});

// Validate the connected key with a zero-cost probe (a 404-only lookup).
router.post("/pdl/test", async (_req, res): Promise<void> => {
  try {
    res.json(await testPdlConnection());
  } catch (err: any) {
    const status = err instanceof PdlError && err.status >= 400 ? err.status : 502;
    res.status(status).json({ error: err?.message ?? "PDL test failed", code: err?.code ?? "pdl_error" });
  }
});

export default router;
