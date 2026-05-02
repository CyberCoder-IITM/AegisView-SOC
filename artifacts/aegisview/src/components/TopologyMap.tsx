import React, { useEffect, useRef, useState, useCallback } from "react";

interface PacketRecord {
  src_ip: string;
  dst_ip: string;
  protocol: string;
  is_anomaly: boolean;
  severity: string;
  is_external: boolean;
  length: number;
}

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  count: number;
  isExternal: boolean;
  isThreat: boolean;
  isTor: boolean;
  isHighestAnomaly: boolean;
  deviceType: string;
}

interface Edge {
  src: string;
  dst: string;
  count: number;
  hasAnomaly: boolean;
  isCritical: boolean;
  protocol: string;
}

interface Tooltip {
  x: number;
  y: number;
  content: string;
}

const TOR_IPS = ["185.220.101", "185.220.102", "185.220.100"];
const THREAT_IPS = ["45.33.32", "91.108.4", "103.21.244", "194.165", "37.120", "185.234"];

function guessDeviceType(ip: string): string {
  if (ip.startsWith("192.168.1.1") || ip.startsWith("10.0.0.1") || ip.startsWith("172.16.0.1")) return "📡";
  if (ip.startsWith("10.0.0") || ip.startsWith("192.168.1.10") || ip.startsWith("192.168.1.25")) return "🖥";
  if (ip.startsWith("192.168") || ip.startsWith("10.") || ip.startsWith("172.16")) return "💻";
  return "🌐";
}

function nodeColor(n: Node): string {
  if (n.isTor || n.isHighestAnomaly) return "#ff0033";
  if (n.isThreat) return "#ff6b35";
  if (!n.isExternal) return "#00d4ff";
  return "#6b7280";
}

function isRFC1918(ip: string): boolean {
  return ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.");
}

