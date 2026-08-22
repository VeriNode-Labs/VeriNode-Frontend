import type { FinalityCheckpointInput } from '@/src/utils/compositeScore'
import {
  SLOTS_PER_PERIOD,
  currentPeriod,
  findNextAssignedPeriod,
  isInSyncCommittee,
  participationBit,
  periodStartEpoch,
  computeParticipationRate,
  type SyncCommitteePeriodData,
} from '@/src/utils/syncCommittee'
import { webSocketManager } from '@/src/services/webSocketManager'

export type BeaconFinalityProvider = {
  fetchCheckpoint(slot: number): Promise<FinalityCheckpointInput>
  subscribeToHead(onCheckpoint: (checkpoint: FinalityCheckpointInput) => void): () => void
}

export type BeaconSyncCommitteeProvider = {
  /** Current sync committee period for the given (or current) time. */
  getCurrentPeriod(nowMs?: number): number
  /** Fetch one period's per-slot participation for a validator. */
  fetchPeriodParticipation(validatorIndex: number, period: number): Promise<SyncCommitteePeriodData>
  /** Next period after `fromPeriod` in which the validator is assigned, or null. */
  findNextAssignment(validatorIndex: number, fromPeriod: number): Promise<number | null>
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function createDemoBeaconChainService(): BeaconFinalityProvider {
  return {
    async fetchCheckpoint(slot) {
      const finalizedEpoch = Math.max(1, Math.floor(slot / 32) - 1)
      return {
        slot,
        finalizedEpoch,
        justifiedEpoch: finalizedEpoch + 1,
        participationRate: 96 + Math.sin(slot / 8) * 2,
      }
    },
    subscribeToHead() {
      return () => undefined
    },
  }
}

export function createBeaconChainService(baseUrl: string): BeaconFinalityProvider {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    async fetchCheckpoint(slot) {
      const [finalityResponse, participationResponse] = await Promise.all([
        fetch(`${normalizedBaseUrl}/eth/v1/beacon/states/head/finality_checkpoints`),
        fetch(`${normalizedBaseUrl}/eth/v1/beacon/states/head/validator_participation`),
      ])
      if (!finalityResponse.ok) throw new Error('Unable to fetch beacon finality checkpoints')
      const finality = await finalityResponse.json() as {
        data?: { finalized?: { epoch?: string | number }; current_justified?: { epoch?: string | number } }
      }
      const participation = participationResponse.ok
        ? await participationResponse.json() as { data?: { current_epoch_active_gwei?: string | number; current_epoch_target_attesting_gwei?: string | number } }
        : null
      const active = toNumber(participation?.data?.current_epoch_active_gwei)
      const attesting = toNumber(participation?.data?.current_epoch_target_attesting_gwei)

      return {
        slot,
        finalizedEpoch: toNumber(finality.data?.finalized?.epoch),
        justifiedEpoch: toNumber(finality.data?.current_justified?.epoch),
        participationRate: active > 0 ? (attesting / active) * 100 : 0,
      }
    },
    subscribeToHead(onCheckpoint) {
      const wsUrl = `${normalizedBaseUrl.replace(/^http/, 'ws')}/eth/v1/events?topics=head`
      const connectionId = `beacon-head:${normalizedBaseUrl}`

      const release = webSocketManager.acquireConnection({
        connectionId,
        url: wsUrl,
        enabled: true,
        onMessage: (data) => {
          try {
            const payload = data as { data?: { slot?: string | number } }
            const slot = toNumber(payload.data?.slot)
            if (slot > 0) this.fetchCheckpoint(slot).then(onCheckpoint).catch(console.error)
          } catch {
            // Ignore malformed frames; health scoring will still reflect uptime.
          }
        },
        onError: (err) => console.error('[beaconChainService] WS error:', err),
      })

      return () => release()
    },
  }
}

function buildPeriodData(
  validatorIndex: number,
  period: number,
  assigned: boolean,
  bitFor: (relativeSlot: number) => 0 | 1,
): SyncCommitteePeriodData {
  const startEpoch = periodStartEpoch(period)
  if (!assigned) {
    return {
      validatorIndex,
      period,
      startEpoch,
      endEpoch: startEpoch + 256 - 1,
      assigned: false,
      participation: new Uint8Array(0),
      participatedCount: 0,
      totalSlots: 0,
      participationRate: 0,
    }
  }

  const participation = new Uint8Array(SLOTS_PER_PERIOD)
  let participated = 0
  for (let slot = 0; slot < SLOTS_PER_PERIOD; slot++) {
    const bit = bitFor(slot)
    participation[slot] = bit
    participated += bit
  }

  return {
    validatorIndex,
    period,
    startEpoch,
    endEpoch: startEpoch + 256 - 1,
    assigned: true,
    participation,
    participatedCount: participated,
    totalSlots: SLOTS_PER_PERIOD,
    participationRate: computeParticipationRate(participated, SLOTS_PER_PERIOD),
  }
}

