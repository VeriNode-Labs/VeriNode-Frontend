'use client'

// Virtualized supply-chain tier tree (#43).
//
// Replaces a naive .map() with a windowed renderer:
//   - Visible window: 20 nodes; overscan: 10 above/below.
//   - Only visible+overscan rows are in the DOM at any time.
//   - Expand/collapse managed via a Set<string> in local state.
//   - Dynamic row heights fed back to the virtualizer via measureElement.
//
// This component is the entry point for the supply-chain hierarchy. Pass the
// root-level SupplyChainTier[] array; it handles all flattening internally so
// callers never deal with the flat list directly.

import { useCallback, useMemo, useRef, useState } from 'react'
import type { SupplyChainTier } from '@/src/types/supplychain'
import { flattenTree } from '@/src/utils/treeFlattener'
import { useVirtualizer } from '@/src/hooks/useVirtualizer'
import { TierRow } from './TierRow'

/** Default estimated height per row in pixels. Variable content can override this. */
const ESTIMATED_ROW_HEIGHT = 52

/** Viewport window: 20 visible nodes + 10 overscan above/below = 40 max DOM nodes. */
const OVERSCAN = 10
const SCROLL_CONTAINER_HEIGHT = 600 // px, configurable via prop

interface TierTreeViewProps {
  /** Root-level supply chain tiers. May be deeply nested. */
  nodes: SupplyChainTier[]
  /**
   * Fixed height for the scrollable container in pixels.
   * @default 600
   */
  containerHeight?: number
  /** Optional CSS class to add to the outer wrapper. */
  className?: string
}

export function TierTreeView({
  nodes,
  containerHeight = SCROLL_CONTAINER_HEIGHT,
  className = '',
}: TierTreeViewProps) {
  // Expand/collapse state: IDs in this set have their children visible.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Flatten the tree on every expand/collapse change. useMemo ensures this
  // only re-runs when the inputs change, not on scroll.
  const flatItems = useMemo(
    () => flattenTree(nodes, expandedIds),
    [nodes, expandedIds],
  )

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const { getVirtualItems, getTotalSize, measureElement, attachIndex } = useVirtualizer({
    count: flatItems.length,
    getScrollElement: useCallback(() => scrollContainerRef.current, []),
    estimateSize: useCallback(
      (index: number) => {
        const item = flatItems[index]
        if (!item) return ESTIMATED_ROW_HEIGHT
        // Items with metadata shown in the expanded panel are taller.
        const hasMeta = item.metadata && Object.keys(item.metadata).length > 0
        const metaBonus = hasMeta && expandedIds.has(item.id) ? 36 : 0
        return ESTIMATED_ROW_HEIGHT + metaBonus
      },
      [flatItems, expandedIds],
    ),
    overscan: OVERSCAN,
  })

  const virtualItems = getVirtualItems()
  const totalHeight = getTotalSize()

  const measureRef = useCallback(
    (el: Element | null, index: number) => {
      attachIndex?.(el, index)
      measureElement(el)
    },
    [attachIndex, measureElement],
  )

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Supply Chain Hierarchy</h2>
          <p className="text-sm text-slate-400">
            {flatItems.length.toLocaleString()} visible nodes ·{' '}
            {expandedIds.size} expanded
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20"
            onClick={() => setExpandedIds(new Set())}
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Scrollable virtualized list */}
      <div
        ref={scrollContainerRef}
        style={{ height: containerHeight, overflowY: 'auto' }}
        className="rounded-2xl border border-white/10 bg-slate-950/60"
        role="tree"
        aria-label="Supply chain tier hierarchy"
      >
        {/* Inner container holds the full virtual height so the scrollbar is accurate */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {virtualItems.map((vItem) => {
            const flatItem = flatItems[vItem.index]
            if (!flatItem) return null
            return (
              <TierRow
                key={vItem.key}
                item={flatItem}
                isExpanded={expandedIds.has(flatItem.id)}
                onToggle={toggleExpand}
                measureRef={measureRef}
                virtualIndex={vItem.index}
                offsetTop={vItem.start}
              />
            )
          })}
        </div>

        {flatItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No supply chain tiers to display.
          </div>
        ) : null}
      </div>
    </div>
  )
}
