import { Router, type IRouter } from "express";
import {
  getApolloStatus,
  testApolloConnection,
  searchPeople,
  ApolloError,
  type PeopleSearchFilters,
} from "../services/apollo-service";

const router: IRouter = Router();

// Connection state (DB only, no external call). live | fixture.
router.get("/apollo/status", async (_req, res): Promise<void> => {
  res.json(await getApolloStatus());
});

// People search — free preview. NO credits, NO emails/phones. Fixtures when
// no key is connected; live Apollo `api_search` when connected.
router.post("/apollo/search", async (req, res): Promise<void> => {
  try {
    const result = await searchPeople((req.body ?? {}) as PeopleSearchFilters);
    res.json(result);
  } catch (err: any) {
    const status =
      err instanceof ApolloError && err.status >= 400 && err.status < 600 ? err.status : 502;
    res.status(status).json({ error: err?.message ?? "Apollo search failed", code: err?.code ?? "apollo_error" });
  }
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
