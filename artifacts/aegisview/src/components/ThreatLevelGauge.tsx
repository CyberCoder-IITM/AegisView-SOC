import React, { useEffect, useState } from "react";
import { useGetThreatLevel } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ThreatLevelGauge() {
  const { data: threatData, isLoading } = useGetThreatLevel({
    query: { refetchInterval: 3000 },
  });

  const [score, setScore] = useState(0);

  useEffect(() => {
    if (threatData?.score !== undefined) {
      setScore(threatData.score);
    }
  }, [threatData]);

  if (isLoading && !threatData) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <Skeleton className="w-48 h-48 rounded-full opacity-20" />
      </div>
    );
  }

  // 0-30 NORMAL, 31-60 ELEVATED, 61-85 HIGH, 86-100 CRITICAL
  let color = "hsl(var(--success))"; // #00ff88
  if (score > 85) color = "hsl(var(--destructive))"; // #ff0033
  else if (score > 60) color = "#ff6b35";
  else if (score > 30) color = "hsl(var(--warning))"; // #ffd700

  const isPulsing = score > 60;
  
  // Calculate arc
  const r = 90;
  const cx = 100;
  const cy = 100;
  const circumference = Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div id="threat-gauge" className="flex flex-col items-center justify-center h-full p-4 relative">
      <div className={`relative w-48 h-24 overflow-hidden ${isPulsing ? 'animate-pulse' : ''}`}>
        <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
          {/* Background Arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Foreground Arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-0 left-0 w-full text-center">
          <div className="text-4xl font-bold font-mono tracking-tighter" style={{ color }}>
            {score}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1 font-bold">
            {threatData?.label || "UNKNOWN"}
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex w-full justify-center px-6 text-xs text-muted-foreground">
        <div className="flex flex-col items-center">
          <span className="uppercase text-[10px] opacity-70">Compliance Flags</span>
          <span className="font-mono text-foreground font-bold mt-1 text-warning">
            {threatData?.active_compliance_flags || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
