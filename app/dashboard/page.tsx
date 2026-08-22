'use client'

import { FleetCanvasGrid } from '@/src/components/dashboard/FleetCanvasGrid'
import { useFleetData } from '@/src/hooks/useFleetData'

export default function DashboardPage() {
  const { nodes } = useFleetData(10_000)
  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-[1920px] space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Validator fleet</h1>
          <p className="text-sm text-slate-400">All {nodes.length.toLocaleString()} validators in one operational view.</p>
        </div>
        <FleetCanvasGrid nodes={nodes} />
      </div>
    </main>
  )
}
