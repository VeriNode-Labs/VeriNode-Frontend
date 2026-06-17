// tests/errorDecoder.test.ts
import { decodeTransactionError } from '@/utils/errorDecoder';
import { describe, it, expect } from 'vitest';

describe('Error Decoder', () => {
  it('decodes tx_bad_seq', () => {
    const decoded = decodeTransactionError('tx_bad_seq');
    expect(decoded.humanTitle).toBe('Sequence Number Mismatch');
    expect(decoded.troubleshootingSteps.length).toBeGreaterThan(0);
  });

  it('handles unknown errors', () => {
    const decoded = decodeTransactionError('some_cryptic_host_error_123');
    expect(decoded.isUnknown).toBe(true);
  });

  // Add more for HostError patterns, null/undefined, etc.
});
