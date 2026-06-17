/**
 * API mocking utilities for E2E tests
 * Intercepts and mocks backend API calls
 */

import { Page, Route } from '@playwright/test';

export interface MockApiOptions {
  /** Simulate network delays (ms) */
  networkDelay?: number;
  /** Simulate API failures */
  simulateFailure?: boolean;
  /** Custom response overrides */
  customResponses?: Record<string, any>;
}

/**
 * Sets up API route interception for common VeriNode endpoints
 */
export async function setupMockApi(
  page: Page,
  options: MockApiOptions = {}
): Promise<void> {
  const {
    networkDelay = 200,
    simulateFailure = false,
    customResponses = {},
  } = options;

  // Mock auth challenge endpoint
  await page.route('**/api/v1/auth/challenge', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    if (simulateFailure) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
      return;
    }

    const response = customResponses['/auth/challenge'] || {
      challenge: 'MOCK_CHALLENGE_' + Date.now(),
      expiresAt: Date.now() + 300000, // 5 minutes
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock auth verify endpoint
  await page.route('**/api/v1/auth/verify', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    if (simulateFailure) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid signature' }),
      });
      return;
    }

    const response = customResponses['/auth/verify'] || {
      success: true,
      token: 'MOCK_JWT_TOKEN_' + Date.now(),
      expiresAt: Date.now() + 86400000, // 24 hours
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock staking stake endpoint
  await page.route('**/api/v1/staking/stake', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    if (simulateFailure) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Insufficient balance' }),
      });
      return;
    }

    const requestBody = route.request().postDataJSON();
    const response = customResponses['/staking/stake'] || {
      txHash: 'a'.repeat(64),
      amount: requestBody?.amount || '100',
      status: 'pending',
      timestamp: Date.now(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock staking unstake endpoint
  await page.route('**/api/v1/staking/unstake', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    if (simulateFailure) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No staked balance' }),
      });
      return;
    }

    const requestBody = route.request().postDataJSON();
    const response = customResponses['/staking/unstake'] || {
      txHash: 'b'.repeat(64),
      amount: requestBody?.amount || '50',
      status: 'pending',
      timestamp: Date.now(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock node registration endpoint
  await page.route('**/api/v1/nodes/register', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    if (simulateFailure) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Node already registered' }),
      });
      return;
    }

    const requestBody = route.request().postDataJSON();
    const response = customResponses['/nodes/register'] || {
      nodeId: 'NODE_' + Math.random().toString(36).substring(7).toUpperCase(),
      publicKey: requestBody?.publicKey,
      status: 'active',
      registeredAt: Date.now(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock attestation submission endpoint
  await page.route('**/api/v1/attestations/submit', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    if (simulateFailure) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid attestation format' }),
      });
      return;
    }

    const response = customResponses['/attestations/submit'] || {
      attestationId: 'ATT_' + Math.random().toString(36).substring(7).toUpperCase(),
      status: 'verified',
      timestamp: Date.now(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock settings update endpoint
  await page.route('**/api/v1/settings', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    if (simulateFailure) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid settings format' }),
      });
      return;
    }

    const requestBody = route.request().postDataJSON();
    const response = customResponses['/settings'] || {
      success: true,
      settings: requestBody,
      updatedAt: Date.now(),
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock balance/account info endpoint
  await page.route('**/api/v1/account/balance', async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, networkDelay));
    
    const response = customResponses['/account/balance'] || {
      balance: '1000',
      staked: '250',
      available: '750',
      currency: 'XLM',
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Clears all API route mocks
 */
export async function clearMockApi(page: Page): Promise<void> {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
}

/**
 * Records API calls made during test execution
 */
export class ApiCallRecorder {
  private calls: Array<{ url: string; method: string; body: any; timestamp: number }> = [];

  async startRecording(page: Page, pattern: string = '**/api/**'): Promise<void> {
    await page.route(pattern, async (route: Route) => {
      const request = route.request();
      this.calls.push({
        url: request.url(),
        method: request.method(),
        body: request.postDataJSON(),
        timestamp: Date.now(),
      });
      await route.continue();
    });
  }

  getCalls(): Array<{ url: string; method: string; body: any; timestamp: number }> {
    return [...this.calls];
  }

  getCallsTo(urlPattern: string): Array<{ url: string; method: string; body: any; timestamp: number }> {
    return this.calls.filter(call => call.url.includes(urlPattern));
  }

  clear(): void {
    this.calls = [];
  }
}
