import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";
import { getPackets, getThreats, getThreatLevel, getComplianceReport } from "../lib/simulator.js";
import { getAgentStatus, getLatestCycle } from "../lib/socAgent.js";
import { getBaselineStatus } from "../lib/baseline.js";
import { computeKillChain } from "../lib/killchain.js";

const router: IRouter = Router();

const QUERY_SYSTEM_PROMPT = `You are AegisView's natural language query engine. Answer the analyst's question using ONLY the network data provided below. Rules: always write complete sentences — never truncate mid-sentence. Be specific: reference actual IPs, ports, protocols and counts from the data. If the answer is not in the data, say: 'This information is not available in the current capture window.' Keep answers to 2-4 complete sentences. No markdown, no bullet points. Plain text only. Never invent data not present in the context.`;

router.post("/query", async (req, res) => {
  const { question } = req.body as { question: string };
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const packets = getPackets().slice(-50);
  const threats = getThreats();
  const threatLevel = getThreatLevel();
  const compliance = getComplianceReport();
  const baseline = getBaselineStatus();
  const agentCycle = getLatestCycle();
  const agentStatus = getAgentStatus();
  const killChain = computeKillChain(packets);

  const context = {
    capture_summary: {
      total_packets: packets.length,
      threat_score: threatLevel.score,
      threat_label: threatLevel.label,
      active_compliance_flags: compliance.rules_triggered.length,
      anomaly_ratio: threatLevel.anomaly_ratio,
      agent_cycles_run: agentStatus.cycle_count,
    },
    kill_chain: killChain.map(s => ({ stage: s.stage, status: s.status, confidence: s.confidence })),
    baseline_mode: baseline.mode,
    latest_agent_attribution: agentCycle
      ? { attribution: agentCycle.attribution, severity: agentCycle.severity, threat_pattern: agentCycle.threat_pattern }
      : null,
    top_anomalies: threats.slice(0, 10).map(t => ({
      src: t.src_ip, dst: t.dst_ip, port: t.dst_port,
      protocol: t.protocol, severity: t.severity, reason: t.reason,
    })),
    compliance_violations: compliance.rules_triggered.map(r => ({
      id: r.id, framework: r.framework, desc: r.description, evidence: r.evidence,
    })),
    recent_packets: packets.slice(-20).map(p => ({
      src: p.src_ip, dst: p.dst_ip, port: p.dst_port,
      protocol: p.protocol, length: p.length, flags: p.flags,
      is_anomaly: p.is_anomaly, country: p.country,
    })),
  };

  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

  if (!baseUrl || !apiKey) {
    res.json({
      answer: "AI query engine unavailable — Gemini integration not configured.",
      data_points_used: packets.length,
      confidence: "LOW",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "", baseUrl } });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10_000)
    );

    const queryPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `${QUERY_SYSTEM_PROMPT}\n\nNetwork Context:\n${JSON.stringify(context, null, 2)}\n\nAnalyst Question: ${question}` }],
      }],
      config: { maxOutputTokens: 1024, temperature: 0.05 },
    });

    const response = await Promise.race([queryPromise, timeoutPromise]);
    const answer = response.text?.trim() || "Unable to generate answer.";
    const confidence = packets.length > 30 ? "HIGH" : packets.length > 10 ? "MED" : "LOW";

    res.json({ answer, data_points_used: packets.length, confidence, timestamp: new Date().toISOString() });
  } catch {
    const fallback = packets.length > 0
      ? `Based on ${packets.length} captured packets, the current threat level is ${threatLevel.label} (score: ${threatLevel.score}). ${threats.length} anomalies are detected. ${compliance.rules_triggered.length} compliance rules are currently triggered.`
      : "Query engine temporarily unavailable. Please try again in a moment.";

    res.json({ answer: fallback, data_points_used: packets.length, confidence: "LOW", timestamp: new Date().toISOString() });
  }
});

export default router;
