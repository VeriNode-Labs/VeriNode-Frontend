'use client';

/**
 * UnstakeForm
 *
 * Unstaking form with:
 * - Amount input with validation
 * - Cooldown notice (14-day lock period)
 * - Live countdown timer for active unstake requests
 * - Request tracking list showing all pending unstakes
 * - Confirmation via Soroban contract call
 */

import { useState, useMemo, useEffect } from 'react';
import { useSorobanStaking } from '@/src/hooks/useSorobanStaking';
import { useToast } from '@/src/components/Toast';
import type { UnstakeRequest } from '@/src/types/staking';

interface UnstakeFormProps {
  /** User's staked balance. */
  stakedBalance: number;
  /** Token symbol. */
  tokenSymbol: string;
  /** Active unstake requests. */
  unstakeRequests: UnstakeRequest[];
}

const COOLDOWN_DAYS = 14;

function formatAmount(n: number, symbol: string): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`;
}

function formatCountdown(targetIso: string): string {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return 'Ready to claim';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  active: 'bg-sky-500/15 text-sky-300',
  ready: 'bg-emerald-500/15 text-emerald-400',
  expired: 'bg-slate-700/60 text-slate-400',
};

function CooldownTimer({ request }: { request: UnstakeRequest }) {
  const [countdown, setCountdown] = useState(() => formatCountdown(request.readyAt));

  useEffect(() => {
    if (request.status === 'ready' || request.status === 'expired') return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(request.readyAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [request.readyAt, request.status]);

  return (
    <span className="tabular-nums font-mono text-xs">{countdown}</span>
  );
}

export function UnstakeForm({ stakedBalance, tokenSymbol, unstakeRequests }: UnstakeFormProps) {
  const { showToast } = useToast();
  const { unstake, pending } = useSorobanStaking(showToast);

  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [amount]);

  const isValidAmount = numericAmount > 0 && numericAmount <= stakedBalance;
  const hasPendingUnstake = pending.some((p) => p.action === 'unstake' && p.status === 'pending');

  const availableAfterLabel = `${COOLDOWN_DAYS} days from now`;

  const activeRequests = useMemo(
    () => unstakeRequests.filter((r) => r.status === 'active' || r.status === 'pending'),
    [unstakeRequests],
  );

  const readyRequests = useMemo(
    () => unstakeRequests.filter((r) => r.status === 'ready'),
    [unstakeRequests],
  );

  const handleSubmit = async () => {
    if (!isValidAmount || isSubmitting) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      await unstake(numericAmount);
      setAmount('');
      showToast(
        `Unstake request submitted. ${COOLDOWN_DAYS}-day cooldown will begin.`,
        'success',
      );
    } catch {
      // Error is handled by useSorobanStaking
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-white">Unstake Tokens</h3>
        <p className="text-xs text-slate-400">
          Unstaking requires a{' '}
          <span className="text-amber-400 font-medium">{COOLDOWN_DAYS}-day cooldown</span>{' '}
          before tokens are available
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="unstake-amount" className="block text-xs text-slate-400 mb-1.5">
            Amount to unstake
          </label>
          <div className="flex gap-2">
            <input
              id="unstake-amount"
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
              onClick={() => setAmount(stakedBalance.toString())}
              className="rounded-lg border border-white/10 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/60"
            >
              Max
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Staked: {formatAmount(stakedBalance, tokenSymbol)}
          </p>
        </div>

        {/* Cooldown warning */}
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-xs text-amber-300">
              <p className="font-medium">Cooldown period: {COOLDOWN_DAYS} days</p>
              <p className="mt-0.5 text-amber-400/70">
                After requesting unstake, tokens will be locked for {COOLDOWN_DAYS} days
                before they can be withdrawn to your wallet.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValidAmount || isSubmitting || hasPendingUnstake}
          className="w-full rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2.5 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting…
            </span>
          ) : hasPendingUnstake ? (
            'Unstake in progress…'
          ) : (
            `Request Unstake${numericAmount > 0 ? ` (${formatAmount(numericAmount, tokenSymbol)})` : ''}`
          )}
        </button>
      </div>

      {/* Active unstake requests with countdown */}
      {activeRequests.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-400">Active Cooldowns</h4>
          {activeRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-800/40 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[req.status]}`}>
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </span>
                <span className="text-sm text-white font-medium">
                  {formatAmount(req.amount, tokenSymbol)}
                </span>
              </div>
              <CooldownTimer request={req} />
            </div>
          ))}
        </div>
      )}

      {/* Ready to claim */}
      {readyRequests.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-emerald-400">Ready to Claim</h4>
          {readyRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2"
            >
              <span className="text-sm text-emerald-400 font-medium">
                {formatAmount(req.amount, tokenSymbol)}
              </span>
              <span className="text-xs text-emerald-400/70">Cooldown complete</span>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unstake-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-5">
            <h2 id="unstake-confirm-title" className="text-lg font-semibold text-white">
              Confirm Unstake
            </h2>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                You are requesting to unstake{' '}
                <span className="font-semibold text-amber-400">
                  {formatAmount(numericAmount, tokenSymbol)}
                </span>
              </p>
              <div className="rounded-lg bg-slate-800/60 px-4 py-3 space-y-1.5">
                <Row label="Unstake amount">
                  <span className="text-amber-400 font-semibold">
                    {formatAmount(numericAmount, tokenSymbol)}
                  </span>
                </Row>
                <Row label="Cooldown">
                  <span className="text-white">{COOLDOWN_DAYS} days</span>
                </Row>
                <Row label="Available after">
                  <span className="text-slate-300">
                    {availableAfterLabel}
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
                className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                Confirm Unstake
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
