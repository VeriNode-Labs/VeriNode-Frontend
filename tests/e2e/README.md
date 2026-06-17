# VeriNode E2E Wallet Testing Guide

This directory contains comprehensive end-to-end tests for wallet-connected operations in the VeriNode frontend. The test suite eliminates the need for manual wallet testing by providing a hardened mock wallet injection layer.

## Overview

The E2E wallet test suite covers:
- ✅ Authentication flows (connect/disconnect)
- ✅ Staking operations (stake/unstake)
- ✅ Node registration
- ✅ Attestation submission
- ✅ Settings updates
- ✅ Account switching and race condition prevention
- ✅ Transaction signing (signTransaction, signMessage)
- ✅ Error handling and edge cases
- ✅ Session persistence

## Architecture

### Core Components

1. **Mock Wallet** (`helpers/mockWallet.ts`)
   - Implements the full Freighter/Stellar wallet API surface
   - Injected via `page.addInitScript` before any app code runs
   - Provides deterministic transaction signing for reproducible tests
   - Supports account switching simulation

2. **Mock API** (`helpers/mockApi.ts`)
   - Intercepts and mocks backend API calls
   - Configurable network delays and failure simulation
   - Records API calls for test assertions

3. **Test Fixtures** (`fixtures/walletAccounts.ts`)
   - Pre-generated Stellar keypairs for consistent testing
   - 5 test identities: Alice, Bob, Charlie, Diana, Eve
   - **IMPORTANT:** These are test-only keys, never use for real funds

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Wallet-Specific Tests Only

```bash
npx playwright test tests/e2e/walletFlows.spec.ts
```

### Run in UI Mode (Interactive)

```bash
npx playwright test --ui
```

### Run Specific Test

```bash
npx playwright test tests/e2e/walletFlows.spec.ts -g "should connect wallet"
```

### Debug Mode

```bash
npx playwright test tests/e2e/walletFlows.spec.ts --debug
```

## Writing New Wallet Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { injectMockWallet } from './helpers/mockWallet';
import { setupMockApi } from './helpers/mockApi';
import { getDefaultTestAccount } from './fixtures/walletAccounts';

test('my wallet test', async ({ page }) => {
  // 1. Inject mock wallet
  const account = getDefaultTestAccount();
  await injectMockWallet(page, account);
  
  // 2. Setup API mocks
  await setupMockApi(page);
  
  // 3. Navigate to page
  await page.goto('/my-page');
  
  // 4. Perform actions
  await page.click('button[aria-label="Connect Wallet"]');
  
  // 5. Assert results
  const publicKey = await page.textContent('[data-testid="public-key"]');
  expect(publicKey).toContain(account.publicKey);
});
```

### Testing Account Switching

```typescript
import { switchMockAccount } from './helpers/mockWallet';
import { getTestAccount } from './fixtures/walletAccounts';

test('should handle account switch', async ({ page }) => {
  await injectMockWallet(page, getDefaultTestAccount());
  await page.goto('/');
  
  // Switch to a different account
  const bobAccount = getTestAccount('Bob')!;
  await switchMockAccount(page, bobAccount);
  
  // Wait for app to process the switch
  await page.waitForTimeout(800);
  
  // Assert new account is active
  const newPublicKey = await page.evaluate(async () => {
    return await window.stellarWeb3?.getPublicKey();
  });
  expect(newPublicKey).toBe(bobAccount.publicKey);
});
```

### Testing Transaction Signing

```typescript
test('should sign transaction', async ({ page }) => {
  await injectMockWallet(page, getDefaultTestAccount());
  await page.goto('/');
  
  // Sign a transaction
  const signedTx = await page.evaluate(async () => {
    const txXDR = 'AAAA...'; // Your transaction XDR
    return await window.stellarWeb3?.signTransaction(txXDR);
  });
  
  expect(signedTx).toBeTruthy();
  expect(signedTx).toContain('MOCK_SIGNED_');
});
```

### Simulating Wallet Errors

```typescript
import { injectMockWallet } from './helpers/mockWallet';

