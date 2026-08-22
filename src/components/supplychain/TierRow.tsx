'use client'

// Individual tier row for the virtualized supply-chain tree (#43).
//
// Supports:
//   - Variable content (metadata key/value pairs) for dynamic row heights.
//   - Expand/collapse via the `onToggle` callback.
//   - Animated height transition via CSS grid-template-rows.
//   - measureElement ref so the virtualizer can record real pixel heights.

import { useCallback, useEffect, useRef } from 'react'
import type { FlatTier, TierStatus } from '@/src/types/supplychain'

const STATUS_DOT: Record<TierStatus, string> = {
  active: 'bg-emerald-400',
  pending: 'bg-amber-400',
  suspended: 'bg-red-400',
  inactive: 'bg-slate-500',
}

const STATUS_LABEL: Record<TierStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  inactive: 'Inactive',
}

const TIER_COLORS: string[] = [
  'border-l-indigo-500',
  'border-l-violet-500',
  'border-l-sky-500',
  'border-l-cyan-500',
  'border-l-teal-500',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-orange-500',
]

interface TierRowProps {
  item: FlatTier
  isExpanded: boolean
  onToggle: (id: string) => void
  /** Virtualizer-provided ref so the row height is measured after paint. */
  measureRef: (el: Element | null, index: number) => void
  /** Index in the flat list — needed by the virtualizer to correlate measurements. */
  virtualIndex: number
  /** Absolute top offset from the virtualizer position cache. */
  offsetTop: number
}

export function TierRow({
  item,
  isExpanded,
  onToggle,
  measureRef,
  virtualIndex,
  offsetTop,
}: TierRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null)

  // Merge our local ref with the virtualizer measurement callback.
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      rowRef.current = el
      measureRef(el, virtualIndex)
    },
    [measureRef, virtualIndex],
  )

  // Re-measure whenever content changes (e.g. expand/collapse reveals metadata).
  useEffect(() => {
    if (rowRef.current) {
      measureRef(rowRef.current, virtualIndex)
    }
  }, [isExpanded, measureRef, virtualIndex])

  const indentPx = item.depth * 20
  const borderColor = TIER_COLORS[item.depth % TIER_COLORS.length]
  const hasMetadata = item.metadata && Object.keys(item.metadata).length > 0

  return (
    <div
      ref={setRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${offsetTop}px)`,
        willChange: 'transform',
      }}
      role="treeitem"
      aria-expanded={item.hasChildren ? isExpanded : undefined}
      aria-level={item.depth + 1}
      aria-selected={false}
    >
      <div
        className={`ml-0 border-l-4 ${borderColor} rounded-r-xl border border-white/10 bg-slate-900/80 transition-colors hover:border-white/20`}
        style={{ marginLeft: indentPx }}
      >
        {/* Row header — always visible */}
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          onClick={() => item.hasChildren && onToggle(item.id)}
          disabled={!item.hasChildren}
          aria-label={
            item.hasChildren
              ? `${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`
              : item.label
          }
        >
          {/* Expand/collapse chevron */}
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 transition-transform duration-200"
            style={{
              transform: item.hasChildren && isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              opacity: item.hasChildren ? 1 : 0,
            }}
            aria-hidden="true"
          >
            ▶
          </span>

          {/* Status dot */}
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[item.status]}`} aria-hidden="true" />

          {/* Label */}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
            {item.label}
          </span>

          {/* Tier badge */}
          <span className="shrink-0 rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-400">
            Tier {item.tier}
          </span>

          {/* Status label */}
          <span className="shrink-0 text-xs text-slate-400">
            {STATUS_LABEL[item.status]}
          </span>

          {/* Child count */}
          {item.hasChildren ? (
            <span className="shrink-0 text-xs text-slate-500">
              {item.childCount} {item.childCount === 1 ? 'child' : 'children'}
            </span>
          ) : null}
        </button>

        {/* Animated metadata panel — collapses/expands with CSS grid trick */}
        {hasMetadata ? (
          <div
            className="overflow-hidden transition-[grid-template-rows] duration-200"
            style={{
              display: 'grid',
              gridTemplateRows: isExpanded ? '1fr' : '0fr',
              transition: 'grid-template-rows 200ms ease',
            }}
          >
            <div className="min-h-0">
              <div className="flex flex-wrap gap-2 px-12 pb-3">
                {Object.entries(item.metadata!).map(([key, val]) => (
                  <span
                    key={key}
                    className="rounded-lg border border-white/10 bg-slate-800/60 px-2 py-1 text-xs text-slate-300"
                  >
                    <span className="text-slate-500">{key}: </span>
                    {String(val)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
