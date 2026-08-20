import lunr from 'lunr'
import type { SlashingEvent } from '@/src/types/slashing'

export const MAX_SLASHING_INDEX_EVENTS = 1000
export const SLASHING_INDEX_DEBOUNCE_MS = 100

export interface SlashingSearchResult {
  event: SlashingEvent
  score: number
}

/**
 * Serializes index updates and only publishes fully-built generations.
 *
 * Lunr indexes are immutable after construction, so the safe equivalent of
 * differential indexing is to coalesce incoming snapshots and atomically swap
 * in one index for the newest snapshot. Searches can never observe a builder.
 */
export class SlashingIndex {
  private index = lunr(function buildEmptyIndex() {
    this.ref('id')
    this.field('nodeId')
    this.field('reason')
  })
  private eventsById = new Map<string, SlashingEvent>()
  private queuedEvents = new Map<string, SlashingEvent>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private requestId = 0
  private generation = 0
  private listeners = new Set<() => void>()

  enqueue(events: readonly SlashingEvent[]): number {
    const requestId = ++this.requestId
    this.queuedEvents = new Map(events.slice(0, MAX_SLASHING_INDEX_EVENTS).map((event) => [event.id, event]))

    if (this.timer === null) {
      this.timer = setTimeout(() => this.processQueue(), SLASHING_INDEX_DEBOUNCE_MS)
    }

    return requestId
  }

  search(query: string): SlashingSearchResult[] {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return Array.from(this.eventsById.values()).map((event) => ({ event, score: 0 }))
    if (trimmedQuery === '*') return Array.from(this.eventsById.values()).map((event) => ({ event, score: 1 }))

    try {
      const matches = this.index.query((query) => {
        lunr.tokenizer(trimmedQuery).forEach((term) => {
          query.term(term, {
            presence: lunr.Query.presence.REQUIRED,
            wildcard: lunr.Query.wildcard.TRAILING,
          })
        })
      })
      return matches.flatMap(({ ref, score }) => {
        const event = this.eventsById.get(ref)
        return event ? [{ event, score }] : []
      })
    } catch {
      return []
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.queuedEvents.clear()
    this.listeners.clear()
  }

  private processQueue(): void {
    this.timer = null
    const buildGeneration = ++this.generation
    const processedRequestId = this.requestId
    const events = Array.from(this.queuedEvents.values())

    const nextIndex = lunr(function buildIndex() {
      this.ref('id')
      this.field('nodeId')
      this.field('reason')
      events.forEach((event) => this.add({
        id: event.id,
        nodeId: event.nodeId,
        reason: event.reason ?? '',
      }))
    })

    // A future asynchronous builder cannot overwrite a newer generation.
    if (buildGeneration !== this.generation) return

    this.eventsById = new Map(events.map((event) => [event.id, event]))
    this.index = nextIndex
    this.listeners.forEach((listener) => listener())

    // Requests queued while a future asynchronous build was running are
    // drained by exactly one follow-up rebuild.
    if (this.requestId > processedRequestId && this.timer === null) {
      this.timer = setTimeout(() => this.processQueue(), SLASHING_INDEX_DEBOUNCE_MS)
    }
  }
}
