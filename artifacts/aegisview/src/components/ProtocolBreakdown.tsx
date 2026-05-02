import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useGetProtocolBreakdown, getGetProtocolBreakdownQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

const PROTO_COLORS: Record<string, string> = {
  TCP: "var(--aegis-cyan)",
  UDP: "var(--aegis-purple)",
  ICMP: "var(--aegis-orange)",
  OTHER: "var(--aegis-grey)",
};

const PROTO_HEX: Record<string, string> = {
  TCP: "#00d4ff",
  UDP: "#7b2fff",
  ICMP: "#ff6b35",
  OTHER: "#4a5568",
};

export function ProtocolBreakdown() {
  const { data, isLoading } = useGetProtocolBreakdown({
    query: { queryKey: getGetProtocolBreakdownQueryKey(), refetchInterval: 3000 },
  });

  if (isLoading && !data) {
    return <div style={{ height: "100%", padding: 16 }}><Skeleton className="w-full h-full opacity-20" /></div>;
  }

  const chartData = [
    { name: "TCP",   value: data?.TCP   || 0, hex: PROTO_HEX.TCP },
    { name: "UDP",   value: data?.UDP   || 0, hex: PROTO_HEX.UDP },
    { name: "ICMP",  value: data?.ICMP  || 0, hex: PROTO_HEX.ICMP },
    { name: "OTHER", value: data?.OTHER || 0, hex: PROTO_HEX.OTHER },
  ].filter(d => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ width: "100%", height: "100%", padding: 12, display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)", paddingBottom: "var(--space-sm)", borderBottom: "1px solid var(--bg-border)", marginBottom: "var(--space-sm)", flexShrink: 0 }}>
        Protocol Breakdown
      </div>

      {/* Pie chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="78%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.hex} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "var(--bg-secondary)", border: "var(--card-border)", color: "var(--text-primary)", fontSize: 11, borderRadius: 6 }}
              formatter={(value: number, name: string) => [`${value} (${total > 0 ? Math.round(value / total * 100) : 0}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, padding: "4px 0" }}>
        {chartData.map(d => (
          <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: d.hex, flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: d.hex }}>{d.name}</span>
            </div>
            <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
              {total > 0 ? Math.round(d.value / total * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
