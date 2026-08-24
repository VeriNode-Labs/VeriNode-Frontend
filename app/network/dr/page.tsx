import { DisasterRecoveryDashboard } from '@/components/disaster-recovery/DisasterRecoveryDashboard'

export default function DisasterRecoveryPage() {
  return (
    <main id="main-content" className="min-h-screen bg-slate-50 p-6 md:p-10" aria-label="Disaster recovery dashboard">
      <div className="mx-auto max-w-6xl">
        <DisasterRecoveryDashboard />
      </div>
    </main>
  )
}
