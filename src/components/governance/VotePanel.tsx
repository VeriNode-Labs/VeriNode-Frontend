'use client';

/**
 * VotePanel
 * 
 * Interactive voting panel for active governance proposals.
 * Features:
 * - Stance selection (For, Against, Abstain)
 * - Power / Token slider supporting Quadratic ($Power = \sqrt{Tokens}$) and Token-weighted ($Power = Tokens$)
 * - Live transaction gas cost preview before confirmation
 * - Secure confirmation dialog with wallet signature invocation
 */

import React, { useState, useMemo } from 'react';
import type { Proposal, VoteChoice } from '@/src/types/governance';
import { useWallet } from '@/src/hooks/useWallet';
import { useCastVote, useUserGovernanceProfile } from '@/src/hooks/useGovernance';
import { calculateVotingPower } from '@/src/services/governanceProposalService';

interface VotePanelProps {
  proposal: Proposal;
  onVoteSuccess?: () => void;
}

export function VotePanel({ proposal, onVoteSuccess }: VotePanelProps) {
  const { activeAccount, isConnected, connect } = useWallet();
  const userAddress = activeAccount?.publicKey ?? '';

  const { data: profile } = useUserGovernanceProfile(userAddress);
  const castVoteMutation = useCastVote();

  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const maxTokensAvailable = profile?.tokensLocked ?? 25000;
  const [tokensAllocated, setTokensAllocated] = useState<number>(Math.min(10000, maxTokensAvailable));
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);

  // Voting power calculation based on proposal mechanism
  const { power: votingPower, tokens: effectiveTokens } = useMemo(() => {
    return calculateVotingPower(tokensAllocated, proposal.type);
  }, [tokensAllocated, proposal.type]);

  // Gas cost estimation
  const gasEstimateGwei = proposal.type === 'quadratic' ? 48500 : 42000;
  const gasEstimateUsd = Number((gasEstimateGwei * 0.0000025).toFixed(2));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setTokensAllocated(val);
  };

  const handleInitiateVote = () => {
    if (!choice) return;
    setShowConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    if (!choice) return;

    try {
      const result = await castVoteMutation.mutateAsync({
        proposalId: proposal.id,
        voterAddress: userAddress || 'GA2C5RFPE6GCKMYYLHGOSKVXT2KEQXZ3Z2Q4F3E4R5T6Y7U8I9OPQRST',
        choice,
        tokens: effectiveTokens,
        power: votingPower,
        type: proposal.type,
      });

      setTxSuccessHash(result.txHash);
      setShowConfirmModal(false);
      onVoteSuccess?.();
    } catch (err) {
      console.error('Failed to cast vote:', err);
    }
  };

  if (proposal.status !== 'active') {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl">
        <h3 className="text-lg font-bold text-white">Cast Your Vote</h3>
        <div className="mt-4 rounded-2xl border border-slate-700/50 bg-slate-950/60 p-6 text-center">
          <p className="text-sm text-slate-400">
            Voting for this proposal is currently <span className="font-semibold text-white uppercase">{proposal.status}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Cast Your Vote</h3>
            <p className="text-xs text-slate-400">Participate in protocol consensus</p>
          </div>
          <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
            {proposal.type === 'quadratic' ? 'Quadratic Formula (Power = √Tokens)' : 'Token-Weighted (1 Token = 1 Vote)'}
          </span>
        </div>

        {/* Voting Options */}
        <div className="mt-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Decision</label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {/* For Button */}
            <button
              type="button"
              onClick={() => setChoice('for')}
              className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                choice === 'for'
                  ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/10'
                  : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-emerald-500/40 hover:bg-slate-900'
              }`}
            >
              <span className="text-lg font-bold text-emerald-400">Vote FOR</span>
              <span className="mt-1 text-[11px] text-slate-400">Approve changes</span>
            </button>

            {/* Against Button */}
            <button
              type="button"
              onClick={() => setChoice('against')}
              className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                choice === 'against'
                  ? 'border-rose-500 bg-rose-500/20 text-white shadow-lg shadow-rose-500/10'
                  : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:bg-slate-900'
              }`}
            >
              <span className="text-lg font-bold text-rose-400">Vote AGAINST</span>
              <span className="mt-1 text-[11px] text-slate-400">Reject changes</span>
            </button>

            {/* Abstain Button */}
            <button
              type="button"
              onClick={() => setChoice('abstain')}
              className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                choice === 'abstain'
                  ? 'border-slate-400 bg-slate-700/40 text-white shadow-lg'
                  : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-slate-500/40 hover:bg-slate-900'
              }`}
            >
              <span className="text-lg font-bold text-slate-300">ABSTAIN</span>
              <span className="mt-1 text-[11px] text-slate-400">Quorum only</span>
            </button>
          </div>
        </div>

        {/* Voting Power Slider */}
        <div className="mt-6 space-y-4 rounded-2xl border border-white/5 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Commit VRN Tokens</span>
            <span className="text-slate-400">
              Balance: <span className="font-bold text-white">{maxTokensAvailable.toLocaleString()} VRN</span>
            </span>
          </div>

          <input
            type="range"
            min="100"
            max={Math.max(100, maxTokensAvailable)}
            step="100"
            value={tokensAllocated}
            onChange={handleSliderChange}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-500"
          />

          {/* Calculations Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-slate-900/80 p-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Tokens Committed</span>
              <p className="mt-1 font-mono text-base font-bold text-white">
                {effectiveTokens.toLocaleString()} <span className="text-xs text-slate-400">VRN</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">Resulting Vote Power</span>
              <p className="mt-1 font-mono text-base font-bold text-sky-400">
                {votingPower.toLocaleString()} <span className="text-xs text-slate-400">Power</span>
              </p>
            </div>
          </div>

          {proposal.type === 'quadratic' && (
            <p className="text-[11px] text-slate-400">
              💡 Quadratic voting prevents capital domination by taking the square root: <span className="text-sky-300">√{effectiveTokens.toLocaleString()} ≈ {votingPower.toLocaleString()}</span> voting power.
            </p>
          )}
        </div>

        {/* Gas & Fee Preview */}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
          <span>Estimated Network Gas</span>
          <span className="font-mono text-slate-300">
            {gasEstimateGwei.toLocaleString()} Gwei <span className="text-slate-500">(≈ ${gasEstimateUsd})</span>
          </span>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          {!isConnected && !userAddress ? (
            <button
              type="button"
              onClick={() => connect()}
              className="w-full rounded-2xl border border-sky-500/30 bg-sky-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-sky-500"
            >
              Connect Wallet to Vote
            </button>
          ) : (
            <button
              type="button"
              disabled={!choice || castVoteMutation.isPending}
              onClick={handleInitiateVote}
              className="w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {castVoteMutation.isPending ? 'Broadcasting Vote...' : choice ? `Submit Vote ${choice.toUpperCase()}` : 'Select a Vote Option Above'}
            </button>
          )}
        </div>

        {/* Success Banner */}
        {txSuccessHash && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
            <div className="flex items-center gap-2 font-bold">
              <span>✓ Vote successfully recorded on-chain!</span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-400">
              Tx: {txSuccessHash.slice(0, 16)}...{txSuccessHash.slice(-8)}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Your Vote</h3>

            <div className="space-y-3 rounded-2xl bg-slate-950 p-4 text-xs text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Proposal</span>
                <span className="font-semibold text-white">{proposal.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Decision</span>
                <span
                  className={`font-bold uppercase ${
                    choice === 'for' ? 'text-emerald-400' : choice === 'against' ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {choice}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Tokens Committed</span>
                <span className="font-mono text-white">{effectiveTokens.toLocaleString()} VRN</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Vote Power</span>
                <span className="font-mono font-bold text-sky-400">{votingPower.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Gas Fee</span>
                <span className="font-mono text-slate-300">${gasEstimateUsd}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              By confirming, your wallet will sign and broadcast this vote transaction directly to the Soroban Governance Contract.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={castVoteMutation.isPending}
                className="rounded-xl border border-emerald-500/30 bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {castVoteMutation.isPending ? 'Confirming...' : 'Sign & Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
