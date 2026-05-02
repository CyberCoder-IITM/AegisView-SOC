import React, { Suspense, useEffect, useState } from "react";
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
import { SOCAgentPanel } from "@/components/SOCAgentPanel";
import { DeviceRadar } from "@/components/DeviceRadar";
import { IntegrityChain } from "@/components/IntegrityChain";
import { ThreatIntelPanel } from "@/components/ThreatIntelPanel";
import { SigmaRules } from "@/components/SigmaRules";
import { WarRoom } from "@/components/WarRoom";
import { Skeleton } from "@/components/ui/skeleton";

const GlobeMap = React.lazy(() => import("@/components/GlobeMap"));

interface AnomalyLike {
  id?: string; severity?: string; src_ip?: string;
  dst_ip?: string; dst_port?: number; protocol?: string;
  reason?: string; z_score?: number;
}
interface BaselineStatus { mode: "LEARNING" | "ACTIVE" }

export default function Home() {
  const [simActive, setSimActive] = useState(false);
  const [simMode, setSimMode] = useState<string | null>(null);
  const [baselineMode, setBaselineMode] = useState<"LEARNING" | "ACTIVE" | null>(null);
  const [latestAnomaly, setLatestAnomaly] = useState<AnomalyLike | null>(null);
  const [warRoomOpen, setWarRoomOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  // Poll latest anomalies for AI panel
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/threats`);
        const threats: AnomalyLike[] = await res.json();
        const high = threats.find(t => t.severity === "CRITICAL" || t.severity === "HIGH");
        if (high) setLatestAnomaly(high);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [BASE]);

  // Poll baseline mode
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

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case "w": case "W": setWarRoomOpen(v => !v); break;
        case "?": setShowShortcuts(v => !v); break;
        case "r": case "R":
          void fetch(`${BASE}/api/agent/trigger`, { method: "POST" });
          break;
        case "c": case "C":
          void fetch(`${BASE}/api/chain/verify`);
          break;
        case "e": case "E":
          window.open(`${BASE}/api/report/forensic`, "_blank");
          break;
        case "Escape":
          setWarRoomOpen(false);
          setShowShortcuts(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [BASE]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {warRoomOpen && <WarRoom onClose={() => setWarRoomOpen(false)} />}

      {/* Keyboard shortcut legend */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div className="font-mono text-xs rounded-lg p-6 max-w-xs" style={{ background: "#0d1117", border: "1px solid #1a2a3a" }} onClick={e => e.stopPropagation()}>
            <div className="font-bold mb-3 text-sm" style={{ color: "#00d4ff" }}>Keyboard Shortcuts</div>
            {[["W", "Toggle War Room"], ["R", "Trigger AI analysis"], ["C", "Verify chain integrity"], ["E", "Export forensic report"], ["?", "Show this legend"], ["ESC", "Close overlays"]].map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 mb-1.5">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "#1a2a3a", color: "#00d4ff", border: "1px solid #2a3a4a" }}>{k}</kbd>
                <span style={{ color: "#888" }}>{v}</span>
              </div>
            ))}
            <div className="mt-3 text-[9px]" style={{ color: "#333" }}>Click anywhere to close</div>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        simulationActive={simActive}
        simulationMode={simMode}
        baselineMode={baselineMode}
        onWarRoom={() => setWarRoomOpen(v => !v)}
        onShowShortcuts={() => setShowShortcuts(v => !v)}
      />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Live Stats Bar */}
        <LiveStatsBar />

        {/* Row 0: MITRE Kill Chain */}
        <MitreKillChain />

        {/* Row 1: Threat Gauge + Globe + SOC Agent */}
        <div className="flex border-b border-border">
          <div className="w-72 shrink-0 border-r border-border bg-card">
            <ThreatLevelGauge />
          </div>
          <div className="flex-1 bg-black relative border-r border-border" style={{ height: 280 }}>
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
          <div className="w-96 shrink-0" style={{ height: 280 }}>
            <SOCAgentPanel />
          </div>
        </div>

        {/* Row 2: Protocol + Anomaly Chart + Device Radar */}
        <div className="flex border-b border-border">
          <div className="w-72 shrink-0 border-r border-border bg-card">
            <ProtocolBreakdown />
          </div>
          <div className="flex-1 bg-card border-r border-border" style={{ minHeight: 200 }}>
            <AnomalyChart />
          </div>
          <div className="w-80 shrink-0" style={{ minHeight: 200 }}>
            <DeviceRadar />
          </div>
        </div>

        {/* Row 3: Heatmap + Threat Intel */}
        <div className="flex border-b border-border">
          <div className="flex-1 border-r border-border">
            <HeatmapPanel />
          </div>
          <div className="w-80 shrink-0" style={{ minHeight: 320 }}>
            <ThreatIntelPanel />
          </div>
        </div>

        {/* Row 4: Baseline + Integrity Chain */}
        <div className="flex border-b border-border">
          <div className="flex-1 border-r border-border bg-card">
            <BaselinePanel />
          </div>
          <div className="w-96 shrink-0">
            <IntegrityChain />
          </div>
        </div>

        {/* Row 5: Packet Feed + Compliance + Sigma Rules */}
        <div className="flex border-b border-border" style={{ minHeight: 420 }}>
          <div className="flex-1 border-r border-border bg-card flex flex-col min-w-0">
            <PacketFeed />
          </div>
          <div className="w-80 shrink-0 border-r border-border bg-card">
            <CompliancePanel />
          </div>
          <div className="w-72 shrink-0">
            <SigmaRules />
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
