# AegisView v2.0 — SOC Security Dashboard

## Overview

AegisView is a real-time network anomaly detection and compliance auditing dashboard for FinTech and Government SOC teams. "Wireshark + Splunk in a browser." Phase 4 (Final) adds 7 major features: Cinematic Onboarding, Session Replay/Timeline Scrubber, Shareable Incident Links, System Health Monitor, Natural Language Query Engine, Achievement System, and Live Network Topology Map.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS, Recharts, Lucide React
- **API framework**: Express 5
- **AI**: Google Gemini 2.5 Flash via Replit AI Integrations (`@google/genai`)
- **Validation**: Zod (zod/v4)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

### Frontend (`artifacts/aegisview`)
- Single-page scrollable dashboard at `/`
- Dark SOC aesthetic (#0a0e1a background), 12+ panel layout
- Components:
  - `Header` — v2.0 badge, baseline pill, replay banner, QueryEngine/Achievements/IncidentManager/SystemHealth actions
  - `Onboarding` — Cinematic terminal boot sequence + feature showcase (shows once, stored in localStorage)
  - `TimelineScrubber` — Fixed bottom bar with sparkline, scrub to any 10s snapshot for replay mode
  - `IncidentManager` — Bell dropdown, auto-creates incidents on CRITICAL threats, shareable links via `/incident/:id`
  - `SystemHealth` — Header dropdown with 6 component status indicators + performance bars
  - `QueryEngine` — Modal with Gemini AI natural language Q&A against live packet data, press `/` to open
  - `Achievements` — 8 achievements (COMMON→LEGENDARY), toast notifications, gallery modal, persisted in localStorage
  - `TopologyMap` — Canvas-based force simulation network topology with filters, drag support, edge/node tooltips
  - `MitreKillChain` — 5 hexagonal SVG nodes with animated arcs, polls every 3s
  - `ThreatLevelGauge` — SVG radial gauge (0-100 threat score)
  - `GlobeMap` — Canvas-based world threat map with animated arcs (tabbed with TopologyMap)
  - `ProtocolBreakdown` — Recharts donut chart (TCP/UDP/ICMP/OTHER)
  - `AnomalyChart` — Recharts line chart with z-score anomaly detection
  - `HeatmapPanel` — Pure SVG 30×20 packet velocity heatmap (port × time)
  - `BaselinePanel` — Learning progress bar / deviation bars
  - `PacketFeed` — Live packet table with INTEL column (TOR/BPH/SCANNER badges)
  - `CompliancePanel` — PCI-DSS/NIST accordion + Forensic Report download
  - `AIInsights` — Gemini AI threat narratives with typewriter animation
  - `SimulatorPanel` — Fixed bottom-right attack simulation panel (5 attack types)

### Backend (`artifacts/api-server`)
- Express 5 API at `/api`
- In-memory packet simulator + 7 new modules

#### Libraries
- `lib/threatIntel.ts` — TOR exit node detection, bulletproof ASN detection, reputation scoring
- `lib/killchain.ts` — MITRE ATT&CK kill chain computation (recon, initial access, lateral, C2, exfil)
- `lib/baseline.ts` — Behavioral baseline engine (LEARNING → ACTIVE, deviation tracking)
- `lib/sessionRecorder.ts` — Records 10s snapshots (up to 60min history), provides timeline/scrubber data

#### All Routes
- `GET /api/packets` — Last 100 packets
- `GET /api/threats` — Anomaly results
- `GET /api/threat-level` — Composite threat score (0-100)
- `GET /api/compliance/report` — PCI-DSS/NIST audit report
- `GET /api/geo/threats` — Geo-located threat IPs
- `GET /api/stats/protocol-breakdown` — Protocol distribution
- `GET /api/stats/anomaly-timeline` — Z-score over time
- `POST /api/ai/analyze` — Gemini AI threat narrative generation
- `GET /api/mitre/killchain` — MITRE ATT&CK kill chain state
- `GET /api/analytics/heatmap` — Packet velocity heatmap (30×20 port/time matrix)
- `GET /api/baseline/status` — Behavioral baseline status
- `GET /api/report/forensic` — Full forensic incident report (markdown download)
- `POST /api/simulate/syn_flood` — SYN flood attack simulation
- `POST /api/simulate/port_scan` — Port scan simulation
- `POST /api/simulate/telnet` — Telnet barrage simulation
- `POST /api/simulate/rdp_brute` — RDP brute force simulation
- `POST /api/simulate/exfil` — Data exfiltration simulation
- `POST /api/simulate/stop` — Stop all simulations
- `GET /api/simulate/status` — Simulation status
- `GET /api/replay/timeline` — Timeline points (threat_level, anomaly_count every 10s)
- `GET /api/replay/snapshots` — Snapshot index list
- `GET /api/replay/snapshot/:id` — Full snapshot for replay mode
- `POST /api/incidents/create` — Create shareable incident with snapshot reference
- `GET /api/incidents/:id` — Fetch incident + linked snapshot
- `GET /api/incidents` — All incidents (reverse chronological)
- `GET /api/health/detailed` — 6 component statuses + performance metrics
- `POST /api/query` — Natural language query against live packet data (Gemini AI)

### Routing
- `/` — Main dashboard (Home.tsx)
- `/incident/:id` — Load incident and enter replay mode for that snapshot

### Simulation Engine
- Generates 1-10 packets every 500ms
- `injectPacket()` for simulation mode injection
- Statistical anomaly detection: Z-score > 2.5
- Compliance rules: PCI-DSS-1.2, PCI-DSS-6.5, NIST-SI-3, NIST-AC-17
- 10 realistic external threat IPs with real geo data

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks

## AI Integration

Uses Replit AI Integrations for Gemini (no API key required). Env vars `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY` are auto-provisioned. Initialize with `apiVersion: ""` in httpOptions.

## Color Palette
- Background: `#0a0e1a`
- Primary (cyan): `#00d4ff`
- Secondary (purple): `#7b2fff`
- Danger: `#ff0033`
- Warning: `#ffd700`
- Success: `#00ff88`
- High: `#ff6b35`
