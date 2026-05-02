import { Router, type IRouter } from "express";
import { getPackets, getProtocolBreakdown, getAnomalyTimeline } from "../lib/simulator.js";

const router: IRouter = Router();

router.get("/packets", (_req, res) => {
  res.json(getPackets());
});

router.get("/stats/protocol-breakdown", (_req, res) => {
  res.json(getProtocolBreakdown());
});

router.get("/stats/anomaly-timeline", (_req, res) => {
  res.json(getAnomalyTimeline());
});

export default router;
