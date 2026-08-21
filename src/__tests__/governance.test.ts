import { describe, it, expect, beforeEach } from 'vitest'
import {
  useGovernanceStore,
  calculateEffectiveWeight,
  calculateQuorumProgress,
  formatVoteHistoryCsv,
  MINIMUM_PROPOSAL_DEPOSIT,
} from '@/src/store/governanceStore'
import type { Proposal, CreateProposalInput, VoteRecord } from '@/src/types/governance'

describe('Governance Store & Pure Calculations', () => {
  beforeEach(() => {
    useGovernanceStore.getState().resetStore()
  })

  describe('calculateEffectiveWeight', () => {
    it('calculates linear weight for token-weighted voting', () => {
      expect(calculateEffectiveWeight(1000, 'token-weighted')).toBe(1000)
      expect(calculateEffectiveWeight(25000, 'token-weighted')).toBe(25000)
      expect(calculateEffectiveWeight(0, 'token-weighted')).toBe(0)
      expect(calculateEffectiveWeight(-50, 'token-weighted')).toBe(0)
    })

    it('calculates square root weight for quadratic voting', () => {
      expect(calculateEffectiveWeight(10000, 'quadratic')).toBe(100)
      expect(calculateEffectiveWeight(25, 'quadratic')).toBe(5)
      expect(calculateEffectiveWeight(100, 'quadratic')).toBe(10)
      expect(calculateEffectiveWeight(2, 'quadratic')).toBe(1.41)
      expect(calculateEffectiveWeight(0, 'quadratic')).toBe(0)
      expect(calculateEffectiveWeight(-10, 'quadratic')).toBe(0)
    })
  })

  describe('calculateQuorumProgress', () => {
    it('calculates quorum and vote percentages accurately', () => {
      const mockProposal: Proposal = {
        id: 'TEST-1',
        title: 'Test',
        description: 'Test desc',
        proposer: 'GBV...',
        status: 'active',
        forVotes: 600,
        againstVotes: 300,
        abstainVotes: 100,
        quorum: 1000,
        startBlock: 100,
        endBlock: 200,
        category: 'general', topVoters: [],
        votingType: 'token-weighted',
        deposit: 500, type: "token-weighted", proposer: "user1",
        createdAt: 1000,
      }

      const progress = calculateQuorumProgress(mockProposal)
      expect(progress.currentVotes).toBe(1000)
      expect(progress.quorum).toBe(1000)
      expect(progress.quorumReached).toBe(true)
      expect(progress.percentage).toBe(100)
      expect(progress.forPercentage).toBe(60)
      expect(progress.againstPercentage).toBe(30)
      expect(progress.abstainPercentage).toBe(10)
    })

    it('handles zero votes correctly without division by zero', () => {
      const emptyProposal: Proposal = {
        id: 'TEST-2',
        title: 'Empty',
        description: 'Empty',
        proposer: 'GBV...',
        status: 'active',
        forVotes: 0,
        againstVotes: 0,
        abstainVotes: 0,
        quorum: 50000,
        startBlock: 100,
        endBlock: 200,
        category: 'treasury', topVoters: [],
        votingType: 'token-weighted',
        deposit: 500, type: "token-weighted", proposer: "user1",
        createdAt: 1000,
      }

      const progress = calculateQuorumProgress(emptyProposal)
      expect(progress.currentVotes).toBe(0)
      expect(progress.quorumReached).toBe(false)
      expect(progress.percentage).toBe(0)
      expect(progress.forPercentage).toBe(0)
      expect(progress.againstPercentage).toBe(0)
      expect(progress.abstainPercentage).toBe(0)
    })
  })

  describe('formatVoteHistoryCsv', () => {
    it('formats vote records into valid CSV with headers and quoted fields', () => {
      const sampleRecords: VoteRecord[] = [
        {
          id: 'v1',
          proposalId: 'PROP-001',
          proposalTitle: 'VIP-001: First, Proposal',
          voter: 'GUSER123',
          choice: 'for',
          votingPower: 5000,
          effectiveWeight: 5000,
          votingType: 'token-weighted',
          txHash: '0xabc123',
          gasCost: '0.002 XLM',
          timestamp: 1787000000000,
        },
      ]

      const csv = formatVoteHistoryCsv(sampleRecords)
      const lines = csv.split('\n')
      expect(lines[0]).toContain('Tx Hash,Proposal ID,Proposal Title')
      expect(lines[1]).toContain('"0xabc123"')
      expect(lines[1]).toContain('"PROP-001"')
      expect(lines[1]).toContain('"VIP-001: First, Proposal"')
      expect(lines[1]).toContain('"FOR"')
    })
  })

  describe('Store Actions - Voting', () => {
    it('casts a vote on an active proposal and updates state', () => {
      const store = useGovernanceStore.getState()
      const initialProp = store.proposals.find((p) => p.id === 'PROP-001')!
      const initialFor = initialProp.forVotes
      const initialHistoryCount = store.voteHistory.length

      const res = store.castVote('PROP-001', 'for', 5000)
      expect(res.success).toBe(true)
      expect(res.txHash).toBeDefined()

      const updatedProp = useGovernanceStore.getState().proposals.find((p) => p.id === 'PROP-001')!
      expect(updatedProp.forVotes).toBe(initialFor + 5000)
      expect(updatedProp.userVote).toBe('for')

      const updatedHistory = useGovernanceStore.getState().voteHistory
      expect(updatedHistory.length).toBe(initialHistoryCount + 1)
      expect(updatedHistory[0].proposalId).toBe('PROP-001')
      expect(updatedHistory[0].choice).toBe('for')
      expect(updatedHistory[0].votingPower).toBe(5000)
      expect(updatedHistory[0].effectiveWeight).toBe(5000)
    })

    it('applies quadratic weight when voting on quadratic proposal', () => {
      const store = useGovernanceStore.getState()
      const prop = store.proposals.find((p) => p.id === 'PROP-002')!
      expect(prop.votingType).toBe('quadratic')
      const initialAgainst = prop.againstVotes

      // 10000 tokens in quadratic voting = 100 votes
      const res = store.castVote('PROP-002', 'against', 10000)
      expect(res.success).toBe(true)

      const updatedProp = useGovernanceStore.getState().proposals.find((p) => p.id === 'PROP-002')!
      expect(updatedProp.againstVotes).toBe(initialAgainst + 100)

      const latestVote = useGovernanceStore.getState().voteHistory[0]
      expect(latestVote.votingPower).toBe(10000)
      expect(latestVote.effectiveWeight).toBe(100)
    })

    it('rejects voting on non-active proposals', () => {
      const store = useGovernanceStore.getState()
      const res = store.castVote('PROP-003', 'for', 1000) // PROP-003 is 'passed'
      expect(res.success).toBe(false)
      expect(res.error).toContain('Cannot vote on passed proposal')
    })

    it('rejects voting with invalid or excessive tokens', () => {
      const store = useGovernanceStore.getState()
      const res1 = store.castVote('PROP-001', 'for', 0)
      expect(res1.success).toBe(false)

      const res2 = store.castVote('PROP-001', 'for', 99999999)
      expect(res2.success).toBe(false)
    })
  })

  describe('Store Actions - Delegation', () => {
    it('delegates voting power to a chosen delegate and reduces direct power', () => {
      const store = useGovernanceStore.getState()
      const delegateAddress = 'GD7BX8M31NP4450KLS9921VZTTTR43100981A'


      const res = store.delegateVotes(delegateAddress)
      expect(res.success).toBe(true)

      const state = useGovernanceStore.getState()
      expect(state.currentDelegation).toBe(delegateAddress)
      expect(state.userVotingPower).toBe(0)

      const delegate = state.delegates.find((d) => d.address === delegateAddress)!
      expect(delegate.isDelegatedTo).toBe(true)
    })

    it('revokes active delegation and restores user direct voting power', () => {
      const store = useGovernanceStore.getState()
      const delegateAddress = 'GD7BX8M31NP4450KLS9921VZTTTR43100981A'

      store.delegateVotes(delegateAddress)
      expect(useGovernanceStore.getState().userVotingPower).toBe(0)

      const res = useGovernanceStore.getState().revokeDelegation()
      expect(res.success).toBe(true)

      const state = useGovernanceStore.getState()
      expect(state.currentDelegation).toBeNull()
      expect(state.userVotingPower).toBe(state.userTokenBalance)

      const delegate = state.delegates.find((d) => d.address === delegateAddress)!
      expect(delegate.isDelegatedTo).toBe(false)
    })

    it('handles delegation errors properly', () => {
      const store = useGovernanceStore.getState()
      const selfRes = store.delegateVotes(store.userAddress)
      expect(selfRes.success).toBe(false)
      expect(selfRes.error).toContain('Cannot delegate to your own address')

      const emptyRes = store.delegateVotes('')
      expect(emptyRes.success).toBe(false)

      const revokeEmpty = store.revokeDelegation()
      expect(revokeEmpty.success).toBe(false)
    })
  })

  describe('Store Actions - Proposal Creation', () => {
    it('creates a new proposal, locks deposit, and adds to proposal list', () => {
      const store = useGovernanceStore.getState()
      const initialCount = store.proposals.length
      const initialBalance = store.userTokenBalance

      const input: CreateProposalInput = {
        title: 'VIP-099: Community Validator Subsidy Pool',
        description: 'Establish a new subsidy pool for community validators to ensure decentralization.',
        category: 'treasury', topVoters: [],
        votingType: 'token-weighted',
        deposit: 500, type: "token-weighted", proposer: "user1",
        actions: [
          {
            id: 'act-1',
            target: 'CDLZFC3SY...',
            functionName: 'allocate_subsidy',
            parameters: {},
            value: '50,000 VN',
          },
        ],
      }

      const res = store.createProposal(input)
      expect(res.success).toBe(true)
      expect(res.proposalId).toBeDefined()

      const state = useGovernanceStore.getState()
      expect(state.proposals.length).toBe(initialCount + 1)
      expect(state.proposals[0].id).toBe(res.proposalId)
      expect(state.proposals[0].title).toBe(input.title)
      expect(state.proposals[0].status).toBe('active')
      expect(state.userTokenBalance).toBe(initialBalance - 500)
    })

    it('rejects proposal creation with invalid title, description, or insufficient deposit', () => {
      const store = useGovernanceStore.getState()

      const shortTitle = store.createProposal({
        title: 'Hi',
        description: 'Valid description with more than 20 characters in length.',
        category: 'general', topVoters: [],
        votingType: 'token-weighted',
        deposit: MINIMUM_PROPOSAL_DEPOSIT,
      })
      expect(shortTitle.success).toBe(false)

      const shortDesc = store.createProposal({
        title: 'Valid Long Proposal Title',
        description: 'Too short',
        category: 'general', topVoters: [],
        votingType: 'token-weighted',
        deposit: MINIMUM_PROPOSAL_DEPOSIT,
      })
      expect(shortDesc.success).toBe(false)

      const lowDeposit = store.createProposal({
        title: 'Valid Long Proposal Title',
        description: 'Valid description with more than 20 characters in length.',
        category: 'general', topVoters: [],
        votingType: 'token-weighted',
        deposit: 500, type: "token-weighted", proposer: "user1",
      })
      expect(lowDeposit.success).toBe(false)
    })
  })

  describe('Filtering & Selectors', () => {
    it('filters proposals by status, category, and search query', () => {
      const store = useGovernanceStore.getState()

      // Status filter
      store.setFilter('active')
      let filtered = useGovernanceStore.getState().getFilteredProposals()
      expect(filtered.every((p) => p.status === 'active')).toBe(true)

      // Category filter
      store.setFilter('all')
      store.setCategory('treasury')
      filtered = useGovernanceStore.getState().getFilteredProposals()
      expect(filtered.every((p) => p.category === 'treasury')).toBe(true)

      // Search query
      store.setCategory('all')
      store.setSearchQuery('Slashing')
      filtered = useGovernanceStore.getState().getFilteredProposals()
      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.some((p) => p.title.includes('Slashing'))).toBe(true)
    })

    it('computes governance metrics summary', () => {
      const metrics = useGovernanceStore.getState().getMetrics()
      expect(metrics.totalProposals).toBeGreaterThan(0)
      expect(metrics.activeProposals).toBeGreaterThan(0)
      expect(metrics.totalVotingPower).toBeGreaterThan(0)
      expect(metrics.userVotingPower).toBe(25000)
    })
  })
})
