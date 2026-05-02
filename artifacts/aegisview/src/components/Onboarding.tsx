import React, { useState, useEffect, useCallback } from "react";

const BOOT_LINES = [
  "> AEGISVIEW v2.0 INITIALIZING...",
  "> LOADING THREAT INTELLIGENCE FEEDS... OK",
  "> PACKET ENGINE... ONLINE",
  "> GEMINI AI CORTEX... CONNECTED",
  "> FORENSIC INTEGRITY CHAIN... GENESIS BLOCK CREATED",
  "> BEHAVIORAL BASELINE ENGINE... LEARNING",
  "> ALL SYSTEMS NOMINAL",
  "",
  "> WELCOME, ANALYST.",
];

const FEATURES = [
  {
    icon: "🧠",
    title: "AI-Powered Detection",
    desc: "Autonomous SOC agent analyzes threats in real-time using Gemini AI with MITRE ATT&CK attribution",
  },
  {
    icon: "⛓",
    title: "Court-Admissible Forensics",
    desc: "SHA-256 tamper-evident packet integrity chain. Every capture legally defensible.",
  },
  {
    icon: "📋",
    title: "Automated Compliance",
    desc: "PCI-DSS and NIST 800-53 violation detection with auto-generated Sigma SIEM rules.",
  },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"boot" | "logo" | "features" | "cta">("boot");
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const [visibleFeatures, setVisibleFeatures] = useState(0);
  const [logoVisible, setLogoVisible] = useState(false);

  const finish = useCallback(() => {
    localStorage.setItem("aegisview_onboarded", "true");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (step !== "boot") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setDisplayedLines(prev => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setStep("logo"), 1000);
      }
    }, 280);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== "logo") return;
    setTimeout(() => setLogoVisible(true), 80);
    setTimeout(() => setStep("features"), 1500);
  }, [step]);

  useEffect(() => {
    if (step !== "features") return;
    const timers = FEATURES.map((_, i) =>
      setTimeout(() => setVisibleFeatures(v => Math.max(v, i + 1)), i * 650)
    );
    const ctaTimer = setTimeout(() => setStep("cta"), FEATURES.length * 650 + 700);
    return () => { timers.forEach(clearTimeout); clearTimeout(ctaTimer); };
  }, [step]);

  useEffect(() => {
    const iv = setInterval(() => setShowCursor(v => !v), 500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [finish]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "#000000",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
    >
      <button
        onClick={finish}
        style={{
          position: "absolute", bottom: 24, right: 24,
          background: "transparent", border: "none",
          color: "rgba(255,255,255,0.3)", fontSize: "0.72rem",
          fontFamily: "monospace", cursor: "pointer",
          letterSpacing: "0.08em", textDecoration: "underline",
        }}
      >
        Skip Intro
      </button>

      {step === "boot" && (
        <div style={{ maxWidth: 540, width: "100%", padding: "0 24px" }}>
          {displayedLines.map((line, i) => (
            <div
              key={i}
              style={{
                color: "#00ff88", fontFamily: "monospace",
                fontSize: "0.88rem", lineHeight: "1.8", minHeight: "1.6em",
              }}
            >
              {line}
              {i === displayedLines.length - 1 && (
                <span style={{ opacity: showCursor ? 1 : 0, marginLeft: 2 }}>█</span>
              )}
            </div>
          ))}
        </div>
      )}

      {(step === "logo" || step === "features" || step === "cta") && (
        <div style={{ width: "100%", maxWidth: 820, padding: "0 24px", textAlign: "center" }}>
          <div
            style={{
              opacity: logoVisible ? 1 : 0,
              transform: logoVisible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.7s, transform 0.7s",
              marginBottom: step === "logo" ? 0 : 36,
            }}
          >
            {step === "logo" ? (
              <>
                <div style={{ fontSize: "3.5rem", fontWeight: 900, letterSpacing: "0.2em", color: "#fff", fontFamily: "monospace" }}>
                  🛡️ AEGIS<span style={{ color: "#00d4ff" }}>VIEW</span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace", fontSize: "0.95rem", marginTop: 14, letterSpacing: "0.04em" }}>
                  Real-Time Network Threat Detection & Compliance Auditing Platform
                </div>
                <div style={{ color: "#00d4ff", fontFamily: "monospace", fontSize: "0.75rem", marginTop: 8, opacity: 0.65 }}>
                  Replacing $200K Splunk deployments since 2026
                </div>
              </>
            ) : (
              <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "0.2em", color: "#fff", fontFamily: "monospace" }}>
                🛡️ AEGIS<span style={{ color: "#00d4ff" }}>VIEW</span>
              </div>
            )}
          </div>

          {(step === "features" || step === "cta") && (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 40, justifyContent: "center" }}>
                {FEATURES.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, maxWidth: 240,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16, padding: 24, textAlign: "left",
                      opacity: visibleFeatures > i ? 1 : 0,
                      transform: visibleFeatures > i ? "translateY(0)" : "translateY(14px)",
                      transition: "opacity 0.5s, transform 0.5s",
                    }}
                  >
                    <div style={{ fontSize: "1.7rem", marginBottom: 10 }}>{f.icon}</div>
                    <div style={{ color: "#00d4ff", fontFamily: "monospace", fontWeight: 700, fontSize: "0.82rem", marginBottom: 8, letterSpacing: "0.05em" }}>
                      {f.title}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: "0.72rem", lineHeight: 1.6 }}>
                      {f.desc}
                    </div>
                  </div>
                ))}
              </div>

              {step === "cta" && (
                <button
                  onClick={finish}
                  style={{
                    padding: "14px 40px", fontFamily: "monospace", fontWeight: 700,
                    fontSize: "0.88rem", letterSpacing: "0.15em",
                    color: "#00d4ff", background: "transparent",
                    border: "1px solid #00d4ff", borderRadius: 8, cursor: "pointer",
                    boxShadow: "0 0 24px rgba(0,212,255,0.2)",
                    transition: "background 0.2s, box-shadow 0.2s",
                    animation: "fadeIn 0.5s ease forwards",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(0,212,255,0.12)";
                    e.currentTarget.style.boxShadow = "0 0 48px rgba(0,212,255,0.4)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.boxShadow = "0 0 24px rgba(0,212,255,0.2)";
                  }}
                >
                  ENTER OPERATIONS CENTER →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
