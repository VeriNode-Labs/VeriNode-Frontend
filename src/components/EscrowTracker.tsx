"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Loader2, Lock, Send, XCircle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { invokeReleaseMilestone, hasContractConfig } from "@/lib/contracts";

export interface EscrowRecord {
  onchain_id: string;
  client: string;
  creator: string;
  total_amount: string;
  remaining_balance: string;
  completed_milestones: number;
  total_milestones: number;
  status: "active" | "settled";
}

export function xlmFromStroops(value: string | bigint): string {
  const stroops = BigInt(value);
  const whole = stroops / 10_000_000n;
  const frac = (stroops % 10_000_000n).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

type ReleaseStatus = "idle" | "signing" | "success" | "error";

export function EscrowTracker({
  escrow,
  onRelease,
}: {
  escrow: EscrowRecord;
  onRelease?: (payload: { escrowId: string; payoutStroops: bigint }) => Promise<void>;
}) {
  const wallet = useWallet();
  const [status, setStatus] = useState<ReleaseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState("");

  const total = BigInt(escrow.total_amount || "0");
  const remaining = BigInt(escrow.remaining_balance || "0");
  const totalMilestones = escrow.total_milestones || 0;
  const completed = escrow.completed_milestones || 0;
  const settled = escrow.status === "settled" || remaining <= 0n;
  const progress =
    totalMilestones > 0 ? Math.min(1, completed / totalMilestones) : 0;
  const nextPayout = totalMilestones > 0 ? total / BigInt(totalMilestones) : 0n;
  const allReleased = completed >= totalMilestones;

  const release = useCallback(async () => {
    if (settled || allReleased || totalMilestones === 0) return;
    if (!wallet.address) return;
    if (!hasContractConfig()) {
      setStatus("error");
      setError("Contract not configured — set NEXT_PUBLIC_LUMINA_CONTRACT_ID first.");
      return;
    }
    setStatus("signing");
    setError(null);
    try {
      if (onRelease) {
        await onRelease({ escrowId: escrow.onchain_id, payoutStroops: nextPayout });
      } else {
        const { hash } = await invokeReleaseMilestone({
          address: wallet.address,
          escrowId: escrow.onchain_id,
          payoutStroops: nextPayout,
          networkPassphrase: wallet.walletNetworkPassphrase,
        });
        setLastHash(hash);
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Release failed");
    }
  }, [
    settled,
    allReleased,
    totalMilestones,
    wallet.address,
    wallet.walletNetworkPassphrase,
    onRelease,
    escrow.onchain_id,
    nextPayout,
  ]);

  const ctaDisabled =
    settled ||
    allReleased ||
    totalMilestones === 0 ||
    status === "signing" ||
    !wallet.address;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Escrow #{escrow.onchain_id}</h3>
          <p className="font-mono text-[11px] text-zinc-500">
            {xlmFromStroops(total)} XLM · {xlmFromStroops(remaining)} remaining
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${
            settled
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-lumina-500/30 bg-lumina-500/10 text-lumina-300"
          }`}
        >
          {settled ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <Lock className="h-3.5 w-3.5" aria-hidden />}
          {settled ? "Settled" : "Active"}
        </span>
      </div>

      <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
        <span>Milestone progress</span>
        <span>
          {completed} / {totalMilestones}
        </span>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lumina-500 to-emerald-400 transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {totalMilestones === 0 ? (
        <p className="mb-3 text-xs text-amber-300">
          Milestone schedule not indexed yet — releases require completed milestones.
        </p>
      ) : null}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {status === "success" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Milestone released{lastHash ? <code className="font-mono"> tx {lastHash}</code> : null}.
        </div>
      )}

      <button
        type="button"
        onClick={() => void release()}
        disabled={ctaDisabled}
        title={
          settled || allReleased
            ? "All milestones released"
            : totalMilestones === 0
              ? "Missing milestone schedule"
              : !wallet.address
                ? "Connect a wallet to release"
                : `Releases ${xlmFromStroops(nextPayout)} XLM (client-authorized)`
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lumina-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-lumina-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "signing" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Signing…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden />
            Release Next Milestone
            {!settled && !allReleased && totalMilestones > 0 ? ` (${xlmFromStroops(nextPayout)} XLM)` : ""}
          </>
        )}
      </button>
    </div>
  );
}