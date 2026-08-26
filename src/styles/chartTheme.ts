import type { ResolvedTheme } from './themes'

/**
 * Chart color tokens per resolved color scheme. Lightweight Charts (and
 * Chart.js) cannot read CSS custom properties directly for their canvas
 * layouts, so theme colors are resolved to concrete values and re-applied
 * via `chart.applyOptions()` when the theme changes (issue #169).
 */
export interface ChartTheme {
  /** Axis / label text color. */
  textColor: string
  /** Grid line color (translucent so it works over any surface). */
  gridColor: string
  /** Series line / bar color. */
  seriesColor: string
  /** Area gradient stops for area series. */
  areaTopColor: string
  areaBottomColor: string
  /** Status colors used for colored bars. */
  success: string
  destructive: string
  warning: string
}

export const chartThemes: Record<ResolvedTheme, ChartTheme> = {
  light: {
    textColor: '#71717a',
    gridColor: 'rgba(113, 113, 122, 0.12)',
    seriesColor: '#2563eb',
    areaTopColor: 'rgba(37, 99, 235, 0.35)',
    areaBottomColor: 'rgba(37, 99, 235, 0.02)',
    success: '#16a34a',
    destructive: '#dc2626',
    warning: '#d97706',
  },
  dark: {
    textColor: '#a1a1aa',
    gridColor: 'rgba(161, 161, 170, 0.15)',
    seriesColor: '#60a5fa',
    areaTopColor: 'rgba(96, 165, 250, 0.35)',
    areaBottomColor: 'rgba(96, 165, 250, 0.02)',
    success: '#4ade80',
    destructive: '#f87171',
    warning: '#fbbf24',
  },
}

export function getChartTheme(resolvedTheme: ResolvedTheme): ChartTheme {
  return chartThemes[resolvedTheme]
}
