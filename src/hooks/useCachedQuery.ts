'use client'

import { useEffect, useState, useCallback } from 'react'
import { offlineStorage } from '@/src/services/localCache'

interface CachedQueryState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  isStale: boolean
}

export function useCachedQuery<T>(
  queryKey: string,
  fetcher: () => Promise<T>,
  ttlMinutes: number = 5
): CachedQueryState<T> {
  const [state, setState] = useState<CachedQueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
    isStale: false,
  })

  const fetchFromNetwork = useCallback(async () => {
    try {
      const freshData = await fetcher()
      await offlineStorage.setCached(queryKey, freshData, ttlMinutes)
      setState({ data: freshData, isLoading: false, error: null, isStale: false })
      return freshData
    } catch {
      return null
    }
  }, [queryKey, fetcher, ttlMinutes])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const cached = await offlineStorage.getCached(queryKey)

      if (cached && !cancelled) {
        setState({
          data: cached.data as T,
          isLoading: false,
          error: null,
          isStale: true,
        })
      }

      if (navigator.onLine) {
        try {
          const freshData = await fetcher()
          if (!cancelled) {
            await offlineStorage.setCached(queryKey, freshData, ttlMinutes)
            setState({ data: freshData, isLoading: false, error: null, isStale: false })
          }
        } catch (err) {
          if (!cancelled && !cached) {
            setState({ data: null, isLoading: false, error: err as Error, isStale: false })
          }
        }
      } else {
        if (!cancelled && cached) {
          setState((prev) => ({ ...prev, isLoading: false }))
        } else if (!cancelled) {
          setState({ data: null, isLoading: false, error: new Error('No network and no cached data'), isStale: false })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [queryKey, fetcher, ttlMinutes, fetchFromNetwork])

  return state
}
