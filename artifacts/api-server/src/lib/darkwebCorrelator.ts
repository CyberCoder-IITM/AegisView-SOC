export interface DarkWebCorrelation {
  ip: string;
  is_compromised: boolean;
  is_c2_server: boolean;
  is_malware_host: boolean;
  feeds_matched: string[];
  threat_category: "CLEAN" | "SUSPICIOUS" | "C2" | "MALWARE" | "COMPROMISED";
  intel_source: string;
}

export interface FeedStatus {
  name: string;
  last_updated: string;
  ip_count: number;
  status: "fresh" | "stale" | "failed";
}

interface Feed {
  name: string;
  url: string;
  ips: Set<string>;
  last_updated: string | null;
  status: FeedStatus["status"];
}

const feeds: Feed[] = [
  {
    name: "Emerging Threats",
    url: "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
    ips: new Set(),
    last_updated: null,
    status: "stale",
  },
  {
    name: "Feodo Tracker C2",
    url: "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
    ips: new Set(),
    last_updated: null,
    status: "stale",
  },
  {
    name: "URLhaus Malware",
    url: "https://urlhaus.abuse.ch/downloads/text/",
    ips: new Set(),
    last_updated: null,
    status: "stale",
  },
];

function parseIpList(text: string): Set<string> {
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const found = new Set<string>();
  for (const line of text.split("\n")) {
    if (line.startsWith("#") || line.startsWith(";") || line.trim() === "") continue;
    const match = line.match(ipRegex);
    if (match) match.forEach(ip => found.add(ip));
  }
  return found;
}

async function fetchFeed(feed: Feed): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(feed.url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    feed.ips = parseIpList(text);
    feed.last_updated = new Date().toISOString();
    feed.status = "fresh";
  } catch {
    feed.status = feed.last_updated ? "stale" : "failed";
  }
}

async function refreshAllFeeds(): Promise<void> {
  await Promise.all(feeds.map(fetchFeed));
}

export function startCorrelator(): void {
  void refreshAllFeeds();
  setInterval(() => { void refreshAllFeeds(); }, 6 * 60 * 60 * 1000);
}

export function correlateIp(ip: string): DarkWebCorrelation {
  const isCompromised = feeds[0].ips.has(ip);
  const isC2 = feeds[1].ips.has(ip);
  const isMalware = feeds[2].ips.has(ip);

  const matched: string[] = [];
  if (isCompromised) matched.push("Emerging Threats");
  if (isC2) matched.push("Feodo Tracker C2");
  if (isMalware) matched.push("URLhaus Malware");

  let category: DarkWebCorrelation["threat_category"] = "CLEAN";
  if (isC2) category = "C2";
  else if (isMalware) category = "MALWARE";
  else if (isCompromised) category = "COMPROMISED";
  else if (matched.length > 0) category = "SUSPICIOUS";

  return {
    ip,
    is_compromised: isCompromised,
    is_c2_server: isC2,
    is_malware_host: isMalware,
    feeds_matched: matched,
    threat_category: category,
    intel_source: matched.length > 0 ? matched.join(", ") : "No match",
  };
}

export function getIntelSummary(): {
  total_ips_checked: number;
  compromised_hits: number;
  c2_hits: number;
  malware_hits: number;
  feed_status: FeedStatus[];
  top_matched_ips: Array<{ ip: string; category: string; packet_count: number }>;
} {
  const allFeedIps = [...new Set([...feeds[0].ips, ...feeds[1].ips, ...feeds[2].ips])];

  return {
    total_ips_checked: allFeedIps.length,
    compromised_hits: feeds[0].ips.size,
    c2_hits: feeds[1].ips.size,
    malware_hits: feeds[2].ips.size,
    feed_status: feeds.map(f => ({
      name: f.name,
      last_updated: f.last_updated ?? "never",
      ip_count: f.ips.size,
      status: f.status,
    })),
    top_matched_ips: [],
  };
}

export function getFeedHits(ips: string[]): DarkWebCorrelation[] {
  return ips
    .map(ip => correlateIp(ip))
    .filter(c => c.threat_category !== "CLEAN");
}