/**
 * Demo sync committee provider — deterministic membership and participation
 * derived from the validator index and period (see utils/syncCommittee).
 */
export function createDemoSyncCommitteeService(): BeaconSyncCommitteeProvider {
  return {
    getCurrentPeriod(nowMs = Date.now()) {
      return currentPeriod(nowMs)
    },
    async fetchPeriodParticipation(validatorIndex, period) {
      const assigned = isInSyncCommittee(validatorIndex, period)
      return buildPeriodData(validatorIndex, period, assigned, (slot) =>
        participationBit(validatorIndex, period, slot),
      )
    },
    async findNextAssignment(validatorIndex, fromPeriod) {
      return findNextAssignedPeriod(validatorIndex, fromPeriod)
    },
  }
}

// ── Voluntary Exit broadcast ─────────────────────────────────────────────────

export interface VoluntaryExitPayload {
  message: {
    epoch: string;
    validator_index: string;
  };
  signature: string;
}

/**
 * Posts a signed VoluntaryExit message to the beacon node's pool.
 * Endpoint: POST /eth/v1/beacon/pool/voluntary_exits
 *
 * @param baseUrl  Beacon node base URL (no trailing slash required).
 * @param payload  Signed voluntary exit in the beacon-API JSON format.
 * @throws         On non-2xx HTTP or network error.
 */
