'use client'

import { useMemo } from 'react'
import type { LatencyBucket } from '@/src/types/usage'

interface LatencyHeatmapProps {
  buckets: LatencyBucket[]
}

/** Maps a 0-1 intensity to a Tailwind zinc/amber scale — darker = slower. */
function intensityColor(intensity: number): string {
  if (intensity < 0.2) return 'bg-emerald-200 dark:bg-emerald-900/60'
  if (intensity < 0.4) return 'bg-emerald-300 dark:bg-emerald-800/70'
  if (intensity < 0.6) return 'bg-amber-300 dark:bg-amber-700/70'
  if (intensity < 0.8) return 'bg-orange-400 dark:bg-orange-700/80'
  return 'bg-red-500 dark:bg-red-700'
}

export function LatencyHeatmap({ buckets }: LatencyHeatmapProps) {
  const maxP95 = useMemo(() => Math.max(1, ...buckets.map((b) => b.p95Ms)), [buckets])

  if (buckets.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
        No latency data in this range yet
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-0.5">
        {buckets.map((bucket) => {
          const intensity = bucket.p95Ms / maxP95
          return (
            <div
              key={bucket.timestamp}
              title={`p50 ${bucket.p50Ms}ms · p95 ${bucket.p95Ms}ms`}
              className={`h-8 flex-1 rounded-sm ${intensityColor(intensity)}`}
            />
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>{new Date(buckets[0].timestamp).toLocaleString()}</span>
        <span>{new Date(buckets[buckets.length - 1].timestamp).toLocaleString()}</span>
      </div>
    </div>
  )
}