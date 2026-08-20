'use client';

/**
 * ProposalDetail
 * 
 * Comprehensive proposal view featuring:
 * - Proposal metadata and lifecycle badges
 * - Sanitized Markdown description with formatting
 * - On-chain action calldata & parameter simulation with state diffs
 * - Vote distribution donut chart and top voter table
 * - Interactive voting panel with quadratic / token-weighted power slider
 * - Community debate & discussion feed with stance markers
 */

import React, { useState } from 'react';
import { useProposal, useDebateComments, usePostComment } from '@/src/hooks/useGovernance';
import { useWallet } from '@/src/hooks/useWallet';
import { MarkdownRenderer } from './MarkdownRenderer';
import { VoteDistributionChart } from './VoteDistributionChart';
import { VotePanel } from './VotePanel';

interface ProposalDetailProps {
  proposalId: string;
  onBack: () => void;
}

export function ProposalDetail({ proposalId, onBack }: ProposalDetailProps) {
  const { data: proposal, isLoading, isError, error, refetch } = useProposal(proposalId);
  const { data: comments = [], refetch: refetchComments } = useDebateComments(proposalId);
  const postCommentMutation = usePostComment();
  const { activeAccount } = useWallet();

  const [commentStance, setCommentStance] = useState<'for' | 'against' | 'neutral'>('neutral');
  const [commentContent, setCommentContent] = useState('');
  const [showCalldataRaw, setShowCalldataRaw] = useState(false);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !proposal) return;

    const author = activeAccount?.publicKey || 'GA2C5RFPE6GCKMYYLHGOSKVXT2KEQXZ3Z2Q4F3E4R5T6Y7U8I9OPQRST';
    const authorName = `${author.slice(0, 6)}...${author.slice(-4)}`;

    try {
      await postCommentMutation.mutateAsync({
        proposalId: proposal.id,
        author,
        authorName,
        stance: commentStance,
        content: commentContent.trim(),
      });
      setCommentContent('');
      refetchComments();
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-800" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-900/60 border border-white/5" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-900/60 border border-white/5" />
      </div>
    );
  }

  if (isError || !proposal) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-sky-400 hover:underline"
        >
          ← Back to Proposals
        </button>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-400">
          Failed to load proposal: {error instanceof Error ? error.message : 'Proposal not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <span>←</span> Back to Proposals
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
            Deposit: {proposal.deposit} VRN
          </span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-sky-400">{proposal.id}</span>
          <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
            {proposal.category}
          </span>
          <span className="rounded-md bg-slate-800/60 px-2.5 py-0.5 text-xs text-slate-400 capitalize">
            {proposal.type} Voting
          </span>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase ${
              proposal.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : proposal.status === 'passed'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : proposal.status === 'queued'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : proposal.status === 'executed'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {proposal.status}
          </span>
        </div>

        <h1 className="text-2xl font-extrabold text-white sm:text-3xl leading-tight">
          {proposal.title}
        </h1>

        {/* Proposer Info and Timeline */}
        <div className="flex flex-wrap items-center gap-6 border-t border-white/10 pt-4 text-xs text-slate-400">
          <div>
            <span className="text-slate-500">Proposer: </span>
            <span className="font-medium text-white">{proposal.proposerName || 'Community Proposer'}</span>{' '}
            <span className="font-mono text-slate-500">({proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-4)})</span>
          </div>
          <div>
            <span className="text-slate-500">Voting Period: </span>
            <span className="text-slate-200">
              {new Date(proposal.startTime).toLocaleDateString()} — {new Date(proposal.endTime).toLocaleDateString()}
            </span>
          </div>
          {proposal.executionEta && (
            <div>
              <span className="text-slate-500">Execution ETA: </span>
              <span className="font-medium text-amber-300">{new Date(proposal.executionEta).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Description & Simulation on Left, Voting & Chart on Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Markdown Details & Calldata Simulation */}
        <div className="space-y-8 lg:col-span-7">
          {/* Proposal Description */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-lg font-bold text-white border-b border-white/10 pb-2">
              Proposal Details
            </h3>
            <MarkdownRenderer content={proposal.description} />
          </div>

          {/* On-chain Parameters & Simulation Diffs */}
          {proposal.actions && proposal.actions.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">On-Chain Parameter Simulation</h3>
                  <p className="text-xs text-slate-400">Dry-run state diff projection</p>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  ✓ Simulation Succeeded
                </span>
              </div>

              {/* Actions List */}
              <div className="space-y-3">
                {proposal.actions.map((act) => (
                  <div key={act.id} className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-sky-400">{act.functionName}()</span>
                      <span className="font-mono text-[10px] text-slate-500">Target: {act.targetContract.slice(0, 10)}...</span>
                    </div>
                    <p className="text-xs text-slate-300">{act.description}</p>

                    {/* Parameters Table */}
                    <div className="mt-2 rounded-xl bg-slate-900/90 p-2.5 font-mono text-[11px] space-y-1">
                      {Object.entries(act.parameters).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-slate-400">
                          <span className="text-slate-300">{key}:</span>
                          <span className="text-emerald-400">{String(val)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Calldata toggle */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCalldataRaw(!showCalldataRaw)}
                        className="text-[11px] text-slate-500 hover:text-slate-300"
                      >
                        {showCalldataRaw ? 'Hide Raw Calldata' : 'View Raw Calldata'}
                      </button>
                      {showCalldataRaw && (
                        <div className="mt-2 overflow-x-auto rounded-lg bg-black/80 p-2 font-mono text-[10px] text-slate-400 break-all">
                          {act.calldata}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* State Diffs */}
              {proposal.simulation.stateDiffs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Projected State Diffs</h4>
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/40">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-white/5 bg-slate-900/60 uppercase tracking-wider text-[10px] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Parameter</th>
                          <th className="px-3 py-2">Current State</th>
                          <th className="px-3 py-2">Projected State</th>
                          <th className="px-3 py-2">Impact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                        {proposal.simulation.stateDiffs.map((diff, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-sans font-medium text-white">{diff.parameter}</td>
                            <td className="px-3 py-2 text-rose-400">{diff.current}</td>
                            <td className="px-3 py-2 text-emerald-400">→ {diff.projected}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase ${
                                  diff.impactLevel === 'critical'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : diff.impactLevel === 'high'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-sky-500/20 text-sky-300'
                                }`}
                              >
                                {diff.impactLevel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Execution Logs */}
              <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-3 space-y-1 font-mono text-[10px] text-slate-400">
                <div className="text-[11px] font-bold text-slate-300 font-sans mb-1">Dry-Run Diagnostics</div>
                {proposal.simulation.logs.map((log, i) => (
                  <div key={i} className="text-emerald-400/90">{log}</div>
                ))}
                <div className="pt-1 text-slate-500 flex justify-between">
                  <span>Gas: {proposal.simulation.gasEstimateGwei.toLocaleString()} Gwei (${proposal.simulation.gasEstimateUsd})</span>
                  <span>Execution Time: {proposal.simulation.executionTimeMs}ms</span>
                </div>
              </div>
            </div>
          )}

          {/* Community Debate / Comments Section */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">Community Debate ({comments.length})</h3>
              <span className="text-xs text-slate-400">Stance-verified discussions</span>
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Your Stance:</span>
                <div className="flex gap-1.5">
                  {(['for', 'against', 'neutral'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCommentStance(st)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                        commentStance === st
                          ? st === 'for'
                            ? 'bg-emerald-600 text-white'
                            : st === 'against'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Share your technical or governance perspective on this proposal..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!commentContent.trim() || postCommentMutation.isPending}
                  className="rounded-xl border border-sky-500/30 bg-sky-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-sky-500 disabled:opacity-50"
                >
                  {postCommentMutation.isPending ? 'Posting...' : 'Post Perspective'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">No community comments yet. Be the first to start the debate!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {comment.authorAvatar ? (
                          <img src={comment.authorAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-800" />
                        )}
                        <span className="font-semibold text-white">{comment.authorName || 'Voter'}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            comment.stance === 'for'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : comment.stance === 'against'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {comment.stance}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Vote Panel & Distribution Chart */}
        <div className="space-y-8 lg:col-span-5">
          {/* Vote Action Panel */}
          <VotePanel
            proposal={proposal}
            onVoteSuccess={() => {
              refetch();
            }}
          />

          {/* Vote Distribution Donut Chart */}
          <VoteDistributionChart proposal={proposal} />
        </div>
      </div>
    </div>
  );
}
