import { Router, type IRouter } from "express";
import { getHeatmapData } from "../lib/simulator.js";

const router: IRouter = Router();

router.get("/analytics/heatmap", (_req, res) => {
  res.json(getHeatmapData());
});

export default router;
