'use client'

import { useEffect, useRef, useState } from 'react'
import { webSocketManager } from '@/services/webSocketManager'

interface UseWebSocketReconnectOptions {
  url: string
  enabled?: boolean
  /**
   * Stable identifier used for multi-connection health scoring.
   * When omitted, defaults to `url`.
   */
  connectionId?: string
  onMessage?: (data: unknown, headers: Record<string, string>) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: string) => void
}

/**
 * Hook to manage WebSocket connection with automatic reconnection and catch-up support.
 *
 * Features:
 * - Automatic reconnection with tiered strategy (health scoring)
 * - Sends last received event ID to server on reconnect
 * - Handles catch-up burst from server (x-catchup-from header)
 * - Deduplication through event ID headers
 */
export function useWebSocketReconnect({
  url,
  enabled = true,
  connectionId,
  onMessage,
  onConnected,
  onDisconnected,
  onError,
}: UseWebSocketReconnectOptions) {
  // -------------------------
  // State
  // -------------------------
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastEventId, setLastEventId] = useState<string | null>(null)

  // -------------------------
  // Connection helpers
  // -------------------------
  const lastEventIdRef = useRef<string | null>(null)
  const releaseRef = useRef<null | (() => void)>(null)

  // Keep latest callbacks without reconnecting the socket.
  const onMessageRef = useRef(onMessage)
  const onConnectedRef = useRef(onConnected)
  const onDisconnectedRef = useRef(onDisconnected)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onConnectedRef.current = onConnected
    onDisconnectedRef.current = onDisconnected
    onErrorRef.current = onError
  }, [onMessage, onConnected, onDisconnected, onError])

  useEffect(() => {
    if (!enabled || !url) return
    if (typeof window === 'undefined') return

    const effectiveConnectionId = connectionId ?? url

    releaseRef.current?.()
    releaseRef.current = webSocketManager.acquireConnection({
      connectionId: effectiveConnectionId,
      url,
      enabled: true,
      onMessage: (data, headers) => {
        if (data && typeof data === 'object' && 'id' in (data as Record<string, unknown>)) {
          const id = (data as Record<string, unknown>).id
          if (typeof id === 'string') {
            lastEventIdRef.current = id
            setLastEventId(id)
          }
        }
        onMessageRef.current?.(data, headers)
      },
      onConnected: () => {
        setConnected(true)
        setError(null)
        onConnectedRef.current?.()
      },
      onDisconnected: () => {
        setConnected(false)
        onDisconnectedRef.current?.()
      },
      onError: (errMsg) => {
        setError(errMsg)
        onErrorRef.current?.(errMsg)
      },
      onOpen: (ws) => {
        const openState = typeof WebSocket.OPEN === 'number' ? WebSocket.OPEN : 1
        if (lastEventIdRef.current && ws.readyState === openState) {
          ws.send(
            JSON.stringify({
              type: 'sync',
              lastEventId: lastEventIdRef.current,
            }),
          )
        }
      },
    })

    return () => {
      releaseRef.current?.()
      releaseRef.current = null
    }
  }, [url, enabled, connectionId])

  // Stable cleanup function for existing callers.
  const cleanup = () => {
    releaseRef.current?.();
    releaseRef.current = null;
    setConnected(false);
  }

  return {
    connected,
    error,
    lastEventId,
    cleanup,
  }
}
