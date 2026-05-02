import { randomUUID } from "crypto";

export interface PacketRecord {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: "TCP" | "UDP" | "ICMP" | "OTHER";
  length: number;
  flags: string;
  ttl: number;
  is_anomaly: boolean;
  z_score: number;
  severity: "NORMAL" | "LOW" | "MED" | "HIGH" | "CRITICAL";
  country: string;
  is_external: boolean;
}

export interface AnomalyResult {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  protocol: string;
  is_anomaly: boolean;
  z_score: number;
  reason: string;
  severity: "LOW" | "MED" | "HIGH" | "CRITICAL";
  packet_length: number;
}

export interface GeoThreat {
  ip: string;
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  asn: string;
  org: string;
  port_score: number;
  threat_count: number;
  severity: "LOW" | "MED" | "HIGH" | "CRITICAL";
}

export interface ThreatLevel {
  score: number;
  label: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL";
  top_threats: string[];
  anomaly_ratio: number;
  active_compliance_flags: number;
  packets_analyzed: number;
}

export interface ComplianceRule {
  id: string;
  framework: "PCI-DSS" | "NIST";
  description: string;
  triggered: boolean;
  evidence: string;
  severity: "WARN" | "FAIL" | "PASS";
}

export interface ComplianceReport {
  timestamp: string;
  total_packets_analyzed: number;
  rules_triggered: ComplianceRule[];
  all_rules: ComplianceRule[];
  risk_rating: "PASS" | "WARN" | "FAIL";
  anomaly_rate_percent: number;
}

export interface ProtocolBreakdown {
  TCP: number;
  UDP: number;
  ICMP: number;
  OTHER: number;
  total: number;
}

export interface AnomalyDataPoint {
  time: string;
  z_score: number;
  is_anomaly: boolean;
  packet_rate: number;
}

const INTERNAL_IPS = [
  "192.168.1.10", "192.168.1.25", "192.168.1.100",
  "10.0.0.5", "10.0.0.12", "10.0.0.50",
  "172.16.0.1", "172.16.0.20",
];

const EXTERNAL_THREAT_IPS: Array<{ ip: string; latitude: number; longitude: number; country: string; city: string; asn: string; org: string }> = [
  { ip: "45.33.32.156", latitude: 37.3861, longitude: -122.0838, country: "United States", city: "Mountain View", asn: "AS63949", org: "Linode" },
  { ip: "185.220.101.47", latitude: 51.5085, longitude: -0.1257, country: "United Kingdom", city: "London", asn: "AS200052", org: "Tor Exit Node" },
  { ip: "91.108.4.1", latitude: 55.7522, longitude: 37.6156, country: "Russia", city: "Moscow", asn: "AS62041", org: "Telegram Networks" },
  { ip: "103.21.244.0", latitude: 22.2855, longitude: 114.1577, country: "Hong Kong", city: "Hong Kong", asn: "AS13335", org: "Cloudflare" },
  { ip: "5.188.206.25", latitude: 52.3702, longitude: 4.8952, country: "Netherlands", city: "Amsterdam", asn: "AS197695", org: "Domain Names Ltd" },
  { ip: "195.54.162.41", latitude: 48.8534, longitude: 2.3488, country: "France", city: "Paris", asn: "AS9009", org: "M247 Ltd" },
  { ip: "123.206.104.114", latitude: 30.2994, longitude: 120.1612, country: "China", city: "Hangzhou", asn: "AS58461", org: "ChinaTelecom" },
  { ip: "198.96.155.3", latitude: 40.7128, longitude: -74.0060, country: "United States", city: "New York", asn: "AS3130", org: "ARIN" },
  { ip: "62.102.148.68", latitude: 41.0082, longitude: 28.9784, country: "Turkey", city: "Istanbul", asn: "AS9121", org: "Turk Telekom" },
  { ip: "196.240.57.20", latitude: -26.2041, longitude: 28.0473, country: "South Africa", city: "Johannesburg", asn: "AS327960", org: "ZA Central" },
];

const SENSITIVE_PORTS = [22, 23, 3389, 445, 1433, 3306, 6379, 27017, 21, 8080];
const COMMON_PORTS = [80, 443, 8080, 53, 25, 587, 143, 993, 110, 995, 3000, 5432];

const PROTOCOLS: Array<"TCP" | "UDP" | "ICMP" | "OTHER"> = ["TCP", "TCP", "TCP", "UDP", "UDP", "ICMP", "OTHER"];
const TCP_FLAGS = ["SYN", "ACK", "SYN-ACK", "FIN", "RST", "PSH-ACK", "SYN-ACK", "ACK", "ACK"];

