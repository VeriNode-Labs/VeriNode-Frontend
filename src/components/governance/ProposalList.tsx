'use client';

/**
 * ProposalList
 * 
 * Filterable, searchable proposal directory with status tabs (All, Active, Passed,
 * Defeated, Queued, Executed), category selectors, sorting, and infinite scroll / pagination.
 */

import React, { useState, useMemo } from 'react';
import type { ProposalStatus, ProposalCategory, ProposalFilterOptions } from '@/src/types/governance';
import { useProposals } from '@/src/hooks/useGovernance';
import { ProposalCard } from './ProposalCard';

interface ProposalListProps {
  onSelectProposal: (id: string) => void;
}

const STATUS_TABS: { label: string; value: ProposalStatus | 'all' }[] = [
  { label: 'All Proposals', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Passed', value: 'passed' },
  { label: 'Defeated', value: 'defeated' },
  { label: 'Queued', value: 'queued' },
  { label: 'Executed', value: 'executed' },
];

const CATEGORIES: (ProposalCategory | 'all')[] = ['all', 'Protocol', 'Treasury', 'Parameters', 'Security', 'Community'];

export function ProposalList({ onSelectProposal }: ProposalListProps) {
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ProposalCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ProposalFilterOptions['sortBy']>('recent');
  const [displayCount, setDisplayCount] = useState<number>(6);

  const filters: ProposalFilterOptions = useMemo(
    () => ({
      status: statusFilter,
      category: categoryFilter,
      searchQuery,
      sortBy,
    }),
    [statusFilter, categoryFilter, searchQuery, sortBy]
  );

  const { data: proposals, isLoading, isError, error } = useProposals(filters);

  const visibleProposals = useMemo(() => {
    if (!proposals) return [];
    return proposals.slice(0, displayCount);
  }, [proposals, displayCount]);

  const hasMore = proposals ? displayCount < proposals.length : false;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 6);
  };

  return (
    <div className="space-y-6">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value);
              setDisplayCount(6);
            }}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
              statusFilter === tab.value
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Secondary Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Search Input */}
        <div className="md:col-span-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayCount(6);
              }}
              placeholder="Search proposals by title, ID, or description..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs text-white placeholder-slate-500 backdrop-blur-xl focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Selector */}
        <div className="md:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as ProposalCategory | 'all');
              setDisplayCount(6);
            }}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs text-white backdrop-blur-xl focus:border-sky-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.filter((c) => c !== 'all').map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="md:col-span-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ProposalFilterOptions['sortBy'])}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-xs text-white backdrop-blur-xl focus:border-sky-500 focus:outline-none"
          >
            <option value="recent">Sort by: Recently Created</option>
            <option value="endingSoon">Sort by: Ending Soonest</option>
            <option value="mostVoted">Sort by: Highest Participation</option>
            <option value="deposit">Sort by: Highest Deposit</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-900/60 border border-white/5" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-sm text-rose-400">
          Failed to load proposals: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* Proposal Cards Grid */}
      {!isLoading && !isError && (
        <>
          {visibleProposals.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center">
              <p className="text-base font-semibold text-slate-300">No proposals found</p>
              <p className="mt-1 text-xs text-slate-500">
                Try adjusting your search criteria or switching status tabs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {visibleProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onSelect={onSelectProposal}
                />
              ))}
            </div>
          )}

          {/* Infinite Scroll / Load More */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="rounded-2xl border border-white/10 bg-slate-800/80 px-6 py-2.5 text-xs font-bold text-slate-200 transition-all hover:border-white/20 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                Load More Proposals (Showing {visibleProposals.length} of {proposals?.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
