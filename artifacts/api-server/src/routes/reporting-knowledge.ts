import { Router, type IRouter } from "express";
import {
  generateScheduledReport, getReportTemplates, getEventReportTriggers,
  getKnowledgeEventMappings, getPermissionFilteredArchive,
  deliverReportToSlack, deliverReportSummaryByEmail,
} from "../services/reporting-knowledge-service";
import { getSessionUser } from "../middleware/auth";

const router: IRouter = Router();

router.get("/reporting/templates", async (_req, res): Promise<void> => {
  res.json(getReportTemplates());
});

router.get("/reporting/event-triggers", async (_req, res): Promise<void> => {
  res.json(getEventReportTriggers());
});

router.post("/reporting/generate", async (req, res): Promise<void> => {
  const { template } = req.body;
  if (!template) { res.status(400).json({ error: "template is required" }); return; }
  try {
    const result = await generateScheduledReport(template);
    res.json(result);
  } catch (err: any) {
    res.status(422).json({ error: err.message });
  }
});

router.post("/reporting/deliver/slack", async (req, res): Promise<void> => {
  const { reportId } = req.body;
  if (!reportId) { res.status(400).json({ error: "reportId is required" }); return; }
  const result = await deliverReportToSlack(reportId);
  if (!result.success) { res.status(422).json(result); return; }
  res.json(result);
});

router.post("/reporting/deliver/email", async (req, res): Promise<void> => {
  const { reportId, email } = req.body;
  if (!reportId || !email) { res.status(400).json({ error: "reportId and email are required" }); return; }
  const result = await deliverReportSummaryByEmail(reportId, email);
  if (!result.success) { res.status(422).json(result); return; }
  res.json(result);
});

router.get("/knowledge/event-mappings", async (_req, res): Promise<void> => {
  res.json(getKnowledgeEventMappings());
});

router.get("/reporting/archive", async (req, res): Promise<void> => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Authentication required" }); return; }
  const { domain, category, status, limit, offset } = req.query as Record<string, string | undefined>;
  const result = await getPermissionFilteredArchive({
    userRole: user.role,
    userId: user.id,
    domain,
    category,
    status,
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
  });
  res.json(result);
});

export default router;
