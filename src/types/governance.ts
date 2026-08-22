/**
 * Governance Types for VeriNode Protocol
 * Issue #174: Governance Voting Dashboard with Real-Time Proposal Tracking
 */

export type ProposalStatus = 'active' | 'passed' | 'defeated' | 'queued' | 'executed'

export type ProposalCategory = 'Treasury' | 'Parameters' | 'Protocol' | 'Community' | 'treasury' | 'parameter-change' | 'protocol-upgrade' | 'general'

export type ProposalVotingType = 'token-weighted' | 'quadratic'
export type VotingType = ProposalVotingType // alias for backward compatibility

export type VoteChoice = 'for' | 'against' | 'abstain'

export interface ProposalAction {
  id: string
  targetContract?: string
  target?: string
  functionName: string
  calldata?: string
  parameters?: Record<string, unknown>
  description?: string
  value?: string
}

export interface SimulationResult {
  success: boolean
  gasEstimateGwei: number
  gasEstimateUsd: number
  stateDiffs: { parameter: string; current: string; projected: string; impactLevel: string }[]
  logs: string[]
  executionTimeMs: number
}

export interface TopVoter {
  address: string
  name?: string
  choice: VoteChoice
  power: number
  tokens: number
  timestamp: string | number
  txHash: string
}

export interface Proposal {
  id: string
  title: string
  description: string
  proposer: string
  proposerName?: string
  status: ProposalStatus
  type: ProposalVotingType
  votingType?: ProposalVotingType
  category: ProposalCategory
  forVotes: number
  againstVotes: number
  abstainVotes: number
  forTokens?: number
  againstTokens?: number
  abstainTokens?: number
  totalVoters?: number
  quorum?: number
  quorumPercentage?: number
  currentQuorumPercentage?: number
  quorumReached?: boolean
  startTime?: string
  endTime?: string
  startBlock?: number
  endBlock?: number
  createdAt?: number
  executionEta?: string | number
  executionTxHash?: string
  deposit: number
  actions?: ProposalAction[]
  simulation?: SimulationResult
  topVoters: TopVoter[]
  userVote?: VoteChoice
}

export interface VoteRecord {
  id: string
  proposalId: string
  proposalTitle: string
  voter: string
  choice: VoteChoice
  power: number
  votingPower?: number
  tokens: number
  type: ProposalVotingType
  votingType?: ProposalVotingType
  effectiveWeight?: number
  txHash: string
  gasCostGwei: number
  gasCostUsd: number
  gasCost?: string
  timestamp: string | number
  blockNumber?: number
}

export interface Delegate {
  address: string
  name: string
  avatar?: string
  avatarUrl?: string
  bio?: string
  statement?: string
  votingPower: number
  votingPowerPercent?: number
  delegatorCount?: number
  delegatorsCount?: number
  delegatedVotes?: number
  proposalsVoted?: number
  proposalsVotedCount?: number
  participationRate: number
  recentVotes?: { proposalId: string; proposalTitle: string; choice: VoteChoice }[]
  isDelegatedTo?: boolean
}

export interface DebateComment {
  id: string
  proposalId: string
  author: string
  authorName: string
  authorAvatar: string
  stance: VoteChoice
  content: string
  timestamp: string | number
  likes: number
  userLiked: boolean
}

export interface UserGovernanceProfile {
  address: string
  votingPower: number
  tokensLocked: number
  isDelegating: boolean
  delegatedTo?: string
  delegatedToName?: string
  delegatorCount?: number
  delegatorsCount?: number
}

export interface GovernanceMetrics {
  totalVrnLocked: number
  activeProposalsCount: number
  participationRate: number
  totalProposals?: number
  activeProposals?: number
  totalVotingPower?: number
  userVotingPower?: number
  userTokenBalance?: number
  delegatedPower?: number
  averageTurnout?: number
}

export interface CreateProposalInput {
  title: string
  description: string
  category: ProposalCategory
  type: ProposalVotingType
  votingType?: ProposalVotingType
  deposit: number
  actions?: ProposalAction[]
  votingPeriodBlocks?: number
  durationDays?: number
  proposer: string
  proposerName?: string
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

export interface ProposalFilterOptions {
  status?: string | 'all'
  category?: string | 'all'
  searchQuery?: string
  sortBy?: 'recent' | 'endingSoon' | 'mostVoted' | 'deposit'
}