const MAX_PACKETS = 500;
const packets: PacketRecord[] = [];
const anomalyTimeline: AnomalyDataPoint[] = [];
let totalGenerated = 0;
let anomalyCount = 0;

// Sliding window stats
const recentLengths: number[] = [];
const recentTimestamps: number[] = [];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isRFC1918(ip: string): boolean {
  return ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.");
}

function computeZScore(length: number): number {
  if (recentLengths.length < 5) return 0;
  const mean = recentLengths.reduce((a, b) => a + b, 0) / recentLengths.length;
  const variance = recentLengths.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentLengths.length;
  const std = Math.sqrt(variance) || 1;
  return (length - mean) / std;
}

function computePacketRate(): number {
  const now = Date.now();
  const windowStart = now - 10000;
  const recent = recentTimestamps.filter(t => t > windowStart);
  return recent.length / 10;
}

function getSeverity(zScore: number, isAnomaly: boolean): "NORMAL" | "LOW" | "MED" | "HIGH" | "CRITICAL" {
  if (!isAnomaly) return "NORMAL";
  const abs = Math.abs(zScore);
  if (abs > 5) return "CRITICAL";
  if (abs > 4) return "HIGH";
  if (abs > 3) return "MED";
  return "LOW";
}

function generatePacket(forceAnomaly = false): PacketRecord {
  const now = Date.now();
  const useExternal = Math.random() > 0.6;
  const threatGeo = randomChoice(EXTERNAL_THREAT_IPS);

  let srcIp: string;
  let dstIp: string;
  let isExternal: boolean;
  let country: string;

  if (useExternal) {
    if (Math.random() > 0.5) {
      srcIp = threatGeo.ip;
      dstIp = randomChoice(INTERNAL_IPS);
      country = threatGeo.country;
    } else {
      srcIp = randomChoice(INTERNAL_IPS);
      dstIp = threatGeo.ip;
      country = threatGeo.country;
    }
    isExternal = true;
  } else {
    srcIp = randomChoice(INTERNAL_IPS);
    dstIp = randomChoice(INTERNAL_IPS);
    isExternal = false;
    country = "Internal";
  }

  const protocol = randomChoice(PROTOCOLS);
  let dstPort: number;
  let srcPort: number;
  let flags = "";
  let length: number;

  if (forceAnomaly || Math.random() < 0.08) {
    // Anomalous traffic
    dstPort = Math.random() < 0.4 ? randomChoice(SENSITIVE_PORTS) : randomInt(1, 65535);
    srcPort = randomInt(1024, 65535);
    length = Math.random() < 0.5 ? randomInt(8000, 65535) : randomInt(1, 20);
    flags = protocol === "TCP" ? randomChoice(["SYN", "RST", "SYN", "FIN", "RST"]) : "";
  } else {
    dstPort = Math.random() < 0.5 ? randomChoice(COMMON_PORTS) : randomInt(1024, 65535);
    srcPort = randomInt(1024, 65535);
    length = randomInt(64, 1500);
    flags = protocol === "TCP" ? randomChoice(TCP_FLAGS) : "";
  }

  const ttl = randomInt(32, 128);
  const zScore = computeZScore(length);
  const isAnomaly = forceAnomaly || Math.abs(zScore) > 2.5 || (Math.random() < 0.05);
  const severity = getSeverity(zScore, isAnomaly);

  recentLengths.push(length);
  recentTimestamps.push(now);
  if (recentLengths.length > 200) recentLengths.shift();
  if (recentTimestamps.length > 500) recentTimestamps.shift();

  if (isAnomaly) anomalyCount++;
  totalGenerated++;

  return {
    id: randomUUID(),
    timestamp: new Date(now).toISOString(),
    src_ip: srcIp,
    dst_ip: dstIp,
    src_port: srcPort,
    dst_port: dstPort,
    protocol,
    length,
    flags,
    ttl,
    is_anomaly: isAnomaly,
    z_score: parseFloat(zScore.toFixed(3)),
    severity,
    country,
    is_external: isExternal,
  };
}

