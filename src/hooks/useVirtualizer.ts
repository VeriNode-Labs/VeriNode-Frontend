'use client'

// Lightweight virtualizer hook for the supply-chain tree (#43).
//
// Implements the same conceptual API as @tanstack/react-virtual without an
// external dependency:
//   - Fixed-height fast path (estimateSize)
//   - Dynamic measured heights via measureElement callback
//   - Configurable overscan (default: 10 nodes above/below the visible window)
//   - Position cache stored in a Map<index, { start, size }> to stay under the
//     50 MB memory budget.

import { useCallback, useEffect, useRef, useState } from 'react'

export interface VirtualItem {
  index: number
  start: number
  size: number
  /** Stable key for React reconciliation. */
  key: number
}

export interface UseVirtualizerOptions {
  /** Total number of items in the list. */
  count: number
  /**
   * The scrollable container element. Pass a ref.current or a getter function.
   */
  getScrollElement: () => HTMLElement | null
  /**
   * Default/estimated item height in pixels. Used for items not yet measured.
   * The virtualizer will substitute real measurements as rows are rendered.
   */
  estimateSize: (index: number) => number
  /**
   * How many extra items to render above and below the visible window.
   * Issue spec: 10 nodes above/below.
   */
  overscan?: number
}

export interface VirtualizerResult {
  /** Items that should be rendered right now. */
  getVirtualItems: () => VirtualItem[]
  /** Total scroll height for the outer container. */
  getTotalSize: () => number
  /**
   * Attach to each rendered row's DOM element so its real height feeds back
   * into the position cache.
   */
  measureElement: (el: Element | null, index?: number) => void
  attachIndex?: (el: Element | null, index: number) => void
}

export function useVirtualizer(options: UseVirtualizerOptions): VirtualizerResult {
  const { count, getScrollElement, estimateSize, overscan = 10 } = options

  // Position cache: index → { start, size }
  const posCache = useRef<Map<number, { start: number; size: number }>>(new Map())
  // Measured sizes from real DOM elements: index → measured pixel height
  const measuredSizes = useRef<Map<number, number>>(new Map())
  // Map from element key to item index for the measureElement callback
  const elementIndexMap = useRef<WeakMap<Element, number>>(new WeakMap())
  // Counter to force re-renders when sizes change
  const [, forceUpdate] = useState(0)
  const scrollTopRef = useRef(0)
  const containerHeightRef = useRef(400)
  const frameRef = useRef<number | null>(null)

  // Rebuild the position cache whenever count or measured sizes change.
  const rebuildPositionCache = useCallback(() => {
    let offset = 0
    posCache.current.clear()
    for (let i = 0; i < count; i++) {
      const measured = measuredSizes.current.get(i)
      const size = measured !== undefined ? measured : estimateSize(i)
      posCache.current.set(i, { start: offset, size })
      offset += size
    }
  }, [count, estimateSize])

  // Ensure cache is built on mount and when count changes.
  useEffect(() => {
    rebuildPositionCache()
    requestAnimationFrame(() => forceUpdate((n) => n + 1))
  }, [count, rebuildPositionCache])

  // Listen to scroll events on the container.
  useEffect(() => {
    const el = getScrollElement()
    if (!el) return

    containerHeightRef.current = el.clientHeight || 400

    const onScroll = () => {
      scrollTopRef.current = el.scrollTop
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null
          forceUpdate((n) => n + 1)
        })
      }
    }

    const onResize = () => {
      containerHeightRef.current = el.clientHeight || 400
      forceUpdate((n) => n + 1)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro?.disconnect()
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [getScrollElement])

  const getVirtualItems = useCallback((): VirtualItem[] => {
    if (count === 0) return []

    const scrollTop = scrollTopRef.current
    const viewportHeight = containerHeightRef.current

    // Binary search for the first item whose end > scrollTop.
    let lo = 0
    let hi = count - 1
    let startIndex = 0
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const entry = posCache.current.get(mid)
      const end = entry ? entry.start + entry.size : 0
      if (end <= scrollTop) {
        lo = mid + 1
      } else {
        startIndex = mid
        hi = mid - 1
      }
    }

    // Linear scan forward to find the last visible item.
    let endIndex = startIndex
    while (endIndex < count - 1) {
      const entry = posCache.current.get(endIndex)
      if (entry && entry.start >= scrollTop + viewportHeight) break
      endIndex++
    }

    // Apply overscan.
    const first = Math.max(0, startIndex - overscan)
    const last = Math.min(count - 1, endIndex + overscan)

    const items: VirtualItem[] = []
    for (let i = first; i <= last; i++) {
      const entry = posCache.current.get(i) ?? { start: 0, size: estimateSize(i) }
      items.push({ index: i, start: entry.start, size: entry.size, key: i })
    }
    return items
  }, [count, overscan, estimateSize])

  const getTotalSize = useCallback((): number => {
    if (count === 0) return 0
    const last = posCache.current.get(count - 1)
    return last ? last.start + last.size : 0
  }, [count])

  const measureElement = useCallback(
    (el: Element | null) => {
      if (!el) return
      const index = elementIndexMap.current.get(el)
      if (index === undefined) return
      const newSize = (el as HTMLElement).offsetHeight
      if (newSize === 0) return
      const prev = measuredSizes.current.get(index)
      if (prev === newSize) return
      measuredSizes.current.set(index, newSize)
      // Rebuild from the changed index onward to keep offsets consistent.
      let offset = posCache.current.get(index)?.start ?? 0
      for (let i = index; i < count; i++) {
        const measured = measuredSizes.current.get(i)
        const size = measured !== undefined ? measured : estimateSize(i)
        posCache.current.set(i, { start: offset, size })
        offset += size
      }
      forceUpdate((n) => n + 1)
    },
    [count, estimateSize],
  )

  /**
   * Attach an index to an element before the measureElement callback fires.
   * TierRow calls this via a merged ref.
   */
  const attachIndex = useCallback((el: Element | null, index: number) => {
    if (el) elementIndexMap.current.set(el, index)
  }, [])

  const measureElementWrapper = useCallback(
    (el: Element | null) => {
      measureElement(el)
    },
    [measureElement]
  )

  return { getVirtualItems, getTotalSize, measureElement: measureElementWrapper, attachIndex }
}
