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
  // Patch 3: provenance fields returned by enriched API
  darkweb_correlation?: DarkwebCorrelation;
  is_tor?: boolean;
  verified_context?: string;
}

function severityColor(s: string) {
  if (s === "CRITICAL") return "#ff0033";
  if (s === "HIGH") return "#ff6b35";
  if (s === "MED") return "#ffd700";
  return "#00d4ff";
}

function TypewriterText({ text, isTyping }: { text: string; isTyping: boolean }) {
  return (
    <span className="text-[#00ff88] font-mono text-xs leading-relaxed">
      {text}
      {isTyping && <span className="animate-blink-cursor ml-0.5" style={{ color: "#00ff88" }}>█</span>}
    </span>
  );
}

// Patch 3: Data provenance badge row
function ProvenanceBadges({ entry }: { entry: NarrativeEntry }) {
  const dc = entry.darkweb_correlation;
  const isVerified = dc && dc.threat_category !== "CLEAN";
  const isTor = entry.is_tor === true;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Badge row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {isVerified ? (
          <span
            title={`Matched in: ${dc.feeds_matched.join(", ")}`}
            className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide cursor-help"
            style={{ background: "#00ff8820", color: "#00ff88", border: "1px solid #00ff8840" }}
          >
            ✓ FEED VERIFIED
          </span>
        ) : (
          <span
            title="No matches found in Emerging Threats, Feodo Tracker, or URLhaus feeds"
            className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide cursor-help"
            style={{ background: "#ffd70015", color: "#ffd700", border: "1px solid #ffd70030" }}
          >
            ⚠ UNVERIFIED IP
          </span>
        )}

        {isTor && (
          <span
            title="Confirmed Tor exit node via TorProject.org bulk exit list"
            className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide cursor-help"
            style={{ background: "#ff003315", color: "#ff6666", border: "1px solid #ff003340" }}
          >
            ✓ TOR CONFIRMED
          </span>
        )}

        <span
          title="AI analysis based on packet patterns only. Not a confirmed threat intelligence match."
          className="text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wide cursor-help"
          style={{ background: "#2a2a2a", color: "#666", border: "1px solid #333" }}
        >
          ~ AI INFERENCE
        </span>

        {isVerified && dc && (
          <span className="text-[8px]" style={{ color: "#444" }}>
            via {dc.intel_source}
          </span>
        )}
      </div>

      {/* Disclaimer */}
      <div className="text-[9px] italic" style={{ color: "#444" }}>
        Narrative generated from observed packet data. Attribution is probabilistic, not confirmed.
      </div>
    </div>
  );
}

interface AnomalyLike {
  id?: string;
  severity?: string;
  src_ip?: string;
  dst_ip?: string;
  dst_port?: number;
  protocol?: string;
  reason?: string;
  z_score?: number;
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
      id,
      narrative: "",
      timestamp: new Date().toISOString(),
      severity: anomaly.severity || "UNKNOWN",
      anomaly_id: id,
      displayedText: "",
      isTyping: true,
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

      // Typewriter animation
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setNarratives(prev => prev.map(n =>
          n.id === id
            ? {
                ...n,
                narrative: fullText,
                displayedText: fullText.slice(0, i),
                isTyping: i < fullText.length,
                // Patch 3: attach provenance from enriched response
                darkweb_correlation: data.darkweb_correlation,
                is_tor: data.is_tor,
                verified_context: data.verified_context,
              }
            : n
        ));
        if (i >= fullText.length) clearInterval(interval);
      }, 18);
    } catch {
      setNarratives(prev => prev.map(n =>
        n.id === id
          ? { ...n, narrative: "Analysis unavailable.", displayedText: "Analysis unavailable.", isTyping: false }
          : n
      ));
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  // Auto-trigger on new CRITICAL/HIGH anomaly
  useEffect(() => {
    if (!latestAnomaly) return;
    if (latestAnomaly.severity === "CRITICAL" || latestAnomaly.severity === "HIGH") {
      fetchNarrative(latestAnomaly);
    }
  }, [latestAnomaly, fetchNarrative]);

  // Auto-scroll to newest
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [narratives.length]);

  return (
    <div className="w-full border-t border-border bg-card">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">AI Threat Intelligence</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-success font-mono">Gemini 2.5 Flash</span>
          </div>
          {loading && (
            <span className="text-[10px] text-primary font-mono animate-pulse">Analyzing...</span>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground font-mono">
          {narratives.length}/5 entries — auto-triggers on CRITICAL/HIGH
        </span>
      </div>

      <div ref={listRef} className="divide-y divide-border max-h-72 overflow-y-auto">
        {narratives.length === 0 ? (
          <div className="px-6 py-8 text-center text-xs font-mono text-muted-foreground">
            <div className="animate-pulse">Waiting for CRITICAL or HIGH severity anomaly to trigger AI analysis...</div>
            <div className="mt-2 text-[10px] opacity-50">Run an attack simulation to see AI narratives in action</div>
          </div>
        ) : (
          narratives.map((n) => (
            <div key={n.id} className="px-6 py-3 animate-slide-in-up">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-mono opacity-50">
                  {n.timestamp.replace("T", " ").substring(0, 19)} UTC
                </span>
                <span
                  className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-sm border uppercase"
                  style={{ color: severityColor(n.severity), borderColor: severityColor(n.severity) + "44", background: severityColor(n.severity) + "18" }}
                >
                  {n.severity}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">ID: {n.anomaly_id.substring(0, 8)}</span>
              </div>
              <div
                className="rounded p-3 border"
                style={{ background: "#0a1a0a", borderColor: "#00ff8820" }}
              >
                <TypewriterText text={n.displayedText} isTyping={n.isTyping} />
              </div>
              {/* Patch 3: Data provenance badges */}
              <ProvenanceBadges entry={n} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
