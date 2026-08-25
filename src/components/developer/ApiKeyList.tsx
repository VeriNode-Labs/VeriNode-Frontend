'use client'

import { useEffect, useState } from 'react'
import { useApiKeyStore } from '@/src/store/apiKeyStore'
import type { ApiKey } from '@/src/types/apiKey'

function formatDate(ms: number | null): string {
  if (ms === null) return 'Never'
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatusBadge({ status }: { status: ApiKey['status'] }) {
  const isActive = status === 'active'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
      }`}
    >
      {isActive ? 'Active' : 'Revoked'}
    </span>
  )
}

export function ApiKeyList() {
  const { keys, isLoading, error, fetchKeys, revokeKey } = useApiKeyStore()
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleRevoke(id: string) {
    setPendingRevoke(id)
    await revokeKey(id)
    setPendingRevoke(null)
  }

  if (isLoading && keys.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Loading API keys…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (keys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No API keys yet</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Create one to start calling the API.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Scopes</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Last used</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {keys.map((key) => (
            <tr key={key.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{key.name}</div>
                <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{key.keyPreview}</div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(key.createdAt)}</td>
              <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(key.lastUsedAt)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={key.status} />
              </td>
              <td className="px-4 py-3 text-right">
                {key.status === 'active' ? (
                  <button
                    onClick={() => handleRevoke(key.id)}
                    disabled={pendingRevoke === key.id}
                    className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {pendingRevoke === key.id ? 'Revoking…' : 'Revoke'}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}