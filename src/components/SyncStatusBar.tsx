'use client'

import { useSyncStore } from '@/src/stores/syncStore'

export function SyncStatusBar() {
  const isOnline = useSyncStore((s) => s.isOnline)
  const isSyncing = useSyncStore((s) => s.isSyncing)
  const pendingCount = useSyncStore((s) => s.pendingCount)
  const progress = useSyncStore((s) => s.progress)
  const lastSync = useSyncStore((s) => s.lastSync)

  return (
    <div className="fixed bottom-0 left-0 right-z-50 flex h-10 items-center justify-between border-t bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-zinc-600 dark:text-zinc-400">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {!isOnline && pendingCount > 0 && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isSyncing && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500">{progress}%</span>
          </div>
        )}
        {lastSync && (
          <span className="text-xs text-zinc-400">
            Last sync: {new Date(lastSync).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}
