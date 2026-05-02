import React, { useEffect, useState } from "react";
import { useGetThreatLevel, getGetThreatLevelQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ThreatLevelGauge() {
  const { data: threatData, isLoading } = useGetThreatLevel({
    query: { queryKey: getGetThreatLevelQueryKey(), refetchInterval: 3000 },
  });

  const [score, setScore] = useState(0);

  useEffect(() => {
    if (threatData?.score !== undefined) {
      setScore(threatData.score);
    }
  }, [threatData]);

  if (isLoading && !threatData) {
    return (
      <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Skeleton className="w-40 h-40 rounded-full opacity-20" />
      </div>
    );
  }

  let color = "var(--aegis-green)";
  if (score > 85) color = "var(--aegis-red)";
  else if (score > 60) color = "var(--aegis-orange)";
  else if (score > 30) color = "var(--aegis-yellow)";

  const label = score > 85 ? "CRITICAL" : score > 60 ? "HIGH" : score > 30 ? "ELEVATED" : "NORMAL";
  const isPulsing = score > 60;

  const r = 90;
  const circumference = Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div id="threat-gauge" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 16, gap: 12 }}>
      {/* Gauge arc */}
      <div style={{ position: "relative", width: 200, height: 100, overflow: "visible", animation: isPulsing ? "pulse-glow 2s ease-in-out infinite" : undefined }}>
        <svg viewBox="0 0 200 100" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" strokeLinecap="round" />
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease", filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 1, color, letterSpacing: "-0.02em" }}>
            {score}
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Current Risk Score
        </div>
      </div>

      {/* Compliance flags */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 4 }}>
        <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>Compliance Flags</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.1rem", color: "var(--aegis-yellow)" }}>
          {threatData?.active_compliance_flags || 0}
        </span>
      </div>
    </div>
  );
}
