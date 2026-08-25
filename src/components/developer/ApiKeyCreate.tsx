'use client'

import { useState } from 'react'
import { useApiKeyStore } from '@/src/store/apiKeyStore'
import type { ApiKeyScope } from '@/src/types/apiKey'
import { ScopeCheckboxGroup } from './ScopeCheckboxGroup'

export function ApiKeyCreate() {
  const { createKey, justCreated, clearJustCreated, isLoading } = useApiKeyStore()
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiKeyScope[]>([])
  const [copied, setCopied] = useState(false)

  const canSubmit = name.trim().length > 0 && scopes.length > 0 && !isLoading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await createKey(name.trim(), scopes)
    setName('')
    setScopes([])
  }

  async function handleCopy() {
    if (!justCreated) return
    await navigator.clipboard.writeText(justCreated.secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setCopied(false)
    clearJustCreated()
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Create API key</h3>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        The key secret is shown once. Store it somewhere safe — it can&apos;t be retrieved again.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="api-key-name" className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Name
          </label>
          <input
            id="api-key-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production backend"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        <ScopeCheckboxGroup selected={scopes} onChange={setScopes} />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isLoading ? 'Creating…' : 'Create key'}
        </button>
      </form>

      {justCreated ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="key-created-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <h2 id="key-created-title" className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Key created
            </h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Copy <span className="font-semibold">{justCreated.name}</span> now — this is the only time it&apos;s
              shown.
            </p>

            <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
              <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-zinc-900 dark:text-zinc-50">
                {justCreated.secret}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}