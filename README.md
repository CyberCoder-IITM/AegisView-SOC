# AegisView

Real-time SOC network anomaly detection and compliance dashboard — built for security analysts who need to see everything, instantly.

---

## What it is

AegisView is a full-stack Security Operations Center dashboard that ingests live network packet data, detects anomalies using statistical z-score analysis, attributes threats to MITRE ATT&CK stages, and surfaces actionable intelligence — all in a single cinematic interface. An autonomous AI agent runs continuously in the background, analyzing every packet and generating Gemini-powered threat narratives.

---

## Features

### Real-time Detection
- **Live Packet Feed** — scrolling capture of the last 100 packets with src/dst IP, protocol, port, flags, country, and anomaly highlighting
- **Threat Level Gauge** — animated score (0–100) with SAFE / ELEVATED / HIGH / CRITICAL thresholds
- **Z-Score Anomaly Chart** — time-series with statistical deviation bands and a 12-step ML forecast with trend direction (RISING / FALLING / STABLE)
- **Protocol Breakdown** — live pie chart of TCP / UDP / ICMP / other traffic ratios
- **Live Stats Bar** — packets-per-second, uptime, active threat count, and risk score updated every 2 seconds

### AI & Intelligence
- **SOC Agent Panel** — autonomous agent runs on a configurable cycle, analyzing all packets and generating structured threat intelligence with MITRE tactic attribution
- **AI Insights** — Gemini 2.5 Flash generates a grounded 3-sentence analyst narrative for each anomaly; never fabricates facts not present in the packet data
- **Natural Language Query Engine** — ask plain-English questions ("Which IP is sending the most traffic?") and get precise, data-grounded answers from the live capture window
- **Dark Web Correlation** — every flagged IP is checked against Emerging Threats, Feodo Tracker C2, and URLhaus Malware feeds in real time

### Visualization
- **Globe Map** — 3D rotating globe with animated threat arcs from source country to target; 17 accurate landmass polygons
- **Live Network Topology Map** — force-directed graph built from live packet data; nodes colored by threat status (TOR nodes red, external orange, internal cyan); draggable, filterable by protocol and direction
- **Port/Time Heatmap** — 30×20 matrix showing traffic density by hour and destination port
- **Device Radar** — behavioral profiling of every IP seen in the capture window, flagging devices that deviate from their learned baseline

### Threat Attribution
- **MITRE ATT&CK Kill Chain** — animated 5-stage progress bar (Reconnaissance → Initial Access → Execution → Lateral Movement → Exfiltration) populated by the SOC agent
- **Sigma Rule Generator** — auto-generates detection rules in Sigma YAML for each flagged threat; one-click copy, Splunk/Kibana export links, and YAML download
- **Compliance Panel** — NIST 800-53 and ISO 27001 rule checks with violation details and PDF report export

### Session & Incident Management
- **Session Timeline Scrubber** — pinned bottom bar lets analysts scrub back through any point in the current session and replay the dashboard state at that exact moment
- **Incident Manager** — create, track, and share incidents; each incident links to a frozen snapshot with its own shareable URL (`/incident/:id`)
- **Forensic Integrity Chain** — every packet appended to a SHA-256 tamper-evident blockchain; chain status (INTACT / COMPROMISED) verified on demand
- **War Room Mode** — full-screen command overlay with all critical metrics unified for major incident response (`W` key)

### Reliability & Quality of Life
- **Attack Simulator** — inject realistic traffic patterns (SYN Flood, Port Scan, Telnet sweep, RDP brute force, Data Exfil) to train analysts or test detection rules
- **System Health Monitor** — live status of all 6 internal subsystems; degraded components surface in the header
- **Achievement System** — unlockable milestones as analysts explore features
- **Cinematic Onboarding** — animated feature tour on first visit, skippable
- **Keyboard Shortcuts** — `W` War Room, `R` trigger AI analysis, `C` verify chain, `E` export report, `?` shortcut legend
- **Error Isolation** — every panel wrapped in an ErrorBoundary; a single component crash never takes down the dashboard

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4, Recharts, Wouter |
| UI Components | Radix UI primitives (shadcn/ui) |
| Data Fetching | TanStack Query v5 with generated React hooks (Orval) |
| Backend | Express 5, TypeScript, Pino structured logging |
| AI | Google Gemini 2.5 Flash via `@google/genai` |
| API Contract | OpenAPI 3.1 spec → Zod schemas + React Query hooks (codegen) |
| Monorepo | pnpm workspaces |

