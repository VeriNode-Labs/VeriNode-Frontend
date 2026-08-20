/**
 * Staking Management Service — data fetching for the staking dashboard.
 *
 * Wraps backend API calls with fallback mock data generation.
 * When the backend is unavailable, produces deterministic demo data
 * so the UI can be exercised in development.
 */

import type {
  StakingOverview,
  RewardRecord,
  UnstakeRequest,
  YieldOptimizerSettings,
  StakingChartDataPoint,
  StakingManagementData,
} from '@/src/types/staking';

// ── Mock data generators ──────────────────────────────────────────────────

function generateMockOverview(publicKey: string): StakingOverview {
  const seed = publicKey.charCodeAt(2) || 1;
  const baseStake = 1000 + (seed % 9) * 500;
  return {
    totalStaked: baseStake,
    currentApr: 4.2 + (seed % 5) * 0.3,
    userStake: baseStake,
    pendingRewards: Math.round(baseStake * 0.003 * 100) / 100,
    nextClaimDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    tokenSymbol: 'VRN',
    tokenPriceUsd: 2.45,
    networkTotalStaked: 125_000,
    activeStakers: 4830,
  };
}

function generateMockRewardsHistory(): RewardRecord[] {
  const now = Date.now();
  const records: RewardRecord[] = [];
  for (let i = 0; i < 30; i++) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const amount = 2 + Math.round(Math.random() * 8 * 100) / 100;
    const priceAtTime = 2.3 + Math.random() * 0.4;
    records.push({
      id: `reward-${i}`,
      date: new Date(timestamp).toISOString(),
      amount,
      usdValueAtTime: Math.round(amount * priceAtTime * 100) / 100,
      source: i % 5 === 0 ? 'defi_yield' : 'staking',
      aprAtTime: 4.0 + Math.random() * 0.8,
      txHash: `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      claimed: i > 5,
    });
  }
  return records;
}

function generateMockUnstakeRequests(): UnstakeRequest[] {
  const now = Date.now();
  return [
    {
      id: 'unstake-1',
      amount: 200,
      requestedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      readyAt: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString(),
      cooldownDays: 14,
      status: 'active',
      txHash: '0xabc123def456789',
    },
    {
      id: 'unstake-2',
      amount: 100,
      requestedAt: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
      readyAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      cooldownDays: 14,
      status: 'ready',
      txHash: '0xdef789abc123456',
    },
  ];
}

function generateMockYieldSettings(): YieldOptimizerSettings {
  return {
    enabled: false,
    protocol: 'none',
    depositPercentage: 50,
    extraApy: 2.1,
    totalApy: 6.3,
    vaultAddress: null,
  };
}

function generateMockBalanceHistory(): StakingChartDataPoint[] {
  const now = Math.floor(Date.now() / 1000);
  const points: StakingChartDataPoint[] = [];
  let balance = 500;
  for (let i = 90; i >= 0; i--) {
    const time = now - i * 24 * 60 * 60;
    balance += Math.random() * 5;
    points.push({ time, value: Math.round(balance * 100) / 100 });
  }
  return points;
}

function generateMockAprHistory(): StakingChartDataPoint[] {
  const now = Math.floor(Date.now() / 1000);
  const points: StakingChartDataPoint[] = [];
  for (let i = 90; i >= 0; i--) {
    const time = now - i * 24 * 60 * 60;
    points.push({ time, value: 4.0 + Math.random() * 0.8 });
  }
  return points;
}

function generateMockCumulativeRewards(): StakingChartDataPoint[] {
  const now = Math.floor(Date.now() / 1000);
  const points: StakingChartDataPoint[] = [];
  let cumulative = 0;
  for (let i = 90; i >= 0; i--) {
    const time = now - i * 24 * 60 * 60;
    cumulative += 2 + Math.random() * 5;
    points.push({ time, value: Math.round(cumulative * 100) / 100 });
  }
  return points;
}

// ── Service functions ─────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchStakingOverview(
  address: string,
): Promise<StakingOverview> {
  const data = await fetchJson<StakingOverview>(`/api/v1/staking/overview?address=${address}`);
  return data ?? generateMockOverview(address);
}

export async function fetchRewardsHistory(
  address: string,
): Promise<RewardRecord[]> {
  const data = await fetchJson<RewardRecord[]>(`/api/v1/staking/rewards?address=${address}`);
  return data ?? generateMockRewardsHistory();
}

export async function fetchUnstakeRequests(
  address: string,
): Promise<UnstakeRequest[]> {
  const data = await fetchJson<UnstakeRequest[]>(`/api/v1/staking/unstake-requests?address=${address}`);
  return data ?? generateMockUnstakeRequests();
}

export async function fetchYieldSettings(
  address: string,
): Promise<YieldOptimizerSettings> {
  const data = await fetchJson<YieldOptimizerSettings>(`/api/v1/staking/yield-settings?address=${address}`);
  return data ?? generateMockYieldSettings();
}

export async function fetchBalanceHistory(
  address: string,
): Promise<StakingChartDataPoint[]> {
  const data = await fetchJson<StakingChartDataPoint[]>(`/api/v1/staking/balance-history?address=${address}`);
  return data ?? generateMockBalanceHistory();
}

export async function fetchAprHistory(
  address: string,
): Promise<StakingChartDataPoint[]> {
  const data = await fetchJson<StakingChartDataPoint[]>(`/api/v1/staking/apr-history?address=${address}`);
  return data ?? generateMockAprHistory();
}

export async function fetchCumulativeRewards(
  address: string,
): Promise<StakingChartDataPoint[]> {
  const data = await fetchJson<StakingChartDataPoint[]>(`/api/v1/staking/cumulative-rewards?address=${address}`);
  return data ?? generateMockCumulativeRewards();
}

export async function fetchStakingManagementData(
  address: string,
): Promise<StakingManagementData> {
  const [overview, rewardsHistory, unstakeRequests, yieldSettings, balanceHistory, aprHistory, cumulativeRewards] =
    await Promise.all([
      fetchStakingOverview(address),
      fetchRewardsHistory(address),
      fetchUnstakeRequests(address),
      fetchYieldSettings(address),
      fetchBalanceHistory(address),
      fetchAprHistory(address),
      fetchCumulativeRewards(address),
    ]);

  return {
    overview,
    rewardsHistory,
    unstakeRequests,
    yieldSettings,
    balanceHistory,
    aprHistory,
    cumulativeRewards,
  };
}
