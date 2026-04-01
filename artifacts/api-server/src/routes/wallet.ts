import { Router } from "express";
import { getWalletBalance, getWalletTransactions, fundWallet } from "../services/wallet-service";

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
    if (!amount || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "Valid positive amount required" });
      return;
    }
    const result = await fundWallet(amount);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
