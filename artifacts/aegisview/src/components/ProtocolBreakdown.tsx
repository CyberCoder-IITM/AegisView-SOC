import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useGetProtocolBreakdown } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtocolBreakdown() {
  const { data, isLoading } = useGetProtocolBreakdown({
    query: { refetchInterval: 3000 },
  });

  if (isLoading && !data) {
    return <div className="h-full w-full p-4"><Skeleton className="w-full h-full opacity-20" /></div>;
  }

  const chartData = [
    { name: "TCP", value: data?.TCP || 0, color: "hsl(var(--primary))" }, // cyan
    { name: "UDP", value: data?.UDP || 0, color: "hsl(var(--secondary))" }, // purple
    { name: "ICMP", value: data?.ICMP || 0, color: "#ff6b35" }, // orange
    { name: "OTHER", value: data?.OTHER || 0, color: "#888888" }, // gray
  ].filter(d => d.value > 0);

  return (
    <div className="w-full h-full p-2 flex flex-col">
      <h3 className="text-xs uppercase text-muted-foreground font-bold px-2 mb-2 tracking-wider">Protocol Breakdown</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              formatter={(value, entry: any) => (
                <span className="text-xs font-mono text-muted-foreground ml-1">
                  {value} ({entry.payload.value})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
