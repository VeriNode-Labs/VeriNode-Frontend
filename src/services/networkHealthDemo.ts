// Deterministic demo data for the Network Health Dashboard (issue #173).
// Used as a fallback when the API is unreachable, following the project-wide
// convention established in useSyncStatus and useFleetData.

import type {
  GeoNode,
  LatencyCell,
  LatencyHeatmapData,
  NetworkEvent,
  NetworkEventType,
  NetworkNodeStatus,
  PeerEdge,
  PeerGraphData,
  PeerNode,
  VersionDistributionResponse,
  VersionEntry,
} from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

export const DEMO_REGIONS = [
  'US East',
  'EU West',
  'AP Southeast',
  'US West',
  'EU Central',
  'AP Northeast',
] as const

// ---------------------------------------------------------------------------
// GeoNode demo data
// ---------------------------------------------------------------------------

const GEO_SEEDS: Array<{
  label: string
  latitude: number
  longitude: number
  region: string
}> = [
  { label: 'Aurora-US-01', latitude: 40.71, longitude: -74.01, region: 'US East' },
  { label: 'Aurora-US-02', latitude: 37.77, longitude: -122.42, region: 'US West' },
  { label: 'Aurora-EU-01', latitude: 51.51, longitude: -0.13, region: 'EU West' },
  { label: 'Aurora-EU-02', latitude: 52.52, longitude: 13.41, region: 'EU Central' },
  { label: 'Aurora-AP-01', latitude: 1.35, longitude: 103.82, region: 'AP Southeast' },
  { label: 'Aurora-AP-02', latitude: 35.69, longitude: 139.69, region: 'AP Northeast' },
  { label: 'Beacon-US-01', latitude: 41.88, longitude: -87.63, region: 'US East' },
  { label: 'Beacon-EU-01', latitude: 48.85, longitude: 2.35, region: 'EU West' },
  { label: 'Beacon-AP-01', latitude: -33.87, longitude: 151.21, region: 'AP Southeast' },
  { label: 'Relay-US-01', latitude: 32.78, longitude: -96.8, region: 'US East' },
  { label: 'Relay-EU-01', latitude: 50.11, longitude: 8.68, region: 'EU Central' },
  { label: 'Relay-AP-01', latitude: 22.31, longitude: 114.17, region: 'AP Southeast' },
]

const VERSIONS = ['v1.14.0', 'v1.13.2', 'v1.13.1', 'v1.12.0', 'v1.11.5']
const STATUSES: NetworkNodeStatus[] = ['active', 'active', 'active', 'syncing', 'offline']

export function buildDemoGeoNodes(): GeoNode[] {
  const now = Date.now()
  return GEO_SEEDS.map((seed, index) => {
    const status = STATUSES[index % STATUSES.length]
    return {
      id: `node-${String(index + 1).padStart(3, '0')}`,
      label: seed.label,
      latitude: seed.latitude + (index % 3) * 0.05,
      longitude: seed.longitude + (index % 5) * 0.05,
      status,
      version: VERSIONS[index % VERSIONS.length],
      region: seed.region,
      latencyMs: 20 + ((index * 37) % 200),
      peerCount: 5 + ((index * 13) % 30),
      lastSeenAt: now - ((index % 12) * 5_000),
    }
  })
}

// ---------------------------------------------------------------------------
// PeerGraph demo data
// ---------------------------------------------------------------------------

export function buildDemoPeerGraph(maxNodes = 500): PeerGraphData {
  const nodes: PeerNode[] = GEO_SEEDS.slice(0, Math.min(GEO_SEEDS.length, maxNodes)).map(
    (seed, index) => ({
      id: `node-${String(index + 1).padStart(3, '0')}`,
      label: seed.label,
      status: STATUSES[index % STATUSES.length],
      version: VERSIONS[index % VERSIONS.length],
    }),
  )

  const edges: PeerEdge[] = []
  const edgeCount = Math.min(nodes.length * 2, 1_000)
  for (let i = 0; i < edgeCount; i++) {
    const sourceIdx = i % nodes.length
    const targetIdx = (sourceIdx + 1 + ((i * 7) % Math.max(1, nodes.length - 1))) % nodes.length
    if (sourceIdx === targetIdx) continue
    edges.push({
      id: `edge-${i}`,
      source: nodes[sourceIdx].id,
      target: nodes[targetIdx].id,
      latencyMs: 15 + ((sourceIdx + targetIdx) % 260),
    })
  }

  return { nodes, edges }
}

