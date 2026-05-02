import React, { useState, useEffect, useRef } from "react";
import type { ReplaySnapshot } from "./TimelineScrubber";

interface Incident {
  incident_id: string;
  title: string;
  severity: string;
  created_at: string;
  url_token: string;
}

interface IncidentManagerProps {
  onViewSnapshot: (snapshot: ReplaySnapshot) => void;
  autoCreateTrigger?: { title: string; severity: string } | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function sevColor(s: string) {
  if (s === "CRITICAL") return "#ff0033";
  if (s === "HIGH") return "#ff6b35";
  if (s === "MED") return "#ffd700";
  return "#00d4ff";
}

export function IncidentManager({ onViewSnapshot, autoCreateTrigger }: IncidentManagerProps) {
  const [open, setOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [unread, setUnread] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const prevCount = useRef(0);
  const lastTriggerRef = useRef<string | null>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  const fetchIncidents = async () => {
    try {
      const r = await fetch(`${BASE}/api/incidents`);
      const data: Incident[] = await r.json();
      setIncidents(data);
      if (!open && data.length > prevCount.current) {
        setUnread(u => u + (data.length - prevCount.current));
      }
      prevCount.current = data.length;
    } catch { /* ignore */ }
  };

  useEffect(() => {
    void fetchIncidents();
    const iv = setInterval(fetchIncidents, 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!autoCreateTrigger) return;
    const key = `${autoCreateTrigger.title}-${autoCreateTrigger.severity}`;
    if (lastTriggerRef.current === key) return;
    lastTriggerRef.current = key;

    void (async () => {
      try {
        await fetch(`${BASE}/api/incidents/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: autoCreateTrigger.title, severity: autoCreateTrigger.severity, snapshot_id: "none" }),
        });
        void fetchIncidents();
      } catch { /* ignore */ }
    })();
  }, [autoCreateTrigger]);

  const copyLink = (inc: Incident) => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${window.location.origin}${base}/incident/${inc.incident_id}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(inc.incident_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const viewSnapshot = async (inc: Incident) => {
    try {
      const r = await fetch(`${BASE}/api/incidents/${inc.incident_id}`);
      const data: { snapshot?: ReplaySnapshot } = await r.json();
      if (data.snapshot) {
        onViewSnapshot(data.snapshot);
        setOpen(false);
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      <button
        onClick={() => { setOpen(v => !v); if (!open) setUnread(0); }}
        style={{
          position: "relative", display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 4,
          border: `1px solid ${unread > 0 ? "rgba(255,0,51,0.4)" : "var(--bg-border)"}`,
          background: unread > 0 ? "rgba(255,0,51,0.08)" : "transparent",
          color: unread > 0 ? "var(--aegis-red)" : "var(--text-muted)",
          fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 700,
          cursor: "pointer", transition: "all 0.15s",
        }}
        title="Incidents"
      >
        🔔 INCIDENTS{incidents.length > 0 ? ` (${incidents.length})` : ""}
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            width: 14, height: 14, borderRadius: "50%",
            background: "var(--aegis-red)", color: "#fff",
            fontSize: "0.55rem", fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[8998]" onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: 56, right: 0, bottom: 72,
            width: 360, zIndex: 8999,
            background: "var(--bg-secondary)",
            borderLeft: "1px solid var(--bg-border)",
            display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.6)",
          }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--bg-border)", flexShrink: 0 }}>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.8rem", color: "var(--aegis-red)", letterSpacing: "0.1em" }}>
                🚨 INCIDENTS ({incidents.length})
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.62rem", fontFamily: "monospace", marginTop: 4 }}>
                Auto-created when CRITICAL threats are detected
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
              {incidents.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.7rem", textAlign: "center", marginTop: 40, lineHeight: 2 }}>
                  No incidents yet.<br />Monitoring for CRITICAL threats...
                </div>
              ) : incidents.map(inc => (
                <div
                  key={inc.incident_id}
                  style={{
                    background: "var(--bg-card)", border: "var(--card-border)",
                    borderRadius: 8, padding: 12, marginBottom: 8,
                    borderLeft: `3px solid ${sevColor(inc.severity)}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: "0.55rem", fontFamily: "monospace", fontWeight: 700,
                      padding: "2px 6px", borderRadius: 999,
                      background: `${sevColor(inc.severity)}22`,
                      color: sevColor(inc.severity),
                      border: `1px solid ${sevColor(inc.severity)}44`,
                    }}>{inc.severity}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.6rem", fontFamily: "monospace", marginLeft: "auto" }}>
                      {timeAgo(inc.created_at)}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-primary)", fontSize: "0.7rem", fontFamily: "monospace", marginBottom: 10, lineHeight: 1.4 }}>
                    {inc.title.length > 90 ? inc.title.slice(0, 87) + "..." : inc.title}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => copyLink(inc)}
                      style={{
                        flex: 1, padding: "5px 0", fontSize: "0.62rem", fontFamily: "monospace",
                        background: "transparent", border: "1px solid var(--bg-border)",
                        borderRadius: 4, cursor: "pointer",
                        color: copiedId === inc.incident_id ? "var(--aegis-green)" : "var(--text-secondary)",
                      }}
                    >
                      {copiedId === inc.incident_id ? "✓ Copied!" : "🔗 Copy Link"}
                    </button>
                    <button
                      onClick={() => void viewSnapshot(inc)}
                      style={{
                        flex: 1, padding: "5px 0", fontSize: "0.62rem", fontFamily: "monospace",
                        background: "transparent", border: "1px solid var(--bg-border)",
                        borderRadius: 4, color: "var(--aegis-cyan)", cursor: "pointer",
                      }}
                    >
                      👁 View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
