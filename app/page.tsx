'use client'

import { DegradableFeature } from '@/src/components/DegradableFeature';
import { ThemeSwitcher } from '@/src/components/ui/ThemeSwitcher';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';
import { SyncStatusBar } from '@/src/components/SyncStatusBar';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 font-sans">
      <main id="main-content" className="flex w-full max-w-lg flex-col gap-6 rounded-xl bg-surface p-8 shadow-card" aria-label="Home">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Submit Stake
          </h1>
          <ThemeToggle />
        </div>

        <DegradableFeature feature="staking">
          <div className="flex flex-col gap-4">
            <p className="mt-1 text-sm text-muted-foreground">
              Submit your staking transaction to the Soroban network
            </p>

            <div className="mb-6">
              <ThemeSwitcher />
            </div>
          </div>
        </DegradableFeature>
      </main>

      <SyncStatusBar />
    </div>
  )
}
