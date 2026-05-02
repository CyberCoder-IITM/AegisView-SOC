import { randomUUID } from "crypto";
import { getPackets, getThreats, getThreatLevel, getComplianceReport } from "./simulator.js";
import { computeKillChain } from "./killchain.js";
import { getBaselineStatus } from "./baseline.js";
import { getLatestCycle } from "./socAgent.js";
import { logger } from "./logger.js";

export interface Snapshot {
  timestamp: string;
  snapshot_id: string;
  threat_level: number;
  anomaly_count: number;
  active_compliance_flags: number;
  kill_chain_stages: string[];
  top_src_ips: string[];
  packets_per_second: number;
  baseline_mode: string;
  agent_latest_attribution: string | null;
  packet_sample: unknown[];
}

export interface SnapshotIndex {
  snapshot_id: string;
  timestamp: string;
  threat_level: number;
  anomaly_count: number;
}

export interface TimelinePoint {
  timestamp: string;
  threat_level: number;
  anomaly_count: number;
  had_critical: boolean;
}

const MAX_SNAPSHOTS = 360;
const snapshots: Snapshot[] = [];

function takeSnapshot(): void {
  try {
    const packets = getPackets();
    const threats = getThreats();
    const threatLevel = getThreatLevel();
    const compliance = getComplianceReport();
    const killChain = computeKillChain(packets);
    const baseline = getBaselineStatus();
    const latestCycle = getLatestCycle();

    const ipCounts: Record<string, number> = {};
    for (const p of packets) {
      ipCounts[p.src_ip] = (ipCounts[p.src_ip] ?? 0) + 1;
    }
    const top_src_ips = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip]) => ip);

    const fiveSecAgo = Date.now() - 5000;
    const recentCount = packets.filter(p => new Date(p.timestamp).getTime() > fiveSecAgo).length;
    const packets_per_second = recentCount / 5;

    const snapshot: Snapshot = {
      timestamp: new Date().toISOString(),
      snapshot_id: randomUUID(),
      threat_level: threatLevel.score,
      anomaly_count: threats.length,
      active_compliance_flags: compliance.rules_triggered.length,
      kill_chain_stages: killChain.filter(s => s.status !== "INACTIVE").map(s => s.stage),
      top_src_ips,
      packets_per_second,
      baseline_mode: baseline.mode,
      agent_latest_attribution: latestCycle?.attribution ?? null,
      packet_sample: packets.slice(-10),
    };

    snapshots.push(snapshot);
    if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
  } catch (err) {
    logger.warn({ err }, "session recorder snapshot failed");
  }
}

export function startRecorder(): void {
  setTimeout(() => {
    takeSnapshot();
    setInterval(takeSnapshot, 10_000);
  }, 5000);
}

export function getSnapshots(): SnapshotIndex[] {
  return snapshots.map(s => ({
    snapshot_id: s.snapshot_id,
    timestamp: s.timestamp,
    threat_level: s.threat_level,
    anomaly_count: s.anomaly_count,
  }));
}

export function getSnapshot(id: string): Snapshot | undefined {
  return snapshots.find(s => s.snapshot_id === id);
}

export function getTimeline(): TimelinePoint[] {
  return snapshots.map(s => ({
    timestamp: s.timestamp,
    threat_level: s.threat_level,
    anomaly_count: s.anomaly_count,
    had_critical: s.threat_level >= 80,
  }));
}
