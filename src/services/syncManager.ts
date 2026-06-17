import { offlineStorage } from '@/src/services/localCache'
import { useSyncStore } from '@/src/stores/syncStore'

const SYNC_ENDPOINT = '/api/v1/inspections/sync'
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 2000

let syncInProgress = false

async function drainQueue(): Promise<void> {
  if (syncInProgress) return
  syncInProgress = true

  const store = useSyncStore.getState()
  store.setSyncing(true)
  store.setProgress(0)

  const total = await offlineStorage.peekQueue()
  if (total === 0) {
    store.setSyncing(false)
    store.setProgress(100)
    store.setLastSync(Date.now())
    syncInProgress = false
    return
  }

  let processed = 0

  while (processed < total) {
    const item = await offlineStorage.dequeueSubmission()
    if (!item) break

    let success = false
    for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
      try {
        const response = await fetch(SYNC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        })
        if (!response.ok) throw new Error(`Sync failed: ${response.status}`)
        success = true
      } catch {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
        }
      }
    }

    if (!success) {
      await offlineStorage.enqueueSubmission(item.data)
    }

    processed++
    store.setProgress(Math.round((processed / (processed + (total - processed))) * 100))
  }

  store.setSyncing(false)
  store.setProgress(100)
  store.setLastSync(Date.now())
  syncInProgress = false
}

export class NetworkAwareSyncManager {
  private onlineHandler: (() => void) | null = null
  private offlineHandler: (() => void) | null = null
  private pollingInterval: ReturnType<typeof setInterval> | null = null

  start(): void {
    this.onlineHandler = () => {
      useSyncStore.getState().setOnline(true)
      drainQueue()
    }

    this.offlineHandler = () => {
      useSyncStore.getState().setOnline(false)
    }

    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)

    useSyncStore.getState().setOnline(navigator.onLine)

    if (navigator.onLine) {
      drainQueue()
    }

    this.pollingInterval = setInterval(() => {
      if (navigator.onLine) {
        drainQueue()
      }
    }, 30000)
  }

  stop(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler)
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler)
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }
  }

  async submitOffline(payload: unknown): Promise<void> {
    await offlineStorage.enqueueSubmission(payload)
    useSyncStore.getState().setPendingCount(await offlineStorage.peekQueue())
  }
}

export const syncManager = new NetworkAwareSyncManager()
