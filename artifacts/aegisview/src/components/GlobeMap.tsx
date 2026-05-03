import React, { useEffect, useRef, useState } from "react";
import { useGetGeoThreats, getGetGeoThreatsQueryKey } from "@workspace/api-client-react";
import worldMapImage from "@assets/image_1777783490190.png";

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
  const paddingX = w * 0.025;
  const paddingY = h * 0.045;
  const mapW = w - paddingX * 2;
  const mapH = h - paddingY * 2;
  const x = paddingX + ((lon + 180) / 360) * mapW;
  const y = paddingY + ((90 - lat) / 180) * mapH;
  return [x, y];
}

function severityColor(severity: string): string {
  if (severity === "CRITICAL") return "#ff0033";
  if (severity === "HIGH") return "#ff6b35";
  if (severity === "MED") return "#ffd700";
  return "#00d4ff";
}

export default function GlobeMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; threat: GeoThreat } | null>(null);
  const [arcProgress, setArcProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const { data: geoThreats } = useGetGeoThreats({
    query: { queryKey: getGetGeoThreatsQueryKey(), refetchInterval: 5000 },
  });

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setMapReady(true);
    };
    image.src = worldMapImage;
    setMapReady(true);
  }, []);

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
    const [hqx, hqy] = latLonToXY(40.7, -74, w, h);

    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    const image = imageRef.current;
    if (image) {
      ctx.drawImage(image, 0, 0, w, h);
    }

    ctx.strokeStyle = "rgba(0, 212, 255, 0.12)";
    ctx.lineWidth = 0.6;
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = latLonToXY(lat, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(w * 0.025, y);
      ctx.lineTo(w - w * 0.025, y);
      ctx.stroke();
    }

    const canvasThreats = geoThreats || [];
    ctx.beginPath();
    ctx.arc(hqx, hqy, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,212,255,0.08)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hqx, hqy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.fill();

    for (const threat of canvasThreats) {
      const [tx, ty] = latLonToXY(threat.latitude, threat.longitude, w, h);
      const arcColor = threat.severity === "CRITICAL" ? "rgba(255,0,51,0.5)" : threat.severity === "HIGH" ? "rgba(255,107,53,0.5)" : threat.severity === "MED" ? "rgba(255,215,0,0.4)" : "rgba(0,212,255,0.3)";
      const cp1x = (tx + hqx) / 2;
      const cp1y = Math.min(ty, hqy) - 55;
      const endX = tx + (hqx - tx) * arcProgress;
      const endY = ty + (hqy - ty) * arcProgress;
      const midX = cp1x + (tx - cp1x) * (1 - arcProgress);
      const midY = cp1y + (ty - cp1y) * (1 - arcProgress);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = threat.severity === "CRITICAL" ? 1.5 : 0.9;
      ctx.stroke();
      const markerRadius = Math.min(2 + threat.threat_count / 4, 9);
      const glowColor = threat.severity === "CRITICAL" ? "rgba(255,0,51," : threat.severity === "HIGH" ? "rgba(255,107,53," : "rgba(255,215,0,";
      const gradient = ctx.createRadialGradient(tx, ty, 0, tx, ty, markerRadius * 3);
      gradient.addColorStop(0, glowColor + "0.5)");
      gradient.addColorStop(1, glowColor + "0)");
      ctx.beginPath();
      ctx.arc(tx, ty, markerRadius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx, ty, markerRadius, 0, Math.PI * 2);
      ctx.fillStyle = severityColor(threat.severity);
      ctx.fill();
    }

    ctx.fillStyle = "#00d4ff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("SOC HQ", hqx + 7, hqy - 5);
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
      <div className="absolute top-2 left-3 text-[10px] text-primary/60 font-mono uppercase tracking-widest pointer-events-none">
        Global Threat Map — {(geoThreats || []).length} Active Sources
      </div>
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground bg-[#0a0e1a]">
          Loading map…
        </div>
      )}
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
