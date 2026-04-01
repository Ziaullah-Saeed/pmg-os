import { Router } from "express";
import {
  getAllAgents,
  getAgentsByDomain,
  getAgent,
  updateAgentStatus,
  recordAgentRun,
  getAgentStats,
  domainLabels,
} from "../services/agent-registry.js";

const router = Router();

router.get("/", (_req, res) => {
  const agents = getAllAgents();
  res.json(agents);
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

router.get("/:id", (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
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

export default router;
