import React, { useEffect, useRef, useState } from "react";

interface ThreatLevel { score: number; label: string }
interface AgentCycle {
  attribution: string;
  attribution_confidence: number;
  autonomous_recommendation: string;
  recommendation_type: string;
  severity: string;
  threat_pattern: string;
}
interface LiveStats { pps: number; uptime_seconds: number; threat_count: number; risk_score: number }
interface AnomalyResult { timestamp: string; src_ip: string; dst_ip: string; dst_port: number; reason: string; severity: string }
interface ChainStatus { integrity_status: "INTACT" | "COMPROMISED" }

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function scoreColor(score: number): string {
  if (score > 85) return "#ff0033";
  if (score > 60) return "#ff6b35";
  if (score > 30) return "#ffd700";
  return "#00ff88";
}

interface WarRoomProps { onClose: () => void }

export function WarRoom({ onClose }: WarRoomProps) {
  const [time, setTime] = useState(new Date());
  const [threat, setThreat] = useState<ThreatLevel | null>(null);
  const [agent, setAgent] = useState<AgentCycle | null>(null);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [chain, setChain] = useState<ChainStatus | null>(null);
  const [score, setScore] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const [tRes, aRes, sRes, anRes, cRes] = await Promise.all([
          fetch(`${BASE}/api/threat-level`),
          fetch(`${BASE}/api/agent/latest`),
          fetch(`${BASE}/api/stats/live`),
          fetch(`${BASE}/api/threats`),
          fetch(`${BASE}/api/chain/status`),
        ]);
        if (tRes.ok) { const d = await tRes.json(); setThreat(d); setScore(d.score); }
        if (aRes.ok && aRes.status !== 204) setAgent(await aRes.json());
        if (sRes.ok) setStats(await sRes.json());
        if (anRes.ok) setAnomalies(await anRes.json());
        if (cRes.ok) setChain(await cRes.json());
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [BASE]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "w" || e.key === "W") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const threatColor = scoreColor(score);
  const r = 120, cx = 150, cy = 155;
  const circ = Math.PI * r;
  const arcOffset = circ - (score / 100) * circ;

  const tickerItems = [
    ...anomalies.slice(0, 8).map(a => `⚠ ${a.timestamp.slice(11, 19)} | ${a.src_ip} → ${a.dst_ip}:${a.dst_port} | ${a.reason}`),
    ...(agent ? [`🤖 ${agent.attribution} — ${agent.attribution_confidence}% | ${agent.autonomous_recommendation.slice(0, 60)}`] : []),
  ];
  const tickerText = tickerItems.join("   ░░░   ") + "   ░░░   ";

  const pulsing = score > 60;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col select-none"
      style={{
        background: "#000000",
        fontFamily: "monospace",
      }}
    >
      <style>{`
        @keyframes warroom-glitch {
          0%,90%,100% { text-shadow: 0 0 20px ${threatColor}; transform: none; }
          92% { text-shadow: -3px 0 #ff0033, 3px 0 #00d4ff; transform: skewX(-1deg); }
          94% { text-shadow: 3px 0 #ff0033, -3px 0 #00d4ff; transform: skewX(1deg); }
          96% { text-shadow: 0 0 20px ${threatColor}; transform: none; }
        }
        @keyframes ring-pulse { 0%,100%{opacity:0.3;transform:scale(1);} 50%{opacity:0.6;transform:scale(1.05);} }
        @keyframes warroom-ticker { 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
        .warroom-scanlines::after {
          content:''; position:absolute; inset:0;
          background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.015) 3px,rgba(255,255,255,0.015) 4px);
          pointer-events:none;
        }
        .warroom-vignette::before {
          content:''; position:absolute; inset:0;
          background:radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%);
          pointer-events:none; z-index:1;
        }
      `}</style>

      {/* ROW 1 — Header strip */}
      <div className="warroom-scanlines warroom-vignette relative flex items-center justify-between px-8 border-b"
        style={{ height: "15%", borderColor: "#ff000020", background: "linear-gradient(180deg, #0a0000 0%, #000 100%)" }}>
        <div className="flex items-center gap-4">
          <span className="text-4xl font-black tracking-widest" style={{ color: "#ff0033", textShadow: "0 0 30px #ff003360" }}>
            🛡 AEGISVIEW
          </span>
          <span className="text-sm" style={{ color: "#ff000060" }}>v2.0 — SOC COMMAND CENTER</span>
        </div>
        <div className="text-5xl font-black tabular-nums" style={{ color: "#ffffff", textShadow: "0 0 15px #ffffff30" }}>
          {time.toTimeString().slice(0, 8)}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "#ffffff40" }}>Threat Level</div>
          <div
            className="text-4xl font-black"
            style={{
              color: threatColor,
              animation: pulsing ? "warroom-glitch 4s infinite" : undefined,
              textShadow: `0 0 20px ${threatColor}`,
            }}
          >
            {threat?.label ?? "---"}
          </div>
        </div>
        <button onClick={onClose} className="absolute top-3 right-4 text-xs" style={{ color: "#333" }}>[ESC] Exit</button>
      </div>

      {/* ROW 2 — Main stage */}
      <div className="flex flex-1 min-h-0 relative" style={{ height: "60%" }}>

        {/* Left 40% — Globe placeholder */}
        <div className="flex items-center justify-center border-r" style={{ width: "40%", borderColor: "#ff000010", background: "#000500" }}>
          <div className="text-center">
            <div className="text-6xl mb-4">🌐</div>
            <div className="text-xs uppercase tracking-widest" style={{ color: "#00ff8840" }}>Global Threat Map</div>
            <div className="mt-3 text-[10px]" style={{ color: "#1a3a1a" }}>Press [ESC] to return to full dashboard view</div>
          </div>
        </div>

        {/* Center 20% — Giant threat gauge */}
        <div className="flex flex-col items-center justify-center" style={{ width: "20%", background: "#000" }}>
          <div className="relative" style={{ width: 300, height: 165 }}>
            {pulsing && [1.1, 1.25, 1.4].map((scale, i) => (
              <div key={i} className="absolute inset-0 rounded-full"
                style={{
                  border: `1px solid ${threatColor}30`,
                  transform: `scale(${scale})`,
                  transformOrigin: "50% 100%",
                  animation: `ring-pulse ${1.5 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }} />
            ))}
            <svg viewBox="0 0 300 165" width="300" height="165">
              <path d={`M 20 155 A 130 130 0 0 1 280 155`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
              <path d={`M 20 155 A 130 130 0 0 1 280 155`} fill="none" stroke={threatColor}
                strokeWidth="14" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={arcOffset}
                style={{ transition: "all 1s ease-out", filter: `drop-shadow(0 0 12px ${threatColor})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
              <div className="font-black tabular-nums" style={{ fontSize: "5rem", color: threatColor, lineHeight: 1, textShadow: `0 0 30px ${threatColor}80` }}>
                {score}
              </div>
              <div className="text-sm uppercase tracking-widest font-bold mt-1" style={{ color: threatColor }}>
                {threat?.label ?? "---"}
              </div>
            </div>
          </div>
        </div>

        {/* Right 40% — SOC Agent output */}
        <div className="flex flex-col justify-center px-8 border-l" style={{ width: "40%", borderColor: "#00ff0010", background: "#000a00" }}>
          {agent ? (
            <>
              <div className="text-xs uppercase tracking-widest mb-4" style={{ color: "#00ff8840" }}>AI Threat Assessment</div>
              <div className="mb-3" style={{ fontSize: "1.4rem", color: "#ff3333", fontWeight: "bold", lineHeight: 1.3 }}>
                {agent.attribution}
                <span className="text-base ml-2" style={{ color: "#ff666660" }}>— {agent.attribution_confidence}% confidence</span>
              </div>
              <div className="mb-4" style={{ fontSize: "1rem", color: "#cccccc", lineHeight: 1.6 }}>
                {agent.threat_pattern}
              </div>
              <div className="rounded p-3" style={{ background: "#00ff0010", border: "1px solid #00ff0020" }}>
                <div className="text-xs mb-1" style={{ color: "#00ff8860" }}>AUTONOMOUS RECOMMENDATION ({agent.recommendation_type})</div>
                <div className="text-sm" style={{ color: "#00ff88", fontFamily: "monospace" }}>
                  {agent.autonomous_recommendation.slice(0, 120)}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center" style={{ color: "#1a2a1a" }}>
              <div className="text-4xl mb-2">🤖</div>
              <div className="text-sm">Initializing SOC Agent...</div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3 — Bottom strip */}
      <div className="flex flex-col border-t" style={{ height: "25%", borderColor: "#ff000020" }}>
        {/* Scrolling ticker */}
        <div className="overflow-hidden flex-shrink-0 py-2 border-b" style={{ background: "#020202", borderColor: "#1a1a1a" }}>
          <div ref={tickerRef} className="whitespace-nowrap" style={{ animation: "warroom-ticker 30s linear infinite" }}>
            <span style={{ color: "#00d4ff" }}>{tickerText}</span>
            <span style={{ color: "#ff6b35" }}>{tickerText}</span>
          </div>
        </div>

        {/* Bottom stat cards */}
        <div className="flex-1 flex items-center justify-around px-8">
          {[
            { label: "PKT/s", value: stats?.pps.toFixed(1) ?? "--", color: "#00d4ff" },
            { label: "THREATS", value: stats?.threat_count ?? "--", color: (stats?.threat_count ?? 0) >= 6 ? "#ff0033" : "#ffd700" },
            { label: "UPTIME", value: stats ? formatUptime(stats.uptime_seconds) : "--", color: "#ffffff" },
            { label: "CHAIN", value: chain?.integrity_status === "INTACT" ? "INTACT" : "ALERT", color: chain?.integrity_status === "INTACT" ? "#00ff88" : "#ff0033" },
            { label: "RISK", value: String(stats?.risk_score ?? score), color: scoreColor(stats?.risk_score ?? score) },
          ].map(card => (
            <div key={card.label} className="text-center">
              <div className="font-black tabular-nums" style={{ fontSize: "2.5rem", color: card.color, textShadow: `0 0 15px ${card.color}60` }}>
                {card.value}
              </div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: "#333" }}>{card.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
