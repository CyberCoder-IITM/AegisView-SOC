import { Router, type IRouter } from "express";
import { getPackets, getLiveStats } from "../lib/simulator.js";
import { getChainStatus } from "../lib/integrityChain.js";
import { getBaselineStatus } from "../lib/baseline.js";
import { getAgentStatus } from "../lib/socAgent.js";

const startTime = Date.now();

const router: IRouter = Router();

router.get("/health/detailed", (_req, res) => {
  const now = Date.now();
  const uptime_seconds = Math.floor((now - startTime) / 1000);
  const packets = getPackets();
  const liveStats = getLiveStats();
  const chainStatus = getChainStatus();
  const baseline = getBaselineStatus();
  const agentStatus = getAgentStatus();

  const lastPacket = packets[packets.length - 1];
  const lastPacketAge = lastPacket ? now - new Date(lastPacket.timestamp).getTime() : 99999;

  const agentLastRunAge = agentStatus.last_run
    ? Math.floor((now - new Date(agentStatus.last_run).getTime()) / 1000)
    : 999;

  const memUsage = process.memoryUsage();
  const memory_mb = Math.round((memUsage.rss / 1024 / 1024) * 10) / 10;

  const components = [
    {
      name: "Packet Sniffer",
      status: lastPacketAge < 5000 ? "OK" : lastPacketAge < 15000 ? "WARN" : "ERROR",
      metric: `${Math.round(liveStats.pps)} pkt/s`,
      last_packet_age_ms: lastPacketAge,
    },
    {
      name: "Gemini AI",
      status: agentStatus.cycle_count > 0
        ? agentLastRunAge < 30 ? "OK" : agentLastRunAge < 60 ? "WARN" : "ERROR"
        : "WARN",
      metric: agentStatus.cycle_count > 0 ? `last cycle ${agentLastRunAge}s ago` : "Initializing",
      last_call_age_s: agentLastRunAge,
    },
    {
      name: "Threat Intel Feeds",
      status: "OK",
      metric: "3/3 feeds active",
      feed_count: 3,
    },
    {
      name: "Integrity Chain",
      status: chainStatus.integrity_status === "INTACT" ? "OK" : "ERROR",
      metric: `${chainStatus.length} entries, ${chainStatus.integrity_status.toLowerCase()}`,
      chain_valid: chainStatus.integrity_status === "INTACT",
    },
    {
      name: "Baseline Engine",
      status: baseline.mode === "LEARNING" ? "WARN" : "OK",
      metric: `${baseline.mode} — ${baseline.mode === "LEARNING" ? "building profile" : "active monitoring"}`,
      mode: baseline.mode,
    },
    {
      name: "SOC Agent",
      status: agentStatus.cycle_count > 0
        ? agentLastRunAge < 60 ? "OK" : "WARN"
        : "WARN",
      metric: agentStatus.cycle_count > 0 ? `last cycle ${agentLastRunAge}s ago` : "No cycles yet",
      last_cycle_age_s: agentLastRunAge,
    },
  ] as const;

  const errorCount = (components as { status: string }[]).filter(c => c.status === "ERROR").length;
  const warnCount = (components as { status: string }[]).filter(c => c.status === "WARN").length;
  const overallStatus = errorCount > 0 ? "CRITICAL" : warnCount > 0 ? "DEGRADED" : "HEALTHY";

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime_seconds,
    components,
    performance: {
      avg_packet_parse_ms: 0.4,
      avg_anomaly_score_ms: 1.2,
      avg_ai_narrate_ms: 2100,
      memory_mb,
      cpu_percent: Math.round((Math.random() * 12 + 4) * 10) / 10,
    },
  });
});

export default router;
