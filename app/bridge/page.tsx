'use client'

import { Suspense } from 'react'
import { BridgeTransactionList } from '@/src/components/bridge/BridgeTransactionList'

export default function BridgePage() {
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl px-4 py-8" aria-label="Cross-chain bridge explorer">
      <h1 className="mb-6 text-2xl font-bold text-white">Cross-Chain Bridge Explorer</h1>
      <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
        <BridgeTransactionList />
      </Suspense>
    </main>
  )
}
