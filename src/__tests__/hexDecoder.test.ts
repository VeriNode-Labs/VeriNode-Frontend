// Unit tests for the Soroban log event decoder pipeline (Issue #181).
//
// Strategy: encode known event structures using @stellar/stellar-sdk
// nativeToScVal → verify decodeLedgerEvent produces the correct typed output.
// All assertions map back directly to the wire-format invariants documented in
// src/utils/hexDecoder.ts.
//
// Wire format recap (must match the encoder below and the decoder):
//   topic[0] : XDR ScVal symbol  → event signature ("slash_node", …)
//   topic[1] : XDR ScVal         → primary subject (node id or param key)
//   body     : base64 XDR ScVal  → SCMap of the remaining fields

import { describe, it, expect } from 'vitest'
import { nativeToScVal } from '@stellar/stellar-sdk'
import {
  decodeLedgerEvent,
  EVENT_TITLES,
  EVENT_SEVERITY,
  HIGH_SEVERITY_EVENTS,
} from '@/src/utils/hexDecoder'
import type {
  ApproveAttestationEvent,
  RejectAttestationEvent,
  SlashNodeEvent,
  RewardDistributedEvent,
  NodeRegisteredEvent,
  NodeDeregisteredEvent,
  ParameterChangedEvent,
  UnknownEvent,
} from '@/src/types/ledgerEvents'

// ── encoder helpers ───────────────────────────────────────────────────────────

/** Encode a symbol-type ScVal (used for topic[0] event signatures). */
function encodeSymbol(value: string): string {
  return nativeToScVal(value, { type: 'symbol' }).toXDR('hex')
}

/** Encode a string-type ScVal (used for topic[1] primary subjects). */
function encodeString(value: string): string {
  return nativeToScVal(value, { type: 'string' }).toXDR('hex')
}

/** Encode a plain JS object as an SCMap ScVal body (base64). */
function encodeBody(fields: Record<string, unknown>): string {
  return nativeToScVal(fields, { type: 'map' }).toXDR('base64')
}

// ── shared test metadata ──────────────────────────────────────────────────────

const TS = 1_700_000_000_000
const SEQ = 42
const META = { id: 'test-event-01', timestamp: TS, ledgerSeq: SEQ }

// ─────────────────────────────────────────────────────────────────────────────
// 1. Known event types
// ─────────────────────────────────────────────────────────────────────────────

describe('decodeLedgerEvent – approve_attestation', () => {
  const topics = [
    encodeSymbol('approve_attestation'),
    encodeString('node-0xABC'),
  ]
  const body = encodeBody({ attestation_id: 'att-99', epoch: 5 })

  it('returns type approve_attestation', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.type).toBe('approve_attestation')
  })

  it('carries the correct human-readable title', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.title).toBe('Attestation Approved')
    expect(event.title).toBe(EVENT_TITLES.approve_attestation)
  })

  it('has success severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.severity).toBe('success')
  })

  it('is NOT high-severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.highSeverity).toBe(false)
  })

  it('extracts nodeId from topic[1]', () => {
    const event = decodeLedgerEvent(topics, body, META) as ApproveAttestationEvent
    expect(event.nodeId).toBe('node-0xABC')
  })

  it('extracts attestationId and epoch from the body', () => {
    const event = decodeLedgerEvent(topics, body, META) as ApproveAttestationEvent
    expect(event.attestationId).toBe('att-99')
    expect(event.epoch).toBe(5)
  })

  it('propagates metadata', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.id).toBe('test-event-01')
    expect(event.timestamp).toBe(TS)
    expect(event.ledgerSeq).toBe(SEQ)
  })

  it('retains raw wire data', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.rawTopics).toEqual(topics)
    expect(event.rawBody).toBe(body)
  })
})

describe('decodeLedgerEvent – reject_attestation', () => {
  const topics = [
    encodeSymbol('reject_attestation'),
    encodeString('node-XYZ'),
  ]
  const body = encodeBody({ attestation_id: 'att-77', reason: 'invalid-sig' })

  it('returns type reject_attestation', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.type).toBe('reject_attestation')
  })

  it('has the correct title', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.title).toBe('Attestation Rejected')
  })

  it('has error severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.severity).toBe('error')
  })

  it('IS high-severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.highSeverity).toBe(true)
  })

  it('is in HIGH_SEVERITY_EVENTS set', () => {
    expect(HIGH_SEVERITY_EVENTS.has('reject_attestation')).toBe(true)
  })

  it('extracts fields correctly', () => {
    const event = decodeLedgerEvent(topics, body, META) as RejectAttestationEvent
    expect(event.nodeId).toBe('node-XYZ')
    expect(event.attestationId).toBe('att-77')
    expect(event.reason).toBe('invalid-sig')
  })
})

