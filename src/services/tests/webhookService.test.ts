/**
 * Unit tests for webhook delivery service (#108)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createWebhookService,
  signPayload,
  verifySignature,
  computeNextDelay,
  SIGNATURE_HEADER,
  type WebhookEvent,
  type WebhookService,
} from '../webhookService'

// Mock fetch for controlled testing
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('webhookService', () => {
  const SECRET = 'test-secret-key-for-hmac'
  const TARGET_URL = 'https://webhook.example.com/events'

  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('signPayload — HMAC-SHA256 signing', () => {
    it('generates deterministic sha256=<hex> signature', async () => {
      const payload = '{"test":"data"}'
      const sig1 = await signPayload(payload, SECRET)
      const sig2 = await signPayload(payload, SECRET)

      expect(sig1).toMatch(/^sha256=[0-9a-f]{64}$/)
      expect(sig1).toBe(sig2) // deterministic
    })

    it('produces different signatures for different secrets', async () => {
      const payload = '{"test":"data"}'
      const sig1 = await signPayload(payload, 'secret-a')
      const sig2 = await signPayload(payload, 'secret-b')

      expect(sig1).not.toBe(sig2)
    })

    it('produces different signatures for different payloads', async () => {
      const sig1 = await signPayload('{"test":"data"}', SECRET)
      const sig2 = await signPayload('{"test":"modified"}', SECRET)

      expect(sig1).not.toBe(sig2)
    })
  })

  describe('verifySignature — constant-time HMAC verification', () => {
    it('accepts valid signatures', async () => {
      const payload = '{"test":"data"}'
      const signature = await signPayload(payload, SECRET)
      const valid = await verifySignature(payload, signature, SECRET)

      expect(valid).toBe(true)
    })

    it('rejects signatures generated with a different secret', async () => {
      const payload = '{"test":"data"}'
      const signature = await signPayload(payload, 'wrong-secret')
      const valid = await verifySignature(payload, signature, SECRET)

      expect(valid).toBe(false)
    })

    it('rejects tampered payloads', async () => {
      const original = '{"test":"data"}'
      const signature = await signPayload(original, SECRET)
      const tampered = '{"test":"tampered"}'
      const valid = await verifySignature(tampered, signature, SECRET)

      expect(valid).toBe(false)
    })

    it('rejects malformed signatures', async () => {
      const payload = '{"test":"data"}'

      expect(await verifySignature(payload, 'not-a-signature', SECRET)).toBe(false)
      expect(await verifySignature(payload, 'sha256=', SECRET)).toBe(false)
      expect(await verifySignature(payload, 'sha256=short', SECRET)).toBe(false)
      expect(await verifySignature(payload, 'sha256=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', SECRET)).toBe(false)
    })
  })

  describe('computeNextDelay — exponential backoff with jitter', () => {
    it('grows exponentially (bounded by maxDelayMs)', () => {
      const baseMs = 1000
      const maxMs = 30_000

      // attempt 0 (first retry): 0..1000
      const d0 = computeNextDelay(0, baseMs, maxMs)
      expect(d0).toBeGreaterThanOrEqual(0)
      expect(d0).toBeLessThanOrEqual(1000)

      // attempt 1: 0..2000
      const d1 = computeNextDelay(1, baseMs, maxMs)
      expect(d1).toBeGreaterThanOrEqual(0)
      expect(d1).toBeLessThanOrEqual(2000)

      // attempt 2: 0..4000
      const d2 = computeNextDelay(2, baseMs, maxMs)
      expect(d2).toBeGreaterThanOrEqual(0)
      expect(d2).toBeLessThanOrEqual(4000)

      // attempt 10: should be capped at maxMs
      const d10 = computeNextDelay(10, baseMs, maxMs)
      expect(d10).toBeGreaterThanOrEqual(0)
      expect(d10).toBeLessThanOrEqual(maxMs)
    })

    it('applies jitter (non-deterministic)', () => {
      const samples = Array.from({ length: 10 }, () =>
        computeNextDelay(0, 1000, 30_000),
      )
      const unique = new Set(samples)
      // With 10 samples and full jitter, we expect at least 2 distinct values
      // (can occasionally fail with extremely low probability).
      expect(unique.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('createWebhookService — delivery lifecycle', () => {
    let service: WebhookService

    beforeEach(() => {
      service = createWebhookService({
        secret: SECRET,
        maxAttempts: 5,
        baseDelayMs: 100, // short delays for fast tests
        maxDelayMs: 500,
      })
    })

    it('delivers successfully on first attempt (HTTP 200)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      const event: WebhookEvent = {
        id: 'evt-1',
        type: 'validator.attested',
        createdAt: Date.now(),
        payload: { validatorIndex: 42 },
      }

      const record = await service.deliver(event, TARGET_URL)

      expect(record.status).toBe('delivered')
      expect(record.attempts).toBe(1)
      expect(record.lastHttpStatus).toBe(200)
      expect(record.lastError).toBeNull()

      // Verify fetch was called once with correct headers
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe(TARGET_URL)
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(init.headers[SIGNATURE_HEADER]).toMatch(/^sha256=[0-9a-f]{64}$/)
      expect(init.headers['X-VeriNode-Event']).toBe('validator.attested')
      expect(init.headers['X-VeriNode-Delivery']).toBe(record.deliveryId)
    })

    it('retries on HTTP 500 and eventually succeeds', async () => {
      // First two attempts fail, third succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)

      const event: WebhookEvent = {
        id: 'evt-2',
        type: 'staking.confirmed',
        createdAt: Date.now(),
        payload: { amount: 100 },
      }

      const record = await service.deliver(event, TARGET_URL)

      expect(record.status).toBe('delivered')
      expect(record.attempts).toBe(3)
      expect(record.lastHttpStatus).toBe(200)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('marks delivery as failed after max attempts exhausted', async () => {
      // All 5 attempts fail
      mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response)

      const event: WebhookEvent = {
        id: 'evt-3',
        type: 'node.offline',
        createdAt: Date.now(),
        payload: { nodeId: 'n-123' },
      }

      const record = await service.deliver(event, TARGET_URL)

      expect(record.status).toBe('failed')
      expect(record.attempts).toBe(5)
      expect(record.lastHttpStatus).toBe(503)
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })

    it('handles network errors (fetch throws)', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const event: WebhookEvent = {
        id: 'evt-4',
        type: 'governance.proposalCreated',
        createdAt: Date.now(),
        payload: { proposalId: 'p-42' },
      }

      const record = await service.deliver(event, TARGET_URL)

      expect(record.status).toBe('failed')
      expect(record.attempts).toBe(5)
      expect(record.lastHttpStatus).toBeNull()
      expect(record.lastError).toMatch(/ECONNREFUSED/)
    })

    it('records all deliveries in getDeliveryRecords()', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response)

      const event1: WebhookEvent = {
        id: 'evt-a',
        type: 'validator.attested',
        createdAt: Date.now(),
        payload: {},
      }
      const event2: WebhookEvent = {
        id: 'evt-b',
        type: 'validator.slashed',
        createdAt: Date.now(),
        payload: {},
      }

      await service.deliver(event1, TARGET_URL)
      await service.deliver(event2, TARGET_URL)

      const records = service.getDeliveryRecords()
      expect(records).toHaveLength(2)
      expect(records.map((r) => r.event.id)).toEqual(['evt-a', 'evt-b'])
    })

    it('incremental status updates reflected in getDeliveryRecords()', async () => {
      // Let the first attempt fail so we can observe pending status briefly.
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)

      const event: WebhookEvent = {
        id: 'evt-5',
        type: 'staking.failed',
        createdAt: Date.now(),
        payload: {},
      }

      const promise = service.deliver(event, TARGET_URL)

      // The record should exist immediately (status: pending, attempts: 0).
      let records = service.getDeliveryRecords()
      expect(records).toHaveLength(1)
      expect(records[0].status).toBe('pending')

      await promise

      // After completion: status delivered, attempts 2.
      records = service.getDeliveryRecords()
      expect(records[0].status).toBe('delivered')
      expect(records[0].attempts).toBe(2)
    })
  })

  describe('createWebhookService — signature verification API', () => {
    let service: WebhookService

    beforeEach(() => {
      service = createWebhookService({ secret: SECRET })
    })

    it('service.sign() wraps signPayload with the configured secret', async () => {
      const payload = '{"test":"data"}'
      const sig1 = await service.sign(payload)
      const sig2 = await signPayload(payload, SECRET)

      expect(sig1).toBe(sig2)
    })

    it('service.verify() wraps verifySignature with the configured secret', async () => {
      const payload = '{"test":"data"}'
      const signature = await service.sign(payload)

      const valid = await service.verify(payload, signature)
      const invalid = await service.verify(payload, 'sha256=0000000000000000000000000000000000000000000000000000000000000000')

      expect(valid).toBe(true)
      expect(invalid).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles empty payloads', async () => {
      const sig = await signPayload('', SECRET)
      const valid = await verifySignature('', sig, SECRET)
      expect(valid).toBe(true)
    })

    it('handles large payloads (>10 KB)', async () => {
      const largePayload = JSON.stringify({ data: 'x'.repeat(20_000) })
      const sig = await signPayload(largePayload, SECRET)
      const valid = await verifySignature(largePayload, sig, SECRET)
      expect(valid).toBe(true)
    })

    it('handles unicode payloads', async () => {
      const payload = JSON.stringify({ message: 'こんにちは 🌍' })
      const sig = await signPayload(payload, SECRET)
      const valid = await verifySignature(payload, sig, SECRET)
      expect(valid).toBe(true)
    })

    it('generates unique delivery IDs for concurrent deliveries', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response)

      const service = createWebhookService({ secret: SECRET })
      const event: WebhookEvent = {
        id: 'evt-concurrent',
        type: 'validator.attested',
        createdAt: Date.now(),
        payload: {},
      }

      const [r1, r2, r3] = await Promise.all([
        service.deliver(event, TARGET_URL),
        service.deliver(event, TARGET_URL),
        service.deliver(event, TARGET_URL),
      ])

      const ids = [r1.deliveryId, r2.deliveryId, r3.deliveryId]
      const unique = new Set(ids)
      expect(unique.size).toBe(3)
    })
  })

  describe('real-world scenario: webhook receiver validation', () => {
    it('end-to-end: sign on sender, verify on receiver', async () => {
      const senderService = createWebhookService({ secret: SECRET })
      const receiverService = createWebhookService({ secret: SECRET })

      const event: WebhookEvent = {
        id: 'evt-e2e',
        type: 'governance.proposalResolved',
        createdAt: Date.now(),
        payload: { proposalId: 'p-999', result: 'approved' },
      }

      const body = JSON.stringify(event)
      const signature = await senderService.sign(body)

      // Receiver validates the signature before processing
      const valid = await receiverService.verify(body, signature)
      expect(valid).toBe(true)

      // Tampered body should fail verification
      const tamperedBody = JSON.stringify({ ...event, payload: { ...event.payload, result: 'rejected' } })
      const tamperedValid = await receiverService.verify(tamperedBody, signature)
      expect(tamperedValid).toBe(false)
    })

    it('different secrets between sender and receiver fail verification', async () => {
      const senderService = createWebhookService({ secret: 'sender-secret' })
      const receiverService = createWebhookService({ secret: 'receiver-secret' })

      const body = '{"test":"data"}'
      const signature = await senderService.sign(body)
      const valid = await receiverService.verify(body, signature)

      expect(valid).toBe(false)
    })
  })

  describe('performance: P99 < 100ms for signature operations', () => {
    it('signPayload completes in <100ms for typical payloads', async () => {
      const payload = JSON.stringify({
        id: 'evt-perf',
        type: 'validator.attested',
        createdAt: Date.now(),
        payload: { validatorIndex: 42, blockNumber: 1_000_000 },
      })

      const samples: number[] = []
      for (let i = 0; i < 100; i++) {
        const start = performance.now()
        await signPayload(payload, SECRET)
        samples.push(performance.now() - start)
      }

      samples.sort((a, b) => a - b)
      const p99 = samples[98] // 99th percentile
      expect(p99).toBeLessThan(100)
    })

    it('verifySignature completes in <100ms for typical payloads', async () => {
      const payload = JSON.stringify({
        id: 'evt-perf',
        type: 'validator.attested',
        createdAt: Date.now(),
        payload: { validatorIndex: 42, blockNumber: 1_000_000 },
      })
      const signature = await signPayload(payload, SECRET)

      const samples: number[] = []
      for (let i = 0; i < 100; i++) {
        const start = performance.now()
        await verifySignature(payload, signature, SECRET)
        samples.push(performance.now() - start)
      }

      samples.sort((a, b) => a - b)
      const p99 = samples[98] // 99th percentile
      expect(p99).toBeLessThan(100)
    })
  })
})
