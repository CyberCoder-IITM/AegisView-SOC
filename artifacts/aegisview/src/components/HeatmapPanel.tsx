import React, { useState, useEffect } from "react";

interface HeatmapData {
  time_labels: string[];
  port_labels: number[];
  matrix: number[][];
  max_count: number;
}

function countToColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "var(--bg-primary)";
  const ratio = count / max;
  if (ratio < 0.01) return "var(--bg-primary)";
  if (ratio < 0.2)  return "#003366";
  if (ratio < 0.5)  return "#0066cc";
  if (ratio < 0.8)  return "#ff6b35";
  return "#ff0033";
}

export function HeatmapPanel() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; port: number; time: string; count: number } | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${BASE}/api/analytics/heatmap`);
        const d: HeatmapData = await res.json();
        setData(d);
      } catch { /* ignore */ }
    };
    fetch_();
    const iv = setInterval(fetch_, 5000);
    return () => clearInterval(iv);
  }, [BASE]);

  if (!data) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-muted)" }} className="animate-pulse">BUILDING HEATMAP...</div>
      </div>
    );
  }

  const CELL_W = 22;
  const CELL_H = 16;
  const GAP = 1;
  const LABEL_W = 52;
  const LABEL_H = 28;
  const cols = data.time_labels.length;
  const rows = data.port_labels.length;
  const svgW = LABEL_W + cols * (CELL_W + GAP);
  const svgH = LABEL_H + rows * (CELL_H + GAP);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", padding: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
          Packet Velocity Heatmap — Port × Time
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.65rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
          {[["#003366","Low"],["#0066cc","Med"],["#ff6b35","High"],["#ff0033","Critical"]].map(([bg,label]) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 10, height: 8, borderRadius: 2, background: bg }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* SVG — scrolls horizontally, clipped vertically */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", minHeight: 0 }}>
        <div style={{ display: "inline-block", minWidth: svgW }}>
          <svg width={svgW} height={svgH} style={{ display: "block" }}>
            {/* Port labels (Y axis) */}
            {data.port_labels.map((port, ri) => (
              <text
                key={`port-row-${ri}`}
                x={LABEL_W - 4}
                y={LABEL_H + ri * (CELL_H + GAP) + CELL_H / 2 + 4}
                textAnchor="end"
                fontSize="8"
                fontFamily="monospace"
                fill="#4a5568"
              >
                {port}
              </text>
            ))}

            {/* Time labels (X axis) */}
            {data.time_labels.map((label, ci) => {
              if (ci % 5 !== 0) return null;
              return (
                <text
                  key={ci}
                  x={LABEL_W + ci * (CELL_W + GAP) + CELL_W / 2}
                  y={LABEL_H - 4}
                  textAnchor="end"
                  fontSize="7"
                  fontFamily="monospace"
                  fill="#4a5568"
                  transform={`rotate(-45 ${LABEL_W + ci * (CELL_W + GAP) + CELL_W / 2} ${LABEL_H - 4})`}
                >
                  {label}
                </text>
              );
            })}

            {/* Cells */}
            {data.port_labels.map((port, ri) =>
              data.time_labels.map((timeLabel, ci) => {
                const count = data.matrix[ci]?.[ri] || 0;
                const color = countToColor(count, data.max_count);
                const x = LABEL_W + ci * (CELL_W + GAP);
                const y = LABEL_H + ri * (CELL_H + GAP);
                return (
                  <rect
                    key={`${ri}-${ci}`}
                    x={x} y={y}
                    width={CELL_W} height={CELL_H}
                    fill={color}
                    rx={1}
                    style={{ transition: "fill 0.5s ease", cursor: count > 0 ? "pointer" : "default" }}
                    onMouseEnter={(e) => {
                      if (count > 0) {
                        const rect = (e.target as SVGRectElement).getBoundingClientRect();
                        setTooltip({ x: rect.left, y: rect.top, port, time: timeLabel, count });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            )}
          </svg>
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-md p-2 text-xs font-mono shadow-xl"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40, background: "var(--bg-primary)", border: "var(--card-border)" }}
        >
          <div style={{ color: "var(--aegis-cyan)" }}>Port {tooltip.port}</div>
          <div style={{ color: "var(--text-muted)" }}>{tooltip.time}</div>
          <div style={{ fontWeight: 700, color: "var(--aegis-yellow)" }}>{tooltip.count} packets</div>
        </div>
      )}
    </div>
  );
}
