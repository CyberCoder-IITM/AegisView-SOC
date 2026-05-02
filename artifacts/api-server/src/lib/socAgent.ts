import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { getPackets, getThreats, getThreatLevel } from "./simulator.js";
import { computeKillChain } from "./killchain.js";

export interface AgentCycle {
  cycle_id: string;
  timestamp: string;
  threat_pattern: string;
  attribution: string;
  attribution_confidence: number;
  attribution_reasoning: string;
  predicted_next_action: string;
  autonomous_recommendation: string;
  recommendation_type: "FIREWALL" | "SIEM" | "ISOLATE" | "MONITOR";
  severity: "INFO" | "LOW" | "MED" | "HIGH" | "CRITICAL";
}

const cycles: AgentCycle[] = [];
let cycleCount = 0;
let lastRun: string | null = null;
let running = false;

const FALLBACKS: Array<Omit<AgentCycle, "cycle_id" | "timestamp">> = [
  {
    threat_pattern: "Sustained SYN flood from Tor exit node 185.220.101.47 targeting port 443 — high-frequency, low-TTL packets consistent with DDoS pre-staging.",
    attribution: "Unknown Opportunistic",
    attribution_confidence: 42,
    attribution_reasoning: "Tor exit node usage suggests operational security awareness but no advanced TTPs observed yet.",
    predicted_next_action: "Attacker will likely pivot to port 22 (SSH) brute-force within next 5 minutes using credential stuffing.",
    autonomous_recommendation: "iptables -A INPUT -s 185.220.101.47 -p tcp --syn -m limit --limit 1/s --limit-burst 3 -j ACCEPT; iptables -A INPUT -s 185.220.101.47 -p tcp --syn -j DROP",
    recommendation_type: "FIREWALL",
    severity: "HIGH",
  },
  {
    threat_pattern: "Sequential port scan across RFC1918 subnet from external source — dst_ports 21,22,23,3389,445 touched within 30s window indicating automated reconnaissance.",
    attribution: "APT28",
    attribution_confidence: 31,
    attribution_reasoning: "Sequential port enumeration pattern matches APT28's Sofacy toolchain pre-exploitation phase.",
    predicted_next_action: "Initial access attempt via RDP (port 3389) or SMB exploit (port 445) after recon completes.",
    autonomous_recommendation: "index=network sourcetype=firewall dst_port IN (21,22,23,3389,445) | stats dc(dst_port) as port_count by src_ip | where port_count > 4 | sort -port_count",
    recommendation_type: "SIEM",
    severity: "MED",
  },
  {
    threat_pattern: "Periodic beacon traffic to 91.108.4.1:443 at 60s intervals — consistent packet sizes 173-178B suggest C2 keep-alive heartbeat from implanted RAT.",
    attribution: "Lazarus Group",
    attribution_confidence: 57,
    attribution_reasoning: "Periodic C2 interval and packet sizing matches BLINDINGCAN RAT beaconing behavior attributed to Lazarus.",
    predicted_next_action: "C2 server will issue tasking command for credential harvesting via LSASS memory dump within 5 minutes.",
    autonomous_recommendation: "ISOLATE 10.0.0.5 — suspected implanted host. Block all outbound traffic except DNS. Preserve memory image for forensics.",
    recommendation_type: "ISOLATE",
    severity: "CRITICAL",
  },
];

let fallbackIndex = 0;

function addFallbackCycle(): void {
  const fb = FALLBACKS[fallbackIndex % FALLBACKS.length];
  fallbackIndex++;
  cycles.push({
    cycle_id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...fb,
  });
  if (cycles.length > 20) cycles.shift();
  cycleCount++;
  lastRun = new Date().toISOString();
}

async function runCycle(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

    if (!baseUrl || !apiKey) {
      addFallbackCycle();
      return;
    }

    const packets = getPackets().slice(0, 15);
    const threats = getThreats().slice(0, 8);
    const level = getThreatLevel();
    const killchain = computeKillChain(getPackets());

    const context = {
      threat_score: level.score,
      threat_label: level.label,
      anomaly_ratio: level.anomaly_ratio,
      top_anomalies: threats.slice(0, 5).map(t => ({
        src: t.src_ip, dst: t.dst_ip, port: t.dst_port,
        proto: t.protocol, severity: t.severity, reason: t.reason,
      })),
      killchain: killchain.map(s => ({ tactic: s.tactic, status: s.status, confidence: s.confidence })),
      packet_sample: packets.slice(0, 10).map(p => ({
        src: p.src_ip, dst: p.dst_ip, port: p.dst_port,
        proto: p.protocol, flags: p.flags, size: p.length, anomaly: p.is_anomaly,
      })),
    };

    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "", baseUrl } });

    const prompt = `You are an elite SOC analyst AI (NSA/Google Project Zero caliber). Analyze this live network data snapshot and respond ONLY with a valid JSON object — no markdown fences, no explanation, just JSON.

Network state:
${JSON.stringify(context, null, 2)}

Respond with exactly this JSON structure:
{
  "threat_pattern": "one precise technical sentence describing the primary threat pattern",
  "attribution": "one of: APT28 | Lazarus Group | Carbanak | FIN7 | REvil | Unknown Opportunistic",
  "attribution_confidence": <integer 0-100>,
  "attribution_reasoning": "one sentence of TTP-based reasoning",
  "predicted_next_action": "specific next attacker step: port, protocol, and technique name",
  "autonomous_recommendation": "exact actionable response — iptables rule, Splunk SPL query, or isolation command",
  "recommendation_type": "FIREWALL | SIEM | ISOLATE | MONITOR",
  "severity": "INFO | LOW | MED | HIGH | CRITICAL"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 600, temperature: 0.2 },
    });

    const raw = response.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) { addFallbackCycle(); return; }

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    cycles.push({
      cycle_id: randomUUID(),
      timestamp: new Date().toISOString(),
      threat_pattern: String(parsed.threat_pattern || "Network activity within normal parameters."),
      attribution: String(parsed.attribution || "Unknown Opportunistic"),
      attribution_confidence: Math.min(100, Math.max(0, Number(parsed.attribution_confidence) || 10)),
      attribution_reasoning: String(parsed.attribution_reasoning || "Insufficient evidence for confident attribution."),
      predicted_next_action: String(parsed.predicted_next_action || "Continue passive reconnaissance."),
      autonomous_recommendation: String(parsed.autonomous_recommendation || "iptables -A INPUT -j LOG --log-prefix 'AEGIS-MONITOR: '"),
      recommendation_type: (["FIREWALL","SIEM","ISOLATE","MONITOR"].includes(String(parsed.recommendation_type))
        ? String(parsed.recommendation_type) : "MONITOR") as AgentCycle["recommendation_type"],
      severity: (["INFO","LOW","MED","HIGH","CRITICAL"].includes(String(parsed.severity))
        ? String(parsed.severity) : "LOW") as AgentCycle["severity"],
    });
    if (cycles.length > 20) cycles.shift();
    cycleCount++;
    lastRun = new Date().toISOString();
  } catch {
    addFallbackCycle();
  } finally {
    running = false;
  }
}

export function startAgent(): void {
  runCycle();
  setInterval(() => { void runCycle(); }, 10_000);
}

export function triggerCycle(): void {
  void runCycle();
}

export function getAgentCycles(): AgentCycle[] {
  return [...cycles].reverse();
}

export function getLatestCycle(): AgentCycle | null {
  return cycles[cycles.length - 1] ?? null;
}

export function getAgentStatus(): { running: boolean; cycle_count: number; last_run: string | null } {
  return { running, cycle_count: cycleCount, last_run: lastRun };
}
