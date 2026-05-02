import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import packetsRouter from "./packets.js";
import threatsRouter from "./threats.js";
import complianceRouter from "./compliance.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(packetsRouter);
router.use(threatsRouter);
router.use(complianceRouter);

export default router;
