import { Router, type IRouter } from "express";
import { getComplianceReport } from "../lib/simulator.js";

const router: IRouter = Router();

router.get("/compliance/report", (_req, res) => {
  res.json(getComplianceReport());
});

export default router;
