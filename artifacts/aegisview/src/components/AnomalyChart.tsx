import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from "recharts";
import { useGetAnomalyTimeline } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const isAnomaly = payload.is_anomaly;
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={isAnomaly ? 4 : 2} 
      fill={isAnomaly ? "hsl(var(--destructive))" : "hsl(var(--primary))"} 
      stroke="none"
    />
  );
};

export function AnomalyChart() {
  const { data, isLoading } = useGetAnomalyTimeline({
    query: { refetchInterval: 2000 },
  });

  if (isLoading && !data) {
    return <div className="h-full w-full p-4"><Skeleton className="w-full h-full opacity-20" /></div>;
  }

  const formattedData = (data || []).map(d => ({
    ...d,
    timeLabel: d.time,
  }));

  return (
    <div className="w-full h-full p-2 flex flex-col">
      <h3 className="text-xs uppercase text-muted-foreground font-bold px-2 mb-2 tracking-wider">Z-Score Timeline</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="timeLabel" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10} 
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10} 
              domain={[-5, 5]} 
              tickCount={5}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: '4px' }}
            />
            <ReferenceLine y={2.5} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.5} />
            <ReferenceLine y={-2.5} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.5} />
            <Line 
              type="monotone" 
              dataKey="z_score" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={<CustomDot />}
              isAnimationActive={false}
              style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
