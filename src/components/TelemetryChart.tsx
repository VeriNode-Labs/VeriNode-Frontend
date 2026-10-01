import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TelemetryDatum } from "../lib/types";

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().slice(11, 16) + "Z";
}

export default function TelemetryChart({ data }: { data: TelemetryDatum[] }) {
  const rows = data.map((d) => ({ ...d, label: formatTimestamp(d.ts) }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Ingestion Throughput</h2>
        <span className="text-xs text-zinc-500">last 24h</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ left: -18, right: 8, top: 4 }}>
            <defs>
              <linearGradient id="verifierFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#d4d4d8" }}
            />
            <Area
              type="monotone"
              dataKey="verifier"
              name="verifier"
              stroke="#34d399"
              fill="url(#verifierFill)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="node"
              name="node"
              stroke="#38bdf8"
              fill="transparent"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}