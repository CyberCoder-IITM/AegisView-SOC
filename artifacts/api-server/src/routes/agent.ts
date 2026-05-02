import { Router, type IRouter } from "express";
import { getAgentCycles, getLatestCycle, getAgentStatus, triggerCycle } from "../lib/socAgent.js";

const router: IRouter = Router();

router.get("/agent/cycles", (_req, res) => {
  res.json(getAgentCycles());
});

router.get("/agent/latest", (_req, res) => {
  const cycle = getLatestCycle();
  if (!cycle) { res.status(204).end(); return; }
  res.json(cycle);
});

router.get("/agent/status", (_req, res) => {
  res.json(getAgentStatus());
});

router.post("/agent/trigger", (_req, res) => {
  triggerCycle();
  res.json({ triggered: true });
});

export default router;
