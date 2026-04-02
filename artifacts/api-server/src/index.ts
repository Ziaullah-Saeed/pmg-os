import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initWebSocket } from "./services/websocket-service";
import { initAutomationEngine } from "./services/automation-engine";
import { initApprovalEngine } from "./services/approval-engine";
import { initScheduler } from "./services/scheduler-service";
import { initAssignmentRouter } from "./services/assignment-router";
import { initActivityTimeline } from "./services/activity-timeline";
import { initPipelineEngine } from "./services/pipeline-engine";
import { initLeadRouter } from "./services/lead-router";
import { registerSequenceExecutors } from "./services/sequence-engine";
import { registerDedupExecutors } from "./services/dedup-service";
import { registerGHLExecutors } from "./services/ghl-service";
import { initEmbeddingColumn } from "./services/embedding-service";
import { initToolChainTemplates } from "./services/tool-chain-service";
import { registerAllTools } from "./services/tool-registry";
import { startAgentExecution } from "./services/agent-executor";
import { initProductionStudio } from "./services/production-studio-service";
import { initFinanceLegalService } from "./services/finance-legal-service";
import { initIntegrationHub } from "./services/integration-hub-service";

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
  registerSequenceExecutors();
  registerDedupExecutors();
  registerGHLExecutors();
  initScheduler().catch(err => logger.error(err, "Scheduler init failed"));

  registerAllTools();
  initToolChainTemplates();
  initProductionStudio();
  initFinanceLegalService();
  initIntegrationHub();
  logger.info("Phase 8: Tool chain framework initialized with 44 tools and 12 chain templates");

  initEmbeddingColumn().catch(err => logger.error(err, "Embedding column init failed"));

  startAgentExecution(45000);
  logger.info("Phase 8: Agent executor started — 50 agents mapped to real tools");

  logger.info("All engines initialized: tri-mode, tool-chains, agent-executor, embedding, intelligence, outreach-pipeline, comms-intelligence, messaging, booking, production-studio, finance-legal-quality, integration-hub");
});
