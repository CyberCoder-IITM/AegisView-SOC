import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import { getSnapshot } from "../lib/sessionRecorder.js";

interface Incident {
  incident_id: string;
  snapshot_id: string;
  title: string;
  severity: string;
  created_at: string;
  url_token: string;
}

const INCIDENTS: Map<string, Incident> = new Map();

function generateId(): string {
  return randomBytes(4).toString("hex");
}

const router: IRouter = Router();

router.post("/incidents/create", (req, res) => {
  const { snapshot_id, title, severity } = req.body as { snapshot_id: string; title: string; severity: string };
  const incident_id = generateId();
  const incident: Incident = {
    incident_id,
    snapshot_id: snapshot_id || "none",
    title: title || "Unnamed Incident",
    severity: severity || "HIGH",
    created_at: new Date().toISOString(),
    url_token: incident_id,
  };
  INCIDENTS.set(incident_id, incident);
  res.json({ incident_id, share_url: `/incident/${incident_id}` });
});

router.get("/incidents/:id", (req, res) => {
  const incident = INCIDENTS.get(req.params.id);
  if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }
  const snapshot = getSnapshot(incident.snapshot_id);
  res.json({ ...incident, snapshot: snapshot ?? null });
});

router.get("/incidents", (_req, res) => {
  res.json([...INCIDENTS.values()].reverse());
});

export default router;
