/**
 * Developer Portal — Usage Service (#dev-portal)
 *
 * Same factory-function + devPortalClient pattern as apiKeyService.ts.
 * Swap the client injection once the real src/lib/api client is shared.
 */

import { devPortalClient } from '@/src/lib/api/devPortalClient'
import type { UsageSummary, UsageTimeRange } from '@/src/types/usage'

export interface UsageService {
  getUsage(keyId: string, range: UsageTimeRange): Promise<UsageSummary>
}

export function createUsageService(client = devPortalClient): UsageService {
  return {
    getUsage(keyId: string, range: UsageTimeRange) {
      return client.get<UsageSummary>(`/dev/keys/${keyId}/usage?range=${range}`)
    },
  }
}

export const usageService = createUsageService()