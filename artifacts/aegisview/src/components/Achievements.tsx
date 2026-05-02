import React, { useState, useEffect, useRef, useCallback } from "react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
}

const DEFS: Achievement[] = [
  { id: "first_blood", title: "First Blood", description: "First anomaly detected", icon: "🎯", rarity: "COMMON" },
  { id: "tor_hunter", title: "Tor Hunter", description: "Identified a Tor exit node", icon: "🧅", rarity: "UNCOMMON" },
  { id: "chain_guardian", title: "Chain Guardian", description: "Integrity chain reached 1000+ entries", icon: "⛓", rarity: "RARE" },
  { id: "threat_critical", title: "Red Alert", description: "Threat level reached CRITICAL", icon: "🔴", rarity: "UNCOMMON" },
  { id: "compliance_fail", title: "Auditor's Nightmare", description: "All 4 compliance rules triggered", icon: "📋", rarity: "RARE" },
  { id: "apt_attribution", title: "Ghost in the Machine", description: "SOC Agent attributed activity to APT group", icon: "👻", rarity: "EPIC" },
  { id: "sigma_master", title: "Sigma Master", description: "25 Sigma rules auto-generated", icon: "Σ", rarity: "RARE" },
  { id: "full_killchain", title: "Kill Chain Complete", description: "All 5 MITRE stages activated simultaneously", icon: "💀", rarity: "LEGENDARY" },
];

function rarityColor(r: string): string {
  if (r === "COMMON") return "#888";
  if (r === "UNCOMMON") return "#00ff88";
  if (r === "RARE") return "#4da6ff";
  if (r === "EPIC") return "#b44dff";
  return "#ffd700";
}

function rarityBorder(r: string): string {
  if (r === "COMMON") return "1px solid rgba(136,136,136,0.4)";
  if (r === "UNCOMMON") return "1px solid rgba(0,255,136,0.45)";
  if (r === "RARE") return "1px solid rgba(77,166,255,0.55)";
  if (r === "EPIC") return "1px solid rgba(180,77,255,0.65)";
  return "1px solid rgba(255,215,0,0.8)";
}

function rarityShadow(r: string): string | undefined {
  if (r === "EPIC") return "0 0 16px rgba(180,77,255,0.25)";
  if (r === "LEGENDARY") return "0 0 28px rgba(255,215,0,0.4)";
  return undefined;
}

const LS_KEY = "aegisview_achievements_v2";

