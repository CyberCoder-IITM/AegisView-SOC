import { Router, type IRouter } from "express";
import { getThreats, getThreatLevel, getGeoThreats } from "../lib/simulator.js";

const router: IRouter = Router();

router.get("/threats", (_req, res) => {
  res.json(getThreats());
});

router.get("/threat-level", (_req, res) => {
  res.json(getThreatLevel());
});

router.get("/geo/threats", (_req, res) => {
  res.json(getGeoThreats());
});

export default router;
