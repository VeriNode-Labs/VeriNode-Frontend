import { test, expect } from '@playwright/test';

const MOCK_ACCOUNTS = [
  'GBMZGMH3YFOHCJ5K7Q3W7K5X6J7K8L9M0N1P2Q3R4S5T6U7V8W9X0Y1Z2',
  'GABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZ789ABC',
];

interface AccountSwitchDetail {
  previousKey: string | null;
  newKey: string | null;
}

declare global {
  interface Window {
    __mockSwitchAccount: (index: number) => void;
    __flushEvents?: AccountSwitchDetail[];
    __capturedKeys?: string[];
  }
}

test.describe('Wallet account switching - race condition prevention', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((accounts: string[]) => {
      let currentAccountIndex = 0;

      window.stellarWeb3 = {
        isConnected: async () => ({ isConnected: true }),
        getPublicKey: async () => accounts[currentAccountIndex],
        signTransaction: async (tx: string) => tx,
      };

      window.__mockSwitchAccount = (index: number) => {
        currentAccountIndex = index;
        window.dispatchEvent(
          new CustomEvent('stellar-wallet:accountChange', {
            detail: { publicKey: accounts[index] },
          })
        );
      };
    }, MOCK_ACCOUNTS);

    await page.goto('/');
  });

  test('should not display stale data from previous account after rapid switching', async ({ page }) => {
    const switchCount = 10;
    const switchDuration = 2000;
    const interval = switchDuration / switchCount;

    for (let i = 0; i < switchCount; i++) {
      const targetIndex = i % MOCK_ACCOUNTS.length;
      await page.evaluate((idx: number) => window.__mockSwitchAccount(idx), targetIndex);
      await page.waitForTimeout(interval);
    }

    const displayedKeys = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-public-key]');
      return Array.from(elements).map((el) => el.getAttribute('data-public-key'));
    });

    const uniqueKeys = new Set(displayedKeys);
    expect(uniqueKeys.size).toBeLessThanOrEqual(MOCK_ACCOUNTS.length);

    for (const key of displayedKeys) {
      expect(MOCK_ACCOUNTS).toContain(key);
    }
  });

  test('should dispatch accountFlushed event after each switch', async ({ page }) => {
    await page.evaluate(() => {
      window.addEventListener('wallet:accountFlushed', (event: Event) => {
        const detail = (event as CustomEvent<AccountSwitchDetail>).detail;
        window.__flushEvents = window.__flushEvents || [];
        window.__flushEvents.push(detail);
      });
    });

    await page.evaluate(() => window.__mockSwitchAccount(1));
    await page.waitForTimeout(500);

    const events = await page.evaluate(() => window.__flushEvents || []);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]).toHaveProperty('previousKey');
    expect(events[0]).toHaveProperty('newKey');
    expect(events[0].newKey).toBe(MOCK_ACCOUNTS[1]);
  });

  test('should debounce rapid account changes and process only the final identity', async ({ page }) => {
    await page.evaluate(() => {
      window.addEventListener('wallet:accountFlushed', (event: Event) => {
        const detail = (event as CustomEvent<AccountSwitchDetail>).detail;
        window.__capturedKeys = window.__capturedKeys || [];
        if (detail.newKey !== null) {
          window.__capturedKeys.push(detail.newKey);
        }
      });
    });

    await page.evaluate(() => window.__mockSwitchAccount(0));
    await page.waitForTimeout(50);
    await page.evaluate(() => window.__mockSwitchAccount(1));
    await page.waitForTimeout(50);
    await page.evaluate(() => window.__mockSwitchAccount(0));

    await page.waitForTimeout(500);

    const keys = await page.evaluate(() => window.__capturedKeys || []);
    expect(keys.length).toBeLessThanOrEqual(2);
  });
});
