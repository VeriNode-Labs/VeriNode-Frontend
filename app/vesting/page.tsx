'use client';

import { Suspense } from 'react';
import { VestingDashboard } from '@/src/components/vesting/VestingDashboard';

export default function VestingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <main id="main-content" className="mx-auto min-h-screen max-w-5xl px-4 py-8" aria-label="Token vesting dashboard">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Token Vesting</h1>
          <p className="mt-1 text-sm text-slate-400">
            View your vesting schedules, upcoming unlocks, and claim history.
          </p>
        </div>

        {/* Dashboard */}
        <Suspense fallback={<div className="p-8 text-slate-400">Loading vesting data…</div>}>
          <VestingDashboard />
        </Suspense>
      </main>
    </div>
  );
}
