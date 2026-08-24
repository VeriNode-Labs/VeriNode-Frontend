import { create } from 'zustand'
import type {
  Proposal,
  ProposalStatus,
  ProposalCategory,
  VotingType,
  VoteChoice,
  VoteRecord,
  Delegate,
  CreateProposalInput,
  GovernanceMetrics,
  QuorumProgress,
} from '@/src/types/governance'

export const MINIMUM_PROPOSAL_DEPOSIT = 100 // 100 VN tokens minimum

// ── Pure Calculation Helpers ──────────────────────────────────────────────────

/**
 * Calculates effective voting weight.
 * For 'token-weighted': 1 token = 1 vote.
 * For 'quadratic': weight = sqrt(tokens).
 */
export function calculateEffectiveWeight(rawTokens: number, votingType: VotingType): number {
  if (rawTokens <= 0) return 0
  if (votingType === 'quadratic') {
    return Math.round(Math.sqrt(rawTokens) * 100) / 100
  }
  return Math.round(rawTokens * 100) / 100
}

/**
 * Calculates quorum metrics and vote breakdown percentages for a proposal.
 */
export function calculateQuorumProgress(proposal: Proposal): QuorumProgress {
  const currentVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes
  const quorum = proposal.quorum ?? 0
  const quorumReached = quorum > 0 && currentVotes >= quorum
  const percentage = quorum > 0 ? Math.min(100, Math.round((currentVotes / quorum) * 1000) / 10) : 0

  const forPercentage = currentVotes > 0 ? Math.round((proposal.forVotes / currentVotes) * 1000) / 10 : 0
  const againstPercentage = currentVotes > 0 ? Math.round((proposal.againstVotes / currentVotes) * 1000) / 10 : 0
  const abstainPercentage = currentVotes > 0 ? Math.round((proposal.abstainVotes / currentVotes) * 1000) / 10 : 0

  return {
    currentVotes,
    quorum,
    quorumReached,
    percentage,
    forPercentage,
    againstPercentage,
    abstainPercentage,
  }
}

/**
 * Converts a list of vote records into standard CSV format.
 */
