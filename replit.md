# AegisView v2.0 — SOC Security Dashboard

## Overview

AegisView is a real-time network anomaly detection and compliance auditing dashboard for FinTech and Government SOC teams. "Wireshark + Splunk in a browser." Phase 2 adds AI threat narratives, MITRE ATT&CK kill chain, packet heatmap, attack simulation, behavioral baseline, TOR/threat intel enrichment, and forensic reporting.

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
  - `Header` — v2.0 badge, LEARNING/ACTIVE baseline pill, simulation active badge, LIVE clock
  - `MitreKillChain` — 5 hexagonal SVG nodes with animated arcs, polls every 3s
  - `ThreatLevelGauge` — SVG radial gauge (0-100 threat score)
  - `GlobeMap` — Canvas-based world threat map with animated arcs
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

#### New Libraries
- `lib/threatIntel.ts` — TOR exit node detection, bulletproof ASN detection, reputation scoring
- `lib/killchain.ts` — MITRE ATT&CK kill chain computation (recon, initial access, lateral, C2, exfil)
- `lib/baseline.ts` — Behavioral baseline engine (LEARNING → ACTIVE, deviation tracking)

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
