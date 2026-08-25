/**
 * Developer Portal — Usage Dashboard types (#dev-portal)
 */

export const USAGE_TIME_RANGES = ['1d', '7d', '30d'] as const
export type UsageTimeRange = (typeof USAGE_TIME_RANGES)[number]

export interface UsageTimeseriesPoint {
  /** Unix-millisecond timestamp for this bucket. */
  timestamp: number
  requestCount: number
}

export interface LatencyBucket {
  timestamp: number
  p50Ms: number
  p95Ms: number
}

export interface EndpointUsage {
  endpoint: string
  requestCount: number
}

export interface UsageSummary {
  keyId: string
  range: UsageTimeRange
  totalRequests: number
  /** 0-1 fraction, e.g. 0.023 = 2.3% error rate. */
  errorRate: number
  p50LatencyMs: number
  p95LatencyMs: number
  timeseries: UsageTimeseriesPoint[]
  latencyBuckets: LatencyBucket[]
  topEndpoints: EndpointUsage[]
}