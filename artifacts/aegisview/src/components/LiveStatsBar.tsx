import React, { useEffect, useRef, useState } from "react";

interface LiveStats {
  pps: number;
  uptime_seconds: number;
  threat_count: number;
  risk_score: number;
}

function useAnimatedNumber(target: number, duration = 500): number {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);
  const startValueRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevRef.current === target) return;
    startValueRef.current = prevRef.current;
    startTimeRef.current = null;

    const animate = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const val = startValueRef.current + (target - startValueRef.current) * eased;
      setDisplayed(Math.round(val * 10) / 10);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = target;
        setDisplayed(target);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return displayed;
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function riskColor(score: number): string {
  if (score > 85) return "#ff0033";
  if (score > 60) return "#ff6b35";
  if (score > 30) return "#ffd700";
  return "#00ff88";
}

function threatColor(count: number): string {
  if (count >= 6) return "#ff0033";
  if (count >= 1) return "#ffd700";
  return "#00ff88";
}

interface StatCardProps {
  label: string;
  subtitle: string;
  color: string;
  displayValue: string;
  pulse?: boolean;
  onClick?: () => void;
}

function StatCard({ label, subtitle, color, displayValue, pulse, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-5 py-1.5 rounded-md ${onClick ? "cursor-pointer" : ""}`}
      style={{
        background: "#0d1117",
        border: `1px solid ${color}4d`,
        minWidth: 90,
        animation: pulse ? "threat-pulse 1s ease-in-out infinite" : undefined,
      }}
    >
      <span
        className="font-mono font-bold leading-none"
        style={{ fontSize: "1.35rem", color, letterSpacing: "-0.03em" }}
      >
        {displayValue}
      </span>
      <span
        className="font-mono uppercase mt-0.5"
        style={{ fontSize: "0.62rem", color: "#666", letterSpacing: "0.08em" }}
      >
        {subtitle}
      </span>
    </div>
  );
}

export function LiveStatsBar() {
  const [stats, setStats] = useState<LiveStats>({ pps: 0, uptime_seconds: 0, threat_count: 0, risk_score: 0 });
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/stats/live`);
        const d: LiveStats = await res.json();
        setStats(d);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [BASE]);

  const animPps = useAnimatedNumber(parseFloat(stats.pps.toFixed(1)));
  const animThreats = useAnimatedNumber(stats.threat_count);
  const animRisk = useAnimatedNumber(stats.risk_score);

  const scrollToGauge = () => {
    document.getElementById("threat-gauge")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      <style>{`
        @keyframes threat-pulse {
          0%, 100% { box-shadow: 0 0 0 0 #ff003340; }
          50% { box-shadow: 0 0 12px 3px #ff003360; }
        }
      `}</style>
      <div
        className="flex items-center justify-center gap-3 px-6 border-b border-border shrink-0"
        style={{ background: "#080b14", height: 52 }}
      >
        <StatCard
          label="PKT/s"
          subtitle="Live Throughput"
          color="#00d4ff"
          displayValue={animPps.toFixed(1)}
        />
        <StatCard
          label="THREATS"
          subtitle="Anomalies Detected"
          color={threatColor(stats.threat_count)}
          displayValue={String(animThreats)}
          pulse={stats.threat_count >= 6}
        />
        <StatCard
          label="UPTIME"
          subtitle="Session Duration"
          color="#ffffff"
          displayValue={formatUptime(stats.uptime_seconds)}
        />
        <StatCard
          label="RISK SCORE"
          subtitle="Current Risk"
          color={riskColor(stats.risk_score)}
          displayValue={String(animRisk)}
          onClick={scrollToGauge}
        />
      </div>
    </>
  );
}
