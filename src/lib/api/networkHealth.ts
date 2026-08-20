// API layer for the Network Health Dashboard (issue #173).
// Follows the existing pattern from src/lib/api/nodes.ts and syncStatus.ts:
// – fetch with credentials: 'include'
// – throws on non-ok responses
// – callers are responsible for falling back to demo data when the fetch throws

import type {
  GeoNode,
  LatencyHeatmapData,
  PeerGraphData,
  TimeRange,
  VersionDistributionResponse,
} from '@/src/types/networkHealth'

const BASE = '/api/v1/network'

function timeRangeParam(range: TimeRange): string {
  return `?range=${range}`
}

/** GET /api/v1/network/nodes – geographic node list with clustering metadata. */
export async function fetchNetworkNodes(range: TimeRange): Promise<GeoNode[]> {
  const res = await fetch(`${BASE}/nodes${timeRangeParam(range)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`network/nodes fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<GeoNode[]>
}

/** GET /api/v1/network/peers – peer connectivity graph. */
export async function fetchPeerGraph(range: TimeRange): Promise<PeerGraphData> {
  const res = await fetch(`${BASE}/peers${timeRangeParam(range)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`network/peers fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<PeerGraphData>
}

/** GET /api/v1/network/versions – client software version distribution. */
export async function fetchVersionDistribution(
  range: TimeRange,
): Promise<VersionDistributionResponse> {
  const res = await fetch(`${BASE}/versions${timeRangeParam(range)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`network/versions fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<VersionDistributionResponse>
}

/** GET /api/v1/network/latency – region-pair latency heatmap data. */
export async function fetchLatencyHeatmap(
  range: TimeRange,
): Promise<LatencyHeatmapData> {
  const res = await fetch(`${BASE}/latency${timeRangeParam(range)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`network/latency fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<LatencyHeatmapData>
}
