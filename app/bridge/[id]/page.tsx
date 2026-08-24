import { BridgeTransactionDetail } from '@/src/components/bridge/BridgeTransactionDetail'

export default async function BridgeTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-4 py-8" aria-label="Bridge transaction detail">
      <h1 className="mb-6 text-2xl font-bold text-white">Bridge Transaction</h1>
      <BridgeTransactionDetail id={id} />
    </main>
  )
}
