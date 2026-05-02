import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are an elite SOC analyst at a Tier-1 MSSP. Given a network anomaly JSON, write EXACTLY 3 sentences: (1) What happened technically, (2) Which known attack pattern or APT group this resembles and why, (3) The exact firewall rule or SIEM sigma rule to mitigate it. Be brutally specific. Use real IP reputation context. Return plain text only, no markdown, no bullet points.`;

async function generateNarrative(anomaly: Record<string, unknown>): Promise<string> {
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!baseUrl || !apiKey) return "Analysis unavailable — AI integration not configured.";

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "", baseUrl } });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nAnomaly data:\n${JSON.stringify(anomaly, null, 2)}` }] },
      ],
      config: { maxOutputTokens: 512 },
    });
    return response.text?.trim() || "Analysis unavailable.";
  } catch (err) {
    return "Analysis unavailable.";
  }
}

router.post("/ai/analyze", async (req, res) => {
  const anomaly = req.body as Record<string, unknown>;
  const narrative = await generateNarrative(anomaly);
  res.json({
    narrative,
    timestamp: new Date().toISOString(),
    anomaly_id: anomaly.id || "unknown",
    severity: anomaly.severity || "UNKNOWN",
  });
});

export default router;
