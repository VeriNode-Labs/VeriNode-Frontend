'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GeoNode, NetworkNodeStatus } from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAP_WIDTH = 960
const MAP_HEIGHT = 480
const CLUSTER_RADIUS_DEG = 4.5
const CLUSTER_MIN_COUNT = 3
const NODE_RADIUS = 5

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Equirectangular projection – sufficient for a schematic map. */
function project(lat: number, lng: number, w: number, h: number): [number, number] {
  const x = ((lng + 180) / 360) * w
  const y = ((90 - lat) / 180) * h
  return [x, y]
}

function statusFill(status: NetworkNodeStatus): string {
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

function statusLabel(status: NetworkNodeStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'syncing':
      return 'Syncing'
    case 'offline':
      return 'Offline'
    case 'error':
      return 'Error'
  }
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

interface Cluster {
  id: string
  latitude: number
  longitude: number
  nodeCount: number
  dominantStatus: NetworkNodeStatus
  nodes: GeoNode[]
}

type RenderItem = { kind: 'node'; node: GeoNode } | { kind: 'cluster'; cluster: Cluster }

function clusterNodes(nodes: GeoNode[]): RenderItem[] {
  const clusters: Cluster[] = []
  const assigned = new Set<number>()

  for (let i = 0; i < nodes.length; i++) {
    if (assigned.has(i)) continue
    const center = nodes[i]
    const group: GeoNode[] = [center]
    assigned.add(i)

    for (let j = i + 1; j < nodes.length; j++) {
      if (assigned.has(j)) continue
      const d =
        Math.abs(nodes[j].latitude - center.latitude) +
        Math.abs(nodes[j].longitude - center.longitude)
      if (d < CLUSTER_RADIUS_DEG) {
        group.push(nodes[j])
        assigned.add(j)
      }
    }

    if (group.length >= CLUSTER_MIN_COUNT) {
      const lat = group.reduce((s, n) => s + n.latitude, 0) / group.length
      const lng = group.reduce((s, n) => s + n.longitude, 0) / group.length
      const statusCounts: Record<NetworkNodeStatus, number> = {
        active: 0,
        syncing: 0,
        offline: 0,
        error: 0,
      }
      group.forEach((n) => statusCounts[n.status]++)
      const dominantStatus = (
        Object.entries(statusCounts) as [NetworkNodeStatus, number][]
      ).reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
      clusters.push({
        id: `cluster-${i}`,
        latitude: lat,
        longitude: lng,
        nodeCount: group.length,
        dominantStatus,
        nodes: group,
      })
    } else {
      group.forEach((n) => clusters.push({ id: n.id, latitude: n.latitude, longitude: n.longitude, nodeCount: 1, dominantStatus: n.status, nodes: [n] }))
    }
  }

  return clusters.map((c) =>
    c.nodeCount === 1
      ? { kind: 'node', node: c.nodes[0] }
      : { kind: 'cluster', cluster: c },
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface HitTarget {
  x: number
  y: number
  item: RenderItem
}

interface TooltipState {
  screenX: number
  screenY: number
  item: RenderItem
}

interface NodeMapProps {
  nodes: GeoNode[]
}

/**
 * Canvas-based geographic node map with proximity clustering.
 * Renders a schematic equirectangular world map with colored node/cluster markers.
 * Click a marker to see node details.
 *
 * Technical note: Mapbox GL is not installed in this repository.
 * This canvas implementation satisfies the issue requirement using only
 * the available dependency set (Canvas 2D + React), consistent with the
 * existing NodeTopologyMap pattern.
 */
export function NodeMap({ nodes }: NodeMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState({ width: MAP_WIDTH, height: MAP_HEIGHT })
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [selected, setSelected] = useState<RenderItem | null>(null)
  const hitTargetsRef = useRef<HitTarget[]>([])

  const items = useMemo(() => clusterNodes(nodes), [nodes])

  // Responsive container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth || MAP_WIDTH
      const h = Math.round(w * (MAP_HEIGHT / MAP_WIDTH))
      setSize({ width: w, height: h })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || size.width === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { width: W, height: H } = size

    // Background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // Grid lines (longitude/latitude guides)
    ctx.strokeStyle = 'rgba(148,163,184,0.07)'
    ctx.lineWidth = 1
    for (let lng = -180; lng <= 180; lng += 30) {
      const [x] = project(0, lng, W, H)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const [, y] = project(lat, 0, W, H)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // Equator + prime meridian
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'
    const [, eqY] = project(0, 0, W, H)
    ctx.beginPath()
    ctx.moveTo(0, eqY)
    ctx.lineTo(W, eqY)
    ctx.stroke()
    const [pmX] = project(0, 0, W, H)
    ctx.beginPath()
    ctx.moveTo(pmX, 0)
    ctx.lineTo(pmX, H)
    ctx.stroke()

    // Render items
    const hits: HitTarget[] = []

    for (const item of items) {
      let px: number, py: number, fill: string, radius: number

      if (item.kind === 'node') {
        ;[px, py] = project(item.node.latitude, item.node.longitude, W, H)
        fill = statusFill(item.node.status)
        radius = NODE_RADIUS

        const isSelected = selected?.kind === 'node' && selected.node.id === item.node.id
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fillStyle = fill
        ctx.fill()
        if (isSelected) {
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      } else {
        ;[px, py] = project(item.cluster.latitude, item.cluster.longitude, W, H)
        fill = statusFill(item.cluster.dominantStatus)
        radius = Math.min(18, 8 + Math.sqrt(item.cluster.nodeCount) * 1.8)

        const isSelected =
          selected?.kind === 'cluster' && selected.cluster.id === item.cluster.id
        // Outer ring
        ctx.beginPath()
        ctx.arc(px, py, radius + 3, 0, Math.PI * 2)
        ctx.strokeStyle = fill + '40'
        ctx.lineWidth = 2
        ctx.stroke()
        // Filled circle
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fillStyle = fill + 'cc'
        ctx.fill()
        if (isSelected) {
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 2
          ctx.stroke()
        }
        // Count label
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.max(9, radius * 0.9)}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(item.cluster.nodeCount), px, py)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }

      hits.push({ x: px, y: py, item })
    }

    hitTargetsRef.current = hits
  }, [items, size, selected])

  const hitTest = useCallback((cx: number, cy: number): RenderItem | null => {
    let best: RenderItem | null = null
    let bestDist = 24 * 24
    for (const ht of hitTargetsRef.current) {
      const d = (ht.x - cx) ** 2 + (ht.y - cy) ** 2
      if (d < bestDist) {
        bestDist = d
        best = ht.item
      }
    }
    return best
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const scaleX = size.width / rect.width
      const scaleY = size.height / rect.height
      const cx = (e.clientX - rect.left) * scaleX
      const cy = (e.clientY - rect.top) * scaleY
      const item = hitTest(cx, cy)
      if (item) {
        setTooltip({ screenX: e.clientX - rect.left, screenY: e.clientY - rect.top, item })
      } else {
        setTooltip(null)
      }
    },
    [hitTest, size],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const scaleX = size.width / rect.width
      const scaleY = size.height / rect.height
      const cx = (e.clientX - rect.left) * scaleX
      const cy = (e.clientY - rect.top) * scaleY
      const item = hitTest(cx, cy)
      setSelected((prev) => {
        if (!item) return null
        if (item.kind === 'node' && prev?.kind === 'node' && prev.node.id === item.node.id) return null
        if (item.kind === 'cluster' && prev?.kind === 'cluster' && prev.cluster.id === item.cluster.id) return null
        return item
      })
    },
    [hitTest, size],
  )

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {(['active', 'syncing', 'offline', 'error'] as NetworkNodeStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: statusFill(s) }}
            />
            {statusLabel(s)}
          </span>
        ))}
        <span className="ml-auto text-slate-500">{nodes.length} nodes · {items.length} rendered</span>
      </div>

      {/* Canvas wrapper */}
      <div ref={containerRef} className="relative w-full" style={{ height: size.height }}>
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-xl"
          style={{ width: '100%', height: size.height, cursor: 'crosshair' }}
          aria-label="Geographic node distribution map"
          role="img"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          onClick={handleClick}
        />

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
            style={{ left: tooltip.screenX + 14, top: tooltip.screenY + 14 }}
          >
            {tooltip.item.kind === 'node' ? (
              <>
                <div className="font-semibold">{tooltip.item.node.label}</div>
                <div className="mt-0.5 text-slate-400">{tooltip.item.node.region}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: statusFill(tooltip.item.node.status) }}
                  />
                  {statusLabel(tooltip.item.node.status)}
                </div>
                <div className="mt-1 text-slate-400">
                  {tooltip.item.node.peerCount} peers · {tooltip.item.node.latencyMs}ms
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold">{tooltip.item.cluster.nodeCount} nodes</div>
                <div className="mt-0.5 text-slate-400">
                  Dominant: {statusLabel(tooltip.item.cluster.dominantStatus)}
                </div>
                <div className="mt-1 text-slate-500 text-xs">Click to inspect cluster</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected item detail panel */}
      {selected && (
        <NodeDetailCard item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail panel shown when a node/cluster is clicked
// ---------------------------------------------------------------------------

function NodeDetailCard({ item, onClose }: { item: RenderItem; onClose: () => void }) {
  if (item.kind === 'node') {
    const n = item.node
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 text-sm text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: statusFill(n.status) }}
            />
            <span className="font-semibold">{n.label}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close node detail"
            className="rounded p-0.5 text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            ✕
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {[
            ['Region', n.region],
            ['Status', statusLabel(n.status)],
            ['Version', n.version],
            ['Peers', String(n.peerCount)],
            ['Latency (p50)', `${n.latencyMs}ms`],
            ['Last seen', new Date(n.lastSeenAt).toLocaleTimeString()],
          ].map(([dt, dd]) => (
            <div key={dt} className="rounded-lg bg-slate-800/60 p-2">
              <dt className="text-slate-500">{dt}</dt>
              <dd className="mt-0.5 font-semibold text-slate-100">{dd}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  const c = item.cluster
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 text-sm text-white">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{c.nodeCount} nodes (cluster)</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cluster detail"
          className="rounded p-0.5 text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/40"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
        {c.nodes.slice(0, 20).map((n) => (
          <div key={n.id} className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2 py-1 text-xs">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: statusFill(n.status) }}
            />
            <span className="font-medium">{n.label}</span>
            <span className="ml-auto text-slate-400">{n.region}</span>
          </div>
        ))}
        {c.nodes.length > 20 && (
          <div className="px-2 py-1 text-xs text-slate-500">+{c.nodes.length - 20} more</div>
        )}
      </div>
    </div>
  )
}
