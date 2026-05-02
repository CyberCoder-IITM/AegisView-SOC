import React, { useEffect, useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot,
} from "recharts";
import { useGetAnomalyTimeline, getGetAnomalyTimelineQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ForecastPoint { step: number; timestamp: string; value: number; upper: number; lower: number }
interface Forecast {
  predictions: ForecastPoint[];
  trend_direction: "RISING" | "FALLING" | "STABLE";
  predicted_peak: number;
  predicted_peak_time: string;
  alert: string | null;
  history: Array<{ time: string; value: number }>;
}

interface ChartPoint {
  timeLabel: string;
  z_score?: number;
  is_anomaly?: boolean;
  forecast?: number;
  upper?: number;
  lower?: number;
  isNow?: boolean;
  isForecast?: boolean;
}

const CustomDot = (props: Record<string, unknown>) => {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartPoint };
  if (!cx || !cy || payload.isForecast) return null;
  const isAnomaly = payload.is_anomaly;
  return <circle cx={cx} cy={cy} r={isAnomaly ? 4 : 2} fill={isAnomaly ? "hsl(var(--destructive))" : "hsl(var(--primary))"} stroke="none" />;
};

const TREND_ICONS: Record<string, string> = { RISING: "↗", FALLING: "↘", STABLE: "→" };
const TREND_COLORS: Record<string, string> = { RISING: "#ff6b35", FALLING: "#00ff88", STABLE: "#00d4ff" };

export function AnomalyChart() {
  const { data, isLoading } = useGetAnomalyTimeline({ query: { queryKey: getGetAnomalyTimelineQueryKey(), refetchInterval: 2000 } });
  const [forecastData, setForecastData] = useState<Forecast | null>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/forecast`);
        setForecastData(await res.json());
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, [BASE]);

  if (isLoading && !data) {
    return <div className="h-full w-full p-4"><Skeleton className="w-full h-full opacity-20" /></div>;
  }

  const historical: ChartPoint[] = (data || []).map(d => ({
    timeLabel: d.time,
    z_score: d.z_score,
    is_anomaly: d.is_anomaly,
  }));

  const nowLabel = "NOW";
  const nowPoint: ChartPoint = { timeLabel: nowLabel, isNow: true };

  const forecastPoints: ChartPoint[] = (forecastData?.predictions ?? []).map((p, i) => ({
    timeLabel: `+${(i + 1) * 5}s`,
    forecast: p.value / 10,
    upper: p.upper / 10,
    lower: p.lower / 10,
    isForecast: true,
  }));

  const combined: ChartPoint[] = [...historical.slice(-30), nowPoint, ...forecastPoints];

  const trend = forecastData?.trend_direction ?? "STABLE";
  const peak = forecastData?.predicted_peak ?? 0;
  const showCriticalBanner = trend === "RISING" && peak > 85;
  const forecastAlert = forecastData?.alert;

  return (
    <div className="w-full h-full p-2 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 mb-1">
        <h3 className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Z-Score + Forecast</h3>
        {forecastData && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[9px] font-bold" style={{ color: TREND_COLORS[trend] }}>
              {TREND_ICONS[trend]} {trend}
            </span>
            {forecastData.history.length > 0 && (
              <span className="text-[9px]" style={{ color: "#444" }}>
                Peak: <span style={{ color: TREND_COLORS[trend] }}>{peak}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Critical banner */}
      {showCriticalBanner && (
        <div className="mx-2 mb-1 px-2 py-1 rounded text-[9px] font-bold animate-pulse"
          style={{ background: "#ff003315", border: "1px solid #ff003340", color: "#ff0033" }}>
          ⚠ CRITICAL THRESHOLD BREACH PREDICTED — {forecastData?.predicted_peak_time?.slice(11, 16) ?? "--"}
        </div>
      )}
      {!showCriticalBanner && forecastAlert && (
        <div className="mx-2 mb-1 px-2 py-1 rounded text-[9px]"
          style={{ background: "#ff6b3510", border: "1px solid #ff6b3530", color: "#ff6b35" }}>
          {forecastAlert}
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combined} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="timeLabel" stroke="hsl(var(--muted-foreground))" fontSize={9} tickMargin={8} minTickGap={40} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} domain={[-6, 12]} tickCount={5} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: "10px" }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
            />

            {/* Anomaly threshold reference */}
            <ReferenceLine y={2.5} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.4} />
            <ReferenceLine y={-2.5} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.4} />

            {/* NOW line */}
            <ReferenceLine x={nowLabel} stroke="#ffffff30" strokeDasharray="4 2" label={{ value: "NOW", position: "top", fontSize: 9, fill: "#ffffff40" }} />

            {/* Forecast confidence band */}
            <Area
              type="monotone"
              dataKey="upper"
              data={combined.filter(d => d.isForecast || d.isNow)}
              stroke="none"
              fill="rgba(255,107,53,0.12)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="lower"
              data={combined.filter(d => d.isForecast || d.isNow)}
              stroke="none"
              fill="rgba(255,107,53,0)"
              isAnimationActive={false}
            />

            {/* Historical z-score */}
            <Line
              type="monotone"
              dataKey="z_score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={<CustomDot />}
              isAnimationActive={false}
              style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }}
              connectNulls={false}
            />

            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#ff6b35"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
              style={{ filter: "drop-shadow(0 0 4px #ff6b3560)" }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-2 mt-0.5">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ background: "#00d4ff" }} />
          <span className="text-[8px]" style={{ color: "#444" }}>Z-Score</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: "#ff6b35" }} />
          <span className="text-[8px]" style={{ color: "#444" }}>Forecast</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm" style={{ background: "rgba(255,107,53,0.2)" }} />
          <span className="text-[8px]" style={{ color: "#444" }}>Confidence</span>
        </div>
      </div>
    </div>
  );
}
