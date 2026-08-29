// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import { expect, test, describe, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { StakeForm } from '../StakeForm';
import { ToastProvider } from '@/src/components/Toast';
import { useStakingStore } from '../../../store/stakingStore';

/**
 * StakeForm covers the app's core staking critical flow end-to-end: amount
 * entry, the confirm-before-submit modal, and both the success and failure
 * outcomes of the underlying Soroban transaction via useSorobanStaking.
 *
 * The failure-path test in particular guards the fix in useSorobanStaking's
 * runAction (see the hook's tests and the PR description): before that fix,
 * a failed on-chain stake still resolved the stake() promise, so this exact
 * form showed a "Successfully staked" toast and cleared the input on a
 * transaction that had actually failed. That regression could not have been
 * caught by the hook-level test alone since it doesn't render StakeForm's
 * own try/catch.
 */

// Mock useWallet - StakeForm's useSorobanStaking call needs an active account.
vi.mock('@/src/hooks/useWallet', () => ({
  useWallet: () => ({ activeAccount: { publicKey: 'G_TEST_PUBLIC_KEY' } }),
}));

// Mock Sentry to avoid actually calling it (matches useSorobanStaking.test.tsx).
vi.mock('@/src/services/sentry', () => ({
  captureTransactionFailure: vi.fn(),
}));

vi.useFakeTimers({ shouldAdvanceTime: true });

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  useStakingStore.getState().reset();
  vi.clearAllTimers();
  cleanup();
});
afterAll(() => server.close());

function renderStakeForm() {
  return render(
    <ToastProvider>
      <StakeForm currentApr={8.5} availableBalance={1000} tokenSymbol="VRN" />
    </ToastProvider>
  );
}

/** Mocks the Soroban RPC so sendTransaction always succeeds and getTransaction resolves with the given terminal status after one NOT_FOUND poll. */
function mockSorobanResult(status: 'SUCCESS' | 'FAILED') {
  let getTxCount = 0;
  server.use(
    http.post('https://soroban-rpc.stellar.org', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      if (body['method'] === 'sendTransaction') {
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: body['id'],
          result: { hash: 'test-hash-abc', status: 'PENDING' },
        });
      }
      if (body['method'] === 'getTransaction') {
        getTxCount++;
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: body['id'],
          result: {
            status: getTxCount <= 1 ? 'NOT_FOUND' : status,
            hash: 'test-hash-abc',
          },
        });
      }
      return HttpResponse.json({});
    })
  );
}

describe('StakeForm', () => {
  test('happy path: enter an amount, confirm, and see a success toast once the transaction confirms', async () => {
    mockSorobanResult('SUCCESS');
    useStakingStore.getState().initBalance(1000);
    renderStakeForm();

    fireEvent.change(screen.getByLabelText(/Amount to stake/i), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: /^Stake 250/i }));

    // Confirmation modal appears before anything is submitted.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Confirm Stake' })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm Stake/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(await screen.findByText(/Successfully staked 250 VRN/i)).toBeTruthy();
    // The amount field is cleared only on the success path.
    expect((screen.getByLabelText(/Amount to stake/i) as HTMLInputElement).value).toBe('');
  });

  test('error state: a failed on-chain stake shows an error toast, not a success toast, and keeps the entered amount', async () => {
    mockSorobanResult('FAILED');
    useStakingStore.getState().initBalance(1000);
    renderStakeForm();

    fireEvent.change(screen.getByLabelText(/Amount to stake/i), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: /^Stake 250/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Confirm Stake/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // useSorobanStaking surfaces the on-chain failure via its own error toast.
    expect(await screen.findByText(/Transaction failed on-chain/i)).toBeTruthy();
    // The success toast must never appear for a failed transaction - this is
    // exactly the bug fixed in runAction (it used to swallow the rejection,
    // so StakeForm's `await stake(...)` resolved and this line ran anyway).
    expect(screen.queryByText(/Successfully staked/i)).toBeNull();
    // The form is not cleared on failure, so the user doesn't lose their input.
    expect((screen.getByLabelText(/Amount to stake/i) as HTMLInputElement).value).toBe('250');
  });
});
