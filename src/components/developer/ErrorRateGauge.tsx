'use client'

import { useMemo } from 'react'
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip)

interface ErrorRateGaugeProps {
  /** 0-1 fraction, e.g. 0.023 = 2.3%. */
  errorRate: number
}

function gaugeColor(errorRate: number): string {
  if (errorRate < 0.01) return '#10b981' // emerald-500 — healthy
  if (errorRate < 0.05) return '#f59e0b' // amber-500 — watch
  return '#ef4444' // red-500 — unhealthy
}

export function ErrorRateGauge({ errorRate }: ErrorRateGaugeProps) {
  const percent = errorRate * 100
  const color = gaugeColor(errorRate)

  const data = useMemo(
    () => ({
      datasets: [
        {
          data: [percent, Math.max(0, 100 - percent)],
          backgroundColor: [color, 'rgba(161, 161, 170, 0.15)'],
          borderWidth: 0,
        },
      ],
    }),
    [percent, color],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      circumference: 180,
      rotation: 270,
      cutout: '75%',
      plugins: { tooltip: { enabled: false }, legend: { display: false } },
    }),
    [],
  )

  return (
    <div className="relative h-32">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color }}>
          {percent.toFixed(2)}%
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">error rate</span>
      </div>
    </div>
  )
}