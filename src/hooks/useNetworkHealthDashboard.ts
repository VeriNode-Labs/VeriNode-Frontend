'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchLatencyHeatmap,
  fetchNetworkNodes,
  fetchPeerGraph,
  fetchVersionDistribution,
} from '@/src/lib/api/networkHealth'
import { webSocketManager } from '@/src/services/webSocketManager'
import {
  buildDemoGeoNodes,
  buildDemoLatencyHeatmap,
  buildDemoNetworkEvents,
  buildDemoPeerGraph,
  buildDemoVersionDistribution,
} from '@/src/services/networkHealthDemo'
import type {
  NetworkEvent,
  TimeRange,
  WSNetworkEvent,
  WSNetworkEventBatch,
} from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Query hooks – fetch from API, fall back to deterministic demo data on error
// ---------------------------------------------------------------------------

const STALE_TIME = 30_000

/** Fetches geographic node data; falls back to demo data on error. */
export function useNetworkNodes(range: TimeRange) {
  return useQuery({
    queryKey: ['network-nodes', range],
    queryFn: async () => {
      try {
        return await fetchNetworkNodes(range)
      } catch {
        return buildDemoGeoNodes()
      }
    },
    staleTime: STALE_TIME,
    placeholderData: () => buildDemoGeoNodes(),
  })
}

/** Fetches peer graph data; falls back to demo data on error. */
export function useNetworkPeerGraph(range: TimeRange) {
  return useQuery({
    queryKey: ['network-peer-graph', range],
    queryFn: async () => {
      try {
        return await fetchPeerGraph(range)
      } catch {
        return buildDemoPeerGraph()
      }
    },
    staleTime: STALE_TIME,
    placeholderData: () => buildDemoPeerGraph(),
  })
}

/** Fetches version distribution; falls back to demo data on error. */
export function useVersionDistribution(range: TimeRange) {
  return useQuery({
    queryKey: ['network-versions', range],
    queryFn: async () => {
      try {
        return await fetchVersionDistribution(range)
      } catch {
        return buildDemoVersionDistribution()
      }
    },
    staleTime: STALE_TIME,
    placeholderData: () => buildDemoVersionDistribution(),
  })
}

/** Fetches latency heatmap; falls back to demo data on error. */
export function useLatencyHeatmap(range: TimeRange) {
  return useQuery({
    queryKey: ['network-latency', range],
    queryFn: async () => {
      try {
        return await fetchLatencyHeatmap(range)
      } catch {
        return buildDemoLatencyHeatmap()
      }
    },
    staleTime: STALE_TIME,
    placeholderData: () => buildDemoLatencyHeatmap(),
  })
}

// ---------------------------------------------------------------------------
// Real-time event log hook
// ---------------------------------------------------------------------------

const EVENT_LOG_WS_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_WS_NETWORK_EVENTS_URL ?? 'wss://api.verinode.io/ws/network-events')
    : ''

const MAX_EVENTS = 200

/**
 * Manages the real-time network event log.
 * - Seeds with deterministic demo events on mount.
 * - Connects to the WebSocket stream for live updates.
 * - Deduplicates events by id and caps the log at MAX_EVENTS entries.
 */
export function useNetworkEventLog(wsUrl = EVENT_LOG_WS_URL) {
  const [events, setEvents] = useState<NetworkEvent[]>(() => buildDemoNetworkEvents(40))
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appendEvents = useCallback((incoming: NetworkEvent[]) => {
    if (incoming.length === 0) return
    setEvents((prev) => {
      const existingIds = new Set(prev.map((e) => e.id))
      const novel = incoming.filter((e) => !existingIds.has(e.id))
      if (novel.length === 0) return prev
      const combined = [...novel, ...prev]
      return combined.length > MAX_EVENTS ? combined.slice(0, MAX_EVENTS) : combined
    })
  }, [])

  useEffect(() => {
    if (!wsUrl) return

    const release = webSocketManager.acquireConnection({
      connectionId: `network-event-log:${wsUrl}`,
      url: wsUrl,
      enabled: true,
      onConnected: () => {
        setIsConnected(true)
        setError(null)
      },
      onDisconnected: () => setIsConnected(false),
      onError: (errMsg) => setError(errMsg),
      onMessage: (data) => {
        try {
          const raw = data as WSNetworkEvent | WSNetworkEventBatch
          if (raw.type === 'network-event') {
            appendEvents([raw.data])
          } else if (raw.type === 'network-event-batch') {
            appendEvents(raw.data)
          }
        } catch {
          // Ignore malformed frames; a single bad message shouldn't kill the feed.
        }
      },
    })

    return () => release()
  }, [wsUrl, appendEvents])

  return { events, isConnected, error }
}

// ---------------------------------------------------------------------------
// Periodic demo event injector
// ---------------------------------------------------------------------------

/**
 * Injects synthetic events every 5 s when not connected to a live WebSocket.
 * Follows the pattern used in useFleetData / useNodeStatusStream for demo mode.
 */
export function useDemoEventInjector(
  setEvents: Dispatch<SetStateAction<NetworkEvent[]>>,
  enabled: boolean,
) {
  const counterRef = useRef(100)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      const all = buildDemoNetworkEvents(1)
      const template = all[0]
      if (!template) return
      const event: NetworkEvent = {
        ...template,
        id: `live-evt-${counterRef.current++}`,
        timestamp: Date.now(),
      }
      setEvents((prev) => {
        const combined = [event, ...prev]
        return combined.length > MAX_EVENTS ? combined.slice(0, MAX_EVENTS) : combined
      })
    }, 5_000)
    return () => clearInterval(id)
  }, [enabled, setEvents])
}
