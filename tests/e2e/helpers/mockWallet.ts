/**
 * Mock wallet implementation for E2E testing
 * Implements the Freighter/Stellar wallet API surface
 */

import { Page } from '@playwright/test';
import type { TestAccount } from '../fixtures/walletAccounts';

export interface MockWalletOptions {
  /** Whether the wallet should report as connected */
  isConnected?: boolean;
  /** Simulate network delay in milliseconds */
  networkDelay?: number;
  /** Whether to simulate transaction signing failures */
  simulateSignFailure?: boolean;
}

/**
 * Mock sign function that creates a deterministic signature
 * In production, this would use actual Stellar SDK signing
 */
function mockSign(data: string, secret: string): string {
  // Simple deterministic "signature" for testing
  // In reality, you'd use @stellar/stellar-sdk's Keypair.fromSecret().sign()
  const hash = Buffer.from(secret + data).toString('base64');
  return `MOCK_SIG_${hash.substring(0, 32)}`;
}

/**
 * Injects a mock Stellar wallet into the page before any app code runs
 * This simulates the Freighter/Lobstr browser extension API
 */
export async function injectMockWallet(
  page: Page,
  account: TestAccount,
  options: MockWalletOptions = {}
): Promise<void> {
  const {
    isConnected = true,
    networkDelay = 100,
    simulateSignFailure = false,
  } = options;

  await page.addInitScript(
    ({ account, isConnected, networkDelay, simulateSignFailure }) => {
      // Mock the Freighter/Stellar wallet API
      window.stellarWeb3 = {
        isConnected: async () => {
          await new Promise(resolve => setTimeout(resolve, networkDelay));
          return { isConnected };
        },
        
        getPublicKey: async () => {
          await new Promise(resolve => setTimeout(resolve, networkDelay));
          if (!isConnected) {
            throw new Error('Wallet not connected');
          }
          return account.publicKey;
        },
        
        signTransaction: async (tx: string) => {
          await new Promise(resolve => setTimeout(resolve, networkDelay));
          if (!isConnected) {
            throw new Error('Wallet not connected');
          }
          if (simulateSignFailure) {
            throw new Error('User rejected transaction');
          }
          
          // Create deterministic mock signature
          const hash = btoa(account.secret + tx).substring(0, 32);
          const signedTx = `MOCK_SIGNED_${hash}_${tx.substring(0, 20)}`;
          return signedTx;
        },
        
        signMessage: async (msg: string) => {
          await new Promise(resolve => setTimeout(resolve, networkDelay));
          if (!isConnected) {
            throw new Error('Wallet not connected');
          }
          if (simulateSignFailure) {
            throw new Error('User rejected signature request');
          }
          
          // Create deterministic mock signature
          const hash = btoa(account.secret + msg).substring(0, 32);
          return { signature: `MOCK_MSG_SIG_${hash}` };
        },
      };

      // Store the mock account info for test assertions
      (window as any).__mockWalletAccount = account;
      (window as any).__mockWalletConnected = isConnected;
    },
    { account, isConnected, networkDelay, simulateSignFailure }
  );
}

/**
 * Simulates switching to a different wallet account
 * Triggers the account change event that the app listens for
 */
export async function switchMockAccount(
  page: Page,
  newAccount: TestAccount
): Promise<void> {
  await page.evaluate(
    (account) => {
      // Update the mock wallet to return the new account
      if (window.stellarWeb3) {
        const originalGetPublicKey = window.stellarWeb3.getPublicKey;
        window.stellarWeb3.getPublicKey = async () => account.publicKey;
      }
      
      // Store new account info
      (window as any).__mockWalletAccount = account;
      
      // Dispatch the account change event that WalletProvider listens for
      window.dispatchEvent(
        new CustomEvent('stellar-wallet:accountChange', {
          detail: { publicKey: account.publicKey },
        })
      );
    },
    newAccount
  );
}

/**
 * Simulates disconnecting the wallet
 */
export async function disconnectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).__mockWalletConnected = false;
    if (window.stellarWeb3) {
      window.stellarWeb3.isConnected = async () => ({ isConnected: false });
      window.stellarWeb3.getPublicKey = async () => {
        throw new Error('Wallet not connected');
      };
    }
  });
}

/**
 * Gets the currently connected mock wallet account
 */
export async function getMockWalletAccount(page: Page): Promise<TestAccount | null> {
  return page.evaluate(() => {
    return (window as any).__mockWalletAccount || null;
  });
}

/**
 * Checks if the mock wallet is connected
 */
export async function isMockWalletConnected(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return (window as any).__mockWalletConnected === true;
  });
}
