'use client'

import { DegradableFeature } from '@/src/components/DegradableFeature';
import { ThemeSwitcher } from '@/src/components/ui/ThemeSwitcher';
import { SyncStatusBar } from '@/src/components/SyncStatusBar';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 p-4 font-sans dark:bg-black">
      <main id="main-content" className="flex w-full max-w-lg flex-col gap-6 rounded-xl bg-white p-8 shadow-sm dark:bg-zinc-900" aria-label="Home">
        <DegradableFeature feature="staking">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Submit Stake
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Submit your staking transaction to the Soroban network
          </p>
        </div>

        <div className="mb-6">
          <ThemeSwitcher />
        </div>
        </DegradableFeature>
      </main>

      <SyncStatusBar />
    </div>
  )
}
