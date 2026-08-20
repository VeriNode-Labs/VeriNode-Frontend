'use client'

import React, { useState } from 'react'
import {
  useGovernanceStore,
  calculateQuorumProgress,
  calculateEffectiveWeight,
} from '@/src/store/governanceStore'
import type { Proposal, VoteChoice } from '@/src/types/governance'

interface ProposalDetailProps {
  proposalId?: string | null
  onBack?: () => void
}

function getStatusBadge(status: Proposal['status']) {
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

export function ProposalDetail({ proposalId, onBack }: ProposalDetailProps) {
  const {
    proposals,
    selectedProposalId,
    userVotingPower,
    userAddress,
    castVote,
    selectProposal,
  } = useGovernanceStore()

  const targetId = proposalId ?? selectedProposalId
  const proposal = proposals.find((p) => p.id === targetId)

  // Vote form state
  const [selectedChoice, setSelectedChoice] = useState<VoteChoice>('for')
  const [allocatedPower, setAllocatedPower] = useState<number>(userVotingPower || 1000)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voteFeedback, setVoteFeedback] = useState<{ type: 'success' | 'error'; message: string; txHash?: string } | null>(null)

  if (!proposal) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center" data-testid="proposal-detail-empty">
        <p className="text-base text-slate-300">No proposal selected</p>
        <button
          type="button"
          onClick={() => {
            selectProposal(null)
            onBack?.()
          }}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Return to Proposals
        </button>
      </div>
    )
  }

  const quorum = calculateQuorumProgress(proposal)
  const isQuadratic = proposal.votingType === 'quadratic'
  const effectiveWeight = calculateEffectiveWeight(allocatedPower, proposal.votingType)
  const isProposalActive = proposal.status === 'active'

  const handlePercentagePreset = (pct: number) => {
    const power = Math.max(1, Math.floor((userVotingPower * pct) / 100))
    setAllocatedPower(power)
  }

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isProposalActive) return

    setIsSubmitting(true)
    setVoteFeedback(null)

    try {
      const res = castVote(proposal.id, selectedChoice, allocatedPower)
      if (res.success) {
        setVoteFeedback({
          type: 'success',
          message: `Vote successfully cast as "${selectedChoice.toUpperCase()}" with ${effectiveWeight.toLocaleString()} effective votes!`,
          txHash: res.txHash,
        })
      } else {
        setVoteFeedback({
          type: 'error',
          message: res.error || 'Failed to submit vote',
        })
      }
    } catch {
      setVoteFeedback({
        type: 'error',
        message: 'An unexpected error occurred during voting.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="proposal-detail-container">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            selectProposal(null)
            onBack?.()
          }}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:border-white/20 hover:bg-slate-800 hover:text-white"
        >
          ← Back to proposals
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-indigo-400">{proposal.id}</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(
              proposal.status,
            )}`}
          >
            {proposal.status}
          </span>
        </div>
      </div>

      {/* Main Header & Overview Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-md bg-slate-800 px-2 py-0.5 capitalize text-slate-300">
              {proposal.category.replace('-', ' ')}
            </span>
            <span>•</span>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">
              {isQuadratic ? '⚡ Quadratic Voting' : '⚖️ Token-Weighted Voting'}
            </span>
            <span>•</span>
            <span>Created {new Date(proposal.createdAt).toLocaleDateString()}</span>
          </div>

          <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            {proposal.title}
          </h1>
        </div>

        {/* Metadata info grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-slate-950/60 p-4 sm:grid-cols-4 text-xs">
          <div>
            <span className="text-slate-500">Proposer</span>
            <p className="mt-0.5 font-mono text-slate-200 truncate" title={proposal.proposer}>
              {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Deposit Locked</span>
            <p className="mt-0.5 font-semibold text-slate-200">{proposal.deposit.toLocaleString()} VN</p>
          </div>
          <div>
            <span className="text-slate-500">Voting Window</span>
            <p className="mt-0.5 font-mono text-slate-200">
              #{proposal.startBlock} - #{proposal.endBlock}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Quorum Target</span>
            <p className="mt-0.5 font-semibold text-slate-200">
              {proposal.quorum.toLocaleString()} votes
            </p>
          </div>
        </div>

        {/* User existing vote banner if present */}
        {proposal.userVote && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
            <span className="font-semibold">Your Vote:</span> You have already voted{' '}
            <span className="font-bold uppercase tracking-wider underline">
              {proposal.userVote}
            </span>{' '}
            on this proposal.
          </div>
        )}

        {/* Execution details if queued or executed */}
        {proposal.status === 'executed' && proposal.executionTxHash && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs text-purple-300">
            <span className="font-semibold">Executed On-Chain:</span> Tx Hash:{' '}
            <span className="font-mono text-purple-200 break-all">{proposal.executionTxHash}</span>
          </div>
        )}

        {proposal.status === 'queued' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300">
            <span className="font-semibold">Queued for Timelock:</span> Timelock execution window pending.
          </div>
        )}

        {/* Rendered proposal description */}
        <div className="border-t border-white/5 pt-4">
          <h2 className="text-sm font-semibold text-slate-200">Proposal Description</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300 whitespace-pre-line">
            {proposal.description}
          </div>
        </div>

        {/* Proposed Parameter Actions */}
        {proposal.actions && proposal.actions.length > 0 && (
          <div className="border-t border-white/5 pt-4">
            <h2 className="text-sm font-semibold text-slate-200">Proposed Actions & Parameters</h2>
            <div className="mt-3 space-y-3">
              {proposal.actions.map((act, index) => (
                <div
                  key={act.id || index}
                  className="rounded-xl border border-white/5 bg-slate-950/80 p-3 text-xs font-mono"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-indigo-300 font-semibold">
                    <span>Action #{index + 1}: {act.functionName}()</span>
                    {act.value && <span className="text-emerald-400 font-normal">{act.value}</span>}
                  </div>
                  <div className="mt-2 text-slate-400 break-all">
                    <span className="text-slate-500">Target Contract: </span>
                    {act.target}
                  </div>
                  <div className="mt-1 text-slate-400 break-all">
                    <span className="text-slate-500">Parameters: </span>
                    <span className="text-slate-200">{act.parameters}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Quorum & Vote Metrics (Left) + Vote Action Panel (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Voting Metrics & Progress */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">Current Vote Standing</h2>

          {/* Quorum Progress Box */}
          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Quorum Threshold</span>
              <span className="font-bold text-slate-200">
                {quorum.currentVotes.toLocaleString()} / {quorum.quorum.toLocaleString()} ({quorum.percentage}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  quorum.quorumReached ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${quorum.percentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {quorum.quorumReached ? (
                <span className="text-emerald-400 font-medium">✓ Quorum reached</span>
              ) : (
                <span className="text-amber-400 font-medium">
                  ⏳ {(quorum.quorum - quorum.currentVotes).toLocaleString()} more votes needed for quorum
                </span>
              )}
            </p>
          </div>

          {/* Detailed vote bars */}
          <div className="space-y-4">
            {/* For Votes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400">For (Yes)</span>
                <span className="font-mono text-slate-200">
                  {proposal.forVotes.toLocaleString()} votes ({quorum.forPercentage}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${quorum.forPercentage}%` }}
                />
              </div>
            </div>

            {/* Against Votes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-400">Against (No)</span>
                <span className="font-mono text-slate-200">
                  {proposal.againstVotes.toLocaleString()} votes ({quorum.againstPercentage}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${quorum.againstPercentage}%` }}
                />
              </div>
            </div>

            {/* Abstain Votes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">Abstain</span>
                <span className="font-mono text-slate-200">
                  {proposal.abstainVotes.toLocaleString()} votes ({quorum.abstainPercentage}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-slate-500 transition-all duration-300"
                  style={{ width: `${quorum.abstainPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Turnout summary card */}
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3 text-xs text-slate-400 flex justify-between">
            <span>Total Turnout:</span>
            <span className="font-semibold text-slate-200">{quorum.currentVotes.toLocaleString()} votes cast</span>
          </div>
        </div>

        {/* Cast Vote Action Panel */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Cast Your Vote</h2>
            <span className="text-xs text-slate-400">
              Power: <strong className="text-indigo-400">{userVotingPower.toLocaleString()} VN</strong>
            </span>
          </div>

          {!isProposalActive ? (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
              <p className="font-semibold text-slate-300">Voting is closed for this proposal</p>
              <p className="mt-1">This proposal is currently in <span className="font-bold uppercase">{proposal.status}</span> state.</p>
            </div>
          ) : userVotingPower <= 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 text-center text-xs text-amber-300">
              <p className="font-semibold">No Available Voting Power</p>
              <p className="mt-1">
                Your voting power may be currently delegated or you have 0 VN balance. Check the Delegate Hub to manage delegation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleVoteSubmit} className="space-y-4">
              {/* Choice selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300">Select Decision</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['for', 'against', 'abstain'] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setSelectedChoice(choice)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 text-xs font-semibold capitalize transition ${
                        selectedChoice === choice
                          ? choice === 'for'
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : choice === 'against'
                              ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                              : 'border-slate-400 bg-slate-700/50 text-slate-200'
                          : 'border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <span>{choice === 'for' ? '👍 For' : choice === 'against' ? '👎 Against' : '⚪ Abstain'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voting Power Slider & Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="vote-power-input" className="font-semibold text-slate-300">
                    Allocated Token Power
                  </label>
                  <span className="text-slate-400">{allocatedPower.toLocaleString()} VN</span>
                </div>

                <input
                  id="vote-power-slider"
                  type="range"
                  min={1}
                  max={userVotingPower}
                  value={allocatedPower}
                  onChange={(e) => setAllocatedPower(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                  aria-label="Voting power allocation slider"
                />

                {/* Percentage preset buttons */}
                <div className="flex items-center gap-1.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentagePreset(pct)}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-950/50 py-1 text-[11px] font-medium text-slate-400 hover:border-indigo-500/40 hover:text-white"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Weight & Gas Preview Box */}
              <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tokens Committed:</span>
                  <span className="font-mono text-slate-200">{allocatedPower.toLocaleString()} VN</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Effective Weight {isQuadratic ? '(√Tokens)' : '(1:1)'}:
                  </span>
                  <span className="font-mono font-bold text-indigo-400">
                    {effectiveWeight.toLocaleString()} votes
                  </span>
                </div>

                {isQuadratic && (
                  <p className="text-[11px] text-purple-300">
                    ⚡ Quadratic formula reduces whale influence (√{allocatedPower.toLocaleString()} = {effectiveWeight.toLocaleString()})
                  </p>
                )}

                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Estimated Gas Cost:</span>
                  <span className="font-mono text-slate-300">~0.0024 XLM ($0.0002)</span>
                </div>
              </div>

              {/* Feedback alert */}
              {voteFeedback && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    voteFeedback.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                  }`}
                >
                  <p className="font-semibold">{voteFeedback.message}</p>
                  {voteFeedback.txHash && (
                    <p className="mt-1 font-mono text-[10px] text-slate-300 break-all">
                      Tx: {voteFeedback.txHash}
                    </p>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || allocatedPower <= 0}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting Vote On-Chain...' : `Submit Vote (${selectedChoice.toUpperCase()})`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
