// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNetworkEventLog } from '@/src/hooks/useNetworkHealthDashboard'
import type { NetworkEvent } from '@/src/types/networkHealth'

// ---------------------------------------------------------------------------
// Mock webSocketManager
// ---------------------------------------------------------------------------

type AcquireConfig = {
  connectionId: string
  url: string
  enabled: boolean
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (msg: string) => void
  onMessage?: (data: unknown) => void
}

const releaseRef = { current: vi.fn() }
const mockAcquire = vi.fn((_config: AcquireConfig) => releaseRef.current)

vi.mock('@/src/services/webSocketManager', () => ({
  webSocketManager: {
    acquireConnection: (config: AcquireConfig) => mockAcquire(config),
    retryConnection: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(id: string, overrides?: Partial<NetworkEvent>): NetworkEvent {
  return {
    id,
    type: 'node_join',
    nodeId: `node-${id}`,
    nodeLabel: `Node ${id}`,
    message: `Node ${id} joined the network`,
    timestamp: Date.now(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNetworkEventLog', () => {
  const WS_URL = 'wss://test.example.com/ws/network-events'

  beforeEach(() => {
    mockAcquire.mockClear()
    releaseRef.current = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('opens a WebSocket connection on mount', () => {
    renderHook(() => useNetworkEventLog(WS_URL))
    expect(mockAcquire).toHaveBeenCalledOnce()
    const cfg = mockAcquire.mock.calls[0][0]
    expect(cfg.url).toBe(WS_URL)
    expect(cfg.enabled).toBe(true)
  })

  it('releases the connection on unmount', () => {
    const { unmount } = renderHook(() => useNetworkEventLog(WS_URL))
    unmount()
    expect(releaseRef.current).toHaveBeenCalledOnce()
  })

  it('starts with demo events pre-populated', () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    expect(result.current.events.length).toBeGreaterThan(0)
  })

  it('starts as disconnected', () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    expect(result.current.isConnected).toBe(false)
  })

  it('sets isConnected true on onConnected callback', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onConnected?.()
    })

    await waitFor(() => expect(result.current.isConnected).toBe(true))
  })

  it('sets isConnected false on onDisconnected callback', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onConnected?.()
    })
    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onDisconnected?.()
    })
    await waitFor(() => expect(result.current.isConnected).toBe(false))
  })

  it('surfaces WS errors in the error field', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onError?.('Auth rejected')
    })
    await waitFor(() => expect(result.current.error).toBe('Auth rejected'))
  })

  it('clears error on successful reconnect', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onError?.('Connection reset')
    })
    await waitFor(() => expect(result.current.error).toBe('Connection reset'))

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onConnected?.()
    })
    await waitFor(() => expect(result.current.error).toBeNull())
  })

  it('prepends a single network-event message to the log', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    const prevLength = result.current.events.length

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.({ type: 'network-event', data: makeEvent('msg-1') })
    })

    await waitFor(() => expect(result.current.events.length).toBe(prevLength + 1))
    expect(result.current.events[0].id).toBe('msg-1')
  })

  it('prepends a batch of events via network-event-batch', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    const prevLength = result.current.events.length

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.({
        type: 'network-event-batch',
        data: [makeEvent('b-1'), makeEvent('b-2'), makeEvent('b-3')],
      })
    })

    await waitFor(() => expect(result.current.events.length).toBe(prevLength + 3))
  })

  it('deduplicates events with the same id', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    const initialLength = result.current.events.length
    const event = makeEvent('dup-1')

    // First send – should add
    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.({ type: 'network-event', data: event })
    })
    await waitFor(() => expect(result.current.events.length).toBe(initialLength + 1))

    // Second send – same id – should be filtered
    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.({ type: 'network-event', data: event })
    })
    await waitFor(() => expect(result.current.events.length).toBe(initialLength + 1))
  })

  it('deduplicates across a catch-up batch that contains already-seen ids', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    const initialLength = result.current.events.length

    const event1 = makeEvent('catchup-1')
    const event2 = makeEvent('catchup-2')
    const event3 = makeEvent('catchup-3')

    // Receive event1 before disconnect
    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.({ type: 'network-event', data: event1 })
    })
    await waitFor(() => expect(result.current.events.length).toBe(initialLength + 1))

    // Reconnect burst – includes event1 (already seen) and 2 new ones
    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.({
        type: 'network-event-batch',
        data: [event1, event2, event3],
      })
    })
    // Should add exactly 2 new events (event2 and event3)
    await waitFor(() => expect(result.current.events.length).toBe(initialLength + 3))
  })

  it('caps the event log at 200 entries', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))

    const bigBatch = Array.from({ length: 250 }, (_, i) => makeEvent(`cap-evt-${i}`))
    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.({ type: 'network-event-batch', data: bigBatch })
    })

    await waitFor(() => expect(result.current.events.length).toBeLessThanOrEqual(200))
  })

  it('ignores malformed WS messages without throwing', async () => {
    const { result } = renderHook(() => useNetworkEventLog(WS_URL))
    const prevLength = result.current.events.length

    act(() => {
      const cfg = mockAcquire.mock.calls[0][0]
      cfg.onMessage?.('not-a-typed-message')
    })

    expect(result.current.events.length).toBe(prevLength)
    expect(result.current.error).toBeNull()
  })
})
