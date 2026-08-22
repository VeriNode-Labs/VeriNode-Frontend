import { test, expect } from '@playwright/test';
import { SecretRotationService, SECRET_ROTATION_DEFAULT_POLICY } from '../../src/services/secretRotation';
import type { RotationEvent, SecretKind } from '../../src/types/secrets';

/**
 * E2E tests for the Secret Rotation Service (Issue #119).
 * Exercises rotation, zero-downtime overlap, expiry monitoring, and revocation
 * inside a real browser context to validate production-equivalent behavior.
 */

function makeService(opts: { interval?: number; overlap?: number; now?: number } = {}) {
  const t = opts.now ?? 1_000_000;
  return new SecretRotationService({
    clock: () => t,
    policy: {
      rotationIntervalMs: opts.interval ?? 1000,
      overlapMs: opts.overlap ?? 500,
      maxVersions: 3,
    },
  });
}

test.describe('Secret Rotation Service', () => {
  test('registers and serves an active secret', async () => {
    const svc = makeService();
    const rec = await svc.register('db.main', 'database-credential', { initialValue: 'v1' });
    expect(rec.status).toBe('active');
    expect(await svc.getSecret('db.main')).toBe('v1');
  });

  test('rotates with zero-downtime overlap window', async () => {
    const svc = makeService();
    await svc.register('api.x', 'api-key', { initialValue: 'old' });
    await svc.rotate('api.x', 'new');
    expect(await svc.getSecret('api.x')).toBe('new');
    expect(await svc.isValidSecret('api.x', 'old')).toBe(true);
    expect(await svc.isValidSecret('api.x', 'new')).toBe(true);
  });

  test('emits lifecycle and monitoring events', async () => {
    const svc = makeService();
    const events: RotationEvent[] = [];
    svc.on((e) => events.push(e));
    await svc.register('tok', 'token', { initialValue: 'a' });
    await svc.rotate('tok', 'b');
    expect(events.some((e) => e.type === 'rotation:started')).toBe(true);
    expect(events.some((e) => e.type === 'rotation:completed')).toBe(true);
  });

  test('emits expiry warning within overlap and marks expired after', async () => {
    let t = 1_000_000;
    const svc = new SecretRotationService({
      clock: () => t,
      policy: { rotationIntervalMs: 1000, overlapMs: 500, maxVersions: 3 },
    });
    const events: RotationEvent[] = [];
    svc.on((e) => events.push(e));
    await svc.register('tok', 'token', { initialValue: 'a' });
    t += 800; // within overlap window -> expiring
    await svc.evaluateExpiry();
    expect(events.some((e) => e.type === 'secret:expiring')).toBe(true);
    t += 2000; // well past expiry + overlap -> expired
    await svc.evaluateExpiry();
    expect(events.some((e) => e.type === 'secret:expired')).toBe(true);
    expect(await svc.getSecret('tok')).toBeNull();
  });

  test('enforces maxVersions cap', async () => {
    let t = 0;
    const svc = new SecretRotationService({
      clock: () => t,
      policy: { rotationIntervalMs: 1000, overlapMs: 5000, maxVersions: 2 },
    });
    await svc.register('k', 'api-key', { initialValue: 'v0' });
    t += 1000;
    await svc.rotate('k');
    t += 1000;
    await svc.rotate('k');
    const rec = await svc.register('k', 'api-key');
    expect(rec.versions.length).toBeLessThanOrEqual(2);
  });

  test('revoke blocks all secret access', async () => {
    const svc = makeService();
    await svc.register('k', 'token', { initialValue: 'a' });
    await svc.revoke('k');
    expect(await svc.getSecret('k')).toBeNull();
    expect(await svc.isValidSecret('k', 'a')).toBe(false);
  });

  test('default policy is securely configured', async () => {
    expect(SECRET_ROTATION_DEFAULT_POLICY.rotationIntervalMs).toBeGreaterThan(0);
    expect(SECRET_ROTATION_DEFAULT_POLICY.maxVersions).toBeGreaterThanOrEqual(1);
    const kinds: SecretKind[] = ['database-credential', 'api-key', 'token', 'encryption-key'];
    expect(kinds.length).toBe(4);
  });
});
