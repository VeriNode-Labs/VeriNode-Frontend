'use client'

import React, { useState } from 'react'
import {
  useGovernanceStore,
  formatVoteHistoryCsv,
} from '@/src/store/governanceStore'
import type { VoteChoice } from '@/src/types/governance'

function getChoiceBadge(choice: VoteChoice) {
  switch (choice) {
    case 'for':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    case 'against':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    case 'abstain':
      return 'bg-slate-700/50 text-slate-300 border-slate-600'
  }
}

function truncateHash(hash: string) {
  if (!hash || hash.length <= 14) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

interface VoteHistoryTableProps {
  onSelectProposal?: (proposalId: string) => void
}

export function VoteHistoryTable({ onSelectProposal }: VoteHistoryTableProps) {
  const { voteHistory, exportVoteHistoryCsv } = useGovernanceStore()
  const [filterQuery, setFilterQuery] = useState('')
  const [filterChoice, setFilterChoice] = useState<VoteChoice | 'all'>('all')

  const filteredHistory = voteHistory.filter((record) => {
    if (filterChoice !== 'all' && record.choice !== filterChoice) {
      return false
    }
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase()
      const matchTitle = record.proposalTitle.toLowerCase().includes(q)
      const matchId = record.proposalId.toLowerCase().includes(q)
      const matchTx = record.txHash.toLowerCase().includes(q)
      if (!matchTitle && !matchId && !matchTx) {
        return false
      }
    }
    return true
  })

  const handleExportCsv = () => {
    const csvContent = exportVoteHistoryCsv()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `governance-vote-history-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6" data-testid="vote-history-table-container">
      {/* Header and Export Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Your Voting History</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Immutable log of all governance votes cast by your account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={voteHistory.length === 0}
            data-testid="export-csv-button"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV ({voteHistory.length})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by proposal ID, title, or tx hash..."
            aria-label="Filter vote history"
            className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'for', 'against', 'abstain'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setFilterChoice(choice)}
              className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                filterChoice === choice
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      {filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
            📜
          </div>
          <p className="text-base font-semibold text-slate-200">No voting records found</p>
          <p className="mt-1 text-xs text-slate-400">
            {voteHistory.length === 0
              ? 'You have not cast any governance votes yet.'
              : 'No votes match your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Proposal</th>
                <th className="px-4 py-3.5">Choice</th>
                <th className="px-4 py-3.5">Voting Power</th>
                <th className="px-4 py-3.5">Effective Weight</th>
                <th className="px-4 py-3.5">Mechanism</th>
                <th className="px-4 py-3.5">Gas Cost</th>
                <th className="px-4 py-3.5">Tx Hash</th>
                <th className="px-4 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredHistory.map((record) => {
                const isQuadratic = record.votingType === 'quadratic'

                return (
                  <tr
                    key={record.id}
                    data-testid={`vote-row-${record.id}`}
                    className="hover:bg-slate-800/40 transition"
                  >
                    {/* Proposal ID & Title */}
                    <td className="px-4 py-3 font-sans">
                      <button
                        type="button"
                        onClick={() => onSelectProposal?.(record.proposalId)}
                        className="text-left font-semibold text-white hover:text-indigo-300 transition"
                      >
                        <span className="font-mono text-indigo-400 mr-1.5">{record.proposalId}:</span>
                        <span className="line-clamp-1">{record.proposalTitle}</span>
                      </button>
                    </td>

                    {/* Choice */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getChoiceBadge(
                          record.choice,
                        )}`}
                      >
                        {record.choice}
                      </span>
                    </td>

                    {/* Voting Power */}
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {record.votingPower.toLocaleString()} VN
                    </td>

                    {/* Effective Weight */}
                    <td className="px-4 py-3 font-bold text-indigo-400">
                      {record.effectiveWeight.toLocaleString()}{' '}
                      {isQuadratic && <span className="text-[10px] text-purple-300">(√)</span>}
                    </td>

                    {/* Mechanism */}
                    <td className="px-4 py-3 font-sans text-slate-400 capitalize">
                      {record.votingType.replace('-', ' ')}
                    </td>

                    {/* Gas Cost */}
                    <td className="px-4 py-3 text-slate-400">{record.gasCost}</td>

                    {/* Tx Hash */}
                    <td className="px-4 py-3 text-slate-400" title={record.txHash}>
                      {truncateHash(record.txHash)}
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3 font-sans text-slate-400 whitespace-nowrap">
                      {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
