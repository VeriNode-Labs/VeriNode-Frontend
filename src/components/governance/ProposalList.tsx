'use client'

import React from 'react'
import {
  useGovernanceStore,
  calculateQuorumProgress,
} from '@/src/store/governanceStore'
import type { ProposalStatus, ProposalCategory } from '@/src/types/governance'

const STATUS_TABS: { label: string; value: ProposalStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Passed', value: 'passed' },
  { label: 'Defeated', value: 'defeated' },
  { label: 'Queued', value: 'queued' },
  { label: 'Executed', value: 'executed' },
]

const CATEGORY_FILTERS: { label: string; value: ProposalCategory | 'all' }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Treasury', value: 'treasury' },
  { label: 'Parameter Change', value: 'parameter-change' },
  { label: 'Protocol Upgrade', value: 'protocol-upgrade' },
  { label: 'General', value: 'general' },
]

function getStatusBadge(status: ProposalStatus) {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    case 'passed':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40'
    case 'defeated':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    case 'queued':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    case 'executed':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    default:
      return 'bg-slate-700/50 text-slate-300 border-slate-600'
  }
}

function getCategoryBadge(category: ProposalCategory) {
  switch (category) {
    case 'treasury':
      return 'bg-amber-950/60 text-amber-300 border-amber-800/40'
    case 'parameter-change':
      return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40'
    case 'protocol-upgrade':
      return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40'
    case 'general':
      return 'bg-slate-800 text-slate-300 border-slate-700'
  }
}

function truncateAddress(addr: string) {
  if (!addr || addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

interface ProposalListProps {
  onSelectProposal?: (id: string) => void
}

export function ProposalList({ onSelectProposal }: ProposalListProps) {
  const {
    proposals,
    activeFilter,
    selectedCategory,
    searchQuery,
    setFilter,
    setCategory,
    setSearchQuery,
    selectProposal,
    getFilteredProposals,
  } = useGovernanceStore()

  const filteredProposals = getFilteredProposals()

  const getStatusCount = (status: ProposalStatus | 'all') => {
    if (status === 'all') return proposals.length
    return proposals.filter((p) => p.status === status).length
  }

  const handleSelect = (id: string) => {
    selectProposal(id)
    onSelectProposal?.(id)
  }

  return (
    <div className="space-y-6" data-testid="proposal-list-container">
      {/* Top Controls: Search and Category */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            role="searchbox"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals by title, ID, proposer, or keywords..."
            aria-label="Search proposals"
            className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-4 py-2.5 pl-10 text-sm text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <svg
            className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category filter select */}
        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setCategory(e.target.value as ProposalCategory | 'all')}
            aria-label="Filter by category"
            className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            {CATEGORY_FILTERS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3" role="tablist" aria-label="Proposal status filter">
        {STATUS_TABS.map((tab) => {
          const isActive = activeFilter === tab.value
          const count = getStatusCount(tab.value)

          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(tab.value)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Proposal Cards List */}
      {filteredProposals.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-200">No proposals found</p>
          <p className="mt-1 text-sm text-slate-400">
            Try adjusting your search query or status/category filters.
          </p>
          {(activeFilter !== 'all' || selectedCategory !== 'all' || searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setFilter('all')
                setCategory('all')
                setSearchQuery('')
              }}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProposals.map((proposal) => {
            const quorum = calculateQuorumProgress(proposal)
            const isQuadratic = proposal.votingType === 'quadratic'

            return (
              <div
                key={proposal.id}
                data-testid={`proposal-card-${proposal.id}`}
                onClick={() => handleSelect(proposal.id)}
                className="group cursor-pointer rounded-2xl border border-white/10 bg-slate-900/80 p-5 transition hover:border-indigo-500/50 hover:bg-slate-850 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400">
                      {proposal.id}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(
                        proposal.status,
                      )}`}
                    >
                      {proposal.status}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${getCategoryBadge(
                        proposal.category,
                      )}`}
                    >
                      {proposal.category.replace('-', ' ')}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${
                        isQuadratic
                          ? 'border-purple-500/40 bg-purple-950/40 text-purple-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isQuadratic ? '⚡ Quadratic' : '⚖️ Token-Weighted'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400">
                    Proposer: <span className="font-mono text-slate-300">{truncateAddress(proposal.proposer)}</span>
                  </div>
                </div>

                {/* Title and description */}
                <div className="mt-3">
                  <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition">
                    {proposal.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {proposal.description}
                  </p>
                </div>

                {/* Quorum and Vote Breakdown Section */}
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/5 pt-4 md:grid-cols-2">
                  {/* Quorum Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Quorum Progress</span>
                      <span className="font-medium text-slate-200">
                        {quorum.currentVotes.toLocaleString()} / {quorum.quorum.toLocaleString()}{' '}
                        <span className="text-slate-400">({quorum.percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={quorum.percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Quorum progress">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          quorum.quorumReached ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${quorum.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={quorum.quorumReached ? 'text-emerald-400' : 'text-amber-400'}>
                        {quorum.quorumReached ? '✓ Quorum reached' : '⏳ Quorum pending'}
                      </span>
                      <span className="text-slate-500">
                        Blocks: #{proposal.startBlock} - #{proposal.endBlock}
                      </span>
                    </div>
                  </div>

                  {/* Vote Breakdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Vote Breakdown</span>
                      <span className="text-slate-300">
                        Total: {quorum.currentVotes.toLocaleString()} votes
                      </span>
                    </div>

                    {/* Segmented bar */}
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      {quorum.forPercentage > 0 && (
                        <div
                          className="bg-emerald-500 transition-all duration-300"
                          style={{ width: `${quorum.forPercentage}%` }}
                          title={`For: ${quorum.forPercentage}%`}
                        />
                      )}
                      {quorum.againstPercentage > 0 && (
                        <div
                          className="bg-rose-500 transition-all duration-300"
                          style={{ width: `${quorum.againstPercentage}%` }}
                          title={`Against: ${quorum.againstPercentage}%`}
                        />
                      )}
                      {quorum.abstainPercentage > 0 && (
                        <div
                          className="bg-slate-600 transition-all duration-300"
                          style={{ width: `${quorum.abstainPercentage}%` }}
                          title={`Abstain: ${quorum.abstainPercentage}%`}
                        />
                      )}
                    </div>

                    {/* Legends */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        For {proposal.forVotes.toLocaleString()} ({quorum.forPercentage}%)
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Against {proposal.againstVotes.toLocaleString()} ({quorum.againstPercentage}%)
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />
                        Abstain {proposal.abstainVotes.toLocaleString()} ({quorum.abstainPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