// ---------------------------------------------------------------------------
// Version distribution demo data
// ---------------------------------------------------------------------------

export function buildDemoVersionDistribution(): VersionDistributionResponse {
  const counts = [48, 22, 16, 8, 6]
  const totalNodes = counts.reduce((a, b) => a + b, 0)
  const versions: VersionEntry[] = VERSIONS.map((version, index) => ({
    version,
    count: counts[index],
    percent: Math.round((counts[index] / totalNodes) * 100 * 10) / 10,
  }))

  return {
    versions,
    totalNodes,
    capturedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Latency heatmap demo data
// ---------------------------------------------------------------------------

const BASE_LATENCIES: Record<string, Record<string, number>> = {
  'US East': {
    'US East': 0,
    'EU West': 84,
    'AP Southeast': 210,
    'US West': 68,
    'EU Central': 92,
    'AP Northeast': 195,
  },
  'EU West': {
    'US East': 84,
    'EU West': 0,
    'AP Southeast': 155,
    'US West': 140,
    'EU Central': 12,
    'AP Northeast': 170,
  },
  'AP Southeast': {
    'US East': 210,
    'EU West': 155,
    'AP Southeast': 0,
    'US West': 170,
    'EU Central': 160,
    'AP Northeast': 52,
  },
  'US West': {
    'US East': 68,
    'EU West': 140,
    'AP Southeast': 170,
    'US West': 0,
    'EU Central': 150,
    'AP Northeast': 145,
  },
  'EU Central': {
    'US East': 92,
    'EU West': 12,
    'AP Southeast': 160,
    'US West': 150,
    'EU Central': 0,
    'AP Northeast': 175,
  },
  'AP Northeast': {
    'US East': 195,
    'EU West': 170,
    'AP Southeast': 52,
    'US West': 145,
    'EU Central': 175,
    'AP Northeast': 0,
  },
}

export function buildDemoLatencyHeatmap(): LatencyHeatmapData {
  const regions = [...DEMO_REGIONS]
  const cells: LatencyCell[] = []

  for (const source of regions) {
    for (const target of regions) {
      const p50 = BASE_LATENCIES[source]?.[target] ?? 100
      cells.push({
        sourceRegion: source,
        targetRegion: target,
        p50Ms: p50,
        p95Ms: Math.round(p50 * 1.4),
      })
    }
  }

  return { regions, cells, capturedAt: Date.now() }
}

// ---------------------------------------------------------------------------
// Event log demo data
// ---------------------------------------------------------------------------

const EVENT_TYPES: NetworkEventType[] = [
  'node_join',
  'node_leave',
  'version_upgrade',
  'fork_detected',
  'alert',
]

const EVENT_MESSAGES: Record<NetworkEventType, string> = {
  node_join: 'Node joined the network',
  node_leave: 'Node gracefully disconnected',
  version_upgrade: 'Client upgraded to new version',
  fork_detected: 'Competing chain tip detected – monitoring',
  alert: 'Elevated error rate observed on node',
}

export function buildDemoNetworkEvents(count = 50): NetworkEvent[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const nodeIndex = i % GEO_SEEDS.length
    const seed = GEO_SEEDS[nodeIndex]
    const eventType = EVENT_TYPES[i % EVENT_TYPES.length]
    return {
      id: `evt-${String(i).padStart(6, '0')}`,
      type: eventType,
      nodeId: `node-${String(nodeIndex + 1).padStart(3, '0')}`,
      nodeLabel: seed.label,
      message: EVENT_MESSAGES[eventType],
      timestamp: now - (count - i) * 8_000,
      metadata:
        eventType === 'version_upgrade'
          ? { from: 'v1.13.1', to: 'v1.14.0' }
          : undefined,
    }
  })
}
