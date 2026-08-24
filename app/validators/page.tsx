'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ValidatorDetail } from '@/src/components/validators/ValidatorDetail'

function ValidatorDetailRoute() {
  const params = useSearchParams()
  const raw = params.get('validator')
  const parsed = Number(raw)
  const validatorIndex = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  const beaconNodeUrl = params.get('beacon') ?? undefined

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-4 py-8" aria-label="Validator detail">
      <h1 className="mb-6 text-2xl font-bold text-white">Validator Detail</h1>
      <ValidatorDetail validatorIndex={validatorIndex} beaconNodeUrl={beaconNodeUrl} />
    </main>
  )
}

export default function ValidatorsPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
        <ValidatorDetailRoute />
      </Suspense>
    </div>
  )
}
