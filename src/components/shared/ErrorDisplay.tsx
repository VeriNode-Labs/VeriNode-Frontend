'use client';

import React, { useState } from 'react';
import { decodeTransactionError, type DecodedError, type ErrorSeverity } from '../../utils/errorDecoder';

export interface ErrorDisplayProps {
  error: unknown | DecodedError;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

const SEVERITY_STYLES: Record<
  ErrorSeverity,
  { container: string; badge: string; iconBg: string; text: string; label: string }
> = {
  error: {
    container: 'bg-red-950/40 border-red-800/60 text-red-200',
    badge: 'bg-red-900/60 text-red-300 border-red-700/50',
    iconBg: 'bg-red-900/50 text-red-400',
    text: 'text-red-400',
    label: 'Critical Error',
  },
  warning: {
    container: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    iconBg: 'bg-amber-900/50 text-amber-400',
    text: 'text-amber-400',
    label: 'Warning',
  },
  info: {
    container: 'bg-blue-950/40 border-blue-800/60 text-blue-200',
    badge: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
    iconBg: 'bg-blue-900/50 text-blue-400',
    text: 'text-blue-400',
    label: 'Notice',
  },
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  if (!error) return null;

  const decoded: DecodedError =
    typeof error === 'object' && error !== null && 'humanTitle' in error
      ? (error as DecodedError)
      : decodeTransactionError(error);

  const style = SEVERITY_STYLES[decoded.severity] || SEVERITY_STYLES.error;

  const copyDetails = async () => {
    const payload = JSON.stringify(
      {
        title: decoded.humanTitle,
        category: decoded.category,
        severity: decoded.severity,
        rawCode: decoded.rawCode,
        rawMessage: decoded.rawMessage,
        timestamp: new Date(decoded.timestamp).toISOString(),
      },
      null,
      2
    );

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-xl border p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all ${style.container} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${style.badge}`}>
            {style.label}
          </span>
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">
            {decoded.category}
          </span>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-zinc-800/50"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-base font-semibold tracking-tight text-white">
          {decoded.humanTitle}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">
          {decoded.humanDescription}
        </p>
      </div>

      {decoded.troubleshootingSteps.length > 0 && (
        <div className="mt-4 rounded-lg bg-black/30 p-3.5 border border-white/5">
          <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Recommended Troubleshooting
          </h4>
          <ol className="mt-2 space-y-1.5 list-decimal list-inside text-xs text-zinc-300 leading-normal">
            {decoded.troubleshootingSteps.map((step, idx) => (
              <li key={idx} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          {decoded.docsUrl && (
            <a
              href={decoded.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1"
            >
              Official Documentation ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors underline underline-offset-2 ml-2"
          >
            {showTechnical ? 'Hide Technical Details' : 'View Technical Details'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyDetails}
            className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-all border border-zinc-700/50 shadow-sm active:scale-95"
          >
            {copied ? '✓ Copied Details' : 'Copy Error Details'}
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
            >
              Retry Transaction
            </button>
          )}
        </div>
      </div>

      {showTechnical && (
        <div className="mt-3 p-3 rounded-lg bg-black/50 border border-zinc-800 text-left font-mono text-[11px] text-zinc-400 break-all space-y-1">
          <div><span className="text-zinc-500">Raw Code:</span> {decoded.rawCode}</div>
          <div><span className="text-zinc-500">Raw Message:</span> {decoded.rawMessage}</div>
          <div><span className="text-zinc-500">Timestamp:</span> {new Date(decoded.timestamp).toISOString()}</div>
        </div>
      )}
    </div>
  );
};
