'use client';

/**
 * VoteDistributionChart
 * 
 * Interactive SVG Donut / Pie Chart rendering vote breakdown (For, Against, Abstain),
 * Quorum gauge meter, and top voters list with on-chain transaction hash links.
 */

import React, { useMemo } from 'react';
import type { Proposal } from '@/src/types/governance';

interface VoteDistributionChartProps {
  proposal: Proposal;
}

export function VoteDistributionChart({ proposal }: VoteDistributionChartProps) {
  const { forVotes, againstVotes, abstainVotes, forTokens, againstTokens, abstainTokens, type } = proposal;
  
  const totalVotes = forVotes + againstVotes + abstainVotes;

  const { forPct, againstPct, abstainPct, slices } = useMemo(() => {
    if (totalVotes === 0) {
      return {
        forPct: 0,
        againstPct: 0,
        abstainPct: 0,
        slices: [],
      };
    }

    const fPct = (forVotes / totalVotes) * 100;
    const aPct = (againstVotes / totalVotes) * 100;
    const absPct = (abstainVotes / totalVotes) * 100;

    // Build SVG Donut Slices
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    const forDash = (fPct / 100) * circumference;
    const againstDash = (aPct / 100) * circumference;
    const abstainDash = (absPct / 100) * circumference;

    const forOffset = 0;
    const againstOffset = -forDash;
    const abstainOffset = -(forDash + againstDash);

    return {
      forPct: fPct,
      againstPct: aPct,
      abstainPct: absPct,
      slices: [
        { label: 'For', color: '#10b981', strokeColor: 'stroke-emerald-500', dash: `${forDash} ${circumference - forDash}`, offset: forOffset, count: forVotes, tokens: forTokens, pct: fPct },
        { label: 'Against', color: '#f43f5e', strokeColor: 'stroke-rose-500', dash: `${againstDash} ${circumference - againstDash}`, offset: againstOffset, count: againstVotes, tokens: againstTokens, pct: aPct },
        { label: 'Abstain', color: '#64748b', strokeColor: 'stroke-slate-500', dash: `${abstainDash} ${circumference - abstainDash}`, offset: abstainOffset, count: abstainVotes, tokens: abstainTokens, pct: absPct },
      ],
    };
  }, [forVotes, againstVotes, abstainVotes, forTokens, againstTokens, abstainTokens, totalVotes]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Vote Distribution</h3>
          <p className="text-xs text-slate-400">
            Mechanism: <span className="font-semibold text-sky-400 capitalize">{type} voting</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              proposal.quorumReached
                ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                : 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
            }`}
          >
            {proposal.quorumReached ? '✓ Quorum Reached' : 'Quorum Pending'} ({proposal.currentQuorumPercentage}% / {proposal.quorumPercentage}%)
          </span>
        </div>
      </div>

      {/* Chart and Legend */}
      <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* SVG Donut */}
        <div className="relative flex justify-center lg:col-span-5">
          <div className="relative h-48 w-48">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 180 180">
              {/* Background Ring */}
              <circle
                cx="90"
                cy="90"
                r="70"
                className="stroke-slate-800"
                strokeWidth="18"
                fill="transparent"
              />
              {/* Slices */}
              {totalVotes > 0 &&
                slices.map((slice, idx) => (
                  <circle
                    key={idx}
                    cx="90"
                    cy="90"
                    r="70"
                    className={`${slice.strokeColor} transition-all duration-700 ease-out`}
                    strokeWidth="18"
                    strokeDasharray={slice.dash}
                    strokeDashoffset={slice.offset}
                    strokeLinecap="butt"
                    fill="transparent"
                  />
                ))}
            </svg>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Power</span>
              <span className="text-xl font-extrabold text-white">
                {totalVotes.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">{proposal.totalVoters} voters</span>
            </div>
          </div>
        </div>

        {/* Legend / Metrics */}
        <div className="space-y-4 lg:col-span-7">
          {/* For Bar */}
          <div className="space-y-1.5 rounded-2xl border border-white/5 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                For ({forPct.toFixed(1)}%)
              </span>
              <span className="text-slate-300">
                <span className="font-bold text-white">{forVotes.toLocaleString()}</span> power
                {type === 'quadratic' && <span className="text-slate-400"> ({forTokens.toLocaleString()} VRN)</span>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${forPct}%` }} />
            </div>
          </div>

          {/* Against Bar */}
          <div className="space-y-1.5 rounded-2xl border border-white/5 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Against ({againstPct.toFixed(1)}%)
              </span>
              <span className="text-slate-300">
                <span className="font-bold text-white">{againstVotes.toLocaleString()}</span> power
                {type === 'quadratic' && <span className="text-slate-400"> ({againstTokens.toLocaleString()} VRN)</span>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${againstPct}%` }} />
            </div>
          </div>

          {/* Abstain Bar */}
          <div className="space-y-1.5 rounded-2xl border border-white/5 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                Abstain ({abstainPct.toFixed(1)}%)
              </span>
              <span className="text-slate-300">
                <span className="font-bold text-white">{abstainVotes.toLocaleString()}</span> power
                {type === 'quadratic' && <span className="text-slate-400"> ({abstainTokens.toLocaleString()} VRN)</span>}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-slate-500 transition-all duration-500" style={{ width: `${abstainPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Voters Table */}
      {proposal.topVoters && proposal.topVoters.length > 0 && (
        <div className="mt-8">
          <h4 className="mb-3 text-sm font-semibold text-slate-300">Top Verified Voters</h4>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/10 bg-slate-900/80 uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Voter</th>
                  <th className="px-4 py-3">Choice</th>
                  <th className="px-4 py-3">Vote Power</th>
                  <th className="px-4 py-3">Tokens Committed</th>
                  <th className="px-4 py-3">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {proposal.topVoters.map((voter, index) => (
                  <tr key={index} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{voter.name || `${voter.address.slice(0, 6)}...${voter.address.slice(-4)}`}</div>
                      <div className="font-mono text-[10px] text-slate-500">{voter.address.slice(0, 14)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          voter.choice === 'for'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : voter.choice === 'against'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {voter.choice}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{voter.power.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400">{voter.tokens.toLocaleString()} VRN</td>
                    <td className="px-4 py-3 font-mono text-sky-400">
                      <span className="cursor-pointer hover:underline" title={voter.txHash}>
                        {voter.txHash.slice(0, 10)}...{voter.txHash.slice(-6)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
