'use client';

/**
 * ProposalCreator
 * 
 * Multi-step proposal creation suite featuring:
 * - Proposal metadata, category selection, and voting mechanism
 * - Rich Markdown description editor with live preview
 * - Parameter and calldata builder with instant dry-run simulation
 * - 500 VRN deposit requirement and on-chain propose() submission
 */

import React, { useState, useMemo } from 'react';
import type { ProposalCategory, ProposalVotingType, ProposalAction } from '@/src/types/governance';
import { useCreateProposal } from '@/src/hooks/useGovernance';
import { useWallet } from '@/src/hooks/useWallet';
import { simulateProposalExecution } from '@/src/services/governanceProposalService';
import { MarkdownEditor } from './MarkdownEditor';

interface ProposalCreatorProps {
  onProposalCreated: (proposalId: string) => void;
  onCancel: () => void;
}

const CATEGORIES: ProposalCategory[] = ['Protocol', 'Treasury', 'Parameters', 'Security', 'Community'];

export function ProposalCreator({ onProposalCreated, onCancel }: ProposalCreatorProps) {
  const { activeAccount } = useWallet();
  const createProposalMutation = useCreateProposal();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('Parameters');
  const [votingType, setVotingType] = useState<ProposalVotingType>('quadratic');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [description, setDescription] = useState(
    `### Summary\nProvide a concise overview of the problem and proposed resolution.\n\n### Motivation\nExplain why this change is necessary and beneficial for the VeriNode protocol.\n\n### Technical Specification\nDetail the exact parameter or smart contract modifications.\n\n### Risks & Security Considerations\nAddress any potential risks or edge cases.`
  );

  // Action Builder State
  const [actionType, setActionType] = useState<'slashing' | 'treasury' | 'validator' | 'custom'>('slashing');
  const [downtimePenaltyBps, setDowntimePenaltyBps] = useState<number>(75);
  const [gracePeriodHours, setGracePeriodHours] = useState<number>(48);
  const [grantRecipient, setGrantRecipient] = useState<string>('');
  const [grantAmountVrn, setGrantAmountVrn] = useState<number>(50000);
  const [minValidatorStake, setMinValidatorStake] = useState<number>(20000);
  const [customTarget, setCustomTarget] = useState<string>('');
  const [customMethod, setCustomMethod] = useState<string>('');
  const [customCalldata, setCustomCalldata] = useState<string>('');

  const builtActions: ProposalAction[] = useMemo(() => {
    if (actionType === 'slashing') {
      return [
        {
          id: 'act-slashing-1',
          targetContract: 'CAQODX6G7Y2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9O',
          functionName: 'updateSlashingParameters',
          calldata: '0x0000004b000000000002a300',
          parameters: {
            downtimePenaltyBps,
            gracePeriodSecs: gracePeriodHours * 3600,
          },
          description: `Update downtime slashing penalty to ${(downtimePenaltyBps / 100).toFixed(2)}% and upgrade grace window to ${gracePeriodHours} hours`,
        },
      ];
    }

    if (actionType === 'treasury') {
      return [
        {
          id: 'act-treasury-1',
          targetContract: 'CTREASURY7X2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9O',
          functionName: 'allocateGrant',
          calldata: '0x000000000000c350',
          parameters: {
            recipient: grantRecipient || 'GCKL34567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456',
            amountVrn: grantAmountVrn,
          },
          description: `Allocate ${grantAmountVrn.toLocaleString()} VRN grant from Community Treasury`,
        },
      ];
    }

    if (actionType === 'validator') {
      return [
        {
          id: 'act-validator-1',
          targetContract: 'CVALIDATOR7X2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9O',
          functionName: 'setMinValidatorStake',
          calldata: '0x0000000000004e20',
          parameters: {
            minStakeVrn: minValidatorStake,
          },
          description: `Set minimum validator self-bond stake to ${minValidatorStake.toLocaleString()} VRN`,
        },
      ];
    }

    return [
      {
        id: 'act-custom-1',
        targetContract: customTarget || 'CPROTOCOLV24Y2C46VNW4N3R624W5F6YJ3V7B4U5X2Z1W3E4R5T6Y7U8I9',
        functionName: customMethod || 'executeCustomAction',
        calldata: customCalldata || '0x00',
        parameters: { rawCalldata: customCalldata || '0x00' },
        description: `Invoke custom function ${customMethod || 'executeCustomAction'}() on target contract`,
      },
    ];
  }, [actionType, downtimePenaltyBps, gracePeriodHours, grantRecipient, grantAmountVrn, minValidatorStake, customTarget, customMethod, customCalldata]);

  // Real-time On-chain Parameter Simulation
  const simulation = useMemo(() => {
    return simulateProposalExecution(builtActions);
  }, [builtActions]);

  const isValid = title.trim().length >= 10 && description.trim().length >= 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const proposer = activeAccount?.publicKey || 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F';

    try {
      const created = await createProposalMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
        type: votingType,
        actions: builtActions,
        proposer,
        proposerName: 'Aura Validator Labs',
        durationDays,
      });

      onProposalCreated(created.id);
    } catch (err) {
      console.error('Failed to create proposal:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Create Governance Proposal</h2>
          <p className="text-xs text-slate-400">
            Submit a new proposal with on-chain parameter execution and dry-run state diff simulation.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      {/* 1. General Info */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl space-y-5">
        <h3 className="text-base font-bold text-white border-b border-white/10 pb-2">1. General Information</h3>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Proposal Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Adjust Validator Slashing Penalties and Grace Window..."
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        {/* Category, Voting Mechanism & Duration */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProposalCategory)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Voting Mechanism</label>
            <select
              value={votingType}
              onChange={(e) => setVotingType(e.target.value as ProposalVotingType)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="quadratic">Quadratic Voting (Power = √Tokens)</option>
              <option value="token-weighted">Token-Weighted (1 Token = 1 Vote)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Voting Duration</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              <option value={3}>3 Days</option>
              <option value={5}>5 Days (Standard)</option>
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Markdown Description */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-base font-bold text-white">2. Proposal Description (Markdown)</h3>
          <span className="text-xs text-slate-400">Supports headers, code blocks, alerts, and tables</span>
        </div>

        <MarkdownEditor
          value={description}
          onChange={setDescription}
          placeholder="Describe your proposal with background motivation, specifications, and impact analysis..."
        />
      </div>

      {/* 3. Parameter Calldata & On-Chain Simulation Builder */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div>
            <h3 className="text-base font-bold text-white">3. On-Chain Parameter & Calldata Builder</h3>
            <p className="text-xs text-slate-400">Select parameter preset or craft custom Soroban contract invocations</p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            ✓ Live Simulation Active
          </span>
        </div>

        {/* Action Preset Selector */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { id: 'slashing', label: 'Slashing Penalties' },
            { id: 'treasury', label: 'Treasury Grant' },
            { id: 'validator', label: 'Validator Min Stake' },
            { id: 'custom', label: 'Custom Calldata' },
          ] as const).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActionType(preset.id)}
              className={`rounded-2xl border p-3 text-center text-xs font-bold transition-all ${
                actionType === preset.id
                  ? 'border-sky-500 bg-sky-500/20 text-white shadow-lg shadow-sky-500/10'
                  : 'border-white/10 bg-slate-950/60 text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Action Inputs based on selected preset */}
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 space-y-4">
          {actionType === 'slashing' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Downtime Penalty (Basis Points)</label>
                <input
                  type="number"
                  value={downtimePenaltyBps}
                  onChange={(e) => setDowntimePenaltyBps(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
                />
                <span className="text-[10px] text-slate-500">75 Bps = 0.75% penalty on validator bond</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Upgrade Grace Period (Hours)</label>
                <input
                  type="number"
                  value={gracePeriodHours}
                  onChange={(e) => setGracePeriodHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
                />
                <span className="text-[10px] text-slate-500">Exemption window following consensus hard forks</span>
              </div>
            </div>
          )}

          {actionType === 'treasury' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Recipient Address (G...)</label>
                <input
                  type="text"
                  value={grantRecipient}
                  onChange={(e) => setGrantRecipient(e.target.value)}
                  placeholder="GCKL34567890ABCDEF1234567890ABCDEF1234567890ABCDEF123456"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Grant Amount (VRN)</label>
                <input
                  type="number"
                  value={grantAmountVrn}
                  onChange={(e) => setGrantAmountVrn(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
                />
              </div>
            </div>
          )}

          {actionType === 'validator' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Minimum Self-Bond Stake (VRN)</label>
              <input
                type="number"
                value={minValidatorStake}
                onChange={(e) => setMinValidatorStake(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
              />
              <span className="text-[10px] text-slate-500">Current network threshold: 10,000 VRN</span>
            </div>
          )}

          {actionType === 'custom' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder="Target Contract Address (C...)"
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
                />
                <input
                  type="text"
                  value={customMethod}
                  onChange={(e) => setCustomMethod(e.target.value)}
                  placeholder="Function Name (e.g., upgradeBytecode)"
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
                />
              </div>
              <textarea
                value={customCalldata}
                onChange={(e) => setCustomCalldata(e.target.value)}
                placeholder="Hex-encoded Calldata (0x...)"
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
              />
            </div>
          )}
        </div>

        {/* Live Simulation Projection Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">Projected State Diffs & Gas Consumption</span>
            <span>Estimated Gas: {simulation.gasEstimateGwei.toLocaleString()} Gwei (${simulation.gasEstimateUsd})</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-white/5 bg-slate-900/60 uppercase tracking-wider text-[10px] text-slate-400">
                <tr>
                  <th className="px-3 py-2">Parameter</th>
                  <th className="px-3 py-2">Current</th>
                  <th className="px-3 py-2">Projected</th>
                  <th className="px-3 py-2">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {simulation.stateDiffs.map((diff, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-sans font-medium text-white">{diff.parameter}</td>
                    <td className="px-3 py-2 text-rose-400">{diff.current}</td>
                    <td className="px-3 py-2 text-emerald-400">→ {diff.projected}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase text-sky-300">
                        {diff.impactLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Deposit & Submission Preview */}
      <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-6 backdrop-blur-xl space-y-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Proposal Deposit Requirement</h3>
            <p className="text-xs text-slate-300">
              Creating a governance proposal requires an on-chain deposit of <span className="font-bold text-emerald-400">500 VRN</span>.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Deposits are refunded automatically once the proposal reaches quorum or voting concludes.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-white/10 bg-slate-800 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={!isValid || createProposalMutation.isPending}
              className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
            >
              {createProposalMutation.isPending ? 'Broadcasting Proposal...' : 'Submit Proposal (500 VRN)'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
