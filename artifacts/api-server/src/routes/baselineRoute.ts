import { Router, type IRouter } from "express";
import { getBaselineStatus } from "../lib/baseline.js";

const router: IRouter = Router();

router.get("/baseline/status", (_req, res) => {
  res.json(getBaselineStatus());
});

export default router;
