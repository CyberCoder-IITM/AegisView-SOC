import React, { useEffect, useRef, useState } from "react";

interface AgentCycle {
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

interface AgentStatus { running: boolean; cycle_count: number; last_run: string | null }

const ACTOR_PROFILES: Record<string, string> = {
  "APT28": "Russian GRU Unit 26165 — Fancy Bear",
  "Lazarus Group": "North Korean RGB — financial targeting",
  "Carbanak": "Eastern European — banking sector",
  "FIN7": "Financially motivated — POS systems",
  "REvil": "Russian ransomware-as-a-service",
  "Unknown Opportunistic": "No confirmed attribution — opportunistic noise",
};

const SEV_COLOR: Record<string, string> = {
  INFO: "#666", LOW: "#00ff88", MED: "#ffd700", HIGH: "#ff6b35", CRITICAL: "#ff0033",
};

function predictionIcon(text: string): string {
  if (/port|tcp|udp|\d{2,5}/i.test(text)) return "🔌";
  if (/lateral|pivot|move|smb|rdp/i.test(text)) return "🔀";
  if (/exfil|upload|transfer|c2/i.test(text)) return "📤";
  if (/beacon|c2|command|control/i.test(text)) return "📡";
  return "⚠";
}

function useTypewriter(text: string, speed = 18): string {
  const [displayed, setDisplayed] = useState("");
  const prevText = useRef("");
  useEffect(() => {
    if (text === prevText.current) return;
    prevText.current = text;
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return displayed;
}

function useCountdown(resetKey: string): string {
  const [secs, setSecs] = useState(300);
  useEffect(() => { setSecs(300); }, [resetKey]);
  useEffect(() => {
    const iv = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CopyButton({ text, label = "📋 Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[10px] px-2 py-0.5 rounded border font-mono transition-colors"
      style={{ borderColor: copied ? "#00ff88" : "#333", color: copied ? "#00ff88" : "#888", background: "#0a0e1a" }}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

export function SOCAgentPanel() {
  const [cycles, setCycles] = useState<AgentCycle[]>([]);
  const [status, setStatus] = useState<AgentStatus>({ running: false, cycle_count: 0, last_run: null });
  const [selected, setSelected] = useState<AgentCycle | null>(null);
  const [simulatedRules, setSimulatedRules] = useState<string[]>([]);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const poll = async () => {
      try {
        const [cyclesRes, statusRes] = await Promise.all([
          fetch(`${BASE}/api/agent/cycles`),
          fetch(`${BASE}/api/agent/status`),
        ]);
        const c: AgentCycle[] = await cyclesRes.json();
        const s: AgentStatus = await statusRes.json();
        setCycles(c);
        setStatus(s);
        if (c.length > 0 && !selected) setSelected(c[0]);
        else if (c.length > 0 && selected) {
          const updated = c.find(x => x.cycle_id === selected.cycle_id);
          if (!updated) setSelected(c[0]);
        }
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [BASE]);

  const latest = cycles[0] ?? null;
  const displayCycle = selected ?? latest;
  const typedPattern = useTypewriter(displayCycle?.threat_pattern ?? "Waiting for first analysis cycle...");
  const countdown = useCountdown(displayCycle?.cycle_id ?? "init");

  const handleSimDeploy = (rule: string) => {
    setSimulatedRules(prev => [`[${new Date().toLocaleTimeString()}] DEPLOYED: ${rule}`, ...prev.slice(0, 4)]);
  };

  if (!displayCycle) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "#001400" }}>
        <div className="text-center font-mono">
          <div className="text-[#00ff88] text-sm animate-pulse">🤖 AUTONOMOUS SOC AGENT</div>
          <div className="text-[#444] text-xs mt-2">Initializing analysis engine...</div>
        </div>
      </div>
    );
  }

  const sevColor = SEV_COLOR[displayCycle.severity] ?? "#666";
  const actorProfile = ACTOR_PROFILES[displayCycle.attribution] ?? "Unknown threat actor";

  return (
    <div className="w-full h-full flex flex-col font-mono" style={{ background: "#001400", minHeight: 320 }}>
      <style>{`
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        .scanlines::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.015) 2px, rgba(0,255,0,0.015) 4px); pointer-events: none; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "#00ff0020" }}>
        <div className="flex items-center gap-2">
          <span className="text-[#00ff88] text-xs font-bold tracking-widest">🤖 AUTONOMOUS SOC AGENT</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#00ff8820", color: "#00ff88", border: "1px solid #00ff8840" }}>
            v3.0
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: "#444" }}>Cycles: {status.cycle_count}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: status.running ? "#00ff88" : "#555" }} />
            <span className="text-[10px]" style={{ color: status.running ? "#00ff88" : "#555" }}>
              {status.running ? "ANALYZING" : "STANDBY"}
            </span>
          </div>
        </div>
      </div>

      {/* 4-quadrant grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-px min-h-0" style={{ background: "#00ff0010" }}>

        {/* TOP LEFT: Threat Pattern */}
        <div className="relative overflow-hidden scanlines flex flex-col p-3" style={{ background: "#001400" }}>
          <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#00ff8860" }}>Threat Pattern</div>
          <div className="flex-1 text-[11px] leading-relaxed" style={{ color: "#00ff88" }}>
            {typedPattern}
            <span className="animate-pulse">▋</span>
          </div>
          <div className="mt-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${sevColor}20`, color: sevColor, border: `1px solid ${sevColor}40` }}>
              {displayCycle.severity}
            </span>
          </div>
        </div>

        {/* TOP RIGHT: Attribution */}
        <div className="flex flex-col p-3" style={{ background: "#001400" }}>
          <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#00ff8860" }}>Attribution</div>
          <div className="text-lg font-bold mb-1" style={{ color: "#ff3333" }}>{displayCycle.attribution}</div>
          <div className="text-[10px] mb-3" style={{ color: "#888" }}>{actorProfile}</div>
          <div className="text-[10px] mb-1" style={{ color: "#666" }}>Confidence</div>
          <div className="w-full h-2 rounded-full mb-1" style={{ background: "#0a2a0a" }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${displayCycle.attribution_confidence}%`, background: `linear-gradient(90deg, #00ff88, #ff3333)` }}
            />
          </div>
          <div className="text-[10px] font-bold mb-2" style={{ color: "#ff6b35" }}>
            {displayCycle.attribution_confidence}% confidence
          </div>
          <div className="text-[10px] italic" style={{ color: "#555" }}>{displayCycle.attribution_reasoning}</div>
        </div>

        {/* BOTTOM LEFT: Predicted Next Move */}
        <div className="flex flex-col p-3" style={{ background: "#001400" }}>
          <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#00ff8860" }}>Predicted Next Move</div>
          <div className="flex items-start gap-2 mb-3">
            <span className="text-2xl">{predictionIcon(displayCycle.predicted_next_action)}</span>
            <div className="text-[11px] leading-relaxed" style={{ color: "#ffd700" }}>{displayCycle.predicted_next_action}</div>
          </div>
          <div className="mt-auto flex items-center gap-2">
            <span className="text-[9px]" style={{ color: "#555" }}>Predicted in:</span>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: "#ff6b35" }}>{countdown}</span>
          </div>
        </div>

        {/* BOTTOM RIGHT: Autonomous Action */}
        <div className="flex flex-col p-3" style={{ background: "#001400" }}>
          <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#00ff8860" }}>Autonomous Action</div>
          <div className="text-[9px] px-1.5 py-0.5 rounded inline-flex mb-2 self-start" style={{ background: "#ff6b3520", color: "#ff6b35", border: "1px solid #ff6b3540" }}>
            {displayCycle.recommendation_type}
          </div>

          {displayCycle.recommendation_type === "ISOLATE" ? (
            <div className="rounded p-2 text-[10px]" style={{ background: "#ff000015", border: "1px solid #ff000040", color: "#ff6666" }}>
              🔴 ISOLATE: {displayCycle.autonomous_recommendation}
            </div>
          ) : (
            <div className="rounded p-2 text-[10px] font-mono overflow-auto flex-1" style={{ background: "#0a0e1a", border: "1px solid #1a2a1a", color: "#00d4ff", fontSize: "9px", lineHeight: "1.6" }}>
              {displayCycle.autonomous_recommendation}
            </div>
          )}

          <div className="flex gap-1.5 mt-2">
            <CopyButton text={displayCycle.autonomous_recommendation} />
            {displayCycle.recommendation_type === "FIREWALL" && (
              <button
                onClick={() => handleSimDeploy(displayCycle.autonomous_recommendation.slice(0, 40))}
                className="text-[10px] px-2 py-0.5 rounded border font-mono"
                style={{ borderColor: "#ff6b3540", color: "#ff6b35", background: "#0a0e1a" }}
              >
                ⚡ Simulate Deploy
              </button>
            )}
          </div>
          {simulatedRules.length > 0 && (
            <div className="mt-1 text-[9px]" style={{ color: "#00ff8880" }}>
              {simulatedRules[0]}
            </div>
          )}
        </div>
      </div>

      {/* Cycle timeline */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-t overflow-x-auto" style={{ borderColor: "#00ff0020", background: "#000d00" }}>
        <span className="text-[9px] shrink-0 mr-1" style={{ color: "#444" }}>History:</span>
        {[...cycles].reverse().map((c, i) => (
          <div
            key={c.cycle_id}
            onClick={() => setSelected(c)}
            title={`${c.timestamp.slice(11, 19)} — ${c.severity} — ${c.attribution}`}
            className="w-3 h-3 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-125"
            style={{
              background: SEV_COLOR[c.severity] ?? "#666",
              border: selected?.cycle_id === c.cycle_id ? "1px solid white" : "1px solid transparent",
              opacity: i === 0 ? 1 : 0.6,
            }}
          />
        ))}
        {cycles.length === 0 && <span className="text-[9px]" style={{ color: "#333" }}>No cycles yet</span>}
      </div>
    </div>
  );
}
