import { SecretRotationService } from '../services/secretRotation';
import type { SecretKind } from '../types/secrets';

const SECRET_KINDS: SecretKind[] = [
  'database-credential',
  'api-key',
  'token',
  'encryption-key',
];

function generateSecrets(count: number): Array<{ key: string; kind: SecretKind }> {
  const out: Array<{ key: string; kind: SecretKind }> = [];
  for (let i = 0; i < count; i++) {
    out.push({ key: `secret.${i}`, kind: SECRET_KINDS[i % SECRET_KINDS.length] });
  }
  return out;
}

export async function runBenchmark(): Promise<void> {
  const ROUNDS = 2000;
  const secrets = generateSecrets(50);
  const svc = new SecretRotationService({
    policy: { rotationIntervalMs: 86_400_000, maxVersions: 3, overlapMs: 3_600_000 },
  });

  for (const s of secrets) {
    await svc.register(s.key, s.kind, { initialValue: `v0-${s.key}` });
  }

  const latencies: number[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const target = secrets[i % secrets.length];
    const start = performance.now();
    await svc.rotate(target.key, `v${i}-${target.key}`);
    await svc.getSecret(target.key);
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const max = latencies[latencies.length - 1];

  console.log('=== SecretRotationService Benchmark ===');
  console.log(`Rounds: ${ROUNDS}`);
  console.log(`P50: ${p50.toFixed(4)}ms`);
  console.log(`P95: ${p95.toFixed(4)}ms`);
  console.log(`P99: ${p99.toFixed(4)}ms`);
  console.log(`Max: ${max.toFixed(4)}ms`);

  const passed = p99 < 100;
  console.log(`\nP99 < 100ms target: ${passed ? 'PASS' : 'FAIL'} (${p99.toFixed(4)}ms)`);
  console.log(`Throughput: ${(ROUNDS / (latencies.reduce((a, b) => a + b, 0) / 1000)).toFixed(0)} ops/sec`);

  if (!passed) throw new Error(`P99 latency ${p99.toFixed(4)}ms exceeds 100ms target`);
}

if (
  typeof window !== 'undefined' &&
  typeof (globalThis as Record<string, unknown>).__BENCHMARK_RUN !== 'undefined'
) {
  try {
    runBenchmark();
    console.log('SecretRotation benchmark completed successfully.');
  } catch (err) {
    console.error('SecretRotation benchmark failed:', err);
  }
}

export { SecretRotationService };
