// State management for correlated slashing risk analysis.
//
// Holds per-cluster risk results as they are returned by the DBSCAN
// worker and the risk-score computation pass. Components read from this
// store; useCorrelationRisk writes to it.

import { create } from 'zustand'
import type { RiskTier } from '@/src/utils/riskScore'
import type { MitigationRecommendation } from '@/src/utils/mitigationRecommender'
import type { NodeInfraMetadata } from '@/src/services/infrastructureService'

export type AnalysisStatus = 'idle' | 'running' | 'complete' | 'error'

/** Per-node enrichment stored after infrastructure resolution. */
export interface RiskNode extends NodeInfraMetadata {
  /** Cluster ID assigned by DBSCAN (-1 = noise). */
  clusterId: number
}

/** Aggregated risk result for one DBSCAN-detected cluster. */
export interface ClusterRiskResult {
  clusterId: number
  nodeIds: string[]
  /** Number of nodes in the cluster. */
  nodeCount: number
  riskScore: number
  tier: RiskTier
  /** Factor breakdowns. */
  sharedIpCount: number
  sharedAsnCount: number
  sharedCloudRegionCount: number
  recommendations: MitigationRecommendation[]
}

interface RiskState {
  status: AnalysisStatus
  error: string | null
  nodes: RiskNode[]
  clusters: ClusterRiskResult[]
  lastAnalysedAt: number | null

  // ── Actions ────────────────────────────────────────────────────────────────
  setStatus: (status: AnalysisStatus, error?: string | null) => void
  setResults: (nodes: RiskNode[], clusters: ClusterRiskResult[]) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as AnalysisStatus,
  error: null,
  nodes: [] as RiskNode[],
  clusters: [] as ClusterRiskResult[],
  lastAnalysedAt: null,
}

export const useRiskStore = create<RiskState>((set) => ({
  ...initialState,

  setStatus: (status, error = null) => set({ status, error }),

  setResults: (nodes, clusters) =>
    set({ nodes, clusters, status: 'complete', error: null, lastAnalysedAt: Date.now() }),

  reset: () => set({ ...initialState }),
}))
