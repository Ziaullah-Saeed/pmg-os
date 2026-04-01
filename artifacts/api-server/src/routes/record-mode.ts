import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable, opportunitiesTable } from "@workspace/db";
import { getSessionUser } from "../middleware/auth";
import { logAudit } from "../services/audit-service";
import { broadcast } from "../services/websocket-service";
import { cacheInvalidate } from "../services/cache-service";

const router: IRouter = Router();

const VALID_MODES = ["ai_autonomous", "hybrid", "human_controlled", null];
const ENTITY_TABLES: Record<string, any> = {
  lead: leadsTable,
  opportunity: opportunitiesTable,
};

router.get("/record-mode/:entityType/:entityId", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.params;
  const table = ENTITY_TABLES[entityType];
  if (!table) {
    res.status(400).json({ error: `Invalid entity type: ${entityType}. Supported: lead, opportunity` });
    return;
  }

  const [record] = await db.select({ aiModeOverride: table.aiModeOverride }).from(table).where(eq(table.id, parseInt(entityId)));
  if (!record) {
    res.status(404).json({ error: `${entityType} not found` });
    return;
  }

  res.json({ entityType, entityId: parseInt(entityId), aiModeOverride: record.aiModeOverride || null });
});

router.put("/record-mode/:entityType/:entityId", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.params;
  const { mode } = req.body;
  const table = ENTITY_TABLES[entityType];

  if (!table) {
    res.status(400).json({ error: `Invalid entity type: ${entityType}. Supported: lead, opportunity` });
    return;
  }

  if (mode !== null && !VALID_MODES.includes(mode)) {
    res.status(400).json({ error: `Invalid mode. Use: ai_autonomous, hybrid, human_controlled, or null to clear` });
    return;
  }

  const id = parseInt(entityId);
  const [existing] = await db.select({ aiModeOverride: table.aiModeOverride }).from(table).where(eq(table.id, id));
  if (!existing) {
    res.status(404).json({ error: `${entityType} not found` });
    return;
  }

  const previousMode = existing.aiModeOverride;
  await db.update(table).set({ aiModeOverride: mode }).where(eq(table.id, id));
  cacheInvalidate(`ai_mode:record:${entityType}:${id}`);

  const user = getSessionUser(req);
  await logAudit({
    eventType: "mode_change",
    domain: "crm",
    action: "record_mode_override",
    description: `${entityType} #${id} AI mode override: ${previousMode || "inherit"} → ${mode || "inherit"}`,
    entityType,
    entityId: id,
    actor: user?.name || "system",
    actorType: "human",
    metadata: { previousMode, newMode: mode },
  });

  broadcast("mode_change", { entityType, entityId: id, mode, previousMode });

  res.json({ entityType, entityId: id, aiModeOverride: mode, previousMode });
});

export default router;
