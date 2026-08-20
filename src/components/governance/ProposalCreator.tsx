'use client'

import React, { useState } from 'react'
import {
  useGovernanceStore,
  MINIMUM_PROPOSAL_DEPOSIT,
} from '@/src/store/governanceStore'
import type {
  ProposalCategory,
  VotingType,
  ProposalAction,
  CreateProposalInput,
} from '@/src/types/governance'

interface ProposalCreatorProps {
  onProposalCreated?: (proposalId: string) => void
}

export function ProposalCreator({ onProposalCreated }: ProposalCreatorProps) {
  const { userTokenBalance, createProposal } = useGovernanceStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProposalCategory>('parameter-change')
  const [votingType, setVotingType] = useState<VotingType>('token-weighted')
  const [deposit, setDeposit] = useState<number>(MINIMUM_PROPOSAL_DEPOSIT)
  const [actions, setActions] = useState<ProposalAction[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; proposalId?: string } | null>(null)

  const isDepositSufficient = userTokenBalance >= deposit

  const handleAddAction = () => {
    const newAction: ProposalAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      target: '',
      functionName: '',
      parameters: '{}',
      value: '',
    }
    setActions([...actions, newAction])
  }

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id))
  }

  const handleActionChange = (id: string, field: keyof ProposalAction, value: string) => {
    setActions(
      actions.map((a) => {
        if (a.id !== id) return a
        return { ...a, [field]: value }
      }),
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Proposal title is required.' })
      return
    }

    if (title.trim().length < 5) {
      setFeedback({ type: 'error', message: 'Title must be at least 5 characters long.' })
      return
    }

    if (!description.trim() || description.trim().length < 20) {
      setFeedback({
        type: 'error',
        message: 'Description must be at least 20 characters to provide sufficient context.',
      })
      return
    }

    if (deposit < MINIMUM_PROPOSAL_DEPOSIT) {
      setFeedback({
        type: 'error',
        message: `Deposit must be at least ${MINIMUM_PROPOSAL_DEPOSIT} VN tokens.`,
      })
      return
    }

    if (!isDepositSufficient) {
      setFeedback({
        type: 'error',
        message: `Insufficient balance for proposal deposit. Required: ${deposit} VN, Available: ${userTokenBalance} VN.`,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const input: CreateProposalInput = {
        title: title.trim(),
        description: description.trim(),
        category,
        votingType,
        deposit,
        actions: actions.filter((a) => a.target.trim() && a.functionName.trim()),
      }

      const res = createProposal(input)
      if (res.success && res.proposalId) {
        setFeedback({
          type: 'success',
          message: `Proposal ${res.proposalId} successfully created and submitted to governance!`,
          proposalId: res.proposalId,
        })
        // Reset form
        setTitle('')
        setDescription('')
        setActions([])
        setDeposit(MINIMUM_PROPOSAL_DEPOSIT)
        onProposalCreated?.(res.proposalId)
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to create proposal.',
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'An unexpected error occurred during proposal creation.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="proposal-creator-container">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        <h2 className="text-xl font-bold text-white">Create Governance Proposal</h2>
        <p className="mt-1 text-xs text-slate-400">
          Propose protocol changes, parameter updates, or treasury allocations. Proposals require a minimum deposit of {MINIMUM_PROPOSAL_DEPOSIT} VN tokens.
        </p>

        {/* Deposit Requirement Card */}
        <div className="mt-5 rounded-xl border border-white/5 bg-slate-950/80 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-300">Proposal Deposit Requirement</span>
              <p className="text-slate-400">
                Minimum required: <strong className="text-indigo-400">{MINIMUM_PROPOSAL_DEPOSIT} VN</strong> · Your spendable balance:{' '}
                <strong className={isDepositSufficient ? 'text-emerald-400' : 'text-rose-400'}>
                  {userTokenBalance.toLocaleString()} VN
                </strong>
              </p>
            </div>

            <div
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isDepositSufficient
                  ? 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                  : 'border border-rose-500/30 bg-rose-950/40 text-rose-300'
              }`}
            >
              {isDepositSufficient ? '✓ Sufficient Deposit Balance' : '⚠️ Insufficient Tokens'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="proposal-title" className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Proposal Title *</span>
            <span className="text-slate-500">{title.length} characters</span>
          </label>
          <input
            id="proposal-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. VIP-033: Implement Dynamic Staking Reward Curve"
            aria-label="Proposal title"
            className="w-full rounded-xl border border-white/10 bg-slate-950/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Category & Voting Type Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Category */}
          <div className="space-y-2">
            <label htmlFor="proposal-category" className="text-xs font-semibold text-slate-300">Category *</label>
            <select
              id="proposal-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ProposalCategory)}
              aria-label="Proposal category"
              className="w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="parameter-change">Parameter Change</option>
              <option value="treasury">Treasury Allocation</option>
              <option value="protocol-upgrade">Protocol Upgrade</option>
              <option value="general">General Governance</option>
            </select>
          </div>

          {/* Voting Type */}
          <div className="space-y-2">
            <label htmlFor="voting-mechanism" className="text-xs font-semibold text-slate-300">Voting Mechanism *</label>
            <select
              id="voting-mechanism"
              value={votingType}
              onChange={(e) => setVotingType(e.target.value as VotingType)}
              aria-label="Voting mechanism"
              className="w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="token-weighted">⚖️ Token-Weighted (1 token = 1 vote)</option>
              <option value="quadratic">⚡ Quadratic Voting (Weight = √tokens)</option>
            </select>
          </div>
        </div>

        {/* Deposit input */}
        <div className="space-y-2">
          <label htmlFor="proposal-deposit" className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Deposit Amount (VN Tokens) *</span>
            <span className="text-slate-400">Minimum: {MINIMUM_PROPOSAL_DEPOSIT} VN</span>
          </label>
          <input
            id="proposal-deposit"
            type="number"
            min={MINIMUM_PROPOSAL_DEPOSIT}
            value={deposit}
            onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
            aria-label="Proposal deposit amount"
            className="w-full rounded-xl border border-white/10 bg-slate-950/90 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Description textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="proposal-description" className="text-xs font-semibold text-slate-300">
              Description / Motivation *
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              {showPreview ? 'Edit Text' : 'Preview Formatted'}
            </button>
          </div>

          {showPreview ? (
            <div className="min-h-[160px] rounded-xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-line">
              {description.trim() ? description : 'No description text entered yet.'}
            </div>
          ) : (
            <textarea
              id="proposal-description"
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed rationale, background, specifications, and impact analysis of this proposal..."
              aria-label="Proposal description"
              className="w-full rounded-xl border border-white/10 bg-slate-950/90 p-4 text-xs leading-relaxed text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          )}
        </div>

        {/* Parameter Actions Builder */}
        <div className="space-y-3 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">On-Chain Parameter Actions (Optional)</h3>
              <p className="text-[11px] text-slate-400">
                Specify Soroban smart contract calls to execute automatically upon proposal passing.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddAction}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:border-indigo-500 hover:bg-indigo-600 hover:text-white transition"
            >
              + Add Action
            </button>
          </div>

          {actions.length > 0 && (
            <div className="space-y-3">
              {actions.map((act, index) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-white/10 bg-slate-950/80 p-4 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-indigo-300">
                    <span>Action #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(act.id)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] text-slate-400">Target Contract Address</label>
                      <input
                        type="text"
                        value={act.target}
                        onChange={(e) => handleActionChange(act.id, 'target', e.target.value)}
                        placeholder="e.g. CDLZFC3SYJYDZT..."
                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">Function Name</label>
                      <input
                        type="text"
                        value={act.functionName}
                        onChange={(e) => handleActionChange(act.id, 'functionName', e.target.value)}
                        placeholder="e.g. set_reward_rate"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] text-slate-400">Parameters (JSON or string)</label>
                      <input
                        type="text"
                        value={act.parameters}
                        onChange={(e) => handleActionChange(act.id, 'parameters', e.target.value)}
                        placeholder='{"rate_bps": 250}'
                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">Value / Token Tag (Optional)</label>
                      <input
                        type="text"
                        value={act.value || ''}
                        onChange={(e) => handleActionChange(act.id, 'value', e.target.value)}
                        placeholder="e.g. 50,000 VN"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`rounded-xl border p-4 text-xs ${
              feedback.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
            }`}
          >
            <p className="font-semibold">{feedback.message}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !isDepositSufficient || !title.trim()}
          className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating Proposal On-Chain...' : `Submit Proposal (Deposit ${deposit} VN)`}
        </button>
      </form>
    </div>
  )
}
