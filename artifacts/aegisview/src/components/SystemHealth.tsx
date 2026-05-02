import React, { useState, useEffect } from "react";

interface ComponentStatus {
  name: string;
  status: "OK" | "WARN" | "ERROR";
  metric: string;
}

interface HealthData {
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  uptime_seconds: number;
  components: ComponentStatus[];
  performance: {
    avg_packet_parse_ms: number;
    avg_anomaly_score_ms: number;
    avg_ai_narrate_ms: number;
    memory_mb: number;
    cpu_percent: number;
  };
}

function StatusDot({ s }: { s: string }) {
  const color = s === "OK" ? "#00ff88" : s === "WARN" ? "#ffd700" : "#ff0033";
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0,
    }} />
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.6s" }} />
    </div>
  );
}

interface SystemHealthProps {
  onHealthStatus: (status: "HEALTHY" | "DEGRADED" | "CRITICAL") => void;
}

export function SystemHealth({ onHealthStatus }: SystemHealthProps) {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<HealthData | null>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${BASE}/api/health/detailed`);
        const d: HealthData = await r.json();
        setHealth(d);
        onHealthStatus(d.status);
      } catch { /* ignore */ }
    };
    void load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, [BASE]);

  const hasError = health?.status === "CRITICAL";
  const hasWarn = health?.status === "DEGRADED";

  const perfMetrics = health ? [
    { label: "CPU", value: health.performance.cpu_percent, max: 100, unit: "%", warn: 70, crit: 90 },
    { label: "Memory", value: health.performance.memory_mb, max: 512, unit: "MB", warn: 350, crit: 450 },
    { label: "Avg Parse", value: health.performance.avg_packet_parse_ms, max: 50, unit: "ms", warn: 5, crit: 20 },
    { label: "AI Response", value: health.performance.avg_ai_narrate_ms, max: 10000, unit: "ms", warn: 2000, crit: 5000 },
  ] : [];

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 4,
          border: `1px solid ${hasError ? "rgba(255,0,51,0.4)" : hasWarn ? "rgba(255,215,0,0.3)" : "var(--bg-border)"}`,
          background: hasError ? "rgba(255,0,51,0.08)" : "transparent",
          color: hasError ? "var(--aegis-red)" : hasWarn ? "#ffd700" : "var(--text-muted)",
          fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 700,
          cursor: "pointer", transition: "all 0.15s",
        }}
        title="System Health"
      >
        ⚙ SYSTEM
      </button>

      {open && health && (
        <>
          <div className="fixed inset-0 z-[7998]" onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: 56, left: 0, right: 0, zIndex: 7999,
            background: "rgba(10,14,26,0.98)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--bg-border)",
            padding: "16px 32px",
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 40, boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}>
            <div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "0.12em", marginBottom: 12, textTransform: "uppercase" }}>
                Component Status
              </div>
              {health.components.map(c => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <StatusDot s={c.status} />
                  <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "var(--text-primary)", width: 148, flexShrink: 0 }}>{c.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>{c.metric}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.65rem", color: "var(--text-secondary)", letterSpacing: "0.12em", marginBottom: 12, textTransform: "uppercase" }}>
                Performance
              </div>
              {perfMetrics.map(m => {
                const color = m.value >= m.crit ? "#ff0033" : m.value >= m.warn ? "#ffd700" : "#00ff88";
                return (
                  <div key={m.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "var(--text-secondary)" }}>{m.label}</span>
                      <span style={{ fontFamily: "monospace", fontSize: "0.62rem", color }}>{Math.round(m.value * 10) / 10}{m.unit}</span>
                    </div>
                    <MiniBar value={m.value} max={m.max} color={color} />
                  </div>
                );
              })}

              <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: "0.68rem" }}>
                {health.status === "HEALTHY" ? (
                  <span style={{ color: "#00ff88" }}>● All systems operational</span>
                ) : health.status === "DEGRADED" ? (
                  <span style={{ color: "#ffd700" }}>⚠ {health.components.filter(c => c.status === "WARN").length} components degraded</span>
                ) : (
                  <span style={{ color: "#ff0033" }}>⛔ {health.components.filter(c => c.status === "ERROR").length} components in error</span>
                )}
                <span style={{ color: "var(--text-muted)", marginLeft: 16 }}>
                  Up {Math.floor(health.uptime_seconds / 60)}m {health.uptime_seconds % 60}s
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
