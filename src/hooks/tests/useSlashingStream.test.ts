// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSlashingStream } from '@/src/hooks/useSlashingStream'
import type { SlashingEvent } from '@/src/types/slashing'

/**
 * Test suite for useSlashingStream hook focusing on WebSocket reconnection
 * and deduplication of catch-up events.
 *
 * This test simulates the scenario described in the issue:
 * - WebSocket reconnects after 2-second disconnect
 * - Server sends 3 events during disconnection
 * - Catch-up burst includes those 3 events
 * - Client should display exactly 3 unique events (no duplicates)
 */
describe('useSlashingStream', () => {
  let wsServer: MockWebSocketServer
  let originalWebSocket: typeof WebSocket

  beforeEach(() => {
    // Mock WebSocket
    originalWebSocket = global.WebSocket as typeof WebSocket

    // Create mock WebSocket server
    wsServer = new MockWebSocketServer()
    ;(global as unknown as Record<string, unknown>).WebSocket = wsServer.ClientConstructor
  })

  afterEach(() => {
    // Restore original WebSocket
    ;(global as unknown as Record<string, unknown>).WebSocket = originalWebSocket
    wsServer.cleanup()
    vi.clearAllMocks()
  })

  it('should display exactly 3 unique events after WebSocket reconnection with catch-up', async () => {
    const { result } = renderHook(() =>
      useSlashingStream({
        url: 'ws://localhost:8080/slashing',
        enabled: true,
      })
    )

    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })

    // Simulate: Client receives 1 event before disconnect
    const event1: SlashingEvent = createMockEvent('1', 'node-1', 100)
    act(() => {
      wsServer.simulateMessage(event1)
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1)
      expect(result.current.events[0].id).toBe('1')
    })

    // Simulate: 2-second network disconnect
    act(() => {
      wsServer.simulateDisconnect()
    })

    await waitFor(() => {
      expect(result.current.connected).toBe(false)
    })

    // Simulate: Server generates 3 more events during disconnect
    const event2: SlashingEvent = createMockEvent('2', 'node-2', 200)
    const event3: SlashingEvent = createMockEvent('3', 'node-3', 300)

    // Simulate: After 2 seconds, client reconnects
    act(() => {
      wsServer.simulateReconnect()
    })

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })

    // Simulate: Server sends catch-up burst with event 1 (partial overlap) + event 2 + event 3
    act(() => {
      // These are the catch-up events - includes event 1 which client already has
      wsServer.simulateMessage(event1) // Duplicate from before disconnect
      wsServer.simulateMessage(event2)
      wsServer.simulateMessage(event3)
    })

    // Wait for all events to be processed
    await waitFor(() => {
      expect(result.current.events).toHaveLength(3)
    })

    // Verify: Exactly 3 unique events (no duplicates)
    expect(result.current.events).toHaveLength(3)
    expect(new Set(result.current.events.map((e) => e.id)).size).toBe(3)
    expect(result.current.events.map((e) => e.id)).toEqual(expect.arrayContaining(['1', '2', '3']))
  })

  it('should handle rapid duplicate arrivals', async () => {
    const { result } = renderHook(() =>
      useSlashingStream({
        url: 'ws://localhost:8080/slashing',
        enabled: true,
      })
    )

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })

    const event: SlashingEvent = createMockEvent('1', 'node-1', 100)

    // Send the same event 5 times rapidly
    act(() => {
      for (let i = 0; i < 5; i++) {
        wsServer.simulateMessage(event)
      }
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1)
    })

    // Verify: Only 1 event despite 5 sends
    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0].id).toBe('1')
  })

  it('should maintain dedup across multiple reconnections', async () => {
    const { result } = renderHook(() =>
      useSlashingStream({
        url: 'ws://localhost:8080/slashing',
        enabled: true,
      })
    )

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })

    const event1: SlashingEvent = createMockEvent('1', 'node-1', 100)
    const event2: SlashingEvent = createMockEvent('2', 'node-2', 200)

    // First connection: receive event1
    act(() => {
      wsServer.simulateMessage(event1)
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(1)
    })

    // Disconnect and reconnect
    act(() => {
      wsServer.simulateDisconnect()
    })

    await waitFor(() => {
      expect(result.current.connected).toBe(false)
    })

    act(() => {
      wsServer.simulateReconnect()
    })

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })

    // Catch-up includes event1 (duplicate) and event2 (new)
    act(() => {
      wsServer.simulateMessage(event1)
      wsServer.simulateMessage(event2)
    })

    await waitFor(() => {
      expect(result.current.events).toHaveLength(2)
    })

    // Verify: 2 unique events
    expect(result.current.events).toHaveLength(2)
    expect(new Set(result.current.events.map((e) => e.id)).size).toBe(2)
  })

  it('should respect dedup TTL window', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useSlashingStream({
        url: 'ws://localhost:8080/slashing',
        enabled: true,
        dedupWindowMs: 1000, // 1 second TTL for testing
      })
    )

    // Flush pending microtasks (React effects + mock WS onopen) so
    // `connected` becomes true. `waitFor` deadlocks under fake timers
    // because it relies on real-timer retries that are now frozen.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.connected).toBe(true)

    const event: SlashingEvent = createMockEvent('1', 'node-1', 100)

    // Send event
    act(() => {
      wsServer.simulateMessage(event)
    })

    expect(result.current.events).toHaveLength(1)

    // Try to send duplicate immediately - should be filtered
    act(() => {
      wsServer.simulateMessage(event)
    })

    expect(result.current.events).toHaveLength(1)

    // Advance time past TTL and flush microtasks
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100)
    })

    // Send the same event again after TTL expires - should be allowed
    act(() => {
      wsServer.simulateMessage(event)
    })

    expect(result.current.events).toHaveLength(2)

    vi.useRealTimers()
  })
})