function loadUnlocked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}
function saveUnlocked(s: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

interface Toast { achievement: Achievement; id: number }

export function Achievements() {
  const [unlocked, setUnlocked] = useState<Set<string>>(loadUnlocked);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const toastId = useRef(0);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  const unlock = useCallback((id: string) => {
    setUnlocked(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveUnlocked(next);
      const def = DEFS.find(a => a.id === id);
      if (def) {
        const tid = toastId.current++;
        setToasts(t => [...t, { achievement: def, id: tid }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), 4500);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const [threatsRes, chainRes, sigmaRes, killRes, compRes, agentRes, levelRes] = await Promise.all([
          fetch(`${BASE}/api/threats`),
          fetch(`${BASE}/api/chain/status`),
          fetch(`${BASE}/api/sigma/rules`),
          fetch(`${BASE}/api/mitre/killchain`),
          fetch(`${BASE}/api/compliance/report`),
          fetch(`${BASE}/api/agent/latest`),
          fetch(`${BASE}/api/threat-level`),
        ]);

        const threats = await threatsRes.json() as Array<{ src_ip?: string }>;
        const chain = await chainRes.json() as { length?: number };
        const sigma = await sigmaRes.json() as unknown[];
        const kill = await killRes.json() as Array<{ status?: string }>;
        const compliance = await compRes.json() as { rules_triggered?: unknown[] };
        const level = await levelRes.json() as { label?: string };
        let agent: { attribution?: string } | null = null;
        if (agentRes.status !== 204) agent = await agentRes.json() as { attribution?: string };

        if (threats.length > 0) unlock("first_blood");

        const torIps = ["185.220.101.47", "185.220.101", "185.220.102"];
        if (threats.some(t => torIps.some(tor => String(t.src_ip ?? "").startsWith(tor.slice(0, 11))))) {
          unlock("tor_hunter");
        }

        if ((chain.length ?? 0) >= 1000) unlock("chain_guardian");
        if (level.label === "CRITICAL") unlock("threat_critical");
        if ((compliance.rules_triggered ?? []).length >= 4) unlock("compliance_fail");

        const aptGroups = ["APT", "Lazarus", "Cozy Bear", "Fancy Bear", "APT28", "APT29", "Kimsuky"];
        if (agent && aptGroups.some(g => String(agent?.attribution ?? "").includes(g))) unlock("apt_attribution");

        if (Array.isArray(sigma) && sigma.length >= 25) unlock("sigma_master");
        if (kill.every(s => s.status !== "INACTIVE")) unlock("full_killchain");
      } catch { /* ignore */ }
    };

    void check();
    const iv = setInterval(check, 15_000);
    return () => clearInterval(iv);
  }, [BASE, unlock]);

  return (
    <>
      <button
        onClick={() => setGalleryOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 4,
          border: "1px solid var(--bg-border)",
          background: "transparent", color: "var(--text-muted)",
          fontSize: "0.7rem", fontFamily: "monospace", cursor: "pointer",
          transition: "all 0.15s",
        }}
        title={`Achievements (${unlocked.size}/${DEFS.length})`}
        onMouseEnter={e => (e.currentTarget.style.color = "#ffd700")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        🏆 {unlocked.size}/{DEFS.length}
      </button>

      <div style={{ position: "fixed", top: 72, right: 16, zIndex: 9998, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: "rgba(10,14,26,0.96)",
              border: rarityBorder(t.achievement.rarity),
              boxShadow: rarityShadow(t.achievement.rarity),
              borderRadius: 12, padding: "12px 16px", minWidth: 260,
              animation: "slideInFromRight 0.35s ease",
              pointerEvents: "auto",
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: "0.58rem", fontWeight: 700, color: rarityColor(t.achievement.rarity), letterSpacing: "0.15em", marginBottom: 6 }}>
              🏆 ACHIEVEMENT UNLOCKED
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: "1.4rem" }}>{t.achievement.icon}</span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.82rem", color: "#fff" }}>{t.achievement.title}</span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: 8 }}>
              {t.achievement.description}
            </div>
            <span style={{
              fontSize: "0.52rem", fontFamily: "monospace", fontWeight: 700,
              padding: "2px 8px", borderRadius: 999,
              color: rarityColor(t.achievement.rarity),
              border: `1px solid ${rarityColor(t.achievement.rarity)}44`,
              background: `${rarityColor(t.achievement.rarity)}11`,
            }}>{t.achievement.rarity}</span>
          </div>
        ))}
      </div>

      {galleryOpen && (
        <>
          <div className="fixed inset-0 z-[8998]" onClick={() => setGalleryOpen(false)} />
          <div style={{
            position: "fixed", top: 56, right: 16, zIndex: 8999,
            width: 440, maxHeight: "calc(100vh - 80px)",
            background: "var(--bg-secondary)",
            border: "var(--card-border)", borderRadius: "var(--panel-radius)",
            boxShadow: "var(--card-shadow)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--bg-border)", flexShrink: 0 }}>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.8rem", color: "#ffd700", letterSpacing: "0.1em" }}>
                🏆 ACHIEVEMENTS ({unlocked.size}/{DEFS.length})
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12, overflowY: "auto" }}>
              {DEFS.map(a => {
                const isU = unlocked.has(a.id);
                return (
                  <div
                    key={a.id}
                    style={{
                      background: isU ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.3)",
                      border: isU ? rarityBorder(a.rarity) : "1px solid rgba(255,255,255,0.05)",
                      boxShadow: isU ? rarityShadow(a.rarity) : undefined,
                      borderRadius: 10, padding: 12,
                      opacity: isU ? 1 : 0.45,
                      filter: isU ? "none" : "grayscale(80%)",
                    }}
                  >
                    <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{isU ? a.icon : "🔒"}</div>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.7rem", color: isU ? "#fff" : "rgba(255,255,255,0.25)", marginBottom: 4 }}>
                      {isU ? a.title : "???"}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.58rem", color: isU ? "var(--text-muted)" : "rgba(255,255,255,0.12)", lineHeight: 1.5 }}>
                      {isU ? a.description : "Keep monitoring to unlock"}
                    </div>
                    {isU && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{
                          fontSize: "0.5rem", fontFamily: "monospace", fontWeight: 700,
                          padding: "2px 6px", borderRadius: 999,
                          color: rarityColor(a.rarity),
                          border: `1px solid ${rarityColor(a.rarity)}44`,
                          background: `${rarityColor(a.rarity)}11`,
                        }}>{a.rarity}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
