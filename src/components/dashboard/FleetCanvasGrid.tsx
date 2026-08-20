'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from '@/src/components/shared/Tooltip'
import type { FleetNode, FleetNodeStatus } from '@/src/hooks/useFleetData'

const CELL_SIZE = 12
const CELL_GAP = 2
const CELL_PITCH = CELL_SIZE + CELL_GAP
const BAND_GAP = 4
const FADE_MS = 200
const FRAME_MS = 16

const STATUS_META: Record<FleetNodeStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#22c55e' },
  warning: { label: 'Warning', color: '#eab308' },
  critical: { label: 'Critical', color: '#ef4444' },
  slashed: { label: 'Slashed', color: '#a855f7' },
  offline: { label: 'Offline', color: '#64748b' },
}

type LayoutMode = 'stake' | 'dataCenter' | 'status'

interface CellLayout {
  node: FleetNode
  x: number
  y: number
  matches: boolean
}

interface HoverState {
  cell: CellLayout
  x: number
  y: number
}

interface BandLabel {
  text: string
  y: number
}

interface FleetCanvasGridProps {
  nodes: FleetNode[]
  onNodeSelect?: (node: FleetNode) => void
}

export function FleetCanvasGrid({ nodes, onNodeSelect }: FleetCanvasGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layoutsRef = useRef<CellLayout[]>([])
  const frameRef = useRef<number | null>(null)
  const lastDrawRef = useRef(0)
  const fadeStartedRef = useRef(0)
  const previousHoverRef = useRef<CellLayout | null>(null)
  const hoverRef = useRef<HoverState | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FleetNodeStatus | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('stake')
  const [hover, setHover] = useState<HoverState | null>(null)
  const [selected, setSelected] = useState<FleetNode | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const resize = () => setWidth(Math.max(CELL_PITCH, container.clientWidth))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(STATUS_META).map((status) => [status, 0])) as Record<FleetNodeStatus, number>
    nodes.forEach((node) => counts[node.status]++)
    return counts
  }, [nodes])

  const { layouts, bandLabels, height } = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const filtered = statusFilter ? nodes.filter((node) => node.status === statusFilter) : nodes
    const sorted = [...filtered].sort((a, b) => {
      if (layoutMode === 'stake') return b.metrics.stake - a.metrics.stake
      const aGroup = layoutMode === 'dataCenter' ? a.dataCenter : a.status
      const bGroup = layoutMode === 'dataCenter' ? b.dataCenter : b.status
      return aGroup.localeCompare(bGroup) || b.metrics.stake - a.metrics.stake
    })
    const columns = Math.max(1, Math.floor(width / CELL_PITCH))
    const nextLayouts: CellLayout[] = []
    const nextBandLabels: BandLabel[] = []
    let rowOffset = 0
    let previousGroup = ''
    let groupIndex = 0

    sorted.forEach((node, index) => {
      const group = layoutMode === 'dataCenter' ? node.dataCenter : layoutMode === 'status' ? node.status : ''
      if (group !== previousGroup) {
        if (previousGroup) rowOffset += Math.ceil(groupIndex / columns) * CELL_PITCH + BAND_GAP
        previousGroup = group
        groupIndex = 0
        nextBandLabels.push({ text: layoutMode === 'status' ? STATUS_META[node.status].label : group, y: rowOffset })
        rowOffset += 16
      }
      const itemIndex = layoutMode === 'stake' ? index : groupIndex++
      nextLayouts.push({
        node,
        x: (itemIndex % columns) * CELL_PITCH,
        y: rowOffset + Math.floor(itemIndex / columns) * CELL_PITCH,
        matches: !normalizedQuery || node.name.toLocaleLowerCase().includes(normalizedQuery) || node.id.toLocaleLowerCase().includes(normalizedQuery),
      })
    })

    const contentHeight = nextLayouts.reduce((max, cell) => Math.max(max, cell.y + CELL_SIZE), CELL_SIZE)
    return { layouts: nextLayouts, bandLabels: nextBandLabels, height: contentHeight }
  }, [layoutMode, nodes, query, statusFilter, width])

  layoutsRef.current = layouts

  const drawCell = useCallback((ctx: CanvasRenderingContext2D, cell: CellLayout, alpha: number, highlighted = false) => {
    ctx.clearRect(cell.x - 2, cell.y - 2, CELL_SIZE + 4, CELL_SIZE + 4)
    ctx.globalAlpha = alpha
    ctx.fillStyle = STATUS_META[cell.node.status].color
    ctx.fillRect(cell.x, cell.y, CELL_SIZE, CELL_SIZE)
    ctx.globalAlpha = 1
    if (highlighted) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(cell.x - 1, cell.y - 1, CELL_SIZE + 2, CELL_SIZE + 2)
    }
  }, [])

  const paint = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const elapsed = timestamp - fadeStartedRef.current
    const progress = Math.min(1, elapsed / FADE_MS)
    const skippedFrames = lastDrawRef.current > 0 && timestamp - lastDrawRef.current > FRAME_MS * 2
    lastDrawRef.current = timestamp
    ctx.clearRect(0, 0, width, height)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif'
    bandLabels.forEach((label) => ctx.fillText(label.text, 0, label.y + 11))

    // On a delayed frame, alternate cells are left from the prior complete
    // frame and only the other half is refreshed, reducing immediate work.
    layoutsRef.current.forEach((cell, index) => {
      if (skippedFrames && progress < 1 && index % 2 === Math.floor(timestamp / FRAME_MS) % 2) return
      const alpha = cell.matches ? 1 : 1 - progress * 0.7
      ctx.globalAlpha = alpha
      ctx.fillStyle = STATUS_META[cell.node.status].color
      ctx.fillRect(cell.x, cell.y, CELL_SIZE, CELL_SIZE)
    })
    ctx.globalAlpha = 1
    const currentHover = hoverRef.current
    if (currentHover) drawCell(ctx, currentHover.cell, currentHover.cell.matches ? 1 : 0.3, true)
    if (progress < 1) frameRef.current = requestAnimationFrame(paint)
    else frameRef.current = null
  }, [bandLabels, drawCell, height, width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
    fadeStartedRef.current = performance.now()
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(paint)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [height, layouts, paint, width])

  const findCell = useCallback((x: number, y: number) => {
    const columns = Math.max(1, Math.floor(width / CELL_PITCH))
    if (layoutMode === 'stake') {
      const col = Math.floor(x / CELL_PITCH)
      const row = Math.floor(y / CELL_PITCH)
      const candidate = layoutsRef.current[row * columns + col]
      return candidate && x - candidate.x < CELL_SIZE && y - candidate.y < CELL_SIZE ? candidate : null
    }
    return layoutsRef.current.find((cell) => x >= cell.x && x < cell.x + CELL_SIZE && y >= cell.y && y < cell.y + CELL_SIZE) ?? null
  }, [layoutMode, width])

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const cell = findCell(x, y)
    const ctx = event.currentTarget.getContext('2d')
    if (ctx && previousHoverRef.current && previousHoverRef.current !== cell) {
      const previous = previousHoverRef.current
      drawCell(ctx, previous, previous.matches ? 1 : 0.3)
    }
    if (ctx && cell) drawCell(ctx, cell, cell.matches ? 1 : 0.3, true)
    previousHoverRef.current = cell
    const nextHover = cell ? { cell, x, y } : null
    hoverRef.current = nextHover
    if (tooltipRef.current) {
      tooltipRef.current.style.visibility = cell ? 'visible' : 'hidden'
      tooltipRef.current.style.left = `${Math.min(x + 16, width - 210)}px`
      tooltipRef.current.style.top = `${y + 16}px`
    }
    setHover(nextHover)
  }, [drawCell, findCell, width])

  const selectNode = useCallback((node: FleetNode) => {
    setSelected(node)
    onNodeSelect?.(node)
  }, [onNodeSelect])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const revealTooltip = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (!findCell(x, y) || !tooltipRef.current) return
      tooltipRef.current.style.visibility = 'visible'
      tooltipRef.current.style.left = `${Math.min(x + 16, width - 210)}px`
      tooltipRef.current.style.top = `${y + 16}px`
    }
    canvas.addEventListener('mousemove', revealTooltip)
    return () => canvas.removeEventListener('mousemove', revealTooltip)
  }, [findCell, width])

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-slate-100">
      <div className="flex flex-wrap gap-3">
        <input aria-label="Search fleet" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search node name or ID" className="min-w-64 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
        <select aria-label="Fleet layout" value={layoutMode} onChange={(event) => setLayoutMode(event.target.value as LayoutMode)} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
          <option value="stake">Sort by stake</option>
          <option value="dataCenter">Group by data center</option>
          <option value="status">Group by status</option>
        </select>
      </div>

      <div ref={containerRef} className="relative max-h-[70vh] w-full overflow-auto rounded-lg bg-slate-900 p-1">
        <canvas
          ref={canvasRef}
          data-testid="fleet-canvas"
          onMouseMove={onMouseMove}
          onMouseLeave={(event) => {
            const previous = previousHoverRef.current
            const ctx = event.currentTarget.getContext('2d')
            if (ctx && previous) drawCell(ctx, previous, previous.matches ? 1 : 0.3)
            previousHoverRef.current = null
            hoverRef.current = null
            if (tooltipRef.current) tooltipRef.current.style.visibility = 'hidden'
            setHover(null)
          }}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const cell = findCell(event.clientX - rect.left, event.clientY - rect.top)
            if (cell) selectNode(cell.node)
          }}
          className="block cursor-pointer"
        />
        <Tooltip ref={tooltipRef} style={{ left: hover ? Math.min(hover.x + 16, width - 210) : 0, top: hover ? hover.y + 16 : 0, visibility: hover ? 'visible' : 'hidden' }}>
          {hover && (
            <>
              <div className="font-semibold">{hover.cell.node.name}</div>
              <div className="capitalize text-slate-300">{hover.cell.node.status}</div>
              <div>Uptime: {hover.cell.node.metrics.uptime.toFixed(2)}%</div>
              <div>Stake: {hover.cell.node.metrics.stake.toFixed(2)} ETH</div>
              <div>Last attestation: {new Date(hover.cell.node.metrics.lastAttestation).toLocaleTimeString()}</div>
            </>
          )}
        </Tooltip>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Fleet status legend">
        {(Object.keys(STATUS_META) as FleetNodeStatus[]).map((status) => (
          <button key={status} type="button" onClick={() => setStatusFilter((current) => current === status ? null : status)} aria-pressed={statusFilter === status} className="flex items-center gap-2 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs aria-pressed:bg-slate-700">
            <span className="h-3 w-3 rounded-sm" style={{ background: STATUS_META[status].color }} />
            {STATUS_META[status].label} ({statusCounts[status].toLocaleString()})
          </button>
        ))}
      </div>

      {selected && (
        <aside aria-label="Node detail panel" className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">
          <div className="font-semibold">{selected.name}</div>
          <div className="text-slate-400">{selected.id} · {selected.dataCenter} · {selected.metrics.stake.toFixed(2)} ETH</div>
        </aside>
      )}
    </section>
  )
}
