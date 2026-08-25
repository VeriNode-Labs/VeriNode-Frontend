'use client'

import { USAGE_TIME_RANGES, type UsageTimeRange } from '@/src/types/usage'

const LABELS: Record<UsageTimeRange, string> = {
  '1d': '24h',
  '7d': '7d',
  '30d': '30d',
}

interface TimeRangeSelectorProps {
  value: UsageTimeRange
  onChange: (range: UsageTimeRange) => void
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {USAGE_TIME_RANGES.map((range) => {
        const isActive = range === value
        return (
          <button
            key={range}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(range)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            }`}
          >
            {LABELS[range]}
          </button>
        )
      })}
    </div>
  )
}