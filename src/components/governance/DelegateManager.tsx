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

        {filteredDelegates.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-8 text-center text-xs text-slate-400">
            No delegates match your search query.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredDelegates.map((delegate) => {
              const isSelected = currentDelegation === delegate.address

              return (
                <div
                  key={delegate.address}
                  data-testid={`delegate-card-${delegate.address}`}
                  className={`rounded-2xl border p-5 transition ${
                    isSelected
                      ? 'border-indigo-500/60 bg-slate-900 shadow-lg shadow-indigo-500/10'
                      : 'border-white/10 bg-slate-900/80 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{delegate.name}</h4>
                      <p className="mt-0.5 font-mono text-xs text-indigo-400" title={delegate.address}>
                        {truncateAddress(delegate.address)}
                      </p>
                    </div>

                    {isSelected ? (
                      <span className="rounded-full border border-indigo-500/40 bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                        Active Delegate
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelegate(delegate.address)}
                        className="rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:bg-indigo-600 hover:text-white transition"
                      >
                        Delegate Power
                      </button>
                    )}
                  </div>

                  {delegate.statement && (
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      {delegate.statement}
                    </p>
                  )}

                  {/* Delegate metrics grid */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center text-[11px]">
                    <div>
                      <span className="text-slate-500">Voting Power</span>
                      <p className="mt-0.5 font-bold text-slate-200">
                        {delegate.votingPower.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Delegators</span>
                      <p className="mt-0.5 font-bold text-slate-200">{delegate.delegatorsCount}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Participation</span>
                      <p className="mt-0.5 font-bold text-emerald-400">{delegate.participationRate}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
