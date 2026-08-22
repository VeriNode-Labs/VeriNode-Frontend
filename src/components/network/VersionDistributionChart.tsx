'use client'

import { useMemo, useState } from 'react'
import type { VersionDistributionResponse, VersionEntry } from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Colours – distinct enough to distinguish 5+ slices
// ---------------------------------------------------------------------------

const SLICE_COLORS = [
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fb923c', // orange
  '#f472b6', // pink
  '#facc15', // yellow
  '#60a5fa', // blue
  '#4ade80', // green
]

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const CX = 110
const CY = 110
const R_OUTER = 90
const R_INNER = 52 // donut hole

interface SliceInfo {
  entry: VersionEntry
  startAngle: number
  endAngle: number
  color: string
  midAngle: number
}

function buildSlices(versions: VersionEntry[]): SliceInfo[] {
  const total = versions.reduce((s, v) => s + v.count, 0)
  if (total === 0) return []

  let angle = -Math.PI / 2 // start at top
  return versions.map((entry, i) => {
    const sweep = (entry.count / total) * Math.PI * 2
    const start = angle
    angle += sweep
    return {
      entry,
      startAngle: start,
      endAngle: angle,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      midAngle: start + sweep / 2,
    }
  })
}

function describeArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const cos1 = Math.cos(startAngle)
  const sin1 = Math.sin(startAngle)
  const cos2 = Math.cos(endAngle)
  const sin2 = Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

  const ox1 = cx + rOuter * cos1
  const oy1 = cy + rOuter * sin1
  const ox2 = cx + rOuter * cos2
  const oy2 = cy + rOuter * sin2
  const ix1 = cx + rInner * cos2
  const iy1 = cy + rInner * sin2
  const ix2 = cx + rInner * cos1
  const iy2 = cy + rInner * sin1

  return [
    `M ${ox1} ${oy1}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VersionDistributionChartProps {
  data: VersionDistributionResponse
}

/**
 * SVG donut pie chart of client software version distribution across the network.
 * Hover a slice for details. Hand-rolled SVG — consistent with RewardsChart pattern.
 */
export function VersionDistributionChart({ data }: VersionDistributionChartProps) {
  const [hoveredVersion, setHoveredVersion] = useState<string | null>(null)

  const slices = useMemo(() => buildSlices(data.versions), [data.versions])

  if (slices.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-slate-950/60 text-sm text-slate-400">
        No version data available.
      </div>
    )
  }

  const hoveredSlice = slices.find((s) => s.entry.version === hoveredVersion) ?? null

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Donut chart */}
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 220 220"
          width={220}
          height={220}
          role="img"
          aria-label="Version distribution donut chart"
        >
          {slices.map((slice) => {
            const isHovered = slice.entry.version === hoveredVersion
            const scale = isHovered ? 1.05 : 1
            const d = describeArc(CX, CY, R_OUTER, R_INNER, slice.startAngle, slice.endAngle)
            return (
              <path
                key={slice.entry.version}
                d={d}
                fill={slice.color}
                opacity={hoveredVersion && !isHovered ? 0.45 : 1}
                style={{ transform: isHovered ? `scale(${scale})` : undefined, transformOrigin: `${CX}px ${CY}px`, transition: 'opacity 0.15s, transform 0.15s' }}
                onMouseEnter={() => setHoveredVersion(slice.entry.version)}
                onMouseLeave={() => setHoveredVersion(null)}
                aria-label={`${slice.entry.version}: ${slice.entry.percent}%`}
                role="img"
              />
            )
          })}

          {/* Centre label */}
          <text
            x={CX}
            y={CY - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="rgba(148,163,184,0.8)"
          >
            {hoveredSlice ? hoveredSlice.entry.version : 'Total'}
          </text>
          <text
            x={CX}
            y={CY + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={18}
            fontWeight="bold"
            fill="#f8fafc"
          >
            {hoveredSlice
              ? `${hoveredSlice.entry.percent}%`
              : data.totalNodes.toLocaleString()}
          </text>
          <text
            x={CX}
            y={CY + 28}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="rgba(148,163,184,0.6)"
          >
            {hoveredSlice ? `${hoveredSlice.entry.count} nodes` : 'nodes'}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {slices.map((slice) => (
          <div
            key={slice.entry.version}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-default ${
              hoveredVersion === slice.entry.version
                ? 'bg-slate-800/80'
                : 'hover:bg-slate-800/40'
            }`}
            onMouseEnter={() => setHoveredVersion(slice.entry.version)}
            onMouseLeave={() => setHoveredVersion(null)}
          >
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />
            <span className="font-mono text-xs font-semibold text-slate-100">
              {slice.entry.version}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${slice.entry.percent}%`, backgroundColor: slice.color }}
                />
              </div>
              <span className="w-12 text-right text-xs text-slate-400">
                {slice.entry.percent}%
              </span>
              <span className="w-16 text-right text-xs text-slate-500">
                {slice.entry.count.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
