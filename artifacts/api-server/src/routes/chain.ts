import { Router, type IRouter } from "express";
import { getChainStatus, verifyChain, getLatestEntries } from "../lib/integrityChain.js";

const router: IRouter = Router();

router.get("/chain/status", (_req, res) => {
  res.json(getChainStatus());
});

router.get("/chain/verify", (_req, res) => {
  res.json(verifyChain());
});

router.get("/chain/latest", (_req, res) => {
  res.json(getLatestEntries(10));
});

export default router;
