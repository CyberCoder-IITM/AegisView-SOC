import { Router, type IRouter } from "express";
import { getSnapshots, getSnapshot, getTimeline } from "../lib/sessionRecorder.js";

const router: IRouter = Router();

router.get("/replay/snapshots", (_req, res) => {
  res.json(getSnapshots());
});

router.get("/replay/snapshot/:id", (req, res) => {
  const snapshot = getSnapshot(req.params.id);
  if (!snapshot) { res.status(404).json({ error: "Snapshot not found" }); return; }
  res.json(snapshot);
});

router.get("/replay/timeline", (_req, res) => {
  res.json(getTimeline());
});

export default router;
