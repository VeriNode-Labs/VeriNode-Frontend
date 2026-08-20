import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateVotingPower,
  calculateTokensForPower,
  simulateProposalExecution,
  fetchProposals,
  fetchProposalById,
  castVote,
  createProposal,
  fetchDelegates,
  delegateVotingPower,
  revokeDelegation,
  fetchUserVoteHistory,
  exportVoteHistoryCsv,
  fetchGovernanceMetrics,
} from '../governanceProposalService';
import type { ProposalAction, VoteRecord } from '@/src/types/governance';

describe('governanceProposalService', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Voting Power Math', () => {
    it('calculates quadratic voting power as square root of tokens', () => {
      expect(calculateVotingPower(10000, 'quadratic')).toEqual({ power: 100, tokens: 10000 });
      expect(calculateVotingPower(40000, 'quadratic')).toEqual({ power: 200, tokens: 40000 });
      expect(calculateVotingPower(0, 'quadratic')).toEqual({ power: 0, tokens: 0 });
      expect(calculateVotingPower(-500, 'quadratic')).toEqual({ power: 0, tokens: 0 });
    });

    it('calculates token-weighted voting power as 1 token = 1 power', () => {
      expect(calculateVotingPower(10000, 'token-weighted')).toEqual({ power: 10000, tokens: 10000 });
      expect(calculateVotingPower(25000, 'token-weighted')).toEqual({ power: 25000, tokens: 25000 });
    });

    it('calculates tokens required for target power', () => {
      expect(calculateTokensForPower(100, 'quadratic')).toBe(10000);
      expect(calculateTokensForPower(100, 'token-weighted')).toBe(100);
    });
  });

  describe('Parameter & Calldata Simulation Engine', () => {
    it('simulates slashing parameter adjustment correctly', () => {
      const actions: ProposalAction[] = [
        {
          id: 'act-1',
          targetContract: 'CAQODX6G7Y2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9O',
          functionName: 'updateSlashingParameters',
          calldata: '0x0000004b',
          parameters: { downtimePenaltyBps: 75, gracePeriodSecs: 172800 },
          description: 'Update slashing',
        },
      ];

      const sim = simulateProposalExecution(actions);
      expect(sim.success).toBe(true);
      expect(sim.gasEstimateGwei).toBeGreaterThan(40000);
      expect(sim.stateDiffs.some((d) => d.parameter === 'DowntimePenaltyBps')).toBe(true);
      expect(sim.logs.length).toBeGreaterThan(0);
    });

    it('simulates treasury grant allocation correctly', () => {
      const actions: ProposalAction[] = [
        {
          id: 'act-2',
          targetContract: 'CTREASURY7X2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9O',
          functionName: 'allocateGrant',
          calldata: '0x00c350',
          parameters: { amountVrn: 50000 },
          description: 'Treasury grant',
        },
      ];

      const sim = simulateProposalExecution(actions);
      expect(sim.success).toBe(true);
      expect(sim.stateDiffs.some((d) => d.parameter === 'TreasuryVRNBalance')).toBe(true);
    });
  });

  describe('Proposals API', () => {
    it('fetches initial mock proposals and filters by status', async () => {
      const all = await fetchProposals();
      expect(all.length).toBeGreaterThan(0);

      const active = await fetchProposals({ status: 'active' });
      expect(active.every((p) => p.status === 'active')).toBe(true);

      const passed = await fetchProposals({ status: 'passed' });
      expect(passed.every((p) => p.status === 'passed')).toBe(true);
    });

    it('filters proposals by search query', async () => {
      const results = await fetchProposals({ searchQuery: 'Slashing' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title.toLowerCase()).toContain('slashing');
    });

    it('fetches proposal by id', async () => {
      const prop = await fetchProposalById('PROP-048');
      expect(prop).toBeDefined();
      expect(prop?.id).toBe('PROP-048');

      const nonExistent = await fetchProposalById('PROP-999');
      expect(nonExistent).toBeNull();
    });

    it('creates a new proposal and stores it', async () => {
      const newProp = await createProposal({
        title: 'Community Hackathon Funding Proposal',
        description: 'Fund 50,000 VRN for global developer hackathon.',
        category: 'Community',
        type: 'quadratic',
        actions: [],
        proposer: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
        durationDays: 7,
      });

      expect(newProp.id).toBeDefined();
      expect(newProp.title).toBe('Community Hackathon Funding Proposal');
      expect(newProp.status).toBe('active');
      expect(newProp.deposit).toBe(500);

      const fetched = await fetchProposalById(newProp.id);
      expect(fetched).toBeDefined();
      expect(fetched?.title).toBe('Community Hackathon Funding Proposal');
    });
  });

  describe('Voting Operations', () => {
    it('records a vote and updates proposal power', async () => {
      const before = await fetchProposalById('PROP-048');
      const initialFor = before!.forVotes;

      const voteResult = await castVote(
        'PROP-048',
        'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
        'for',
        10000,
        100,
        'quadratic'
      );

      expect(voteResult.success).toBe(true);
      expect(voteResult.txHash).toBeDefined();

      const after = await fetchProposalById('PROP-048');
      expect(after!.forVotes).toBe(initialFor + 100);
      expect(after!.topVoters.some((v) => v.power === 100)).toBe(true);
    });

    it('throws error when voting on closed proposal', async () => {
      await expect(
        castVote(
          'PROP-044', // executed status
          'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
          'for',
          1000,
          1000,
          'token-weighted'
        )
      ).rejects.toThrow('Voting is closed for this proposal');
    });
  });

  describe('Delegation Operations', () => {
    it('delegates voting power and updates delegate stats', async () => {
      const delegates = await fetchDelegates();
      const target = delegates[0];
      const initialCount = target.delegatorCount;

      const res = await delegateVotingPower(
        'GUSER1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12',
        target.address
      );

      expect(res.success).toBe(true);
      const updatedDelegates = await fetchDelegates();
      const updatedTarget = updatedDelegates.find((d) => d.address === target.address);
      expect(updatedTarget!.delegatorCount).toBe(initialCount + 1);
    });

    it('revokes delegation cleanly', async () => {
      const delegator = 'GUSER1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const delegates = await fetchDelegates();
      await delegateVotingPower(delegator, delegates[0].address);

      const revokeRes = await revokeDelegation(delegator);
      expect(revokeRes.success).toBe(true);
    });
  });

  describe('Vote History & CSV Export', () => {
    it('fetches vote history records', async () => {
      const history = await fetchUserVoteHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('exports valid formatted CSV', () => {
      const mockRecords: VoteRecord[] = [
        {
          id: 'vh-1',
          proposalId: 'PROP-048',
          proposalTitle: 'Adjust Slashing Penalties',
          voter: 'GABC...',
          choice: 'for',
          power: 100,
          tokens: 10000,
          type: 'quadratic',
          txHash: '0x1234567890abcdef',
          gasCostGwei: 45000,
          gasCostUsd: 0.11,
          timestamp: '2026-08-20T12:00:00.000Z',
        },
      ];

      const csv = exportVoteHistoryCsv(mockRecords);
      expect(csv).toContain('Vote ID,Proposal ID,Proposal Title,Choice');
      expect(csv).toContain('"PROP-048"');
      expect(csv).toContain('"FOR"');
      expect(csv).toContain('"$0.11"');
    });

    it('fetches protocol governance metrics', async () => {
      const metrics = await fetchGovernanceMetrics();
      expect(metrics.totalVrnLocked).toBeGreaterThan(0);
      expect(metrics.activeProposalsCount).toBeGreaterThan(0);
      expect(metrics.participationRate).toBeGreaterThan(0);
    });
  });
});