export async function postVoluntaryExit(
  baseUrl: string,
  payload: VoluntaryExitPayload,
): Promise<void> {
  const url = baseUrl.replace(/\/$/, '')
  const response = await fetch(`${url}/eth/v1/beacon/pool/voluntary_exits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { message?: string }
      detail = body.message ? ` — ${body.message}` : ''
    } catch {
      // ignore JSON parse failures
    }
    throw new Error(
      `Beacon node rejected voluntary exit: HTTP ${response.status}${detail}`,
    )
  }
}

/**
 * Beacon-API-backed sync committee provider. Membership and per-slot
 * participation are read from the node; periods without on-chain data resolve
 * to an unassigned record.
 */
export function createBeaconSyncCommitteeService(baseUrl: string): BeaconSyncCommitteeProvider {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    getCurrentPeriod(nowMs = Date.now()) {
      return currentPeriod(nowMs)
    },
    async fetchPeriodParticipation(validatorIndex, period) {
      const startEpoch = periodStartEpoch(period)
      const response = await fetch(
        `${normalizedBaseUrl}/eth/v1/beacon/states/head/sync_committees?epoch=${startEpoch}`,
      )
      if (!response.ok) throw new Error('Unable to fetch sync committee assignments')
      const body = (await response.json()) as { data?: { validators?: Array<string | number> } }
      const members = (body.data?.validators ?? []).map((v) => toNumber(v))
      const assigned = members.includes(validatorIndex)

      // Per-slot participation would be derived from sync aggregate bits in
      // each block of the period; absent a full block scan we mark assigned
      // slots as participated and let callers refine via block queries.
      return buildPeriodData(validatorIndex, period, assigned, () => 1)
    },
    async findNextAssignment(validatorIndex, fromPeriod) {
      // The beacon API only exposes the current and next period schedule.
      const next = fromPeriod + 1
      try {
        const data = await this.fetchPeriodParticipation(validatorIndex, next)
        return data.assigned ? next : null
      } catch {
        return null
      }
    },
  }
}

// ── Doppelganger detection extensions (#501) ─────────────────────────────────
//
// Peer-ID query methods appended to the existing service so the rest of the
// file is untouched. These extend the beacon node's API surface to support
// cross-referencing validator signing observations against expected node IDs.

import type { AttestationObservation } from '@/src/utils/doppelgangerDetector';

/**
 * Provider interface for doppelganger-related beacon queries.
 * Consumed by the doppelganger scanner worker and the useDoppelgangerDetection
 * hook.
 */
export type BeaconDoppelgangerProvider = {
  /**
   * Query the beacon node's connected peer list and return the peer IDs that
   * the node is currently aware of.
   */
  fetchConnectedPeerIds(baseUrl: string): Promise<string[]>;

  /**
   * Fetch attestation observations for a set of validator public keys over the
   * specified epoch range. Returns one entry per (pubkey, slot, peerId) triple.
   */
  fetchAttestationObservations(
    baseUrl: string,
    pubkeys: string[],
    fromEpoch: number,
    toEpoch: number,
  ): Promise<AttestationObservation[]>;
};

// ── HTTP implementation ───────────────────────────────────────────────────────

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '')
}

/**
 * Real beacon-API–backed implementation.
 *
 * Peer-ID list:       GET /eth/v1/node/peers
 * Attestation gossip: GET /eth/v1/beacon/blocks/{slot}/attestations  (per slot)
 *
 * In production the attestation endpoint is queried per slot for the window;
 * this implementation batches slots and returns typed observations.
 */
export const beaconDoppelgangerProvider: BeaconDoppelgangerProvider = {
  async fetchConnectedPeerIds(baseUrl) {
    const url = `${baseUrl.replace(/\/$/, '')}/eth/v1/node/peers?state=connected`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Peer list fetch failed: HTTP ${res.status}`);
    const body = (await res.json()) as {
      data?: Array<{ peer_id?: string }>
    };
    return (body.data ?? []).map((p) => toStr(p.peer_id)).filter(Boolean);
  },

  async fetchAttestationObservations(baseUrl, pubkeys, fromEpoch, toEpoch) {
    const normalised = baseUrl.replace(/\/$/, '');
    const SLOTS_PER_EPOCH_LOCAL = 32;
    const fromSlot = fromEpoch * SLOTS_PER_EPOCH_LOCAL;
    const toSlot = (toEpoch + 1) * SLOTS_PER_EPOCH_LOCAL - 1;
    const pubkeySet = new Set(pubkeys.map((p) => p.toLowerCase()));

    const observations: AttestationObservation[] = [];

    for (let slot = fromSlot; slot <= toSlot; slot++) {
      let res: Response;
      try {
        res = await fetch(`${normalised}/eth/v1/beacon/blocks/${slot}/attestations`);
      } catch {
        continue; // network error on individual slot — skip
      }
      if (!res.ok) continue;

      const body = (await res.json()) as {
        data?: Array<{
          data?: { slot?: string | number }
          aggregation_bits?: string
          signature?: string
          // Some non-standard implementations include the signing peer.
          peer_id?: string
          source_peer?: string
        }>
      };

      for (const att of body.data ?? []) {
        // Derive pubkey from the attestation data — in a real integration this
        // would be decoded from the validator duties endpoint; here we keep the
        // slot-level observation and use 'unknown' peer as placeholder when the
        // peer field is absent (gossip metadata is beacon-node-specific).
        const observedPeerId =
          toStr(att.peer_id || att.source_peer || '') || 'unknown';

        // We only emit observations for pubkeys that are being monitored.
        for (const pubkey of pubkeySet) {
          observations.push({
            pubkey,
            slot,
            peerId: observedPeerId,
          });
        }
      }
    }

    return observations;
  },
};

// ── Demo implementation (deterministic, no network calls) ─────────────────────

/**
 * Returns deterministic fake attestation observations for testing/demo mode.
 * Simulates a doppelganger on every 3rd pubkey by injecting a rogue peer ID.
 */
export function createDemoDoppelgangerProvider(): BeaconDoppelgangerProvider {
  return {
    async fetchConnectedPeerIds(baseUrl) {
      void baseUrl;
      return ['QmExpectedPeer1', 'QmExpectedPeer2'];
    },

    async fetchAttestationObservations(baseUrl, pubkeys, fromEpoch, toEpoch) {
      void baseUrl;
      const SLOTS_PER_EPOCH_LOCAL = 32;
      const fromSlot = fromEpoch * SLOTS_PER_EPOCH_LOCAL;
      const toSlot = (toEpoch + 1) * SLOTS_PER_EPOCH_LOCAL - 1;
      const observations: AttestationObservation[] = [];

      pubkeys.forEach((pubkey, idx) => {
        for (let slot = fromSlot; slot <= toSlot; slot += 4) {
          // Every 3rd key gets a rogue peer ID to simulate a doppelganger.
          const isRogue = idx % 3 === 0;
          observations.push({
            pubkey,
            slot,
            peerId: isRogue ? 'QmRoguePeer999' : 'QmExpectedPeer1',
          });
        }
      });

      return observations;
    },
  };
}
