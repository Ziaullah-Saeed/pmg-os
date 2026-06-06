import { Router, type IRouter } from "express";
import { getApolloStatus, testApolloConnection } from "../services/apollo-service";

const router: IRouter = Router();

// Connection state (DB only, no external call). live | fixture.
router.get("/apollo/status", async (_req, res): Promise<void> => {
  res.json(await getApolloStatus());
});

// Actively validate the connected key against Apollo's health endpoint.
router.post("/apollo/test", async (_req, res): Promise<void> => {
  try {
    const result = await testApolloConnection();
    res.json(result);
  } catch (err: any) {
    const status = typeof err?.status === "number" && err.status >= 400 ? err.status : 502;
    res.status(status).json({ error: err?.message ?? "Apollo test failed", code: err?.code ?? "apollo_error" });
  }
});

export default router;
