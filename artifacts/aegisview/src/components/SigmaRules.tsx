import React, { useEffect, useRef, useState } from "react";

interface SigmaRule {
  rule_id: string;
  title: string;
  status: string;
  description: string;
  author: string;
  date: string;
  tags: string[];
  level: "low" | "medium" | "high" | "critical";
  raw_yaml: string;
  generated_at: string;
  trigger_ip: string;
}

const LEVEL_COLOR = { low: "#00ff88", medium: "#ffd700", high: "#ff6b35", critical: "#ff0033" };

interface ToastItem { id: string; title: string }

function CopyButton({ text, label = "📋 Copy YAML" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[9px] px-2 py-0.5 rounded border font-mono"
      style={{ borderColor: copied ? "#00ff88" : "#333", color: copied ? "#00ff88" : "#666", background: "#0a0e1a" }}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

function SplunkUrl(query: string) {
  return `https://splunk.company.local/en-US/app/search/search?q=${encodeURIComponent(`search ${query}`)}`;
}

function ElasticUrl(rule: SigmaRule) {
  return `https://kibana.company.local/app/security/rules/create?name=${encodeURIComponent(rule.title)}&severity=${rule.level}`;
}

export function SigmaRules() {
  const [rules, setRules] = useState<SigmaRule[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prevCountRef = useRef(0);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/sigma/rules`);
        const d: SigmaRule[] = await res.json();
        if (d.length > prevCountRef.current) {
          const newRules = d.slice(0, d.length - prevCountRef.current);
          newRules.forEach(r => {
            const toast = { id: r.rule_id, title: r.title };
            setToasts(prev => [toast, ...prev].slice(0, 3));
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 4000);
          });
          prevCountRef.current = d.length;
        }
        setRules(d);
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 8000);
    return () => clearInterval(iv);
  }, [BASE]);

  return (
    <div className="w-full h-full flex flex-col font-mono text-xs relative" style={{ background: "#0a0e1a" }}>
      {/* Toast notifications */}
      <div className="absolute top-10 right-2 flex flex-col gap-1 z-10">
        {toasts.map(t => (
          <div key={t.id} className="px-2 py-1.5 rounded text-[9px] max-w-[200px]"
            style={{ background: "#7b2fff20", border: "1px solid #7b2fff60", color: "#c09aff" }}>
            Σ New Rule: {t.title.slice(0, 35)}
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7b2fff" }}>Σ Sigma Rule Generator</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#7b2fff20", color: "#7b2fff", border: "1px solid #7b2fff40" }}>
          {rules.length} Rules
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {rules.length === 0 ? (
          <div className="text-center mt-6 text-[10px]" style={{ color: "#333" }}>Analyzing traffic patterns...</div>
        ) : (
          rules.map(rule => (
            <div key={rule.rule_id} className="rounded" style={{ background: "#0d1117", border: `1px solid ${LEVEL_COLOR[rule.level]}30` }}>
              <div
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                onClick={() => setExpanded(expanded === rule.rule_id ? null : rule.rule_id)}
              >
                <span className="text-[9px] px-1 py-0.5 rounded font-bold shrink-0"
                  style={{ background: `${LEVEL_COLOR[rule.level]}20`, color: LEVEL_COLOR[rule.level] }}>
                  {rule.level.toUpperCase()}
                </span>
                <span className="text-[9px] font-bold flex-1 truncate" style={{ color: "#ccc" }}>{rule.title}</span>
                <span className="text-[8px] shrink-0" style={{ color: "#444" }}>{rule.generated_at.slice(11, 19)}</span>
                <span className="text-[9px]" style={{ color: "#444" }}>{expanded === rule.rule_id ? "▲" : "▼"}</span>
              </div>

              {expanded === rule.rule_id && (
                <div className="px-2 pb-2">
                  <div className="text-[9px] mb-2" style={{ color: "#666" }}>{rule.description}</div>

                  <div className="rounded p-2 mb-2 overflow-x-auto" style={{ background: "#060a12", border: "1px solid #1a1a2a" }}>
                    <pre className="text-[9px]" style={{ color: "#7b2fff", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {rule.raw_yaml}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {rule.tags.map(tag => (
                      <span key={tag} className="text-[8px] px-1 py-0.5 rounded" style={{ background: "#0a0e1a", color: "#555", border: "1px solid #1a1a2a" }}>{tag}</span>
                    ))}
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <CopyButton text={rule.raw_yaml} />
                    <a href={SplunkUrl(rule.title)} target="_blank" rel="noreferrer"
                      className="text-[9px] px-2 py-0.5 rounded border font-mono hover:opacity-80"
                      style={{ borderColor: "#ff6b3540", color: "#ff6b35", background: "#0a0e1a" }}>
                      ↗ Splunk
                    </a>
                    <a href={ElasticUrl(rule)} target="_blank" rel="noreferrer"
                      className="text-[9px] px-2 py-0.5 rounded border font-mono hover:opacity-80"
                      style={{ borderColor: "#00d4ff40", color: "#00d4ff", background: "#0a0e1a" }}>
                      ↗ Elastic
                    </a>
                    <a href={`${BASE}/api/sigma/rules/${rule.rule_id}/yaml`}
                      className="text-[9px] px-2 py-0.5 rounded border font-mono hover:opacity-80"
                      style={{ borderColor: "#33334a", color: "#666", background: "#0a0e1a" }}>
                      ↓ YAML
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-border flex items-center justify-between shrink-0">
        <a href={`${BASE}/api/sigma/export`}
          className="text-[9px] px-2 py-1 rounded border font-mono hover:opacity-80"
          style={{ borderColor: "#7b2fff40", color: "#7b2fff", background: "#0a0e1a" }}>
          📦 Export All (.yml)
        </a>
        <span className="text-[8px]" style={{ color: "#2a2a2a" }}>Splunk · Elastic · Sentinel · QRadar</span>
      </div>
    </div>
  );
}
