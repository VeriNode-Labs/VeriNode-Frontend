'use client';

import { Suspense } from 'react';
import { GovernanceDashboard } from '@/src/components/governance/GovernanceDashboard';

export default function GovernancePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Governance Voting Dashboard
            </h1>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-0.5 text-xs font-bold text-sky-400">
              VRN DAO
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Decentralized protocol decision-making for VeriNode. Browse active proposals, vote with quadratic or token-weighted power, delegate voting rights, and simulate on-chain parameter upgrades.
          </p>
        </div>

        {/* Dashboard Content */}
        <Suspense fallback={<div className="p-12 text-center text-slate-400 animate-pulse">Loading governance dashboard...</div>}>
          <GovernanceDashboard />
        </Suspense>
      </main>
    </div>
  );
}
