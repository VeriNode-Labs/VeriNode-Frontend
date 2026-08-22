'use client';

// Doppelganger detection orchestration hook.
//
// Drives the full doppelganger scan lifecycle:
//   1. Compute the detection window (last 2 epochs).
//   2. Fetch attestation observations from the beacon service.
//   3. Dispatch the scan to the web worker in batches of 1,000 keys.
//   4. Apply maintenance-window suppression.
//   5. Deduplicate via the 24-h alertDeduplicator.
//   6. Push detected alerts into the alertSlice store.
//
// The hook is designed to be mounted once at or near the app root. It exposes
// controls for triggering manual scans and resetting state.

import { useCallback, useEffect, useRef } from 'react';
import { useAlertStore } from '@/src/store/alertSlice';
import {
  buildEventKey,
  isDuplicate,
  recordAlert,
  removeEventKey,
} from '@/src/utils/alertDeduplicator';
import { DOPPELGANGER_THRESHOLD } from '@/src/utils/doppelgangerDetector';
import type { DoppelgangerResult } from '@/src/utils/doppelgangerDetector';
import type { MonitoredKey, DoppelgangerScanRequest } from '@/src/workers/doppelgangerScannerWorker';
import type { AttestationObservation } from '@/src/utils/doppelgangerDetector';
import { currentEpoch } from '@/src/utils/epochTime';
import {
  beaconDoppelgangerProvider,
  createDemoDoppelgangerProvider,
} from '@/src/services/beaconChainService';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Number of epochs to scan backwards from the current epoch. */
const DETECTION_EPOCHS = 2;

/** Auto-scan interval in milliseconds (~12.8 min = 1 detection window). */
const SCAN_INTERVAL_MS = DETECTION_EPOCHS * 32 * 12 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseDoppelgangerDetectionOptions {
  /** Beacon node base URL. When omitted, the demo provider is used. */
  beaconNodeUrl?: string;
  /** Keys to monitor. */
  monitoredKeys: MonitoredKey[];
  /** Whether to start periodic auto-scanning. Defaults to `true`. */
  autoScan?: boolean;
}

