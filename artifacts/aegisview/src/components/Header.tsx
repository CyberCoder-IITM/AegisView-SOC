import React, { useState, useEffect } from "react";
import { Monitor, MoonStar, Shield, SunMedium } from "lucide-react";

interface HeaderProps {
  simulationActive?: boolean;
  simulationMode?: string | null;
  baselineMode?: "LEARNING" | "ACTIVE" | null;
  onWarRoom?: () => void;
  onShowShortcuts?: () => void;
  replayTimestamp?: string | null;
  extraActions?: React.ReactNode;
}

const COLOR_MODES = ["cyber", "ember", "light"] as const;
type ColorMode = typeof COLOR_MODES[number];

const MODE_LABELS: Record<ColorMode, string> = { cyber: "CYBER", ember: "EMBER", light: "LIGHT" };

export function Header({ simulationActive, simulationMode, baselineMode, onWarRoom, onShowShortcuts, replayTimestamp, extraActions }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [colorMode, setColorMode] = useState<ColorMode>(() => (localStorage.getItem("aegisview_color_mode") as ColorMode) || "cyber");

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
    localStorage.setItem("aegisview_color_mode", colorMode);
  }, [colorMode]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-secondary)",
      borderBottom: replayTimestamp ? "1px solid rgba(255,215,0,0.35)" : "1px solid var(--bg-border)",
      position: "sticky",
      top: 0,
      zIndex: 1000,
      width: "100%",
      boxSizing: "border-box",
      flexShrink: 0,
    }}>
      {/* Replay banner */}
      {replayTimestamp && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, height: 24, flexShrink: 0,
          background: "rgba(255,215,0,0.06)",
          borderBottom: "1px solid rgba(255,215,0,0.15)",
          fontFamily: "monospace", fontSize: "0.62rem",
        }}>
          <span style={{ color: "#ffd700", fontWeight: 700 }}>📼 REPLAY MODE</span>
          <span style={{ color: "rgba(255,215,0,0.65)" }}>
            Viewing snapshot from {new Date(replayTimestamp).toLocaleTimeString()} on {new Date(replayTimestamp).toLocaleDateString()}
          </span>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: "0.58rem" }}>
            — live data continues recording in background
          </span>
        </div>
      )}
      {/* Main row */}
      <div className="header-main-row" style={{
        height: 56, flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-lg)",
        gap: 8,
        minWidth: 0,
      }}>
      {/* Left: logo + version */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexShrink: 0 }}>
        <Shield style={{ width: 16, height: 16, color: "var(--aegis-cyan)" }} />
        <h1 style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.15em", color: "#fff", margin: 0 }}>
          AEGIS<span style={{ color: "var(--aegis-cyan)" }}>VIEW</span>
        </h1>
        <span style={{
          fontSize: "0.65rem",
          fontFamily: "monospace",
          padding: "2px 8px",
          borderRadius: 999,
          background: "var(--bg-border)",
          color: "var(--aegis-cyan)",
          border: "1px solid rgba(0,212,255,0.2)",
        }}>v2.0</span>
      </div>

      {/* Right: status indicators + action items */}
      <div className="header-right">
        {/* Baseline mode pill */}
        {baselineMode && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 999,
            border: `1px solid ${baselineMode === "LEARNING" ? "rgba(0,212,255,0.3)" : "rgba(0,255,136,0.3)"}`,
            color: baselineMode === "LEARNING" ? "var(--aegis-cyan)" : "var(--aegis-green)",
            background: baselineMode === "LEARNING" ? "rgba(0,212,255,0.08)" : "rgba(0,255,136,0.08)",
            fontSize: "0.7rem",
            fontWeight: 700,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: baselineMode === "LEARNING" ? "var(--aegis-cyan)" : "var(--aegis-green)",
              animation: baselineMode === "LEARNING" ? "blink-cursor 1s step-end infinite" : undefined,
            }} />
            {baselineMode}
          </div>
        )}

        {/* Extra action buttons (QueryEngine, Achievements, IncidentManager, SystemHealth) */}
        {extraActions}

        <button
          onClick={() => setColorMode(prev => COLOR_MODES[(COLOR_MODES.indexOf(prev) + 1) % COLOR_MODES.length])}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 999,
            border: "1px solid var(--bg-border)",
            background: "rgba(255,255,255,0.03)",
            color: "var(--text-secondary)",
            fontSize: "0.68rem", fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title="Switch color mode"
        >
          {colorMode === "cyber" ? <Monitor size={12} /> : colorMode === "ember" ? <MoonStar size={12} /> : <SunMedium size={12} />}
          {MODE_LABELS[colorMode]}
        </button>

        {/* Simulation active badge */}
        {simulationActive && simulationMode && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 999,
            border: "1px solid rgba(255,0,51,0.5)",
            background: "rgba(255,0,51,0.1)",
            color: "var(--aegis-red)",
            fontSize: "0.7rem", fontWeight: 700,
            animation: "pulse-glow 2s ease-in-out infinite",
          }}>
            🔴 SIM: {simulationMode.replace("_", " ").toUpperCase()}
          </div>
        )}

        {onWarRoom && (
          <button
            className="header-war-room"
            onClick={onWarRoom}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 4,
              border: "1px solid rgba(255,0,51,0.3)",
              background: "transparent",
              color: "var(--aegis-orange)",
              fontSize: "0.7rem", fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.15s",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            title="War Room Mode [W]"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,0,51,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            ⚔ <span>WAR ROOM</span>
          </button>
        )}

        {onShowShortcuts && (
          <button
            onClick={onShowShortcuts}
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: "1px solid var(--bg-border)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: "0.7rem", fontFamily: "monospace",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            title="Keyboard shortcuts"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            ?
          </button>
        )}

        <div className="header-clock" style={{ color: "var(--text-muted)", fontSize: "0.65rem", whiteSpace: "nowrap" }}>
          {time.toISOString().replace("T", " ").substring(0, 19)} UTC
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 12px", borderRadius: 999,
          background: "rgba(0,255,136,0.08)",
          border: "1px solid rgba(0,255,136,0.2)",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--aegis-green)", animation: "pulse-glow 2s ease-in-out infinite" }} />
          <span style={{ color: "var(--aegis-green)", fontWeight: 700, letterSpacing: "0.1em", fontSize: "0.7rem" }}>LIVE</span>
        </div>
      </div>
      </div>
    </header>
  );
}
