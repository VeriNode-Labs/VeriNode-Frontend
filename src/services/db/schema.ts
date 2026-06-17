export const DB_NAME = 'VeriNodeOffline';
export const DB_VERSION = 1;

export enum StoreName {
  InspectionDrafts = 'inspection_drafts',
  SubmissionQueue = 'submission_queue',
  CachedData = 'cached_data',
}

export interface InspectionDraft {
  draftId: string;
  data: ArrayBuffer;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface SubmissionQueueItem {
  queueId?: number;
  payload: ArrayBuffer;
  createdAt: number;
  retryCount: number;
}

export interface CachedDataEntry {
  cacheKey: string;
  data: ArrayBuffer;
  createdAt: number;
  expiresAt: number;
  version: number;
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(StoreName.InspectionDrafts)) {
        const draftStore = db.createObjectStore(StoreName.InspectionDrafts, {
          keyPath: 'draftId',
        });
        draftStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(StoreName.SubmissionQueue)) {
        db.createObjectStore(StoreName.SubmissionQueue, {
          keyPath: 'queueId',
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains(StoreName.CachedData)) {
        const cacheStore = db.createObjectStore(StoreName.CachedData, {
          keyPath: 'cacheKey',
        });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}
