'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const NodeSyncDashboard = dynamic(
  () =>
    import('@/src/components/sync/NodeSyncDashboard').then(
      (m) => m.NodeSyncDashboard,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-slate-400">Loading sync status…</div>
    ),
  },
)

/**
 * /node-sync — Node Synchronization Progress Tracker (#101).
 * Loaded client-side to avoid SSR issues with WebSocket connections.
 */
export default function NodeSyncPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
        <main id="main-content" className="mx-auto max-w-5xl px-4 py-8" aria-label="Node synchronization tracker">
          <h1 className="mb-6 text-2xl font-bold text-white">
            Node Synchronization
          </h1>
          <NodeSyncDashboard pollIntervalMs={15_000} />
        </main>
      </Suspense>
    </div>
  )
}
