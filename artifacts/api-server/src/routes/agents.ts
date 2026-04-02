import { Router } from "express";
import {
  getAllAgents,
  getAgentsByDomain,
  getAgent,
  updateAgentStatus,
  recordAgentRun,
  getAgentStats,
  domainLabels,
  getEnhancedAgent,
  getAllEnhancedAgents,
  getFullAgentProfile,
  getAllFullAgentProfiles,
} from "../services/agent-registry.js";
import { executeAgent } from "../services/agent-executor";
import {
  orchestrate,
  selectProvider,
  getActiveTasks,
  getCompletedTasks,
  getTaskById,
  getOrchestrationStats,
} from "../services/orchestration-engine";

const router = Router();

router.get("/", (_req, res) => {
  const agents = getAllAgents();
  res.json(agents);
});

router.get("/full", (_req, res) => {
  const profiles = getAllFullAgentProfiles();
  res.json(profiles);
});

router.get("/stats", (_req, res) => {
  const stats = getAgentStats();
  res.json(stats);
});

router.get("/domains", (_req, res) => {
  res.json(domainLabels);
});

router.get("/domain/:domain", (req, res) => {
  const agents = getAgentsByDomain(req.params.domain);
  res.json(agents);
});

router.get("/enhanced", (_req, res) => {
  const agents = getAllEnhancedAgents();
  res.json(agents);
});

router.get("/orchestration/stats", (_req, res) => {
  const stats = getOrchestrationStats();
  res.json(stats);
});

router.get("/orchestration/active", (_req, res) => {
  const tasks = getActiveTasks();
  res.json(tasks);
});

router.get("/orchestration/completed", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const tasks = getCompletedTasks(limit);
  res.json(tasks);
});

router.get("/orchestration/task/:taskId", (req, res) => {
  const task = getTaskById(req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

router.post("/orchestration/select-provider", (req, res) => {
  const { taskType, domain, preferences } = req.body;
  if (!taskType || !domain) return res.status(400).json({ error: "taskType and domain required" });
  const providers = selectProvider(taskType, domain, preferences);
  res.json(providers);
});

router.post("/orchestration/execute", async (req, res) => {
  const { agentId, taskType, input, priority, preferences } = req.body;
  if (!agentId || !taskType) return res.status(400).json({ error: "agentId and taskType required" });

  try {
    const result = await orchestrate({ agentId, taskType, input: input ?? {}, priority, preferences });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
});

router.get("/:id/full", (req, res) => {
  const profile = getFullAgentProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "Agent not found" });
  res.json(profile);
});

router.get("/:id/enhanced", (req, res) => {
  const enhanced = getEnhancedAgent(req.params.id);
  if (!enhanced) return res.status(404).json({ error: "Enhanced definition not found" });
  res.json(enhanced);
});

router.put("/:id/status", (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "status required" });
  const ok = updateAgentStatus(req.params.id, status);
  if (!ok) return res.status(404).json({ error: "Agent not found" });
  res.json({ ok: true, agent: getAgent(req.params.id) });
});

router.post("/:id/run", (req, res) => {
  const { durationMs = 500, success = true } = req.body;
  const ok = recordAgentRun(req.params.id, durationMs, success);
  if (!ok) return res.status(404).json({ error: "Agent not found" });
  res.json({ ok: true, agent: getAgent(req.params.id) });
});

router.post("/:id/execute", async (req, res) => {
  try {
    const result = await executeAgent(req.params.id, req.body.input);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
