import { Router, type IRouter } from "express";
import { getDevices, getDevice, getDeviceTimeline } from "../lib/fingerprinter.js";

const router: IRouter = Router();

router.get("/devices", (_req, res) => {
  res.json(getDevices());
});

router.get("/devices/:ip", (req, res) => {
  const profile = getDevice(req.params.ip);
  if (!profile) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(profile);
});

router.get("/devices/:ip/timeline", (req, res) => {
  res.json(getDeviceTimeline(req.params.ip));
});

export default router;
