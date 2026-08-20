'use client';

/**
 * VoteHistoryTable
 * 
 * Per-user governance vote history table with:
 * - Proposal navigation links
 * - Choice badges (For / Against / Abstain)
 * - Effective Power & Committed Tokens breakdown
 * - On-chain transaction hash links
 * - Gas Cost tracking in Gwei and USD
 * - Pagination controls and CSV export
 */

import React, { useState, useMemo } from 'react';
import { useVoteHistory } from '@/src/hooks/useGovernance';
import { useWallet } from '@/src/hooks/useWallet';
import { exportVoteHistoryCsv } from '@/src/services/governanceProposalService';

interface VoteHistoryTableProps {
  onSelectProposal?: (proposalId: string) => void;
}

export function VoteHistoryTable({ onSelectProposal }: VoteHistoryTableProps) {
  const { activeAccount } = useWallet();
  const address = activeAccount?.publicKey || '';

  const { data: records = [], isLoading } = useVoteHistory(address);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const [choiceFilter, setChoiceFilter] = useState<'all' | 'for' | 'against' | 'abstain'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (choiceFilter !== 'all') {
      list = list.filter((r) => r.choice === choiceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.proposalId.toLowerCase().includes(q) ||
          r.proposalTitle.toLowerCase().includes(q) ||
          r.txHash.toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, choiceFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleExportCsv = () => {
    const csvContent = exportVoteHistoryCsv(filteredRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `verinode_vote_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Your Governance Vote History</h3>
          <p className="text-xs text-slate-400">
            Track all past on-chain voting transactions, quadratic allocations, and network gas costs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <span>↓</span> Export CSV
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Filter:</span>
          {(['all', 'for', 'against', 'abstain'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => {
                setChoiceFilter(choice);
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                choiceFilter === choice
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {choice}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search votes by proposal or tx hash..."
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-950/60" />
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-12 text-center">
          <p className="text-sm font-semibold text-slate-300">No voting records found</p>
          <p className="mt-1 text-xs text-slate-500">Votes you cast will automatically appear here with gas tracking.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 bg-slate-900/80 uppercase tracking-wider text-[11px] text-slate-400">
              <tr>
                <th className="px-4 py-3">Proposal</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Vote Power</th>
                <th className="px-4 py-3">VRN Committed</th>
                <th className="px-4 py-3">Gas Cost</th>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {paginatedRecords.map((vote) => (
                <tr key={vote.id} className="transition-colors hover:bg-slate-900/50">
                  {/* Proposal ID & Title */}
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => onSelectProposal?.(vote.proposalId)}
                      className="text-left font-bold text-white hover:text-sky-400 hover:underline"
                    >
                      <span className="font-mono text-sky-400">{vote.proposalId}</span>: {vote.proposalTitle}
                    </button>
                  </td>

                  {/* Choice */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        vote.choice === 'for'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : vote.choice === 'against'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}
                    >
                      {vote.choice}
                    </span>
                  </td>

                  {/* Vote Power */}
                  <td className="px-4 py-3.5 font-mono font-semibold text-white">
                    {vote.power.toLocaleString()} <span className="text-[10px] text-slate-400">({vote.type})</span>
                  </td>

                  {/* VRN Committed */}
                  <td className="px-4 py-3.5 font-mono text-slate-300">{vote.tokens.toLocaleString()} VRN</td>

                  {/* Gas Cost */}
                  <td className="px-4 py-3.5 font-mono text-slate-300">
                    <div>{vote.gasCostGwei.toLocaleString()} Gwei</div>
                    <div className="text-[10px] text-slate-500">≈ ${vote.gasCostUsd.toFixed(2)}</div>
                  </td>

                  {/* Tx Hash */}
                  <td className="px-4 py-3.5 font-mono text-sky-400">
                    <span className="cursor-pointer hover:underline" title={vote.txHash}>
                      {vote.txHash.slice(0, 8)}...{vote.txHash.slice(-6)}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-4 py-3.5 text-[11px] text-slate-400">
                    {new Date(vote.timestamp).toLocaleDateString()} {new Date(vote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