export function TopologyMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Map<string, Node>>(new Map());
  const edgesRef = useRef<Map<string, Edge>>(new Map());
  const animFrameRef = useRef<number>(0);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [filterInternal, setFilterInternal] = useState(false);
  const [filterExternal, setFilterExternal] = useState(false);
  const [filterProtocol, setFilterProtocol] = useState("ALL");
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  const updateGraph = useCallback((packets: PacketRecord[]) => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;

    const anomalyCount: Record<string, number> = {};

    for (const p of packets) {
      const ips = [p.src_ip, p.dst_ip];
      for (const ip of ips) {
        if (!nodes.has(ip)) {
          nodes.set(ip, {
            id: ip, x: W / 2 + (Math.random() - 0.5) * 200, y: H / 2 + (Math.random() - 0.5) * 200,
            vx: 0, vy: 0, count: 0, isExternal: !isRFC1918(ip),
            isTor: TOR_IPS.some(t => ip.startsWith(t)),
            isThreat: THREAT_IPS.some(t => ip.startsWith(t)),
            isHighestAnomaly: false,
            deviceType: guessDeviceType(ip),
          });
        }
        const n = nodes.get(ip)!;
        n.count++;
        if (p.is_anomaly) anomalyCount[ip] = (anomalyCount[ip] ?? 0) + 1;
      }

      let proto = p.protocol;
      if (filterProtocol !== "ALL" && proto !== filterProtocol) continue;

      const edgeKey = `${p.src_ip}→${p.dst_ip}`;
      const existing = edges.get(edgeKey);
      if (existing) {
        existing.count++;
        if (p.is_anomaly) existing.hasAnomaly = true;
        if (p.severity === "CRITICAL") existing.isCritical = true;
      } else {
        edges.set(edgeKey, {
          src: p.src_ip, dst: p.dst_ip, count: 1,
          hasAnomaly: p.is_anomaly,
          isCritical: p.severity === "CRITICAL",
          protocol: p.protocol,
        });
      }
    }

    const maxAnomalies = Math.max(1, ...Object.values(anomalyCount));
    for (const [ip, count] of Object.entries(anomalyCount)) {
      const n = nodes.get(ip);
      if (n) n.isHighestAnomaly = count === maxAnomalies && count > 0;
    }

    if (nodes.size > 40) {
      const sorted = [...nodes.entries()].sort((a, b) => a[1].count - b[1].count);
      for (const [id] of sorted.slice(0, nodes.size - 40)) {
        nodes.delete(id);
        for (const [k, e] of edges) {
          if (e.src === id || e.dst === id) edges.delete(k);
        }
      }
    }
  }, [filterProtocol]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${BASE}/api/packets`);
        const packets: PacketRecord[] = await r.json();
        updateGraph(packets);
      } catch { /* ignore */ }
    };
    void load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [BASE, updateGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const W = canvas.width;
      const H = canvas.height;

      const nodeArr = [...nodes.values()];
      const filtered = nodeArr.filter(n => {
        if (filterInternal && !n.isExternal) return false;
        if (filterExternal && n.isExternal) return false;
        return true;
      });

      for (const n of filtered) {
        for (const m of filtered) {
          if (n.id === m.id) continue;
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = Math.min(800, 1600 / (dist * dist));
          n.vx += (dx / dist) * force * 0.01;
          n.vy += (dy / dist) * force * 0.01;
        }
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
        n.vx *= 0.85;
        n.vy *= 0.85;
        if (dragRef.current?.id !== n.id) {
          n.x = Math.max(24, Math.min(W - 24, n.x + n.vx));
          n.y = Math.max(24, Math.min(H - 24, n.y + n.vy));
        }
      }

      ctx.clearRect(0, 0, W, H);

      const maxCount = Math.max(1, ...filtered.map(n => n.count));

      for (const e of edges.values()) {
        const src = nodes.get(e.src);
        const dst = nodes.get(e.dst);
        if (!src || !dst) continue;
        if (filterProtocol !== "ALL" && e.protocol !== filterProtocol) continue;
        if (filterInternal && (!src.isExternal || !dst.isExternal)) continue;
        if (filterExternal && (src.isExternal || dst.isExternal)) continue;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);
        const w = Math.max(0.5, Math.min(4, e.count / 5));
        ctx.lineWidth = w;
        ctx.strokeStyle = e.isCritical ? "rgba(255,0,51,0.7)" : e.hasAnomaly ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.08)";
        ctx.stroke();
      }

      for (const n of filtered) {
        const r = Math.max(8, Math.min(22, 8 + (n.count / maxCount) * 14));
        const color = nodeColor(n);

        if (n.isTor || n.isHighestAnomaly) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = `${color}20`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `${color}22`;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        ctx.font = `${Math.max(9, r - 2)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.deviceType, n.x, n.y);

        ctx.font = "8px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textBaseline = "top";
        const label = n.id.split(".").slice(-2).join(".");
        ctx.fillText(label, n.x, n.y + r + 3);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [filterInternal, filterExternal, filterProtocol]);

  const getNodeAt = (x: number, y: number): Node | null => {
    for (const n of nodesRef.current.values()) {
      const r = Math.max(8, Math.min(22, 8 + (n.count / 100) * 14));
      const dx = n.x - x, dy = n.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= r + 4) return n;
    }
    return null;
  };

  const getEdgeAt = (x: number, y: number): Edge | null => {
    const nodes = nodesRef.current;
    for (const e of edgesRef.current.values()) {
      const src = nodes.get(e.src), dst = nodes.get(e.dst);
      if (!src || !dst) continue;
      const t = ((x - src.x) * (dst.x - src.x) + (y - src.y) * (dst.y - src.y)) /
        ((dst.x - src.x) ** 2 + (dst.y - src.y) ** 2 || 1);
      const tc = Math.max(0, Math.min(1, t));
      const px = src.x + tc * (dst.x - src.x);
      const py = src.y + tc * (dst.y - src.y);
      if (Math.sqrt((x - px) ** 2 + (y - py) ** 2) < 6) return e;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    if (dragRef.current) {
      const n = nodesRef.current.get(dragRef.current.id);
      if (n) { n.x = x; n.y = y; }
      return;
    }

    const node = getNodeAt(x, y);
    if (node) {
      setTooltip({ x: e.clientX, y: e.clientY, content: `${node.id}\n${node.isExternal ? "External" : "Internal"} · ${node.count} packets${node.isTor ? " · TOR" : ""}${node.isThreat ? " · THREAT" : ""}` });
      canvasRef.current.style.cursor = "pointer";
      return;
    }
    const edge = getEdgeAt(x, y);
    if (edge) {
      setTooltip({ x: e.clientX, y: e.clientY, content: `${edge.src} → ${edge.dst}\n${edge.count} packets · ${edge.protocol}${edge.hasAnomaly ? " · ⚠ ANOMALY" : ""}` });
      canvasRef.current.style.cursor = "crosshair";
      return;
    }
    setTooltip(null);
    canvasRef.current.style.cursor = "default";
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const node = getNodeAt(x, y);
    if (node) dragRef.current = { id: node.id, ox: x - node.x, oy: y - node.y };
  };

  const handleMouseUp = () => { dragRef.current = null; };

  const resetLayout = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    for (const n of nodesRef.current.values()) {
      n.x = W / 2 + (Math.random() - 0.5) * 300;
      n.y = H / 2 + (Math.random() - 0.5) * 200;
      n.vx = 0; n.vy = 0;
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#000910", position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 12px", background: "rgba(0,0,0,0.5)",
        borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, flexWrap: "wrap",
      }}>
        {[
          { label: "Show Internal", active: filterInternal, onClick: () => setFilterInternal(v => !v) },
          { label: "Show External", active: filterExternal, onClick: () => setFilterExternal(v => !v) },
        ].map(b => (
          <button key={b.label} onClick={b.onClick} style={{
            padding: "2px 10px", fontSize: "0.58rem", fontFamily: "monospace", fontWeight: 700,
            background: b.active ? "rgba(0,212,255,0.15)" : "transparent",
            color: b.active ? "var(--aegis-cyan)" : "var(--text-muted)",
            border: b.active ? "1px solid rgba(0,212,255,0.4)" : "1px solid var(--bg-border)",
            borderRadius: 4, cursor: "pointer",
          }}>{b.label} Only</button>
        ))}
        <select
          value={filterProtocol}
          onChange={e => setFilterProtocol(e.target.value)}
          style={{
            padding: "2px 8px", fontSize: "0.58rem", fontFamily: "monospace",
            background: "rgba(0,0,0,0.5)", color: "var(--text-secondary)",
            border: "1px solid var(--bg-border)", borderRadius: 4, cursor: "pointer",
          }}
        >
          {["ALL", "TCP", "UDP", "ICMP"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={resetLayout} style={{
          padding: "2px 10px", fontSize: "0.58rem", fontFamily: "monospace",
          background: "transparent", color: "var(--text-muted)",
          border: "1px solid var(--bg-border)", borderRadius: 4, cursor: "pointer",
        }}>↺ Reset</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: "0.55rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
          {[
            { color: "#00d4ff", label: "Internal" },
            { color: "#6b7280", label: "External" },
            { color: "#ff6b35", label: "Threat" },
            { color: "#ff0033", label: "Tor/Anomaly" },
          ].map(l => (
            <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={900} height={280}
          style={{ width: "100%", height: "100%", display: "block" }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setTooltip(null); dragRef.current = null; }}
        />
        {tooltip && (
          <div style={{
            position: "fixed", left: tooltip.x + 12, top: tooltip.y - 10,
            background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6, padding: "6px 10px",
            fontFamily: "monospace", fontSize: "0.62rem", color: "var(--text-primary)",
            whiteSpace: "pre", pointerEvents: "none", zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}>
            {tooltip.content}
          </div>
        )}
        {nodesRef.current.size === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "monospace", fontSize: "0.72rem", color: "var(--aegis-cyan)",
          }} className="animate-pulse">
            Building network topology...
          </div>
        )}
      </div>
    </div>
  );
}
