'use client'

import { useMemo } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { UsageTimeRange, UsageTimeseriesPoint } from '@/src/types/usage'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

interface RequestCountChartProps {
  timeseries: UsageTimeseriesPoint[]
  range: UsageTimeRange
}

function formatLabel(timestamp: number, range: UsageTimeRange): string {
  const date = new Date(timestamp)
  if (range === '1d') return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function RequestCountChart({ timeseries, range }: RequestCountChartProps) {
  const data = useMemo(
    () => ({
      labels: timeseries.map((p) => formatLabel(p.timestamp, range)),
      datasets: [
        {
          label: 'Requests',
          data: timeseries.map((p) => p.requestCount),
          borderColor: '#3f3f46',
          backgroundColor: 'rgba(63, 63, 70, 0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }),
    [timeseries, range],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index' as const, intersect: false },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { beginAtZero: true, grid: { color: 'rgba(161, 161, 170, 0.15)' } },
      },
    }),
    [],
  )

  if (timeseries.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
        No requests in this range yet
      </div>
    )
  }

  return (
    <div className="h-56">
      <Line data={data} options={options} />
    </div>
  )
}