export function formatVoteHistoryCsv(records: VoteRecord[]): string {
  const headers = [
    'Tx Hash',
    'Proposal ID',
    'Proposal Title',
    'Voter',
    'Choice',
    'Voting Power (Tokens)',
    'Effective Weight',
    'Voting Mechanism',
    'Gas Cost',
    'Timestamp',
    'Date UTC',
  ]

  const rows = records.map((r) => [
    `"${r.txHash}"`,
    `"${r.proposalId}"`,
    `"${r.proposalTitle.replace(/"/g, '""')}"`,
    `"${r.voter}"`,
    `"${r.choice.toUpperCase()}"`,
    r.votingPower,
    r.effectiveWeight,
    `"${r.votingType}"`,
    `"${r.gasCost}"`,
    r.timestamp,
    `"${new Date(r.timestamp).toISOString()}"`,
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

// ── Initial Mock Data ─────────────────────────────────────────────────────────

export const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'PROP-001',
    title: 'VIP-031: Liquidity Pool Incentive Program Season 3',
    description:
      'Allocate 500,000 VN tokens from the protocol treasury to bootstrap liquidity across Soroban AMM pools for VN/USDC and VN/XLM pairs over 90 days. Includes automated rebalancing safeguards and a 20% cap per LP.',
    proposer: 'GBV3X7MK62LP8O7TRV4WNZL2Q4F982FA4K7M9',
    status: 'active',
    forVotes: 142500,
    againstVotes: 32400,
    abstainVotes: 12100,
    quorum: 150000,
    startBlock: 42051000,
    endBlock: 42125000,
    category: 'treasury',
    votingType: 'token-weighted',
    deposit: 500,
    createdAt: 1787100000000,
    actions: [
      {
        id: 'act-1',
        target: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        functionName: 'transfer_treasury_funds',
        parameters: '{"recipient": "GBV3...82FA", "amount": "500000", "token": "VN"}',
        value: '500,000 VN',
      },
    ],
  },
  {
    id: 'PROP-002',
    title: 'VIP-032: Quadratic Voting Pilot for Ecosystem Developer Grants',
    description:
      'Transition quarterly ecosystem developer grant distribution to a Quadratic Voting mechanism. Under quadratic voting, the weight of votes equals the square root of allocated tokens, reducing the influence of concentrated token holders and empowering grassroots community contributors.',
    proposer: 'GCL4K67R2XF890NM45VBPZ1Q882209AL76TY2',
    status: 'active',
    forVotes: 860,
    againstVotes: 125,
    abstainVotes: 45,
    quorum: 750,
    startBlock: 42060000,
    endBlock: 42130000,
    category: 'general',
    votingType: 'quadratic',
    deposit: 250,
    createdAt: 1787120000000,
    actions: [
      {
        id: 'act-2',
        target: 'CB6XNVF77921KLNMQ879PLKM0091VBYTTKJL994200XCVBA776654321',
        functionName: 'enable_quadratic_grants',
        parameters: '{"grant_pool": "100000", "round": "Q3-2026"}',
        value: '100,000 VN',
      },
    ],
  },
  {
    id: 'PROP-003',
    title: 'VIP-029: Reduce Validator Slashing Penalty from 5% to 3%',
    description:
      'Lower the double-signing and downtime slashing rate from 5% to 3% to incentivize broader decentralization among smaller node operators while maintaining strong economic security guarantees.',
    proposer: 'GD7BX8M31NP4450KLS9921VZTTTR43100981A',
    status: 'passed',
    forVotes: 215000,
    againstVotes: 48000,
    abstainVotes: 15000,
    quorum: 150000,
    startBlock: 41950000,
    endBlock: 42020000,
    category: 'parameter-change',
    votingType: 'token-weighted',
    deposit: 300,
    createdAt: 1786900000000,
    userVote: 'for',
    actions: [
      {
        id: 'act-3',
        target: 'CC78MKL09123891VZTRPP0029310848123891023812038102381203',
        functionName: 'set_slashing_penalty',
        parameters: '{"penalty_bps": 300}',
        value: '3.0%',
      },
    ],
  },
  {
    id: 'PROP-004',
    title: 'VIP-028: Soroban Contract Gas Optimization Upgrade v2.4',
    description:
      'Implement native bytecode caching and reduce cross-contract invocation overhead by 35% on the VeriNode core state verification engine.',
    proposer: 'GAMP772B55890011VZTRLKJ00982319084812',
    status: 'executed',
    forVotes: 340000,
    againstVotes: 12000,
    abstainVotes: 8000,
    quorum: 150000,
    startBlock: 41800000,
    endBlock: 41870000,
    category: 'protocol-upgrade',
    votingType: 'token-weighted',
    deposit: 1000,
    createdAt: 1786500000000,
    executionEta: 1786700000000,
    executionTxHash: '0x9482f7c00192a83b4c6e91f00847291a82f3b9c0e71928374a5b6c7d8e9f0123',
  },
  {
    id: 'PROP-005',
    title: 'VIP-030: Emergency Circuit Breaker Parameter Tuning',
    description:
      'Update the multi-sig threshold required to trigger the 24-hour bridge safety freeze from 3-of-5 to 4-of-7 authorized security committee members.',
    proposer: 'GBK8551D90901238472910481209381029381',
    status: 'queued',
    forVotes: 189000,
    againstVotes: 31000,
    abstainVotes: 9500,
    quorum: 150000,
    startBlock: 42000000,
    endBlock: 42045000,
    category: 'parameter-change',
    votingType: 'token-weighted',
    deposit: 400,
    createdAt: 1787000000000,
    executionEta: 1787200000000,
  },
  {
    id: 'PROP-006',
    title: 'VIP-027: Increase Governance Quorum from 20% to 35%',
    description:
      'Raise the minimum voter turnout required for any proposal to pass from 20% of circulating supply to 35%.',
    proposer: 'GC99128374109283471092837410928347109',
    status: 'defeated',
    forVotes: 72000,
    againstVotes: 195000,
    abstainVotes: 22000,
    quorum: 150000,
    startBlock: 41700000,
    endBlock: 41770000,
    category: 'parameter-change',
    votingType: 'token-weighted',
    deposit: 200,
    createdAt: 1786300000000,
    userVote: 'against',
  },
]

export const INITIAL_DELEGATES: Delegate[] = [
  {
    address: 'GD7BX8M31NP4450KLS9921VZTTTR43100981A',
    name: 'Stellar Foundation Guild',
    votingPower: 1250000,
    delegatedVotes: 1100000,
    delegatorsCount: 142,
    proposalsVotedCount: 31,
    participationRate: 98.4,
    statement:
      'Committed to advancing decentralization, security standards, and cross-chain interoperability across the Stellar Soroban ecosystem.',
  },
  {
    address: 'GCL4K67R2XF890NM45VBPZ1Q882209AL76TY2',
    name: 'VeriNode Core Devs DAO',
    votingPower: 980000,
    delegatedVotes: 850000,
    delegatorsCount: 89,
    proposalsVotedCount: 32,
    participationRate: 100.0,
    statement:
      'Focusing on high-throughput consensus performance, low gas costs, and seamless developer onboarding.',
  },
  {
    address: 'GBK8551D90901238472910481209381029381',
    name: 'DeFi Governance Collective',
    votingPower: 640000,
    delegatedVotes: 580000,
    delegatorsCount: 54,
    proposalsVotedCount: 29,
    participationRate: 93.8,
    statement:
      'Advocating for sustainable liquidity mining, risk mitigation parameters, and transparent treasury asset management.',
  },
  {
    address: 'GAMP772B55890011VZTRLKJ00982319084812',
    name: 'Orbit Validator Alliance',
    votingPower: 420000,
    delegatedVotes: 370000,
    delegatorsCount: 31,
    proposalsVotedCount: 28,
    participationRate: 90.3,
    statement:
      'Representing independent validator operators to ensure fair rewards, reasonable slashing limits, and network resilience.',
  },
]

export const INITIAL_VOTE_HISTORY: VoteRecord[] = [
  {
    id: 'vote-001',
    proposalId: 'PROP-003',
    proposalTitle: 'VIP-029: Reduce Validator Slashing Penalty from 5% to 3%',
    voter: 'GUSER992178340192837401928374019283740',
    choice: 'for',
    votingPower: 25000,
    effectiveWeight: 25000,
    votingType: 'token-weighted',
    txHash: '0x81f4a9b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890ab',
    gasCost: '0.0021 XLM',
    timestamp: 1786950000000,
    blockNumber: 41980210,
  },
  {
    id: 'vote-002',
    proposalId: 'PROP-006',
    proposalTitle: 'VIP-027: Increase Governance Quorum from 20% to 35%',
    voter: 'GUSER992178340192837401928374019283740',
    choice: 'against',
    votingPower: 25000,
    effectiveWeight: 25000,
    votingType: 'token-weighted',
    txHash: '0x32c1d0e9f8a7b6c504132435465768798091a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
    gasCost: '0.0024 XLM',
    timestamp: 1786400000000,
    blockNumber: 41721540,
  },
]

// ── Store Interface ───────────────────────────────────────────────────────────

export interface GovernanceState {
  proposals: Proposal[]
  activeFilter: ProposalStatus | 'all'
  selectedCategory: ProposalCategory | 'all'
  searchQuery: string
  selectedProposalId: string | null
  userAddress: string
  userTokenBalance: number
  userVotingPower: number
  delegates: Delegate[]
  currentDelegation: string | null
  voteHistory: VoteRecord[]
  isLoading: boolean
  error: string | null

  // Filter actions
  setFilter: (filter: ProposalStatus | 'all') => void
  setCategory: (category: ProposalCategory | 'all') => void
  setSearchQuery: (query: string) => void
  selectProposal: (id: string | null) => void

  // Governance interactions
  castVote: (
    proposalId: string,
    choice: VoteChoice,
    tokensToUse?: number,
  ) => { success: boolean; txHash?: string; error?: string }
  delegateVotes: (delegateAddress: string) => { success: boolean; error?: string }
  revokeDelegation: () => { success: boolean; error?: string }
  createProposal: (input: CreateProposalInput) => { success: boolean; proposalId?: string; error?: string }

  // Selectors
  getFilteredProposals: () => Proposal[]
  getMetrics: () => GovernanceMetrics
  exportVoteHistoryCsv: () => string

  // Reset helper
  resetStore: () => void
}

// ── Zustand Store ─────────────────────────────────────────────────────────────

export const useGovernanceStore = create<GovernanceState>((set, get) => ({
  proposals: INITIAL_PROPOSALS,
  activeFilter: 'all',
  selectedCategory: 'all',
  searchQuery: '',
  selectedProposalId: null,
  userAddress: 'GUSER992178340192837401928374019283740',
  userTokenBalance: 25000,
  userVotingPower: 25000,
  delegates: INITIAL_DELEGATES,
  currentDelegation: null,
  voteHistory: INITIAL_VOTE_HISTORY,
  isLoading: false,
  error: null,

  setFilter: (filter) => set({ activeFilter: filter }),

  setCategory: (category) => set({ selectedCategory: category }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  selectProposal: (id) => set({ selectedProposalId: id }),

  castVote: (proposalId, choice, tokensToUse) => {
    const state = get()
    const proposal = state.proposals.find((p) => p.id === proposalId)

    if (!proposal) {
      return { success: false, error: 'Proposal not found' }
    }

    if (proposal.status !== 'active') {
      return { success: false, error: `Cannot vote on ${proposal.status} proposal` }
    }

    const availablePower = state.userVotingPower
    if (availablePower <= 0) {
      return { success: false, error: 'No voting power available (may be delegated or 0 balance)' }
    }

    const tokens = tokensToUse !== undefined ? tokensToUse : availablePower
    if (tokens <= 0 || tokens > availablePower) {
      return {
        success: false,
        error: `Invalid voting tokens: ${tokens}. Available power: ${availablePower}`,
      }
    }

    const effectiveWeight = calculateEffectiveWeight(tokens, proposal.votingType ?? 'token-weighted')

    // Generate simulated tx hash and gas
    const randomHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('')
    const txHash = `0x${randomHex}`
    const gasCost = (0.0018 + Math.random() * 0.0012).toFixed(4) + ' XLM'
    const timestamp = Date.now()

    // Update proposal vote counts
    const updatedProposals = state.proposals.map((p) => {
      if (p.id !== proposalId) return p

      // If user previously voted, subtract their old vote if we want to support revoting
      let nextFor = p.forVotes
      let nextAgainst = p.againstVotes
      let nextAbstain = p.abstainVotes

      if (choice === 'for') nextFor += effectiveWeight
      else if (choice === 'against') nextAgainst += effectiveWeight
      else if (choice === 'abstain') nextAbstain += effectiveWeight

      return {
        ...p,
        forVotes: nextFor,
        againstVotes: nextAgainst,
        abstainVotes: nextAbstain,
        userVote: choice,
      }
    })

    const newVoteRecord: VoteRecord = {
      id: `vote-${Date.now()}`,
      proposalId: proposal.id,
      proposalTitle: proposal.title,
      voter: state.userAddress,
      choice,
      votingPower: tokens,
      effectiveWeight,
      votingType: proposal.votingType ?? 'token-weighted',
      txHash,
      gasCost,
      timestamp,
      blockNumber: (proposal.startBlock ?? 0) + Math.floor(Math.random() * 5000),
    }

    set({
      proposals: updatedProposals,
      voteHistory: [newVoteRecord, ...state.voteHistory],
    })

    return { success: true, txHash }
  },

  delegateVotes: (delegateAddress) => {
    const state = get()
    if (!delegateAddress || delegateAddress.trim() === '') {
      return { success: false, error: 'Delegate address cannot be empty' }
    }

    if (delegateAddress === state.userAddress) {
      return { success: false, error: 'Cannot delegate to your own address' }
    }

    if (state.currentDelegation === delegateAddress) {
      return { success: false, error: 'Already delegated to this address' }
    }

    const powerToDelegate = state.userTokenBalance

    const updatedDelegates = state.delegates.map((d) => {
      if (d.address === delegateAddress) {
        return {
          ...d,
          delegatedVotes: (d.delegatedVotes ?? 0) + powerToDelegate,
          votingPower: d.votingPower + powerToDelegate,
          delegatorsCount: (d.delegatorsCount ?? 0) + 1,
          isDelegatedTo: true,
        }
      }
      // If switching from another delegate, decrement old delegate
      if (d.address === state.currentDelegation) {
        return {
          ...d,
          delegatedVotes: Math.max(0, (d.delegatedVotes ?? 0) - powerToDelegate),
          votingPower: Math.max(0, d.votingPower - powerToDelegate),
          delegatorsCount: Math.max(0, (d.delegatorsCount ?? 0) - 1),
          isDelegatedTo: false,
        }
      }
      return { ...d, isDelegatedTo: false }
    })

    set({
      currentDelegation: delegateAddress,
      userVotingPower: 0, // Voting power delegated away
      delegates: updatedDelegates,
    })

    return { success: true }
  },

  revokeDelegation: () => {
    const state = get()
    if (!state.currentDelegation) {
      return { success: false, error: 'No active delegation to revoke' }
    }

    const delegatedPower = state.userTokenBalance
    const targetAddress = state.currentDelegation

    const updatedDelegates = state.delegates.map((d) => {
      if (d.address === targetAddress) {
        return {
          ...d,
          delegatedVotes: Math.max(0, (d.delegatedVotes ?? 0) - delegatedPower),
          votingPower: Math.max(0, d.votingPower - delegatedPower),
          delegatorsCount: Math.max(0, (d.delegatorsCount ?? 0) - 1),
          isDelegatedTo: false,
        }
      }
      return { ...d, isDelegatedTo: false }
    })

    set({
      currentDelegation: null,
      userVotingPower: state.userTokenBalance, // Reclaim voting power
      delegates: updatedDelegates,
    })

    return { success: true }
  },

  createProposal: (input) => {
    const state = get()

    if (!input.title || input.title.trim().length < 5) {
      return { success: false, error: 'Title must be at least 5 characters long' }
    }

    if (!input.description || input.description.trim().length < 20) {
      return { success: false, error: 'Description must be at least 20 characters long' }
    }

    const deposit = input.deposit ?? MINIMUM_PROPOSAL_DEPOSIT
    if (deposit < MINIMUM_PROPOSAL_DEPOSIT) {
      return {
        success: false,
        error: `Deposit must be at least ${MINIMUM_PROPOSAL_DEPOSIT} VN tokens`,
      }
    }

    if (state.userTokenBalance < deposit) {
      return {
        success: false,
        error: `Insufficient balance for proposal deposit. Required: ${deposit} VN, Available: ${state.userTokenBalance} VN`,
      }
    }

    const nextNumber = state.proposals.length + 1
    const proposalId = `PROP-${nextNumber.toString().padStart(3, '0')}`
    const startBlock = 42100000 + nextNumber * 5000
    const endBlock = startBlock + (input.votingPeriodBlocks ?? 70000)

    const newProposal: Proposal = {
      id: proposalId,
      title: input.title.trim(),
      description: input.description.trim(),
      proposer: state.userAddress,
      status: 'active',
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      quorum: 100000,
      startBlock,
      endBlock,
      category: input.category,
      votingType: input.votingType,
      deposit,
      createdAt: Date.now(),
      actions: input.actions ?? [],
    }

    set({
      proposals: [newProposal, ...state.proposals],
      userTokenBalance: state.userTokenBalance - deposit,
      userVotingPower: state.currentDelegation ? 0 : state.userVotingPower - deposit,
      selectedProposalId: proposalId,
    })

    return { success: true, proposalId }
  },

  getFilteredProposals: () => {
    const { proposals, activeFilter, selectedCategory, searchQuery } = get()

    return proposals.filter((p) => {
      // Status filter
      if (activeFilter !== 'all' && p.status !== activeFilter) {
        return false
      }

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase()
        const matchTitle = p.title.toLowerCase().includes(q)
        const matchDesc = p.description.toLowerCase().includes(q)
        const matchId = p.id.toLowerCase().includes(q)
        const matchProposer = p.proposer.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchId && !matchProposer) {
          return false
        }
      }

      return true
    })
  },

  getMetrics: () => {
    const { proposals, delegates, userVotingPower, userTokenBalance } = get()
    const activeProposals = proposals.filter((p) => p.status === 'active').length
    const totalVotingPower = delegates.reduce((sum, d) => sum + d.votingPower, 0)
    const delegatedPower = delegates.reduce((sum, d) => sum + (d.delegatedVotes ?? 0), 0)

    return {
      totalProposals: proposals.length,
      activeProposals,
      totalVotingPower,
      userVotingPower,
      userTokenBalance,
      delegatedPower,
      averageTurnout: 68.5,
    }
  },

  exportVoteHistoryCsv: () => {
    const { voteHistory } = get()
    return formatVoteHistoryCsv(voteHistory)
  },

  resetStore: () => {
    set({
      proposals: INITIAL_PROPOSALS,
      activeFilter: 'all',
      selectedCategory: 'all',
      searchQuery: '',
      selectedProposalId: null,
      userAddress: 'GUSER992178340192837401928374019283740',
      userTokenBalance: 25000,
      userVotingPower: 25000,
      delegates: INITIAL_DELEGATES,
      currentDelegation: null,
      voteHistory: INITIAL_VOTE_HISTORY,
      isLoading: false,
      error: null,
    })
  },
}))
