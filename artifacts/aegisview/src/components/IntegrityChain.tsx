import React, { useEffect, useState } from "react";

interface ChainEntry {
  index: number;
  timestamp: string;
  packet_hash: string;
  previous_hash: string;
  chain_hash: string;
  is_valid: boolean;
}

interface ChainStatus {
  length: number;
  integrity_status: "INTACT" | "COMPROMISED";
  last_verified: string;
  genesis_hash: string;
}

interface ChainVerification {
  total_entries: number;
  valid_entries: number;
  tampered_indices: number[];
  integrity_status: "INTACT" | "COMPROMISED";
  verification_timestamp: string;
}

export function IntegrityChain() {
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [entries, setEntries] = useState<ChainEntry[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<ChainVerification | null>(null);
  const BASE = (import.meta as { env: Record<string, string> }).env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    const poll = async () => {
      try {
        const [sRes, eRes] = await Promise.all([
          fetch(`${BASE}/api/chain/status`),
          fetch(`${BASE}/api/chain/latest`),
        ]);
        setStatus(await sRes.json());
        setEntries(await eRes.json());
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [BASE]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${BASE}/api/chain/verify`);
      setVerifyResult(await res.json());
    } catch { /* ignore */ }
    setVerifying(false);
  };

  const intact = status?.integrity_status === "INTACT";

  return (
    <div className="w-full h-full flex flex-col font-mono text-xs" style={{ background: "#0a0e1a" }}>
      <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#7b2fff" }}>⛓ Forensic Integrity Chain</span>
        <span className="text-[9px]" style={{ color: "#444" }}>SHA-256 tamper-evident</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded font-bold text-sm"
            style={{
              background: intact ? "#00ff8815" : "#ff003315",
              border: `1px solid ${intact ? "#00ff8840" : "#ff003340"}`,
              color: intact ? "#00ff88" : "#ff0033",
              animation: intact ? undefined : "pulse 1s infinite",
            }}
          >
            {intact ? "✓ CHAIN INTACT" : "⚠ CHAIN COMPROMISED"}
          </div>
          <div className="text-[10px]" style={{ color: "#444" }}>
            {status?.length ?? 0} entries
          </div>
        </div>

        <div className="flex gap-4 text-[10px]" style={{ color: "#666" }}>
          <span>Valid: <span style={{ color: "#00ff88" }}>{status?.length ?? 0}</span></span>
          <span>Genesis: <span style={{ color: "#7b2fff" }}>{status?.genesis_hash ?? "..."}</span></span>
          <span>Verified: <span style={{ color: "#888" }}>{status?.last_verified?.slice(11, 19) ?? "--"}</span></span>
        </div>

        {/* Visual chain — last 10 entries */}
        <div className="flex items-center gap-0.5 overflow-x-auto py-1">
          {entries.slice(0, 10).map((e, i) => (
            <React.Fragment key={e.index}>
              <div
                title={`#${e.index} | ${e.timestamp.slice(11, 19)} | ${e.chain_hash}`}
                className="shrink-0 flex flex-col items-center px-1.5 py-1 rounded cursor-default hover:opacity-80 transition-opacity"
                style={{
                  background: e.is_valid ? "#00ff8815" : "#ff003315",
                  border: `1px solid ${e.is_valid ? "#00ff8830" : "#ff003330"}`,
                  minWidth: 52,
                }}
              >
                <span className="text-[8px] font-bold" style={{ color: e.is_valid ? "#00ff88" : "#ff0033" }}>
                  #{e.index}
                </span>
                <span className="text-[7px] mt-0.5" style={{ color: "#444" }}>
                  {e.chain_hash.slice(0, 8)}
                </span>
              </div>
              {i < entries.length - 1 && (
                <span className="text-[10px] shrink-0" style={{ color: e.is_valid ? "#00ff8840" : "#ff003340" }}>⛓</span>
              )}
            </React.Fragment>
          ))}
          {entries.length === 0 && (
            <span className="text-[10px]" style={{ color: "#333" }}>Building chain...</span>
          )}
        </div>

        {/* Verify button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleVerify()}
            disabled={verifying}
            className="text-[10px] px-3 py-1 rounded border font-bold transition-colors"
            style={{
              borderColor: "#7b2fff60",
              color: verifying ? "#555" : "#7b2fff",
              background: "#0a0e1a",
              cursor: verifying ? "not-allowed" : "pointer",
            }}
          >
            {verifying ? "⟳ Verifying..." : "🔍 Verify Now"}
          </button>

          {verifyResult && (
            <div
              className="text-[10px] px-2 py-1 rounded"
              style={{
                background: verifyResult.integrity_status === "INTACT" ? "#00ff8815" : "#ff003315",
                color: verifyResult.integrity_status === "INTACT" ? "#00ff88" : "#ff0033",
              }}
            >
              {verifyResult.integrity_status === "INTACT"
                ? `✓ All ${verifyResult.total_entries} entries verified`
                : `⚠ Tampered: ${verifyResult.tampered_indices.join(", ")}`}
            </div>
          )}
        </div>

        <div className="text-[9px]" style={{ color: "#333" }}>SHA-256 tamper-evident chain — Court admissible forensic record</div>
      </div>
    </div>
  );
}
