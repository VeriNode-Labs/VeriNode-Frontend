'use client';

import { Suspense } from 'react';
import { StakingDashboard } from '@/src/components/staking/StakingDashboard';

export default function StakingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Staking Management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Stake, unstake, earn rewards, and optimize yield with DeFi integration.
          </p>
        </div>

        {/* Dashboard */}
        <Suspense fallback={<div className="p-8 text-slate-400">Loading staking data…</div>}>
          <StakingDashboard />
        </Suspense>
      </main>
    </div>
  );
}
