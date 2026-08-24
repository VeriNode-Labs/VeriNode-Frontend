'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ExitQueueTracker } from '@/src/components/validators/ExitQueueTracker'

const DEFAULT_VALIDATOR_INDEX = 100

function ExitQueueRoute() {
  const params = useSearchParams()
  const raw = params.get('validator')
  const parsed = Number(raw)
  const validatorIndex =
    Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_VALIDATOR_INDEX
  const beaconNodeUrl = params.get('beacon') ?? undefined

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-4 py-8" aria-label="Exit queue tracker">
      <h1 className="mb-2 text-2xl font-bold text-white">Exit Queue Tracker</h1>
      <p className="mb-6 text-sm text-slate-400">
        Validator exit queue position, estimated wait time, and historical depth
      </p>
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-white">
        <ExitQueueTracker
          validatorIndex={validatorIndex}
          beaconNodeUrl={beaconNodeUrl}
        />
      </section>
    </main>
  )
}

export default function ValidatorExitQueuePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
        <ExitQueueRoute />
      </Suspense>
    </div>
  )
}