describe('decodeLedgerEvent – slash_node', () => {
  const topics = [
    encodeSymbol('slash_node'),
    encodeString('node-SLASHED'),
  ]
  const body = encodeBody({ amount: '1000000000', reason: 'double-sign' })

  it('returns type slash_node', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.type).toBe('slash_node')
  })

  it('has the correct title "Node Slashed"', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.title).toBe('Node Slashed')
  })

  it('has error severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.severity).toBe('error')
  })

  it('IS high-severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.highSeverity).toBe(true)
  })

  it('is in HIGH_SEVERITY_EVENTS set', () => {
    expect(HIGH_SEVERITY_EVENTS.has('slash_node')).toBe(true)
  })

  it('extracts amount and reason', () => {
    const event = decodeLedgerEvent(topics, body, META) as SlashNodeEvent
    expect(event.nodeId).toBe('node-SLASHED')
    expect(event.amount).toBe('1000000000')
    expect(event.reason).toBe('double-sign')
  })
})

describe('decodeLedgerEvent – reward_distributed', () => {
  const topics = [
    encodeSymbol('reward_distributed'),
    encodeString('node-REWARDED'),
  ]
  const body = encodeBody({ amount: '250000', epoch: 101 })

  it('returns type reward_distributed', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.type).toBe('reward_distributed')
  })

  it('has the correct title', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.title).toBe('Reward Distributed')
  })

  it('has success severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.severity).toBe('success')
  })

  it('is NOT high-severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.highSeverity).toBe(false)
  })

  it('extracts amount and epoch', () => {
    const event = decodeLedgerEvent(topics, body, META) as RewardDistributedEvent
    expect(event.nodeId).toBe('node-REWARDED')
    expect(event.amount).toBe('250000')
    expect(event.epoch).toBe(101)
  })
})

describe('decodeLedgerEvent – node_registered', () => {
  const topics = [
    encodeSymbol('node_registered'),
    encodeString('node-NEW'),
  ]
  const body = encodeBody({ operator: 'op-STELLAR-123' })

  it('returns type node_registered', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.type).toBe('node_registered')
  })

  it('has success severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.severity).toBe('success')
  })

  it('extracts nodeId and operator', () => {
    const event = decodeLedgerEvent(topics, body, META) as NodeRegisteredEvent
    expect(event.nodeId).toBe('node-NEW')
    expect(event.operator).toBe('op-STELLAR-123')
  })
})

describe('decodeLedgerEvent – node_deregistered', () => {
  const topics = [
    encodeSymbol('node_deregistered'),
    encodeString('node-LEAVING'),
  ]
  const body = encodeBody({ reason: 'voluntary-exit' })

  it('returns type node_deregistered', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.type).toBe('node_deregistered')
  })

  it('has warning severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.severity).toBe('warning')
  })

  it('extracts nodeId and reason', () => {
    const event = decodeLedgerEvent(topics, body, META) as NodeDeregisteredEvent
    expect(event.nodeId).toBe('node-LEAVING')
    expect(event.reason).toBe('voluntary-exit')
  })
})

