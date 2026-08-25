/**
 * Developer Portal — API Key types (#dev-portal)
 *
 * Mirrors the scope set defined in the issue spec. Keep this list in sync
 * with whatever the backend enforces — it is the single source of truth
 * for the scope checkboxes rendered in `ApiKeyCreate`.
 */

export const API_KEY_SCOPES = [
  'node:read',
  'node:write',
  'staking:read',
  'governance:read',
  'governance:write',
  'admin',
] as const

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export type ApiKeyStatus = 'active' | 'revoked'

/** A key as returned by the list endpoint — the raw secret is never included here. */
export interface ApiKey {
  id: string
  name: string
  scopes: ApiKeyScope[]
  /** Redacted preview e.g. "vn_live_••••7f2a" for display in the table. */
  keyPreview: string
  status: ApiKeyStatus
  createdAt: number
  lastUsedAt: number | null
  /** Tier drives the rate limit shown in RateLimitGauge (e.g. 'free' | 'pro' | 'enterprise'). */
  tier: string
}

/** Response shape returned exactly once, at creation time, containing the raw secret. */
export interface CreatedApiKey extends ApiKey {
  /** The full, usable secret. Shown once in the creation modal, never persisted client-side. */
  secret: string
}

export interface CreateApiKeyRequest {
  name: string
  scopes: ApiKeyScope[]
}