/**
 * Governance Types for VeriNode Protocol
 * Issue #174: Governance Voting Dashboard with Real-Time Proposal Tracking
 */

export type ProposalStatus =
  | 'active'
  | 'passed'
  | 'defeated'
  | 'queued'
  | 'executed'
  | 'cancelled'

export type ProposalCategory =
  | 'treasury'
  | 'parameter-change'
  | 'protocol-upgrade'
  | 'general'
  | 'Treasury'
  | 'Parameters'
  | 'Protocol'
  | 'Community'

export type VotingType = 'token-weighted' | 'quadratic'

export type VoteChoice = 'for' | 'against' | 'abstain'

// Broad type used by hooks/services for voting-type discrimination.
// Includes VotingType plus category-like string literals from mock data.
export type ProposalVotingType = string

// Filter options for proposal listing
export interface ProposalFilterOptions {
  status?: ProposalStatus | 'all'
  category?: ProposalCategory | 'all'
  search?: string
  searchQuery?: string
  sortBy?: string
}

export interface ProposalAction {
  id: string
  target?: string
  functionName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: any
  description?: string
  calldata?: string
  value?: string
  targetContract?: string
  downtimePenaltyBps?: number
  gracePeriodSecs?: number
  amountVrn?: number
  amount?: number
  minStake?: number
  minValidatorStake?: number
}

export interface Proposal {
  id: string
  title: string
  description: string
  proposer: string
  proposerName?: string
  status: ProposalStatus
  forVotes: number
  againstVotes: number
  abstainVotes: number
  forTokens?: number
  againstTokens?: number
  abstainTokens?: number
  quorum?: number
  quorumPercentage?: number
  quorumReached?: boolean
  currentQuorumPercentage?: number
  totalVoters?: number
  startBlock?: number
  endBlock?: number
  category: ProposalCategory
  votingType?: VotingType
  type?: ProposalVotingType
  deposit?: number
  createdAt?: number
  startTime?: number | string | null
  endTime?: number | string | null
  actions?: ProposalAction[]
  userVote?: VoteChoice
  executionEta?: number | string
  executionTxHash?: string
  topVoters?: Array<{ address: string; tokens: number; name?: string; choice?: string; power?: number; timestamp?: string; txHash?: string }>
  simulation?: object
}

export interface VoteRecord {
  id: string
  proposalId: string
  proposalTitle: string
  voter: string
  choice: VoteChoice
  votingPower?: number
  effectiveWeight?: number
  votingType?: VotingType
  txHash: string
  gasCost?: string | number
  gasCostGwei?: number
  gasCostUsd?: number
  timestamp: number | string
  blockNumber?: number
  power?: number
  tokens?: number
  type?: ProposalVotingType
}

export interface Delegate {
  address: string
  name: string
  votingPower: number
  delegatedVotes?: number
  delegatorsCount?: number
  delegatorCount?: number
  proposalsVotedCount?: number
  proposalsVoted?: number
  recentVotes?: unknown[]
  participationRate: number
  isDelegatedTo?: boolean
  statement?: string
  bio?: string
  avatarUrl?: string
  avatar?: string
  votingPowerPercent?: number
}

export interface CreateProposalInput {
  title: string
  description: string
  category: ProposalCategory
  votingType: VotingType
  deposit: number
  actions?: ProposalAction[]
  votingPeriodBlocks?: number
}

export interface GovernanceMetrics {
  totalProposals?: number
  activeProposals?: number
  activeProposalsCount?: number
  totalVotingPower?: number
  userVotingPower?: number
  userTokenBalance?: number
  delegatedPower?: number
  averageTurnout?: number
  totalVrnLocked?: number
  participationRate?: number
}

export interface QuorumProgress {
  currentVotes: number
  quorum: number
  quorumReached: boolean
  percentage: number
  forPercentage: number
  againstPercentage: number
  abstainPercentage: number
}

// --- Supporting types ---

export interface SimulationResult {
  success?: boolean
  gasEstimateGwei?: number
  gasEstimateUsd?: number
  stateDiffs: Array<{
    parameter: string
    current: string
    projected: string
    impactLevel: 'low' | 'medium' | 'high'
  }>
  totalGas?: number
  logs: string[]
  executionTimeMs?: number
}

export interface DebateComment {
  id: string
  proposalId: string
  author: string
  authorName: string
  authorAvatar?: string
  stance: 'for' | 'against' | 'abstain'
  content: string
  timestamp: string
  likes: number
  userLiked: boolean
}

export interface UserGovernanceProfile {
  address: string
  tokensLocked: number
  votingPower: number
  delegatedTo?: string
  delegatedToName?: string
  isDelegating: boolean
  delegatorCount?: number
  tokenBalance?: number
}