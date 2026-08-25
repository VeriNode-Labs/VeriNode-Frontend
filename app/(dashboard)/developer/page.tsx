import { ApiKeyCreate } from '@/src/components/developer/ApiKeyCreate'
import { ApiKeyList } from '@/src/components/developer/ApiKeyList'
import { UsageDashboard } from '@/src/components/developer/UsageDashboard'

export default function DeveloperPortalPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Developer portal</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage API keys, monitor usage, and test endpoints.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="api-keys-heading" className="min-w-0">
          <h2 id="api-keys-heading" className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            API keys
          </h2>
          <ApiKeyList />
        </section>

        <aside>
          <ApiKeyCreate />
        </aside>
      </div>

      <section aria-labelledby="usage-heading">
        <h2 id="usage-heading" className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Usage
        </h2>
        <UsageDashboard />
      </section>
    </div>
  )
}