import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="col-span-12 h-14 border-b border-border bg-card flex items-center justify-between px-6 z-10 relative">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg tracking-widest text-foreground">AEGIS<span className="text-primary">VIEW</span></h1>
      </div>
      
      <div className="flex items-center gap-6 font-mono text-xs">
        <div className="text-muted-foreground">
          {time.toISOString().replace('T', ' ').substring(0, 19)} UTC
        </div>
        <div className="flex items-center gap-2 bg-success/10 px-3 py-1.5 rounded-full border border-success/20">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-success font-bold tracking-wider">LIVE</span>
        </div>
      </div>
    </header>
  );
}
