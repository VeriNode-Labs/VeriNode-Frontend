/**
 * Developer Portal — API Key Service (#dev-portal)
 *
 * CRUD against the API-key management endpoints. Follows the factory-
 * function convention used elsewhere in src/services (see
 * createWebhookService, createPerTenantRateLimiter) so it composes the
 * same way and is trivially mockable in tests.
 */

import { devPortalClient } from '@/src/lib/api/devPortalClient'
import type { ApiKey, CreateApiKeyRequest, CreatedApiKey } from '@/src/types/apiKey'

export interface ApiKeyService {
  list(): Promise<ApiKey[]>
  create(req: CreateApiKeyRequest): Promise<CreatedApiKey>
  revoke(id: string): Promise<void>
}

export function createApiKeyService(client = devPortalClient): ApiKeyService {
  return {
    list() {
      return client.get<ApiKey[]>('/dev/keys')
    },
    create(req: CreateApiKeyRequest) {
      return client.post<CreatedApiKey>('/dev/keys', req)
    },
    revoke(id: string) {
      return client.delete<void>(`/dev/keys/${id}`)
    },
  }
}

/** Shared singleton for components that don't need a custom client (e.g. tests). */
export const apiKeyService = createApiKeyService()