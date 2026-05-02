import { PacketRecord } from "./simulator.js";

export interface DeviceProfile {
  ip: string;
  first_seen: string;
  last_seen: string;
  packet_count: number;
  typical_ports: Record<number, number>;
  typical_protocols: Record<string, number>;
  avg_packet_size: number;
  packet_size_std: number;
  avg_ttl: number;
  typical_dst_ips: string[];
  typical_hours: Record<number, number>;
  behavior_change_score: number;
  is_new_device: boolean;
  anomalous_behaviors: string[];
  device_type_guess: string;
}

interface InternalProfile {
  ip: string;
  first_seen: string;
  last_seen: string;
  packets: Array<{ size: number; ttl: number; port: number; protocol: string; dst_ip: string; hour: number; ts: number }>;
  total_count: number;
}

const profiles = new Map<string, InternalProfile>();
const WINDOW_MS = 60_000;

function guessDeviceType(profile: InternalProfile): string {
  const recent = profile.packets.slice(-100);
  const ports = recent.map(p => p.port);
  const protos = recent.map(p => p.protocol);
  const ttls = recent.map(p => p.ttl);
  const avgTtl = ttls.length ? ttls.reduce((a, b) => a + b, 0) / ttls.length : 64;
  const portSet = new Set(ports);
  const onlyIcmp = protos.every(p => p === "ICMP");
  if (onlyIcmp) return "Monitoring/Ping Tool";
  const udpCount = protos.filter(p => p === "UDP").length;
  if (udpCount / protos.length > 0.7 && portSet.has(5353)) return "IoT Device";
  const webCount = ports.filter(p => p === 80 || p === 443).length;
  if (webCount / ports.length > 0.6) return "Web Server";
  if (avgTtl >= 250) return "Network Device/Router";
  const winPorts = [3389, 445, 135, 139];
  if (avgTtl >= 120 && winPorts.some(p => portSet.has(p))) return "Windows Workstation";
  const linuxPorts = [22, 80, 443, 3306, 5432, 6379, 27017];
  if (avgTtl <= 70 && linuxPorts.some(p => portSet.has(p))) return "Linux Server";
  return "Unknown Host";
}

function computeBehaviorScore(profile: InternalProfile): { score: number; anomalies: string[] } {
  const now = Date.now();
  const recent = profile.packets.filter(p => p.ts > now - WINDOW_MS);
  const historical = profile.packets.filter(p => p.ts <= now - WINDOW_MS);

  if (recent.length < 3 || historical.length < 5) return { score: 0, anomalies: [] };

  const anomalies: string[] = [];
  let totalScore = 0;

  const recentPorts = new Set(recent.map(p => p.port)).size;
  const histPorts = new Set(historical.map(p => p.port)).size;
  const portDiversity = Math.abs(recentPorts - histPorts) / Math.max(histPorts, 1);
  if (portDiversity > 1.5) { anomalies.push("Unusual port diversity increase"); totalScore += 0.3; }
  else totalScore += portDiversity * 0.2;

  const recentAvgSize = recent.reduce((s, p) => s + p.size, 0) / recent.length;
  const histAvgSize = historical.reduce((s, p) => s + p.size, 0) / historical.length;
  const sizeDev = Math.abs(recentAvgSize - histAvgSize) / Math.max(histAvgSize, 1);
  if (sizeDev > 0.5) { anomalies.push("Significant packet size change"); totalScore += 0.25; }
  else totalScore += sizeDev * 0.3;

  const recentProtos = new Set(recent.map(p => p.protocol)).size;
  const histProtos = new Set(historical.map(p => p.protocol)).size;
  if (recentProtos > histProtos + 1) { anomalies.push("New protocol types detected"); totalScore += 0.2; }

  const recentDsts = new Set(recent.map(p => p.dst_ip)).size;
  const histDsts = new Set(historical.map(p => p.dst_ip)).size;
  if (recentDsts > histDsts * 2) { anomalies.push("Connecting to unusual number of destinations"); totalScore += 0.25; }

  const recentRate = recent.length / (WINDOW_MS / 1000);
  const histRate = historical.length / ((profile.packets.filter(p => p.ts <= now - WINDOW_MS).length || 1) / 10);
  if (recentRate > histRate * 3) { anomalies.push("Traffic rate 3x above baseline"); totalScore += 0.2; }

  return { score: Math.min(1, totalScore), anomalies };
}

export function processPacket(p: PacketRecord): void {
  const ip = p.src_ip;
  const hour = new Date().getHours();

  if (!profiles.has(ip)) {
    profiles.set(ip, {
      ip,
      first_seen: p.timestamp,
      last_seen: p.timestamp,
      packets: [],
      total_count: 0,
    });
  }

  const prof = profiles.get(ip)!;
  prof.last_seen = p.timestamp;
  prof.total_count++;
  prof.packets.push({
    size: p.length,
    ttl: p.ttl,
    port: p.dst_port,
    protocol: p.protocol,
    dst_ip: p.dst_ip,
    hour,
    ts: Date.now(),
  });
  if (prof.packets.length > 500) prof.packets.shift();
}

function buildProfile(internal: InternalProfile): DeviceProfile {
  const packets = internal.packets;
  const { score, anomalies } = computeBehaviorScore(internal);
  const deviceType = guessDeviceType(internal);

  const portCounts: Record<number, number> = {};
  const protoCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const dstSet = new Set<string>();
  let sizeSum = 0;
  let ttlSum = 0;

  for (const p of packets) {
    portCounts[p.port] = (portCounts[p.port] || 0) + 1;
    protoCounts[p.protocol] = (protoCounts[p.protocol] || 0) + 1;
    hourCounts[p.hour] = (hourCounts[p.hour] || 0) + 1;
    dstSet.add(p.dst_ip);
    sizeSum += p.size;
    ttlSum += p.ttl;
  }

  const avgSize = packets.length ? sizeSum / packets.length : 0;
  const sizeStd = packets.length
    ? Math.sqrt(packets.reduce((s, p) => s + Math.pow(p.size - avgSize, 2), 0) / packets.length)
    : 0;

  return {
    ip: internal.ip,
    first_seen: internal.first_seen,
    last_seen: internal.last_seen,
    packet_count: internal.total_count,
    typical_ports: portCounts,
    typical_protocols: protoCounts,
    avg_packet_size: parseFloat(avgSize.toFixed(1)),
    packet_size_std: parseFloat(sizeStd.toFixed(1)),
    avg_ttl: packets.length ? parseFloat((ttlSum / packets.length).toFixed(1)) : 64,
    typical_dst_ips: [...dstSet].slice(0, 20),
    typical_hours: hourCounts,
    behavior_change_score: parseFloat(score.toFixed(3)),
    is_new_device: internal.total_count < 10,
    anomalous_behaviors: anomalies,
    device_type_guess: deviceType,
  };
}

export function getDevices(): DeviceProfile[] {
  return [...profiles.values()]
    .map(buildProfile)
    .sort((a, b) => b.behavior_change_score - a.behavior_change_score);
}

export function getDevice(ip: string): DeviceProfile | null {
  const p = profiles.get(ip);
  return p ? buildProfile(p) : null;
}

export function getDeviceTimeline(ip: string): Array<{ timestamp: string; size: number; port: number; protocol: string; dst_ip: string }> {
  const p = profiles.get(ip);
  if (!p) return [];
  return p.packets.slice(-50).map((pkt, i) => ({
    timestamp: new Date(pkt.ts).toISOString(),
    size: pkt.size,
    port: pkt.port,
    protocol: pkt.protocol,
    dst_ip: pkt.dst_ip,
  }));
}
