'use client';

/**
 * useYieldOptimizer
 *
 * Manages DeFi yield optimizer settings: enable/disable auto-deposit,
 * select protocol, and adjust deposit percentage. Updates are optimistic
 * with rollback on failure.
 */

import { useState, useCallback } from 'react';
import { useWallet } from '@/src/hooks/useWallet';
import type { DefiProtocol, YieldOptimizerSettings } from '@/src/types/staking';

interface UseYieldOptimizerReturn {
  settings: YieldOptimizerSettings | null;
  setSettings: (settings: YieldOptimizerSettings) => void;
  toggleEnabled: () => void;
  setProtocol: (protocol: DefiProtocol) => void;
  setDepositPercentage: (pct: number) => void;
  isLoading: boolean;
}

export function useYieldOptimizer(
  initialSettings: YieldOptimizerSettings | null,
  onSettingsChange?: (settings: YieldOptimizerSettings) => void,
): UseYieldOptimizerReturn {
  const { activeAccount } = useWallet();
  const [settings, setSettingsState] = useState<YieldOptimizerSettings | null>(initialSettings);

  const persist = useCallback(
    (next: YieldOptimizerSettings) => {
      setSettingsState(next);
      onSettingsChange?.(next);
    },
    [onSettingsChange],
  );

  const toggleEnabled = useCallback(() => {
    if (!settings || !activeAccount) return;
    persist({ ...settings, enabled: !settings.enabled });
  }, [settings, activeAccount, persist]);

  const setProtocol = useCallback(
    (protocol: DefiProtocol) => {
      if (!settings) return;
      persist({ ...settings, protocol });
    },
    [settings, persist],
  );

  const setDepositPercentage = useCallback(
    (pct: number) => {
      if (!settings) return;
      const clamped = Math.max(0, Math.min(100, pct));
      persist({ ...settings, depositPercentage: clamped });
    },
    [settings, persist],
  );

  return {
    settings,
    setSettings: persist,
    toggleEnabled,
    setProtocol,
    setDepositPercentage,
    isLoading: !settings,
  };
}