---

## Project layout

```
/
├── artifacts/
│   ├── aegisview/          # React + Vite frontend (served at /)
│   └── api-server/         # Express 5 API (served at /api)
├── lib/
│   ├── api-spec/           # OpenAPI spec + codegen config (Orval)
│   ├── api-client-react/   # Generated React Query hooks
│   └── api-zod/            # Generated Zod validation schemas
└── scripts/                # Shared utility scripts
```

---

## API surface

All routes served under `/api`. Every response is JSON.

| Method | Path | Description |
|---|---|---|
| GET | `/healthz` | Health check |
| GET | `/packets` | Last 100 captured packets |
| GET | `/threats` | Currently flagged anomalies |
| GET | `/threat-level` | Composite risk score + label |
| GET | `/stats/live` | PPS, uptime, threat count, risk score |
| GET | `/stats/anomaly-timeline` | 60-point z-score time series |
| GET | `/stats/protocol-breakdown` | Traffic split by protocol |
| GET | `/forecast` | 12-step threat forecast + trend direction |
| GET | `/analytics/heatmap` | 30×20 port/time traffic matrix |
| GET | `/geo/threats` | Threat IPs with lat/lon for globe |
| GET | `/compliance/report` | NIST/ISO rule checks and violations |
| GET | `/mitre/killchain` | 5-stage ATT&CK attribution |
| GET | `/baseline/status` | Behavioral baseline mode + deviations |
| GET | `/devices` | Per-IP behavioral profiles |
| GET | `/sigma/rules` | Auto-generated Sigma YAML rules |
| GET | `/agent/status` | SOC agent running state + cycle count |
| GET | `/agent/cycles` | Recent agent cycle results |
| GET | `/chain/status` | Integrity chain length + INTACT/COMPROMISED |
| GET | `/chain/latest` | Last 10 blockchain entries |
| GET | `/replay/timeline` | Full session timeline |
| GET | `/replay/snapshots` | List of saved snapshots |
| GET | `/replay/snapshot/:id` | Snapshot detail with packet sample |
| GET | `/incidents` | All incidents |
| GET | `/incidents/:id` | Single incident |
| POST | `/incidents/create` | Create incident from snapshot |
| GET | `/intel/darkweb/summary` | Threat feed correlation summary |
| GET | `/health/detailed` | Per-subsystem health (6 components) |
| POST | `/ai/analyze` | Gemini narrative for a single anomaly |
| POST | `/query` | Natural language query against live data |
| POST | `/simulate/:type` | Inject attack traffic (syn_flood, port_scan, telnet, rdp_brute, exfil) |
| POST | `/simulate/stop` | Stop active simulation |

---

## Getting started

```bash
# Install dependencies
pnpm install

# Run the API server
pnpm --filter @workspace/api-server run dev

# Run the frontend
pnpm --filter @workspace/aegisview run dev
```

Both services are wired up automatically in the Replit environment via the configured workflows. The shared reverse proxy routes `/api/*` to the API server and everything else to the frontend.

To regenerate the API client after changing the OpenAPI spec:

```bash
pnpm --filter @workspace/api-spec run codegen
```

To typecheck everything:

```bash
pnpm run typecheck
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Port for each service (set by workflow config) |
| `BASE_PATH` | Yes | URL base path prefix (set by workflow config) |
| `SESSION_SECRET` | Yes | Secret for session signing |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Yes | Gemini API proxy base URL |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Yes | Gemini API key |

---

## Architecture notes

**Contract-first API** — the OpenAPI spec in `lib/api-spec` is the single source of truth. Zod schemas and React Query hooks are both generated from it; the server validates inputs and outputs against the Zod schemas, and the frontend never writes fetch calls by hand.

**Structured logging** — the API server uses Pino throughout. Route handlers log via `req.log`; non-request code uses the singleton `logger`. No `console.log` anywhere in server code.

**Error isolation** — every dashboard panel is wrapped in a React `ErrorBoundary`. A canvas rendering bug or a bad API response shape in one panel shows a contained error card with a Retry button; the rest of the dashboard keeps running.

**Integrity chain** — every packet that passes through the system is appended to an in-memory SHA-256 blockchain. The chain is verifiable at any time via `GET /api/chain/status` and the Forensic Integrity Chain panel.
