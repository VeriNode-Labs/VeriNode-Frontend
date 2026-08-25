/**
 * ASSUMPTION — placeholder HTTP client.
 *
 * I don't yet have the contents of the real `src/lib/api/` client, so this
 * is a minimal stand-in with the same shape most fetch wrappers use
 * (base URL + JSON in/out + thrown ApiError on non-2xx). Once you paste
 * the real client, delete this file and point `apiKeyService.ts` /
 * `webhookTesterService.ts` at it instead — the call sites are written
 * against a `{ get, post, delete }` shape so the swap should be a
 * one-line import change.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = null
    }
    throw new ApiError(`Request to ${path} failed with status ${res.status}`, res.status, body)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const devPortalClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}