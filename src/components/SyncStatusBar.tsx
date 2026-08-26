'use client'

import { useSyncStore } from '@/src/stores/syncStore'
import { DatabaseHealthBar } from '@/src/components/common/DatabaseHealthBar'

export function SyncStatusBar() {
  const isOnline = useSyncStore((s) => s.isOnline)
  const isSyncing = useSyncStore((s) => s.isSyncing)
  const pendingCount = useSyncStore((s) => s.pendingCount)
  const progress = useSyncStore((s) => s.progress)
  const lastSync = useSyncStore((s) => s.lastSync)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-10 items-center justify-between border-t border-border bg-surface px-4 text-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-muted-foreground">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {!isOnline && pendingCount > 0 && (
          <span className="rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isSyncing && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-active">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
        {lastSync && (
          <span className="text-xs text-muted-foreground">
            Last sync: {new Date(lastSync).toLocaleTimeString()}
          </span>
        )}
        <DatabaseHealthBar />
      </div>
    </div>
  )
}
