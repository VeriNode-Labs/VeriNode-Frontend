'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  isThemeMode,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '@/src/styles/themes'

interface ThemeContextValue {
  /** User-selected mode: 'system' | 'light' | 'dark' | 'hc-dark' | 'hc-light'. */
  theme: ThemeMode
  /** Set the user-selected mode. Persists to localStorage. */
  setTheme: (theme: ThemeMode) => void
  /** Effective color scheme ('light' | 'dark') after resolving 'system'. */
  resolvedTheme: ResolvedTheme
  /** @deprecated Use `theme` / `setTheme` instead. */
  themeMode: ThemeMode
  /** @deprecated Use `theme` / `setTheme` instead. */
  setThemeMode: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_MODE
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE
  } catch {
    return DEFAULT_THEME_MODE
  }
}

function readSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

/** Subscribe to OS `prefers-color-scheme` changes (external store). */
function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readStoredTheme())

  // Live OS `prefers-color-scheme` value. Consumed only while in 'system'
  // mode; subscribing unconditionally keeps the subscription simple and lets
  // resolvedTheme update the moment the user switches to 'system'.
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    readSystemPrefersDark,
    () => false,
  )

  const resolvedTheme = useMemo<ResolvedTheme>(
    () => resolveTheme(themeMode, systemPrefersDark),
    [themeMode, systemPrefersDark],
  )

  // Apply the theme to <html> and persist the selection. `theme-transitioning`
  // is added around the switch so colors animate smoothly (see globals.css).
  useEffect(() => {
    const root = document.documentElement
    const datasetTheme =
      themeMode === 'hc-dark' || themeMode === 'hc-light' ? themeMode : resolvedTheme

    const apply = () => {
      root.dataset.theme = datasetTheme
      root.classList.toggle('dark', resolvedTheme === 'dark')
      root.style.colorScheme = resolvedTheme
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
      } catch {
        // Storage may be unavailable (e.g. private browsing); the in-memory
        // selection still applies for this session.
      }
    }

    // Nothing to animate when the applied theme did not change (including the
    // initial mount, where the pre-hydration script already set the attribute).
    if (root.dataset.theme === datasetTheme) {
      apply()
      return
    }

    root.classList.add('theme-transitioning')
    let timeoutId: number | undefined

    const commit = () => {
      apply()
      timeoutId = window.setTimeout(() => {
        root.classList.remove('theme-transitioning')
      }, 350)
    }

    let rafId: number | undefined
    if (typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(commit)
    } else {
      commit()
    }

    return () => {
      if (rafId !== undefined) {
        window.cancelAnimationFrame(rafId)
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      root.classList.remove('theme-transitioning')
    }
  }, [themeMode, resolvedTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themeMode,
      setTheme: (nextTheme) => setThemeModeState(nextTheme),
      resolvedTheme,
      themeMode,
      setThemeMode: (nextTheme) => setThemeModeState(nextTheme),
    }),
    [themeMode, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
