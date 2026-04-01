import { Router } from "express";
import { getValidTransitions, getAllStates, getStateMachine, getInitialState } from "../services/state-machine";

const router = Router();

router.get("/:entityType", async (req, res) => {
  try {
    const machine = getStateMachine(req.params.entityType);
    if (!machine) {
      res.status(404).json({ error: "No state machine for this entity type" });
      return;
    }
    res.json({
      entityType: req.params.entityType,
      states: getAllStates(req.params.entityType),
      initialState: getInitialState(req.params.entityType),
      transitions: machine.transitions,
      terminalStates: machine.terminal,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:entityType/transitions/:currentState", async (req, res) => {
  try {
    const transitions = getValidTransitions(req.params.entityType, req.params.currentState);
    res.json({ currentState: req.params.currentState, validTransitions: transitions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
