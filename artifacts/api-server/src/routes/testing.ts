import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  enableDummyMode, disableDummyMode, getDummyModeStatus,
  runTestSuite, getAvailableSuites, getTestHistory,
} from "../services/testing-service";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = req.session as any;
  if (!session?.userRole || !["super_admin", "admin"].includes(session.userRole)) {
    res.status(403).json({ error: "Admin access required for testing operations" });
    return;
  }
  next();
}

router.post("/testing/dummy-mode/enable", requireAdmin, async (_req, res): Promise<void> => {
  const result = enableDummyMode();
  res.json(result);
});

router.post("/testing/dummy-mode/disable", requireAdmin, async (_req, res): Promise<void> => {
  const result = disableDummyMode();
  res.json(result);
});

router.get("/testing/dummy-mode/status", async (_req, res): Promise<void> => {
  res.json(getDummyModeStatus());
});

router.get("/testing/suites", async (_req, res): Promise<void> => {
  res.json(getAvailableSuites());
});

router.post("/testing/run", requireAdmin, async (req, res): Promise<void> => {
  const { suite, phase } = req.body;
  try {
    const results = await runTestSuite(suite, phase ? Number(phase) : undefined);
    if (suite && results.length === 0) { res.status(404).json({ error: `Suite "${suite}" not found` }); return; }
    const totalTests = results.reduce((s, r) => s + r.total, 0);
    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalFailed = results.reduce((s, r) => s + r.failed, 0);
    res.json({
      summary: { suites: results.length, totalTests, totalPassed, totalFailed, allPassed: totalFailed === 0 },
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/testing/run/:suite", requireAdmin, async (req, res): Promise<void> => {
  const { suite } = req.params;
  try {
    const results = await runTestSuite(suite);
    if (results.length === 0) { res.status(404).json({ error: `Suite "${suite}" not found` }); return; }
    res.json(results[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/testing/history", async (req, res): Promise<void> => {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
  res.json(getTestHistory(limit));
});

export default router;
