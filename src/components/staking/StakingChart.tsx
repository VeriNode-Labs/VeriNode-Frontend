'use client';

/**
 * StakingChart
 *
 * Renders three Lightweight Charts panels:
 * 1. Staked balance over time (area chart)
 * 2. APR history (area chart)
 * 3. Cumulative rewards (area chart)
 *
 * Follows the same pattern as PerformanceCharts in src/components/operator.
 */

import { useEffect, useMemo, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { StakingChartDataPoint } from '@/src/types/staking';

interface StakingChartProps {
  balanceHistory: StakingChartDataPoint[];
  aprHistory: StakingChartDataPoint[];
  cumulativeRewards: StakingChartDataPoint[];
}

interface Point {
  time: UTCTimestamp;
  value: number;
}

/** Sort ascending by time and drop duplicate timestamps (lightweight-charts requires this). */
function normalize(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const out: Point[] = [];
  let lastTime = -1;
  for (const p of sorted) {
    if (p.time === lastTime) out[out.length - 1] = p;
    else out.push(p);
    lastTime = p.time;
  }
  return out;
}

function toPoints(data: StakingChartDataPoint[]): Point[] {
  return data.map((d) => ({
    time: d.time as UTCTimestamp,
    value: d.value,
  }));
}

function LwChart({
  data,
  height = 220,
  color = '#3b82f6',
  topColor,
  bottomColor,
}: {
  data: Point[];
  height?: number;
  color?: string;
  topColor?: string;
  bottomColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#71717a',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(113,113,122,0.1)' },
        horzLines: { color: 'rgba(113,113,122,0.1)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const resolvedTopColor = topColor ?? `${color}59`;
    const resolvedBottomColor = bottomColor ?? `${color}05`;

    seriesRef.current = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: resolvedTopColor,
      bottomColor: resolvedBottomColor,
      lineWidth: 2,
    });

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: Math.floor(w) });
    });
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, color, topColor, bottomColor]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setData(normalize(data));
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}

function ChartCard({
  title,
  empty,
  children,
  subtitle,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {empty ? (
        <div
          className="flex items-center justify-center text-sm text-slate-500"
          style={{ height: 220 }}
        >
          No data in the selected range
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function StakingChart({
  balanceHistory,
  aprHistory,
  cumulativeRewards,
}: StakingChartProps) {
  const balancePoints = useMemo(() => toPoints(balanceHistory), [balanceHistory]);
  const aprPoints = useMemo(() => toPoints(aprHistory), [aprHistory]);
  const cumulativePoints = useMemo(() => toPoints(cumulativeRewards), [cumulativeRewards]);

  return (
    <section aria-label="Staking charts" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ChartCard
        title="Staked Balance"
        subtitle="Your staked VRN over time"
        empty={balancePoints.length === 0}
      >
        <LwChart
          data={balancePoints}
          color="#3b82f6"
          topColor="rgba(59,130,246,0.35)"
          bottomColor="rgba(59,130,246,0.02)"
        />
      </ChartCard>

      <ChartCard
        title="APR History"
        subtitle="Network staking APR over time"
        empty={aprPoints.length === 0}
      >
        <LwChart
          data={aprPoints}
          color="#10b981"
          topColor="rgba(16,185,129,0.35)"
          bottomColor="rgba(16,185,129,0.02)"
        />
      </ChartCard>

      <ChartCard
        title="Cumulative Rewards"
        subtitle="Total rewards earned over time"
        empty={cumulativePoints.length === 0}
      >
        <LwChart
          data={cumulativePoints}
          color="#f59e0b"
          topColor="rgba(245,158,11,0.35)"
          bottomColor="rgba(245,158,11,0.02)"
        />
      </ChartCard>
    </section>
  );
}
