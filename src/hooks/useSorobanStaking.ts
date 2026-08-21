'use client';

import { useCallback, useMemo } from 'react';
import { useWallet } from '@/src/hooks/useWallet';
import { useStakingStore, type StakingAction, type PendingStake } from '@/src/store/stakingStore';
import { staking, StakingSubmitError } from '@/src/lib/api/staking';
import { getTransactionStatus } from '@/src/lib/stellar/rpcClient';

/**
 * Optimistic staking hook.
 *
 * Restructures stake adjustments into a four-state machine per action:
 *
 *   idle ──▶ pending (optimistic) ──▶ confirmed
 *                    └──────────────▶ failed (rollback)
 *
 * The optimistic balance update is applied synchronously (well under the 500ms
 * UX budget) and rolled back if the on-chain transaction fails or times out.
 * State lives in `stakingStore`, persisted to sessionStorage, so it survives
 * tab navigation / component remounts.
 */

/** Soroban finality budget — fail (and roll back) if not confirmed in time. */
export const CONFIRM_TIMEOUT_MS = 30_000;
const CONFIRM_POLL_INTERVAL_MS = 2_000;
/** Keep a settled entry around briefly so the UI can show the result. */
export const SETTLED_REMOVAL_DELAY_MS = 8_000;

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

export function explorerUrl(txHash: string): string {
  return `${EXPLORER_BASE}/${txHash}`;
}

type Toast = (message: string, type: 'info' | 'success' | 'error') => void;

export interface UseSorobanStakingReturn {
  stake: (amount: number) => Promise<void>;
  unstake: (amount: number) => Promise<void>;
  restake: (amount: number) => Promise<void>;
  delegate: (amount: number) => Promise<void>;
  undelegate: (amount: number) => Promise<void>;
  retry: (optimisticTxId: string) => Promise<void>;
  /** In-flight + recently settled optimistic operations. */
  pending: PendingStake[];
  /** Count of operations still awaiting finality. */
  pendingCount: number;
  /** Optimistic spendable balance (deltas applied), or null until seeded. */
  balance: number | null;
}

export function useSorobanStaking(onToast?: Toast): UseSorobanStakingReturn {
  const { activeAccount } = useWallet();
  const source = activeAccount?.publicKey;

  const pending = useStakingStore((s) => s.pending);
  const balance = useStakingStore((s) => s.optimisticBalance);
  const beginOptimistic = useStakingStore((s) => s.beginOptimistic);
  const attachHash = useStakingStore((s) => s.attachHash);
  const confirm = useStakingStore((s) => s.confirm);
  const fail = useStakingStore((s) => s.fail);
  const removePending = useStakingStore((s) => s.removePending);

  const runAction = useCallback(
    async (action: StakingAction, amount: number): Promise<void> => {
      if (!source) {
        onToast?.('Connect a wallet before staking', 'error');
        return;
      }

      // (a) Apply the optimistic balance change immediately and (b) mint a
      // temporary id so the operation is trackable before a real hash exists.
      const optimisticTxId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `opt-${Date.now()}-${Math.round(amount)}`;
      beginOptimistic({ optimisticTxId, action, amount });

      try {
        // (c) Submit and (d) record the optimisticTxId -> realTxHash mapping.
        const { transactionHash } = await staking.submit(action, { amount, source });
        attachHash(optimisticTxId, transactionHash);
        
        // Poll for confirmation
        const startTime = Date.now();
        let isConfirmed = false;
        let isFailed = false;

        while (Date.now() - startTime < CONFIRM_TIMEOUT_MS) {
          const result = await getTransactionStatus(transactionHash);
          
          if (result) {
            // Map Soroban RPC statuses to our logic
            const status = result.status.toUpperCase();
            if (status === 'SUCCESS' || status === 'CONFIRMED') {
              isConfirmed = true;
              break;
            } else if (status === 'FAILED' || status === 'ERROR') {
              isFailed = true;
              break;
            }
          }
          
          await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_INTERVAL_MS));
        }

        if (isConfirmed) {
          confirm(optimisticTxId);
          onToast?.('Transaction confirmed', 'success');
          
          setTimeout(() => {
            removePending(optimisticTxId);
          }, SETTLED_REMOVAL_DELAY_MS);
        } else if (isFailed) {
          throw new Error('Transaction failed on-chain');
        } else {
          throw new Error('Transaction confirmation timeout');
        }
      } catch (err) {
        const reason = err instanceof StakingSubmitError ? err.message : (err instanceof Error ? err.message : 'Staking failed');
        fail(optimisticTxId, reason);
        onToast?.(reason, 'error');
        
        import('@/src/services/sentry').then(({ captureTransactionFailure }) => {
          captureTransactionFailure({
            optimisticTxId,
            action,
            amount,
            reason
          });
        });
      }
    }, [source, beginOptimistic, attachHash, confirm, fail, removePending, onToast]);

  const retry = useCallback(
    async (optimisticTxId: string): Promise<void> => {
      const target = useStakingStore
        .getState()
        .pending.find((p) => p.optimisticTxId === optimisticTxId);
      if (!target) return;
      // Drop the failed entry and re-enter the optimistic lifecycle with the
      // same parameters.
      removePending(optimisticTxId);
      await runAction(target.action, target.amount);
    },
    [removePending, runAction]
  );

  return useMemo(
    () => ({
      stake: (amount: number) => runAction('stake', amount),
      unstake: (amount: number) => runAction('unstake', amount),
      restake: (amount: number) => runAction('restake', amount),
      delegate: (amount: number) => runAction('delegate', amount),
      undelegate: (amount: number) => runAction('undelegate', amount),
      retry,
      pending,
      pendingCount: pending.filter((p) => p.status === 'pending').length,
      balance,
    }),
    [runAction, retry, pending, balance]
  );
}

