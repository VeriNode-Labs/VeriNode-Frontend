import { classifyWebSocketCloseCode, type WebSocketTier } from '@/utils/connectionClassifier'
import { computeTier2ExponentialBackoffMs } from '@/utils/exponentialBackoff'
import { computeWebSocketHealthScore } from '@/utils/healthScore'
import type {
  WebSocketCloseInfo,
  WebSocketConnectionHealthSummary,
  WebSocketHealthSnapshot,
  WebSocketTierStatus,
} from '@/types/webSocketHealth'
import { useWebSocketHealthStore } from '@/store/webSocketHealthSlice'

type ExtractSentTimestampMs = (parsedData: unknown) => number | null

const MAX_SIMULTANEOUS_CONNECTIONS = 10

// Snapshot / scoring windows.
const HEALTH_SNAPSHOT_INTERVAL_MS = 5_000
const HEALTH_HISTORY_MAX_ENTRIES = 720 // 1 hour @ 5s intervals
const UPTIME_WINDOW_MS = 60_000
const LATENCY_WINDOW_MS = 60_000

// Reconnect policy.
const STABLE_RESET_MS = 5 * 60_000
const TIER1_MAX_RECONNECT_ATTEMPTS = 3

function defaultExtractSentTimestampMs(parsedData: unknown): number | null {
  if (!parsedData || typeof parsedData !== 'object') return null

  const record = parsedData as Record<string, unknown>

  const maybeTimestamp =
    typeof record.timestamp === 'number'
      ? record.timestamp
      : typeof record.ts === 'number'
        ? record.ts
        : typeof record.sentAt === 'number'
          ? record.sentAt
          : null

  // Guard against test fixtures / relative timestamps: require plausible epoch ms.
  // 2001-09-09 in ms ≈ 1_000_000_000_000.
  if (maybeTimestamp === null) return null
  if (maybeTimestamp < 1_000_000_000_000) return null

  return maybeTimestamp
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function buildTierStatusFromClassification(tier: WebSocketTier, label: string): WebSocketTierStatus {
  return { tier, label }
}

export interface WebSocketManagerConnectionConfig {
  connectionId: string
  url: string
  enabled?: boolean

  onMessage?: (data: unknown, headers: Record<string, string>) => void
  onConnected?: () => void
  onDisconnected?: (closeInfo: WebSocketCloseInfo) => void
  onError?: (error: string) => void

  /**
   * Called after the socket successfully opens.
   * Use this to send any catch-up / subscription messages.
   */
  onOpen?: (ws: WebSocket) => void

  /**
   * Extract the client-observable "sent timestamp" for computing message latency.
   * When omitted, attempts `timestamp` / `ts` / `sentAt` fields.
   */
  extractSentTimestampMs?: ExtractSentTimestampMs
}

type InternalLatencySample = { receivedAtMs: number; latencyMs: number }

class InternalConnectionState {
  readonly connectionId: string
  readonly url: string
  refCount = 0

  // Socket state.
  ws: WebSocket | null = null
  // Used to detect stale sockets in test environments where the global
  // `WebSocket` constructor is swapped between tests.
  wsConstructor: typeof WebSocket | null = null
  connected = false
  manualCloseNext = false

  // For uptime calculation / stable reset.
  openedAtMs: number | null = null
  lastConnectionDurationMs: number | null = null

  // Reconnect attempts.
  autoReconnectEnabled = true
  tierStatus: WebSocketTierStatus = buildTierStatusFromClassification(1, 'normal')
  lastClose?: WebSocketCloseInfo
  consecutiveReconnectAttempts = 0
  tier1ReconnectAttempts = 0
  tier2ReconnectAttempts = 0

  // Message latency samples (for avg over last 60 seconds).
  latencySamples: InternalLatencySample[] = []

  // Health snapshot history (5s interval, max 720 entries).
  healthHistory: WebSocketHealthSnapshot[] = []

  // Reconnect scheduling.
  reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  // Callback wiring.
  config: Omit<WebSocketManagerConnectionConfig, 'connectionId' | 'url'>
  extractSentTimestampMs: ExtractSentTimestampMs

  constructor(
    connectionId: string,
    url: string,
    config: Omit<WebSocketManagerConnectionConfig, 'connectionId' | 'url'>,
  ) {
    this.connectionId = connectionId
    this.url = url
    this.config = config
    this.extractSentTimestampMs = config.extractSentTimestampMs ?? defaultExtractSentTimestampMs
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    this.reconnectTimeout = null
  }

  private pushLatencySample(latencyMs: number, receivedAtMs: number): void {
    // Keep samples bounded by time window (lazy pruning).
    this.latencySamples.push({ latencyMs, receivedAtMs })
  }

  private pruneLatencySamples(nowMs: number): void {
    const cutoff = nowMs - LATENCY_WINDOW_MS
    if (this.latencySamples.length === 0) return
    let idx = 0
    while (idx < this.latencySamples.length && this.latencySamples[idx].receivedAtMs < cutoff) idx++
    if (idx > 0) this.latencySamples = this.latencySamples.slice(idx)
  }

  private computeAvgLatencyMs(nowMs: number): number {
    this.pruneLatencySamples(nowMs)
    if (this.latencySamples.length === 0) return 1_000 // worst-case until latency observed

    const sum = this.latencySamples.reduce((acc, s) => acc + s.latencyMs, 0)
    return sum / this.latencySamples.length
  }

  private computeUptimeRatioLast60s(nowMs: number): number {
    const cutoff = nowMs - UPTIME_WINDOW_MS
    const recent = this.healthHistory.filter((s) => s.timestamp >= cutoff)

    const connectedSamples = recent.filter((s) => s.connected).length + (this.connected ? 1 : 0)
    const uptimeSeconds = connectedSamples * (HEALTH_SNAPSHOT_INTERVAL_MS / 1000)
    return clamp(uptimeSeconds / (UPTIME_WINDOW_MS / 1000), 0, 1)
  }

  private buildSnapshot(nowMs: number): WebSocketHealthSnapshot {
    const uptimeRatioLast60s = this.computeUptimeRatioLast60s(nowMs)
    const avgMessageLatencyMs = this.computeAvgLatencyMs(nowMs)

    const { totalScore } = computeWebSocketHealthScore({
      uptimeRatioLast60s,
      avgMessageLatencyMs,
      consecutiveReconnects: this.consecutiveReconnectAttempts,
    })

    const snapshot: WebSocketHealthSnapshot = {
      timestamp: nowMs,
      uptimeRatioLast60s,
      avgMessageLatencyMs,
      consecutiveReconnects: this.consecutiveReconnectAttempts,
      connected: this.connected,
      healthScore: totalScore,
      tierStatus: this.tierStatus,
      lastClose: this.lastClose,
      avgLatencyForSparklineMs: avgMessageLatencyMs,
    }

    return snapshot
  }

  private recordSnapshot(nowMs: number): WebSocketHealthSnapshot {
    const snapshot = this.buildSnapshot(nowMs)
    this.healthHistory.push(snapshot)
    if (this.healthHistory.length > HEALTH_HISTORY_MAX_ENTRIES) this.healthHistory.shift()
    return snapshot
  }

  private computeLatencySparklineMs(): number[] {
    // Last 60s sparkline at 5s intervals = 12 points.
    const points = this.healthHistory.slice(-12).map((s) => s.avgLatencyForSparklineMs)
    // Ensure stable length for the UI.
    if (points.length < 12) {
      const filler = Array.from({ length: 12 - points.length }, () => points.length ? points[0] : 1_000)
      return [...filler, ...points]
    }
    return points
  }

  updateStoreWithLatestSnapshot(nowMs: number): void {
    const snapshot = this.recordSnapshot(nowMs)
    const reconnectAttempts = this.consecutiveReconnectAttempts
    const autoReconnectEnabled = this.autoReconnectEnabled

    const summary: WebSocketConnectionHealthSummary = {
      connectionId: this.connectionId,
      url: this.url,
      connected: this.connected,
      healthScore: snapshot.healthScore,
      tierStatus: snapshot.tierStatus,
      uptimeRatioLast60s: snapshot.uptimeRatioLast60s,
      avgMessageLatencyMs: snapshot.avgMessageLatencyMs,
      consecutiveReconnects: snapshot.consecutiveReconnects,
      reconnectAttempts,
      autoReconnectEnabled,
      lastClose: snapshot.lastClose,
      latencySparklineMs: this.computeLatencySparklineMs(),
      lastSnapshotAt: snapshot.timestamp,
    }

    useWebSocketHealthStore.getState().upsertConnectionHealth(summary)
  }

  private scheduleReconnect(delayMs: number): void {
    this.clearReconnectTimer()
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, delayMs)
  }

  connect(): void {
    if (!this.config.enabled) return
    if (!this.autoReconnectEnabled && this.tierStatus.tier === 3) return
    if (this.reconnectTimeout) return
    // Some test WebSocket mocks don't provide static OPEN/CONNECTING constants.
    const OPEN_STATE = typeof WebSocket.OPEN === 'number' ? WebSocket.OPEN : 1
    const CONNECTING_STATE = typeof WebSocket.CONNECTING === 'number' ? WebSocket.CONNECTING : 0

    // If the global WebSocket constructor changed (common in unit tests),
    // treat the existing socket as stale and create a new one.
    if (this.ws && this.wsConstructor && this.wsConstructor !== WebSocket) {
      try {
        this.ws.onopen = null
        this.ws.onmessage = null
        this.ws.onclose = null
        this.ws.onerror = null
        this.ws.close()
      } catch {
        // ignore
      }
      this.ws = null
      this.wsConstructor = null
      this.connected = false
      this.openedAtMs = null
    }

    if (this.ws && (this.ws.readyState === OPEN_STATE || this.ws.readyState === CONNECTING_STATE)) return

    try {
      this.manualCloseNext = false
      this.ws = new WebSocket(this.url)
      this.wsConstructor = WebSocket
      const ws = this.ws

      const handleOpen = () => {
        // In some test environments (and certain WebSocket implementations),
        // the socket can already report OPEN at construction time while the
        // `onopen` event is delivered asynchronously. If so, mark connected
        // immediately so consumers don't depend on a timer tick.
        if (this.connected) return

        const now = Date.now()
        if (this.lastConnectionDurationMs !== null && this.lastConnectionDurationMs >= STABLE_RESET_MS) {
          this.consecutiveReconnectAttempts = 0
          this.tier1ReconnectAttempts = 0
          this.tier2ReconnectAttempts = 0
        }
        this.lastConnectionDurationMs = null

        this.connected = true
        this.openedAtMs = now

        // Once a connection is up again, Tier 3 manual disable no longer applies.
        // If Tier 3 was triggered earlier, `retryConnection()` will explicitly
        // re-enable auto reconnect and call `connect()`.
        if (this.tierStatus.tier !== 3) {
          this.autoReconnectEnabled = true
        }

        this.config.onConnected?.()
        this.config.onOpen?.(ws as WebSocket)
      }

      ws.onopen = handleOpen

      ws.onmessage = (event) => {
        const rawData = typeof event.data === 'string' ? event.data : ''
        const headers: Record<string, string> = {}

        if (rawData.includes('x-last-event-id')) {
          const match = rawData.match(/"x-last-event-id":"([^"]+)"/)
          if (match) headers['x-last-event-id'] = match[1]
        }
        if (rawData.includes('x-catchup-from')) {
          const match = rawData.match(/"x-catchup-from":"([^"]+)"/)
          if (match) headers['x-catchup-from'] = match[1]
        }

        let parsed: unknown = rawData
        if (rawData) {
          try {
            parsed = JSON.parse(rawData)
          } catch {
            // Keep raw string for consumers that want it.
            parsed = rawData
          }
        }

        const sentTs = this.extractSentTimestampMs(parsed)
        if (sentTs !== null) {
          const latencyMs = Math.max(0, Date.now() - sentTs)
          this.pushLatencySample(latencyMs, Date.now())
        }

        this.config.onMessage?.(parsed, headers)
      }

      ws.onerror = () => {
        this.config.onError?.('WebSocket error')
      }

      ws.onclose = (ev: CloseEvent) => {
        const now = Date.now()
        const wasManual = this.manualCloseNext

        if (wasManual) {
          this.ws = null
          this.connected = false
          return
        }

        this.ws = null
        this.connected = false

        // Compute previous open duration (used for 5-minute stable reset).
        if (this.openedAtMs !== null) {
          this.lastConnectionDurationMs = now - this.openedAtMs
        }
        this.openedAtMs = null
        this.clearReconnectTimer()

        const closeCode = typeof ev.code === 'number' ? ev.code : undefined
        const reason = typeof ev.reason === 'string' && ev.reason.length > 0 ? ev.reason : undefined
        const classification = classifyWebSocketCloseCode(closeCode, reason)
        this.tierStatus = buildTierStatusFromClassification(classification.tier, classification.label)

        this.lastClose = {
          closeCode,
          reason,
          tierStatus: this.tierStatus,
        }

        const closeInfo = this.lastClose
        this.config.onDisconnected?.(closeInfo)

        if (classification.tier === 3) {
          // Tier 3: manual intervention required → disable auto reconnect.
          this.autoReconnectEnabled = false
          return
        }

        // Tier 1 / Tier 2 strategy.
        const effectiveTier: 1 | 2 =
          classification.tier === 1 && this.tier1ReconnectAttempts < TIER1_MAX_RECONNECT_ATTEMPTS
            ? 1
            : 2

        if (effectiveTier === 1) {
          this.tier1ReconnectAttempts += 1
          this.consecutiveReconnectAttempts += 1
          // Immediate (<5s) reconnect.
          this.scheduleReconnect(0)
          return
        }

        this.tier2ReconnectAttempts += 1
        this.consecutiveReconnectAttempts += 1
        const delayMs = computeTier2ExponentialBackoffMs(this.tier2ReconnectAttempts)
        this.scheduleReconnect(delayMs)
      }

      // Handle already-open sockets (e.g., test WebSocket mocks) after all
      // handlers are wired to avoid races where consumers send messages
      // immediately after `connected` flips to true.
      if (ws.readyState === OPEN_STATE) {
        handleOpen()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.config.onError?.(`WebSocket connection failed: ${message}`)

      // Treat creation failures as Tier 2 network instability.
      this.tierStatus = { tier: 2, label: 'abnormal' }
      this.lastClose = {
        closeCode: undefined,
        reason: message,
        tierStatus: this.tierStatus,
      }
      this.config.onDisconnected?.(this.lastClose)

      // Apply Tier 2 policy.
      this.tier2ReconnectAttempts += 1
      this.consecutiveReconnectAttempts += 1
      const delayMs = computeTier2ExponentialBackoffMs(this.tier2ReconnectAttempts)
      this.scheduleReconnect(delayMs)
    }
  }

  release(): boolean {
    this.refCount = Math.max(0, this.refCount - 1)
    if (this.refCount > 0) return false

    this.autoReconnectEnabled = false
    this.manualCloseNext = true
    this.clearReconnectTimer()

    if (this.ws) {
      try {
        this.ws.onopen = null
        this.ws.onmessage = null
        this.ws.onclose = null
        this.ws.onerror = null
        this.ws.close()
      } catch {
        // ignore
      }
    }
    this.ws = null
    this.wsConstructor = null
    this.connected = false
    return true
  }
}

