'use client';

/**
 * StakingOverview
 *
 * Displays key staking portfolio statistics:
 * - Total staked / user stake
 * - Current APR
 * - Pending rewards
 * - Next claim date
 * - Network context (total staked, active stakers)
 *
 * Follows the same card-based layout as VestingOverview.
 */

import { useMemo } from 'react';
import type { StakingOverview as StakingOverviewType } from '@/src/types/staking';

interface StakingOverviewProps {
  overview: StakingOverviewType;
}

function formatAmount(n: number, symbol: string): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`;
}

function formatUsd(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatPill({
  label,
  value,
  sub,
  tone = 'text-white',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-800/50 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
      {sub != null && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function StakingOverview({ overview: o }: StakingOverviewProps) {
  const estimatedUsd = useMemo(
    () => (o.tokenPriceUsd != null ? o.userStake * o.tokenPriceUsd : null),
    [o.userStake, o.tokenPriceUsd],
  );

  const pendingUsd = useMemo(
    () => (o.tokenPriceUsd != null ? o.pendingRewards * o.tokenPriceUsd : null),
    [o.pendingRewards, o.tokenPriceUsd],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Staking Overview</h3>
          <p className="text-xs text-slate-400">
            Your VRN staking portfolio and network context
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
          Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatPill
          label="Total Staked"
          value={formatAmount(o.totalStaked, o.tokenSymbol)}
          tone="text-white"
        />
        <StatPill
          label="Current APR"
          value={`${o.currentApr.toFixed(1)}%`}
          tone="text-emerald-400"
        />
        <StatPill
          label="Your Stake"
          value={formatAmount(o.userStake, o.tokenSymbol)}
          sub={formatUsd(estimatedUsd)}
          tone="text-sky-300"
        />
        <StatPill
          label="Pending Rewards"
          value={formatAmount(o.pendingRewards, o.tokenSymbol)}
          sub={formatUsd(pendingUsd)}
          tone="text-amber-400"
        />
        <StatPill
          label="Next Claim"
          value={formatDate(o.nextClaimDate)}
          tone="text-slate-300"
        />
        <StatPill
          label="Network"
          value={`${o.activeStakers.toLocaleString()} stakers`}
          sub={`${(o.networkTotalStaked / 1000).toFixed(0)}K staked`}
          tone="text-slate-400"
        />
      </div>
    </div>
  );
}
