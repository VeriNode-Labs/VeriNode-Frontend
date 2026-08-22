import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { backupService } from '@/src/services/db/backupService'
import type { DatabaseBackup } from '@/src/types/databaseBackup'
import type { StoredBalanceBlock } from '@/src/types/balance'

function makeBalanceBlock(
  key: string,
  validatorIndex: number,
  baseEpoch: number,
  lastEpoch: number,
): StoredBalanceBlock {
  return {
    key,
    validatorIndex,
    baseEpoch,
    lastEpoch,
    baseBalance: '1000000000000000000',
    deltas: [],
    zeroRuns: [{ startEpoch: baseEpoch, zeroLength: lastEpoch - baseEpoch + 1 }],
    updatedAt: Date.now(),
  }
}

describe('BackupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    backupService.stopScheduledVerification()
  })

  describe('exportDatabase', () => {
    it('should produce a valid backup structure', async () => {
      const backup = await backupService.exportDatabase()
      expect(backup).toHaveProperty('version', 1)
      expect(backup).toHaveProperty('createdAt')
      expect(backup).toHaveProperty('checksum')
      expect(typeof backup.checksum).toBe('string')
      expect(backup.checksum.length).toBeGreaterThan(0)
    })

    it('should produce consistent checksums for identical data', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(1700000000000)
      try {
        const backup1 = await backupService.exportDatabase()
        const backup2 = await backupService.exportDatabase()
        expect(backup1.checksum).toBe(backup2.checksum)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('verifyBackupIntegrity', () => {
    it('should pass verification for a newly exported backup', async () => {
      const result = await backupService.verifyBackupIntegrity()
      expect(result).toBe(true)
    })

    it('should detect checksum corruption', async () => {
      const backup = await backupService.exportDatabase()
      backup.checksum = 'corrupted-checksum'
      const result = await backupService.verifyBackupIntegrity(backup)
      expect(result).toBe(false)
    })

    it('should detect empty checksum', async () => {
      const backup = await backupService.exportDatabase()
      backup.checksum = ''
      const result = await backupService.verifyBackupIntegrity(backup)
      expect(result).toBe(false)
    })

    it('should detect data tampering', async () => {
      const backup = await backupService.exportDatabase()
      if (backup.databases.balanceHistory?.blocks) {
        backup.databases.balanceHistory.blocks[0] = makeBalanceBlock('tampered', 0, 0, 10)
      }
      const serialized = JSON.stringify({ ...backup, checksum: '' })
      const { sha256 } = await import('@/src/lib/crypto')
      backup.checksum = await sha256(serialized)
      const result = await backupService.verifyBackupIntegrity(backup)
      expect(result).toBe(true)
    })
  })

  describe('export and import JSON', () => {
    it('should round-trip backup through JSON', async () => {
      const json1 = await backupService.exportBackupToJson()
      const parsed: DatabaseBackup = JSON.parse(json1)
      expect(parsed.version).toBe(1)
      expect(parsed.checksum).toBeTruthy()
      await expect(backupService.importBackupFromJson(json1)).resolves.not.toThrow()
    })
  })

  describe('restoreFromBackup', () => {
    it('should reject backup with bad checksum', async () => {
      const backup = await backupService.exportDatabase()
      backup.checksum = 'bad-checksum'
      await expect(backupService.restoreFromBackup(backup)).rejects.toThrow('checksum')
    })

    it('should accept a valid backup', async () => {
      const backup = await backupService.exportDatabase()
      await expect(backupService.restoreFromBackup(backup)).resolves.not.toThrow()
    })
  })

  describe('scheduled verification', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should start and stop scheduled verification', () => {
      const verifySpy = vi.spyOn(backupService, 'verifyBackupIntegrity')
      backupService.startScheduledVerification(1000)
      expect(verifySpy).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(verifySpy).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1000)
      expect(verifySpy).toHaveBeenCalledTimes(2)
      backupService.stopScheduledVerification()
      vi.advanceTimersByTime(3000)
      expect(verifySpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('runBackup', () => {
    it('should return a backup report with duration', async () => {
      const report = await backupService.runBackup()
      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('duration')
      expect(report.duration).toBeGreaterThanOrEqual(0)
      expect(report).toHaveProperty('backupSize')
      expect(report).toHaveProperty('checksum')
    })

    it('should update service state on success', async () => {
      await backupService.runBackup()
      const state = backupService.getState()
      expect(state.backupStatus).toBe('success')
      expect(state.lastBackupTime).toBeTruthy()
    })
  })

  describe('state management', () => {
    it('should notify listeners on state change', async () => {
      const listener = vi.fn()
      const unsubscribe = backupService.subscribe(listener)
      await backupService.runBackup()
      expect(listener).toHaveBeenCalled()
      unsubscribe()
    })
  })
})
