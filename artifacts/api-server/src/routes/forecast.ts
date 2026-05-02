import { Router, type IRouter } from "express";
import { forecast } from "../lib/forecaster.js";

const router: IRouter = Router();

router.get("/forecast", (_req, res) => {
  res.json(forecast(12));
});

export default router;
