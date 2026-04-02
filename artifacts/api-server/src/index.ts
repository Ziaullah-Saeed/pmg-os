import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startAgentSimulation } from "./services/agent-simulator";
import { initWebSocket } from "./services/websocket-service";
import { initAutomationEngine } from "./services/automation-engine";
import { initApprovalEngine } from "./services/approval-engine";
import { initScheduler } from "./services/scheduler-service";
import { initAssignmentRouter } from "./services/assignment-router";
import { initActivityTimeline } from "./services/activity-timeline";
import { initPipelineEngine } from "./services/pipeline-engine";
import { initLeadRouter } from "./services/lead-router";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

initWebSocket(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");

  initAutomationEngine();
  initApprovalEngine();
  initAssignmentRouter();
  initActivityTimeline();
  initPipelineEngine();
  initLeadRouter();
  initScheduler().catch(err => logger.error(err, "Scheduler init failed"));

  startAgentSimulation(45000);
  logger.info("Phase 3 engines initialized: automation, approval, scheduler, assignment, activity-timeline, pipeline, lead-router");
});