test('should handle user rejection', async ({ page }) => {
  // Configure wallet to simulate rejection
  await injectMockWallet(page, getDefaultTestAccount(), {
    simulateSignFailure: true
  });
  
  await page.goto('/');
  
  const error = await page.evaluate(async () => {
    try {
      await window.stellarWeb3?.signTransaction('TEST_TX');
      return null;
    } catch (err: any) {
      return err.message;
    }
  });
  
  expect(error).toContain('rejected');
});
```

### Recording API Calls

```typescript
import { ApiCallRecorder } from './helpers/mockApi';

test('should call correct API endpoints', async ({ page }) => {
  const recorder = new ApiCallRecorder();
  await recorder.startRecording(page);
  
  await page.goto('/');
  await page.click('button[aria-label="Stake"]');
  
  // Check API was called
  const stakeCalls = recorder.getCallsTo('/staking/stake');
  expect(stakeCalls.length).toBeGreaterThan(0);
  expect(stakeCalls[0].body).toHaveProperty('amount');
});
```

## Test Fixtures

### Available Test Accounts

The test suite includes 5 pre-configured accounts:

```typescript
TEST_ACCOUNTS[0] // Alice (default)
TEST_ACCOUNTS[1] // Bob
TEST_ACCOUNTS[2] // Charlie
TEST_ACCOUNTS[3] // Diana
TEST_ACCOUNTS[4] // Eve
```

### Accessing Test Accounts

```typescript
import { getDefaultTestAccount, getTestAccount } from './fixtures/walletAccounts';

const alice = getDefaultTestAccount();
const bob = getTestAccount('Bob');
const charlie = getTestAccount('Charlie');
```

### Generating New Test Accounts

If you need to add more test accounts to the fixtures:

1. Install Stellar SDK: `npm install --save-dev @stellar/stellar-sdk`
2. Generate new keypairs:

```typescript
import { Keypair } from '@stellar/stellar-sdk';

const keypair = Keypair.random();
console.log('Public Key:', keypair.publicKey());
console.log('Secret:', keypair.secret());
```

3. Add to `fixtures/walletAccounts.ts`:

```typescript
{
  displayName: 'NewAccount',
  publicKey: 'G...',
  secret: 'S...',
}
```

## Mock Wallet API Surface

The mock wallet implements the complete Freighter/Stellar wallet API:

### `isConnected(): Promise<{ isConnected: boolean }>`
Returns wallet connection status.

### `getPublicKey(): Promise<string>`
Returns the current account's public key.

### `signTransaction(tx: string): Promise<string>`
Signs a transaction XDR and returns the signed transaction.

### `signMessage(msg: string): Promise<{ signature: string }>`
Signs an arbitrary message and returns the signature.

## Configuration Options

### Mock Wallet Options

```typescript
interface MockWalletOptions {
  isConnected?: boolean;        // Default: true
  networkDelay?: number;         // Default: 100ms
  simulateSignFailure?: boolean; // Default: false
}

await injectMockWallet(page, account, {
  isConnected: true,
  networkDelay: 200,
  simulateSignFailure: false
});
```

### Mock API Options

```typescript
interface MockApiOptions {
  networkDelay?: number;          // Default: 200ms
  simulateFailure?: boolean;      // Default: false
  customResponses?: Record<string, any>; // Custom responses
}

await setupMockApi(page, {
  networkDelay: 500,
  simulateFailure: false,
  customResponses: {
    '/staking/stake': {
      txHash: 'custom_hash',
      amount: '500'
    }
  }
});
```

## CI Integration

### GitHub Actions

The E2E tests run automatically in CI. To run only wallet tests in CI:

```yaml
- name: Run Wallet E2E Tests
  run: npx playwright test tests/e2e/walletFlows.spec.ts
