import { create } from 'zustand'
import type { BackupStatus, VerifyStatus, RestoreStatus } from '@/src/types/databaseBackup'

export interface BackupStoreState {
  lastBackupTime: number | null
  lastVerifyTime: number | null
  lastRestoreTime: number | null
  backupStatus: BackupStatus
  verifyStatus: VerifyStatus
  restoreStatus: RestoreStatus
  lastError: string | null
  checksumMismatch: boolean
  isScheduled: boolean

  setLastBackupTime: (time: number | null) => void
  setLastVerifyTime: (time: number | null) => void
  setLastRestoreTime: (time: number | null) => void
  setBackupStatus: (status: BackupStatus) => void
  setVerifyStatus: (status: VerifyStatus) => void
  setRestoreStatus: (status: RestoreStatus) => void
  setLastError: (error: string | null) => void
  setChecksumMismatch: (mismatch: boolean) => void
  setIsScheduled: (scheduled: boolean) => void
  reset: () => void
}

const initialState = {
  lastBackupTime: null as number | null,
  lastVerifyTime: null as number | null,
  lastRestoreTime: null as number | null,
  backupStatus: 'idle' as BackupStatus,
  verifyStatus: 'idle' as VerifyStatus,
  restoreStatus: 'idle' as RestoreStatus,
  lastError: null as string | null,
  checksumMismatch: false,
  isScheduled: false,
}

export const useBackupStore = create<BackupStoreState>((set) => ({
  ...initialState,
  setLastBackupTime: (time) => set({ lastBackupTime: time }),
  setLastVerifyTime: (time) => set({ lastVerifyTime: time }),
  setLastRestoreTime: (time) => set({ lastRestoreTime: time }),
  setBackupStatus: (status) => set({ backupStatus: status }),
  setVerifyStatus: (status) => set({ verifyStatus: status }),
  setRestoreStatus: (status) => set({ restoreStatus: status }),
  setLastError: (error) => set({ lastError: error }),
  setChecksumMismatch: (mismatch) => set({ checksumMismatch: mismatch }),
  setIsScheduled: (scheduled) => set({ isScheduled: scheduled }),
  reset: () => set(initialState),
}))
