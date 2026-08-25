'use client'

import { useEffect, useState } from 'react'
import { useApiKeyStore } from '@/src/store/apiKeyStore'
import { usageService } from '@/src/services/usageService'
import type { UsageSummary, UsageTimeRange } from '@/src/types/usage'
import { TimeRangeSelector } from './TimeRangeSelector'
import { RequestCountChart } from './RequestCountChart'
import { LatencyHeatmap } from './LatencyHeatmap'
import { ErrorRateGauge } from './ErrorRateGauge'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      {children}
    </div>
  )
}

export function UsageDashboard() {
  const { keys, fetchKeys } = useApiKeyStore()
  const activeKeys = keys.filter((k) => k.status === 'active')

  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [range, setRange] = useState<UsageTimeRange>('7d')
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  useEffect(() => {
    if (!selectedKeyId && activeKeys.length > 0) {
      setSelectedKeyId(activeKeys[0].id)
    }
  }, [activeKeys, selectedKeyId])

  useEffect(() => {
    if (!selectedKeyId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    usageService
      .getUsage(selectedKeyId, range)
      .then((result) => {
        if (!cancelled) setSummary(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load usage data')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedKeyId, range])

  if (activeKeys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No active keys to show usage for</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Create an API key to start seeing analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={selectedKeyId ?? ''}
          onChange={(e) => setSelectedKeyId(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
        >
          {activeKeys.map((key) => (
            <option key={key.id} value={key.id}>
              {key.name}
            </option>
          ))}
        </select>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Requests">
            {isLoading || !summary ? (
              <div className="flex h-56 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                Loading…
              </div>
            ) : (
              <RequestCountChart timeseries={summary.timeseries} range={range} />
            )}
          </Card>
        </div>

        <Card title="Error rate">
          {isLoading || !summary ? (
            <div className="flex h-32 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
              Loading…
            </div>
          ) : (
            <ErrorRateGauge errorRate={summary.errorRate} />
          )}
        </Card>

        <div className="lg:col-span-2">
          <Card title="Latency (p95 per bucket)">
            {isLoading || !summary ? (
              <div className="flex h-24 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                Loading…
              </div>
            ) : (
              <LatencyHeatmap buckets={summary.latencyBuckets} />
            )}
            {summary ? (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                p50 {summary.p50LatencyMs}ms · p95 {summary.p95LatencyMs}ms
              </p>
            ) : null}
          </Card>
        </div>

        <Card title="Top endpoints">
          {isLoading || !summary ? (
            <div className="flex h-24 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
              Loading…
            </div>
          ) : summary.topEndpoints.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">No requests yet</p>
          ) : (
            <ul className="space-y-2">
              {summary.topEndpoints.map((ep) => (
                <li key={ep.endpoint} className="flex items-center justify-between text-xs">
                  <code className="text-zinc-700 dark:text-zinc-300">{ep.endpoint}</code>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">{ep.requestCount}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}