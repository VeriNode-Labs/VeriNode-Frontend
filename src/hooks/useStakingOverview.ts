'use client';

/**
 * useStakingOverview
 *
 * Fetches the full staking management dataset for the connected wallet:
 * overview stats, rewards history, unstake requests, yield settings,
 * and chart data. Uses @tanstack/react-query v5 with wallet-keyed queries.
 */

import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/src/hooks/useWallet';
import { flushGuard } from '@/src/hooks/flushGuard';
import { fetchStakingManagementData } from '@/src/services/stakingManagementService';
import type { StakingManagementData } from '@/src/types/staking';

export type { StakingManagementData };

export function useStakingOverview() {
  const { activeAccount, pendingAccountSwitch } = useWallet();
  const publicKey = activeAccount?.publicKey;

  const query = useQuery<StakingManagementData>({
    queryKey: ['staking-management', publicKey],
    queryFn: () => fetchStakingManagementData(publicKey!),
    enabled: !!publicKey && !pendingAccountSwitch,
    staleTime: 5 * 60 * 1000,
  });

  const guard = flushGuard(publicKey, activeAccount);
  if (guard.guardFailed || pendingAccountSwitch) {
    return {
      data: undefined as StakingManagementData | undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: query.refetch,
    };
  }

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
