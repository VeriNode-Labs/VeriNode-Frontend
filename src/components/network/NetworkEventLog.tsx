'use client'

import { useEffect, useRef, useState } from 'react'
import type { NetworkEvent, NetworkEventType } from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVENT_TYPE_STYLES: Record<NetworkEventType, { badge: string; icon: string }> = {
  node_join: { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: '⬆' },
  node_leave: { badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: '⬇' },
  version_upgrade: { badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30', icon: '↑' },
  fork_detected: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: '⚡' },
  alert: { badge: 'bg-red-500/15 text-red-300 border-red-500/30', icon: '⚠' },
}

const EVENT_TYPE_LABELS: Record<NetworkEventType, string> = {
  node_join: 'Join',
  node_leave: 'Leave',
  version_upgrade: 'Upgrade',
  fork_detected: 'Fork',
  alert: 'Alert',
}

const ALL_TYPES: NetworkEventType[] = [
  'node_join',
  'node_leave',
  'version_upgrade',
  'fork_detected',
  'alert',
]

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Infinite-scroll page size
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NetworkEventLogProps {
  events: NetworkEvent[]
  isConnected: boolean
  error: string | null
}

/**
 * Real-time network event log with:
 * - Live connection status indicator
 * - Per-type filtering
 * - Infinite scroll (loads PAGE_SIZE events at a time)
 * - Auto-scroll pause on manual scroll
 */
export function NetworkEventLog({ events, isConnected, error }: NetworkEventLogProps) {
  const [activeFilter, setActiveFilter] = useState<NetworkEventType | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [autoScroll, setAutoScroll] = useState(true)
  const listRef = useRef<HTMLDivElement | null>(null)
  const prevLengthRef = useRef(events.length)

  // Filter
  const filtered = activeFilter ? events.filter((e) => e.type === activeFilter) : events
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // Auto-scroll to top (newest) on new events
  useEffect(() => {
    if (!autoScroll) return
    if (events.length === prevLengthRef.current) return
    prevLengthRef.current = events.length
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [events.length, autoScroll])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    // Pause auto-scroll when user scrolls away from top
    setAutoScroll(el.scrollTop < 80)
    // Load more when approaching bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
    }
  }



  return (
    <div className="space-y-3">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Connection status */}
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${isConnected ? 'text-emerald-300' : 'text-slate-400'}`}>
          <span
            className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
          />
          {isConnected ? 'Live' : 'Demo'}
        </span>

        {/* Type filters */}
        <div role="group" aria-label="Filter events by type" className="flex flex-wrap gap-1">
          <button
            type="button"
            aria-pressed={activeFilter === null}
            onClick={() => { setActiveFilter(null); setVisibleCount(PAGE_SIZE); }}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 ${
              activeFilter === null
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                : 'border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={activeFilter === t}
              onClick={() => { setActiveFilter((prev) => (prev === t ? null : t)); setVisibleCount(PAGE_SIZE); }}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 ${
                activeFilter === t
                  ? `${EVENT_TYPE_STYLES[t].badge} border-current`
                  : 'border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {EVENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-500">{filtered.length} events</span>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Event list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 divide-y divide-white/5"
        aria-label="Network event log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {visible.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-slate-400">
            No events to display.
          </div>
        ) : (
          visible.map((event) => <EventRow key={event.id} event={event} />)
        )}

        {hasMore && (
          <div className="flex items-center justify-center py-3">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))}
              className="text-xs text-slate-400 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/40 rounded px-2 py-1"
            >
              Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more…
            </button>
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          type="button"
          onClick={() => {
            setAutoScroll(true)
            listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="w-full rounded-lg border border-sky-500/20 bg-sky-500/10 py-1.5 text-xs text-sky-300 hover:bg-sky-500/20 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
        >
          ↑ Scroll to newest
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single event row
// ---------------------------------------------------------------------------

function EventRow({ event }: { event: NetworkEvent }) {
  const styles = EVENT_TYPE_STYLES[event.type]
  return (
    <div className="flex items-start gap-3 px-3 py-2 text-xs hover:bg-white/5 transition-colors">
      {/* Type badge */}
      <span
        className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
      >
        {styles.icon} {EVENT_TYPE_LABELS[event.type]}
      </span>

      {/* Message */}
      <span className="flex-1 text-slate-200 leading-relaxed">{event.message}</span>

      {/* Timestamp */}
      <time
        dateTime={new Date(event.timestamp).toISOString()}
        className="shrink-0 tabular-nums text-slate-500"
      >
        {formatTimestamp(event.timestamp)}
      </time>
    </div>
  )
}
