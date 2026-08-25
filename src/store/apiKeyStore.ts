import { create } from "zustand"
import { apiKeyService } from "@/src/services/apiKeyService"
import type { ApiKey, ApiKeyScope, CreatedApiKey } from "@/src/types/apiKey"

interface ApiKeyState {
  keys: ApiKey[]
  isLoading: boolean
  error: string | null
  /** The most recently created key, secret included — cleared once the modal closes. */
  justCreated: CreatedApiKey | null

  fetchKeys: () => Promise<void>
  createKey: (name: string, scopes: ApiKeyScope[]) => Promise<void>
  revokeKey: (id: string) => Promise<void>
  clearJustCreated: () => void
}

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  keys: [],
  isLoading: false,
  error: null,
  justCreated: null,

  fetchKeys: async () => {
    set({ isLoading: true, error: null })
    try {
      const keys = await apiKeyService.list()
      set({ keys, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load API keys", isLoading: false })
    }
  },

  createKey: async (name, scopes) => {
    set({ isLoading: true, error: null })
    try {
      const created = await apiKeyService.create({ name, scopes })
      set({
        keys: [...get().keys, created],
        justCreated: created,
        isLoading: false,
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create API key", isLoading: false })
      throw err
    }
  },

  revokeKey: async (id) => {
    const prevKeys = get().keys
    // Optimistic update — flip status immediately, roll back on failure.
    set({
      keys: prevKeys.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k)),
    })
    try {
      await apiKeyService.revoke(id)
    } catch (err) {
      set({ keys: prevKeys, error: err instanceof Error ? err.message : "Failed to revoke API key" })
    }
  },

  clearJustCreated: () => set({ justCreated: null }),
}))