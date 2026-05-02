import React, { useState, useEffect, useRef, useCallback } from "react";

interface DarkwebCorrelation {
  threat_category: string;
  feeds_matched: string[];
  is_c2_server: boolean;
  is_malware_host: boolean;
  is_compromised: boolean;
  intel_source: string;
}

interface NarrativeEntry {
  id: string;
  narrative: string;
  timestamp: string;
  severity: string;
  anomaly_id: string;
  displayedText: string;
  isTyping: boolean;
  darkweb_correlation?: DarkwebCorrelation;
  is_tor?: boolean;
  verified_context?: string;
}

function severityColor(s: string) {
  if (s === "CRITICAL") return "var(--aegis-red)";
  if (s === "HIGH")     return "var(--aegis-orange)";
  if (s === "MED")      return "var(--aegis-yellow)";
  return "var(--aegis-cyan)";
}

function TypewriterText({ text, isTyping }: { text: string; isTyping: boolean }) {
  return (
    <span style={{ color: "var(--aegis-green)", fontFamily: "monospace", fontSize: "0.8rem", lineHeight: 1.6 }}>
      {text}
      {isTyping && <span className="animate-blink-cursor" style={{ color: "var(--aegis-green)", marginLeft: 2 }}>█</span>}
    </span>
  );
}

function ProvenanceBadges({ entry }: { entry: NarrativeEntry }) {
  const dc = entry.darkweb_correlation;
  const isVerified = dc && dc.threat_category !== "CLEAN";
  const isTor = entry.is_tor === true;

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
        {isVerified ? (
          <span
            title={`Matched in: ${dc.feeds_matched.join(", ")}`}
            style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 3, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "help", background: "rgba(0,255,136,0.1)", color: "var(--aegis-green)", border: "1px solid rgba(0,255,136,0.3)" }}
          >
            ✓ FEED VERIFIED
          </span>
        ) : (
          <span
            title="No matches found in Emerging Threats, Feodo Tracker, or URLhaus feeds"
            style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 3, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "help", background: "rgba(255,215,0,0.08)", color: "var(--aegis-yellow)", border: "1px solid rgba(255,215,0,0.25)" }}
          >
            ⚠ UNVERIFIED IP
          </span>
        )}

        {isTor && (
          <span
            title="Confirmed Tor exit node via TorProject.org bulk exit list"
            style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 3, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "help", background: "#1a0000", color: "#ff4444", border: "1px solid rgba(255,68,68,0.4)" }}
          >
            ✓ TOR CONFIRMED
          </span>
        )}

        <span
          title="AI analysis based on packet patterns only. Not a confirmed threat intelligence match."
          style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 3, fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "help", background: "rgba(74,85,104,0.2)", color: "var(--aegis-grey)", border: "1px solid rgba(74,85,104,0.3)" }}
        >
          ~ AI INFERENCE
        </span>

        {isVerified && dc && (
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>via {dc.intel_source}</span>
        )}
      </div>

      <div style={{ fontSize: "0.7rem", fontStyle: "italic", color: "var(--text-muted)" }}>
        Narrative generated from observed packet data. Attribution is probabilistic, not confirmed.
      </div>
    </div>
  );
}

interface AnomalyLike {
  id?: string; severity?: string; src_ip?: string;
  dst_ip?: string; dst_port?: number; protocol?: string;
  reason?: string; z_score?: number;
}

export function AIInsights({ latestAnomaly }: { latestAnomaly?: AnomalyLike | null }) {
  const [narratives, setNarratives] = useState<NarrativeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const processedIds = useRef(new Set<string>());
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchNarrative = useCallback(async (anomaly: AnomalyLike) => {
    const id = anomaly.id || Math.random().toString(36).slice(2);
    if (processedIds.current.has(id)) return;
    processedIds.current.add(id);

    setLoading(true);
    const entry: NarrativeEntry = {
      id, narrative: "", timestamp: new Date().toISOString(),
      severity: anomaly.severity || "UNKNOWN", anomaly_id: id,
      displayedText: "", isTyping: true,
    };
    setNarratives(prev => [entry, ...prev].slice(0, 5));

    try {
      const res = await fetch(`${BASE}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(anomaly),
      });
      const data = await res.json() as {
        narrative?: string;
        darkweb_correlation?: DarkwebCorrelation;
        is_tor?: boolean;
        verified_context?: string;
      };
      const fullText: string = data.narrative || "Analysis unavailable.";

      let i = 0;
      const interval = setInterval(() => {
        i++;
        setNarratives(prev => prev.map(n =>
          n.id === id
            ? { ...n, narrative: fullText, displayedText: fullText.slice(0, i), isTyping: i < fullText.length,
                darkweb_correlation: data.darkweb_correlation, is_tor: data.is_tor, verified_context: data.verified_context }
            : n
        ));
        if (i >= fullText.length) clearInterval(interval);
      }, 18);
    } catch {
      setNarratives(prev => prev.map(n =>
        n.id === id ? { ...n, narrative: "Analysis unavailable.", displayedText: "Analysis unavailable.", isTyping: false } : n
      ));
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  useEffect(() => {
    if (!latestAnomaly) return;
    if (latestAnomaly.severity === "CRITICAL" || latestAnomaly.severity === "HIGH") {
      fetchNarrative(latestAnomaly);
    }
  }, [latestAnomaly, fetchNarrative]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [narratives.length]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--bg-border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            AI Threat Intelligence
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--aegis-green)", animation: "pulse-glow 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.65rem", color: "var(--aegis-green)", fontFamily: "monospace" }}>Gemini 2.5 Flash</span>
          </div>
          {loading && (
            <span style={{ fontSize: "0.65rem", color: "var(--aegis-cyan)", fontFamily: "monospace" }} className="animate-pulse">Analyzing...</span>
          )}
        </div>
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
          {narratives.length}/5 entries — auto-triggers on CRITICAL/HIGH
        </span>
      </div>

      {/* Narrative list */}
      <div ref={listRef} style={{ maxHeight: 280, overflowY: "auto" }}>
        {narratives.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
            <div className="animate-pulse">Waiting for CRITICAL or HIGH severity anomaly to trigger AI analysis...</div>
            <div style={{ marginTop: 8, fontSize: "0.65rem", opacity: 0.5 }}>Run an attack simulation to see AI narratives in action</div>
          </div>
        ) : (
          narratives.map((n) => (
            <div
              key={n.id}
              className="animate-slide-in-up"
              style={{ padding: "12px 20px", borderBottom: "1px solid var(--bg-border)" }}
            >
              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
                  {n.timestamp.replace("T", " ").substring(0, 19)} UTC
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "2px 8px", borderRadius: 3,
                  fontSize: "0.65rem", fontWeight: 700, fontFamily: "monospace",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: severityColor(n.severity),
                  border: `1px solid ${severityColor(n.severity)}44`,
                  background: `${severityColor(n.severity)}18`,
                }}>
                  {n.severity}
                </span>
                <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
                  ID: {n.anomaly_id.substring(0, 8)}
                </span>
              </div>

              {/* Narrative card */}
              <div style={{ borderRadius: 6, padding: 12, background: "#001a00", border: "1px solid rgba(0,255,136,0.2)", flexShrink: 0 }}>
                <TypewriterText text={n.displayedText} isTyping={n.isTyping} />
              </div>

              {/* Provenance badges */}
              <ProvenanceBadges entry={n} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
