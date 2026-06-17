// src/utils/errorDecoder.ts
import type { DecodedError, ErrorDefinition } from '@/types/errors';

const ErrorCatalog: Record<string, ErrorDefinition> = {
  'tx_bad_seq': {
    category: 'network',
    severity: 'warning',
    humanTitle: 'Sequence Number Mismatch',
    humanDescription: 'Your account\'s transaction sequence has moved ahead of the submitted transaction.',
    troubleshootingSteps: [
      'Refresh the dashboard to sync latest sequence number',
      'Try submitting the transaction again'
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/encyclopedia/transactions/sequence-numbers'
  },
  'op_underfunded': {
    category: 'balance',
    severity: 'error',
    humanTitle: 'Insufficient Funds',
    humanDescription: 'The account does not have enough XLM to cover the minimum balance or transaction fees. Required minimum: {minBalance} XLM.',
    troubleshootingSteps: [
      'Add more XLM to your account',
      'Check current account balance in the wallet'
    ]
  },
  'op_no_trust': {
    category: 'auth',
    severity: 'error',
    humanTitle: 'No Trustline Established',
    humanDescription: 'You need to establish a trustline for the asset before performing this operation.',
    troubleshootingSteps: [
      'Create a trustline for the required asset',
      'Confirm asset issuer in your wallet'
    ]
  },
  'HostError: ValueUnknown': {
    category: 'contract',
    severity: 'error',
    humanTitle: 'Contract Data Not Found',
    humanDescription: 'The requested contract storage value was not found. This often occurs if data has expired or the contract state was reset.',
    troubleshootingSteps: [
      'The system will attempt to restore the data automatically',
      'Try the operation again in a few moments'
    ]
  },
  'HostError: HostObjectError\\(ContractError\\(\\d+\\)\\)': {
    category: 'contract',
    severity: 'error',
    humanTitle: 'Smart Contract Error',
    humanDescription: 'The Soroban contract returned an error during execution. Check contract logic or input parameters.',
    troubleshootingSteps: [
      'Verify input parameters match contract expectations',
      'Review recent contract updates'
    ]
  },
  // Add 50-100+ more patterns here as needed (regex keys)
  // Generic fallback
  '.*': {
    category: 'generic',
    severity: 'error',
    humanTitle: 'Unknown Error',
    humanDescription: 'An unexpected error occurred. Raw details below.',
    troubleshootingSteps: [
      'Copy the raw error and report to support',
      'Try refreshing the page and retrying'
    ]
  }
};

function extractErrorMessage(rawError: unknown): string {
  if (rawError instanceof Error) return rawError.message;
  if (typeof rawError === 'string') return rawError;
  if (rawError && typeof rawError === 'object' && 'message' in rawError) {
    return (rawError as { message: string }).message;
  }
  if (rawError && typeof rawError === 'object' && 'error' in rawError) {
    return String((rawError as { error: unknown }).error);
  }
  return String(rawError || 'Unknown error');
}

function interpolateParams(description: string, rawMessage: string): string {
  // Simple param extraction example (extend as needed)
  const minBalanceMatch = rawMessage.match(/minimum balance (\d+)/i);
  if (minBalanceMatch) {
    return description.replace('{minBalance}', minBalanceMatch[1]);
  }
  return description;
}

export function decodeTransactionError(rawError: unknown): DecodedError {
  const rawMessage = extractErrorMessage(rawError);

  for (const [pattern, definition] of Object.entries(ErrorCatalog)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(rawMessage)) {
      const description = interpolateParams(definition.humanDescription, rawMessage);
      return {
        ...definition,
        humanDescription: description,
        rawError: rawMessage,
        isUnknown: pattern === '.*'
      };
    }
  }

  // Should never reach here due to generic fallback
  return {
    ...ErrorCatalog['.*'],
    rawError: rawMessage,
    isUnknown: true
  };
       }
