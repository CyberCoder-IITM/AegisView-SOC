import { getPackets, getProtocolBreakdown } from "./simulator.js";

export type BaselineMode = "LEARNING" | "ACTIVE";

interface BaselineProfile {
  mean_pps: number;
  std_pps: number;
  mean_bps: number;
  std_bps: number;
  normal_protocol_ratios: { TCP: number; UDP: number; ICMP: number };
}

interface DeviationResult {
  metric: string;
  expected: string;
  actual: string;
  delta: number;
  severity: "OK" | "WARN" | "CRITICAL";
}

interface BaselineStatus {
  mode: BaselineMode;
  progress: number;
  learning_time_remaining: number;
  profile: BaselineProfile | null;
  deviations: DeviationResult[];
}

const LEARNING_DURATION = 120; // seconds (reduced from 300 for demo)
const startTime = Date.now();
const ppsSamples: number[] = [];
const bpsSamples: number[] = [];
let profile: BaselineProfile | null = null;
let lastPacketCount = 0;
let lastByteCount = 0;
let lastSampleTime = Date.now();

// Sample every 5 seconds
setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  const packets = getPackets();
  const currentCount = packets.length;
  const currentBytes = packets.reduce((s, p) => s + p.length, 0);
  const dt = Math.max(1, (Date.now() - lastSampleTime) / 1000);

  const pps = (currentCount - lastPacketCount) / dt;
  const bps = (currentBytes - lastByteCount) / dt;

  if (pps >= 0) ppsSamples.push(pps);
  if (bps >= 0) bpsSamples.push(Math.abs(bps));

  lastPacketCount = currentCount;
  lastByteCount = currentBytes;
  lastSampleTime = Date.now();

  // After learning period, compute profile
  if (elapsed >= LEARNING_DURATION && !profile && ppsSamples.length >= 5) {
    const meanOf = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdOf = (arr: number[], mean: number) =>
      Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length) || 1;

    const mean_pps = meanOf(ppsSamples);
    const mean_bps = meanOf(bpsSamples);
    const std_pps = stdOf(ppsSamples, mean_pps);
    const std_bps = stdOf(bpsSamples, mean_bps);

    const bd = getProtocolBreakdown();
    const total = bd.total || 1;
    profile = {
      mean_pps: parseFloat(mean_pps.toFixed(2)),
      std_pps: parseFloat(std_pps.toFixed(2)),
      mean_bps: parseFloat(mean_bps.toFixed(2)),
      std_bps: parseFloat(std_bps.toFixed(2)),
      normal_protocol_ratios: {
        TCP: parseFloat((bd.TCP / total).toFixed(3)),
        UDP: parseFloat((bd.UDP / total).toFixed(3)),
        ICMP: parseFloat((bd.ICMP / total).toFixed(3)),
      },
    };
  }
}, 5000);

export function getBaselineStatus(): BaselineStatus {
  const elapsed = (Date.now() - startTime) / 1000;
  const mode: BaselineMode = profile ? "ACTIVE" : "LEARNING";
  const progress = Math.min(100, Math.round((elapsed / LEARNING_DURATION) * 100));
  const learning_time_remaining = Math.max(0, Math.round(LEARNING_DURATION - elapsed));

  const deviations: DeviationResult[] = [];

  if (profile && ppsSamples.length > 0) {
    const currentPps = ppsSamples[ppsSamples.length - 1] || 0;
    const ppsDelta = Math.abs(currentPps - profile.mean_pps) / profile.std_pps;
    deviations.push({
      metric: "Packets/sec",
      expected: `${profile.mean_pps.toFixed(1)} ± ${profile.std_pps.toFixed(1)}`,
      actual: currentPps.toFixed(1),
      delta: parseFloat(ppsDelta.toFixed(2)),
      severity: ppsDelta > 3 ? "CRITICAL" : ppsDelta > 1.5 ? "WARN" : "OK",
    });

    const currentBps = bpsSamples[bpsSamples.length - 1] || 0;
    const bpsDelta = Math.abs(currentBps - profile.mean_bps) / profile.std_bps;
    deviations.push({
      metric: "Bytes/sec",
      expected: `${(profile.mean_bps / 1024).toFixed(1)}KB ± ${(profile.std_bps / 1024).toFixed(1)}KB`,
      actual: `${(currentBps / 1024).toFixed(1)}KB`,
      delta: parseFloat(bpsDelta.toFixed(2)),
      severity: bpsDelta > 3 ? "CRITICAL" : bpsDelta > 1.5 ? "WARN" : "OK",
    });

    const bd = getProtocolBreakdown();
    const total = bd.total || 1;
    const currentTcpRatio = bd.TCP / total;
    const tcpDelta = Math.abs(currentTcpRatio - profile.normal_protocol_ratios.TCP) / 0.05;
    deviations.push({
      metric: "TCP Ratio",
      expected: `${(profile.normal_protocol_ratios.TCP * 100).toFixed(0)}%`,
      actual: `${(currentTcpRatio * 100).toFixed(0)}%`,
      delta: parseFloat(tcpDelta.toFixed(2)),
      severity: tcpDelta > 3 ? "CRITICAL" : tcpDelta > 1.5 ? "WARN" : "OK",
    });
  }

  return {
    mode,
    progress,
    learning_time_remaining,
    profile,
    deviations,
  };
}
