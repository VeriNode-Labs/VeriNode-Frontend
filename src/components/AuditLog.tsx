import { BookOpenText } from "lucide-react";
import type { ProofRecord } from "../lib/types";

export default function AuditLog({ records }: { records: ProofRecord[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpenText className="h-4 w-4 text-emerald-400" />
        <h2 className="text-sm font-medium text-zinc-300">Audit Trail</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
              <th className="pb-2 pr-4 font-medium">Proof Hash</th>
              <th className="pb-2 pr-4 font-medium">Session</th>
              <th className="pb-2 pr-4 font-medium">Node</th>
              <th className="pb-2 font-medium">Signed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {records.map((record) => (
              <tr key={record.proof_hash} className="text-zinc-300">
                <td className="py-2 pr-4 font-mono text-xs text-emerald-300">
                  {record.proof_hash}
                </td>
                <td className="py-2 pr-4 font-mono text-xs">{record.session_id}</td>
                <td className="py-2 pr-4 font-mono text-xs">{record.node_id}</td>
                <td className="py-2 text-xs text-zinc-500">{record.signed_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}