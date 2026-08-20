interface LogoutEvent {
  previousRoute: string
  walletType: string
  sessionDuration: number
  pendingTransactionsCount: number
}

export async function captureLogoutEvent(event: LogoutEvent) {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      // @ts-expect-error - @sentry/nextjs is optional, caught at runtime
      const { captureEvent } = await import("@sentry/nextjs")
      captureEvent({
        message: "Forced logout due to wallet disconnect",
        level: "warning",
        tags: { walletType: event.walletType },
        extra: event,
      })
    } catch {
      console.warn("[Sentry] @sentry/nextjs not configured; skipping event", event)
    }
  } else {
    console.info("[Sentry audit]", event)
  }
}

interface UnknownLedgerEventReport {
  /** Decoded signature symbol if it parsed, else null. */
  signature: string | null
  rawTopics: string[]
  rawBody: string
}

/**
 * Report an unrecognized Soroban contract log event so its shape can be added
 * to the decoder's lookup table. Triggered by the "Report Unknown Event" action
 * in the alert banner.
 */
export async function captureUnknownLedgerEvent(event: UnknownLedgerEventReport) {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      // @ts-expect-error - @sentry/nextjs is optional, caught at runtime
      const { captureEvent } = await import("@sentry/nextjs")
      captureEvent({
        message: "Unrecognized Soroban ledger event",
        level: "info",
        tags: { signature: event.signature ?? "unparseable" },
        extra: event,
      })
    } catch {
      console.warn("[Sentry] @sentry/nextjs not configured; skipping event", event)
    }
  } else {
    console.info("[Sentry audit] unknown ledger event", event)
  }
}

export interface TransactionFailureEvent {
  optimisticTxId: string
  action: string
  amount: number
  reason: string
}

export async function captureTransactionFailure(event: TransactionFailureEvent) {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      // @ts-expect-error - @sentry/nextjs is optional, caught at runtime
      const { captureException } = await import("@sentry/nextjs")
      captureException(new Error(`Transaction failed: ${event.reason}`), {
        tags: { action: event.action, optimisticTxId: event.optimisticTxId },
        extra: event,
      })
    } catch {
      console.warn("[Sentry] @sentry/nextjs not configured; skipping event", event)
    }
  } else {
    console.error("[Sentry audit] transaction failure", event)
  }
}
