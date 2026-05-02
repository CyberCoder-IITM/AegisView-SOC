import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";
import { correlateIp } from "../lib/darkwebCorrelator.js";

const router: IRouter = Router();

// Patch 1: Strict grounded system prompt — no fabrication allowed
const SYSTEM_PROMPT = `You are an elite SOC analyst. You will be given a network anomaly JSON object. Your job is to write EXACTLY 3 sentences.

STRICT RULES YOU MUST NEVER VIOLATE:

1. NEVER say an IP is 'known malicious', 'blacklisted', or 'known threat actor' UNLESS the JSON contains a field darkweb_correlation.threat_category that is NOT 'CLEAN'. If that field is absent or CLEAN, say 'unverified external IP of unknown reputation' instead. Never fabricate this.

2. NEVER attribute to a specific APT group, nation-state, or threat actor UNLESS the JSON contains explicit attribution data. If absent, say 'unknown threat actor' only.

3. NEVER invent specific details not present in the JSON. No fabricated malware names, no invented campaign names, no made-up CVE numbers.

4. You MAY say an attack 'resembles' or 'is consistent with' a known technique if the packet pattern genuinely matches. Use hedged language: 'consistent with', 'resembles', 'pattern matches', 'may indicate'. Never state as fact.

5. Base sentence 1 on: actual packet fields in the JSON only.

6. Base sentence 2 on: the anomaly reason, severity, ports, and any darkweb_correlation or verified_context fields present. If those fields are absent or CLEAN, say so explicitly.

7. Base sentence 3 on: a specific, technically accurate firewall rule or SIEM sigma detection for this exact port/protocol combination. This you CAN generate from technical knowledge — it is a recommendation not a fact.

FORMAT: Plain text. 3 sentences. No markdown. No bullet points. No preamble. Start directly with sentence 1.`;

interface Enrichment {
  darkweb_correlation: {
    threat_category: string;
    feeds_matched: string[];
    is_c2_server: boolean;
    is_malware_host: boolean;
    is_compromised: boolean;
    intel_source: string;
  };
  verified_context: string;
  is_tor: boolean;
}

// Patch 4: Enrich anomaly with verified reputation data before calling Gemini
function enrichBeforeNarration(anomaly: Record<string, unknown>): Enrichment {
  const srcIp = String(anomaly.src_ip ?? "");

  const correlation = correlateIp(srcIp);

  let verifiedContext: string;
  if (correlation.threat_category !== "CLEAN") {
    verifiedContext =
      `VERIFIED: This IP appears in ${correlation.intel_source} ` +
      `as category ${correlation.threat_category}. ` +
      `Feeds matched: ${correlation.feeds_matched.join(", ")}.`;
  } else {
    verifiedContext =
      "UNVERIFIED: This IP has no matches in current threat intelligence feeds (Emerging Threats, Feodo Tracker, URLhaus). Treat as unknown.";
  }

  return {
    darkweb_correlation: {
      threat_category: correlation.threat_category,
      feeds_matched: correlation.feeds_matched,
      is_c2_server: correlation.is_c2_server,
      is_malware_host: correlation.is_malware_host,
      is_compromised: correlation.is_compromised,
      intel_source: correlation.intel_source,
    },
    verified_context: verifiedContext,
    is_tor: false,
  };
}

async function generateNarrative(
  anomaly: Record<string, unknown>,
  enrichment: Enrichment,
): Promise<string> {
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!baseUrl || !apiKey) return "Analysis unavailable — AI integration not configured.";

  // Merge verified context into payload so Gemini sees real data
  const enrichedPayload = {
    ...anomaly,
    darkweb_correlation: enrichment.darkweb_correlation,
    verified_context: enrichment.verified_context,
  };

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "", baseUrl } });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\nAnomaly data:\n${JSON.stringify(enrichedPayload, null, 2)}` }],
        },
      ],
      config: { maxOutputTokens: 512, temperature: 0.1 },
    });
    return response.text?.trim() || "Analysis unavailable.";
  } catch {
    return "Analysis unavailable.";
  }
}

router.post("/ai/analyze", async (req, res) => {
  const anomaly = req.body as Record<string, unknown>;

  // Enrich first, then narrate
  const enrichment = enrichBeforeNarration(anomaly);
  const narrative = await generateNarrative(anomaly, enrichment);

  res.json({
    narrative,
    timestamp: new Date().toISOString(),
    anomaly_id: anomaly.id || "unknown",
    severity: anomaly.severity || "UNKNOWN",
    // Provenance data for UI badges (Patch 3)
    darkweb_correlation: enrichment.darkweb_correlation,
    is_tor: enrichment.is_tor,
    verified_context: enrichment.verified_context,
  });
});

export default router;
