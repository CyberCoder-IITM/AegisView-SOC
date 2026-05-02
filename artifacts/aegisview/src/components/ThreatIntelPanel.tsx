import React, { useEffect, useRef, useState } from "react";

interface FeedStatus {
  name: string;
  last_updated: string;
  ip_count: number;
  status: "fresh" | "stale" | "failed";
}

interface IntelSummary {
  total_ips_checked: number;
  compromised_hits: number;
  c2_hits: number;
  malware_hits: number;
  feed_status: FeedStatus[];
  top_matched_ips: Array<{ ip: string; category: string; packet_count: number }>;
}

interface HitEntry {
  id: string;
  ip: string;
  category: string;
  feed: string;
  time: string;
  pktCount: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  C2: "#ff0033",
  MALWARE: "#ff6b35",
  COMPROMISED: "#ffd700",
  SUSPICIOUS: "#7b2fff",
  CLEAN: "#00ff88",
};

const FEED_STATUS_COLOR = { fresh: "#00ff88", stale: "#ffd700", failed: "#ff0033" };

export function ThreatIntelPanel() {
  const [summary, setSummary] = useState<IntelSummary | null>(null);
  const [liveHits, setLiveHits] = useState<HitEntry[]>([]);
  const prevTopRef = useRef<string>("");
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/intel/darkweb/summary`);
        const d: IntelSummary = await res.json();
        setSummary(d);

        const topKey = d.top_matched_ips.map(t => t.ip + t.category).join(",");
        if (topKey !== prevTopRef.current) {
          prevTopRef.current = topKey;
          const newHits: HitEntry[] = d.top_matched_ips.map(t => ({
            id: `${t.ip}-${Date.now()}`,
            ip: t.ip,
            category: t.category,
            feed: d.feed_status.map(f => f.name).join(", "),
            time: new Date().toLocaleTimeString(),
            pktCount: t.packet_count,
          }));
          if (newHits.length > 0) {
            setLiveHits(prev => [...newHits.slice(0, 3), ...prev].slice(0, 10));
          }
        }
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [BASE]);

  return (
    <div className="w-full h-full flex flex-col font-mono text-xs" style={{ background: "#0a0e1a" }}>
      <div className="px-3 py-2 border-b border-border shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">🕸 Live Threat Intelligence Feeds</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Feed status cards */}
        <div className="flex flex-col gap-1.5">
          {(summary?.feed_status ?? [{ name: "Emerging Threats", last_updated: "pending", ip_count: 0, status: "stale" as const },
            { name: "Feodo Tracker C2", last_updated: "pending", ip_count: 0, status: "stale" as const },
            { name: "URLhaus Malware", last_updated: "pending", ip_count: 0, status: "stale" as const }]).map(feed => (
            <div key={feed.name} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: "#0d1117", border: "1px solid #1a1a2a" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: FEED_STATUS_COLOR[feed.status] }} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold truncate" style={{ color: "#ccc" }}>{feed.name}</div>
                <div className="text-[9px]" style={{ color: "#444" }}>
                  {feed.ip_count > 0 ? `${feed.ip_count.toLocaleString()} IPs` : "Fetching..."} · {feed.last_updated === "never" ? "pending" : feed.last_updated.slice(11, 19)}
                </div>
              </div>
              <span className="text-[8px] uppercase" style={{ color: FEED_STATUS_COLOR[feed.status] }}>{feed.status}</span>
            </div>
          ))}
        </div>

        {/* Hit counters */}
        <div className="rounded p-2" style={{ background: "#0d1117", border: "1px solid #1a1a2a" }}>
          <div className="text-[10px] mb-2 font-bold" style={{ color: "#ffd700" }}>
            DARKWEB CORRELATIONS: {(summary?.c2_hits ?? 0) + (summary?.malware_hits ?? 0) + (summary?.compromised_hits ?? 0)}
          </div>
          <div className="flex gap-4 text-[10px]">
            <span>🔴 C2: <span style={{ color: "#ff0033" }}>{summary?.c2_hits ?? 0}</span></span>
            <span>☠ Malware: <span style={{ color: "#ff6b35" }}>{summary?.malware_hits ?? 0}</span></span>
            <span>⚠ Compromised: <span style={{ color: "#ffd700" }}>{summary?.compromised_hits ?? 0}</span></span>
          </div>
        </div>

        {/* Live hit feed */}
        <div>
          <div className="text-[9px] mb-1.5" style={{ color: "#444" }}>Live Intel Hits</div>
          {liveHits.length === 0 ? (
            <div className="text-[10px]" style={{ color: "#2a2a2a" }}>
              {summary?.total_ips_checked === 0 ? "Loading threat intelligence feeds..." : "No feed matches in current traffic"}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {liveHits.map((hit, i) => (
                <div
                  key={hit.id}
                  className="px-2 py-1.5 rounded"
                  style={{
                    background: `${CATEGORY_COLOR[hit.category] ?? "#444"}10`,
                    border: `1px solid ${CATEGORY_COLOR[hit.category] ?? "#444"}30`,
                    animation: i === 0 ? "none" : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px]" style={{ color: CATEGORY_COLOR[hit.category] ?? "#888" }}>
                      ⚠ {hit.ip} — {hit.category}
                    </span>
                    <span className="text-[9px]" style={{ color: "#444" }}>{hit.time}</span>
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "#555" }}>
                    {hit.pktCount} packet{hit.pktCount !== 1 ? "s" : ""} seen
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {summary && (
          <div className="text-[9px]" style={{ color: "#2a2a2a" }}>
            Feeds cover {summary.total_ips_checked.toLocaleString()} known malicious IPs worldwide
          </div>
        )}
      </div>
    </div>
  );
}
