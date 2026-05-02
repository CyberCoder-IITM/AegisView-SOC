import { randomUUID } from "crypto";
import { getPackets, getThreats } from "./simulator.js";

export interface SigmaRule {
  rule_id: string;
  title: string;
  status: "experimental";
  description: string;
  author: string;
  date: string;
  tags: string[];
  logsource: { category: string; product: string };
  detection_summary: string;
  falsepositives: string[];
  level: "low" | "medium" | "high" | "critical";
  raw_yaml: string;
  generated_at: string;
  trigger_ip: string;
}

const rules = new Map<string, SigmaRule>();

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function buildYaml(rule: Omit<SigmaRule, "raw_yaml">): string {
  return `title: ${rule.title}
id: ${rule.rule_id}
status: ${rule.status}
description: ${rule.description}
author: ${rule.author}
date: ${rule.date}
tags:
${rule.tags.map(t => `    - ${t}`).join("\n")}
logsource:
    category: ${rule.logsource.category}
    product: ${rule.logsource.product}
detection:
    selection:
        ${rule.detection_summary}
    condition: selection
falsepositives:
${rule.falsepositives.map(fp => `    - ${fp}`).join("\n")}
level: ${rule.level}
`;
}

function makeRule(partial: Omit<SigmaRule, "raw_yaml" | "rule_id" | "generated_at" | "status" | "author" | "date">): SigmaRule {
  const base = {
    ...partial,
    rule_id: randomUUID(),
    status: "experimental" as const,
    author: "AegisView AutoGen",
    date: today(),
    generated_at: new Date().toISOString(),
  };
  const raw_yaml = buildYaml(base);
  return { ...base, raw_yaml };
}

