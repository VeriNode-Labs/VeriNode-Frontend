"use client";

import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Boxes,
  Fingerprint,
  Medal,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { nodeIdFromBlindId } from "@/services/crypto";

export interface BlindCandidate {
  id: string;
  merit_score: number;
  verified_skills: string[];
  completion_ratio: number | null;
  escrows_completed: number;
}

interface Tier {
  label: string;
  min: number;
  icon: LucideIcon;
}

const TIERS: Tier[] = [
  { label: "Diamond", min: 250, icon: Trophy },
  { label: "Gold", min: 175, icon: Medal },
  { label: "Silver", min: 125, icon: BadgeCheck },
  { label: "Bronze", min: 100, icon: ShieldCheck },
];

export function tierFor(merit: number): Tier {
  return [...TIERS].reverse().find((tier) => merit >= tier.min) ?? TIERS[TIERS.length - 1];
}

export function BlindRecruitmentCard({ candidate }: { candidate: BlindCandidate }) {
  const tier = tierFor(candidate.merit_score);
  const TierIcon = tier.icon;
  const successRate =
    candidate.completion_ratio != null
      ? Math.round(candidate.completion_ratio * 100)
      : 100;

  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 transition hover:border-lumina-500/40 hover:bg-zinc-900">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lumina-300">
            <Fingerprint className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Node #{nodeIdFromBlindId(candidate.id)}</h3>
            <p className="font-mono text-[11px] text-zinc-500">0x{candidate.id}</p>
          </div>
        </div>
        <span
          title={`Merit tier ${tier.label}`}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-lumina-200"
        >
          <TierIcon className="h-3.5 w-3.5" aria-hidden />
          {tier.label}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-400">
            Milestone delivery
          </div>
          <div className="text-lg font-semibold text-emerald-300">{successRate}%</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400">Merit</div>
          <div className="flex items-center gap-1 text-lg font-semibold text-lumina-300">
            <Sparkles className="h-4 w-4" aria-hidden />
            {candidate.merit_score}
          </div>
        </div>
      </div>

      {candidate.verified_skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {candidate.verified_skills.slice(0, 8).map((skill) => (
            <span
              key={skill}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Verified skills pending on-chain attestation</p>
      )}

      <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500">
        <Boxes className="h-3.5 w-3.5" aria-hidden />
        {candidate.escrows_completed} escrow{candidate.escrows_completed === 1 ? "" : "s"} settled
        <span className="ml-auto inline-flex items-center gap-1 text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5 text-lumina-300" aria-hidden />
          identity anonymized
        </span>
      </div>
    </article>
  );
}