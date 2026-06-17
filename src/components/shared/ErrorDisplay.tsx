// src/components/shared/ErrorDisplay.tsx
'use client';

import type { DecodedError } from '@/types/errors';
import { useToast } from '@/components/Toast';

interface ErrorDisplayProps {
  error: DecodedError | null;
  onDismiss?: () => void;
}

const severityIcons: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌'
};

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const { showToast } = useToast();

  if (!error) return null;

  const copyRawError = () => {
    navigator.clipboard.writeText(error.rawError);
    showToast('Raw error copied to clipboard', 'info');
  };

  return (
    <div className={`rounded-lg border-l-4 p-4 shadow-sm ${error.severity === 'error' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{severityIcons[error.severity]}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-lg">{error.humanTitle}</h4>
          <p className="text-sm text-gray-600 mt-1">{error.humanDescription}</p>

          {error.troubleshootingSteps.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Troubleshooting Steps</p>
              <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700">
                {error.troubleshootingSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {error.docsUrl && (
            <a
              href={error.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-blue-600 hover:underline text-sm"
            >
              Learn More →
            </a>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={copyRawError}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
            >
              📋 Copy Raw Error
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs px-3 py-1 bg-white hover:bg-gray-100 rounded border"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
