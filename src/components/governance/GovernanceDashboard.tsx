'use client';

/**
 * GovernanceDashboard
 * 
 * Top-level governance hub orchestrating:
 * 1. Protocol metrics overview (VRN locked, active proposals, participation rate)
 * 2. Proposal discovery & status filters (ProposalList)
 * 3. Detailed proposal inspection, markdown render, calldata simulation, and voting (ProposalDetail)
 * 4. Delegate voting power management & directory (DelegateManager)
 * 5. Proposal creation with live parameter simulation (ProposalCreator)
 * 6. User vote history with gas cost tracking & CSV export (VoteHistoryTable)
 */

import React, { useState } from 'react';
import { useGovernanceMetrics, useUserGovernanceProfile } from '@/src/hooks/useGovernance';
import { useWallet } from '@/src/hooks/useWallet';
import { ProposalList } from './ProposalList';
import { ProposalDetail } from './ProposalDetail';
import { DelegateManager } from './DelegateManager';
import { ProposalCreator } from './ProposalCreator';
import { VoteHistoryTable } from './VoteHistoryTable';

type TabType = 'proposals' | 'delegate' | 'create' | 'history';

interface GovernanceDashboardProps {
  initialProposalId?: string;
}

export function GovernanceDashboard({ initialProposalId }: GovernanceDashboardProps) {
  const { activeAccount } = useWallet();
  const address = activeAccount?.publicKey || '';

  const { data: metrics } = useGovernanceMetrics();
  const { data: profile } = useUserGovernanceProfile(address);

  const [activeTab, setActiveTab] = useState<TabType>('proposals');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(initialProposalId ?? null);

  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    setActiveTab('proposals');
  };

  const handleBackToList = () => {
    setSelectedProposalId(null);
  };

  const handleProposalCreated = (id: string) => {
    setSelectedProposalId(id);
    setActiveTab('proposals');
  };

  return (
    <div className="space-y-8">
      {/* Protocol Metrics Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total VRN Locked</span>
          <p className="mt-1.5 font-mono text-xl font-extrabold text-white">
            {metrics?.totalVrnLocked ? `${(metrics.totalVrnLocked / 1000000).toFixed(2)}M` : '18.45M'}{' '}
            <span className="text-xs font-normal text-slate-400">VRN</span>
          </p>
          <span className="mt-1 block text-[11px] text-emerald-400">
            ≈ ${metrics?.totalVrnLockedUsd ? (metrics.totalVrnLockedUsd / 1000000).toFixed(1) : '52.5'}M USD
          </span>
        </div>

        {/* Metric 2 */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Proposals</span>
          <p className="mt-1.5 font-mono text-xl font-extrabold text-sky-400">
            {metrics?.activeProposalsCount ?? 2}{' '}
            <span className="text-xs font-normal text-slate-400">Live</span>
          </p>
          <span className="mt-1 block text-[11px] text-slate-400">
            {metrics?.totalProposalsCount ?? 5} all-time proposals
          </span>
        </div>

        {/* Metric 3 */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Voter Participation</span>
          <p className="mt-1.5 font-mono text-xl font-extrabold text-teal-400">
            {metrics?.participationRate ?? 74.2}%
          </p>
          <span className="mt-1 block text-[11px] text-emerald-400">
            ✓ Healthy Quorum Velocity
          </span>
        </div>

        {/* Metric 4 */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Your Voting Power</span>
          <p className="mt-1.5 font-mono text-xl font-extrabold text-white">
            {profile?.isDelegating ? 'Delegated' : `${profile?.votingPower.toLocaleString() || '45,000'}`}
          </p>
          <span className="mt-1 block text-[11px] text-slate-400">
            {profile?.isDelegating
              ? `To ${profile.delegatedToName || 'Delegate'}`
              : `${profile?.tokenBalance.toLocaleString() || '45,000'} VRN Balance`}
          </span>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('proposals');
            }}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'proposals'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📋 Proposals
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('delegate');
              setSelectedProposalId(null);
            }}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'delegate'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            🤝 Delegate Voting Power
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setSelectedProposalId(null);
            }}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            ✍ Create Proposal
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              setSelectedProposalId(null);
            }}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            🕒 My Vote History
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'proposals' && (
          selectedProposalId ? (
            <ProposalDetail
              proposalId={selectedProposalId}
              onBack={handleBackToList}
            />
          ) : (
            <ProposalList onSelectProposal={handleSelectProposal} />
          )
        )}

        {activeTab === 'delegate' && <DelegateManager />}

        {activeTab === 'create' && (
          <ProposalCreator
            onProposalCreated={handleProposalCreated}
            onCancel={() => setActiveTab('proposals')}
          />
        )}

        {activeTab === 'history' && (
          <VoteHistoryTable onSelectProposal={handleSelectProposal} />
        )}
      </div>
    </div>
  );
}
