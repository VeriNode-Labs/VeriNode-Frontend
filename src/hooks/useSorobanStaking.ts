'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendTransaction as rpcSendTransaction } from '@/src/lib/stellar/rpcClient';
import { sha256 } from '@/src/lib/crypto';
import { useTxRetryQueue, MAX_RETRY_ATTEMPTS, CONFIRMED_REMOVAL_DELAY_MS, computeBackoff } from '@/src/hooks/useTxRetryQueue';
import { decodeTransactionError } from '@/utils/errorDecoder';

export type SubmitState = 'idle' | 'submitting' | 'confirmed' | 'error';

export interface UseSorobanStakingReturn {
  submitStake: (txXDR: string) => Promise<void>;
  state: SubmitState;
  error: string | null;
  txHash: string | null;
  pendingCount: number;
}

export function useSorobanStaking(onToast?: (message: string, type: 'info' | 'success' | 'error') => void): UseSorobanStakingReturn {
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const queue = useTxRetryQueue();
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const recoverFromRefresh = useCallback(async () => {
    const pending = queue.getPendingEntries();
    for (const entry of pending) {
      if (entry.retryCount < MAX_RETRY_ATTEMPTS && entry.txHash) {
        try {
          const result = await rpcSendTransaction(entry.txXDR);
          if (result.status === 'confirmed') {
            queue.updateEntry(entry.txHash, { status: 'confirmed' });
            onToastRef.current?.('Transaction confirmed', 'success');
            setTimeout(() => queue.removeEntry(entry.txHash!), CONFIRMED_REMOVAL_DELAY_MS);
          } else if (result.status === 'error' && result.code === 'tx_bad_seq') {
            queue.updateEntry(entry.txHash, { status: 'confirmed' });
            onToastRef.current?.('Transaction already submitted and confirmed', 'success');
            setTimeout(() => queue.removeEntry(entry.txHash!), CONFIRMED_REMOVAL_DELAY_MS);
          } else if (result.status === 'network_error') {
            const retryCount = entry.retryCount + 1;
            const nextRetryAt = Date.now() + computeBackoff(retryCount);
            queue.updateEntry(entry.txHash, { retryCount, nextRetryAt });
          }
        } catch {
          const retryCount = entry.retryCount + 1;
          const nextRetryAt = Date.now() + computeBackoff(retryCount);
          queue.updateEntry(entry.txHash, { retryCount, nextRetryAt });
        }
      } else if (entry.retryCount < MAX_RETRY_ATTEMPTS && !entry.txHash) {
        const hash = await sha256(entry.txXDR);
        queue.updateEntry(hash, { txHash: hash });
        try {
          const result = await rpcSendTransaction(entry.txXDR);
          if (result.status === 'confirmed') {
            queue.updateEntry(hash, { status: 'confirmed' });
            onToastRef.current?.('Transaction confirmed', 'success');
            setTimeout(() => queue.removeEntry(hash), CONFIRMED_REMOVAL_DELAY_MS);
          } else if (result.status === 'network_error') {
            const retryCount = entry.retryCount + 1;
            const nextRetryAt = Date.now() + computeBackoff(retryCount);
            queue.updateEntry(hash, { retryCount, nextRetryAt });
          }
        } catch {
          const retryCount = entry.retryCount + 1;
          const nextRetryAt = Date.now() + computeBackoff(retryCount);
          queue.updateEntry(hash, { retryCount, nextRetryAt });
        }
      }
    }
  }, [queue]);

  useEffect(() => {
    recoverFromRefresh();
  }, [recoverFromRefresh]);

  const submitStake = useCallback(async (txXDR: string) => {
    setState('submitting');
    setError(null);

    const computedHash = await sha256(txXDR);

    const existing = queue.findDuplicate(txXDR);
    if (existing) {
      onToastRef.current?.('Transaction already submitted — awaiting confirmation', 'info');
      setTxHash(existing.txHash || computedHash);
      setState('confirmed');
      return;
    }

    const entry = queue.addEntry(txXDR, computedHash);

    try {
      const result = await rpcSendTransaction(txXDR);

      if (result.status === 'confirmed') {
        queue.updateEntry(computedHash, { status: 'confirmed' });
        setTxHash(result.txHash ?? computedHash);
        setState('confirmed');
        onToastRef.current?.('Transaction confirmed', 'success');
        setTimeout(() => queue.removeEntry(computedHash), CONFIRMED_REMOVAL_DELAY_MS);
        return;
      }

      if (result.status === 'error') {
        if (result.code === 'tx_bad_seq') {
          queue.updateEntry(computedHash, { status: 'confirmed' });
          setTxHash(computedHash);
          setState('confirmed');
          onToastRef.current?.('Transaction already submitted and confirmed', 'success');
          setTimeout(() => queue.removeEntry(computedHash), CONFIRMED_REMOVAL_DELAY_MS);
        } else {
          queue.updateEntry(computedHash, { status: 'failed' });
          const decoded = decodeTransactionError(result.error);
          setError(decoded.humanTitle);
          setState('error');
          onToastRef.current?.(decoded.humanTitle, 'error');
        }
        return;
      }

      if (result.status === 'network_error') {
        const retryCount = entry.retryCount + 1;
        const nextRetryAt = Date.now() + computeBackoff(retryCount);
        queue.updateEntry(computedHash, { retryCount, nextRetryAt, status: 'pending' });
        const decoded = decodeTransactionError(result.error);
        setError(decoded.humanTitle);
        setState('error');
        onToastRef.current?.(`Network error — will retry (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})`, 'error');
        return;
      }

      // Unknown result shape: decode and report
      const decoded = decodeTransactionError((result as any).error);
      setError(decoded.humanTitle);
      setState('error');
      onToastRef.current?.(decoded.humanTitle, 'error');
    } catch (err: unknown) {
      const decoded = decodeTransactionError(result.error);
      setError(decoded.humanTitle);
      setState('error');
      onToastRef.current?.(decoded.humanTitle, 'error');

      // schedule a retry entry
      const retryCount = entry.retryCount + 1;
      const nextRetryAt = Date.now() + computeBackoff(retryCount);
      queue.updateEntry(computedHash, { retryCount, nextRetryAt, status: 'pending' });
    }
  }, [queue]);

  return {
    submitStake,
    state,
    error,
    txHash,
    pendingCount: queue.getPendingEntries().length,
  };
}
