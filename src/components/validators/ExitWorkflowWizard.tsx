'use client';

/**
 * ExitWorkflowWizard – 3-step guided UI for voluntary validator exits.
 *
 * Step 1 – Initiate: validator selection, unsigned message display (QR + hex),
 *           cooldown timer starts.
 * Step 2 – Sign:     accepts signed blob from air-gapped cold-storage device
 *           (paste hex or QR scan via camera input).
 * Step 3 – Broadcast: final confirmation with irreversibility warning,
 *           rate-limit badge, broadcasts to beacon node.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoluntaryExit } from '@/src/hooks/useVoluntaryExit';
import { useExitStore } from '@/src/store/exitSlice';
import { encodeExitQR } from '@/src/utils/qrEncoder';

interface ExitWorkflowWizardProps {
  /** Pre-fill a specific validator index (from the validator detail toolbar). */
  defaultValidatorIndex?: number;
  /** Beacon node URL for epoch fetching and broadcasting. */
  beaconNodeUrl?: string;
  /** Operator identifier written to the audit log. */
  operatorId?: string;
  onComplete?: () => void;
  onClose?: () => void;
}

// ── Internal step helpers ────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['1. Initiate', '2. Sign', '3. Broadcast'] as const;
  return (
    <div className="mb-6 flex items-center gap-2">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? 'bg-emerald-500 text-white'
                  : active
                    ? 'bg-sky-500 text-white ring-2 ring-sky-400/40'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {done ? '✓' : n}
            </div>
            <span
              className={`text-sm font-medium ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-500'}`}
            >
              {label}
            </span>
            {i < 2 && <span className="text-slate-600">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function CooldownBadge({ seconds }: { seconds: number }) {
  const done = seconds === 0;
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
        done
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      }`}
      role="status"
      aria-live="polite"
      aria-label={done ? 'Cooldown complete' : `Cooldown: ${seconds} seconds remaining`}
    >
      <span>{done ? '✓' : '⏱'}</span>
      <span>{done ? 'Cooldown complete — broadcast enabled' : `Cooldown: ${seconds}s remaining`}</span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function ExitWorkflowWizard({
  defaultValidatorIndex,
  beaconNodeUrl,
  operatorId,
  onComplete,
  onClose,
}: ExitWorkflowWizardProps) {
  const {
    step,
    validatorIndex,
    currentEpoch,
    unsignedHexBlob,
    messageHash,
    signedBlob,
    cooldownSecondsLeft,
    cooldownComplete,
    loading,
    error,
    initiateExit,
    acceptSignedBlob,
    broadcastExit,
    abortExit,
    reset,
  } = useVoluntaryExit({ beaconNodeUrl, operatorId });

  // ── Local state ────────────────────────────────────────────────────────────
  const [validatorInput, setValidatorInput] = useState(
    defaultValidatorIndex !== undefined ? String(defaultValidatorIndex) : '',
  );
  const [signedInput, setSignedInput] = useState('');
  const [signedError, setSignedError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // ── Generate QR when blob is ready ────────────────────────────────────────
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (!unsignedHexBlob) { setQrDataUrl(null); return; }
    encodeExitQR(unsignedHexBlob)
      .then((r) => setQrDataUrl(r.dataUrl))
      .catch((err) => setQrError(err instanceof Error ? err.message : 'QR generation failed'));
  }, [unsignedHexBlob]);

  // ── Watch for broadcast done ───────────────────────────────────────────────
  useEffect(() => {
    if (step === 'done') {
      const id = setTimeout(() => setBroadcastSuccess(true), 0);
      onComplete?.();
      return () => clearTimeout(id);
    }
  }, [step, onComplete]);

  // ── Camera cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleInitiate = useCallback(async () => {
    const idx = parseInt(validatorInput, 10);
    if (!Number.isFinite(idx) || idx < 0) {
      return;
    }
    await initiateExit(idx);
  }, [validatorInput, initiateExit]);

  const handleAcceptSigned = useCallback(() => {
    setSignedError('');
    if (!signedInput.trim()) {
      setSignedError('Please paste the signed hex blob from your cold-storage device.');
      return;
    }
    acceptSignedBlob(signedInput.trim());
  }, [signedInput, acceptSignedBlob]);

  const handleBroadcast = useCallback(async () => {
    await broadcastExit();
  }, [broadcastExit]);

  const handleAbort = useCallback(async () => {
    await abortExit();
    reset();
    setValidatorInput(defaultValidatorIndex !== undefined ? String(defaultValidatorIndex) : '');
    setSignedInput('');
    setConfirmChecked(false);
    setBroadcastSuccess(false);
  }, [abortExit, reset, defaultValidatorIndex]);

  const handleCameraToggle = useCallback(async () => {
    if (cameraActive) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      setCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraError('');
    } catch {
      setCameraError('Camera not available — please paste the hex signature instead.');
    }
  }, [cameraActive]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const wizardStep: 1 | 2 | 3 =
    step === 'idle' || step === 'initiate' ? 1 : step === 'sign' ? 2 : 3;

  const isStep1Active = step === 'idle';
  const isStep2Active = step === 'initiate';
  const isStep3Active = step === 'sign' || step === 'broadcast' || step === 'done';

  // ── Aborted / done states ─────────────────────────────────────────────────
  if (step === 'aborted') {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-white">
        <p className="text-slate-400">Exit workflow cancelled.</p>
        <button
          type="button"
          onClick={() => { reset(); setValidatorInput(defaultValidatorIndex !== undefined ? String(defaultValidatorIndex) : ''); setSignedInput(''); setConfirmChecked(false); }}
          className="mt-4 rounded-xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Start again
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-3 mt-4 rounded-xl border border-white/10 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  if (broadcastSuccess) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/80 p-6 text-white">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <h3 className="text-lg font-semibold text-emerald-300">Exit broadcast successfully</h3>
        </div>
        <p className="mb-2 text-sm text-slate-300">
          Validator <span className="font-mono text-sky-300">#{validatorIndex}</span> voluntary exit
          has been submitted to the beacon chain.
        </p>
        <p className="text-sm font-semibold text-red-400">
          ⚠ This action is irreversible. The validator will begin the exit queue process.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Voluntary Exit Workflow</h2>
          <p className="mt-1 text-sm text-slate-400">
            Air-gapped cold-storage signing · 3-step guided process
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <StepIndicator current={wizardStep} />

      {/* Global error banner */}
      {error && (
        <div
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ── Step 1: Validator selection + QR display ──────────────────────── */}
      {(isStep1Active || isStep2Active) && (
        <section className="space-y-5">
          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-200">
              Step 1 — Initiate exit
            </h3>

            {isStep1Active && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="exit-validator-index"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Validator index
                  </label>
                  <input
                    id="exit-validator-index"
                    type="number"
                    min="0"
                    value={validatorInput}
                    onChange={(e) => setValidatorInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 font-mono text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none"
                    placeholder="e.g. 123456"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleInitiate}
                  disabled={loading || !validatorInput.trim()}
                  className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? 'Building message…' : 'Build unsigned exit message'}
                </button>
              </div>
            )}

            {/* Cooldown timer displayed during step 1 (after initiate) */}
            {isStep2Active && (
              <div className="space-y-5">
                <CooldownBadge seconds={cooldownSecondsLeft} />

                {/* Unsigned message details */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm">
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <Stat label="Validator index" value={`#${validatorIndex}`} mono />
                    <Stat label="Epoch" value={String(currentEpoch ?? '—')} mono />
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                      SHA-256 message hash (audit)
                    </p>
                    <p className="break-all font-mono text-xs text-slate-300">{messageHash}</p>
                  </div>
                </div>

                {/* QR code */}
                <div className="text-center">
                  {qrError ? (
                    <p className="text-sm text-red-400">{qrError}</p>
                  ) : qrDataUrl ? (
                    <div className="inline-block rounded-2xl border border-white/10 bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Data URL generated client-side */}
                      <img
                        src={qrDataUrl}
                        alt="Unsigned voluntary exit message QR code for air-gapped signing"
                        className="h-56 w-56"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Generating QR…</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Scan this QR code with your air-gapped signing device
                  </p>
                </div>

                {/* Hex blob (scrollable) */}
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Unsigned exit hex blob
                  </p>
                  <div className="max-h-24 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 px-3 py-2">
                    <code className="break-all font-mono text-xs text-sky-300">
                      {unsignedHexBlob}
                    </code>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
                  >
                    Abort
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Advance to the sign step so the operator can paste/scan their blob
                      useExitStore.getState().advanceToSign();
                    }}
                    className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
                  >
                    I have signed it → continue
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Step 2: Accept signed blob ───────────────────────────────────── */}
      {isStep3Active && step === 'sign' && (
        <section className="space-y-5">
          <h3 className="text-base font-semibold text-slate-200">
            Step 2 — Submit signed blob
          </h3>

          <p className="text-sm text-slate-400">
            Paste the 192-character hex BLS signature produced by your cold-storage device, or
            scan the signed QR code with your camera.
          </p>

          {/* Camera toggle */}
          <div>
            <button
              type="button"
              onClick={handleCameraToggle}
              className="mb-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              {cameraActive ? 'Stop camera' : '📷 Scan QR with camera'}
            </button>
            {cameraError && <p className="text-xs text-amber-400">{cameraError}</p>}
            {cameraActive && (
              <video
                ref={videoRef}
                className="mt-2 w-full max-w-xs rounded-xl border border-white/10"
                aria-label="Camera viewfinder for QR scan"
              />
            )}
          </div>

          {/* Paste hex */}
          <div>
            <label
              htmlFor="signed-blob-input"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Signed hex signature
            </label>
            <textarea
              id="signed-blob-input"
              rows={4}
              value={signedInput}
              onChange={(e) => { setSignedInput(e.target.value); setSignedError(''); }}
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 font-mono text-xs text-sky-300 placeholder-slate-600 focus:border-sky-500 focus:outline-none"
              placeholder="0x... (192 hex characters, BLS signature)"
              spellCheck={false}
              aria-describedby="signed-blob-hint"
            />
            <p id="signed-blob-hint" className="mt-1 text-xs text-slate-500">
              Format: 0x followed by 192 lowercase hex characters (96-byte BLS G2 signature)
            </p>
            {signedError && (
              <p className="mt-1 text-xs text-red-400" role="alert">{signedError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAbort}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              Abort
            </button>
            <button
              type="button"
              onClick={handleAcceptSigned}
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Validate signature →
            </button>
          </div>
        </section>
      )}

      {/* ── Step 3: Broadcast ─────────────────────────────────────────────── */}
      {isStep3Active && !!signedBlob && (step === 'broadcast' || step === 'done') && (
        <section className="space-y-5">
          <h3 className="text-base font-semibold text-slate-200">
            Step 3 — Broadcast to beacon chain
          </h3>

          {/* Cooldown badge */}
          <CooldownBadge seconds={cooldownSecondsLeft} />

          {/* Irreversibility warning */}
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-red-300">
              ⚠ This action is irreversible.
            </p>
            <p className="mt-1 text-xs text-red-400">
              Once broadcast, the validator exit cannot be undone. The validator will enter the
              exit queue and its stake will eventually be withdrawn. Ensure you have signed the
              correct exit message.
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Validator index" value={`#${validatorIndex}`} mono />
              <Stat label="Epoch" value={String(currentEpoch ?? '—')} mono />
            </div>
            <div className="mt-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Signature (BLS)</p>
              <p className="truncate font-mono text-xs text-emerald-300">{signedBlob}</p>
            </div>
          </div>

          {/* 3-step confirmation checkbox */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-800 accent-sky-500"
              aria-label="I understand this exit is irreversible"
            />
            <span className="text-sm text-slate-300">
              I confirm that I want to voluntarily exit validator{' '}
              <span className="font-mono text-sky-300">#{validatorIndex}</span>. I understand
              this is <span className="font-semibold text-red-400">irreversible</span> and the
              validator will enter the exit queue.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAbort}
              disabled={loading}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Abort
            </button>
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={!cooldownComplete || !confirmChecked || loading}
              className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              aria-describedby="broadcast-cooldown-hint"
            >
              {loading ? 'Broadcasting…' : 'Broadcast exit'}
            </button>
          </div>
          {!cooldownComplete && (
            <p id="broadcast-cooldown-hint" className="text-xs text-amber-400">
              Broadcast will be enabled after the {cooldownSecondsLeft}s cooldown completes.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// ── Small stat display helper ────────────────────────────────────────────────

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
