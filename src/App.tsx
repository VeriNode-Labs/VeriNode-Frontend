import MetricCards from "./components/MetricCards";
import TelemetryChart from "./components/TelemetryChart";
import ProofGenerator from "./components/ProofGenerator";
import AuditLog from "./components/AuditLog";
import type { Metric, TelemetryDatum, ProofRecord } from "./lib/types";

const metrics: Metric[] = [
  { label: "Packets Ingested", value: "128,402", delta: "+12.4%" },
  { label: "Proofs Anchored", value: "1,486", delta: "+3.1%" },
  { label: "Active Nodes", value: "64", delta: "+2" },
  { label: "Avg Verify Latency", value: "41ms", delta: "-8ms" },
];

const telemetry: TelemetryDatum[] = Array.from({ length: 24 }, (_, i) => {
  const ts = Date.UTC(2026, 0, 1, i, 0, 0);
  const base = 1200 + i * 14;
  return {
    ts,
    verifier: base + Math.round(Math.sin(i * 0.7) * 40),
    node: base - 300 + Math.round(Math.cos(i * 0.9) * 30),
  };
});

const proofs: ProofRecord[] = [
  {
    proof_hash: "0x4f3a…c219",
    session_id: "sess_8812",
    node_id: "GABQ…HGPC",
    signed_at: "2026-01-01T08:12:00Z",
  },
  {
    proof_hash: "0x9bc2…11da",
    session_id: "sess_8811",
    node_id: "GC4K…3UVQ",
    signed_at: "2026-01-01T07:58:00Z",
  },
  {
    proof_hash: "0x1e77…ff04",
    session_id: "sess_8809",
    node_id: "GD3P…8KZT",
    signed_at: "2026-01-01T07:41:00Z",
  },
];

export default function App() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">VeriNode Analytics</h1>
          <p className="text-sm text-zinc-400">
            State optimized telemetry verification &amp; proof anchoring.
          </p>
        </div>
      </header>
      <MetricCards metrics={metrics} />
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TelemetryChart data={telemetry} />
        </div>
        <ProofGenerator />
      </section>
      <AuditLog records={proofs} />
    </main>
  );
}