// Network Health Dashboard types for issue #173.
// Covers: NodeMap, PeerGraph, VersionDistribution, LatencyHeatmap, EventLog, TimeRange.

export type TimeRange = '1h' | '24h' | '7d'

// ---------------------------------------------------------------------------
// NodeMap
// ---------------------------------------------------------------------------

export type NetworkNodeStatus = 'active' | 'syncing' | 'offline' | 'error'

export interface GeoNode {
  id: string
  /** Human-readable label shown in the map tooltip / detail panel. */
  label: string
  latitude: number
  longitude: number
  status: NetworkNodeStatus
  /** Client software version string, e.g. "v1.12.0". */
  version: string
  /** Country or region display name. */
  region: string
  /** Average p50 latency to peers in ms. */
  latencyMs: number
  /** Number of active peer connections. */
  peerCount: number
  /** Unix-ms last-seen timestamp. */
  lastSeenAt: number
}

export interface NodeCluster {
  id: string
  latitude: number
  longitude: number
  /** Count of nodes collapsed into this cluster. */
  nodeCount: number
  /** Dominant status among clustered nodes. */
  dominantStatus: NetworkNodeStatus
}

// ---------------------------------------------------------------------------
// PeerGraph
// ---------------------------------------------------------------------------

export interface PeerNode {
  id: string
  label: string
  status: NetworkNodeStatus
  version: string
}

export interface PeerEdge {
  id: string
  source: string
  target: string
  latencyMs: number
}

export interface PeerGraphData {
  nodes: PeerNode[]
  edges: PeerEdge[]
}

// ---------------------------------------------------------------------------
// Version Distribution
// ---------------------------------------------------------------------------

export interface VersionEntry {
  version: string
  count: number
  /** Percentage 0–100, already computed by API or derived client-side. */
  percent: number
}

export interface VersionDistributionResponse {
  versions: VersionEntry[]
  totalNodes: number
  /** Unix-ms snapshot time. */
  capturedAt: number
}

// ---------------------------------------------------------------------------
// Latency Heatmap
// ---------------------------------------------------------------------------

export interface LatencyCell {
  /** Source region identifier. */
  sourceRegion: string
  /** Target region identifier. */
  targetRegion: string
  /** p50 latency in ms. */
  p50Ms: number
  /** p95 latency in ms. */
  p95Ms: number
}

export interface LatencyHeatmapData {
  regions: string[]
  cells: LatencyCell[]
  /** Unix-ms snapshot time. */
  capturedAt: number
}

// ---------------------------------------------------------------------------
// Event Log
// ---------------------------------------------------------------------------

export type NetworkEventType =
  | 'node_join'
  | 'node_leave'
  | 'version_upgrade'
  | 'fork_detected'
  | 'alert'

export interface NetworkEvent {
  id: string
  type: NetworkEventType
  nodeId: string
  nodeLabel: string
  /** Human-readable description of the event. */
  message: string
  /** Unix-ms timestamp. */
  timestamp: number
  /** Metadata – shape depends on event type. */
  metadata?: Record<string, string | number | boolean>
}

export interface NetworkEventLogState {
  events: NetworkEvent[]
  isConnected: boolean
  error: string | null
}

// ---------------------------------------------------------------------------
// WebSocket message shapes for real-time event log
// ---------------------------------------------------------------------------

export interface WSNetworkEvent {
  type: 'network-event'
  data: NetworkEvent
}

export interface WSNetworkEventBatch {
  type: 'network-event-batch'
  data: NetworkEvent[]
}
