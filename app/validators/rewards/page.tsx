'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ValidatorRewardHistory } from '@/src/components/rewards/ValidatorRewardHistory'

// Default demo pubkey used when no ?pubkey= query param is provided.
const DEMO_PUBKEY =
  '0xb4d22ee19d2e1f5b6b3fa3faa6e0e9339c4f0c1f9d8a12e56d3c1b7e0f8a09d2'

function RewardsRoute() {
  const params = useSearchParams()
  const pubkey = params.get('pubkey') ?? DEMO_PUBKEY

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl px-4 py-8" aria-label="Validator reward history">
      <h1 className="mb-6 text-2xl font-bold text-white">Validator Reward History</h1>
      <ValidatorRewardHistory pubkey={pubkey} />
    </main>
  )
}

export default function ValidatorRewardsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
        <RewardsRoute />
      </Suspense>
    </div>
  )
}
