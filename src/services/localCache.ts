import { openDatabase, StoreName, type InspectionDraft, type SubmissionQueueItem, type CachedDataEntry } from '@/src/services/db/schema'
import { encrypt, decrypt } from '@/src/services/crypto'

function serialize<T>(value: T): ArrayBuffer {
  return new TextEncoder().encode(JSON.stringify(value)).buffer
}

function deserialize<T>(buffer: ArrayBuffer): T {
  return JSON.parse(new TextDecoder().decode(buffer))
}

export class OfflineStorage {
  private async withStore<T>(
    storeName: StoreName,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | IDBRequest<IDBValidKey>
  ): Promise<T> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode)
      const store = transaction.objectStore(storeName)
      const request = fn(store)

      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  }

  async saveDraft(draft: Omit<InspectionDraft, 'data'> & { data: unknown }): Promise<void> {
    const serialized = serialize(draft.data)
    const encrypted = await encrypt(serialized)
    const entry: InspectionDraft = {
      draftId: draft.draftId,
      data: encrypted,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      version: draft.version,
    }
    await this.withStore(StoreName.InspectionDrafts, 'readwrite', (store) => store.put(entry))
  }

  async loadDraft(draftId: string): Promise<{ draftId: string; data: unknown; createdAt: number; updatedAt: number; version: number } | null> {
    const entry = await this.withStore<InspectionDraft | undefined>(
      StoreName.InspectionDrafts,
      'readonly',
      (store) => store.get(draftId)
    )
    if (!entry) return null
    const decrypted = await decrypt(entry.data)
    const data = deserialize(decrypted)
    return { draftId: entry.draftId, data, createdAt: entry.createdAt, updatedAt: entry.updatedAt, version: entry.version }
  }

  async updateDraft(draftId: string, data: unknown): Promise<void> {
    const existing = await this.withStore<InspectionDraft | undefined>(
      StoreName.InspectionDrafts,
      'readonly',
      (store) => store.get(draftId)
    )
    if (!existing) {
      await this.saveDraft({
        draftId,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      })
      return
    }
    const serialized = serialize(data)
    const encrypted = await encrypt(serialized)
    existing.data = encrypted
    existing.updatedAt = Date.now()
    existing.version += 1
    await this.withStore(StoreName.InspectionDrafts, 'readwrite', (store) => store.put(existing))
  }

  async listDrafts(): Promise<Array<{ draftId: string; updatedAt: number }>> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(StoreName.InspectionDrafts, 'readonly')
      const store = transaction.objectStore(StoreName.InspectionDrafts)
      const index = store.index('updatedAt')
      const request = index.openCursor(null, 'prev')
      const results: Array<{ draftId: string; updatedAt: number }> = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          results.push({ draftId: cursor.value.draftId, updatedAt: cursor.value.updatedAt })
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.withStore(StoreName.InspectionDrafts, 'readwrite', (store) => store.delete(draftId))
  }

  async enqueueSubmission(payload: unknown): Promise<void> {
    const serialized = serialize(payload)
    const encrypted = await encrypt(serialized)
    const item: SubmissionQueueItem = {
      payload: encrypted,
      createdAt: Date.now(),
      retryCount: 0,
    }
    await this.withStore(StoreName.SubmissionQueue, 'readwrite', (store) => store.add(item))
  }

  async dequeueSubmission(): Promise<{ queueId: number; data: unknown } | null> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(StoreName.SubmissionQueue, 'readwrite')
      const store = transaction.objectStore(StoreName.SubmissionQueue)
      const request = store.openCursor()

      request.onsuccess = async () => {
        const cursor = request.result
        if (!cursor) {
          resolve(null)
          return
        }
        const entry = cursor.value as SubmissionQueueItem
        const deleteRequest = cursor.delete()
        deleteRequest.onsuccess = () => {
          decrypt(entry.payload)
            .then((decrypted) => {
              const data = deserialize(decrypted)
              resolve({ queueId: entry.queueId!, data })
            })
            .catch(reject)
        }
        deleteRequest.onerror = () => reject(deleteRequest.error)
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    })
  }

  async peekQueue(): Promise<number> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(StoreName.SubmissionQueue, 'readonly')
      const store = transaction.objectStore(StoreName.SubmissionQueue)
      const countRequest = store.count()

      countRequest.onsuccess = () => resolve(countRequest.result)
      countRequest.onerror = () => reject(countRequest.error)
      transaction.oncomplete = () => db.close()
    })
  }

  async getCached(key: string): Promise<{ data: unknown; createdAt: number } | null> {
    const entry = await this.withStore<CachedDataEntry | undefined>(
      StoreName.CachedData,
      'readonly',
      (store) => store.get(key)
    )
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      await this.withStore(StoreName.CachedData, 'readwrite', (store) => store.delete(key))
      return null
    }
    const decrypted = await decrypt(entry.data)
    const data = deserialize(decrypted)
    return { data, createdAt: entry.createdAt }
  }

  async setCached(key: string, value: unknown, ttlMinutes: number): Promise<void> {
    const serialized = serialize(value)
    const encrypted = await encrypt(serialized)
    const now = Date.now()
    const entry: CachedDataEntry = {
      cacheKey: key,
      data: encrypted,
      createdAt: now,
      expiresAt: now + ttlMinutes * 60 * 1000,
      version: 1,
    }
    await this.withStore(StoreName.CachedData, 'readwrite', (store) => store.put(entry))
  }
}

export const offlineStorage = new OfflineStorage()