function generateRules(): void {
  const packets = getPackets();
  const threats = getThreats();

  // Port scan: multiple dst_ports from same src within window
  const portScans = new Map<string, Set<number>>();
  for (const p of packets) {
    if (!portScans.has(p.src_ip)) portScans.set(p.src_ip, new Set());
    portScans.get(p.src_ip)!.add(p.dst_port);
  }
  for (const [ip, ports] of portScans) {
    if (ports.size > 8) {
      const key = `port_scan_${ip}`;
      if (!rules.has(key)) {
        rules.set(key, makeRule({
          title: `Potential Port Scan from ${ip}`,
          description: `Source IP ${ip} has probed ${ports.size} unique destination ports — indicative of automated port scanning or vulnerability enumeration.`,
          tags: ["attack.reconnaissance", "attack.t1046", "attack.discovery"],
          logsource: { category: "network", product: "suricata" },
          detection_summary: `src_ip: '${ip}'\n        dst_port|count: '>10'\n        timeframe: 30s`,
          falsepositives: ["Network scanners", "Security assessment tools", "Load balancers"],
          level: "medium",
          trigger_ip: ip,
        }));
      }
    }
  }

  // RDP from external
  const rdpExternal = packets.filter(p => p.dst_port === 3389 && p.is_external);
  if (rdpExternal.length > 0) {
    const ip = rdpExternal[0].src_ip;
    const key = `rdp_external_${ip}`;
    if (!rules.has(key)) {
      rules.set(key, makeRule({
        title: `RDP Access from External Network — ${ip}`,
        description: `Remote Desktop Protocol access attempted from external IP ${ip}. External RDP is a common initial access vector and should be blocked at perimeter.`,
        tags: ["attack.initial_access", "attack.t1133", "attack.lateral_movement", "attack.t1021.001"],
        logsource: { category: "network", product: "zeek" },
        detection_summary: `dst_port: 3389\n        src_ip|cidr:\n            - '!192.168.0.0/16'\n            - '!10.0.0.0/8'\n            - '!172.16.0.0/12'`,
        falsepositives: ["VPN-connected remote workers", "Jump server access"],
        level: "high",
        trigger_ip: ip,
      }));
    }
  }

  // Telnet
  const telnet = packets.filter(p => p.dst_port === 23);
  if (telnet.length > 0) {
    const ip = telnet[0].src_ip;
    const key = `telnet_${ip}`;
    if (!rules.has(key)) {
      rules.set(key, makeRule({
        title: `Insecure Telnet Protocol Detected from ${ip}`,
        description: `Telnet (port 23) traffic detected from ${ip}. Telnet transmits credentials in plaintext and should not be in use in any modern environment.`,
        tags: ["attack.defense_evasion", "attack.t1071", "attack.credential_access"],
        logsource: { category: "network", product: "zeek" },
        detection_summary: `dst_port: 23\n        proto: tcp`,
        falsepositives: ["Legacy industrial control systems", "Network device management (replace with SSH)"],
        level: "high",
        trigger_ip: ip,
      }));
    }
  }

  // SYN flood
  const synPackets = packets.filter(p => p.flags === "SYN");
  const synBySrc = new Map<string, number>();
  for (const p of synPackets) synBySrc.set(p.src_ip, (synBySrc.get(p.src_ip) || 0) + 1);
  for (const [ip, count] of synBySrc) {
    if (count > 15) {
      const key = `syn_flood_${ip}`;
      if (!rules.has(key)) {
        rules.set(key, makeRule({
          title: `TCP SYN Flood from ${ip}`,
          description: `${count} SYN packets detected from ${ip} without completing TCP handshake — indicative of SYN flood DDoS or stealth port scan.`,
          tags: ["attack.impact", "attack.t1498", "attack.reconnaissance", "attack.t1046"],
          logsource: { category: "network", product: "suricata" },
          detection_summary: `src_ip: '${ip}'\n        tcp_flags: 'S'\n        tcp_flags|not: 'A'\n        count: '>15'\n        timeframe: 10s`,
          falsepositives: ["High-traffic web servers during peak load", "CDN edge nodes"],
          level: "critical",
          trigger_ip: ip,
        }));
      }
    }
  }

  // Data exfiltration: large packets to external
  const exfil = packets.filter(p => p.length > 8000 && p.is_external && !["192.168.", "10.", "172.16."].some(prefix => p.dst_ip.startsWith(prefix)));
  if (exfil.length > 0) {
    const ip = exfil[0].src_ip;
    const key = `exfil_${ip}`;
    if (!rules.has(key)) {
      rules.set(key, makeRule({
        title: `Potential Data Exfiltration from ${ip}`,
        description: `Oversized packets (>8000 bytes) detected from internal host to external destination — may indicate data staging or exfiltration attempt.`,
        tags: ["attack.exfiltration", "attack.t1041", "attack.t1048"],
        logsource: { category: "network", product: "zeek" },
        detection_summary: `src_ip: '${ip}'\n        resp_bytes|gte: 8000\n        id.resp_h|cidr:\n            - '!192.168.0.0/16'\n            - '!10.0.0.0/8'`,
        falsepositives: ["Legitimate large file transfers", "Backup jobs", "Video conferencing"],
        level: "high",
        trigger_ip: ip,
      }));
    }
  }

  // Anomalous CRITICAL severity threats
  for (const t of threats.filter(th => th.severity === "CRITICAL").slice(0, 3)) {
    const key = `critical_${t.src_ip}_${t.dst_port}`;
    if (!rules.has(key)) {
      rules.set(key, makeRule({
        title: `Critical Anomaly — ${t.src_ip} → Port ${t.dst_port}`,
        description: `Statistical anomaly (z-score threshold breach) detected: ${t.reason}. Source ${t.src_ip} targeting ${t.dst_ip}:${t.dst_port}.`,
        tags: ["attack.command_and_control", "attack.t1071.001"],
        logsource: { category: "network", product: "suricata" },
        detection_summary: `src_ip: '${t.src_ip}'\n        dst_port: ${t.dst_port}\n        proto: ${t.protocol.toLowerCase()}`,
        falsepositives: ["Statistical outliers from legitimate traffic spikes"],
        level: "critical",
        trigger_ip: t.src_ip,
      }));
    }
  }
}

export function startSigmaGenerator(): void {
  generateRules();
  setInterval(generateRules, 15_000);
}

export function getSigmaRules(): SigmaRule[] {
  return [...rules.values()].sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

export function getSigmaRule(id: string): SigmaRule | null {
  for (const rule of rules.values()) {
    if (rule.rule_id === id) return rule;
  }
  return null;
}
