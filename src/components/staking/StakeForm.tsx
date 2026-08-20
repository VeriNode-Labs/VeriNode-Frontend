'use client';

/**
 * StakeForm
 *
 * Token staking form with:
 * - Amount input with validation
 * - Live APR preview showing estimated rewards
 * - Confirmation via Soroban contract call (via useSorobanStaking)
 * - Gas estimate display
 */

import { useState, useMemo } from 'react';
import { useSorobanStaking } from '@/src/hooks/useSorobanStaking';
import { useToast } from '@/src/components/Toast';

interface StakeFormProps {
  /** Current staking APR for preview calculations. */
  currentApr: number;
  /** User's available balance. */
  availableBalance: number;
  /** Token symbol. */
  tokenSymbol: string;
}

function formatAmount(n: number, symbol: string): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`;
}

export function StakeForm({ currentApr, availableBalance, tokenSymbol }: StakeFormProps) {
  const { showToast } = useToast();
  const { stake, pending } = useSorobanStaking(showToast);

  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [amount]);

  const estimatedMonthlyReward = useMemo(() => {
    return (numericAmount * currentApr) / 100 / 12;
  }, [numericAmount, currentApr]);

  const estimatedYearlyReward = useMemo(() => {
    return (numericAmount * currentApr) / 100;
  }, [numericAmount, currentApr]);

  const estimatedUsd = useMemo(() => {
    // Use a mock price; in production this would come from the overview
    return estimatedYearlyReward * 2.45;
  }, [estimatedYearlyReward]);

  const isValidAmount = numericAmount > 0 && numericAmount <= availableBalance;
  const hasPendingStake = pending.some((p) => p.action === 'stake' && p.status === 'pending');

  const handleSubmit = async () => {
    if (!isValidAmount || isSubmitting) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      await stake(numericAmount);
      setAmount('');
      showToast(`Successfully staked ${formatAmount(numericAmount, tokenSymbol)}`, 'success');
    } catch {
      // Error is handled by useSorobanStaking
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-white">Stake Tokens</h3>
        <p className="text-xs text-slate-400">
          Stake VRN tokens to earn rewards at{' '}
          <span className="text-emerald-400 font-medium">{currentApr.toFixed(1)}% APR</span>
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="stake-amount" className="block text-xs text-slate-400 mb-1.5">
            Amount to stake
          </label>
          <div className="flex gap-2">
            <input
              id="stake-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline focus:outline-2 focus:outline-sky-400"
            />
            <button
              type="button"
              onClick={() => setAmount(availableBalance.toString())}
              className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/60"
            >
              Max
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Available: {formatAmount(availableBalance, tokenSymbol)}
          </p>
        </div>

        {/* APR Preview */}
        {numericAmount > 0 && (
          <div className="rounded-lg bg-slate-800/40 px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-slate-400">Projected Rewards</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Monthly</span>
                <p className="text-emerald-400 font-medium tabular-nums">
                  +{formatAmount(estimatedMonthlyReward, tokenSymbol)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Yearly</span>
                <p className="text-emerald-400 font-medium tabular-nums">
                  +{formatAmount(estimatedYearlyReward, tokenSymbol)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Est. USD/yr</span>
                <p className="text-sky-300 font-medium tabular-nums">
                  ≈ {estimatedUsd > 0 ? `$${estimatedUsd.toFixed(2)}` : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">APR</span>
                <p className="text-white font-medium">{currentApr.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValidAmount || isSubmitting || hasPendingStake}
          className="w-full rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Staking…
            </span>
          ) : hasPendingStake ? (
            'Stake in progress…'
          ) : (
            `Stake ${numericAmount > 0 ? formatAmount(numericAmount, tokenSymbol) : ''}`
          )}
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stake-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-5">
            <h2 id="stake-confirm-title" className="text-lg font-semibold text-white">
              Confirm Stake
            </h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                You are about to stake{' '}
                <span className="font-semibold text-emerald-400">
                  {formatAmount(numericAmount, tokenSymbol)}
                </span>
              </p>
              <div className="rounded-lg bg-slate-800/60 px-4 py-3 space-y-1.5">
                <Row label="Stake amount">
                  <span className="text-emerald-400 font-semibold">
                    {formatAmount(numericAmount, tokenSymbol)}
                  </span>
                </Row>
                <Row label="APR">
                  <span className="text-white">{currentApr.toFixed(1)}%</span>
                </Row>
                <Row label="Est. yearly reward">
                  <span className="text-emerald-400">
                    +{formatAmount(estimatedYearlyReward, tokenSymbol)}
                  </span>
                </Row>
              </div>
              <p className="text-xs text-slate-500">This will submit a Soroban transaction.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              >
                Confirm Stake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      {children}
    </div>
  );
}
