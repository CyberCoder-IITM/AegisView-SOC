import React, { useRef, useEffect } from "react";
import { useGetPackets } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function PacketFeed() {
  const { data: packets } = useGetPackets({
    query: { refetchInterval: 1000 },
  });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [packets?.length]);

  const rows = packets || [];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center text-[10px] uppercase font-bold text-muted-foreground px-4 py-2 bg-card border-b border-border tracking-wider shrink-0">
        <div className="w-24 shrink-0">Time</div>
        <div className="w-40 shrink-0">Source</div>
        <div className="w-40 shrink-0">Destination</div>
        <div className="w-14 shrink-0">Proto</div>
        <div className="w-14 shrink-0 text-right">Size</div>
        <div className="w-18 shrink-0 text-center">Flags</div>
        <div className="flex-1 text-right">Severity</div>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ maxHeight: 420 }}
      >
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-primary animate-pulse font-mono text-xs py-12">
            WAITING FOR PACKETS...
          </div>
        ) : (
          rows.map((p, index) => {
            const isCritical = p.is_anomaly && p.severity === "CRITICAL";
            const isHigh = p.is_anomaly && p.severity === "HIGH";
            return (
              <div
                key={p.id}
                className="flex items-center text-xs font-mono px-4 border-b border-[rgba(255,255,255,0.02)]"
                style={{
                  height: 36,
                  backgroundColor: isCritical
                    ? "rgba(255,0,51,0.12)"
                    : isHigh
                    ? "rgba(255,107,53,0.06)"
                    : index % 2 === 0
                    ? "rgba(255,255,255,0.01)"
                    : "transparent",
                }}
              >
                <div className="w-24 shrink-0 truncate opacity-60 text-[10px]">
                  {p.timestamp.split("T")[1]?.substring(0, 8) || "--"}
                </div>
                <div className="w-40 shrink-0 truncate text-primary text-[10px]">
                  {p.src_ip}:{p.src_port}
                </div>
                <div className="w-40 shrink-0 truncate text-[10px]">
                  {p.dst_ip}:{p.dst_port}
                </div>
                <div className="w-14 shrink-0 font-bold text-[10px]" style={{ color: p.protocol === "TCP" ? "#00d4ff" : p.protocol === "UDP" ? "#7b2fff" : p.protocol === "ICMP" ? "#ff6b35" : "#888" }}>
                  {p.protocol}
                </div>
                <div className="w-14 shrink-0 text-right opacity-60 text-[10px]">
                  {p.length}B
                </div>
                <div className="w-18 shrink-0 text-center opacity-70 text-[10px]">
                  {p.flags || "-"}
                </div>
                <div className="flex-1 flex justify-end">
                  {p.severity === "CRITICAL" ? (
                    <Badge variant="destructive" className="text-[9px] h-5 rounded-sm px-1.5">CRIT</Badge>
                  ) : p.severity === "HIGH" ? (
                    <Badge className="bg-[rgba(255,107,53,0.2)] text-[#ff6b35] hover:bg-[rgba(255,107,53,0.2)] border-[#ff6b35]/30 text-[9px] h-5 rounded-sm px-1.5">HIGH</Badge>
                  ) : p.severity === "MED" ? (
                    <Badge className="bg-[rgba(255,215,0,0.15)] text-[#ffd700] hover:bg-[rgba(255,215,0,0.15)] border-[#ffd700]/30 text-[9px] h-5 rounded-sm px-1.5">MED</Badge>
                  ) : (
                    <Badge className="bg-[rgba(0,255,136,0.08)] text-[#00ff88] hover:bg-[rgba(0,255,136,0.08)] border-[#00ff88]/20 text-[9px] h-5 rounded-sm px-1.5">OK</Badge>
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
