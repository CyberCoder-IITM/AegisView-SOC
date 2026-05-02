import React, { useRef, useEffect, useState } from "react";
import { useGetGeoThreats, getGetGeoThreatsQueryKey } from "@workspace/api-client-react";

interface GeoThreat {
  ip: string;
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  asn: string;
  org: string;
  port_score: number;
  threat_count: number;
  severity: string;
}

function latLonToXY(lat: number, lon: number, w: number, h: number): [number, number] {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return [x, y];
}

function severityColor(severity: string): string {
  if (severity === "CRITICAL") return "#ff0033";
  if (severity === "HIGH") return "#ff6b35";
  if (severity === "MED") return "#ffd700";
  return "#00d4ff";
}

// ─── Accurate simplified world landmasses ───────────────────────────────────
// Each polygon is [lon, lat] pairs tracing the coastline clockwise.

const LANDMASSES: Array<Array<[number, number]>> = [

  // ── North America (main body including Central America) ──────────────────
  [
    [-168,72],[-156,72],[-141,70],[-137,59],[-132,54],[-126,50],[-124,49],
    [-124,42],[-120,37],[-118,34],[-117,32],[-114,28],[-110,24],[-105,20],
    [-97,20],[-92,18],[-88,16],[-83,10],[-78,8],
    // East coast back up
    [-76,9],[-82,10],[-86,15],[-90,16],[-95,18],[-97,22],[-105,22],[-110,22],
    [-118,20],[-105,22],
    // skip back, trace Gulf coast up east:
    [-98,26],[-97,26],[-94,30],[-90,29],[-85,30],[-81,25],[-80,25],[-80,32],
    [-78,35],[-76,37],[-75,38],[-74,40],[-72,41],[-70,42],[-67,44],[-66,44],
    [-64,44],[-66,46],[-60,46],[-60,48],[-64,48],[-64,52],[-66,58],[-68,52],
    [-60,58],[-64,62],[-68,68],[-80,72],[-100,72],[-120,68],[-132,60],
    [-145,62],[-158,58],[-162,60],[-165,66],[-168,72]
  ],

  // ── Greenland ────────────────────────────────────────────────────────────
  [
    [-44,84],[-24,83],[-18,77],[-18,72],[-22,70],[-26,68],[-44,60],[-48,62],
    [-52,68],[-54,72],[-52,77],[-44,80],[-44,84]
  ],

  // ── South America ────────────────────────────────────────────────────────
  [
    [-77,8],[-72,12],[-62,12],[-62,9],[-60,6],[-50,2],[-50,-1],[-44,-2],
    [-35,-5],[-35,-8],[-38,-15],[-40,-20],[-43,-23],[-44,-24],[-48,-28],
    [-52,-32],[-58,-34],[-60,-38],[-65,-42],[-66,-46],[-68,-52],[-68,-55],
    [-73,-52],[-72,-50],[-72,-45],[-74,-40],[-72,-34],[-71,-30],[-70,-18],
    [-75,-10],[-80,-3],[-80,0],[-78,2],[-77,8]
  ],

  // ── Europe (main body) ───────────────────────────────────────────────────
  [
    // Iberian peninsula
    [-9,37],[-9,39],[-9,42],[-8,44],[-2,44],[2,43],[3,42],[3,44],
    // France/Belgium/Netherlands
    [2,51],[4,52],[5,53],[8,55],[10,55],[12,56],[15,57],[18,57],
    // Scandinavia east side
    [20,64],[24,66],[28,70],[30,70],
    // Finland/Russia
    [28,65],[25,60],[22,60],[20,57],
    // Baltic
    [18,57],[15,54],[10,55],[8,55],[5,54],[5,58],[7,63],[15,65],[18,69],[28,70],
    // Back around
    [26,60],[22,55],[18,54],[14,54],[10,55],[8,57],[5,58],[5,63],[10,60],
    // back to start
    [10,55],[8,55],[4,44],[3,43],[2,43],[-2,44],[-4,44],[-9,44],[-9,37]
  ],

  // ── Scandinavia + Norway ─────────────────────────────────────────────────
  [
    [5,58],[7,58],[8,57],[10,55],[12,56],[15,57],[18,57],[20,64],
    [24,66],[28,70],[28,71],[16,70],[14,67],[14,65],[12,62],[8,62],
    [5,63],[5,58]
  ],

  // ── British Isles (Great Britain) ────────────────────────────────────────
  [
    [-5,50],[-3,50],[-2,52],[-3,53],[-4,54],[-5,54],[-4,56],[-3,58],
    [-2,58],[-1,57],[0,56],[0,54],[-1,52],[-2,51],[-4,50],[-5,50]
  ],

  // ── Ireland ──────────────────────────────────────────────────────────────
  [
    [-8,52],[-6,52],[-6,53],[-6,54],[-8,55],[-10,54],[-10,52],[-8,52]
  ],

  // ── Africa ───────────────────────────────────────────────────────────────
  [
    [-5,36],[-2,35],[2,35],[10,37],[12,34],[15,32],[25,31],[32,30],[34,27],
    [37,23],[42,15],[44,12],[45,10],[45,5],[42,2],[40,-2],[38,-10],[35,-18],
    [35,-22],[32,-25],[30,-30],[28,-33],[22,-34],[18,-34],[16,-30],[14,-22],
    [11,-15],[10,-10],[8,-5],[5,0],[2,5],[0,5],[-5,5],[-15,12],[-17,15],
    [-17,20],[-13,27],[-5,34],[-5,36]
  ],

  // ── Madagascar ───────────────────────────────────────────────────────────
  [
    [44,-12],[46,-15],[50,-16],[50,-22],[48,-24],[44,-22],[44,-16],[44,-12]
  ],

  // ── Middle East / Arabian Peninsula ──────────────────────────────────────
  [
    [26,42],[28,38],[32,32],[35,30],[37,27],[40,22],[44,15],[48,13],[52,13],
    [56,14],[58,20],[56,23],[54,24],[52,23],[50,25],[48,30],[46,30],[44,33],
    [40,38],[36,36],[32,36],[28,36],[26,38],[26,42]
  ],

  // ── Asia (main body) ─────────────────────────────────────────────────────
  [
    // Turkey / Caucasus
    [26,42],[30,42],[36,42],[40,40],[42,42],[44,43],[48,44],[52,46],[55,48],
    // Central Asia
    [58,50],[62,52],[68,55],[70,55],[80,55],[88,50],[90,50],[95,50],[100,50],
    [105,52],[110,54],[115,55],[120,54],[125,50],[130,48],[132,44],
    // Russian Far East
    [135,46],[135,43],[130,35],[128,32],[126,30],[122,27],[120,22],[116,20],
    // Southeast Asia
    [110,18],[108,16],[106,10],[104,2],[102,1],[100,2],[100,6],[102,10],
    [105,10],[108,15],[110,18],[116,20],[120,22],[122,25],[120,27],
    [116,30],[116,40],[120,40],[125,40],[130,35],[132,40],[135,43],
    [140,45],[145,44],[145,50],[140,55],[135,58],[130,62],[128,68],
    [120,72],[100,72],[80,72],[68,72],[60,68],[55,62],[55,55],
    // India subcontinent
    [48,44],[44,40],[40,38],[36,36],[32,36],[28,38],[26,42],[30,42],
    [36,42],[40,40],[42,38],[44,38],[46,38],[48,42],[52,46]
  ],

  // ── Indian Subcontinent (separate for accuracy) ──────────────────────────
  [
    [62,24],[68,22],[74,18],[76,12],[78,8],[80,10],[80,14],[80,18],
    [82,22],[85,22],[88,24],[92,27],[94,27],[96,24],[92,22],[88,22],
    [84,18],[80,14],[80,10],[78,8],[76,8],[74,14],[72,18],[68,22],[64,24],[62,24]
  ],

  // ── Southeast Asia Peninsula (Indochina/Thailand/Malaysia) ───────────────
  [
    [98,20],[100,18],[102,16],[104,10],[104,4],[102,2],[100,2],[100,6],
    [102,8],[104,10],[106,14],[104,16],[102,18],[100,20],[98,20]
  ],

  // ── China / East Asia coast (to complement main Asia) ────────────────────
  [
    [110,20],[112,22],[116,22],[120,25],[122,27],[120,30],[116,34],[116,40],
    [120,40],[122,38],[125,40],[128,36],[128,34],[126,30],[122,28],[120,25],
    [116,22],[112,22],[110,20]
  ],

  // ── Japan (Honshu main island) ───────────────────────────────────────────
  [
    [130,31],[132,34],[134,35],[136,36],[138,37],[140,38],[142,40],
    [144,44],[145,44],[143,42],[142,38],[140,38],[138,35],[136,34],
    [134,34],[132,34],[130,32],[130,31]
  ],

  // ── Australia ────────────────────────────────────────────────────────────
  [
    [114,-22],[116,-20],[122,-18],[128,-14],[132,-12],[136,-12],[138,-13],
    [136,-16],[136,-18],[140,-17],[142,-18],[144,-18],[146,-19],[148,-20],
    [150,-22],[152,-26],[152,-30],[150,-34],[148,-38],[145,-38],[142,-37],
    [138,-36],[136,-35],[130,-33],[126,-32],[122,-30],[116,-26],[114,-22]
  ],

  // ── New Zealand (South Island) ───────────────────────────────────────────
  [
    [166,-45],[168,-46],[170,-46],[172,-44],[172,-42],[170,-40],[168,-42],[166,-45]
  ],

  // ── New Zealand (North Island) ───────────────────────────────────────────
  [
    [174,-38],[176,-38],[178,-38],[178,-40],[176,-41],[174,-41],[172,-40],[174,-38]
  ],
];

