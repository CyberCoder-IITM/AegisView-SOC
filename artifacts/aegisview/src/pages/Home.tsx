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

const CARD: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "var(--card-border)",
  borderRadius: "var(--panel-radius)",
  boxShadow: "var(--card-shadow)",
  overflow: "hidden",
  boxSizing: "border-box",
  width: "100%",
  height: "100%",
};

const ROW_GRID = (cols: string, h: string | number): React.CSSProperties => ({
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: cols,
  gap: "var(--space-md)",
  height: typeof h === "number" ? `${h}px` : h,
});

export default function Home() {
  const [simActive, setSimActive] = useState(false);
  const [simMode, setSimMode] = useState<string | null>(null);
  const [baselineMode, setBaselineMode] = useState<"LEARNING" | "ACTIVE" | null>(null);
  const [latestAnomaly, setLatestAnomaly] = useState<AnomalyLike | null>(null);
  const [warRoomOpen, setWarRoomOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

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
    <div style={{ height: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {warRoomOpen && <WarRoom onClose={() => setWarRoomOpen(false)} />}

      {/* Keyboard shortcut legend */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div
            className="font-mono text-xs rounded-xl p-6 max-w-xs"
            style={{ background: "var(--bg-secondary)", border: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="font-bold mb-3 text-sm" style={{ color: "var(--aegis-cyan)" }}>Keyboard Shortcuts</div>
            {[["W", "Toggle War Room"], ["R", "Trigger AI analysis"], ["C", "Verify chain integrity"], ["E", "Export forensic report"], ["?", "Show this legend"], ["ESC", "Close overlays"]].map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 mb-1.5">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "#1a2a3a", color: "var(--aegis-cyan)", border: "1px solid #2a3a4a" }}>{k}</kbd>
                <span style={{ color: "var(--text-secondary)" }}>{v}</span>
              </div>
            ))}
            <div className="mt-3 text-[9px]" style={{ color: "var(--text-muted)" }}>Click anywhere to close</div>
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

      {/* Live Stats Bar */}
      <LiveStatsBar />

      {/* Scrollable dashboard grid */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--space-md)",
          padding: "var(--space-md)",
          boxSizing: "border-box",
        }}>

          {/* Row 0: MITRE Kill Chain — full width */}
          <div style={{ gridColumn: "1 / -1", ...CARD, height: "auto" }}>
            <MitreKillChain />
          </div>

          {/* Row 1: Threat Gauge + Globe + SOC Agent */}
          <div style={ROW_GRID("2fr 5fr 3fr", 320)}>
            <div style={CARD}>
              <ThreatLevelGauge />
            </div>
            <div style={{ ...CARD, background: "#000910", position: "relative" }}>
              <Suspense fallback={
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
                  <Skeleton className="w-48 h-48 rounded-full opacity-10" />
                </div>
              }>
                <div className="absolute inset-0 overflow-hidden">
                  <GlobeMap />
                </div>
              </Suspense>
            </div>
            <div style={CARD}>
              <SOCAgentPanel />
            </div>
          </div>

          {/* Row 2: Protocol Breakdown + Z-Score Chart + Device Radar */}
          <div style={ROW_GRID("2fr 5fr 3fr", 260)}>
            <div style={CARD}>
              <ProtocolBreakdown />
            </div>
            <div style={CARD}>
              <AnomalyChart />
            </div>
            <div style={CARD}>
              <DeviceRadar />
            </div>
          </div>

          {/* Row 3: Heatmap + Threat Intel */}
          <div style={ROW_GRID("7fr 5fr", 220)}>
            <div style={{ ...CARD, overflowX: "auto", overflowY: "hidden" }}>
              <HeatmapPanel />
            </div>
            <div style={{ ...CARD, overflowY: "auto" }}>
              <ThreatIntelPanel />
            </div>
          </div>

          {/* Row 4: Baseline + Integrity Chain */}
          <div style={ROW_GRID("1fr 1fr", 160)}>
            <div style={CARD}>
              <BaselinePanel />
            </div>
            <div style={CARD}>
              <IntegrityChain />
            </div>
          </div>

          {/* Row 5: Packet Feed + Compliance + Sigma Rules */}
          <div style={ROW_GRID("5fr 4fr 3fr", 340)}>
            <div style={{ ...CARD, display: "flex", flexDirection: "column" }}>
              <PacketFeed />
            </div>
            <div style={{ ...CARD, overflowY: "auto" }}>
              <CompliancePanel />
            </div>
            <div style={{ ...CARD, overflowY: "auto" }}>
              <SigmaRules />
            </div>
          </div>

          {/* Row 6: AI Insights */}
          <div style={{ gridColumn: "1 / -1", ...CARD, height: "auto" }}>
            <AIInsights latestAnomaly={latestAnomaly} />
          </div>

        </div>
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
