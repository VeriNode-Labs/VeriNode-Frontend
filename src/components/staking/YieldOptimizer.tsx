'use client';

/**
 * YieldOptimizer
 *
 * Toggle to opt-in to auto-depositing staking rewards into DeFi lending
 * protocols (Aave or Compound). Displays:
 * - Enable/disable toggle
 * - Protocol selector
 * - Deposit percentage slider
 * - Extra APY earned from DeFi
 * - Total combined APY
 */

import { useMemo } from 'react';
import type { YieldOptimizerSettings, DefiProtocol } from '@/src/types/staking';

interface YieldOptimizerProps {
  settings: YieldOptimizerSettings;
  onToggle: () => void;
  onProtocolChange: (protocol: DefiProtocol) => void;
  onDepositPercentageChange: (pct: number) => void;
}

const PROTOCOL_INFO: Record<DefiProtocol, { label: string; icon: string; description: string }> = {
  aave: {
    label: 'Aave',
    icon: '🔵',
    description: 'Deposit rewards into Aave lending pools for variable APY',
  },
  compound: {
    label: 'Compound',
    icon: '🟢',
    description: 'Deposit rewards into Compound for supply APY',
  },
  none: {
    label: 'None',
    icon: '⚪',
    description: 'No DeFi integration — keep rewards as VRN',
  },
};

export function YieldOptimizer({
  settings,
  onToggle,
  onProtocolChange,
  onDepositPercentageChange,
}: YieldOptimizerProps) {
  const protocols: DefiProtocol[] = ['aave', 'compound', 'none'];

  const totalApyDisplay = useMemo(() => {
    if (!settings.enabled || settings.protocol === 'none') {
      return null;
    }
    return settings.extraApy.toFixed(1);
  }, [settings.enabled, settings.protocol, settings.extraApy]);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white">Yield Optimizer</h3>
          <p className="text-xs text-slate-400">
            Auto-deposit idle rewards to DeFi for extra yield
          </p>
        </div>

        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
            settings.enabled ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Extra APY display */}
      {totalApyDisplay && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400/70">Extra APY from DeFi</span>
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              +{totalApyDisplay}%
            </span>
          </div>
        </div>
      )}

      {settings.enabled && (
        <>
          {/* Protocol selector */}
          <div className="space-y-2">
            <label className="block text-xs text-slate-400">Target Protocol</label>
            <div className="grid grid-cols-3 gap-2">
              {protocols.map((proto) => {
                const info = PROTOCOL_INFO[proto];
                const isSelected = settings.protocol === proto;
                return (
                  <button
                    key={proto}
                    type="button"
                    onClick={() => onProtocolChange(proto)}
                    className={`rounded-lg border px-3 py-2.5 text-center transition-colors ${
                      isSelected
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                        : 'border-white/10 bg-slate-800/40 text-slate-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-lg">{info.icon}</span>
                    <p className="mt-1 text-xs font-medium">{info.label}</p>
                  </button>
                );
              })}
            </div>
            {settings.protocol !== 'none' && (
              <p className="text-[11px] text-slate-500">
                {PROTOCOL_INFO[settings.protocol].description}
              </p>
            )}
          </div>

          {/* Deposit percentage */}
          {settings.protocol !== 'none' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="deposit-pct" className="text-xs text-slate-400">
                  Deposit percentage
                </label>
                <span className="text-xs font-medium text-white tabular-nums">
                  {settings.depositPercentage}%
                </span>
              </div>
              <input
                id="deposit-pct"
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.depositPercentage}
                onChange={(e) => onDepositPercentageChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {settings.depositPercentage}% of each reward will be auto-deposited to{' '}
                {PROTOCOL_INFO[settings.protocol].label}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
