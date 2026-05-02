import { Router, type IRouter } from "express";
import { computeKillChain } from "../lib/killchain.js";
import { getAllPackets } from "../lib/simulator.js";

const router: IRouter = Router();

router.get("/mitre/killchain", (_req, res) => {
  const packets = getAllPackets();
  const chain = computeKillChain(packets);
  res.json(chain);
});

export default router;
