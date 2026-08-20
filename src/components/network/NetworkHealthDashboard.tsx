'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { TimeRange } from '@/src/types/networkHealth'
import { TimeRangeSelector } from '@/src/components/network/TimeRangeSelector'
import { VersionDistributionChart } from '@/src/components/network/VersionDistributionChart'
import { LatencyHeatmap } from '@/src/components/network/LatencyHeatmap'
import { NetworkEventLog } from '@/src/components/network/NetworkEventLog'
import { ChartSkeleton } from '@/src/components/charts/ChartSkeleton'
import {
  useLatencyHeatmap,
  useNetworkEventLog,
  useNetworkNodes,
  useNetworkPeerGraph,
  useVersionDistribution,
} from '@/src/hooks/useNetworkHealthDashboard'

// Canvas components loaded client-side only (they access browser APIs)
const NodeMap = dynamic(
  () => import('@/src/components/network/NodeMap').then((m) => m.NodeMap),
  { ssr: false, loading: () => <ChartSkeleton height={340} /> },
)

const PeerGraph = dynamic(
  () => import('@/src/components/network/PeerGraph').then((m) => m.PeerGraph),
  { ssr: false, loading: () => <ChartSkeleton height={340} /> },
)

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Average latency summary card
// ---------------------------------------------------------------------------

function AvgLatencySummary({ nodes }: { nodes: { latencyMs: number; status: string }[] }) {
  const active = nodes.filter((n) => n.status === 'active')
  if (active.length === 0) return null
  const avg = Math.round(active.reduce((s, n) => s + n.latencyMs, 0) / active.length)
  const sorted = [...active].sort((a, b) => a.latencyMs - b.latencyMs)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]?.latencyMs ?? 0
  const p95 = sorted[Math.floor(sorted.length * 0.95)]?.latencyMs ?? 0

  return (
    <div className="flex flex-wrap gap-4">
      {[
        { label: 'Avg latency', value: `${avg}ms` },
        { label: 'p50', value: `${p50}ms` },
        { label: 'p95', value: `${p95}ms` },
        { label: 'Active nodes', value: String(active.length) },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-slate-800/60 px-4 py-3 text-sm">
          <div className="text-slate-500 text-xs">{label}</div>
          <div className="mt-1 font-semibold text-white">{value}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

/**
 * Network Health Dashboard (issue #173).
 *
 * Panels:
 * 1. NodeMap       – geographic node distribution with proximity clustering
 * 2. PeerGraph     – force-directed peer connectivity (max 500 nodes)
 * 3. VersionDistribution – pie/donut chart of client versions
 * 4. LatencyHeatmap – region-pair p50/p95 latency grid
 * 5. NetworkEventLog – real-time event feed with infinite scroll
 *
 * All panels are driven by the shared TimeRangeSelector (1h / 24h / 7d).
 */
export function NetworkHealthDashboard() {
  const [range, setRange] = useState<TimeRange>('1h')

  const nodesQuery = useNetworkNodes(range)
  const peerGraphQuery = useNetworkPeerGraph(range)
  const versionsQuery = useVersionDistribution(range)
  const latencyQuery = useLatencyHeatmap(range)
  const { events, isConnected, error: wsError } = useNetworkEventLog()

  const nodes = nodesQuery.data ?? []
  const peerGraph = peerGraphQuery.data
  const versions = versionsQuery.data
  const latency = latencyQuery.data

  return (
    <div className="space-y-6">
      {/* Dashboard header + time range */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Network Health Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Bird's-eye view of VeriNode network topology, connectivity, and real-time events.
          </p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Average latency summary */}
      {nodes.length > 0 && <AvgLatencySummary nodes={nodes} />}

      {/* 1. Geographic node map */}
      <Section
        title="Node Map"
        description="Geographic distribution of network nodes. Clustered by proximity. Click a marker to view details."
      >
        {nodesQuery.isLoading ? (
          <ChartSkeleton height={340} />
        ) : (
          <NodeMap nodes={nodes} />
        )}
      </Section>

      {/* 2. Peer connectivity graph */}
      <Section
        title="Peer Connectivity Graph"
        description="Force-directed graph of active peer connections (max 500 nodes). Hover nodes to inspect. Use search to highlight."
      >
        {peerGraphQuery.isLoading || !peerGraph ? (
          <ChartSkeleton height={340} />
        ) : (
          <PeerGraph data={peerGraph} />
        )}
      </Section>

      {/* 3 + 4 – Version distribution & Latency heatmap side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          title="Version Distribution"
          description="Client software versions across the network."
        >
          {versionsQuery.isLoading || !versions ? (
            <ChartSkeleton height={220} />
          ) : (
            <VersionDistributionChart data={versions} />
          )}
        </Section>

        <Section
          title="Latency Heatmap"
          description="p50 / p95 latency between region pairs. Hover a cell for details."
        >
          {latencyQuery.isLoading || !latency ? (
            <ChartSkeleton height={220} />
          ) : (
            <LatencyHeatmap data={latency} />
          )}
        </Section>
      </div>

      {/* 5. Real-time event log */}
      <Section
        title="Network Event Log"
        description="Real-time feed of node join/leave, version upgrades, forks, and alerts. Infinite scroll."
      >
        <NetworkEventLog events={events} isConnected={isConnected} error={wsError} />
      </Section>
    </div>
  )
}
