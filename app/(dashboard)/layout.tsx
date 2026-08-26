'use client';

import { SyncStatusBar } from '@/src/components/SyncStatusBar';
import { OfflineBanner } from '@/src/components/layout/OfflineBanner';
import { WSHealthTier3Banner } from '@/src/components/layout/WSHealthTier3Banner';
import { ThemeToggle } from '@/src/components/ui/ThemeToggle';

// Full dashboard layout — SyncStatusBar and OfflineBanner are only loaded
// for routes inside (dashboard), keeping the auth/login critical path lean.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background" role="application" aria-label="Dashboard">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 flex h-12 items-center justify-end border-b border-border bg-surface/90 px-4 backdrop-blur">
        <ThemeToggle />
      </header>
      <OfflineBanner />
      <WSHealthTier3Banner />
      <main id="main-content" aria-label="Main dashboard content">
        {children}
      </main>
      <SyncStatusBar />
    </div>
  );
}
