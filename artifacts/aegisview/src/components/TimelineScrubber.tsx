import React, { useState, useEffect, useRef, useCallback } from "react";

export interface ReplaySnapshot {
  snapshot_id: string;
  timestamp: string;
  threat_level: number;
  anomaly_count: number;
  active_compliance_flags: number;
  kill_chain_stages: string[];
  agent_latest_attribution: string | null;
  packet_sample: unknown[];
}

interface TimelinePoint {
  timestamp: string;
  threat_level: number;
  anomaly_count: number;
  had_critical: boolean;
}

interface TimelineScrubberProps {
  onReplay: (snapshot: ReplaySnapshot) => void;
  onLive: () => void;
  isReplaying: boolean;
  replayTimestamp: string | null;
}

export function TimelineScrubber({ onReplay, onLive, isReplaying, replayTimestamp }: TimelineScrubberProps) {
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [scrubberPos, setScrubberPos] = useState(1);
  const [hovering, setHovering] = useState<{ x: number; point: TimelinePoint } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${BASE}/api/replay/timeline`);
        const data: TimelinePoint[] = await r.json();
        setTimeline(data);
      } catch { /* ignore */ }
    };
    load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, [BASE]);

  const goToPosition = useCallback(async (clientX: number) => {
    if (!trackRef.current || timeline.length === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    if (pos >= 0.98) {
      setScrubberPos(1);
      onLive();
      return;
    }

    setScrubberPos(pos);
    const idx = Math.round(pos * (timeline.length - 1));
    const point = timeline[idx];
    if (!point) return;

    try {
      const r = await fetch(`${BASE}/api/replay/snapshots`);
      const snapshots: Array<{ snapshot_id: string; timestamp: string }> = await r.json();
      if (snapshots.length === 0) return;

      const targetTime = new Date(point.timestamp).getTime();
      let closest = snapshots[0];
      let minDiff = Math.abs(new Date(snapshots[0].timestamp).getTime() - targetTime);
      for (const s of snapshots) {
        const diff = Math.abs(new Date(s.timestamp).getTime() - targetTime);
        if (diff < minDiff) { minDiff = diff; closest = s; }
      }

      const snapRes = await fetch(`${BASE}/api/replay/snapshot/${closest.snapshot_id}`);
      const snapshot: ReplaySnapshot = await snapRes.json();
      onReplay(snapshot);
    } catch { /* ignore */ }
  }, [timeline, BASE, onReplay, onLive]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current || timeline.length === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(pos * (timeline.length - 1));
    const point = timeline[idx];
    if (point) setHovering({ x: e.clientX - rect.left, point });
    if (isDragging.current) void goToPosition(e.clientX);
  }, [timeline, goToPosition]);

  const maxThreat = Math.max(1, ...timeline.map(p => p.threat_level));

  const renderSparkline = () => {
    if (timeline.length < 2) return null;
    const pts = timeline.map((p, i) => {
      const x = (i / (timeline.length - 1)) * 100;
      const y = 100 - (p.threat_level / maxThreat) * 95;
      return [x, y] as [number, number];
    });
    const linePoints = pts.map(([x, y]) => `${x},${y}`).join(" ");
    const areaPath = `M ${pts[0][0]},${pts[0][1]} L ${pts.map(([x, y]) => `${x},${y}`).join(" L ")} L 100,100 L 0,100 Z`;

    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="tl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff0033" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff0033" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#tl-fill)" />
        <polyline points={linePoints} fill="none" stroke="rgba(255,0,51,0.5)" strokeWidth="0.5" />
        {timeline.map((p, i) => p.had_critical ? (
          <circle
            key={i}
            cx={(i / (timeline.length - 1)) * 100}
            cy={100 - (p.threat_level / maxThreat) * 95}
            r="1.5" fill="#ff0033"
          />
        ) : null)}
      </svg>
    );
  };

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: 72, zIndex: 9000,
        background: "rgba(8,12,24,0.97)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--bg-border)",
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: "0.62rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>
          📼 SESSION REPLAY
        </span>
        <span style={{
          fontSize: "0.58rem", fontFamily: "monospace", fontWeight: 700,
          padding: "2px 8px", borderRadius: 999,
          background: isReplaying ? "rgba(255,215,0,0.1)" : "rgba(0,255,136,0.07)",
          border: `1px solid ${isReplaying ? "rgba(255,215,0,0.4)" : "rgba(0,255,136,0.25)"}`,
          color: isReplaying ? "#ffd700" : "var(--aegis-green)",
        }}>
          {isReplaying ? "REPLAY" : "LIVE"}
        </span>
      </div>

      <div
        style={{ flex: 1, position: "relative", height: 38, cursor: "crosshair", userSelect: "none" }}
        ref={trackRef}
        onClick={e => void goToPosition(e.clientX)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHovering(null); isDragging.current = false; }}
        onMouseDown={() => { isDragging.current = true; }}
        onMouseUp={() => { isDragging.current = false; }}
      >
        <div style={{
          position: "absolute", inset: 0, borderRadius: 4,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}>
          {renderSparkline()}
        </div>

        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: `${scrubberPos * 100}%`,
          background: "rgba(0,212,255,0.04)",
          borderRadius: 4, pointerEvents: "none",
        }} />

        <div style={{
          position: "absolute", top: "50%",
          left: `${scrubberPos * 100}%`,
          transform: "translate(-50%, -50%)",
          width: 10, height: 22, borderRadius: 3,
          background: isReplaying ? "#ffd700" : "var(--aegis-cyan)",
          boxShadow: `0 0 8px ${isReplaying ? "rgba(255,215,0,0.5)" : "rgba(0,212,255,0.5)"}`,
          pointerEvents: "none",
        }} />

        {hovering && trackRef.current && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: Math.min(Math.max(hovering.x, 60), trackRef.current.clientWidth - 60),
            transform: "translateX(-50%)",
            background: "var(--bg-card)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6, padding: "6px 10px",
            fontFamily: "monospace", fontSize: "0.62rem",
            color: "var(--text-primary)", whiteSpace: "nowrap",
            pointerEvents: "none", zIndex: 10,
          }}>
            <div>{new Date(hovering.point.timestamp).toLocaleTimeString()}</div>
            <div style={{ color: "var(--aegis-red)" }}>Threat: {hovering.point.threat_level}</div>
            <div style={{ color: "var(--text-muted)" }}>Anomalies: {hovering.point.anomaly_count}</div>
          </div>
        )}

        {timeline.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "0.6rem", color: "var(--text-muted)" }}>
            Recording session history...
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ fontFamily: "monospace", fontSize: "0.62rem", color: isReplaying ? "#ffd700" : "var(--text-muted)", minWidth: 130, textAlign: "right" }}>
          {isReplaying && replayTimestamp
            ? `📼 ${new Date(replayTimestamp).toLocaleTimeString()}`
            : "● LIVE"}
        </div>
        {isReplaying && (
          <button
            onClick={() => { setScrubberPos(1); onLive(); }}
            style={{
              padding: "4px 12px", fontFamily: "monospace", fontSize: "0.62rem",
              fontWeight: 700, letterSpacing: "0.08em",
              background: "rgba(0,255,136,0.08)", color: "var(--aegis-green)",
              border: "1px solid rgba(0,255,136,0.3)", borderRadius: 4, cursor: "pointer",
            }}
          >
            ▶ LIVE
          </button>
        )}
      </div>
    </div>
  );
}