export interface UseDoppelgangerDetectionResult {
  /** Trigger an immediate scan. Returns early if one is already running. */
  triggerScan: () => void;
  /** Stop any in-progress scan and reset the store. */
  stopScan: () => void;
  /** Acknowledge an alert by its store ID. */
  acknowledgeAlert: (id: string) => void;
  /**
   * Suppress an alert — marks it acknowledged in-store AND removes the
   * deduplication record so the key can fire again after manual reset.
   */
  suppressAlert: (id: string, pubkey: string, fromEpoch: number, toEpoch: number) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDoppelgangerDetection({
  beaconNodeUrl,
  monitoredKeys,
  autoScan = true,
}: UseDoppelgangerDetectionOptions): UseDoppelgangerDetectionResult {
  const workerRef = useRef<Worker | null>(null);
  const scanIdRef = useRef<string>('');
  const isScanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const {
    beginScan,
    updateScanProgress,
    completeScan,
    failScan,
    addAlert,
    acknowledgeAlert: storeAcknowledge,
    suppressAlert: storeSuppress,
  } = useAlertStore.getState();

  // ── Worker initialisation ──────────────────────────────────────────────────

  const getWorker = useCallback((): Worker | null => {
    if (typeof window === 'undefined') return null;
    if (workerRef.current) return workerRef.current;
    try {
      // Next.js Webpack 5 worker syntax — the worker is bundled as a separate
      // chunk. The comment is intentional and required by the bundler.
      const w = new Worker(
        new URL('../workers/doppelgangerScannerWorker.ts', import.meta.url),
      );
      workerRef.current = w;
      return w;
    } catch {
      return null;
    }
  }, []);

  // ── Core scan logic ────────────────────────────────────────────────────────

  const runScan = useCallback(async (): Promise<void> => {
    if (isScanningRef.current) return;
    if (!monitoredKeys.length) return;

    isScanningRef.current = true;

    const toEpoch = currentEpoch(Date.now());
    const fromEpoch = Math.max(0, toEpoch - DETECTION_EPOCHS + 1);
    const scanId = `scan:${fromEpoch}:${toEpoch}:${Date.now()}`;
    scanIdRef.current = scanId;

    beginScan(monitoredKeys.length);

    const provider = beaconNodeUrl
      ? beaconDoppelgangerProvider
      : createDemoDoppelgangerProvider();

    // Fetch attestation observations for all monitored pubkeys in one call.
    let observations: AttestationObservation[] = [];
    try {
      observations = await provider.fetchAttestationObservations(
        beaconNodeUrl ?? '',
        monitoredKeys.map((k) => k.pubkey),
        fromEpoch,
        toEpoch,
      );
    } catch (err) {
      isScanningRef.current = false;
      failScan(err instanceof Error ? err.message : 'Failed to fetch attestation observations');
      return;
    }

    const worker = getWorker();
    if (!worker) {
      // Fallback: run synchronously in the main thread when workers are
      // unavailable (e.g. test environment).
      const { analyseKey, filterObservationsForWindow } = await import(
        '@/src/utils/doppelgangerDetector'
      );
      const window_obs = filterObservationsForWindow(observations, fromEpoch, toEpoch);
      let processed = 0;
      for (const { pubkey, expectedNode } of monitoredKeys) {
        // Skip if node is in maintenance window (false-positive suppression).
        if (expectedNode.inMaintenanceWindow) {
          processed++;
          continue;
        }
        const keyObs = window_obs.filter((o) => o.pubkey === pubkey);
        const result = analyseKey(pubkey, keyObs, expectedNode, fromEpoch, toEpoch);
        if (result.detected) {
          const eventKey = buildEventKey(pubkey, fromEpoch, toEpoch);
          if (!isDuplicate(eventKey)) {
            recordAlert(eventKey);
            addAlert(result);
          }
        }
        processed++;
        updateScanProgress(processed);
      }
      isScanningRef.current = false;
      completeScan();
      return;
    }

    // Encode keys as ArrayBuffer for zero-copy transfer.
    // Filter out keys in maintenance windows before sending to worker;
    // the worker does not have access to maintenance state.
    const keysToScan = monitoredKeys.filter((k) => !k.expectedNode.inMaintenanceWindow);
    const encoded = new TextEncoder().encode(JSON.stringify(keysToScan));
    const keysBuffer = encoded.buffer.slice(
      encoded.byteOffset,
      encoded.byteOffset + encoded.byteLength,
    ) as ArrayBuffer;

    const req: DoppelgangerScanRequest = {
      scanId,
      keysBuffer,
      observations,
      fromEpoch,
      toEpoch,
    };

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as
        | { type: 'PROGRESS'; payload: { scanId: string; processed: number; total: number } }
        | { type: 'RESULT'; payload: { scanId: string; detected: DoppelgangerResult[]; processed: number } }
        | { type: 'ERROR'; payload: { scanId: string; message: string } };

      if (msg.payload.scanId !== scanId) return;

      switch (msg.type) {
        case 'PROGRESS':
          updateScanProgress(msg.payload.processed);
          break;

        case 'RESULT': {
          for (const result of msg.payload.detected) {
            // Re-apply maintenance-window suppression for any key that slipped
            // through (race-condition guard).
            const key = monitoredKeys.find((k) => k.pubkey === result.pubkey);
            if (key?.expectedNode.inMaintenanceWindow) continue;

            // 24-h deduplication.
            const eventKey = buildEventKey(result.pubkey, result.scannedEpochs[0], result.scannedEpochs[1]);
            if (isDuplicate(eventKey)) continue;
            recordAlert(eventKey);
            addAlert(result);
          }
          isScanningRef.current = false;
          completeScan();
          break;
        }

        case 'ERROR':
          isScanningRef.current = false;
          failScan(msg.payload.message);
          break;
      }
    };

    worker.onerror = (err) => {
      isScanningRef.current = false;
      failScan(err.message ?? 'Worker error');
    };

    // Transfer the ArrayBuffer for zero-copy delivery.
    worker.postMessage({ type: 'SCAN', payload: req }, [keysBuffer]);
  }, [
    monitoredKeys,
    beaconNodeUrl,
    beginScan,
    updateScanProgress,
    completeScan,
    failScan,
    addAlert,
    getWorker,
  ]);

  // ── Auto-scan interval ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoScan || typeof window === 'undefined') return;

    // Kick off an initial scan immediately.
    runScan();

    intervalRef.current = setInterval(() => {
      runScan();
    }, SCAN_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan]);

  // ── Worker cleanup on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Public controls ────────────────────────────────────────────────────────

  const triggerScan = useCallback(() => {
    runScan();
  }, [runScan]);

  const stopScan = useCallback(() => {
    if (workerRef.current && scanIdRef.current) {
      workerRef.current.postMessage({ type: 'ABORT', payload: { scanId: scanIdRef.current } });
    }
    isScanningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    useAlertStore.getState().reset();
  }, []);

  const acknowledgeAlert = useCallback(
    (id: string) => {
      storeAcknowledge(id);
    },
    [storeAcknowledge],
  );

  const suppressAlert = useCallback(
    (id: string, pubkey: string, fromEpoch: number, toEpoch: number) => {
      storeSuppress(id);
      // Remove the dedup record so the operator can get future alerts for this
      // key once they manually un-suppress.
      removeEventKey(buildEventKey(pubkey, fromEpoch, toEpoch));
    },
    [storeSuppress],
  );

  return { triggerScan, stopScan, acknowledgeAlert, suppressAlert };
}

// Re-export DOPPELGANGER_THRESHOLD so consumers can reference the threshold
// without importing from the detector directly.
export { DOPPELGANGER_THRESHOLD };