function updateAnomalyTimeline(): void {
  const now = new Date();
  const packetRate = computePacketRate();
  const recentPackets = packets.slice(-60);
  const anomalyPackets = recentPackets.filter(p => p.is_anomaly);
  const avgZScore = anomalyPackets.length > 0
    ? anomalyPackets.reduce((sum, p) => sum + p.z_score, 0) / anomalyPackets.length
    : (Math.random() - 0.5) * 1.5;

  const dataPoint: AnomalyDataPoint = {
    time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
    z_score: parseFloat(avgZScore.toFixed(3)),
    is_anomaly: Math.abs(avgZScore) > 2.5,
    packet_rate: parseFloat(packetRate.toFixed(1)),
  };

  anomalyTimeline.push(dataPoint);
  if (anomalyTimeline.length > 120) anomalyTimeline.shift();
}

// Generate initial batch of packets
function seedInitialPackets(): void {
  // Generate some baseline packets first so stats work
  for (let i = 0; i < 100; i++) {
    const p = generatePacket(false);
    packets.push(p);
    updateAnomalyTimeline();
  }
  // Sprinkle some forced anomalies
  for (let i = 0; i < 10; i++) {
    const p = generatePacket(true);
    packets.push(p);
  }
}

seedInitialPackets();

// Continuous simulation loop
let burstMode = false;
let burstCount = 0;

function simulationTick(): void {
  // Occasionally trigger a burst (simulating an attack)
  if (Math.random() < 0.02 && !burstMode) {
    burstMode = true;
    burstCount = randomInt(20, 50);
  }

  const count = burstMode ? randomInt(5, 10) : randomInt(1, 4);

  for (let i = 0; i < count; i++) {
    const forceAnomaly = burstMode || Math.random() < 0.08;
    const packet = generatePacket(forceAnomaly);
    packets.push(packet);
    if (packets.length > MAX_PACKETS) packets.shift();
  }

  updateAnomalyTimeline();

  if (burstMode) {
    burstCount -= count;
    if (burstCount <= 0) burstMode = false;
  }
}

setInterval(simulationTick, 500);

// ─── Public API ─────────────────────────────────────────────────────────────

export function getPackets(): PacketRecord[] {
  return [...packets].reverse().slice(0, 100);
}

export function getThreats(): AnomalyResult[] {
  const anomalous = packets
    .filter(p => p.is_anomaly)
    .slice(-50)
    .reverse();

  return anomalous.map(p => ({
    id: p.id,
    timestamp: p.timestamp,
    src_ip: p.src_ip,
    dst_ip: p.dst_ip,
    dst_port: p.dst_port,
    protocol: p.protocol,
    is_anomaly: true,
    z_score: p.z_score,
    reason: getReason(p),
    severity: (p.severity === "NORMAL" ? "LOW" : p.severity) as "LOW" | "MED" | "HIGH" | "CRITICAL",
    packet_length: p.length,
  }));
}

function getReason(p: PacketRecord): string {
  if (SENSITIVE_PORTS.includes(p.dst_port)) {
    return `Connection to sensitive port ${p.dst_port} detected`;
  }
  if (Math.abs(p.z_score) > 5) return "Extreme packet size deviation (z-score > 5σ)";
  if (Math.abs(p.z_score) > 3) return "Statistical anomaly: packet size > 3σ from baseline";
  if (Math.abs(p.z_score) > 2.5) return "Statistical anomaly: packet size exceeds 2.5σ threshold";
  if (p.length > 8000) return "Oversized packet — possible data exfiltration";
  if (p.length < 20) return "Undersized packet — possible malformed/probe traffic";
  if (p.flags === "RST") return "TCP RST flood indicator";
  if (p.flags === "SYN") return "Possible SYN scan or SYN flood";
  return "Anomalous traffic pattern detected";
}

export function getThreatLevel(): ThreatLevel {
  const recent = packets.slice(-200);
  const anomalyRatio = recent.length > 0
    ? recent.filter(p => p.is_anomaly).length / recent.length
    : 0;

  const complianceFlags = getComplianceRules().filter(r => r.triggered).length;

  const portScores = EXTERNAL_THREAT_IPS.map(t => {
    const sensitiveHits = packets.filter(p =>
      (p.src_ip === t.ip || p.dst_ip === t.ip) && SENSITIVE_PORTS.includes(p.dst_port)
    ).length;
    return sensitiveHits * 10;
  });
  const maxPortScore = Math.max(...portScores, 0);

  const rawScore = (anomalyRatio * 40) + (maxPortScore / 10) + (complianceFlags * 15);
  const score = Math.min(100, Math.round(rawScore));

  let label: "NORMAL" | "ELEVATED" | "HIGH" | "CRITICAL";
  if (score <= 30) label = "NORMAL";
  else if (score <= 60) label = "ELEVATED";
  else if (score <= 85) label = "HIGH";
  else label = "CRITICAL";

  const topThreats = getThreats()
    .slice(0, 3)
    .map(t => `${t.src_ip} → ${t.dst_ip}:${t.dst_port} [${t.severity}]`);

  return {
    score,
    label,
    top_threats: topThreats,
    anomaly_ratio: parseFloat(anomalyRatio.toFixed(4)),
    active_compliance_flags: complianceFlags,
    packets_analyzed: totalGenerated,
  };
}

