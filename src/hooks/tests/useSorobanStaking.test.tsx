// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { expect, test, describe, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useSorobanStaking } from '../useSorobanStaking';
import { useStakingStore } from '../../store/stakingStore';

// Mock useWallet
vi.mock('@/src/hooks/useWallet', () => ({
  useWallet: () => ({ activeAccount: { publicKey: 'G_TEST_PUBLIC_KEY' } })
}));

// Mock Sentry to avoid actually calling it
vi.mock('@/src/services/sentry', () => ({
  captureTransactionFailure: vi.fn()
}));

vi.useFakeTimers({ shouldAdvanceTime: true });

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  useStakingStore.getState().reset();
  vi.clearAllTimers();
});
afterAll(() => server.close());

describe('useSorobanStaking', () => {
  test('optimistic updates and rollback on failure, then retry', async () => {
    let getTxCount = 0;

    server.use(
      http.post('https://soroban-rpc.stellar.org', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        if (body['method'] === 'sendTransaction') {
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: body['id'],
            result: { hash: 'test-hash-123', status: 'PENDING' }
          });
        }

        if (body['method'] === 'getTransaction') {
          getTxCount++;
          if (getTxCount <= 1) {
            return HttpResponse.json({
              jsonrpc: '2.0',
              id: body['id'],
              result: { status: 'NOT_FOUND', hash: 'test-hash-123' }
            });
          }
          if (getTxCount === 2) {
            // First time it fails
            return HttpResponse.json({
              jsonrpc: '2.0',
              id: body['id'],
              result: { status: 'FAILED', hash: 'test-hash-123' }
            });
          }
          // After retry
          return HttpResponse.json({
            jsonrpc: '2.0',
            id: body['id'],
            result: { status: 'SUCCESS', hash: 'test-hash-123' }
          });
        }
        return HttpResponse.json({});
      })
    );

    useStakingStore.getState().initBalance(1000);

    const { result } = renderHook(() => useSorobanStaking());

    // (a) calls stake(100)
    let promise!: Promise<void>;
    act(() => {
      promise = result.current.stake(100);
    });

    // (b) asserts the balance updates immediately (optimistic)
    expect(result.current.balance).toBe(900);
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.pending[0].status).toBe('pending');

    // (c) simulates a failed on-chain execution
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Await promise to catch rejection
    let didReject = false;
    try {
      await promise;
    } catch {
      didReject = true;
    }
    expect(didReject).toBe(true);

    // (d) asserts the balance reverts to the original value
    expect(result.current.balance).toBe(1000);
    expect(result.current.pending[0].status).toBe('failed');

    const failedTxId = result.current.pending[0].optimisticTxId;

    // (e) calls retry() and asserts the balance updates optimistically again
    act(() => {
      promise = result.current.retry(failedTxId);
    });

    expect(result.current.balance).toBe(900);
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.pending[0].status).toBe('pending');

    // Advance timer for successful confirmation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    await promise;

    expect(result.current.balance).toBe(900);
    expect(result.current.pending[0].status).toBe('confirmed');
  });
});
