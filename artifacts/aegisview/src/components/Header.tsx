import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";

interface HeaderProps {
  simulationActive?: boolean;
  simulationMode?: string | null;
  baselineMode?: "LEARNING" | "ACTIVE" | null;
  onWarRoom?: () => void;
  onShowShortcuts?: () => void;
}

export function Header({ simulationActive, simulationMode, baselineMode, onWarRoom, onShowShortcuts }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="col-span-12 h-12 border-b border-border bg-card flex items-center justify-between px-6 z-10 relative shrink-0">
      <div className="flex items-center gap-3">
        <Shield className="w-4 h-4 text-primary" />
        <h1 className="font-bold text-base tracking-widest text-foreground">
          AEGIS<span className="text-primary">VIEW</span>
        </h1>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-primary/20 text-primary/60">v2.0</span>
      </div>

      <div className="flex items-center gap-4 font-mono text-xs">
        {/* Baseline mode pill */}
        {baselineMode && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold"
            style={{
              borderColor: baselineMode === "LEARNING" ? "#00d4ff44" : "#00ff8844",
              color: baselineMode === "LEARNING" ? "#00d4ff" : "#00ff88",
              background: baselineMode === "LEARNING" ? "#00d4ff11" : "#00ff8811",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: baselineMode === "LEARNING" ? "#00d4ff" : "#00ff88",
                animation: baselineMode === "LEARNING" ? "blink-cursor 1s step-end infinite" : undefined,
              }}
            />
            {baselineMode}
          </div>
        )}

        {/* Simulation active badge */}
        {simulationActive && simulationMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-destructive/50 bg-destructive/10 text-destructive text-[10px] font-bold animate-pulse">
            🔴 SIM: {simulationMode.replace("_", " ").toUpperCase()}
          </div>
        )}

        {onWarRoom && (
          <button
            onClick={onWarRoom}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-bold transition-colors hover:bg-destructive/10"
            style={{ borderColor: "#ff003340", color: "#ff6b35" }}
            title="War Room Mode [W]"
          >
            ⚔ WAR ROOM
          </button>
        )}
        {onShowShortcuts && (
          <button
            onClick={onShowShortcuts}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border hover:bg-white/5 transition-colors"
            style={{ borderColor: "#333", color: "#555" }}
            title="Keyboard shortcuts"
          >
            ?
          </button>
        )}
        <div className="text-muted-foreground text-[10px]">
          {time.toISOString().replace("T", " ").substring(0, 19)} UTC
        </div>
        <div className="flex items-center gap-2 bg-success/10 px-3 py-1 rounded-full border border-success/20">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-success font-bold tracking-wider text-[10px]">LIVE</span>
        </div>
      </div>
    </header>
  );
}
