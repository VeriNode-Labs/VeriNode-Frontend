'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LightClientSyncIndicator } from '@/src/components/network/LightClientSyncIndicator';
import { SloMonitoringDashboard } from '@/src/components/slo/SloMonitoringDashboard';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/src/components/charts/ChartSkeleton';
import { WSHealthDashboard } from '@/src/components/network/WSHealthDashboard';
import { NetworkHealthDashboard } from '@/src/components/network/NetworkHealthDashboard';

const NetworkGraph = dynamic(
  () => import('@/src/components/network/NetworkGraph').then((m) => m.NetworkGraph),
  { ssr: false, loading: () => <ChartSkeleton height={320} /> },
);
import { NodeList } from '@/src/components/network/NodeList';
import type { NetworkNode } from '@/src/types/node';

const DEMO_NODES: NetworkNode[] = [
  {
    id: 'demo-1',
    displayName: 'Aurora Validator 🚀',
    description: 'High-uptime node in the EU region, operated by Aurora Labs. A & B tested.',
    location: 'Frankfurt, DE',
    contactEmail: 'ops@aurora.example',
    websiteUrl: 'https://aurora.example',
  },
  {
    id: 'demo-2',
    displayName: '日本ノード',
    description: 'Tokyo-based validator. 高可用性のノードです。',
    location: '東京',
    websiteUrl: 'http://jp-node.example',
  },
];

function NodeDirectory() {
  const params = useSearchParams();
  const injectedName = params.get('name');
  const injectedDescription = params.get('description');
  const injectedWebsite = params.get('website');

  const nodes: NetworkNode[] =
    injectedName !== null || injectedDescription !== null || injectedWebsite !== null
      ? [
          {
            id: 'injected',
            displayName: injectedName ?? 'Injected Node',
            description: injectedDescription ?? '',
            location: 'unknown',
            websiteUrl: injectedWebsite ?? undefined,
          },
          ...DEMO_NODES,
        ]
      : DEMO_NODES;

  return <NodeList nodes={nodes} />;
}

export default function NetworkStatus() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Network Health Dashboard (issue #173) */}
      <NetworkHealthDashboard />

      <div className="grid grid-cols-1 gap-8">
        <SloMonitoringDashboard />
        <WSHealthDashboard />
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Validator topology</h2>
          <NetworkGraph />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center h-full min-h-[300px]">
            <p className="text-zinc-500">Other Network Health Panel</p>
          </div>

          <LightClientSyncIndicator />
        </div>

        <section className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Node directory</h2>
          <p className="mb-6 text-sm text-zinc-500">
            Operator-supplied labels and descriptions are sanitized before rendering.
          </p>
          <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
            <NodeDirectory />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
