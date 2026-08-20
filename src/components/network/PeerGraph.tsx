'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PeerEdge, PeerGraphData, PeerNode } from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_NODES = 500
const NODE_RADIUS = 5
const CANVAS_HEIGHT = 480
const REPULSION = 8000
const ATTRACTION = 0.04
const DAMPING = 0.85
const TICK_LIMIT = 120

// ---------------------------------------------------------------------------
// Force-layout (Barnes-Hut style simplified)
// ---------------------------------------------------------------------------

interface LayoutNode extends PeerNode {
  x: number
  y: number
  vx: number
  vy: number
}

function initLayout(nodes: PeerNode[], width: number, height: number): LayoutNode[] {
  const n = nodes.length
  return nodes.map((node, i) => {
    const angle = (i / n) * Math.PI * 2
    const r = Math.min(width, height) * 0.35
    return {
      ...node,
      x: width / 2 + r * Math.cos(angle),
      y: height / 2 + r * Math.sin(angle),
      vx: 0,
      vy: 0,
    }
  })
}

function runTick(
  nodes: LayoutNode[],
  edges: PeerEdge[],
  width: number,
  height: number,
): LayoutNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distSq = dx * dx + dy * dy + 1
      const force = REPULSION / distSq
      const dist = Math.sqrt(distSq)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      nodes[i].vx -= fx
      nodes[i].vy -= fy
      nodes[j].vx += fx
      nodes[j].vy += fy
    }
  }

  // Attraction (spring along edges)
  for (const edge of edges) {
    const a = byId.get(edge.source)
    const b = byId.get(edge.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    a.vx += dx * ATTRACTION
    a.vy += dy * ATTRACTION
    b.vx -= dx * ATTRACTION
    b.vy -= dy * ATTRACTION
  }

  // Integrate + damp + clamp
  const pad = 20
  for (const node of nodes) {
    node.vx *= DAMPING
    node.vy *= DAMPING
    node.x = Math.max(pad, Math.min(width - pad, node.x + node.vx))
    node.y = Math.max(pad, Math.min(height - pad, node.y + node.vy))
  }

  return nodes
}

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

function statusColor(status: PeerNode['status']): string {
  switch (status) {
    case 'active':
      return '#22c55e'
    case 'syncing':
      return '#facc15'
    case 'offline':
      return '#f87171'
    case 'error':
      return '#fb923c'
  }
}