```

### CI-Specific Configuration

The `playwright.config.ts` is configured to:
- Run tests in parallel locally but serially in CI
- Retry failed tests 2 times in CI
- Generate HTML reports
- Auto-start the dev server on port 3000

## Troubleshooting

### Test Timeout Issues

If tests are timing out:
1. Increase timeout in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```

2. Or increase specific waits:
```typescript
await page.waitForTimeout(1000); // Increase as needed
```

### Mock Wallet Not Injecting

Ensure `injectMockWallet` is called **before** `page.goto()`:

```typescript
// ✅ Correct
await injectMockWallet(page, account);
await page.goto('/');

// ❌ Wrong
await page.goto('/');
await injectMockWallet(page, account);
```

### API Calls Not Being Mocked

Check that:
1. `setupMockApi()` is called before navigation
2. Your API endpoint patterns match those in `mockApi.ts`
3. The route patterns use `**/api/v1/**` format

### Account Switch Not Detected

After calling `switchMockAccount()`, wait for debounce:

```typescript
await switchMockAccount(page, newAccount);
await page.waitForTimeout(500); // Wait for 300ms debounce + processing
```

## Best Practices

1. **Reset State Between Tests**
   - Always clear localStorage, sessionStorage, and cookies in `beforeEach`
   - Reset Zustand stores if using state management

2. **Use Appropriate Waits**
   - Prefer `waitForSelector` over `waitForTimeout`
   - Use `waitForLoadState('networkidle')` for page loads
   - Only use `waitForTimeout` when necessary for debounce/delays

3. **Isolate Tests**
   - Each test should be independent
   - Don't rely on state from previous tests
   - Use unique transaction IDs/hashes per test

4. **Verify Both UI and State**
   - Check UI updates (visible elements, text content)
   - Verify internal state (localStorage, API calls, events)

5. **Test Edge Cases**
   - Rapid actions (double-clicks, quick switches)
   - Network failures
   - User rejections
   - Invalid inputs

## Common Patterns

### Testing Protected Routes

```typescript
test('should redirect to login if not authenticated', async ({ page }) => {
  // Don't inject wallet or inject disconnected wallet
  await injectMockWallet(page, getDefaultTestAccount(), { isConnected: false });
  
  await page.goto('/dashboard');
  
  // Should redirect to login
  await expect(page).toHaveURL('/login');
});
```

### Testing Optimistic Updates

```typescript
test('should show optimistic update before confirmation', async ({ page }) => {
  await injectMockWallet(page, getDefaultTestAccount());
  await setupMockApi(page, { networkDelay: 2000 }); // Slow response
  
  await page.goto('/staking');
  await page.fill('input[name="amount"]', '100');
  await page.click('button[type="submit"]');
  
  // Should show pending state immediately
  await expect(page.locator('text=Pending')).toBeVisible();
  
  // Should show confirmed after delay
  await expect(page.locator('text=Confirmed')).toBeVisible({ timeout: 5000 });
});
```

### Testing Toasts/Notifications

```typescript
test('should show success toast', async ({ page }) => {
  await injectMockWallet(page, getDefaultTestAccount());
  await setupMockApi(page);
  
  await page.goto('/');
  // ... perform action ...
  
  const toast = page.locator('[role="alert"], .toast, text=Success');
  await expect(toast).toBeVisible({ timeout: 5000 });
});
```

## Performance Targets

- Full wallet E2E suite: **< 2 minutes**
- Individual test: **< 10 seconds**
- Mock wallet injection: **< 100ms**
- API mock setup: **< 50ms**

## Support

For issues or questions:
1. Check existing tests for examples
2. Review Playwright documentation: https://playwright.dev
3. Check console logs: `npx playwright test --headed --debug`
4. Review HTML report: `npx playwright show-report`

## Future Enhancements

Planned improvements:
- [ ] Visual regression testing for wallet UI
- [ ] Performance benchmarking
- [ ] Multi-chain wallet support
- [ ] Hardware wallet simulation
- [ ] Accessibility testing for wallet flows
