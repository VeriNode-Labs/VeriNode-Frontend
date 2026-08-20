'use client';

/**
 * DelegateManager
 * 
 * Component for delegating voting power, revoking delegation, searching verified
 * delegates, viewing participation statistics, and custom address delegation.
 */

import React, { useState, useMemo } from 'react';
import type { Delegate } from '@/src/types/governance';
import { useDelegates, useUserGovernanceProfile, useDelegate, useRevokeDelegation } from '@/src/hooks/useGovernance';
import { useWallet } from '@/src/hooks/useWallet';

export function DelegateManager() {
  const { activeAccount } = useWallet();
  const userAddress = activeAccount?.publicKey || 'GA2C5RFPE6GCKMYYLHGOSKVXT2KEQXZ3Z2Q4F3E4R5T6Y7U8I9OPQRST';

  const { data: delegates = [], isLoading } = useDelegates();
  const { data: profile, refetch: refetchProfile } = useUserGovernanceProfile(userAddress);
  const delegateMutation = useDelegate();
  const revokeMutation = useRevokeDelegation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null);
  const [customAddress, setCustomAddress] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const filteredDelegates = useMemo(() => {
    if (!searchQuery.trim()) return delegates;
    const q = searchQuery.toLowerCase();
    return delegates.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q) ||
        d.bio.toLowerCase().includes(q)
    );
  }, [delegates, searchQuery]);

  const handleDelegate = async (delegateAddress: string) => {
    try {
      const res = await delegateMutation.mutateAsync({
        delegatorAddress: userAddress,
        delegateAddress,
      });
      setTxSuccess(res.txHash);
      setSelectedDelegate(null);
      setShowCustomModal(false);
      refetchProfile();
    } catch (err) {
      console.error('Failed to delegate:', err);
    }
  };

  const handleRevoke = async () => {
    try {
      const res = await revokeMutation.mutateAsync(userAddress);
      setTxSuccess(res.txHash);
      setShowRevokeModal(false);
      refetchProfile();
    } catch (err) {
      console.error('Failed to revoke delegation:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Active Delegation Hero Card */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Delegation Status</span>
            <h2 className="mt-1 text-2xl font-extrabold text-white">
              {profile?.isDelegating
                ? `Delegated to ${profile.delegatedToName || profile.delegatedTo?.slice(0, 10)}...`
                : 'Self-Voting (No Active Delegation)'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {profile?.isDelegating ? (
              <button
                type="button"
                onClick={() => setShowRevokeModal(true)}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
              >
                Revoke Delegation
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="rounded-2xl border border-sky-500/30 bg-sky-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-sky-500"
              >
                Delegate to Custom Address
              </button>
            )}
          </div>
        </div>

        {/* Profile Metrics Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400">Your VRN Token Balance</span>
            <p className="mt-1 font-mono text-lg font-bold text-white">
              {profile?.tokenBalance.toLocaleString() || '45,000'} <span className="text-xs text-slate-400">VRN</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400">Effective Voting Power</span>
            <p className="mt-1 font-mono text-lg font-bold text-sky-400">
              {profile?.isDelegating ? '0 (Delegated)' : `${profile?.votingPower.toLocaleString() || '45,000'} Power`}
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
            <span className="text-xs text-slate-400">Delegators Supporting You</span>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
              {profile?.delegatorCount || 0} <span className="text-xs text-slate-400">accounts</span>
            </p>
          </div>
        </div>

        {txSuccess && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            ✓ Transaction confirmed! Tx Hash: <span className="font-mono">{txSuccess.slice(0, 16)}...</span>
          </div>
        )}
      </div>

      {/* Delegate Directory Section */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Verified Delegate Directory</h3>
            <p className="text-xs text-slate-400">
              Select an active ecosystem validator or community delegate to represent your voting power.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search delegates by name, address..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Delegates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-900/60 border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredDelegates.map((delegate) => {
              const isCurrentDelegate = profile?.delegatedTo?.toLowerCase() === delegate.address.toLowerCase();

              return (
                <div
                  key={delegate.address}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl transition-all hover:border-sky-500/30 space-y-4"
                >
                  {/* Delegate Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={delegate.avatar}
                        alt={delegate.name}
                        className="h-12 w-12 rounded-2xl object-cover border border-white/10"
                      />
                      <div>
                        <h4 className="text-base font-bold text-white">{delegate.name}</h4>
                        <p className="font-mono text-[11px] text-slate-400">
                          {delegate.address.slice(0, 8)}...{delegate.address.slice(-6)}
                        </p>
                      </div>
                    </div>

                    {isCurrentDelegate ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        Current Delegate
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedDelegate(delegate)}
                        className="rounded-xl border border-sky-500/30 bg-sky-600/20 px-3 py-1.5 text-xs font-bold text-sky-400 transition-colors hover:bg-sky-600 hover:text-white"
                      >
                        Delegate Power
                      </button>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{delegate.bio}</p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-slate-950/60 p-3 text-center">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400">Voting Power</span>
                      <p className="mt-0.5 font-mono text-xs font-bold text-white">
                        {(delegate.votingPower / 1000).toFixed(0)}k <span className="text-slate-400">({delegate.votingPowerPercent}%)</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400">Delegators</span>
                      <p className="mt-0.5 font-mono text-xs font-bold text-white">{delegate.delegatorCount}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400">Participation</span>
                      <p className="mt-0.5 font-mono text-xs font-bold text-emerald-400">{delegate.participationRate}%</p>
                    </div>
                  </div>

                  {/* Recent Votes */}
                  {delegate.recentVotes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent Voting Stance</span>
                      <div className="flex flex-wrap gap-1.5">
                        {delegate.recentVotes.map((v, i) => (
                          <span
                            key={i}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              v.choice === 'for'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {v.proposalId}: {v.choice.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delegate Confirmation Modal */}
      {selectedDelegate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirm Delegation</h3>
            <p className="text-xs text-slate-300">
              You are about to delegate all your voting power ({profile?.tokenBalance.toLocaleString()} VRN) to{' '}
              <span className="font-bold text-white">{selectedDelegate.name}</span>.
            </p>

            <div className="rounded-2xl bg-slate-950 p-4 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Delegate Address</span>
                <span className="font-mono text-white">{selectedDelegate.address.slice(0, 10)}...{selectedDelegate.address.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Gas</span>
                <span className="font-mono text-slate-300">42,000 Gwei (≈ $0.10)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Delegation transfers voting rights only. Your tokens never leave your wallet and you can revoke or reassign at any time.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDelegate(null)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelegate(selectedDelegate.address)}
                disabled={delegateMutation.isPending}
                className="rounded-xl border border-sky-500/30 bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {delegateMutation.isPending ? 'Delegating...' : 'Confirm Delegation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Address Modal */}
      {showCustomModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delegate to Custom Address</h3>
            <p className="text-xs text-slate-300">
              Enter any valid Stellar / Soroban address (e.g. G...) to delegate your voting power.
            </p>

            <input
              type="text"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder="G..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelegate(customAddress)}
                disabled={!customAddress.trim() || delegateMutation.isPending}
                className="rounded-xl border border-sky-500/30 bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {delegateMutation.isPending ? 'Delegating...' : 'Delegate Power'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Revoke Delegation</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to revoke your delegation? Your voting power will be restored to your wallet for direct self-voting.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revokeMutation.isPending}
                className="rounded-xl border border-rose-500/30 bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
