import React, { useRef, useEffect, useState } from "react";
import { useGetGeoThreats } from "@workspace/api-client-react";

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

// Simplified world country outlines (major landmasses as polygon approximations)
const LANDMASSES: Array<Array<[number, number]>> = [
  // North America
  [[-168,72],[-140,70],[-120,60],[-100,48],[-80,43],[-70,45],[-64,44],[-65,42],[-75,35],[-80,25],[-88,15],[-83,10],[-78,8],[-77,8],[-85,11],[-90,15],[-92,18],[-97,20],[-105,23],[-110,28],[-120,35],[-125,38],[-130,54],[-140,60],[-152,60],[-160,60],[-165,68],[-168,72]],
  // South America
  [[-80,12],[-76,8],[-75,4],[-70,1],[-58,-3],[-50,-1],[-44,-2],[-35,-5],[-35,-10],[-40,-20],[-43,-23],[-48,-28],[-53,-33],[-68,-55],[-74,-52],[-72,-42],[-75,-37],[-72,-30],[-70,-18],[-75,-10],[-80,-5],[-80,0],[-80,12]],
  // Europe
  [[10,71],[30,70],[28,65],[25,60],[30,55],[20,54],[15,54],[10,55],[8,57],[5,58],[5,63],[15,65],[18,69],[10,71]],
  // Africa
  [[15,37],[30,31],[37,22],[43,12],[44,5],[40,-2],[38,-10],[35,-18],[32,-25],[28,-32],[20,-34],[18,-30],[14,-22],[10,-5],[5,5],[0,5],[-5,5],[-15,12],[-17,15],[-17,20],[-13,27],[-5,34],[5,37],[15,37]],
  // Asia (simplified)
  [[30,70],[50,72],[60,68],[70,68],[80,73],[100,73],[140,72],[140,55],[135,45],[130,35],[125,25],[120,20],[105,10],[100,5],[105,0],[115,-8],[125,-10],[130,0],[135,10],[140,40],[145,44],[145,50],[140,55],[135,60],[130,65],[100,72],[80,73]],
  // Australia
  [[115,-22],[120,-18],[130,-15],[137,-15],[140,-17],[145,-17],[150,-22],[152,-27],[152,-32],[148,-37],[145,-38],[140,-37],[135,-35],[130,-32],[125,-30],[118,-25],[115,-22]],
];

export default function GlobeMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; threat: GeoThreat } | null>(null);
  const [arcProgress, setArcProgress] = useState(0);

  const { data: geoThreats } = useGetGeoThreats({
    query: { refetchInterval: 5000 },
  });

  // Animate arc drawing
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

    // Grid lines
    ctx.strokeStyle = "rgba(0, 212, 255, 0.06)";
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

    // Draw landmasses
    ctx.fillStyle = "rgba(20, 40, 80, 0.8)";
    ctx.strokeStyle = "rgba(0, 212, 255, 0.2)";
    ctx.lineWidth = 0.8;
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

    // Center point (our location)
    const [cx, cy] = latLonToXY(40, -74, w, h); // New York as "us"
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,212,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw arcs and threat points
    const threats = geoThreats || [];
    for (const threat of threats) {
      const [tx, ty] = latLonToXY(threat.latitude, threat.longitude, w, h);
      const color = severityColor(threat.severity);

      // Arc from threat to center
      const cp1x = (tx + cx) / 2;
      const cp1y = Math.min(ty, cy) - 60;

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      // Draw partial arc based on progress
      const endX = tx + (cx - tx) * arcProgress;
      const endY = ty + (cy - ty) * arcProgress;
      const midX = cp1x + (tx - cp1x) * (1 - arcProgress);
      const midY = cp1y + (ty - cp1y) * (1 - arcProgress);

      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.strokeStyle = color.replace(")", ", 0.4)").replace("rgb", "rgba").replace("#", "rgba(").replace("rgba(ff0033, 0.4)", "rgba(255,0,51,0.4)").replace("rgba(ff6b35, 0.4)", "rgba(255,107,53,0.4)").replace("rgba(ffd700, 0.4)", "rgba(255,215,0,0.4)").replace("rgba(00d4ff, 0.4)", "rgba(0,212,255,0.4)");

      // Simpler approach for color with opacity
      const arcColor = threat.severity === "CRITICAL"
        ? "rgba(255,0,51,0.5)"
        : threat.severity === "HIGH"
        ? "rgba(255,107,53,0.5)"
        : threat.severity === "MED"
        ? "rgba(255,215,0,0.4)"
        : "rgba(0,212,255,0.3)";
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = threat.severity === "CRITICAL" ? 1.5 : 1;
      ctx.stroke();

      // Threat point with glow
      const radius = Math.min(2 + threat.threat_count / 5, 8);
      const glowColor = threat.severity === "CRITICAL"
        ? "rgba(255,0,51,"
        : threat.severity === "HIGH"
        ? "rgba(255,107,53,"
        : "rgba(255,215,0,";

      // Glow
      const gradient = ctx.createRadialGradient(tx, ty, 0, tx, ty, radius * 3);
      gradient.addColorStop(0, glowColor + "0.6)");
      gradient.addColorStop(1, glowColor + "0)");
      ctx.beginPath();
      ctx.arc(tx, ty, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Pulse ring if CRITICAL
      if (threat.severity === "CRITICAL") {
        const pulseSize = radius + (arcProgress * 8) % 8;
        ctx.beginPath();
        ctx.arc(tx, ty, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,0,51,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Label "SOC HQ"
    ctx.fillStyle = "#00d4ff";
    ctx.font = "bold 10px monospace";
    ctx.fillText("SOC HQ", cx + 8, cy - 4);

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
      const dist = Math.sqrt((mx - tx) ** 2 + (my - ty) ** 2);
      if (dist < 15) {
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          threat,
        });
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
