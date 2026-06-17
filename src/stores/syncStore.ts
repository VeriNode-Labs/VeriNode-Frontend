import { create } from 'zustand'

export interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  progress: number
  lastSync: number | null
  setOnline: (online: boolean) => void
  setSyncing: (syncing: boolean) => void
  setPendingCount: (count: number) => void
  setProgress: (progress: number) => void
  setLastSync: (timestamp: number) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  progress: 0,
  lastSync: null,
  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setProgress: (progress) => set({ progress }),
  setLastSync: (timestamp) => set({ lastSync: timestamp }),
}))
