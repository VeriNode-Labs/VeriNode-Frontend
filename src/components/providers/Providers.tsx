'use client';

import React from 'react';
import { QueryProvider } from '@/src/components/providers/QueryProvider';
import { WalletProvider } from '@/src/components/providers/WalletProvider';
import { ThemeProvider } from '@/src/components/providers/ThemeProvider';
import { DatabaseHealthProvider } from '@/src/components/providers/DatabaseHealthProvider';
import { I18nProvider } from '@/src/i18n';
import { useAuthStore } from '@/src/store/authStore';
import { useStakingStore } from '@/src/store/stakingStore';

function TestStoreExposer({ children }: { children: React.ReactNode }) {
  // Set synchronously during render so E2E tests can access
  // store APIs immediately after page.goto() resolves.
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.__TEST_STORES__ = {
      auth: useAuthStore,
      staking: useStakingStore,
    };
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryProvider>
          <WalletProvider>
            <DatabaseHealthProvider>
              <TestStoreExposer>
                {children}
              </TestStoreExposer>
            </DatabaseHealthProvider>
          </WalletProvider>
        </QueryProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
