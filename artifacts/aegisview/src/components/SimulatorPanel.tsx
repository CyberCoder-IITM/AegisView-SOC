import React, { useState, useEffect } from "react";

interface SimulationStatus {
  active: boolean;
  mode: string | null;
}

interface AttackConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  endpoint: string;
  color: string;
}

const ATTACKS: AttackConfig[] = [
  { id: "syn_flood", label: "SYN Flood", icon: "💀", description: "Volumetric DDoS simulation", endpoint: "/api/simulate/syn_flood", color: "#ff0033" },
  { id: "port_scan", label: "Port Scan", icon: "🔍", description: "Nmap-style reconnaissance", endpoint: "/api/simulate/port_scan", color: "#ff6b35" },
  { id: "telnet", label: "Telnet Barrage", icon: "📟", description: "Insecure protocol violation", endpoint: "/api/simulate/telnet", color: "#ffd700" },
  { id: "rdp_brute", label: "RDP Brute", icon: "🖥️", description: "Remote access attack", endpoint: "/api/simulate/rdp_brute", color: "#ff4500" },
  { id: "exfil", label: "Data Exfil", icon: "📤", description: "C2 exfiltration pattern", endpoint: "/api/simulate/exfil", color: "#ff0033" },
];

export function SimulatorPanel({ onSimulationChange }: { onSimulationChange?: (active: boolean, mode: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [status, setStatus] = useState<SimulationStatus>({ active: false, mode: null });
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/simulate/status`);
        const d: SimulationStatus = await res.json();
        setStatus(d);
        if (!d.active && running) setRunning(null);
        onSimulationChange?.(d.active, d.mode);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [BASE, running, onSimulationChange]);

  const launch = async (attack: AttackConfig) => {
    setRunning(attack.id);
    try {
      await fetch(`${BASE}${attack.endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    } catch { /* ignore */ }
  };

  const stopAll = async () => {
    setRunning(null);
    try {
      await fetch(`${BASE}/api/simulate/stop`, { method: "POST" });
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed bottom-[96px] right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Panel */}
      {open && (
        <div
          className="w-72 rounded-lg border overflow-hidden animate-sim-slide-up"
          style={{ background: "#1a0000", borderColor: "#ff0033aa" }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#ff000033" }}>
            <span className="text-xs font-bold font-mono text-destructive tracking-wider">ATTACK SIMULATOR</span>
            {status.active && (
              <span className="text-[9px] font-mono text-destructive animate-pulse uppercase">● {status.mode}</span>
            )}
          </div>

          <div className="p-3 space-y-2">
            {ATTACKS.map(attack => {
              const isRunning = running === attack.id || (status.active && status.mode === attack.id);
              return (
                <button
                  key={attack.id}
                  onClick={() => launch(attack)}
                  disabled={!!running && running !== attack.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-all"
                  style={{
                    background: isRunning ? attack.color + "22" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isRunning ? attack.color : "rgba(255,0,51,0.2)"}`,
                    opacity: (!!running && running !== attack.id) ? 0.4 : 1,
                    cursor: (!!running && running !== attack.id) ? "not-allowed" : "pointer",
                  }}
                >
                  <span className="text-base">{attack.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold font-mono" style={{ color: isRunning ? attack.color : "#cccccc" }}>
                      {isRunning ? "RUNNING..." : attack.label}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{attack.description}</div>
                  </div>
                  {isRunning && (
                    <div className="shrink-0">
                      <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: attack.color, borderTopColor: "transparent" }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3 pb-3">
            <button
              onClick={stopAll}
              className="w-full py-2 rounded text-[11px] font-bold font-mono border transition-all hover:bg-destructive/20"
              style={{ borderColor: "#ff003366", color: "#ff4444" }}
            >
              ⬛ Stop All Simulations
            </button>
            <div className="mt-2 text-center text-[9px] text-muted-foreground font-mono">
              ⚠ SIMULATION MODE — No real packets transmitted
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs font-mono transition-all"
        style={{
          background: status.active ? "#ff0033" : open ? "#ff000099" : "#1a0000",
          border: "2px solid #ff0033",
          color: "#ffffff",
          boxShadow: status.active ? "0 0 20px rgba(255,0,51,0.6)" : "0 0 10px rgba(255,0,51,0.3)",
          animation: status.active ? "pulse-glow 2s ease-in-out infinite" : undefined,
        }}
      >
        <span>⚡</span>
        <span>ATTACK SIM</span>
        {status.active && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
      </button>
    </div>
  );
}
