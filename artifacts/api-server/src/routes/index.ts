import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import packetsRouter from "./packets.js";
import threatsRouter from "./threats.js";
import complianceRouter from "./compliance.js";
import aiRouter from "./ai.js";
import mitreRouter from "./mitre.js";
import analyticsRouter from "./analytics.js";
import simulateRouter from "./simulate.js";
import baselineRouter from "./baselineRoute.js";
import forensicsRouter from "./forensics.js";
import agentRouter from "./agent.js";
import devicesRouter from "./devices.js";
import chainRouter from "./chain.js";
import forecastRouter from "./forecast.js";
import sigmaRouter from "./sigma.js";
import intelRouter from "./intel.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packetsRouter);
router.use(threatsRouter);
router.use(complianceRouter);
router.use(aiRouter);
router.use(mitreRouter);
router.use(analyticsRouter);
router.use(simulateRouter);
router.use(baselineRouter);
router.use(forensicsRouter);
router.use(agentRouter);
router.use(devicesRouter);
router.use(chainRouter);
router.use(forecastRouter);
router.use(sigmaRouter);
router.use(intelRouter);

export default router;