export default function GlobeMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; threat: GeoThreat } | null>(null);
  const [arcProgress, setArcProgress] = useState(0);

  const { data: geoThreats } = useGetGeoThreats({
    query: { queryKey: getGetGeoThreatsQueryKey(), refetchInterval: 5000 },
  });

  useEffect(() => {
    let start: number | null = null;
    const duration = 3000;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setArcProgress(progress);
      if (progress < 1) animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [geoThreats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Latitude/longitude grid
    ctx.strokeStyle = "rgba(0, 212, 255, 0.05)";
    ctx.lineWidth = 0.5;
    for (let lat = -90; lat <= 90; lat += 30) {
      const [, y] = latLonToXY(lat, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = latLonToXY(0, lon, w, h);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Equator highlight
    ctx.strokeStyle = "rgba(0, 212, 255, 0.12)";
    ctx.lineWidth = 0.8;
    const [, eqY] = latLonToXY(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(0, eqY);
    ctx.lineTo(w, eqY);
    ctx.stroke();

    // Draw landmasses
    ctx.fillStyle = "rgba(20, 40, 80, 0.85)";
    ctx.strokeStyle = "rgba(0, 212, 255, 0.25)";
    ctx.lineWidth = 0.7;
    for (const landmass of LANDMASSES) {
      ctx.beginPath();
      landmass.forEach(([lon, lat], i) => {
        const [x, y] = latLonToXY(lat, lon, w, h);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // SOC HQ dot (New York)
    const [cx, cy] = latLonToXY(40.7, -74, w, h);
    // Outer pulse ring
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,212,255,0.08)";
    ctx.fill();
    // Core dot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,212,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Arcs and threat points
    const threats = geoThreats || [];
    for (const threat of threats) {
      const [tx, ty] = latLonToXY(threat.latitude, threat.longitude, w, h);

      const arcColor =
        threat.severity === "CRITICAL" ? "rgba(255,0,51,0.5)"
        : threat.severity === "HIGH"   ? "rgba(255,107,53,0.5)"
        : threat.severity === "MED"    ? "rgba(255,215,0,0.4)"
        :                                "rgba(0,212,255,0.3)";

      // Curved arc
      const cp1x = (tx + cx) / 2;
      const cp1y = Math.min(ty, cy) - 55;
      const endX = tx + (cx - tx) * arcProgress;
      const endY = ty + (cy - ty) * arcProgress;
      const midX = cp1x + (tx - cp1x) * (1 - arcProgress);
      const midY = cp1y + (ty - cp1y) * (1 - arcProgress);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = threat.severity === "CRITICAL" ? 1.5 : 0.9;
      ctx.stroke();

      // Glow + dot
      const radius = Math.min(2 + threat.threat_count / 5, 8);
      const glowColor =
        threat.severity === "CRITICAL" ? "rgba(255,0,51,"
        : threat.severity === "HIGH"   ? "rgba(255,107,53,"
        :                                "rgba(255,215,0,";

      const gradient = ctx.createRadialGradient(tx, ty, 0, tx, ty, radius * 3);
      gradient.addColorStop(0, glowColor + "0.5)");
      gradient.addColorStop(1, glowColor + "0)");
      ctx.beginPath();
      ctx.arc(tx, ty, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = severityColor(threat.severity);
      ctx.fill();

      if (threat.severity === "CRITICAL") {
        const pulseSize = radius + (arcProgress * 8) % 8;
        ctx.beginPath();
        ctx.arc(tx, ty, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,0,51,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // SOC HQ label
    ctx.fillStyle = "#00d4ff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("SOC HQ", cx + 7, cy - 5);

  }, [geoThreats, arcProgress]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const threats = geoThreats || [];
    for (const threat of threats) {
      const [tx, ty] = latLonToXY(threat.latitude, threat.longitude, canvas.width, canvas.height);
      if (Math.sqrt((mx - tx) ** 2 + (my - ty) ** 2) < 15) {
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, threat });
        return;
      }
    }
    setTooltip(null);
  };

  return (
    <div className="relative w-full h-full bg-[#0a0e1a] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1200}
        height={400}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ display: "block" }}
      />
      <div className="absolute top-2 left-3 text-[10px] text-primary/60 font-mono uppercase tracking-widest">
        Global Threat Map — {(geoThreats || []).length} Active Sources
      </div>
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-card border border-border rounded p-2 text-xs font-mono shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
        >
          <div className="font-bold text-primary">{tooltip.threat.ip}</div>
          <div className="text-muted-foreground">{tooltip.threat.city}, {tooltip.threat.country}</div>
          <div className="text-muted-foreground">ASN: {tooltip.threat.asn}</div>
          <div className="text-muted-foreground">Org: {tooltip.threat.org}</div>
          <div className="mt-1">
            <span className="text-muted-foreground">Threats: </span>
            <span className="font-bold" style={{ color: severityColor(tooltip.threat.severity) }}>
              {tooltip.threat.threat_count}
            </span>
            <span className="ml-2 text-muted-foreground">Score: </span>
            <span className="font-bold text-warning">{tooltip.threat.port_score}</span>
          </div>
          <div className="mt-1 font-bold uppercase" style={{ color: severityColor(tooltip.threat.severity), fontSize: 9 }}>
            {tooltip.threat.severity}
          </div>
        </div>
      )}
    </div>
  );
}
