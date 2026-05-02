import React, { useEffect, useState } from "react";

interface DeviceProfile {
  ip: string;
  first_seen: string;
  last_seen: string;
  packet_count: number;
  typical_ports: Record<number, number>;
  typical_protocols: Record<string, number>;
  avg_packet_size: number;
  packet_size_std: number;
  avg_ttl: number;
  typical_dst_ips: string[];
  typical_hours: Record<number, number>;
  behavior_change_score: number;
  is_new_device: boolean;
  anomalous_behaviors: string[];
  device_type_guess: string;
}

const DEVICE_ICONS: Record<string, string> = {
  "Linux Server": "🐧",
  "Windows Workstation": "🖥",
  "Network Device/Router": "🔀",
  "Monitoring/Ping Tool": "📡",
  "IoT Device": "📶",
  "Web Server": "🌐",
  "Unknown Host": "❓",
};

function scoreColor(score: number, isNew: boolean): string {
  if (isNew) return "#9b59b6";
  if (score > 0.7) return "#ff0033";
  if (score > 0.3) return "#ffd700";
  return "#00ff88";
}

function scoreBadge(score: number, isNew: boolean): string {
  if (isNew) return "NEW";
  if (score > 0.7) return "ANOMALOUS";
  if (score > 0.3) return "SHIFTING";
  return "KNOWN";
}

function RadarChart({ profile }: { profile: DeviceProfile }) {
  const cx = 100, cy = 100, r = 70;
  const axes = [
    { label: "Vol", angle: -90 },
    { label: "Proto", angle: -30 },
    { label: "Ports", angle: 30 },
    { label: "Geo", angle: 90 },
    { label: "Time", angle: 150 },
    { label: "Size", angle: 210 },
  ];
  const N = axes.length;

  // Compute normalized scores 0-1 for each axis
  const portCount = Object.keys(profile.typical_ports).length;
  const protoCount = Object.keys(profile.typical_protocols).length;
  const dstCount = profile.typical_dst_ips.length;
  const hourCount = Object.keys(profile.typical_hours).length;

  const values = [
    Math.min(1, profile.packet_count / 500),
    Math.min(1, protoCount / 4),
    Math.min(1, portCount / 20),
    Math.min(1, dstCount / 10),
    Math.min(1, hourCount / 12),
    Math.min(1, profile.packet_size_std / 500),
  ];

  const changedValues = values.map(v => Math.min(1, v * (1 + profile.behavior_change_score)));

  function toXY(angle: number, value: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * value * Math.cos(rad), y: cy + r * value * Math.sin(rad) };
  }

  function makePolygon(vals: number[]) {
    return axes.map((a, i) => {
      const pt = toXY(a.angle, vals[i]);
      return `${pt.x},${pt.y}`;
    }).join(" ");
  }

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[180px]">
      {[0.25, 0.5, 0.75, 1].map(level => (
        <polygon
          key={level}
          points={makePolygon(Array(N).fill(level))}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.5"
        />
      ))}
      {axes.map((a, i) => {
        const pt = toXY(a.angle, 1.15);
        return (
          <React.Fragment key={i}>
            <line x1={cx} y1={cy} x2={toXY(a.angle, 1).x} y2={toXY(a.angle, 1).y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <text x={pt.x} y={pt.y} fontSize="8" fill="#666" textAnchor="middle" dominantBaseline="middle">{a.label}</text>
          </React.Fragment>
        );
      })}
      <polygon points={makePolygon(values)} fill="rgba(0,212,255,0.15)" stroke="#00d4ff" strokeWidth="1.5" />
      <polygon points={makePolygon(changedValues)} fill="rgba(255,0,51,0.1)" stroke="#ff0033" strokeWidth="1" strokeDasharray="3,2" />
    </svg>
  );
}

