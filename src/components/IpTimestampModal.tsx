"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, Copy, FileUp, Loader2, X, XCircle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { generateFileSHA256, formatBytes, hexToUint8Array } from "@/services/crypto";
import { invokeRegisterAsset, hasContractConfig } from "@/lib/contracts";

type Status = "idle" | "hashing" | "ready" | "submitting" | "success" | "error";

export function IpTimestampModal({ onClose }: { open?: boolean; onClose: () => void }) {
  const wallet = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [fingerprint, setFingerprint] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [feeXlm, setFeeXlm] = useState("0");
  const [txHash, setTxHash] = useState("");
  const [assetId, setAssetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleFile = useCallback(async (candidate: File | undefined | null) => {
    if (!candidate) return;
    setFile(candidate);
    setStatus("hashing");
    setFingerprint("");
    try {
      const digest = await generateFileSHA256(candidate);
      setFingerprint(digest);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Hashing failed");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile],
  );

  const submit = useCallback(async () => {
    if (!wallet.address || status !== "ready") return;
    if (!hasContractConfig()) {
      setStatus("error");
      setError("Contract not configured — set NEXT_PUBLIC_LUMINA_CONTRACT_ID before anchoring.");
      return;
    }
    if (hexToUint8Array(fingerprint).length !== 32) {
      setStatus("error");
      setError("Fingerprint must be a 32-byte SHA-256 digest");
      return;
    }
    const feeStroops = BigInt(Math.round((Number(feeXlm) || 0) * 1e7));
    if (feeStroops < 0n) {
      setStatus("error");
      setError("Licensing fee cannot be negative");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const { hash, assetId: anchoredId } = await invokeRegisterAsset({
        address: wallet.address,
        fingerprint,
        metadataUri,
        licensingFeeStroops: feeStroops,
        networkPassphrase: wallet.walletNetworkPassphrase,
      });
      setTxHash(hash);
      setAssetId(anchoredId);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Submission failed");
    }
  }, [wallet.address, wallet.walletNetworkPassphrase, status, fingerprint, metadataUri, feeXlm]);

  const canSubmit =
    status === "ready" &&
    Boolean(wallet.address) &&
    wallet.networkMatches &&
    hexToUint8Array(fingerprint).length === 32;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Anchor IP on Stellar</h2>
            <p className="text-xs text-zinc-400">Immutable SHA-256 fingerprint + ODRL license</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragging
                ? "border-lumina-400 bg-lumina-500/10"
                : "border-white/15 bg-white/[0.02] hover:border-lumina-500/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            {file ? (
              <>
                <CloudUpload className="h-6 w-6 text-lumina-300" aria-hidden />
                <span className="text-sm font-medium text-white">{file.name}</span>
                <span className="text-xs text-zinc-400">{formatBytes(file.size)}</span>
              </>
            ) : (
              <>
                <FileUp className="h-6 w-6 text-zinc-500" aria-hidden />
                <span className="text-sm text-zinc-300">
                  Drop a creative asset or codebase here
                </span>
                <span className="text-xs text-zinc-500">or click to browse — SHA-256 is computed locally</span>
              </>
            )}
          </div>

          {status === "hashing" && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Computing SHA-256 fingerprint…
            </div>
          )}

          {fingerprint && (
            <div className="rounded-xl border border-lumina-500/30 bg-lumina-500/10 p-3">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-lumina-300">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                On-chain fingerprint (SHA-256)
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="break-all font-mono text-xs text-zinc-200">{fingerprint}</code>
                <button
                  type="button"
                  aria-label="Copy fingerprint"
                  onClick={() => void navigator.clipboard?.writeText(fingerprint)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">
                Metadata IPFS URI
              </span>
              <input
                type="text"
                value={metadataUri}
                onChange={(e) => setMetadataUri(e.target.value)}
                placeholder="ipfs://bafy…"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-lumina-500/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">
                Licensing fee (XLM)
              </span>
              <input
                type="number"
                min="0"
                step="0.0000001"
                value={feeXlm}
                onChange={(e) => setFeeXlm(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-lumina-500/60"
              />
            </label>
          </div>

          {wallet.address && !wallet.networkMatches && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Wallet network mismatch — connect Freighter to the expected network.
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {error}
            </div>
          )}

          {status === "success" && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Asset {assetId ? `#${assetId}` : ""} anchored on-chain.
              {txHash ? (
                <code className="break-all font-mono text-emerald-200/80">tx {txHash}</code>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-lumina-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-lumina-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Anchoring…
              </>
            ) : (
              "Anchor Asset"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}