// TOR exit nodes — subset of known exits, fetched at startup if possible
const KNOWN_TOR_EXITS = new Set([
  "185.220.101.47", "185.220.101.34", "185.220.101.35", "185.130.44.108",
  "199.249.230.87", "199.249.230.68", "162.247.74.74", "162.247.74.201",
  "171.25.193.25", "171.25.193.77", "176.10.104.240", "176.10.104.243",
  "77.109.139.87", "89.234.157.254", "94.230.208.147", "95.128.43.164",
]);

const BULLETPROOF_ASNS = new Set([
  "AS9009", "AS206092", "AS208323", "AS49877", "AS60068",
  "AS174", "AS3356", "AS20473", "AS14061", "AS16276", "AS197695",
]);

// Known scanner ranges
const SCANNER_PREFIXES = ["185.220.", "185.180.", "45.33.", "198.96.", "80.82."];

export interface ThreatIntel {
  is_tor: boolean;
  is_bulletproof: boolean;
  is_rfc1918: boolean;
  threat_tags: string[];
  reputation_score: number;
}

export function isRFC1918(ip: string): boolean {
  return ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.");
}

export function enrichIp(ip: string, asn: string): ThreatIntel {
  const is_rfc1918 = isRFC1918(ip);
  const is_tor = KNOWN_TOR_EXITS.has(ip);
  const is_bulletproof = BULLETPROOF_ASNS.has(asn);
  const is_scanner = SCANNER_PREFIXES.some(p => ip.startsWith(p));

  const threat_tags: string[] = [];
  if (is_tor) threat_tags.push("TOR_EXIT");
  if (is_bulletproof) threat_tags.push("BULLETPROOF_HOSTING");
  if (is_scanner) threat_tags.push("SCANNER");

  let reputation_score = 0;
  if (is_tor) reputation_score += 50;
  if (is_bulletproof) reputation_score += 40;
  reputation_score += threat_tags.length * 10;
  reputation_score = Math.min(100, reputation_score);

  return { is_tor, is_bulletproof, is_rfc1918, threat_tags, reputation_score };
}

// Try to fetch live TOR exit list in background
setTimeout(async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("https://check.torproject.org/torbulkexitlist", { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const text = await res.text();
      const ips = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
      for (const ip of ips) KNOWN_TOR_EXITS.add(ip);
    }
  } catch {
    // fallback to hardcoded set — silent fail
  }
}, 0);
