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
import { Onboarding } from "@/components/Onboarding";
import { TimelineScrubber } from "@/components/TimelineScrubber";
import type { ReplaySnapshot } from "@/components/TimelineScrubber";
import { IncidentManager } from "@/components/IncidentManager";
import { SystemHealth } from "@/components/SystemHealth";
import { QueryEngine } from "@/components/QueryEngine";
import { Achievements } from "@/components/Achievements";
import { TopologyMap } from "@/components/TopologyMap";

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

type MapTab = "globe" | "topology";

interface HomeProps {
  incidentId?: string;
}

export default function Home({ incidentId }: HomeProps) {
  const [simActive, setSimActive] = useState(false);
  const [simMode, setSimMode] = useState<string | null>(null);
  const [baselineMode, setBaselineMode] = useState<"LEARNING" | "ACTIVE" | null>(null);
  const [latestAnomaly, setLatestAnomaly] = useState<AnomalyLike | null>(null);
  const [warRoomOpen, setWarRoomOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("aegisview_onboarded") === "true");
  const [replaySnapshot, setReplaySnapshot] = useState<ReplaySnapshot | null>(null);
  const [mapTab, setMapTab] = useState<MapTab>("globe");
  const [criticalTrigger, setCriticalTrigger] = useState<{ title: string; severity: string } | null>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  const handleReplay = (snapshot: ReplaySnapshot) => {
    setReplaySnapshot(snapshot);
  };

  const handleLive = () => {
    setReplaySnapshot(null);
  };

  // Auto-create incidents for CRITICAL threats
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/threats`);
        const threats: AnomalyLike[] = await res.json();
        const critical = threats.find(t => t.severity === "CRITICAL");
        if (critical) {
          setLatestAnomaly(critical);
          setCriticalTrigger({
            title: `CRITICAL: ${critical.reason ?? "Threat detected"} — ${critical.src_ip ?? "?"} → ${critical.dst_ip ?? "?"}:${critical.dst_port ?? "?"}`,
            severity: "CRITICAL",
          });
        } else {
          const high = threats.find(t => t.severity === "HIGH");
          if (high) setLatestAnomaly(high);
        }
      } catch { /* ignore */ }
    };
    void poll();
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
    void poll();
    const iv = setInterval(poll, 8000);
    return () => clearInterval(iv);
  }, [BASE]);

  // Load incident from URL if provided
  useEffect(() => {
    if (!incidentId) return;
    void (async () => {
      try {
        const r = await fetch(`${BASE}/api/incidents/${incidentId}`);
        const data: { snapshot?: ReplaySnapshot; title?: string } = await r.json();
        if (data.snapshot) setReplaySnapshot(data.snapshot);
      } catch { /* ignore */ }
    })();
  }, [incidentId, BASE]);

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

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

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
            {[["W", "Toggle War Room"], ["R", "Trigger AI analysis"], ["C", "Verify chain integrity"], ["E", "Export forensic report"], ["/", "Natural language query"], ["?", "Show this legend"], ["ESC", "Close overlays"]].map(([k, v]) => (
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
        replayTimestamp={replaySnapshot?.timestamp ?? null}
        extraActions={
          <>
            <QueryEngine />
            <Achievements />
            <IncidentManager
              onViewSnapshot={handleReplay}
              autoCreateTrigger={criticalTrigger}
            />
            <SystemHealth
              onHealthStatus={() => { /* could surface CRITICAL system state to header */ }}
            />
          </>
        }
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
          paddingBottom: "calc(var(--space-md) + 72px)",
          boxSizing: "border-box",
        }}>

          {/* Row 0: MITRE Kill Chain — full width */}
          <div style={{ gridColumn: "1 / -1", ...CARD, height: "auto" }}>
            <MitreKillChain />
          </div>

          {/* Row 1: Threat Gauge + Globe/Topology + SOC Agent */}
          <div style={ROW_GRID("2fr 5fr 3fr", 320)}>
            <div style={CARD}>
              <ThreatLevelGauge />
            </div>

            {/* Globe / Topology tab panel */}
            <div style={{ ...CARD, background: "#000910", display: "flex", flexDirection: "column", position: "relative" }}>
              {/* Tab bar */}
              <div style={{
                display: "flex", flexShrink: 0,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(0,0,0,0.4)",
              }}>
                {(["globe", "topology"] as MapTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setMapTab(tab)}
                    style={{
                      padding: "7px 18px",
                      fontFamily: "monospace", fontSize: "0.65rem", fontWeight: 700,
                      letterSpacing: "0.08em",
                      background: "transparent",
                      color: mapTab === tab ? "var(--aegis-cyan)" : "rgba(255,255,255,0.3)",
                      border: "none",
                      borderBottom: mapTab === tab ? "2px solid var(--aegis-cyan)" : "2px solid transparent",
                      cursor: "pointer",
                      transition: "color 0.15s, border-color 0.15s",
                    }}
                  >
                    {tab === "globe" ? "🌐 GLOBE MAP" : "🕸 TOPOLOGY"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {mapTab === "globe" ? (
                  <Suspense fallback={
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
                      <Skeleton className="w-48 h-48 rounded-full opacity-10" />
                    </div>
                  }>
                    <div className="absolute inset-0 overflow-hidden">
                      <GlobeMap />
                    </div>
                  </Suspense>
                ) : (
                  <TopologyMap />
                )}
              </div>
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

      {/* Fixed: Session Timeline Scrubber */}
      <TimelineScrubber
        onReplay={handleReplay}
        onLive={handleLive}
        isReplaying={replaySnapshot !== null}
        replayTimestamp={replaySnapshot?.timestamp ?? null}
      />
    </div>
  );
}