class WebSocketHealthManager {
  private connections = new Map<string, InternalConnectionState>()
  private ticker: ReturnType<typeof setInterval> | null = null

  private ensureTickerRunning(): void {
    if (this.ticker) return
    this.ticker = setInterval(() => {
      const now = Date.now()
      for (const conn of this.connections.values()) conn.updateStoreWithLatestSnapshot(now)
    }, HEALTH_SNAPSHOT_INTERVAL_MS)
  }

  private stopTickerIfIdle(): void {
    if (this.connections.size > 0) return
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  acquireConnection(config: WebSocketManagerConnectionConfig): () => void {
    const enabled = config.enabled ?? true
    if (!config.connectionId || !config.url) {
      throw new Error('webSocketManager.acquireConnection: connectionId and url are required')
    }

    // Enforce the “up to 10 simultaneous connections” invariant.
    if (!this.connections.has(config.connectionId) && this.connections.size >= MAX_SIMULTANEOUS_CONNECTIONS) {
      config.onError?.(`Too many WebSocket connections (max ${MAX_SIMULTANEOUS_CONNECTIONS})`)
      return () => undefined
    }

    const existing = this.connections.get(config.connectionId)
    if (existing) {
      existing.refCount += 1
      const { connectionId, url, ...rest } = config
      void connectionId
      void url
      existing.config = {
        ...existing.config,
        ...rest,
        enabled,
      }
      if (rest.extractSentTimestampMs) {
        existing.extractSentTimestampMs = rest.extractSentTimestampMs
      }

      if (enabled) {
        existing.connect()

        // If the connection is already open, notify the new subscriber
        // immediately. Some consumers (and unit tests) don't advance the
        // WebSocket `onopen` timer under fake timers.
        const OPEN_STATE = typeof WebSocket.OPEN === 'number' ? WebSocket.OPEN : 1
        if (existing.connected && existing.ws && existing.ws.readyState === OPEN_STATE) {
          existing.config.onConnected?.()
          existing.config.onOpen?.(existing.ws)
        }
      }
      this.ensureTickerRunning()
      return () => {
        const fullyReleased = existing.release()
        if (!fullyReleased) return
        this.connections.delete(config.connectionId)
        useWebSocketHealthStore.getState().removeConnectionHealth(config.connectionId)
        this.stopTickerIfIdle()
      }
    }

    const { connectionId, url, ...rest } = config
    void connectionId
    void url
    const conn = new InternalConnectionState(config.connectionId, config.url, {
      ...rest,
      enabled,
    })

    conn.refCount = 1
    conn.connect()
    this.connections.set(config.connectionId, conn)
    this.ensureTickerRunning()

    return () => {
      const fullyReleased = conn.release()
      if (!fullyReleased) return
      this.connections.delete(config.connectionId)
      useWebSocketHealthStore.getState().removeConnectionHealth(config.connectionId)
      this.stopTickerIfIdle()
    }
  }

  retryConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId)
    if (!conn) return

    conn.autoReconnectEnabled = true
    conn.tierStatus = { tier: 1, label: 'normal' }
    conn.lastClose = undefined
    conn.consecutiveReconnectAttempts = 0
    conn.tier1ReconnectAttempts = 0
    conn.tier2ReconnectAttempts = 0

    conn.connect()
    this.ensureTickerRunning()
  }
}

export const webSocketManager = new WebSocketHealthManager()

