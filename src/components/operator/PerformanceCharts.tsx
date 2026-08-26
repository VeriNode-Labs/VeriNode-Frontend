'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { OperatorHistory, TimeRange } from '@/src/types/operator';
import {
  epochToUnixSeconds,
  filterEpochPointsByRange,
  filterTimestampPointsByRange,
} from '@/src/lib/operatorTime';
import { useTheme } from '@/src/components/providers/ThemeProvider';
import { getChartTheme } from '@/src/styles/chartTheme';

interface Point {
  time: UTCTimestamp;
  value: number;
  color?: string;
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

function LwChart({
  data,
  kind,
  height = 220,
}: {
  data: Point[];
  kind: 'area' | 'histogram';
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Histogram'> | null>(null);
  const { resolvedTheme } = useTheme();
  const chartTheme = useMemo(() => getChartTheme(resolvedTheme), [resolvedTheme]);

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartTheme.textColor,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: chartTheme.gridColor },
        horzLines: { color: chartTheme.gridColor },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    seriesRef.current =
      kind === 'area'
        ? chart.addSeries(AreaSeries, {
            lineColor: chartTheme.seriesColor,
            topColor: chartTheme.areaTopColor,
            bottomColor: chartTheme.areaBottomColor,
            lineWidth: 2,
          })
        : chart.addSeries(HistogramSeries, { color: chartTheme.seriesColor });

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
    // `chartTheme` is intentionally omitted: recreating the chart on theme
    // change would reset the viewport. Colors are re-applied in the dedicated
    // effect below via `chart.applyOptions()`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, height]);

  // Re-theme the existing chart instance on mode change (issue #169).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      layout: {
        textColor: chartTheme.textColor,
        background: { type: ColorType.Solid, color: 'transparent' },
      },
      grid: {
        vertLines: { color: chartTheme.gridColor },
        horzLines: { color: chartTheme.gridColor },
      },
    });
    const series = seriesRef.current;
    if (!series) return;
    if (series.seriesType() === 'Area') {
      series.applyOptions({
        lineColor: chartTheme.seriesColor,
        topColor: chartTheme.areaTopColor,
        bottomColor: chartTheme.areaBottomColor,
      });
    } else {
      series.applyOptions({ color: chartTheme.seriesColor });
    }
  }, [chartTheme]);

  // Update data when it changes.
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
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          No data in the selected range
        </div>
      ) : (
        children
      )}
    </div>
  );
}

const PROPOSAL_STATUS: Record<string, 'success' | 'destructive' | 'warning' | 'series'> = {
  included: 'success',
  missed: 'destructive',
  orphaned: 'warning',
};

export interface PerformanceChartsProps {
  history: OperatorHistory;
  timeRange: TimeRange;
}

/**
 * Historical performance charts (Lightweight Charts): validator balance (area),
 * attestation effectiveness (bar), and a proposal timeline (colored bars by
 * status). All three respect the shared time range.
 */
export function PerformanceCharts({ history, timeRange }: PerformanceChartsProps) {
  const { resolvedTheme } = useTheme();
  const chartTheme = useMemo(() => getChartTheme(resolvedTheme), [resolvedTheme]);

  const balancePoints = useMemo<Point[]>(() => {
    return filterEpochPointsByRange(history.balances, timeRange).map((p) => ({
      time: epochToUnixSeconds(p.epoch) as UTCTimestamp,
      value: Number(p.balanceGwei) / 1e9,
    }));
  }, [history.balances, timeRange]);

  const effectivenessPoints = useMemo<Point[]>(() => {
    return filterEpochPointsByRange(history.attestationEffectiveness, timeRange).map((p) => ({
      time: epochToUnixSeconds(p.epoch) as UTCTimestamp,
      value: p.effectivenessPct,
    }));
  }, [history.attestationEffectiveness, timeRange]);

  const proposalPoints = useMemo<Point[]>(() => {
    return filterTimestampPointsByRange(history.proposals, timeRange).map((p) => {
      const tone = PROPOSAL_STATUS[p.status] ?? 'series';
      const color = tone === 'series' ? chartTheme.seriesColor : chartTheme[tone];
      return {
        time: Math.floor(p.timestamp / 1000) as UTCTimestamp,
        value: 1,
        color,
      };
    });
  }, [history.proposals, timeRange, chartTheme]);

  return (
    <section aria-label="Performance charts" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ChartCard title="Balance History (ETH)" empty={balancePoints.length === 0}>
        <LwChart data={balancePoints} kind="area" />
      </ChartCard>
      <ChartCard title="Attestation Effectiveness (%)" empty={effectivenessPoints.length === 0}>
        <LwChart data={effectivenessPoints} kind="histogram" />
      </ChartCard>
      <ChartCard title="Proposal Timeline" empty={proposalPoints.length === 0}>
        <LwChart data={proposalPoints} kind="histogram" />
      </ChartCard>
    </section>
  );
}
