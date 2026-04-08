import { Router } from "express";
import {
  getWalletBalance, getWalletTransactions, fundWallet,
  getActionLedger, getSpendAnalytics, getSpendThresholds,
  upsertSpendThreshold, deleteSpendThreshold,
  setDummyMode, isDummyMode, getActiveReservations,
  getProviderSpendSummary, getWorkflowSpendSummary,
} from "../services/wallet-service";
import { getCacheStats, invalidateCache, cleanExpiredCache } from "../services/cache-intelligence";

const router = Router();

router.get("/balance", async (_req, res) => {
  try {
    const wallet = await getWalletBalance();
    res.json(wallet);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const transactions = await getWalletTransactions(limit);
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/fund", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || typeof amount !== "number" || amount === 0) {
      res.status(400).json({ error: "Valid non-zero amount required" });
      return;
    }
    const result = await fundWallet(amount);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/analytics", async (_req, res) => {
  try {
    const analytics = await getSpendAnalytics();
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ledger", async (req, res) => {
  try {
    const ledger = await getActionLedger({
      limit: parseInt(req.query.limit as string) || 100,
      domain: req.query.domain as string,
      tool: req.query.tool as string,
      provider: req.query.provider as string,
      workflow: req.query.workflow as string,
      type: req.query.type as string,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
    });
    res.json(ledger);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/thresholds", async (_req, res) => {
  try {
    const thresholds = await getSpendThresholds();
    res.json(thresholds);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/thresholds", async (req, res) => {
  try {
    const { scopeType, scopeId, dailyLimit, monthlyLimit, perActionCap, enabled } = req.body;
    if (!scopeType || !scopeId) {
      res.status(400).json({ error: "scopeType and scopeId required" });
      return;
    }
    const result = await upsertSpendThreshold({ scopeType, scopeId, dailyLimit, monthlyLimit, perActionCap, enabled });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/thresholds/:id", async (req, res) => {
  try {
    await deleteSpendThreshold(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reservations", async (_req, res) => {
  try {
    res.json(getActiveReservations());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/provider-spend", async (_req, res) => {
  try {
    res.json(getProviderSpendSummary());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/workflow-spend", async (_req, res) => {
  try {
    res.json(getWorkflowSpendSummary());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/dummy-mode", async (req, res) => {
  try {
    const { enabled } = req.body;
    setDummyMode(!!enabled);
    res.json({ dummyMode: isDummyMode() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dummy-mode", async (_req, res) => {
  res.json({ dummyMode: isDummyMode() });
});

router.get("/cache/stats", async (_req, res) => {
  try {
    const stats = await getCacheStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/cache/invalidate", async (req, res) => {
  try {
    const { category, domain } = req.body;
    await invalidateCache({ category, domain });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/cache/clean", async (_req, res) => {
  try {
    await cleanExpiredCache();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