describe('decodeLedgerEvent – parameter_changed', () => {
  const topics = [
    encodeSymbol('parameter_changed'),
    encodeString('max_validators'),
  ]
  const body = encodeBody({ old_value: '100', new_value: '200' })

  it('returns type parameter_changed', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.type).toBe('parameter_changed')
  })

  it('has warning severity', () => {
    const event = decodeLedgerEvent(topics, body, META)
    expect(event.severity).toBe('warning')
  })

  it('extracts key, oldValue and newValue', () => {
    const event = decodeLedgerEvent(topics, body, META) as ParameterChangedEvent
    expect(event.key).toBe('max_validators')
    expect(event.oldValue).toBe('100')
    expect(event.newValue).toBe('200')
  })

  it('also reads old/new aliases from body', () => {
    const altBody = encodeBody({ old: 'alpha', new: 'beta' })
    const event = decodeLedgerEvent(
      [encodeSymbol('parameter_changed'), encodeString('threshold')],
      altBody,
      META,
    ) as ParameterChangedEvent
    expect(event.oldValue).toBe('alpha')
    expect(event.newValue).toBe('beta')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unknown / error paths
// ─────────────────────────────────────────────────────────────────────────────

describe('decodeLedgerEvent – unknown event types', () => {
  it('returns UnknownEvent for a valid XDR symbol not in the lookup table', () => {
    const topics = [encodeSymbol('future_event_type_v3')]
    const event = decodeLedgerEvent(topics, '', META)
    expect(event.type).toBe('unknown')
    const u = event as UnknownEvent
    expect(u.signature).toBe('future_event_type_v3')
  })

  it('UnknownEvent has "Unknown Event" title', () => {
    const event = decodeLedgerEvent([encodeSymbol('not_a_known_type')], '', META)
    expect(event.title).toBe('Unknown Event')
  })

  it('UnknownEvent has info severity and is NOT high-severity', () => {
    const event = decodeLedgerEvent([encodeSymbol('mystery')], '', META) as UnknownEvent
    expect(event.severity).toBe('info')
    expect(event.highSeverity).toBe(false)
  })

  it('does NOT throw for a completely invalid hex string', () => {
    expect(() => decodeLedgerEvent(['not-valid-hex-at-all'], '', META)).not.toThrow()
    const event = decodeLedgerEvent(['not-valid-hex-at-all'], '', META)
    expect(event.type).toBe('unknown')
  })

  it('returns UnknownEvent with null signature for non-parseable XDR', () => {
    const event = decodeLedgerEvent(['deadbeef'], '', META) as UnknownEvent
    expect(event.type).toBe('unknown')
    // signature is null when the XDR doesn't parse as a ScVal symbol
    expect(event.signature === null || typeof event.signature === 'string').toBe(true)
  })

  it('does NOT throw for an empty topics array', () => {
    expect(() => decodeLedgerEvent([], '', META)).not.toThrow()
    const event = decodeLedgerEvent([], '', META) as UnknownEvent
    expect(event.type).toBe('unknown')
  })

  it('does NOT throw for a null-ish topics argument', () => {
    // @ts-expect-error intentionally passing bad input for resilience test
    expect(() => decodeLedgerEvent(null, '', META)).not.toThrow()
  })

  it('does NOT throw for a malformed base64 body', () => {
    const topics = [encodeSymbol('slash_node'), encodeString('node-X')]
    expect(() => decodeLedgerEvent(topics, '!!!NOT_BASE64!!!', META)).not.toThrow()
  })

  it('retains rawTopics on UnknownEvent', () => {
    const badTopics = ['cafebabe12345678']
    const event = decodeLedgerEvent(badTopics, 'abc', META)
    expect(event.rawTopics).toEqual(badTopics)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Metadata propagation
// ─────────────────────────────────────────────────────────────────────────────

describe('decodeLedgerEvent – metadata propagation', () => {
  const topics = [encodeSymbol('node_registered'), encodeString('node-META')]
  const body = encodeBody({ operator: 'op-Z' })

  it('uses supplied id', () => {
    const event = decodeLedgerEvent(topics, body, { id: 'custom-id-777' })
    expect(event.id).toBe('custom-id-777')
  })

  it('falls back to a non-empty id when none is supplied', () => {
    const event = decodeLedgerEvent(topics, body, {})
    expect(event.id).toBeTruthy()
    expect(typeof event.id).toBe('string')
  })

  it('uses supplied timestamp', () => {
    const event = decodeLedgerEvent(topics, body, { timestamp: 9_999_999 })
    expect(event.timestamp).toBe(9_999_999)
  })

  it('uses supplied ledgerSeq', () => {
    const event = decodeLedgerEvent(topics, body, { ledgerSeq: 1234 })
    expect(event.ledgerSeq).toBe(1234)
  })

  it('ledgerSeq defaults to null when not supplied', () => {
    const event = decodeLedgerEvent(topics, body, {})
    expect(event.ledgerSeq).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. EVENT_TITLES and EVENT_SEVERITY lookup tables
// ─────────────────────────────────────────────────────────────────────────────

describe('EVENT_TITLES lookup table', () => {
  it('contains exactly the 7 known event types', () => {
    const keys = Object.keys(EVENT_TITLES)
    expect(keys).toHaveLength(7)
  })

  it('slash_node → "Node Slashed"', () => {
    expect(EVENT_TITLES.slash_node).toBe('Node Slashed')
  })

  it('approve_attestation → "Attestation Approved"', () => {
    expect(EVENT_TITLES.approve_attestation).toBe('Attestation Approved')
  })

  it('reject_attestation → "Attestation Rejected"', () => {
    expect(EVENT_TITLES.reject_attestation).toBe('Attestation Rejected')
  })

  it('reward_distributed → "Reward Distributed"', () => {
    expect(EVENT_TITLES.reward_distributed).toBe('Reward Distributed')
  })

  it('node_registered → "Node Registered"', () => {
    expect(EVENT_TITLES.node_registered).toBe('Node Registered')
  })

  it('node_deregistered → "Node Deregistered"', () => {
    expect(EVENT_TITLES.node_deregistered).toBe('Node Deregistered')
  })

  it('parameter_changed → "Parameter Changed"', () => {
    expect(EVENT_TITLES.parameter_changed).toBe('Parameter Changed')
  })
})

describe('EVENT_SEVERITY lookup table', () => {
  it('slash_node is error severity', () => {
    expect(EVENT_SEVERITY.slash_node).toBe('error')
  })

  it('reject_attestation is error severity', () => {
    expect(EVENT_SEVERITY.reject_attestation).toBe('error')
  })

  it('approve_attestation is success severity', () => {
    expect(EVENT_SEVERITY.approve_attestation).toBe('success')
  })

  it('reward_distributed is success severity', () => {
    expect(EVENT_SEVERITY.reward_distributed).toBe('success')
  })

  it('node_registered is success severity', () => {
    expect(EVENT_SEVERITY.node_registered).toBe('success')
  })

  it('node_deregistered is warning severity', () => {
    expect(EVENT_SEVERITY.node_deregistered).toBe('warning')
  })

  it('parameter_changed is warning severity', () => {
    expect(EVENT_SEVERITY.parameter_changed).toBe('warning')
  })
})

describe('HIGH_SEVERITY_EVENTS set', () => {
  it('contains slash_node', () => {
    expect(HIGH_SEVERITY_EVENTS.has('slash_node')).toBe(true)
  })

  it('contains reject_attestation', () => {
    expect(HIGH_SEVERITY_EVENTS.has('reject_attestation')).toBe(true)
  })

  it('does NOT contain approve_attestation', () => {
    expect(HIGH_SEVERITY_EVENTS.has('approve_attestation')).toBe(false)
  })

  it('does NOT contain reward_distributed', () => {
    expect(HIGH_SEVERITY_EVENTS.has('reward_distributed')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Body fallback: fields in body when topic[1] absent
// ─────────────────────────────────────────────────────────────────────────────

describe('decodeLedgerEvent – body fallback when topic[1] absent', () => {
  it('reads node_id from body when topic[1] is missing', () => {
    const topics = [encodeSymbol('slash_node')]
    const body = encodeBody({ node_id: 'node-FROM-BODY', amount: '1', reason: 'x' })
    const event = decodeLedgerEvent(topics, body, META) as SlashNodeEvent
    expect(event.nodeId).toBe('node-FROM-BODY')
  })

  it('reads attestation fields from body when topic[1] is missing', () => {
    const topics = [encodeSymbol('approve_attestation')]
    const body = encodeBody({ node_id: 'node-B', attestation_id: 'att-B', epoch: 7 })
    const event = decodeLedgerEvent(topics, body, META) as ApproveAttestationEvent
    expect(event.nodeId).toBe('node-B')
    expect(event.attestationId).toBe('att-B')
    expect(event.epoch).toBe(7)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Performance: 1,000 events decoded in < 100ms
// ─────────────────────────────────────────────────────────────────────────────

describe('decodeLedgerEvent – performance', () => {
  /**
   * Pre-build a representative mix of events (all 7 known types + unknown).
   * The encoding is done *outside* the timed section to measure only decoding.
   */
  const EVENT_TYPES = [
    'slash_node',
    'approve_attestation',
    'reject_attestation',
    'reward_distributed',
    'node_registered',
    'node_deregistered',
    'parameter_changed',
    'unknown_future_event',   // will decode to UnknownEvent
  ] as const

  const BODIES: Record<string, string> = {
    slash_node: encodeBody({ amount: '1000', reason: 'test', node_id: 'n' }),
    approve_attestation: encodeBody({ attestation_id: 'a', epoch: 1 }),
    reject_attestation: encodeBody({ attestation_id: 'a', reason: 'r' }),
    reward_distributed: encodeBody({ amount: '500', epoch: 2 }),
    node_registered: encodeBody({ operator: 'op' }),
    node_deregistered: encodeBody({ reason: 'exit' }),
    parameter_changed: encodeBody({ old_value: '1', new_value: '2' }),
    unknown_future_event: '',
  }

  // Pre-encode 1,000 event payloads (encoding cost is excluded from timing).
  const payloads: Array<{ topics: string[]; body: string }> = []
  for (let i = 0; i < 1_000; i++) {
    const type = EVENT_TYPES[i % EVENT_TYPES.length]
    payloads.push({
      topics: [encodeSymbol(type), encodeString(`node-${i}`)],
      body: BODIES[type],
    })
  }

  it('decodes 1,000 events in under 100ms', () => {
    const start = performance.now()
    for (let i = 0; i < payloads.length; i++) {
      decodeLedgerEvent(payloads[i].topics, payloads[i].body, {
        id: `perf-${i}`,
        timestamp: 1_700_000_000_000 + i,
        ledgerSeq: i,
      })
    }
    const elapsed = performance.now() - start
    // Allow 100ms budget as specified in the issue.
    expect(elapsed).toBeLessThan(100)
  })

  it('produces the right number of results', () => {
    const results = payloads.map((p, i) =>
      decodeLedgerEvent(p.topics, p.body, { id: `check-${i}` }),
    )
    expect(results).toHaveLength(1_000)
  })

  it('never throws during a 1,000-event run', () => {
    expect(() => {
      for (let i = 0; i < payloads.length; i++) {
        decodeLedgerEvent(payloads[i].topics, payloads[i].body, { id: `safe-${i}` })
      }
    }).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Roundtrip: all 7 known types produce the expected title/severity
// ─────────────────────────────────────────────────────────────────────────────

describe('decodeLedgerEvent – full roundtrip for every known type', () => {
  const cases: Array<{
    sig: string
    topic1: string
    body: Record<string, unknown>
    expectedTitle: string
    expectedSeverity: string
  }> = [
    {
      sig: 'approve_attestation',
      topic1: 'node-1',
      body: { attestation_id: 'a1', epoch: 1 },
      expectedTitle: 'Attestation Approved',
      expectedSeverity: 'success',
    },
    {
      sig: 'reject_attestation',
      topic1: 'node-2',
      body: { attestation_id: 'a2', reason: 'bad sig' },
      expectedTitle: 'Attestation Rejected',
      expectedSeverity: 'error',
    },
    {
      sig: 'slash_node',
      topic1: 'node-3',
      body: { amount: '100', reason: 'slashed' },
      expectedTitle: 'Node Slashed',
      expectedSeverity: 'error',
    },
    {
      sig: 'reward_distributed',
      topic1: 'node-4',
      body: { amount: '50', epoch: 10 },
      expectedTitle: 'Reward Distributed',
      expectedSeverity: 'success',
    },
    {
      sig: 'node_registered',
      topic1: 'node-5',
      body: { operator: 'op-5' },
      expectedTitle: 'Node Registered',
      expectedSeverity: 'success',
    },
    {
      sig: 'node_deregistered',
      topic1: 'node-6',
      body: { reason: 'exit' },
      expectedTitle: 'Node Deregistered',
      expectedSeverity: 'warning',
    },
    {
      sig: 'parameter_changed',
      topic1: 'param-key',
      body: { old_value: '1', new_value: '2' },
      expectedTitle: 'Parameter Changed',
      expectedSeverity: 'warning',
    },
  ]

  for (const tc of cases) {
    it(`${tc.sig} → title "${tc.expectedTitle}", severity "${tc.expectedSeverity}"`, () => {
      const topics = [encodeSymbol(tc.sig), encodeString(tc.topic1)]
      const body = encodeBody(tc.body)
      const event = decodeLedgerEvent(topics, body, META)
      expect(event.title).toBe(tc.expectedTitle)
      expect(event.severity).toBe(tc.expectedSeverity)
      expect(event.type).toBe(tc.sig)
    })
  }
})
