'use client';

import { useSorobanStaking, explorerUrl } from '@/src/hooks/useSorobanStaking';
import { useToast } from '@/src/components/Toast';
import type { PendingStake } from '@/src/store/stakingStore';

/**
 * Shows in-flight staking operations with an animated "transaction in flight"
 * pulse, a link to the Stellar explorer once a hash exists, and a retry button
 * for failed operations. Reads the optimistic `pending` list from the hook.
 */

function statusDot(status: PendingStake['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-400 animate-pulse';
    case 'confirmed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
  }
}

export function StakingPendingIndicator() {
  const { showToast } = useToast();
  const { pending, retry } = useSorobanStaking(showToast);

  if (pending.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2" aria-label="Pending staking transactions">
      {pending.map((p) => (
        <li
          key={p.optimisticTxId}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-2 w-2 rounded-full ${statusDot(p.status)}`} />
            <span className="font-medium capitalize">{p.action}</span>
            <span className="text-zinc-500">{p.amount}</span>
            {p.status === 'failed' && p.error && (
              <span className="text-xs text-red-600">— {p.error.reason}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {p.realTxHash && (
              <a
                href={explorerUrl(p.realTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-blue-600 underline hover:text-blue-800"
              >
                {p.realTxHash.slice(0, 6)}…{p.realTxHash.slice(-4)}
              </a>
            )}
            {p.status === 'failed' && (
              <button
                onClick={() => {
                  // retry() now rejects on a repeat failure (see
                  // useSorobanStaking's runAction fix) so the toast + pending
                  // list already reflect it - swallow the rejection here to
                  // avoid an unhandled promise rejection console warning from
                  // this fire-and-forget click handler.
                  retry(p.optimisticTxId).catch(() => {});
                }}
                className="rounded border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Retry
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
