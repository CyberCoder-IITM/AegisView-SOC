import React, { useState, useEffect, useRef, useCallback } from "react";

interface QueryResponse {
  answer: string;
  data_points_used: number;
  confidence: "HIGH" | "MED" | "LOW";
  timestamp: string;
}

const SUGGESTIONS = [
  "Most active IP right now",
  "Any compliance violations?",
  "Signs of port scanning?",
  "Current threat summary",
];

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
      else clearInterval(iv);
    }, 14);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{displayed}</span>;
}

function confColor(c: string) {
  return c === "HIGH" ? "#00ff88" : c === "MED" ? "#ffd700" : "#ff6b35";
}

export function QueryEngine() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  const openModal = useCallback(() => {
    setOpen(true);
    setResult(null);
    setQuery("");
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setShowRecent(false);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "/") { e.preventDefault(); openModal(); }
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openModal, closeModal]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const submit = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setShowRecent(false);
    setRecentQueries(prev => [q, ...prev.filter(r => r !== q)].slice(0, 5));
    try {
      const r = await fetch(`${BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data: QueryResponse = await r.json();
      setResult(data);
    } catch {
      setResult({ answer: "Query failed. Please try again.", data_points_used: 0, confidence: "LOW", timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 4,
          border: "1px solid var(--bg-border)",
          background: "transparent", color: "var(--text-muted)",
          fontSize: "0.7rem", fontFamily: "monospace", cursor: "pointer",
          transition: "all 0.15s",
        }}
        title="Natural Language Query [/]"
        onMouseEnter={e => { e.currentTarget.style.color = "var(--aegis-cyan)"; e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--bg-border)"; }}
      >
        🔍 <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>/</span>
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            width: 600, maxWidth: "90vw",
            background: "var(--bg-card)",
            border: "1px solid var(--aegis-cyan)",
            borderRadius: "var(--panel-radius)",
            boxShadow: "0 0 60px rgba(0,212,255,0.12)",
            padding: 24, display: "flex", flexDirection: "column",
            maxHeight: "80vh",
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.88rem", color: "var(--aegis-cyan)", letterSpacing: "0.1em", marginBottom: 4 }}>
                🔍 Ask AegisView Anything
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
                Natural language query against live packet data
              </div>
            </div>

            <div style={{ position: "relative", marginBottom: 14 }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") void submit(query);
                  if (e.key === "Escape") closeModal();
                }}
                onFocus={() => setShowRecent(true)}
                placeholder="e.g. Which IP is sending the most traffic?"
                style={{
                  width: "100%", fontSize: "0.95rem", fontFamily: "monospace",
                  background: "transparent", border: "none", outline: "none",
                  color: "#fff", padding: "12px 0",
                  borderBottom: "1px solid var(--bg-border)", boxSizing: "border-box",
                }}
              />
              {showRecent && recentQueries.length > 0 && !result && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                  background: "var(--bg-secondary)", border: "var(--card-border)",
                  borderRadius: 6, overflow: "hidden", marginTop: 2,
                }}>
                  {recentQueries.map((q, i) => (
                    <div
                      key={i}
                      onClick={() => { setQuery(q); void submit(q); }}
                      style={{
                        padding: "8px 12px", fontFamily: "monospace", fontSize: "0.7rem",
                        color: "var(--text-secondary)", cursor: "pointer",
                        borderBottom: i < recentQueries.length - 1 ? "1px solid var(--bg-border)" : "none",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      ↩ {q}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!result && !loading && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); void submit(s); }}
                    style={{
                      padding: "4px 12px", fontFamily: "monospace", fontSize: "0.62rem",
                      background: "rgba(0,212,255,0.06)", color: "var(--aegis-cyan)",
                      border: "1px solid rgba(0,212,255,0.18)", borderRadius: 999,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.13)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,212,255,0.06)")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div style={{ fontFamily: "monospace", color: "var(--aegis-cyan)", fontSize: "0.8rem", padding: "20px 0" }}>
                <span style={{ animation: "blink-cursor 0.5s step-end infinite" }}>▋</span>
                {" "}<span style={{ opacity: 0.6 }}>Analyzing live packet data...</span>
              </div>
            )}

            {result && (
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontFamily: "monospace", color: "var(--aegis-cyan)", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: 16 }}>
                  <TypewriterText text={result.answer} />
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "var(--text-muted)", display: "flex", gap: 16, marginBottom: 14 }}>
                  <span>📊 Based on {result.data_points_used} packets</span>
                  <span style={{ color: confColor(result.confidence) }}>Confidence: {result.confidence}</span>
                </div>
                <button
                  onClick={() => { setResult(null); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{
                    padding: "6px 16px", fontFamily: "monospace", fontSize: "0.68rem",
                    background: "transparent", border: "1px solid var(--bg-border)",
                    borderRadius: 4, color: "var(--text-muted)", cursor: "pointer",
                  }}
                >
                  Ask another question
                </button>
              </div>
            )}

            <div style={{ marginTop: 14, fontFamily: "monospace", fontSize: "0.58rem", color: "var(--text-muted)", textAlign: "center" }}>
              <kbd style={{ fontFamily: "monospace" }}>Enter</kbd> to query · <kbd style={{ fontFamily: "monospace" }}>Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
