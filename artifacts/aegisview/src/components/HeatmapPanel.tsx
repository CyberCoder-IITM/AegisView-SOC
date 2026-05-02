import React, { useState, useEffect } from "react";

interface HeatmapData {
  time_labels: string[];
  port_labels: number[];
  matrix: number[][];
  max_count: number;
}

function countToColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "#0a0e1a";
  const ratio = count / max;
  if (ratio < 0.01) return "#0a0e1a";
  if (ratio < 0.2) return "#003366";
  if (ratio < 0.5) return "#0066cc";
  if (ratio < 0.8) return "#ff6b35";
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
      <div className="w-full border-b border-border bg-card px-6 py-4 flex items-center justify-center">
        <div className="text-xs font-mono text-muted-foreground animate-pulse">BUILDING HEATMAP...</div>
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
    <div className="w-full border-b border-border bg-card px-6 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
          Packet Velocity Heatmap — Port × Time
        </span>
        <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#003366" }} /> Low</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#0066cc" }} /> Med</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#ff6b35" }} /> High</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#ff0033" }} /> Critical</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative inline-block" style={{ minWidth: svgW }}>
          <svg width={svgW} height={svgH} style={{ display: "block" }}>
            {/* Port labels (Y axis) */}
            {data.port_labels.map((port, ri) => (
              <text
                key={port}
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

            {/* Time labels (X axis) — rotated 45° */}
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
                    x={x}
                    y={y}
                    width={CELL_W}
                    height={CELL_H}
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
          className="fixed z-50 pointer-events-none bg-[#0a0e1a] border border-primary/30 rounded p-2 text-xs font-mono shadow-xl"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
        >
          <div className="text-primary">Port {tooltip.port}</div>
          <div className="text-muted-foreground">{tooltip.time}</div>
          <div className="font-bold text-warning">{tooltip.count} packets</div>
        </div>
      )}
    </div>
  );
}
