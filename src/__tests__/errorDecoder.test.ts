import { describe, expect, it } from 'vitest';
import { decodeTransactionError, extractErrorMessage, ERROR_CATALOG } from '../utils/errorDecoder';

describe('Stellar & Soroban Error Decoder (VeriNode Issue #180)', () => {
  it('has over 20 rich error catalog definitions covering all core domains', () => {
    expect(ERROR_CATALOG.length).toBeGreaterThan(20);
    for (const entry of ERROR_CATALOG) {
      expect(entry.humanTitle).toBeTruthy();
      expect(entry.troubleshootingSteps.length).toBeGreaterThan(0);
      expect(['balance', 'auth', 'network', 'contract', 'wallet']).toContain(entry.category);
      expect(['info', 'warning', 'error']).toContain(entry.severity);
    }
  });

  describe('Horizon & Stellar Core Transaction Codes', () => {
    it('decodes tx_bad_seq to Sequence Number Mismatch', () => {
      const err = decodeTransactionError('Transaction simulation failed: tx_bad_seq');
      expect(err.isRecognized).toBe(true);
      expect(err.humanTitle).toBe('Sequence Number Mismatch');
      expect(err.category).toBe('auth');
      expect(err.severity).toBe('warning');
      expect(err.troubleshootingSteps).toContain(
        'Refresh your browser or dashboard to re-sync your account sequence number.'
      );
    });

    it('decodes op_underfunded to Insufficient Account Balance', () => {
      const err = decodeTransactionError({
        response: {
          data: {
            extras: {
              result_codes: {
                transaction: 'tx_failed',
                operations: ['op_underfunded'],
              },
            },
          },
        },
      });
      expect(err.isRecognized).toBe(true);
      expect(err.humanTitle).toBe('Insufficient Account Balance');
      expect(err.category).toBe('balance');
      expect(err.severity).toBe('error');
    });

    it('decodes tx_insufficient_fee to Transaction Fee Too Low', () => {
      const err = decodeTransactionError('Horizon error: tx_insufficient_fee');
      expect(err.humanTitle).toBe('Transaction Fee Too Low');
      expect(err.category).toBe('balance');
      expect(err.severity).toBe('warning');
    });

    it('decodes op_no_trust to Missing Asset Trustline', () => {
      const err = decodeTransactionError('op_no_trust');
      expect(err.humanTitle).toBe('Missing Asset Trustline');
      expect(err.category).toBe('balance');
      expect(err.docsUrl).toContain('trustlines');
    });

    it('decodes tx_no_source_account to Account Not Found on Network', () => {
      const err = decodeTransactionError('tx_no_source_account');
      expect(err.humanTitle).toBe('Account Not Found on Network');
      expect(err.troubleshootingSteps.some((s) => s.includes('Friendbot') || s.includes('XLM'))).toBe(true);
    });
  });

  describe('Soroban Smart Contract & Host Errors', () => {
    it('decodes HostError: ValueUnknown to Contract Storage Entry Not Found', () => {
      const err = decodeTransactionError('HostError: Error(Value, ValueUnknown)');
      expect(err.isRecognized).toBe(true);
      expect(err.humanTitle).toBe('Contract Storage Entry Not Found');
      expect(err.category).toBe('contract');
      expect(err.docsUrl).toContain('state-archival');
    });

    it('decodes HostError: StorageTtlExpired to State Archival warning', () => {
      const err = decodeTransactionError('HostError: StorageTtlExpired');
      expect(err.humanTitle).toBe('Smart Contract State Expired (State Archival)');
      expect(err.category).toBe('contract');
    });

    it('decodes ContractPaused to Smart Contract Paused', () => {
      const err = decodeTransactionError('ContractError(12)');
      expect(err.humanTitle).toBe('Smart Contract Paused');
      expect(err.severity).toBe('warning');
    });

    it('decodes DuplicateSettlementRef to Duplicate Settlement Reference', () => {
      const err = decodeTransactionError('DuplicateSettlementRef');
      expect(err.humanTitle).toBe('Duplicate Settlement Reference');
      expect(err.severity).toBe('error');
    });

    it('interpolates arbitrary ContractError numbers dynamically', () => {
      const err = decodeTransactionError('ContractError(42)');
      expect(err.humanTitle).toBe('Smart Contract Execution Reverted');
      expect(err.humanDescription).toContain('#42');
    });
  });

  describe('Wallet & User Interaction Errors', () => {
    it('decodes user rejection smoothly with info severity', () => {
      const err = decodeTransactionError('User declined transaction');
      expect(err.humanTitle).toBe('Signature Request Cancelled');
      expect(err.category).toBe('wallet');
      expect(err.severity).toBe('info');
    });

    it('decodes wallet not connected error', () => {
      const err = decodeTransactionError('Wallet not connected');
      expect(err.humanTitle).toBe('Wallet Extension Not Connected');
      expect(err.category).toBe('wallet');
      expect(err.docsUrl).toContain('freighter');
    });
  });

  describe('Network & RPC Errors', () => {
    it('decodes 504 Gateway Timeout', () => {
      const err = decodeTransactionError('504 Gateway Timeout');
      expect(err.humanTitle).toBe('RPC Node Gateway Timeout');
      expect(err.category).toBe('network');
      expect(err.severity).toBe('warning');
    });

    it('decodes 429 Too Many Requests', () => {
      const err = decodeTransactionError('429 Too Many Requests');
      expect(err.humanTitle).toBe('RPC Rate Limit Exceeded');
      expect(err.category).toBe('network');
    });

    it('decodes Failed to fetch network error', () => {
      const err = decodeTransactionError('TypeError: Failed to fetch');
      expect(err.humanTitle).toBe('Network Connection Lost');
      expect(err.category).toBe('network');
      expect(err.severity).toBe('error');
    });
  });

  describe('Edge Cases & Fallbacks', () => {
    it('handles null gracefully', () => {
      const err = decodeTransactionError(null);
      expect(err.isRecognized).toBe(false);
      expect(err.humanTitle).toBe('Unrecognized Transaction Error');
    });

    it('handles undefined gracefully', () => {
      const err = decodeTransactionError(undefined);
      expect(err.isRecognized).toBe(false);
      expect(err.humanTitle).toBe('Unrecognized Transaction Error');
    });

    it('handles empty string gracefully', () => {
      const err = decodeTransactionError('');
      expect(err.isRecognized).toBe(false);
      expect(err.humanTitle).toBe('Unrecognized Transaction Error');
    });

    it('handles uncatalogued random error string', () => {
      const err = decodeTransactionError('Some obscure node error from cosmos');
      expect(err.isRecognized).toBe(false);
      expect(err.humanTitle).toBe('Unrecognized Transaction Error');
      expect(err.humanDescription).toBe('Some obscure node error from cosmos');
    });
  });

  describe('Performance Benchmark', () => {
    it('decodes errors in under 0.1ms per invocation', () => {
      const start = performance.now();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        decodeTransactionError('Transaction failed: op_underfunded');
        decodeTransactionError('HostError: ValueUnknown');
        decodeTransactionError('ContractError(15)');
      }
      const duration = performance.now() - start;
      const avgPerCall = duration / (iterations * 3);
      expect(avgPerCall).toBeLessThan(0.1); // < 0.1ms per call
    });
  });
});
