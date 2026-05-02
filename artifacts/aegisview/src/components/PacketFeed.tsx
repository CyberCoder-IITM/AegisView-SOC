import React, { useRef, useEffect } from "react";
import { useGetPackets } from "@workspace/api-client-react";
import { enrichIp } from "@/lib/threatIntel";

const COL = "80px 130px 130px 52px 52px 58px 90px 70px";

export function PacketFeed() {
  const { data: packets } = useGetPackets({
    query: { refetchInterval: 1000 },
  });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [packets?.length]);

  const rows = [...(packets || [])].sort((a, b) => {
    const scoreFn = (p: typeof a) => {
      const intel = a.is_external ? enrichIp(p.src_ip) : null;
      return intel?.reputation_score || 0;
    };
    return scoreFn(b) - scoreFn(a);
  });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      {/* Column header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: COL,
        fontSize: "0.65rem",
        fontFamily: "monospace",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        padding: "var(--space-xs) var(--space-sm)",
        borderBottom: "1px solid var(--bg-border)",
        flexShrink: 0,
        background: "var(--bg-secondary)",
        alignItems: "center",
      }}>
        <div>Time</div>
        <div>Source</div>
        <div>Destination</div>
        <div>Proto</div>
        <div style={{ textAlign: "right" }}>Size</div>
        <div style={{ textAlign: "center" }}>Flags</div>
        <div style={{ textAlign: "center" }}>Intel</div>
        <div style={{ textAlign: "right" }}>Severity</div>
      </div>

      {/* Rows */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {rows.length === 0 ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--aegis-cyan)", fontFamily: "monospace", fontSize: "0.75rem", padding: 24 }} className="animate-pulse">
            WAITING FOR PACKETS...
          </div>
        ) : (
          rows.map((p, index) => {
            const intel = p.is_external ? enrichIp(p.src_ip) : null;
            const isHighRep = (intel?.reputation_score || 0) > 50;
            const isCritical = p.is_anomaly && p.severity === "CRITICAL";
            const isHigh = p.is_anomaly && p.severity === "HIGH";

            const protoColor = p.protocol === "TCP" ? "var(--aegis-cyan)" : p.protocol === "UDP" ? "var(--aegis-purple)" : p.protocol === "ICMP" ? "var(--aegis-orange)" : "var(--aegis-grey)";

            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: COL,
                  alignItems: "center",
                  padding: "5px var(--space-sm)",
                  fontSize: "0.72rem",
                  fontFamily: "monospace",
                  borderBottom: `1px solid ${isHighRep ? "rgba(255,0,51,0.15)" : "rgba(30,45,64,0.5)"}`,
                  borderLeft: isHighRep ? "3px solid var(--aegis-red)" : "3px solid transparent",
                  background: isCritical || isHighRep
                    ? "rgba(255,0,51,0.1)"
                    : isHigh
                    ? "rgba(255,107,53,0.06)"
                    : index % 2 === 0
                    ? "rgba(255,255,255,0.01)"
                    : "transparent",
                }}
              >
                <div style={{ opacity: 0.55, fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.timestamp.split("T")[1]?.substring(0, 8) || "--"}
                </div>
                <div style={{ color: "var(--aegis-cyan)", fontSize: "0.68rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.src_ip}:{p.src_port}
                </div>
                <div style={{ fontSize: "0.68rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                  {p.dst_ip}:{p.dst_port}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.68rem", color: protoColor }}>
                  {p.protocol}
                </div>
                <div style={{ textAlign: "right", opacity: 0.55, fontSize: "0.68rem" }}>
                  {p.length}B
                </div>
                <div style={{ textAlign: "center", opacity: 0.65, fontSize: "0.68rem" }}>
                  {p.flags || "-"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
                  {intel?.is_tor && (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px", borderRadius: 2, background: "var(--aegis-red)", color: "#fff" }}>☠TOR</span>
                  )}
                  {intel?.is_bulletproof && (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px", borderRadius: 2, background: "var(--aegis-orange)", color: "#fff" }}>BPH</span>
                  )}
                  {intel?.threat_tags.includes("SCANNER") && (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px", borderRadius: 2, background: "var(--aegis-yellow)", color: "#000" }}>🔍</span>
                  )}
                  {intel && intel.reputation_score > 0 && (
                    <span style={{ fontSize: "0.6rem", opacity: 0.6, color: intel.reputation_score > 50 ? "var(--aegis-red)" : "var(--aegis-yellow)" }}>
                      {intel.reputation_score}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {p.severity === "CRITICAL" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: 3, fontSize: "0.6rem", fontWeight: 700, background: "rgba(255,0,51,0.2)", color: "var(--aegis-red)", border: "1px solid rgba(255,0,51,0.4)" }}>CRIT</span>
                  ) : p.severity === "HIGH" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: 3, fontSize: "0.6rem", fontWeight: 700, background: "rgba(255,107,53,0.15)", color: "var(--aegis-orange)", border: "1px solid rgba(255,107,53,0.3)" }}>HIGH</span>
                  ) : p.severity === "MED" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: 3, fontSize: "0.6rem", fontWeight: 700, background: "rgba(255,215,0,0.12)", color: "var(--aegis-yellow)", border: "1px solid rgba(255,215,0,0.3)" }}>MED</span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: 3, fontSize: "0.6rem", fontWeight: 700, background: "rgba(0,255,136,0.08)", color: "var(--aegis-green)", border: "1px solid rgba(0,255,136,0.2)" }}>OK</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
