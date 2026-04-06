import { Router, type IRouter } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import contactsRouter from "./contacts";
import leadsRouter from "./leads";
import opportunitiesRouter from "./opportunities";
import activitiesRouter from "./activities";
import campaignsRouter from "./campaigns";
import tasksRouter from "./tasks";
import documentsRouter from "./documents";
import communicationsRouter from "./communications";
import dashboardRouter from "./dashboard";
import approvalsRouter from "./approvals";
import assetsRouter from "./assets";
import auditEventsRouter from "./audit-events";
import aiRunsRouter from "./ai-runs";
import archiveItemsRouter from "./archive-items";
import contractsRouter from "./contracts";
import invoicesRouter from "./invoices";
import integrationsRouter from "./integrations";
import outreachSequencesRouter from "./outreach-sequences";
import qualityIssuesRouter from "./quality-issues";
import reportsRouter from "./reports";
import usersRouter from "./users";
import walletRouter from "./wallet";
import aiModeRouter from "./ai-mode";
import notificationsRouter from "./notifications";
import aiRouter from "./ai";
import stateMachineRouter from "./state-machine";
import knowledgeRouter from "./knowledge";
import searchRouter from "./search";
import ghlRouter from "./ghl";
import { handleGHLWebhook } from "../services/ghl-service";
import automationRouter from "./automation";
import agentsRouter from "./agents";
import notesRouter from "./notes";
import uploadsRouter from "./uploads";
import cacheRouter from "./cache";
import recordModeRouter from "./record-mode";
import schedulerRouter from "./scheduler";
import eventBusRouter from "./event-bus";
import sequenceEnrollmentsRouter from "./sequence-enrollments";
import pendingActionsRouter from "./pending-actions";
import brandKitsRouter from "./brand-kits";
import integrationHubRouter from "./integration-hub";
import reportingKnowledgeRouter from "./reporting-knowledge";
import testingRouter from "./testing";
import channelHealthRouter from "./channel-health";
import jobQueueRouter from "./job-queue";
import channelsRouter from "./channels";
import guideEndpointsRouter from "./guide-endpoints";
import { processInboundWebhook } from "../services/integration-hub-service";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

router.post("/webhooks/inbound/:source", async (req, res) => {
  const { source } = req.params;
  const signature = (req.headers["x-webhook-signature"] ?? req.headers["x-hub-signature-256"] ?? req.headers["x-signature"]) as string | undefined;
  const event = (req.headers["x-webhook-event"] ?? req.headers["x-event-type"] ?? req.body?.event ?? "lead_capture") as string;
  const result = await processInboundWebhook({ source, event, payload: req.body, signature });
  if (result.error && !result.processed) {
    res.status(result.error === "Invalid webhook signature" ? 401 : 422).json(result);
    return;
  }
  res.json(result);
});

router.post("/ghl/webhook", async (req, res) => {
  const signature = req.headers["x-ghl-signature"] as string;
  if (signature) {
    const { createHmac } = await import("crypto");
    const { getGHLConfig } = await import("../services/ghl-service");
    const config = await getGHLConfig();
    const secret = (config as any)?.webhookSecret;
    if (secret) {
      const expected = createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
      if (signature !== expected) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    }
  }

  const event = (req.headers["x-ghl-event"] as string) ?? req.body?.event ?? "unknown";
  const payload = req.body?.payload ?? req.body;
  const result = await handleGHLWebhook(event, payload);
  res.json(result);
});

router.use(requireAuth);
router.use(requirePermission);

router.use(dashboardRouter);
router.use("/wallet", walletRouter);
router.use("/ai-mode", aiModeRouter);
router.use("/notifications", notificationsRouter);
router.use("/ai", aiRouter);
router.use("/state-machines", stateMachineRouter);
router.use("/knowledge", knowledgeRouter);
router.use(searchRouter);
router.use(ghlRouter);
router.use(automationRouter);
router.use("/agents", agentsRouter);
router.use(companiesRouter);
router.use(contactsRouter);
router.use(leadsRouter);
router.use(opportunitiesRouter);
router.use(activitiesRouter);
router.use(campaignsRouter);
router.use(tasksRouter);
router.use(documentsRouter);
router.use(communicationsRouter);
router.use(approvalsRouter);
router.use(assetsRouter);
router.use(auditEventsRouter);
router.use(aiRunsRouter);
router.use(archiveItemsRouter);
router.use(contractsRouter);
router.use(invoicesRouter);
router.use(integrationsRouter);
router.use(outreachSequencesRouter);
router.use(qualityIssuesRouter);
router.use(reportsRouter);
router.use(usersRouter);
router.use(notesRouter);
router.use(uploadsRouter);
router.use(cacheRouter);
router.use(recordModeRouter);
router.use("/scheduler", schedulerRouter);
router.use("/event-bus", eventBusRouter);
router.use("/sequence-enrollments", sequenceEnrollmentsRouter);
router.use(pendingActionsRouter);
router.use(brandKitsRouter);
router.use(integrationHubRouter);
router.use(reportingKnowledgeRouter);
router.use(testingRouter);
router.use(channelHealthRouter);
router.use(jobQueueRouter);
router.use("/channels", channelsRouter);
router.use(guideEndpointsRouter);

export default router;