function edgeColor(latencyMs: number): string {
  if (latencyMs < 60) return 'rgba(34,197,94,0.35)'
  if (latencyMs < 150) return 'rgba(250,204,21,0.35)'
  return 'rgba(248,113,113,0.35)'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PeerGraphProps {
  data: PeerGraphData
}

/**
 * Canvas force-directed peer connectivity graph.
 * Implements Barnes-Hut inspired physics (simplified repulsion + spring attraction).
 * Enforces a maximum of 500 nodes as specified in the issue.
 * Supports node search + highlight.
 */
export function PeerGraph({ data }: PeerGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState({ width: 800, height: CANVAS_HEIGHT })
  const [search, setSearch] = useState('')
  const layoutRef = useRef<LayoutNode[]>([])
  const tickRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  // Cap to MAX_NODES
  const cappedNodes = useMemo(() => data.nodes.slice(0, MAX_NODES), [data.nodes])
  const cappedNodeIds = useMemo(() => new Set(cappedNodes.map((n) => n.id)), [cappedNodes])
  const cappedEdges = useMemo(
    () => data.edges.filter((e) => cappedNodeIds.has(e.source) && cappedNodeIds.has(e.target)),
    [data.edges, cappedNodeIds],
  )

  // Responsive
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth || 800, height: CANVAS_HEIGHT })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Init layout on data/size change
  const topologyKey = useMemo(
    () => `${cappedNodes.length}:${cappedEdges.length}`,
    [cappedNodes.length, cappedEdges.length],
  )

  useEffect(() => {
    layoutRef.current = initLayout(cappedNodes, size.width, size.height)
    tickRef.current = 0
  }, [topologyKey, cappedNodes, size.width, size.height])

  // Highlight set
  const highlightIds = useMemo<Set<string>>(() => {
    if (!search.trim()) return new Set()
    const q = search.toLowerCase()
    return new Set(cappedNodes.filter((n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)).map((n) => n.id))
  }, [search, cappedNodes])

  // Animation loop
  useEffect(() => {
    const tick = () => {
      if (tickRef.current < TICK_LIMIT) {
        layoutRef.current = runTick(layoutRef.current, cappedEdges, size.width, size.height)
        tickRef.current++
      }

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx || size.width === 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(size.width * dpr)
      canvas.height = Math.round(CANVAS_HEIGHT * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, size.width, CANVAS_HEIGHT)

      const byId = new Map(layoutRef.current.map((n) => [n.id, n]))
      const hasSearch = highlightIds.size > 0

      // Edges
      for (const edge of cappedEdges) {
        const a = byId.get(edge.source)
        const b = byId.get(edge.target)
        if (!a || !b) continue
        const isHighlighted =
          !hasSearch || (highlightIds.has(edge.source) || highlightIds.has(edge.target))
        ctx.globalAlpha = hasSearch && !isHighlighted ? 0.08 : 0.5
        ctx.strokeStyle = edgeColor(edge.latencyMs)
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Nodes
      for (const node of layoutRef.current) {
        const isHighlighted = !hasSearch || highlightIds.has(node.id)
        const isHovered = node.id === hoverId
        ctx.globalAlpha = hasSearch && !isHighlighted ? 0.15 : 1

        ctx.beginPath()
        ctx.arc(node.x, node.y, isHovered ? NODE_RADIUS + 3 : NODE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = statusColor(node.status)
        ctx.fill()

        if (isHovered || (isHighlighted && hasSearch)) {
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        if (isHovered) {
          ctx.globalAlpha = 1
          ctx.font = '10px ui-sans-serif, system-ui, sans-serif'
          ctx.fillStyle = 'rgba(226,232,240,0.95)'
          ctx.fillText(node.label, node.x + 9, node.y - 6)
        }
      }

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [cappedEdges, highlightIds, size, hoverId])

  // Hit test
  const hitTest = useCallback((cx: number, cy: number): LayoutNode | null => {
    let best: LayoutNode | null = null
    let bestD = 16 * 16
    for (const n of layoutRef.current) {
      const d = (n.x - cx) ** 2 + (n.y - cy) ** 2
      if (d < bestD) {
        bestD = d
        best = n
      }
    }
    return best
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const scaleX = size.width / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      const cx = (e.clientX - rect.left) * scaleX
      const cy = (e.clientY - rect.top) * scaleY
      const node = hitTest(cx, cy)
      setHoverId(node?.id ?? null)
    },
    [hitTest, size],
  )

  const hoveredNode = useMemo(
    () => (hoverId ? layoutRef.current.find((n) => n.id === hoverId) ?? null : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoverId],
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search peer graph nodes"
          className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 w-48"
        />
        <span className="text-xs text-slate-500">
          {cappedNodes.length} nodes · {cappedEdges.length} connections
          {data.nodes.length > MAX_NODES && (
            <span className="ml-1 text-amber-400">(capped at {MAX_NODES})</span>
          )}
        </span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative w-full" style={{ height: CANVAS_HEIGHT }}>
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-xl"
          style={{ width: '100%', height: CANVAS_HEIGHT, cursor: 'crosshair' }}
          aria-label="Peer connectivity force-directed graph"
          role="img"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverId(null)}
        />

        {hoveredNode && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
            style={{
              left: Math.min((hoveredNode.x / size.width) * 100, 75) + '%',
              top: (hoveredNode.y / CANVAS_HEIGHT) * 100 + '%',
              transform: 'translate(12px, 12px)',
            }}
          >
            <div className="font-semibold">{hoveredNode.label}</div>
            <div className="text-slate-400">{hoveredNode.version}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: statusColor(hoveredNode.status) }}
              />
              {hoveredNode.status}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
