'use client'

import { API_KEY_SCOPES, type ApiKeyScope } from '@/src/types/apiKey'

interface ScopeCheckboxGroupProps {
  selected: ApiKeyScope[]
  onChange: (scopes: ApiKeyScope[]) => void
}

const SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  'node:read': 'View node status and topology',
  'node:write': 'Register and configure nodes',
  'staking:read': 'View staking balances and rewards',
  'governance:read': 'View proposals and votes',
  'governance:write': 'Create proposals and cast votes',
  admin: 'Full account access — grants every scope above',
}

export function ScopeCheckboxGroup({ selected, onChange }: ScopeCheckboxGroupProps) {
  function toggle(scope: ApiKeyScope) {
    if (selected.includes(scope)) {
      onChange(selected.filter((s) => s !== scope))
    } else {
      onChange([...selected, scope])
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Permission scopes</legend>
      {API_KEY_SCOPES.map((scope) => (
        <label
          key={scope}
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 transition hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        >
          <input
            type="checkbox"
            checked={selected.includes(scope)}
            onChange={() => toggle(scope)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-500 dark:border-zinc-700"
          />
          <span className="min-w-0">
            <span className="block font-mono text-sm text-zinc-900 dark:text-zinc-50">{scope}</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{SCOPE_DESCRIPTIONS[scope]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}