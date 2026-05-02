# AegisView — SOC Security Dashboard

## Overview

AegisView is a real-time network anomaly detection and compliance auditing dashboard for FinTech and Government SOC teams. "Wireshark + Splunk in a browser."

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS, Recharts, Lucide React
- **API framework**: Express 5
- **Validation**: Zod (zod/v4)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

### Frontend (`artifacts/aegisview`)
- Single-page dashboard at `/`
- 12-column CSS Grid layout with dark SOC aesthetic (#0a0e1a background)
- Real-time data via React Query polling (1-5s intervals)
- Components:
  - `ThreatLevelGauge` — SVG radial gauge (0-100 threat score)
  - `GlobeMap` — Canvas-based world threat map with animated arcs
  - `ProtocolBreakdown` — Recharts donut chart (TCP/UDP/ICMP/OTHER)
  - `AnomalyChart` — Recharts line chart with z-score anomaly detection
  - `PacketFeed` — Live scrolling packet table with severity badges
  - `CompliancePanel` — PCI-DSS/NIST compliance accordion

### Backend (`artifacts/api-server`)
- Express 5 API at `/api`
- In-memory packet simulator (`src/lib/simulator.ts`) generating realistic network traffic
- Routes:
  - `GET /api/packets` — Last 100 packets
  - `GET /api/threats` — Anomaly results
  - `GET /api/threat-level` — Composite threat score (0-100)
  - `GET /api/compliance/report` — PCI-DSS/NIST audit report
  - `GET /api/geo/threats` — Geo-located threat IPs
  - `GET /api/stats/protocol-breakdown` — Protocol distribution
  - `GET /api/stats/anomaly-timeline` — Z-score over time

### Simulation Engine
- Generates 1-10 packets every 500ms
- Occasional burst mode (simulates attack waves)
- Statistical anomaly detection: Z-score > 2.5 flags anomalies
- Compliance rules: PCI-DSS-1.2, PCI-DSS-6.5, NIST-SI-3, NIST-AC-17
- 10 realistic external threat IPs with real geo data

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec

## Color Palette
- Background: `#0a0e1a`
- Primary (cyan): `#00d4ff`
- Secondary (purple): `#7b2fff`
- Danger: `#ff0033`
- Warning: `#ffd700`
- Success: `#00ff88`
- High: `#ff6b35`
