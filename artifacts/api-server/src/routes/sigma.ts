import { Router, type IRouter } from "express";
import { getSigmaRules, getSigmaRule } from "../lib/sigmaGenerator.js";

const router: IRouter = Router();

router.get("/sigma/rules", (_req, res) => {
  res.json(getSigmaRules());
});

router.get("/sigma/rules/:id", (req, res) => {
  const rule = getSigmaRule(req.params.id);
  if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json(rule);
});

router.get("/sigma/rules/:id/yaml", (req, res) => {
  const rule = getSigmaRule(req.params.id);
  if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
  res.setHeader("Content-Type", "text/yaml");
  res.setHeader("Content-Disposition", `attachment; filename="sigma_${req.params.id.substring(0, 8)}.yml"`);
  res.send(rule.raw_yaml);
});

router.get("/sigma/export", (_req, res) => {
  const rules = getSigmaRules();
  const combined = rules.map(r => r.raw_yaml).join("\n---\n");
  res.setHeader("Content-Type", "text/yaml");
  res.setHeader("Content-Disposition", "attachment; filename=\"aegisview_sigma_rules.yml\"");
  res.send(combined);
});

export default router;
