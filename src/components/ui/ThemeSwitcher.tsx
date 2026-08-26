'use client'

import React, { useMemo, useState } from 'react'
import { contrastRatio, getThemeOptions } from '@/src/styles/themes'
import { useTheme } from '@/src/components/providers/ThemeProvider'

export function ThemeSwitcher() {
  const { theme: currentTheme, setTheme } = useTheme()
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null)
  const themes = useMemo(() => getThemeOptions(), [])

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Theme</p>
          <p className="text-xs text-muted-foreground">Switch between standard and high-contrast modes.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {themes.map((theme) => {
          const isActive = currentTheme === theme.id
          const ratio = contrastRatio(theme.colors.foreground, theme.colors.background)
          const showRatio = hoveredTheme === theme.id

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setTheme(theme.id)}
              onMouseEnter={() => setHoveredTheme(theme.id)}
              onMouseLeave={() => setHoveredTheme(null)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${isActive ? 'ring-2 ring-offset-2 ring-border-strong' : 'hover:border-border-strong'}`}
              style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
            >
              <span
                className="flex h-10 w-10 shrink-0 rounded-full border"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold" style={{ color: theme.colors.foreground }}>
                  {theme.label}
                </span>
                <span className="block text-xs" style={{ color: theme.colors.muted }}>
                  {theme.description}
                </span>
                {showRatio ? (
                  <span className="mt-1 block text-[11px] font-medium" style={{ color: theme.colors.primary }}>
                    Contrast {ratio.toFixed(1)}:1
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
