"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MeritMetric {
  month: string;
  payouts: number;
  registrations: number;
}

export function MeritMetricsChart({
  data,
  title = "Network-wide activity",
}: {
  data: MeritMetric[];
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-zinc-500">
          Fair-pay distributions (XLM) and verified on-chain IP registrations
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="fillPayouts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b5cf6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#5b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => (Number(value) >= 1000 ? `${Number(value) / 1000}k` : String(value))}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "#fafafa",
                fontSize: 12,
              }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(value, name) => [
                String(value),
                name === "payouts" ? "Payouts (XLM)" : "IP registrations",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
              formatter={(value) =>
                value === "payouts" ? "Fair-pay distributions (XLM)" : "Verified IP registrations"
              }
            />
            <Area
              type="monotone"
              dataKey="payouts"
              stroke="#5b5cf6"
              strokeWidth={2}
              fill="url(#fillPayouts)"
            />
            <Area
              type="monotone"
              dataKey="registrations"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#fillRegistrations)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}