// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { ThemeProvider } from '@/src/components/providers/ThemeProvider'
import { ThemeToggle } from '@/src/components/ui/ThemeToggle'
import { resolveTheme, isThemeMode } from '@/src/styles/themes'

// ---------------------------------------------------------------------------
// matchMedia mock — jsdom does not implement it natively.
// ---------------------------------------------------------------------------
interface MediaQueryListMock {
  matches: boolean
  media: string
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  addListener: ReturnType<typeof vi.fn>
  removeListener: ReturnType<typeof vi.fn>
  dispatch: (matches: boolean) => void
}

function installMatchMedia(initialMatches: boolean): MediaQueryListMock {
  const listeners = new Set<(event: { matches: boolean }) => void>()
  const mql: MediaQueryListMock = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((_type: string, cb: (event: { matches: boolean }) => void) => {
      listeners.add(cb)
    }),
    removeEventListener: vi.fn((_type: string, cb: (event: { matches: boolean }) => void) => {
      listeners.delete(cb)
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatch: (matches: boolean) => {
      mql.matches = matches
      listeners.forEach((cb) => cb({ matches }))
    },
  }
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia
  return mql
}

const THEME_STORAGE_KEY = 'verinode-theme'

/**
 * The ThemeProvider animates theme switches inside a requestAnimationFrame
 * callback (vitest's jsdom polyfill schedules it ~16ms later). This helper
 * flushes pending rAF callbacks and state updates so assertions see the
 * fully-applied theme.
 */
async function flushThemeChanges(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25))
  })
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.matchMedia = undefined as unknown as typeof window.matchMedia
})

describe('theme resolution utilities', () => {
  it('resolves explicit light and dark modes without touching the system preference', () => {
    expect(resolveTheme('light', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('hc-light', true)).toBe('light')
    expect(resolveTheme('hc-dark', true)).toBe('dark')
  })

  it('resolves system mode from the OS prefers-color-scheme preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme(undefined, false)).toBe('light')
  })

  it('validates stored mode strings', () => {
    expect(isThemeMode('system')).toBe(true)
    expect(isThemeMode('light')).toBe(true)
    expect(isThemeMode('dark')).toBe(true)
    expect(isThemeMode('hc-dark')).toBe(true)
    expect(isThemeMode('hc-light')).toBe(true)
    expect(isThemeMode('sepia')).toBe(false)
    expect(isThemeMode(null)).toBe(false)
  })
})

describe('ThemeProvider', () => {
  beforeEach(() => {
    installMatchMedia(false)
  })

  it('applies the stored theme to <html> on mount', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    await flushThemeChanges()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('falls back to the OS preference when nothing is stored', async () => {
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    await flushThemeChanges()

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('follows OS preference changes while in system mode', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system')
    const mql = installMatchMedia(false)
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    await flushThemeChanges()

    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => {
      mql.dispatch(true)
    })
    await flushThemeChanges()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists the selection to localStorage when the theme changes', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )
    await flushThemeChanges()

    fireEvent.click(screen.getByTestId('theme-toggle'))
    await flushThemeChanges()

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('applies high-contrast themes verbatim as the data-theme attribute', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'hc-dark')
    render(
      <ThemeProvider>
        <div />
      </ThemeProvider>,
    )
    await flushThemeChanges()

    expect(document.documentElement.dataset.theme).toBe('hc-dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    installMatchMedia(false)
  })

  it('cycles system -> light -> dark -> system on click', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    const toggle = screen.getByTestId('theme-toggle')
    expect(toggle.getAttribute('aria-label')).toContain('System')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-label')).toContain('Light')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-label')).toContain('Dark')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-label')).toContain('System')
  })

  it('renders distinct icons per mode', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    const svg = container.querySelector('[data-testid="theme-toggle"] svg')
    expect(svg).toBeTruthy()

    // Moon icon (dark) path marker: the moon path contains "a6 6 0 0 0".
    expect(svg?.innerHTML).toContain('a6 6 0 0 0')
  })
})
