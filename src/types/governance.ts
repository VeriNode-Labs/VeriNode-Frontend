/**
 * Governance types for VeriNode VRN token voting and proposal tracking.
 */

export type ProposalStatus = 'active' | 'passed' | 'defeated' | 'queued' | 'executed' | 'cancelled';

export type ProposalVotingType = 'quadratic' | 'token-weighted';

export type ProposalCategory = 'Protocol' | 'Treasury' | 'Parameters' | 'Security' | 'Community';

export type VoteChoice = 'for' | 'against' | 'abstain';

export interface ProposalAction {
  id: string;
  targetContract: string;
  functionName: string;
  calldata: string;
  parameters: Record<string, string | number | boolean>;
  value?: string;
  description: string;
}

export interface StateDiff {
  parameter: string;
  current: string;
  projected: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SimulationResult {
  success: boolean;
  gasEstimateGwei: number;
  gasEstimateUsd: number;
  stateDiffs: StateDiff[];
  logs: string[];
  executionTimeMs: number;
  error?: string;
}

export interface VoterRecord {
  address: string;
  name?: string;
  choice: VoteChoice;
  power: number;
  tokens: number;
  timestamp: string;
  txHash: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  proposerName?: string;
  status: ProposalStatus;
  type: ProposalVotingType;
  category: ProposalCategory;
  forVotes: number; // Effective power
  againstVotes: number;
  abstainVotes: number;
  forTokens: number; // Raw tokens committed
  againstTokens: number;
  abstainTokens: number;
  totalVoters: number;
  quorumPercentage: number;
  currentQuorumPercentage: number;
  quorumReached: boolean;
  startTime: string; // ISO string
  endTime: string; // ISO string
  executionEta?: string; // ISO string for queued proposals
  deposit: number; // In VRN
  actions: ProposalAction[];
  simulation: SimulationResult;
  topVoters: VoterRecord[];
}

export interface VoteRecord {
  id: string;
  proposalId: string;
  proposalTitle: string;
  voter: string;
  choice: VoteChoice;
  power: number;
  tokens: number;
  type: ProposalVotingType;
  txHash: string;
  gasCostGwei: number;
  gasCostUsd: number;
  timestamp: string;
}

export interface Delegate {
  address: string;
  name: string;
  avatar: string;
  bio: string;
  votingPower: number;
  votingPowerPercent: number;
  delegatorCount: number;
  proposalsVoted: number;
  participationRate: number; // 0 - 100 percentage
  recentVotes: {
    proposalId: string;
    proposalTitle: string;
    choice: VoteChoice;
  }[];
  isSelf?: boolean;
}

export interface DebateComment {
  id: string;
  proposalId: string;
  author: string;
  authorName?: string;
  authorAvatar?: string;
  stance: 'for' | 'against' | 'neutral';
  content: string;
  timestamp: string;
  likes: number;
  userLiked?: boolean;
}

export interface UserGovernanceProfile {
  address: string;
  tokenBalance: number; // VRN balance
  votingPower: number; // Effective voting power (after delegations)
  delegatedTo: string | null;
  delegatedToName?: string | null;
  isDelegating: boolean;
  delegatorCount: number;
  delegatedPowerReceived: number;
}

export interface GovernanceMetrics {
  totalVrnLocked: number;
  totalVrnLockedUsd: number;
  activeProposalsCount: number;
  totalProposalsCount: number;
  participationRate: number;
  totalDelegatesCount: number;
}

export interface ProposalFilterOptions {
  status?: ProposalStatus | 'all';
  category?: ProposalCategory | 'all';
  searchQuery?: string;
  sortBy?: 'recent' | 'endingSoon' | 'mostVoted' | 'deposit';
}