// ============================================================================
// Mock WebSocket Server
// ============================================================================

class MockWebSocketServer {
  private clients: Set<MockWebSocket> = new Set()
  private messageQueue: SlashingEvent[] = []

  ClientConstructor = vi.fn((url: string) => {
    const client = new MockWebSocket(url, this)
    this.clients.add(client)
    return client
  })

  simulateMessage(event: SlashingEvent) {
    this.clients.forEach((client) => {
      if (client.readyState === 1) {
        // OPEN
        client.simulateMessage(event)
      }
    })
  }

  simulateDisconnect() {
    this.clients.forEach((client) => {
      client.readyState = 3 // CLOSED
      client.onclose?.(new CloseEvent('close', { code: 1000, reason: 'mock-disconnect' }))
    })
  }

  simulateReconnect() {
    this.clients.forEach((client) => {
      if (client.readyState === 3) {
        client.readyState = 0 // CONNECTING
        setTimeout(() => {
          client.readyState = 1 // OPEN
          client.onopen?.(new Event('open'))
        }, 50)
      }
    })
  }

  cleanup() {
    this.clients.clear()
    this.messageQueue = []
  }
}

class MockWebSocket extends EventTarget {
  readyState: number = 0
  url: string
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(url: string, private server: MockWebSocketServer) {
    super()
    this.url = url
    this.readyState = 1 // OPEN
    setTimeout(() => {
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    void data;
    // In a real implementation, this would send to server
  }

  close() {
    this.readyState = 3 // CLOSED
  }

  simulateMessage(event: SlashingEvent) {
    if (this.readyState === 1) {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(event),
      })
      this.onmessage?.(messageEvent)
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function createMockEvent(
  id: string,
  nodeId: string,
  timestamp: number,
  overrides?: Partial<SlashingEvent>
): SlashingEvent {
  return {
    id,
    nodeId,
    timestamp,
    amount: 0.1,
    slot: 1000,
    epoch: 31,
    seq: parseInt(id),
    ...overrides,
  }
}
