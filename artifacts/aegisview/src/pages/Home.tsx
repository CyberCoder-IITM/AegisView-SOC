import React, { Suspense, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ThreatLevelGauge } from "@/components/ThreatLevelGauge";
import { ProtocolBreakdown } from "@/components/ProtocolBreakdown";
import { AnomalyChart } from "@/components/AnomalyChart";
import { PacketFeed } from "@/components/PacketFeed";
import { CompliancePanel } from "@/components/CompliancePanel";
import { MitreKillChain } from "@/components/MitreKillChain";
import { HeatmapPanel } from "@/components/HeatmapPanel";
import { BaselinePanel } from "@/components/BaselinePanel";
import { AIInsights } from "@/components/AIInsights";
import { SimulatorPanel } from "@/components/SimulatorPanel";
import { LiveStatsBar } from "@/components/LiveStatsBar";
import { Skeleton } from "@/components/ui/skeleton";

const GlobeMap = React.lazy(() => import("@/components/GlobeMap"));

interface AnomalyLike {
  id?: string;
  severity?: string;
  src_ip?: string;
  dst_ip?: string;
  dst_port?: number;
  protocol?: string;
  reason?: string;
  z_score?: number;
}

interface BaselineStatus {
  mode: "LEARNING" | "ACTIVE";
}

export default function Home() {
  const [simActive, setSimActive] = useState(false);
  const [simMode, setSimMode] = useState<string | null>(null);
  const [baselineMode, setBaselineMode] = useState<"LEARNING" | "ACTIVE" | null>(null);
  const [latestAnomaly, setLatestAnomaly] = useState<AnomalyLike | null>(null);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Poll for latest anomalies to feed into AI panel
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/threats`);
        const threats: AnomalyLike[] = await res.json();
        const highSeverity = threats.find(t => t.severity === "CRITICAL" || t.severity === "HIGH");
        if (highSeverity) setLatestAnomaly(highSeverity);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [BASE]);

  // Poll baseline mode for header pill
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/baseline/status`);
        const d: BaselineStatus = await res.json();
        setBaselineMode(d.mode);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 8000);
    return () => clearInterval(iv);
  }, [BASE]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        simulationActive={simActive}
        simulationMode={simMode}
        baselineMode={baselineMode}
      />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Live Stats Bar */}
        <LiveStatsBar />

        {/* Row 0: MITRE Kill Chain — full width */}
        <MitreKillChain />

        {/* Row 1: Threat Gauge + Globe */}
        <div className="flex border-b border-border">
          <div className="w-72 shrink-0 border-r border-border bg-card">
            <ThreatLevelGauge />
          </div>
          <div className="flex-1 bg-black relative" style={{ height: 280 }}>
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]">
                <Skeleton className="w-48 h-48 rounded-full opacity-10" />
              </div>
            }>
              <div className="absolute inset-0 overflow-hidden">
                <GlobeMap />
              </div>
            </Suspense>
          </div>
        </div>

        {/* Row 2: Protocol + Anomaly Chart */}
        <div className="flex border-b border-border">
          <div className="w-80 shrink-0 border-r border-border bg-card">
            <ProtocolBreakdown />
          </div>
          <div className="flex-1 bg-card">
            <AnomalyChart />
          </div>
        </div>

        {/* Row 3: Heatmap */}
        <HeatmapPanel />

        {/* Row 4: Baseline */}
        <BaselinePanel />

        {/* Row 5: Packet Feed + Compliance */}
        <div className="flex border-b border-border" style={{ minHeight: 420 }}>
          <div className="flex-1 border-r border-border bg-card flex flex-col min-w-0">
            <PacketFeed />
          </div>
          <div className="w-96 shrink-0 bg-card">
            <CompliancePanel />
          </div>
        </div>

        {/* Row 6: AI Insights */}
        <AIInsights latestAnomaly={latestAnomaly} />

      </div>

      {/* Fixed: Attack Simulator */}
      <SimulatorPanel
        onSimulationChange={(active, mode) => {
          setSimActive(active);
          setSimMode(mode);
        }}
      />
    </div>
  );
}
