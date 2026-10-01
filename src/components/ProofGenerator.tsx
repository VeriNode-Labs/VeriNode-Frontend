import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getAddress } from "@stellar/freighter-api";
import { Anchor, CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { ProofReceipt } from "../lib/types";

interface AnchorPayload {
  merkleRoot: string;
  nodeId: string;
  sessionId: string;
  timestamp: number;
  [key: string]: unknown;
}

export default function ProofGenerator() {
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ProofReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function anchorLatestProof(): Promise<void> {
    setBusy(true);
    setError(null);
    setReceipt(null);
    try {
      const timestamp = Date.now();
      const sessionId = `sess_${timestamp.toString(36)}`;

      const entries = ["cpu:0.42", "mem:0.11", "io:0.03"];
      const merkleRoot = (await invoke<string>("sha256_merkle_root", { entries })).toUpperCase();
      const { address: nodeId } = await getAddress();
      if (!nodeId) throw new Error("Freighter not connected — unlock the wallet and try again.");

      const payload: AnchorPayload = { merkleRoot, nodeId, sessionId, timestamp };
      const result = await invoke<ProofReceipt>("anchor_workflow_proof", payload);
      const meta = result.meta;

      setReceipt({
        merkleRoot: result.merkleRoot,
        meta,
        anchor: meta.anchor ?? "",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="text-sm font-medium text-zinc-300">Proof Anchoring</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Hash latest telemetry into a Merkle root and bind it to a workflow proof.
      </p>

      <button
        type="button"
        onClick={anchorLatestProof}
        disabled={busy}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Anchor className="h-4 w-4" />
        )}
        {busy ? "Anchoring…" : "Anchor Latest Proof"}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {receipt && (
        <div className="mt-4 space-y-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Proof anchored</span>
          </div>
          <dl className="space-y-1 text-zinc-400">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">node</dt>
              <dd className="font-mono">
                {receipt.meta.nodeId.slice(0, 4)}…{receipt.meta.nodeId.slice(-4)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">session</dt>
              <dd className="font-mono">{receipt.meta.sessionId}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">merkle root</dt>
              <dd className="max-w-[60%] truncate font-mono">{receipt.meta.merkleRoot}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">anchor</dt>
              <dd className="max-w-[60%] truncate font-mono">{receipt.anchor}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}