'use client';

/**
 * Custom hooks for Governance interactions using TanStack React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProposals,
  fetchProposalById,
  fetchGovernanceMetrics,
  fetchUserGovernanceProfile,
  fetchDelegates,
  fetchUserVoteHistory,
  fetchDebateComments,
  castVote,
  createProposal,
  delegateVotingPower,
  revokeDelegation,
  postDebateComment,
} from '@/src/services/governanceProposalService';
import type {
  ProposalFilterOptions,
  ProposalCategory,
  ProposalVotingType,
  ProposalAction,
  VoteChoice,
} from '@/src/types/governance';

export const GOVERNANCE_QUERY_KEYS = {
  proposals: (filter?: ProposalFilterOptions) => ['governance', 'proposals', filter] as const,
  proposal: (id: string) => ['governance', 'proposal', id] as const,
  metrics: ['governance', 'metrics'] as const,
  profile: (address: string) => ['governance', 'profile', address] as const,
  delegates: ['governance', 'delegates'] as const,
  voteHistory: (address?: string) => ['governance', 'voteHistory', address] as const,
  comments: (proposalId: string) => ['governance', 'comments', proposalId] as const,
};

export function useProposals(filters: ProposalFilterOptions = {}) {
  return useQuery({
    queryKey: GOVERNANCE_QUERY_KEYS.proposals(filters),
    queryFn: () => fetchProposals(filters),
    staleTime: 30_000,
  });
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: GOVERNANCE_QUERY_KEYS.proposal(id),
    queryFn: () => fetchProposalById(id),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useGovernanceMetrics() {
  return useQuery({
    queryKey: GOVERNANCE_QUERY_KEYS.metrics,
    queryFn: fetchGovernanceMetrics,
    staleTime: 60_000,
  });
}

export function useUserGovernanceProfile(address: string) {
  return useQuery({
    queryKey: GOVERNANCE_QUERY_KEYS.profile(address),
    queryFn: () => fetchUserGovernanceProfile(address),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
}

export function useDelegates() {
  return useQuery({
    queryKey: GOVERNANCE_QUERY_KEYS.delegates,
    queryFn: fetchDelegates,
    staleTime: 60_000,
  });
}

export function useVoteHistory(address?: string) {
  return useQuery({
    queryKey: GOVERNANCE_QUERY_KEYS.voteHistory(address),
    queryFn: () => fetchUserVoteHistory(address),
    staleTime: 15_000,
  });
}

export function useDebateComments(proposalId: string) {
  return useQuery({
    queryKey: GOVERNANCE_QUERY_KEYS.comments(proposalId),
    queryFn: () => fetchDebateComments(proposalId),
    enabled: Boolean(proposalId),
    staleTime: 10_000,
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      voterAddress,
      choice,
      tokens,
      power,
      type,
    }: {
      proposalId: string;
      voterAddress: string;
      choice: VoteChoice;
      tokens: number;
      power: number;
      type: ProposalVotingType;
    }) => castVote(proposalId, voterAddress, choice, tokens, power, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.proposal(variables.proposalId) });
      queryClient.invalidateQueries({ queryKey: ['governance', 'voteHistory'] });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.metrics });
    },
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      category: ProposalCategory;
      type: ProposalVotingType;
      actions: ProposalAction[];
      proposer: string;
      proposerName?: string;
      durationDays?: number;
    }) => createProposal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'proposals'] });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.metrics });
    },
  });
}

export function useDelegate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ delegatorAddress, delegateAddress }: { delegatorAddress: string; delegateAddress: string }) =>
      delegateVotingPower(delegatorAddress, delegateAddress),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.delegates });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.profile(variables.delegatorAddress) });
    },
  });
}

export function useRevokeDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (delegatorAddress: string) => revokeDelegation(delegatorAddress),
    onSuccess: (_, delegatorAddress) => {
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.delegates });
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.profile(delegatorAddress) });
    },
  });
}

export function usePostComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      author,
      authorName,
      stance,
      content,
    }: {
      proposalId: string;
      author: string;
      authorName: string;
      stance: 'for' | 'against' | 'neutral';
      content: string;
    }) => postDebateComment(proposalId, author, authorName, stance, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.comments(variables.proposalId) });
    },
  });
}
