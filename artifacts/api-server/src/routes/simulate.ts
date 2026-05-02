import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { injectPacket, type PacketRecord } from "../lib/simulator.js";

const router: IRouter = Router();

let simulationActive = false;
let simulationMode: string | null = null;
const simulationTimers: NodeJS.Timeout[] = [];

function clearSimulation() {
  simulationTimers.forEach(t => clearTimeout(t));
  simulationTimers.length = 0;
  simulationActive = false;
  simulationMode = null;
}

function rndInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rndIp(prefix: string) {
  return `${prefix}${rndInt(1, 254)}.${rndInt(1, 254)}`;
}

function schedulePackets(count: number, intervalMs: number, factory: () => PacketRecord) {
  for (let i = 0; i < count; i++) {
    const t = setTimeout(() => injectPacket(factory()), i * intervalMs);
    simulationTimers.push(t);
  }
}

router.post("/simulate/syn_flood", (req, res) => {
  clearSimulation();
  simulationActive = true;
  simulationMode = "syn_flood";
  const intensity = (req.body?.intensity as number) || 30;
  const duration = (req.body?.duration as number) || 15;
  const total = intensity * duration;
  const prefix = Math.random() > 0.5 ? "185." : "45.";
  schedulePackets(total, 1000 / intensity, () => ({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    src_ip: rndIp(prefix),
    dst_ip: "10.0.0.1",
    src_port: rndInt(1024, 65535),
    dst_port: 80,
    protocol: "TCP",
    length: rndInt(40, 60),
    flags: "SYN",
    ttl: 64,
    is_anomaly: true,
    z_score: 4.5,
    severity: "CRITICAL",
    country: "Unknown",
    is_external: true,
  }));
  const endTimer = setTimeout(() => { if (simulationMode === "syn_flood") clearSimulation(); }, duration * 1000 + 1000);
  simulationTimers.push(endTimer);
  res.json({ started: true, mode: "syn_flood", intensity, duration });
});

router.post("/simulate/port_scan", (req, res) => {
  clearSimulation();
  simulationActive = true;
  simulationMode = "port_scan";
  const ports = 1024;
  schedulePackets(ports, 50, () => {
    const portIdx = rndInt(1, 1024);
    return {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      src_ip: "185.220.101.47",
      dst_ip: "10.0.0.1",
      src_port: rndInt(30000, 60000),
      dst_port: portIdx,
      protocol: "TCP",
      length: 44,
      flags: "SYN",
      ttl: 64,
      is_anomaly: true,
      z_score: 3.8,
      severity: "HIGH",
      country: "United Kingdom",
      is_external: true,
    };
  });
  const endTimer = setTimeout(() => { if (simulationMode === "port_scan") clearSimulation(); }, ports * 50 + 2000);
  simulationTimers.push(endTimer);
  res.json({ started: true, mode: "port_scan", ports });
});

router.post("/simulate/telnet", (_req, res) => {
  clearSimulation();
  simulationActive = true;
  simulationMode = "telnet";
  schedulePackets(50, 100, () => ({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    src_ip: rndIp("91."),
    dst_ip: "192.168.1.10",
    src_port: rndInt(1024, 65535),
    dst_port: 23,
    protocol: "TCP",
    length: rndInt(40, 80),
    flags: rndInt(0, 1) ? "SYN" : "ACK",
    ttl: 64,
    is_anomaly: true,
    z_score: 3.2,
    severity: "HIGH",
    country: "Russia",
    is_external: true,
  }));
  setTimeout(() => { if (simulationMode === "telnet") clearSimulation(); }, 8000);
  res.json({ started: true, mode: "telnet" });
});

router.post("/simulate/rdp_brute", (_req, res) => {
  clearSimulation();
  simulationActive = true;
  simulationMode = "rdp_brute";
  schedulePackets(200, 50, () => ({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    src_ip: "91.108.4.1",
    dst_ip: "192.168.1.100",
    src_port: rndInt(50000, 65535),
    dst_port: 3389,
    protocol: "TCP",
    length: rndInt(44, 80),
    flags: "SYN",
    ttl: 64,
    is_anomaly: true,
    z_score: 4.1,
    severity: "CRITICAL",
    country: "Russia",
    is_external: true,
  }));
  setTimeout(() => { if (simulationMode === "rdp_brute") clearSimulation(); }, 15000);
  res.json({ started: true, mode: "rdp_brute" });
});

router.post("/simulate/exfil", (_req, res) => {
  clearSimulation();
  simulationActive = true;
  simulationMode = "exfil";
  schedulePackets(120, 333, () => ({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    src_ip: "192.168.1.10",
    dst_ip: "185.220.101.47",
    src_port: rndInt(30000, 50000),
    dst_port: 443,
    protocol: "TCP",
    length: rndInt(8000, 9000),
    flags: "PSH-ACK",
    ttl: 128,
    is_anomaly: true,
    z_score: 5.5,
    severity: "CRITICAL",
    country: "United Kingdom",
    is_external: true,
  }));
  setTimeout(() => { if (simulationMode === "exfil") clearSimulation(); }, 45000);
  res.json({ started: true, mode: "exfil" });
});

router.post("/simulate/stop", (_req, res) => {
  clearSimulation();
  res.json({ stopped: true });
});

router.get("/simulate/status", (_req, res) => {
  res.json({ active: simulationActive, mode: simulationMode });
});

export default router;
