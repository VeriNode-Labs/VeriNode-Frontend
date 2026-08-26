'use client'

import React from 'react'
import { useTheme } from '@/src/components/providers/ThemeProvider'
import type { ThemeMode } from '@/src/styles/themes'

const MODE_LABELS: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  'hc-dark': 'High contrast dark',
  'hc-light': 'High contrast light',
}

const CYCLE_ORDER: ThemeMode[] = ['system', 'light', 'dark']

function nextMode(current: ThemeMode): ThemeMode {
  // High-contrast modes participate in the cycle from their resolved base.
  const index = CYCLE_ORDER.indexOf(current === 'hc-dark' || current === 'hc-light' ? (current === 'hc-dark' ? 'dark' : 'light') : current)
  return CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length]
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

/**
 * Theme toggle button that cycles System -> Light -> Dark.
 * Shows a sun, moon, or monitor icon for the current selection.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const target = nextMode(theme)

  const Icon = theme === 'system' ? MonitorIcon : theme === 'dark' || theme === 'hc-dark' ? MoonIcon : SunIcon

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      onClick={() => setTheme(target)}
      aria-label={`Theme: ${MODE_LABELS[theme]}. Switch to ${MODE_LABELS[target]}.`}
      title={`Theme: ${MODE_LABELS[theme]} — click to switch to ${MODE_LABELS[target]}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <Icon />
    </button>
  )
}
