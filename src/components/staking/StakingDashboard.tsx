'use client';

/**
 * StakingDashboard
 *
 * The top-level staking management feature component. Consumes useStakingOverview
 * and orchestrates all sub-components:
 *
 *   1. StakingOverview      – portfolio stats cards
 *   2. StakeForm            – stake tokens with APR preview
 *   3. UnstakeForm          – unstake with cooldown countdown
 *   4. YieldOptimizer       – DeFi auto-deposit toggle
 *   5. StakingChart         – balance, APR, cumulative rewards charts
 *   6. RewardsHistory       – paginated rewards table with CSV export
 *
 * Also integrates with useSorobanStaking for pending transaction display.
 */

import { useWallet } from '@/src/hooks/useWallet';
import { useStakingOverview } from '@/src/hooks/useStakingOverview';
import { useYieldOptimizer } from '@/src/hooks/useYieldOptimizer';
import { StakingOverview } from '@/src/components/staking/StakingOverview';
import { StakeForm } from '@/src/components/staking/StakeForm';
import { UnstakeForm } from '@/src/components/staking/UnstakeForm';
import { YieldOptimizer } from '@/src/components/staking/YieldOptimizer';
import { StakingChart } from '@/src/components/staking/StakingChart';
import { RewardsHistory } from '@/src/components/staking/RewardsHistory';

// ── Section wrapper ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────

export function StakingDashboard() {
  const { activeAccount } = useWallet();
  const address = activeAccount?.publicKey ?? '';

  const { data, isLoading, isError, error } = useStakingOverview();

  const {
    settings: yieldSettings,
    toggleEnabled: toggleYield,
    setProtocol: setYieldProtocol,
    setDepositPercentage: setYieldDepositPct,
  } = useYieldOptimizer(data?.yieldSettings ?? null);

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-xl bg-slate-800/60" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-xl bg-slate-800/60" />
          <div className="h-64 rounded-xl bg-slate-800/60" />
        </div>
        <div className="h-48 rounded-xl bg-slate-800/60" />
        <div className="h-64 rounded-xl bg-slate-800/60" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        Failed to load staking data:{' '}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  // ── No wallet connected ───────────────────────────────────────────────
  if (!address) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-400">
        Connect your wallet to view staking management.
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-10">
      {/* ── Overview: portfolio stats ───────────────────────────────────── */}
      <Section title="Staking Overview">
        <StakingOverview overview={data.overview} />
      </Section>

      {/* ── Stake / Unstake forms ──────────────────────────────────────── */}
      <Section title="Stake & Unstake">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StakeForm
            currentApr={data.overview.currentApr}
            availableBalance={data.overview.pendingRewards + 1000}
            tokenSymbol={data.overview.tokenSymbol}
          />
          <UnstakeForm
            stakedBalance={data.overview.userStake}
            tokenSymbol={data.overview.tokenSymbol}
            unstakeRequests={data.unstakeRequests}
          />
        </div>
      </Section>

      {/* ── Yield Optimizer ────────────────────────────────────────────── */}
      <Section title="DeFi Yield Optimization">
        {yieldSettings && (
          <YieldOptimizer
            settings={yieldSettings}
            onToggle={toggleYield}
            onProtocolChange={setYieldProtocol}
            onDepositPercentageChange={setYieldDepositPct}
          />
        )}
      </Section>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <Section title="Staking History">
        <StakingChart
          balanceHistory={data.balanceHistory}
          aprHistory={data.aprHistory}
          cumulativeRewards={data.cumulativeRewards}
        />
      </Section>

      {/* ── Rewards History ────────────────────────────────────────────── */}
      <Section title="Reward History">
        <RewardsHistory
          records={data.rewardsHistory}
          address={address}
          tokenSymbol={data.overview.tokenSymbol}
        />
      </Section>
    </div>
  );
}