function getComplianceRules(): ComplianceRule[] {
  const recentPackets = packets.slice(-500);

  // PCI-DSS 1.2: Unencrypted traffic on port 80 from/to RFC1918
  const pci12Packets = recentPackets.filter(p =>
    p.dst_port === 80 && (isRFC1918(p.src_ip) || isRFC1918(p.dst_ip))
  );
  const pci12Triggered = pci12Packets.length > 0;

  // PCI-DSS 6.5: Telnet usage (port 23)
  const pci65Packets = recentPackets.filter(p => p.dst_port === 23);
  const pci65Triggered = pci65Packets.length > 0;

  // NIST-SI-3: Anomaly rate > 5%
  const anomalyRate = recentPackets.length > 0
    ? recentPackets.filter(p => p.is_anomaly).length / recentPackets.length
    : 0;
  const nistSI3Triggered = anomalyRate > 0.05;

  // NIST-AC-17: RDP from non-RFC1918 source
  const rdpPackets = recentPackets.filter(p =>
    p.dst_port === 3389 && !isRFC1918(p.src_ip)
  );
  const nistAC17Triggered = rdpPackets.length > 0;

  return [
    {
      id: "PCI-DSS-1.2",
      framework: "PCI-DSS",
      description: "Clear-text data transmission in Cardholder Data Environment",
      triggered: pci12Triggered,
      evidence: pci12Triggered
        ? `${pci12Packets.length} packets on port 80 involving RFC1918 addresses (last: ${pci12Packets[pci12Packets.length - 1]?.src_ip})`
        : "No violations detected",
      severity: pci12Triggered ? "FAIL" : "PASS",
    },
    {
      id: "PCI-DSS-6.5",
      framework: "PCI-DSS",
      description: "Insecure protocol in use (Telnet port 23)",
      triggered: pci65Triggered,
      evidence: pci65Triggered
        ? `${pci65Packets.length} Telnet packets detected (${pci65Packets[0]?.src_ip} → ${pci65Packets[0]?.dst_ip})`
        : "No Telnet traffic detected",
      severity: pci65Triggered ? "FAIL" : "PASS",
    },
    {
      id: "NIST-SI-3",
      framework: "NIST",
      description: "Malicious code event threshold exceeded (anomaly rate > 5%)",
      triggered: nistSI3Triggered,
      evidence: nistSI3Triggered
        ? `Anomaly rate: ${(anomalyRate * 100).toFixed(1)}% of traffic flagged (threshold: 5%)`
        : `Anomaly rate: ${(anomalyRate * 100).toFixed(1)}% — within acceptable threshold`,
      severity: nistSI3Triggered ? "FAIL" : "PASS",
    },
    {
      id: "NIST-AC-17",
      framework: "NIST",
      description: "Remote access from untrusted network (RDP from external IP)",
      triggered: nistAC17Triggered,
      evidence: nistAC17Triggered
        ? `${rdpPackets.length} RDP connections from external IPs (e.g., ${rdpPackets[0]?.src_ip} — ${rdpPackets[0]?.country})`
        : "No external RDP access detected",
      severity: nistAC17Triggered ? "WARN" : "PASS",
    },
  ];
}

export function getComplianceReport(): ComplianceReport {
  const rules = getComplianceRules();
  const triggered = rules.filter(r => r.triggered);
  const failCount = triggered.filter(r => r.severity === "FAIL").length;
  const warnCount = triggered.filter(r => r.severity === "WARN").length;

  let riskRating: "PASS" | "WARN" | "FAIL";
  if (failCount > 0) riskRating = "FAIL";
  else if (warnCount > 0) riskRating = "WARN";
  else riskRating = "PASS";

  const recentPackets = packets.slice(-500);
  const anomalyRate = recentPackets.length > 0
    ? (recentPackets.filter(p => p.is_anomaly).length / recentPackets.length) * 100
    : 0;

  return {
    timestamp: new Date().toISOString(),
    total_packets_analyzed: totalGenerated,
    rules_triggered: triggered,
    all_rules: rules,
    risk_rating: riskRating,
    anomaly_rate_percent: parseFloat(anomalyRate.toFixed(2)),
  };
}

