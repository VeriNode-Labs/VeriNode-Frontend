'use client';

import { use, Suspense } from 'react';
import { GovernanceDashboard } from '@/src/components/governance/GovernanceDashboard';

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export default function ProposalPage({ params }: ProposalPageProps) {
  const resolvedParams = use(params);
  const proposalId = resolvedParams.id;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="p-12 text-center text-slate-400 animate-pulse">Loading proposal {proposalId}...</div>}>
          <GovernanceDashboard initialProposalId={proposalId} />
        </Suspense>
      </main>
    </div>
  );
}
