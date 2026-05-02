import { createHash } from "crypto";
import { PacketRecord } from "./simulator.js";

export interface ChainEntry {
  index: number;
  timestamp: string;
  packet_hash: string;
  previous_hash: string;
  chain_hash: string;
  is_valid: boolean;
}

export interface ChainVerification {
  total_entries: number;
  valid_entries: number;
  tampered_indices: number[];
  integrity_status: "INTACT" | "COMPROMISED";
  verification_timestamp: string;
}

const GENESIS_HASH = createHash("sha256").update("AEGISVIEW_GENESIS_BLOCK").digest("hex");
const MAX_ENTRIES = 1000;

const chain: ChainEntry[] = [];
let lastVerified: string = new Date().toISOString();

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function addPacket(packet: PacketRecord): ChainEntry {
  const packetHash = sha256(JSON.stringify({ ...packet }, Object.keys({ ...packet }).sort()));
  const previousHash = chain.length > 0 ? chain[chain.length - 1].chain_hash : GENESIS_HASH;
  const chainHash = sha256(packetHash + previousHash);

  const entry: ChainEntry = {
    index: chain.length,
    timestamp: new Date().toISOString(),
    packet_hash: packetHash,
    previous_hash: previousHash,
    chain_hash: chainHash,
    is_valid: true,
  };

  chain.push(entry);
  if (chain.length > MAX_ENTRIES) chain.shift();

  return entry;
}

export function verifyChain(): ChainVerification {
  const tamperedIndices: number[] = [];

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    const expectedPrev = i === 0 ? GENESIS_HASH : chain[i - 1].chain_hash;
    const expectedChainHash = sha256(entry.packet_hash + expectedPrev);

    if (entry.chain_hash !== expectedChainHash || entry.previous_hash !== expectedPrev) {
      tamperedIndices.push(entry.index);
    }
  }

  lastVerified = new Date().toISOString();

  return {
    total_entries: chain.length,
    valid_entries: chain.length - tamperedIndices.length,
    tampered_indices: tamperedIndices,
    integrity_status: tamperedIndices.length === 0 ? "INTACT" : "COMPROMISED",
    verification_timestamp: lastVerified,
  };
}

export function getChainStatus(): { length: number; integrity_status: "INTACT" | "COMPROMISED"; last_verified: string; genesis_hash: string } {
  return {
    length: chain.length,
    integrity_status: "INTACT",
    last_verified: lastVerified,
    genesis_hash: GENESIS_HASH.substring(0, 16) + "...",
  };
}

export function getLatestEntries(n = 10): ChainEntry[] {
  return chain.slice(-n).reverse();
}
