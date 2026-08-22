'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SlashingEvent, UseSlashingStreamOptions, UseSlashingStreamResult } from '@/src/types/slashing'
import { useWebSocketReconnect } from './useWebSocketReconnect'

const DEFAULT_DEDUP_WINDOW_MS = 300000 // 5 minutes
const MAX_EVENTS = 1000 // Maximum events to keep in memory

interface ReceivedEventEntry {
  timestampMs: number
  perfTimestampMs: number
}

function isSlashingEvent(value: unknown): value is SlashingEvent {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.nodeId === 'string' &&
    typeof obj.timestamp === 'number' &&
    typeof obj.amount === 'number' &&
    typeof obj.slot === 'number' &&
    typeof obj.epoch === 'number' &&
    typeof obj.seq === 'number'
  )
}

/**
 * Hook to stream slashing events from WebSocket with built-in deduplication.
 *
 * Maintains a Map<eventId, timestamp> of recently received event IDs with TTL.
 * Before adding an event to the feed:
 * 1. Check if eventId ∈ receivedIds
 * 2. If yes, skip (duplicate detected)
 * 3. If no, add to feed and add eventId to receivedIds with timestamp
 * 4. Periodically clean up expired entries (TTL = dedupWindowMs)
 *
 * This ensures the invariant: ∀ event_id: count(feed_events[event_id]) <= 1
 */
export function useSlashingStream({
  url,
  enabled = true,
  dedupWindowMs = DEFAULT_DEDUP_WINDOW_MS,
  onEvents,
}: UseSlashingStreamOptions): UseSlashingStreamResult {
  const [events, setEvents] = useState<SlashingEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastEventId, setLastEventId] = useState<string | null>(null)

  const receivedIdsRef = useRef<Map<string, ReceivedEventEntry>>(new Map())

  // Check if event ID has already been received
  const isDuplicate = useCallback(
    (eventId: string): boolean => {
      const entry = receivedIdsRef.current.get(eventId)
      if (!entry) return false

      const nowMs = Date.now()
      const nowPerfMs = typeof performance !== 'undefined' ? performance.now() : nowMs

      const expired =
        nowMs - entry.timestampMs > dedupWindowMs ||
        nowPerfMs - entry.perfTimestampMs > dedupWindowMs

      if (expired) {
        receivedIdsRef.current.delete(eventId)
        return false
      }

      return true
    },
    [dedupWindowMs],
  )

  // Add event ID to received set
  const markAsReceived = useCallback(
    (eventId: string) => {
      const tsMs = Date.now()
      const perfTsMs = typeof performance !== 'undefined' ? performance.now() : tsMs
      receivedIdsRef.current.set(eventId, { timestampMs: tsMs, perfTimestampMs: perfTsMs })
    },
    [],
  )

  // Cleanup cache on unmount to avoid cross-test interference.
  useEffect(() => {
    const receivedIds = receivedIdsRef.current
    return () => {
      receivedIds.clear()
    }
  }, [])

  // Handle incoming slashing events
  const handleMessage = useCallback(
    (data: unknown) => {
      try {
        if (!isSlashingEvent(data)) {
          console.warn('Invalid slashing event format', data)
          return
        }

        // Check for duplicate using received event ID set
        if (isDuplicate(data.id)) {
          return
        }

        // Mark as received and add to feed
        markAsReceived(data.id)
        setLastEventId(data.id)

        setEvents((prevEvents) => {
          const newEvents = [data, ...prevEvents]

          // Trim to max events
          if (newEvents.length > MAX_EVENTS) {
            return newEvents.slice(0, MAX_EVENTS)
          }

          return newEvents
        })
      } catch (err) {
        const errMsg = `Failed to process slashing event: ${err}`
        console.error(errMsg)
        setError(errMsg)
      }
    },
    [isDuplicate, markAsReceived]
  )

  // WebSocket reconnect hook with catch-up support
  const { connected } = useWebSocketReconnect({
    url,
    enabled,
    connectionId: `slashing:${url}`,
    onMessage: (data) => {
      handleMessage(data)
    },
    onError: (err) => {
      setError(err)
    },
  })

  // Notify on events update
  useEffect(() => {
    onEvents?.(events)
  }, [events, onEvents])

  return {
    events,
    connected,
    error,
    lastEventId,
  }
}
