/**
 * Governance Types for VeriNode Protocol
 * Issue #174: Governance Voting Dashboard with Real-Time Proposal Tracking
 */

export type ProposalStatus = 'active' | 'passed' | 'defeated' | 'queued' | 'executed'

export type ProposalCategory = 'treasury' | 'parameter-change' | 'protocol-upgrade' | 'general'

export type VotingType = 'token-weighted' | 'quadratic'

export type VoteChoice = 'for' | 'against' | 'abstain'

export interface ProposalAction {
  id: string
  target: string
  functionName: string
  parameters: string
  value?: string
}

export interface Proposal {
  id: string
  title: string
  description: string
  proposer: string
  status: ProposalStatus
  forVotes: number
  againstVotes: number
  abstainVotes: number
  quorum: number
  startBlock: number
  endBlock: number
  category: ProposalCategory
  votingType: VotingType
  deposit: number
  createdAt: number
  actions?: ProposalAction[]
  userVote?: VoteChoice
  executionEta?: number
  executionTxHash?: string
}

export interface VoteRecord {
  id: string
  proposalId: string
  proposalTitle: string
  voter: string
  choice: VoteChoice
  votingPower: number
  effectiveWeight: number
  votingType: VotingType
  txHash: string
  gasCost: string
  timestamp: number
  blockNumber?: number
}

export interface Delegate {
  address: string
  name: string
  votingPower: number
  delegatedVotes: number
  delegatorsCount: number
  proposalsVotedCount: number
  participationRate: number
  isDelegatedTo?: boolean
  statement?: string
  avatarUrl?: string
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
  totalProposals: number
  activeProposals: number
  totalVotingPower: number
  userVotingPower: number
  userTokenBalance: number
  delegatedPower: number
  averageTurnout: number
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
