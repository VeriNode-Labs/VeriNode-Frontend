'use client';

/**
 * ProposalCard
 * 
 * Card preview for governance proposals showing live status, voting breakdown,
 * remaining time countdown, and quorum progress.
 */

import React, { useMemo, useState, useEffect } from 'react';
import type { Proposal } from '@/src/types/governance';

interface ProposalCardProps {
  proposal: Proposal;
  onSelect: (id: string) => void;
}

export function ProposalCard({ proposal, onSelect }: ProposalCardProps) {
  const { forVotes, againstVotes, abstainVotes } = proposal;
  const totalVotes = forVotes + againstVotes + abstainVotes;

  const [timeRemainingText, setTimeRemainingText] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const end = new Date(proposal.endTime ?? 0).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemainingText(proposal.status === 'executed' ? 'Executed' : 'Voting Ended');
        return;
      }

      const days = Math.floor(diff / (24 * 3600 * 1000));
      const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
      if (days > 0) {
        setTimeRemainingText(`${days}d ${hours}h left`);
      } else {
        setTimeRemainingText(`${hours}h left`);
      }
    };
    
    updateTimer();
    const timerId = setInterval(updateTimer, 60000);
    return () => clearInterval(timerId);
  }, [proposal.endTime, proposal.status]);

  const { forPct, againstPct } = useMemo(() => {
    if (totalVotes === 0) return { forPct: 0, againstPct: 0 };
    return {
      forPct: (forVotes / totalVotes) * 100,
      againstPct: (againstVotes / totalVotes) * 100,
    };
  }, [forVotes, againstVotes, totalVotes]);

  const statusBadge = useMemo(() => {
    switch (proposal.status) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Active
          </span>
        );
      case 'passed':
        return (
          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-300">
            Passed
          </span>
        );
      case 'queued':
        return (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
            Queued
          </span>
        );
      case 'executed':
        return (
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
            Executed
          </span>
        );
      case 'defeated':
        return (
          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
            Defeated
          </span>
        );
      case 'canceled':
      default:
        return (
          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
            Cancelled
          </span>
        );
    }
  }, [proposal.status]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(proposal.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(proposal.id);
        }
      }}
      className="group cursor-pointer rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-sky-500/40 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-sky-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      {/* Header tags */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-sky-400">{proposal.id}</span>
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {proposal.category}
          </span>
          <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-400 capitalize">
            {proposal.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {timeRemainingText && <span className="text-xs text-slate-400">{timeRemainingText}</span>}
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-3 text-base font-bold text-white transition-colors group-hover:text-sky-300">
        {proposal.title}
      </h3>

      {/* Description Snippet */}
      <p className="mt-2 line-clamp-2 text-xs text-slate-400 leading-relaxed">
        {proposal.description.replace(/[#*`>-]/g, '').trim()}
      </p>

      {/* Voting Progress Bar */}
      <div className="mt-5 space-y-2 rounded-2xl border border-white/5 bg-slate-950/60 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-400">
            For {forPct.toFixed(1)}% <span className="text-slate-400">({forVotes.toLocaleString()})</span>
          </span>
          <span className="font-semibold text-rose-400">
            Against {againstPct.toFixed(1)}% <span className="text-slate-400">({againstVotes.toLocaleString()})</span>
          </span>
        </div>

        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${forPct}%` }} />
          <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${againstPct}%` }} />
        </div>

        {/* Quorum / Voters Footer */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
          <span>
            Quorum:{' '}
            <span className={proposal.quorumReached ? 'font-semibold text-emerald-400' : 'text-slate-300'}>
              {proposal.currentQuorumPercentage}%
            </span>{' '}
            / {proposal.quorumPercentage}%
          </span>
          <span>{proposal.totalVoters} total voters</span>
        </div>
      </div>
    </div>
  );
}
