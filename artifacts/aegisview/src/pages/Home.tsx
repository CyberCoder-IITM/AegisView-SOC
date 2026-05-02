import React, { Suspense } from "react";
import { Header } from "@/components/Header";
import { ThreatLevelGauge } from "@/components/ThreatLevelGauge";
import { ProtocolBreakdown } from "@/components/ProtocolBreakdown";
import { AnomalyChart } from "@/components/AnomalyChart";
import { PacketFeed } from "@/components/PacketFeed";
import { CompliancePanel } from "@/components/CompliancePanel";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load GlobeMap since it's heavy
const GlobeMap = React.lazy(() => import("@/components/GlobeMap"));

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* 12 Column CSS Grid Layout */}
      <div className="flex-1 grid grid-cols-12 grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-0 w-full h-screen">
        
        {/* Header Bar */}
        <Header />

        {/* Row 1 */}
        <div className="col-span-3 border-r border-b border-border bg-card">
          <ThreatLevelGauge />
        </div>
        <div className="col-span-9 border-b border-border bg-black relative">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-[#0a0e1a]"><Skeleton className="w-64 h-64 rounded-full opacity-10" /></div>}>
            <div className="absolute inset-0 overflow-hidden">
              <GlobeMap />
            </div>
          </Suspense>
        </div>

        {/* Row 2 */}
        <div className="col-span-4 border-r border-b border-border bg-card">
          <ProtocolBreakdown />
        </div>
        <div className="col-span-8 border-b border-border bg-card">
          <AnomalyChart />
        </div>

        {/* Row 3 */}
        <div className="col-span-8 border-r border-border bg-card flex flex-col">
          <PacketFeed />
        </div>
        <div className="col-span-4 border-border bg-card">
          <CompliancePanel />
        </div>

      </div>
    </div>
  );
}
