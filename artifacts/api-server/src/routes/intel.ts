import { Router, type IRouter } from "express";
import { getIntelSummary, getFeedHits, correlateIp } from "../lib/darkwebCorrelator.js";
import { getPackets } from "../lib/simulator.js";

const router: IRouter = Router();

router.get("/intel/darkweb/summary", (_req, res) => {
  const packets = getPackets();
  const uniqueIps = [...new Set(packets.map(p => p.src_ip))];
  const hits = getFeedHits(uniqueIps);
  const summary = getIntelSummary();

  const topMatched = hits.slice(0, 10).map(h => ({
    ip: h.ip,
    category: h.threat_category,
    packet_count: packets.filter(p => p.src_ip === h.ip).length,
  }));

  res.json({ ...summary, top_matched_ips: topMatched });
});

router.get("/intel/darkweb/ip/:ip", (req, res) => {
  res.json(correlateIp(req.params.ip));
});

router.get("/intel/darkweb/hits", (_req, res) => {
  const packets = getPackets();
  const uniqueIps = [...new Set(packets.map(p => p.src_ip))];
  res.json(getFeedHits(uniqueIps));
});

export default router;
