import React, { useState, useEffect, useRef } from "react";

interface KillChainStage {
  stage: string;
  id: string;
  status: "INACTIVE" | "SUSPECTED" | "CONFIRMED";
  evidence: string;
  confidence: number;
  color: string;
}

function HexNode({ stage, active, isFlashing }: { stage: KillChainStage; active: boolean; isFlashing: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isConfirmed = stage.status === "CONFIRMED";
  const isSuspected = stage.status === "SUSPECTED";

  const glowColor = isConfirmed ? "#ff0033" : isSuspected ? "#ffd700" : "#1a1a2e";
  const strokeColor = isConfirmed ? "#ff0033" : isSuspected ? "#ffd700" : "#2a2a4e";
  const fillColor = isConfirmed ? "rgba(255,0,51,0.15)" : isSuspected ? "rgba(255,215,0,0.1)" : "rgba(26,26,46,0.8)";

  const hexPoints = "50,5 95,27 95,73 50,95 5,73 5,27";

  return (
    <div className="relative flex flex-col items-center gap-1" style={{ animation: isConfirmed && isFlashing ? "hex-shake 0.5s ease-in-out" : undefined }}>
      <div
        className="relative cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg width="80" height="80" viewBox="0 0 100 100">
          <defs>
            <filter id={`glow-${stage.id}`}>
              <feGaussianBlur stdDeviation={isConfirmed ? "4" : isSuspected ? "3" : "0"} result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <polygon
            points={hexPoints}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            filter={active ? `url(#glow-${stage.id})` : undefined}
            style={active ? { animation: "pulse-glow 2s ease-in-out infinite" } : undefined}
          />
          <text x="50" y="40" textAnchor="middle" fill={active ? glowColor : "#4a4a6e"} fontSize="11" fontWeight="bold" fontFamily="monospace">
            {stage.id}
          </text>
          <text x="50" y="55" textAnchor="middle" fill={active ? "#ffffff" : "#3a3a5e"} fontSize="8" fontFamily="monospace">
            {stage.status}
          </text>
          {active && (
            <text x="50" y="70" textAnchor="middle" fill={glowColor} fontSize="9" fontFamily="monospace">
              {stage.confidence}%
            </text>
          )}
        </svg>

        {showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-64 bg-[#0a0e1a] border border-border rounded p-3 text-xs font-mono shadow-xl pointer-events-none">
            <div className="font-bold mb-1" style={{ color: glowColor }}>{stage.stage}</div>
            <div className="text-muted-foreground mb-1">ATT&CK ID: {stage.id}</div>
            <div className="text-foreground">{stage.evidence}</div>
            {active && <div className="mt-1 font-bold" style={{ color: glowColor }}>Confidence: {stage.confidence}%</div>}
          </div>
        )}
      </div>
      <div className="text-[9px] font-mono font-bold text-center uppercase tracking-wider" style={{ color: active ? glowColor : "#3a3a5e", maxWidth: 80 }}>
        {stage.stage}
      </div>
    </div>
  );
}

function FlowLine({ fromStatus, toStatus }: { fromStatus: KillChainStage["status"]; toStatus: KillChainStage["status"] }) {
  const isActive = fromStatus === "CONFIRMED";
  const color = isActive ? "#ff0033" : fromStatus === "SUSPECTED" ? "#ffd70044" : "#1a1a2e";

  return (
    <div className="flex-1 flex items-center justify-center" style={{ height: 80, marginBottom: 20 }}>
      <svg width="100%" height="4" style={{ overflow: "visible" }}>
        <line
          x1="0" y1="2" x2="100%" y2="2"
          stroke={color}
          strokeWidth={isActive ? 2 : 1}
          strokeDasharray={isActive ? "none" : "4,4"}
          style={isActive ? { animation: "particle-flow 1.5s linear infinite", strokeDasharray: "10,5", strokeDashoffset: 0 } : undefined}
        />
        {isActive && (
          <circle r="3" fill="#ff0033">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M 0 2 L 200 2" />
          </circle>
        )}
      </svg>
    </div>
  );
}

export function MitreKillChain() {
  const [stages, setStages] = useState<KillChainStage[]>([]);
  const [flashing, setFlashing] = useState(false);
  const prevStatusRef = useRef<string[]>([]);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const fetchChain = async () => {
      try {
        const res = await fetch(`${BASE}/api/mitre/killchain`);
        const data: KillChainStage[] = await res.json();
        setStages(data);

        const newStatuses = data.map(s => s.status);
        const prev = prevStatusRef.current;
        if (prev.length > 0) {
          const hasNewConfirmed = newStatuses.some((s, i) => s === "CONFIRMED" && prev[i] !== "CONFIRMED");
          if (hasNewConfirmed) {
            setFlashing(true);
            setTimeout(() => setFlashing(false), 1000);
          }
        }
        prevStatusRef.current = newStatuses;
      } catch { /* ignore */ }
    };
    fetchChain();
    const iv = setInterval(fetchChain, 3000);
    return () => clearInterval(iv);
  }, [BASE]);

  const hasActive = stages.some(s => s.status !== "INACTIVE");

  return (
    <div
      className="w-full border-b border-border bg-card px-6 py-3"
      style={{
        borderColor: flashing ? "rgba(255,0,51,0.8)" : undefined,
        boxShadow: flashing ? "0 0 20px rgba(255,0,51,0.3)" : undefined,
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">MITRE ATT&CK Kill Chain</span>
          {hasActive && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-destructive/40 text-destructive animate-pulse">
              ACTIVE THREAT
            </span>
          )}
        </div>
        <div className="text-[9px] text-muted-foreground font-mono">Polls every 3s</div>
      </div>

      <div className="flex items-start gap-0">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.id}>
            <HexNode stage={stage} active={stage.status !== "INACTIVE"} isFlashing={flashing} />
            {i < stages.length - 1 && (
              <FlowLine fromStatus={stage.status} toStatus={stages[i + 1].status} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
