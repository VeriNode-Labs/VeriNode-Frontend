'use client'

import type { TimeRange } from '@/src/types/networkHealth'

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
]

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

/**
 * Compact pill-style time range selector.
 * Drives all network health dashboard panels via shared state.
 */
export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Time range"
      className="flex gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1"
    >
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          aria-pressed={value === r.value}
          onClick={() => onChange(r.value)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 ${
            value === r.value
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
