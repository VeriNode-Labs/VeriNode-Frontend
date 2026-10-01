import { ShieldCheck, Globe2, Activity, Gauge } from "lucide-react";
import type { Metric } from "../lib/types";

const ICONS = [ShieldCheck, Globe2, Activity, Gauge];

export default function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <div
            key={metric.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {metric.label}
              </span>
              <Icon className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            <p
              className={
                metric.delta.startsWith("+")
                  ? "text-xs text-emerald-400"
                  : "text-xs text-sky-400"
              }
            >
              {metric.delta}
            </p>
          </div>
        );
      })}
    </div>
  );
}