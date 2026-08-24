'use client'

// Supply Chain Map page — integrates the virtualized TierTreeView (#43).
//
// Located at /supply-chain in the Next.js App Router.
// Passes a deterministic mock tree (10,000 nodes across 8 tiers) to
// TierTreeView so the 45fps floor target can be validated in the browser.

import { useMemo, useState } from 'react'
import { TierTreeView } from '@/src/components/supplychain/TierTreeView'
import { generateMockTree } from '@/src/utils/treeFlattener'
import type { SupplyChainTier } from '@/src/types/supplychain'

const DEFAULT_NODE_COUNT = 10_000
const DEFAULT_TIER_DEPTH = 8
const DEFAULT_BRANCH_FACTOR = 4

export default function SupplyChainMapPage() {
  const [nodeCount, setNodeCount] = useState(DEFAULT_NODE_COUNT)

  // Generate mock tree — memoized so it doesn't regenerate on every render.
  const treeData: SupplyChainTier[] = useMemo(
    () => generateMockTree(nodeCount, DEFAULT_TIER_DEPTH, DEFAULT_BRANCH_FACTOR),
    [nodeCount],
  )

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <main id="main-content" className="mx-auto max-w-5xl" aria-label="Supply chain map">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Supply Chain Map</h1>
          <p className="mt-2 text-sm text-slate-400">
            Virtualized multi-tier hierarchy — renders up to 10,000 nodes while keeping
            DOM size constant (20-node visible window + 10-node overscan).
          </p>
        </header>

        {/* Node count control for performance profiling */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <label htmlFor="node-count" className="text-sm text-slate-300">
              Tree size:
            </label>
            {([1_000, 5_000, 10_000] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNodeCount(n)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  nodeCount === n
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : 'border-white/10 bg-slate-800/60 text-slate-400 hover:border-white/20'
                }`}
              >
                {n.toLocaleString()} nodes
              </button>
            ))}
            <span className="text-xs text-slate-500">
              Tree generated with {DEFAULT_TIER_DEPTH} tiers · branch factor {DEFAULT_BRANCH_FACTOR}
            </span>
          </div>
        </section>

        {/* Virtualized tree */}
        <TierTreeView
          nodes={treeData}
          containerHeight={640}
          className="w-full"
        />

        <footer className="mt-6 text-xs text-slate-600">
          Performance target: ≥45fps at 10,000 nodes · DOM budget: ≤40 nodes in viewport at any time
        </footer>
      </main>
    </div>
  )
}
