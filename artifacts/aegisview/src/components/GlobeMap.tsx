import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
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

function severityColor(severity: string): string {
  if (severity === "CRITICAL") return "#ff0033";
  if (severity === "HIGH") return "#ff6b35";
  if (severity === "MED") return "#ffd700";
  return "#00d4ff";
}

export default function GlobeMap() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; threat: GeoThreat } | null>(null);
  const [ready, setReady] = useState(false);
  const [arcProgress, setArcProgress] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

  const { data: geoThreats } = useGetGeoThreats({
    query: { queryKey: getGetGeoThreatsQueryKey(), refetchInterval: 5000 },
  });

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.25;
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.0 }, 1200);
  }, []);

  useEffect(() => {
    let start: number | null = null;
    const duration = 1800;
    const step = (ts: number) => {
      if (!start) start = ts;
      setArcProgress(Math.min((ts - start) / duration, 1));
      if ((ts - start) / duration < 1) requestAnimationFrame(step);
    };
    const frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [geoThreats]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!geoThreats?.length) return;
    globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 1.8 }, 1000);
  }, [geoThreats]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        minHeight: "280px",
      }}
    >
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0a0e1a"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        onGlobeReady={() => {
          setReady(true);
          globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.0 }, 0);
        }}
        atmosphereColor="#1a4fff"
        atmosphereAltitude={0.15}
        showGraticules={false}
        pointsData={geoThreats || []}
        pointLat="latitude"
        pointLng="longitude"
        pointColor={(d: any) => severityColor(d.severity)}
        pointAltitude={(d: any) => Math.min(0.08 + d.threat_count * 0.01, 0.3)}
        pointRadius={(d: any) => Math.min(0.16 + d.threat_count * 0.02, 0.45)}
        pointsMerge={false}
        arcsData={(geoThreats || []).map(threat => ({
          startLat: 40.7,
          startLng: -74,
          endLat: threat.latitude,
          endLng: threat.longitude,
          color: severityColor(threat.severity),
        }))}
        arcColor="color"
        arcAltitude={0.2}
        arcStroke={0.65}
        arcDashLength={0.65}
        arcDashGap={1.1}
        arcDashAnimateTime={1800}
        arcsTransitionDuration={0}
        arcDashInitialGap={() => 1.1 * (1 - arcProgress)}
        onPointClick={(point: any, event: MouseEvent) => {
          const threat = point as GeoThreat;
          const target = event.target as HTMLElement;
          const rect = target?.getBoundingClientRect?.();
          if (!rect) return;
          setTooltip({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, threat });
        }}
      />
      <div className="absolute top-2 left-3 text-[10px] text-primary/60 font-mono uppercase tracking-widest pointer-events-none">
        Global Threat Map — {(geoThreats || []).length} Active Sources
      </div>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground bg-[#0a0e1a]">
          Loading globe…
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
