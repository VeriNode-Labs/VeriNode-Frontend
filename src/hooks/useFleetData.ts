'use client'

import { useMemo } from 'react'

export type FleetNodeStatus = 'active' | 'warning' | 'critical' | 'slashed' | 'offline'

export interface FleetNodeMetrics {
  uptime: number
  stake: number
  lastAttestation: number
}

export interface FleetNode {
  id: string
  name: string
  status: FleetNodeStatus
  dataCenter: string
  metrics: FleetNodeMetrics
}

const STATUSES: FleetNodeStatus[] = ['active', 'warning', 'critical', 'slashed', 'offline']
const DATA_CENTERS = ['Lagos', 'Frankfurt', 'Singapore', 'Virginia', 'São Paulo']

export function createFleetNodes(count: number): FleetNode[] {
  const safeCount = Math.max(0, Math.min(10_000, Math.floor(count)))
  const now = Date.now()
  return Array.from({ length: safeCount }, (_, index) => {
    const status = index % 19 === 0 ? STATUSES[(Math.floor(index / 19) % 4) + 1] : 'active'
    return {
      id: `validator-${String(index + 1).padStart(5, '0')}`,
      name: `Validator ${index + 1}`,
      status,
      dataCenter: DATA_CENTERS[index % DATA_CENTERS.length],
      metrics: {
        uptime: status === 'offline' ? 0 : 99.99 - (index % 90) / 100,
        stake: 32 + (safeCount - index) * 0.01,
        lastAttestation: now - (index % 24) * 12_000,
      },
    }
  })
}

export function useFleetData(initialCount = 10_000) {
  const nodes = useMemo(() => createFleetNodes(initialCount), [initialCount])
  return { nodes, isLoading: false, error: null as string | null }
}
