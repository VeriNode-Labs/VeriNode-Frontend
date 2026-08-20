/**
 * Types for the Staking Management Interface with DeFi Integration (Issue #175).
 */

/** Source of a staking reward. */
export type RewardSource = 'staking' | 'defi_yield' | 'compound';

/** Status of an unstake cooldown. */
export type UnstakeCooldownStatus = 'pending' | 'active' | 'ready' | 'expired';

/** Supported DeFi yield protocols. */
export type DefiProtocol = 'aave' | 'compound' | 'none';

/** Staking overview data returned by /api/v1/staking/overview. */
export interface StakingOverview {
  /** Total VRN tokens staked by the user. */
  totalStaked: number;
  /** Current staking APR (%). */
  currentApr: number;
  /** User's current stake amount. */
  userStake: number;
  /** Pending rewards not yet claimed. */
  pendingRewards: number;
  /** Next reward claim date (ISO-8601). */
  nextClaimDate: string;
  /** Token symbol. */
  tokenSymbol: string;
  /** Current token price in USD. */
  tokenPriceUsd: number | null;
  /** Network total staked (for context). */
  networkTotalStaked: number;
  /** Number of active stakers. */
  activeStakers: number;
}

/** A single reward record in the history. */
export interface RewardRecord {
  id: string;
  /** ISO-8601 date when the reward was earned. */
  date: string;
  /** Reward amount in tokens. */
  amount: number;
  /** USD value at time of receipt. */
  usdValueAtTime: number | null;
  /** Source of the reward. */
  source: RewardSource;
  /** APR at the time the reward was earned. */
  aprAtTime: number;
  /** Transaction hash (may be empty). */
  txHash: string;
  /** Whether this reward has been claimed. */
  claimed: boolean;
}

/** Unstake request with cooldown tracking. */
export interface UnstakeRequest {
  id: string;
  /** Amount requested to unstake. */
  amount: number;
  /** ISO-8601 date when the unstake was requested. */
  requestedAt: string;
  /** ISO-8601 date when cooldown ends and tokens are available. */
  readyAt: string;
  /** Cooldown period in days. */
  cooldownDays: number;
  /** Current status of the cooldown. */
  status: UnstakeCooldownStatus;
  /** Transaction hash of the unstake request. */
  txHash: string;
}

/** Yield optimizer settings. */
export interface YieldOptimizerSettings {
  /** Whether auto-deposit is enabled. */
  enabled: boolean;
  /** Target DeFi protocol. */
  protocol: DefiProtocol;
  /** Percentage of rewards to auto-deposit (0-100). */
  depositPercentage: number;
  /** Extra APY earned from DeFi (percentage). */
  extraApy: number;
  /** Total APY including DeFi yield. */
  totalApy: number;
  /** Address of the yield vault contract. */
  vaultAddress: string | null;
}

/** Chart data point for staking history. */
export interface StakingChartDataPoint {
  /** Unix timestamp in seconds. */
  time: number;
  /** Value at this point. */
  value: number;
}

/** Full staking data returned by the management hook. */
export interface StakingManagementData {
  overview: StakingOverview;
  rewardsHistory: RewardRecord[];
  unstakeRequests: UnstakeRequest[];
  yieldSettings: YieldOptimizerSettings;
  /** Historical staked balance for charts. */
  balanceHistory: StakingChartDataPoint[];
  /** Historical APR for charts. */
  aprHistory: StakingChartDataPoint[];
  /** Cumulative rewards for charts. */
  cumulativeRewards: StakingChartDataPoint[];
}
