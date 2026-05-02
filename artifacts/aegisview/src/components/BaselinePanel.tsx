import React, { useState, useEffect } from "react";

interface BaselineProfile {
  mean_pps: number;
  std_pps: number;
  mean_bps: number;
  std_bps: number;
}

interface DeviationResult {
  metric: string;
  expected: string;
  actual: string;
  delta: number;
  severity: "OK" | "WARN" | "CRITICAL";
}

interface BaselineStatus {
  mode: "LEARNING" | "ACTIVE";
  progress: number;
  learning_time_remaining: number;
  profile: BaselineProfile | null;
  deviations: DeviationResult[];
}

function DeviationBar({ d }: { d: DeviationResult }) {
  const color = d.severity === "CRITICAL" ? "#ff0033" : d.severity === "WARN" ? "#ffd700" : "#00ff88";
  const barWidth = Math.min(100, d.delta * 25);

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <div className="w-24 shrink-0 text-muted-foreground text-[10px]">{d.metric}</div>
      <div className="flex-1 relative h-4 bg-[rgba(255,255,255,0.04)] rounded-sm overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 rounded-sm transition-all duration-500"
          style={{ width: `${barWidth}%`, backgroundColor: color + "66" }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-[9px]" style={{ color }}>
          {d.delta.toFixed(1)}σ
        </div>
      </div>
      <div className="w-20 shrink-0 text-[9px] text-right text-muted-foreground">{d.expected}</div>
      <div className="w-16 shrink-0 text-[9px] text-right font-bold" style={{ color }}>{d.actual}</div>
      <div
        className="w-16 shrink-0 text-[9px] font-bold text-right uppercase"
        style={{ color }}
      >
        {d.severity}
      </div>
    </div>
  );
}

export function BaselinePanel() {
  const [status, setStatus] = useState<BaselineStatus | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${BASE}/api/baseline/status`);
        const d: BaselineStatus = await res.json();
        setStatus(d);
      } catch { /* ignore */ }
    };
    fetch_();
    const iv = setInterval(fetch_, 5000);
    return () => clearInterval(iv);
  }, [BASE]);

  if (!status) {
    return (
      <div className="w-full border-b border-border bg-card px-6 py-3 flex items-center justify-center">
        <div className="text-xs font-mono text-muted-foreground animate-pulse">INITIALIZING BASELINE ENGINE...</div>
      </div>
    );
  }

  const mins = Math.floor(status.learning_time_remaining / 60);
  const secs = status.learning_time_remaining % 60;
  const countdown = `${mins}:${secs.toString().padStart(2, "0")}`;
  const allOk = status.deviations.every(d => d.severity === "OK");

  return (
    <div className="w-full border-b border-border bg-card px-6 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
            Behavioral Baseline Engine
          </span>
          <span
            className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase"
            style={{
              color: status.mode === "LEARNING" ? "#00d4ff" : "#00ff88",
              borderColor: status.mode === "LEARNING" ? "#00d4ff44" : "#00ff8844",
              background: status.mode === "LEARNING" ? "#00d4ff11" : "#00ff8811",
            }}
          >
            {status.mode}
          </span>
        </div>
        {status.mode === "ACTIVE" && (
          <span className="text-[9px] font-mono text-muted-foreground">
            {allOk ? "✓ Normal behavior detected" : "⚠ Behavioral deviation detected"}
          </span>
        )}
      </div>

      {status.mode === "LEARNING" ? (
        <div>
          <div className="flex items-center justify-between mb-2 text-[10px] font-mono">
            <span className="text-primary animate-pulse">Building behavioral baseline profile...</span>
            {status.learning_time_remaining > 0 && (
              <span className="text-muted-foreground">Active detection in: {countdown}</span>
            )}
          </div>
          <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden border border-primary/10">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${status.progress}%`,
                background: "linear-gradient(90deg, #00d4ff, #7b2fff)",
                boxShadow: "0 0 8px #00d4ff66",
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] font-mono text-muted-foreground">
            <span>{status.progress}% complete</span>
            {status.profile && (
              <span className="text-success">Profile ready — switching to ACTIVE</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground mb-2">
            <span>Metric</span>
            <span className="flex-1 ml-24">Deviation</span>
            <span className="w-20 text-right">Expected</span>
            <span className="w-16 text-right">Current</span>
            <span className="w-16 text-right">Status</span>
          </div>
          {status.deviations.map(d => (
            <DeviationBar key={d.metric} d={d} />
          ))}
          {status.deviations.length === 0 && (
            <div className="text-xs font-mono text-muted-foreground text-center py-2">Collecting deviation metrics...</div>
          )}
        </div>
      )}
    </div>
  );
}
