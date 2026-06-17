'use client'

import { useEffect, useState, useCallback } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setWasOffline(true)
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(() => {
      const current = navigator.onLine
      if (current !== isOnline) {
        setIsOnline(current)
        if (!current) setWasOffline(true)
      }
    }, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [handleOnline, handleOffline, isOnline])

  return { isOnline, wasOffline }
}
