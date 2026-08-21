import { sendTransaction as rpcSendTransaction } from "@/src/lib/stellar/rpcClient"
import { buildStakingTransaction } from "@/src/lib/stellar/transaction"
import type { StakingAction } from "@/src/store/stakingStore"
import { decodeTransactionError } from "@/src/utils/errorDecoder"

/**
 * Staking API.
 *
 * Wraps the transaction builder + Soroban RPC client behind a small,
 * action-oriented surface. Each method builds the envelope, submits it, and
 * resolves with the real on-chain transaction hash — or throws a
 * `StakingSubmitError` carrying a decoded reason the UI can surface.
 */

export class StakingSubmitError extends Error {
  /** Stable error code from the RPC layer (e.g. 'HostError'), when available. */
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = "StakingSubmitError"
    this.code = code
  }
}

export interface SubmitResult {
  transactionHash: string
}

export interface SubmitParams {
  amount: number
  source: string
}

async function submit(
  action: StakingAction,
  { amount, source }: SubmitParams
): Promise<SubmitResult> {
  const { xdr } = buildStakingTransaction({ action, amount, source })
  const result = await rpcSendTransaction(xdr)

  if (result.status === "confirmed" || result.status === "pending") {
    return { transactionHash: result.txHash }
  }
  if (result.status === "error") {
    const decoded = decodeTransactionError(result.error)
    throw new StakingSubmitError(decoded.humanDescription, result.code || decoded.rawCode)
  }
  // network_error — surfaced as a retryable failure.
  const decodedNet = decodeTransactionError(result.error)
  throw new StakingSubmitError(decodedNet.humanDescription, "network_error")
}

export const staking = {
  submitStake: (p: SubmitParams) => submit("stake", p),
  submitUnstake: (p: SubmitParams) => submit("unstake", p),
  submitRestake: (p: SubmitParams) => submit("restake", p),
  submitDelegate: (p: SubmitParams) => submit("delegate", p),
  submitUndelegate: (p: SubmitParams) => submit("undelegate", p),
  submit,
}