export function getGeoThreats(): GeoThreat[] {
  const threatMap = new Map<string, { count: number; sensitiveHits: number; severity: "LOW" | "MED" | "HIGH" | "CRITICAL" }>();

  for (const packet of packets) {
    const ip = packet.is_external ? (EXTERNAL_THREAT_IPS.find(t => t.ip === packet.src_ip || t.ip === packet.dst_ip)?.ip) : null;
    if (!ip || !packet.is_anomaly) continue;

    const existing = threatMap.get(ip) || { count: 0, sensitiveHits: 0, severity: "LOW" as const };
    existing.count++;
    if (SENSITIVE_PORTS.includes(packet.dst_port)) existing.sensitiveHits++;

    const portScore = existing.count * 3 + existing.sensitiveHits * 10;
    if (portScore > 100) existing.severity = "CRITICAL";
    else if (portScore > 60) existing.severity = "HIGH";
    else if (portScore > 30) existing.severity = "MED";
    else existing.severity = "LOW";

    threatMap.set(ip, existing);
  }

  const results: GeoThreat[] = [];
  for (const [ip, stats] of threatMap.entries()) {
    const geo = EXTERNAL_THREAT_IPS.find(t => t.ip === ip);
    if (!geo) continue;
    const portScore = stats.count * 3 + stats.sensitiveHits * 10;
    results.push({
      ip,
      latitude: geo.latitude,
      longitude: geo.longitude,
      country: geo.country,
      city: geo.city,
      asn: geo.asn,
      org: geo.org,
      port_score: portScore,
      threat_count: stats.count,
      severity: stats.severity,
    });
  }

  return results.sort((a, b) => b.threat_count - a.threat_count).slice(0, 15);
}

export function getProtocolBreakdown(): ProtocolBreakdown {
  const recent = packets.slice(-200);
  const counts = { TCP: 0, UDP: 0, ICMP: 0, OTHER: 0, total: recent.length };
  for (const p of recent) {
    counts[p.protocol]++;
  }
  return counts;
}

export function getAnomalyTimeline(): AnomalyDataPoint[] {
  return [...anomalyTimeline].slice(-60);
}

export function injectPacket(p: PacketRecord): void {
  packets.push(p);
  recentLengths.push(p.length);
  recentTimestamps.push(Date.now());
  if (packets.length > MAX_PACKETS) packets.shift();
  if (recentLengths.length > 200) recentLengths.shift();
  if (recentTimestamps.length > 500) recentTimestamps.shift();
}

export function getAllPackets(): PacketRecord[] {
  return packets;
}

export function getHeatmapData(): { time_labels: string[]; port_labels: number[]; matrix: number[][]; max_count: number } {
  const BUCKETS = 30;
  const BUCKET_MS = 10000;
  const TOP_PORTS = 20;
  const now = Date.now();

  // Build time buckets
  const bucketCounts = new Map<number, Map<number, number>>();
  const portFreq = new Map<number, number>();

  for (const p of packets) {
    const age = now - new Date(p.timestamp).getTime();
    if (age > BUCKETS * BUCKET_MS) continue;
    const bucketIdx = Math.floor(age / BUCKET_MS);
    const revIdx = BUCKETS - 1 - bucketIdx;

    if (!bucketCounts.has(revIdx)) bucketCounts.set(revIdx, new Map());
    const portMap = bucketCounts.get(revIdx)!;
    portMap.set(p.dst_port, (portMap.get(p.dst_port) || 0) + 1);
    portFreq.set(p.dst_port, (portFreq.get(p.dst_port) || 0) + 1);
  }

  // Top ports by frequency
  const port_labels = [...portFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_PORTS)
    .map(([port]) => port);

  const time_labels: string[] = [];
  const matrix: number[][] = [];
  let max_count = 1;

  for (let t = 0; t < BUCKETS; t++) {
    const bucketTime = new Date(now - (BUCKETS - t) * BUCKET_MS);
    time_labels.push(
      `${bucketTime.getHours().toString().padStart(2, "0")}:${bucketTime.getMinutes().toString().padStart(2, "0")}:${bucketTime.getSeconds().toString().padStart(2, "0")}`
    );
    const portMap = bucketCounts.get(t) || new Map();
    const row = port_labels.map(port => {
      const c = portMap.get(port) || 0;
      if (c > max_count) max_count = c;
      return c;
    });
    matrix.push(row);
  }

  return { time_labels, port_labels, matrix, max_count };
}
