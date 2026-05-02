import type { PacketRecord } from "./simulator.js";

export interface KillChainStage {
  stage: string;
  id: string;
  status: "INACTIVE" | "SUSPECTED" | "CONFIRMED";
  evidence: string;
  confidence: number;
  color: string;
}

function isRFC1918(ip: string): boolean {
  return ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.");
}

export function computeKillChain(packets: PacketRecord[]): KillChainStage[] {
  const recent = packets.slice(-300);
  const now = Date.now();
  const window30s = packets.filter(p => now - new Date(p.timestamp).getTime() < 30000);

  // --- RECONNAISSANCE ---
  const uniqueDstPorts = new Set(window30s.map(p => p.dst_port));
  const portScanScore = uniqueDstPorts.size;
  const synOnlyPackets = window30s.filter(p => p.flags === "SYN");
  let reconStatus: KillChainStage["status"] = "INACTIVE";
  let reconEvidence = "No reconnaissance indicators";
  let reconConf = 0;
  if (portScanScore > 20) {
    reconStatus = "CONFIRMED";
    reconEvidence = `${portScanScore} unique dst ports in 30s — active port scan`;
    reconConf = Math.min(100, portScanScore * 3);
  } else if (portScanScore > 10 || synOnlyPackets.length > 15) {
    reconStatus = "SUSPECTED";
    reconEvidence = `${portScanScore} ports targeted, ${synOnlyPackets.length} SYN-only packets`;
    reconConf = Math.min(70, portScanScore * 4);
  }

  // --- INITIAL ACCESS ---
  const rdpExternal = recent.filter(p => p.dst_port === 3389 && !isRFC1918(p.src_ip));
  const sshExternal = recent.filter(p => p.dst_port === 22 && !isRFC1918(p.src_ip));
  const telnetPackets = recent.filter(p => p.dst_port === 23);
  let accessStatus: KillChainStage["status"] = "INACTIVE";
  let accessEvidence = "No initial access attempts";
  let accessConf = 0;
  if (rdpExternal.length > 10 || sshExternal.length > 20) {
    accessStatus = "CONFIRMED";
    accessEvidence = `RDP: ${rdpExternal.length} external attempts, SSH: ${sshExternal.length} brute-force packets`;
    accessConf = Math.min(95, (rdpExternal.length + sshExternal.length) * 2);
  } else if (rdpExternal.length > 2 || sshExternal.length > 5 || telnetPackets.length > 0) {
    accessStatus = "SUSPECTED";
    accessEvidence = `RDP: ${rdpExternal.length}, SSH: ${sshExternal.length}, Telnet: ${telnetPackets.length}`;
    accessConf = 35 + Math.min(30, (rdpExternal.length + sshExternal.length) * 3);
  }

  // --- LATERAL MOVEMENT ---
  const smbInternal = recent.filter(p => p.dst_port === 445 && isRFC1918(p.src_ip) && isRFC1918(p.dst_ip));
  const rpcInternal = recent.filter(p => p.dst_port === 135 && isRFC1918(p.src_ip));
  let lateralStatus: KillChainStage["status"] = "INACTIVE";
  let lateralEvidence = "No lateral movement detected";
  let lateralConf = 0;
  if (smbInternal.length > 15 || rpcInternal.length > 20) {
    lateralStatus = "CONFIRMED";
    lateralEvidence = `SMB: ${smbInternal.length} internal, RPC/135: ${rpcInternal.length} packets`;
    lateralConf = Math.min(90, (smbInternal.length + rpcInternal.length) * 2);
  } else if (smbInternal.length > 3 || rpcInternal.length > 5) {
    lateralStatus = "SUSPECTED";
    lateralEvidence = `SMB port 445: ${smbInternal.length} internal, RPC: ${rpcInternal.length}`;
    lateralConf = 25 + smbInternal.length * 4;
  }

  // --- C2 (Command & Control) ---
  // Detect beaconing: same dst_ip contacted repeatedly at regular intervals
  const dstIpMap = new Map<string, number[]>();
  for (const p of recent) {
    if (!isRFC1918(p.dst_ip)) {
      const ts = new Date(p.timestamp).getTime();
      const arr = dstIpMap.get(p.dst_ip) || [];
      arr.push(ts);
      dstIpMap.set(p.dst_ip, arr);
    }
  }
  let beaconDetected = false;
  let beaconIp = "";
  let beaconInterval = 0;
  for (const [ip, timestamps] of dstIpMap.entries()) {
    if (timestamps.length < 5) continue;
    const sorted = timestamps.sort((a, b) => a - b);
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) intervals.push(sorted[i] - sorted[i - 1]);
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + Math.pow(v - meanInterval, 2), 0) / intervals.length;
    const stddev = Math.sqrt(variance);
    // Regular beaconing: low variance relative to mean, interval 5-120s
    if (stddev / meanInterval < 0.4 && meanInterval > 5000 && meanInterval < 120000 && timestamps.length > 6) {
      beaconDetected = true;
      beaconIp = ip;
      beaconInterval = Math.round(meanInterval / 1000);
      break;
    }
  }
  const httpsHighVol = Array.from(dstIpMap.entries()).filter(([, ts]) => ts.length > 15 && !isRFC1918("0.0.0.0"));
  let c2Status: KillChainStage["status"] = "INACTIVE";
  let c2Evidence = "No C2 indicators";
  let c2Conf = 0;
  if (beaconDetected) {
    c2Status = "CONFIRMED";
    c2Evidence = `Beacon detected to ${beaconIp} every ~${beaconInterval}s — C2 signature`;
    c2Conf = 88;
  } else if (httpsHighVol.length > 0) {
    c2Status = "SUSPECTED";
    c2Evidence = `High-volume HTTPS to ${httpsHighVol.length} external IPs — possible C2`;
    c2Conf = 40;
  }

  // --- EXFILTRATION ---
  const largePackets = recent.filter(p => p.length > 7000 && !isRFC1918(p.dst_ip));
  const dns53External = recent.filter(p => p.dst_port === 53 && !isRFC1918(p.dst_ip));
  const totalExfilBytes = largePackets.reduce((sum, p) => sum + p.length, 0);
  let exfilStatus: KillChainStage["status"] = "INACTIVE";
  let exfilEvidence = "No exfiltration indicators";
  let exfilConf = 0;
  if (totalExfilBytes > 500000 || largePackets.length > 20) {
    exfilStatus = "CONFIRMED";
    exfilEvidence = `${largePackets.length} large packets outbound (${(totalExfilBytes / 1024).toFixed(1)}KB) — active exfil`;
    exfilConf = Math.min(95, largePackets.length * 4);
  } else if (largePackets.length > 5 || dns53External.length > 30) {
    exfilStatus = "SUSPECTED";
    exfilEvidence = `${largePackets.length} oversized packets, DNS: ${dns53External.length} external queries`;
    exfilConf = 30 + largePackets.length * 4;
  }

  return [
    { stage: "Reconnaissance", id: "TA0043", status: reconStatus, evidence: reconEvidence, confidence: reconConf, color: "#ffd700" },
    { stage: "Initial Access", id: "TA0001", status: accessStatus, evidence: accessEvidence, confidence: accessConf, color: "#ff6b35" },
    { stage: "Lateral Movement", id: "TA0008", status: lateralStatus, evidence: lateralEvidence, confidence: lateralConf, color: "#ff4500" },
    { stage: "Command & Control", id: "TA0011", status: c2Status, evidence: c2Evidence, confidence: c2Conf, color: "#ff2200" },
    { stage: "Exfiltration", id: "TA0010", status: exfilStatus, evidence: exfilEvidence, confidence: exfilConf, color: "#ff0033" },
  ];
}
