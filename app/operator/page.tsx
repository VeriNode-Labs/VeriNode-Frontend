'use client';

import { OperatorDashboard } from '@/src/components/operator/OperatorDashboard';

export default function OperatorPage() {
  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950" aria-label="Operator dashboard">
      <OperatorDashboard />
    </main>
  );
}