export function DeviceRadar() {
  const [devices, setDevices] = useState<DeviceProfile[]>([]);
  const [selected, setSelected] = useState<DeviceProfile | null>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/devices`);
        const d: DeviceProfile[] = await res.json();
        setDevices(d);
        if (!selected && d.length > 0) setSelected(d[0]);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [BASE]);

  const displayDevice = selected ?? devices[0];

  return (
    <div className="w-full h-full flex flex-col font-mono text-xs" style={{ background: "#0a0e1a" }}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Network Device Intelligence</span>
        <span className="text-[10px]" style={{ color: "#444" }}>{devices.length} devices</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Device list */}
        <div className="w-40 shrink-0 border-r border-border overflow-y-auto">
          {devices.slice(0, 20).map(d => {
            const color = scoreColor(d.behavior_change_score, d.is_new_device);
            const badge = scoreBadge(d.behavior_change_score, d.is_new_device);
            return (
              <div
                key={d.ip}
                onClick={() => setSelected(d)}
                className="px-2 py-1.5 cursor-pointer border-b hover:bg-white/5 transition-colors"
                style={{
                  borderColor: "#ffffff08",
                  background: selected?.ip === d.ip ? "#ffffff10" : undefined,
                  borderLeft: selected?.ip === d.ip ? `2px solid ${color}` : "2px solid transparent",
                }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[9px]">{DEVICE_ICONS[d.device_type_guess] ?? "❓"}</span>
                  <span className="text-[9px] font-bold truncate" style={{ color: "#ccc", maxWidth: 80 }}>{d.ip}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="w-14 h-1 rounded-full" style={{ background: "#1a1a2a" }}>
                    <div className="h-full rounded-full" style={{ width: `${d.behavior_change_score * 100}%`, background: color }} />
                  </div>
                  <span className="text-[8px]" style={{ color }}>{badge}</span>
                </div>
              </div>
            );
          })}
          {devices.length === 0 && (
            <div className="p-3 text-[10px]" style={{ color: "#333" }}>No devices seen yet</div>
          )}
        </div>

        {/* Device detail */}
        <div className="flex-1 p-3 overflow-y-auto min-w-0">
          {displayDevice ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{DEVICE_ICONS[displayDevice.device_type_guess] ?? "❓"}</span>
                <div>
                  <div className="font-bold text-sm" style={{ color: scoreColor(displayDevice.behavior_change_score, displayDevice.is_new_device) }}>
                    {displayDevice.ip}
                  </div>
                  <div className="text-[10px]" style={{ color: "#666" }}>{displayDevice.device_type_guess}</div>
                </div>
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: `${scoreColor(displayDevice.behavior_change_score, displayDevice.is_new_device)}20`,
                  color: scoreColor(displayDevice.behavior_change_score, displayDevice.is_new_device),
                  border: `1px solid ${scoreColor(displayDevice.behavior_change_score, displayDevice.is_new_device)}40`,
                }}>
                  {scoreBadge(displayDevice.behavior_change_score, displayDevice.is_new_device)}
                </span>
              </div>

              <div className="flex justify-center mb-3">
                <RadarChart profile={displayDevice} />
              </div>
              <div className="text-[9px] text-center mb-3" style={{ color: "#444" }}>
                <span style={{ color: "#00d4ff" }}>━━</span> Baseline &nbsp;
                <span style={{ color: "#ff0033" }}>╌╌</span> Current
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <div className="text-[9px]" style={{ color: "#444" }}>First seen</div>
                  <div className="text-[10px]" style={{ color: "#888" }}>{displayDevice.first_seen.slice(11, 19)}</div>
                </div>
                <div>
                  <div className="text-[9px]" style={{ color: "#444" }}>Packets</div>
                  <div className="text-[10px]" style={{ color: "#888" }}>{displayDevice.packet_count}</div>
                </div>
                <div>
                  <div className="text-[9px]" style={{ color: "#444" }}>Avg TTL</div>
                  <div className="text-[10px]" style={{ color: "#888" }}>{displayDevice.avg_ttl}</div>
                </div>
                <div>
                  <div className="text-[9px]" style={{ color: "#444" }}>Avg size</div>
                  <div className="text-[10px]" style={{ color: "#888" }}>{displayDevice.avg_packet_size}B</div>
                </div>
              </div>

              {displayDevice.anomalous_behaviors.length > 0 && (
                <div className="mb-3">
                  <div className="text-[9px] mb-1" style={{ color: "#ff0033" }}>⚠ Anomalies</div>
                  {displayDevice.anomalous_behaviors.map((b, i) => (
                    <div key={i} className="text-[9px] mb-0.5" style={{ color: "#ff6b35" }}>• {b}</div>
                  ))}
                </div>
              )}

              <div>
                <div className="text-[9px] mb-1" style={{ color: "#444" }}>Known destinations</div>
                <div className="flex flex-wrap gap-1">
                  {displayDevice.typical_dst_ips.slice(0, 8).map(ip => (
                    <span key={ip} className="text-[8px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                      style={{ background: "#0d1117", border: "1px solid #1a2a3a", color: "#00d4ff" }}
                      onClick={() => {
                        const d = devices.find(x => x.ip === ip);
                        if (d) setSelected(d);
                      }}
                    >{ip}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[10px] text-center mt-8" style={{ color: "#333" }}>Select a device</div>
          )}
        </div>
      </div>
    </div>
  );
}
