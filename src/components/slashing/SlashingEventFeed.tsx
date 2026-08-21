'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SlashingEvent } from '@/src/types/slashing'
import { useSlashingStream } from '@/src/hooks/useSlashingStream'
import { SlashingIndex } from '@/src/utils/search/slashingIndex'

interface SlashingEventFeedProps {
  /** WebSocket URL for slashing event stream */
  wsUrl: string
  /** Maximum events to display */
  maxDisplay?: number
  /** Enable the feed */
  enabled?: boolean
  /** Callback when feed updates */
  onUpdate?: (events: SlashingEvent[]) => void
}

/**
 * Real-time slashing event feed component with deduplication layer.
 *
 * Features:
 * - Displays slashing events in chronological order
 * - Implements invisible dedup layer using useRef<Set<string>> for displayed event IDs
 * - Filters out any event whose ID is already displayed
 * - Uses event.id as React key for reconciliation
 * - Reset on full page navigation only
 *
 * This provides a triple-layer dedup:
 * 1. useSlashingStream hook: Map<eventId, timestamp> with TTL
 * 2. Component-level: useRef<Set<string>> for displayed IDs
 * 3. React key reconciliation: event.id as key prop
 */
export function SlashingEventFeed({
  wsUrl,
  maxDisplay = 50,
  enabled = true,
  onUpdate,
}: SlashingEventFeedProps) {
  const [displayedEvents, setDisplayedEvents] = useState<SlashingEvent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [indexVersion, setIndexVersion] = useState(0)
  const [searchIndex] = useState(() => new SlashingIndex())
  const { events, connected, error } = useSlashingStream({
    url: wsUrl,
    enabled,
  })

  // Track displayed event IDs to prevent duplicates at component level
  const displayedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = searchIndex.subscribe(() => setIndexVersion((version) => version + 1))
    return () => {
      unsubscribe()
      searchIndex.dispose()
    }
  }, [searchIndex])

  // Update displayed events with dedup filter
  useEffect(() => {
    setDisplayedEvents((prevDisplayed) => {
      // Create a new set to track all IDs (existing + new)
      const allIds = new Set(displayedIdsRef.current)

      // Filter new events: only include those not already displayed
      const newUniqueEvents = events.filter((event) => {
        if (allIds.has(event.id)) {
          return false
        }
        allIds.add(event.id)
        return true
      })

      // If no new unique events, keep displayed as is
      if (newUniqueEvents.length === 0) {
        return prevDisplayed
      }

      // Combine and sort by timestamp (newest first)
      const combined = [...newUniqueEvents, ...prevDisplayed]
      const sorted = combined.sort((a, b) => b.timestamp - a.timestamp)

      // Trim to max display
      const trimmed = sorted.slice(0, maxDisplay)

      // Update the displayed IDs set
      displayedIdsRef.current = new Set(trimmed.map((e) => e.id))

      onUpdate?.(trimmed)
      return trimmed
    })
  }, [events, maxDisplay, onUpdate])

  useEffect(() => {
    searchIndex.enqueue(events)
  }, [events, searchIndex])

  const visibleEvents = useMemo(() => {
    void indexVersion
    if (!searchQuery.trim()) return displayedEvents
    return searchIndex.search(searchQuery).map(({ event }) => event)
  }, [displayedEvents, indexVersion, searchQuery, searchIndex])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Slashing Events</h2>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
          <span className="text-sm text-gray-600">{connected ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Events list */}
      <div className="space-y-2">
        <label className="block">
          <span className="sr-only">Search slashing events</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search node ID or reason"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        {visibleEvents.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
            No slashing events
          </div>
        ) : (
          <div className="space-y-1">
            {visibleEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3 text-sm hover:bg-gray-50"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">ID: {event.id.slice(0, 8)}</span>
                    <span className="font-mono text-xs text-gray-500">Node: {event.nodeId}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>Amount: {event.amount} ETH</span>
                    <span>Slot: {event.slot}</span>
                    <span>Epoch: {event.epoch}</span>
                    {event.reason && <span className="text-gray-700">Reason: {event.reason}</span>}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
        Displayed: {displayedEvents.length} | Total received (with dedup): {displayedEvents.length}
      </div>
    </div>
  )
}
