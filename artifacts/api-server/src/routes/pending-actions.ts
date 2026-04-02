import { Router, type IRouter } from "express";
import { listPendingActions, resolvePendingAction, getPendingCount } from "../services/mode-action-service";
import { getSessionUser } from "../middleware/auth";

const router: IRouter = Router();

router.get("/pending-actions", async (req, res): Promise<void> => {
  const { status, workflowKey, entityType, limit } = req.query as Record<string, string>;
  const actions = await listPendingActions({
    status: status ?? "pending",
    workflowKey,
    entityType,
    limit: Math.min(Number(limit) || 50, 200),
  });
  res.json(actions);
});

router.get("/pending-actions/count", async (_req, res): Promise<void> => {
  const count = await getPendingCount();
  res.json({ count });
});

router.post("/pending-actions/:id/resolve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid action ID" });
    return;
  }

  const { option } = req.body as { option: string };
  if (!option) {
    res.status(400).json({ error: "option is required (approve, modify, skip, or custom option id)" });
    return;
  }

  const user = getSessionUser(req);
  const result = await resolvePendingAction(id, option, user?.name ?? "unknown");

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

export default router;
