'use client'

import { useMemo, useState } from 'react'
import type { LatencyHeatmapData } from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Colour interpolation
// ---------------------------------------------------------------------------

/** Interpolate between green → yellow → red for latency values. */
function latencyColor(value: number, min: number, max: number): string {
  if (max === min) return 'rgba(34,197,94,0.6)'
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  // green (#22c55e) → yellow (#facc15) → red (#f87171)
  let r: number, g: number, b: number
  if (t < 0.5) {
    const tt = t * 2
    r = Math.round(34 + (250 - 34) * tt)
    g = Math.round(197 + (204 - 197) * tt)
    b = Math.round(94 + (21 - 94) * tt)
  } else {
    const tt = (t - 0.5) * 2
    r = Math.round(250 + (248 - 250) * tt)
    g = Math.round(204 + (113 - 204) * tt)
    b = Math.round(21 + (113 - 21) * tt)
  }
  return `rgba(${r},${g},${b},0.75)`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type LatencyMetric = 'p50' | 'p95'

interface CellTooltip {
  sourceRegion: string
  targetRegion: string
  p50Ms: number
  p95Ms: number
}

interface LatencyHeatmapProps {
  data: LatencyHeatmapData
}

/**
 * Region-pair latency heatmap.
 * Rows = source regions, columns = target regions.
 * Cell colour intensity encodes p50 or p95 latency.
 * Hover a cell to see both metrics.
 */
export function LatencyHeatmap({ data }: LatencyHeatmapProps) {
  const [metric, setMetric] = useState<LatencyMetric>('p50')
  const [tooltip, setTooltip] = useState<CellTooltip | null>(null)

  const cellMap = useMemo(() => {
    const m = new Map<string, { p50Ms: number; p95Ms: number }>()
    for (const cell of data.cells) {
      m.set(`${cell.sourceRegion}|${cell.targetRegion}`, {
        p50Ms: cell.p50Ms,
        p95Ms: cell.p95Ms,
      })
    }
    return m
  }, [data.cells])

  const { minVal, maxVal } = useMemo(() => {
    const vals = data.cells.map((c) => (metric === 'p50' ? c.p50Ms : c.p95Ms))
    return {
      minVal: Math.min(...vals),
      maxVal: Math.max(...vals),
    }
  }, [data.cells, metric])

  const { regions } = data

  if (regions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-slate-950/60 text-sm text-slate-400">
        No latency data available.
      </div>
    )
  }

  // Short label for display
  function shortLabel(r: string) {
    return r.replace(/^(us|eu|ap)-/, (m) => m.toUpperCase())
  }

  return (
    <div className="space-y-3">
      {/* Metric toggle */}
      <div className="flex gap-2">
        {(['p50', 'p95'] as LatencyMetric[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={metric === m}
            onClick={() => setMetric(m)}
            className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/40 ${
              metric === m
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">
          {minVal}ms – {maxVal}ms
        </span>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <table
          className="border-collapse text-xs"
          aria-label={`Latency heatmap (${metric})`}
        >
          <thead>
            <tr>
              {/* Top-left corner */}
              <th className="p-2 text-slate-500 font-normal text-right text-[10px]">
                src ↓ / tgt →
              </th>
              {regions.map((tgt) => (
                <th
                  key={tgt}
                  className="p-2 text-center font-semibold text-slate-300 whitespace-nowrap"
                  scope="col"
                >
                  {shortLabel(tgt)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regions.map((src) => (
              <tr key={src}>
                <th
                  className="p-2 text-right font-semibold text-slate-300 whitespace-nowrap"
                  scope="row"
                >
                  {shortLabel(src)}
                </th>
                {regions.map((tgt) => {
                  if (src === tgt) {
                    return (
                      <td key={tgt} className="p-1" aria-label="same region">
                        <div className="flex h-8 w-16 items-center justify-center rounded text-slate-600 text-[10px]">
                          —
                        </div>
                      </td>
                    )
                  }
                  const cell = cellMap.get(`${src}|${tgt}`)
                  const val = cell ? (metric === 'p50' ? cell.p50Ms : cell.p95Ms) : 0
                  const bg = cell ? latencyColor(val, minVal, maxVal) : 'rgba(255,255,255,0.04)'

                  return (
                    <td
                      key={tgt}
                      className="p-1"
                      aria-label={`${src} → ${tgt}: ${val}ms`}
                      onMouseEnter={() =>
                        cell &&
                        setTooltip({
                          sourceRegion: src,
                          targetRegion: tgt,
                          p50Ms: cell.p50Ms,
                          p95Ms: cell.p95Ms,
                        })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        className="flex h-8 w-16 cursor-default items-center justify-center rounded text-[11px] font-semibold text-white transition-opacity"
                        style={{ backgroundColor: bg }}
                      >
                        {val}ms
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/90 px-4 py-2 text-xs text-slate-100">
          <span className="font-semibold">
            {shortLabel(tooltip.sourceRegion)} → {shortLabel(tooltip.targetRegion)}
          </span>
          <span className="text-slate-400">
            p50: <span className="text-sky-300 font-semibold">{tooltip.p50Ms}ms</span>
          </span>
          <span className="text-slate-400">
            p95: <span className="text-amber-300 font-semibold">{tooltip.p95Ms}ms</span>
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Low</span>
        <div
          className="h-2 w-32 rounded"
          style={{
            background: 'linear-gradient(to right, rgba(34,197,94,0.75), rgba(250,204,21,0.75), rgba(248,113,113,0.75))',
          }}
        />
        <span>High</span>
      </div>
    </div>
  )
}
