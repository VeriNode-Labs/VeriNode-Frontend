import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlashingIndex, SLASHING_INDEX_DEBOUNCE_MS } from '../slashingIndex'
import type { SlashingEvent } from '@/src/types/slashing'

describe('SlashingIndex', () => {
  afterEach(() => vi.useRealTimers())

  it('coalesces 10 concurrent events into one accurate index', async () => {
    vi.useFakeTimers()
    const index = new SlashingIndex()
    const events = Array.from({ length: 10 }, (_, number) => createEvent(number))

    events.forEach((_, number) => index.enqueue(events.slice(0, number + 1)))
    await vi.advanceTimersByTimeAsync(SLASHING_INDEX_DEBOUNCE_MS)

    expect(index.search('*')).toHaveLength(10)
    expect(index.search('node-9').map(({ event }) => event.id)).toEqual(['event-9'])
    expect(new Set(index.search('*').map(({ event }) => event.id)).size).toBe(10)
    index.dispose()
  })
})

function createEvent(number: number): SlashingEvent {
  return {
    id: `event-${number}`,
    nodeId: `node-${number}`,
    timestamp: number,
    amount: 1,
    slot: number,
    epoch: number,
    seq: number,
    reason: `mass slashing batch ${number}`,
  }
}
