'use client'

import { useState } from 'react'
import { TxModal } from '@/src/components/wallet/TxModal'
import {
  TRANSACTION_TYPES,
  buildTransaction,
  transactionLabel,
  type SorobanTransaction,
} from '@/src/lib/stellar/transaction'

export default function PreflightDemoPage() {
  const [transaction, setTransaction] = useState<SorobanTransaction | null>(null)
  const [approved, setApproved] = useState<string | null>(null)

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-2xl bg-slate-950 px-4 py-10 text-white" aria-label="Transaction pre-flight simulation">
      <h1 className="mb-2 text-2xl font-bold">Transaction Pre-Flight</h1>
      <p className="mb-8 text-sm text-slate-400">
        Simulate a Soroban transaction to preview its resource footprint and fee before approving.
      </p>

      <div className="flex flex-wrap gap-3">
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTransaction(buildTransaction(type))}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-medium hover:bg-slate-800"
          >
            {transactionLabel(type)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTransaction(buildTransaction('stake', { operations: ['stake', 'delegate'] }))}
          className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 hover:bg-sky-500/20"
        >
          Stake + Delegate
        </button>
      </div>

      {approved && (
        <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Approved “{approved}” — handed off to wallet for signing.
        </p>
      )}

      <TxModal
        transaction={transaction}
        open={transaction !== null}
        onClose={() => setTransaction(null)}
        onApprove={(tx) => {
          setApproved(transactionLabel(tx.type))
          setTransaction(null)
        }}
      />
    </main>
  )
}
