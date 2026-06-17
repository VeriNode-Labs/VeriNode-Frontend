'use client'

import { useEffect } from 'react'
import { InspectionForm } from '@/src/components/inspections/InspectionForm'
import { SyncStatusBar } from '@/src/components/SyncStatusBar'
import { syncManager } from '@/src/services/syncManager'
import { initializeEncryption, hasEncryptionKey } from '@/src/services/crypto'

const inspectionFields = [
  { label: 'Rack / Location', key: 'location', type: 'text' as const, required: true },
  { label: 'Equipment Type', key: 'equipmentType', type: 'select' as const, options: ['Server', 'Switch', 'Router', 'UPS', 'Cooling Unit', 'PDU'], required: true },
  { label: 'Status', key: 'status', type: 'select' as const, options: ['Operational', 'Warning', 'Critical', 'Offline'], required: true },
  { label: 'Temperature (°C)', key: 'temperature', type: 'number' as const },
  { label: 'Observations', key: 'observations', type: 'textarea' as const },
  { label: 'Inspector Name', key: 'inspector', type: 'text' as const },
]

export default function Home() {
  useEffect(() => {
    if (!hasEncryptionKey()) {
      initializeEncryption('default-pin-0000').catch(console.error)
    }
    syncManager.start()
    return () => syncManager.stop()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 pb-12 dark:bg-black">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Inspection Form
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          Physical node inspection — data is cached locally and synced when online.
        </p>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <InspectionForm fields={inspectionFields} />
        </div>
      </main>

      <SyncStatusBar />
    </div>
  )
}
