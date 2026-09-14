import {
  Address,
  BASE_FEE,
  Contract,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { hexToUint8Array } from "@/services/crypto";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
export const LUMINA_CONTRACT_ID = process.env.NEXT_PUBLIC_LUMINA_CONTRACT_ID ?? "";

export function hasContractConfig(): boolean {
  return LUMINA_CONTRACT_ID.length > 0;
}

let serverInstance: rpc.Server | null = null;

export function getRpcServer(): rpc.Server {
  if (!serverInstance) {
    serverInstance = new rpc.Server(RPC_URL, {
      allowHttp: RPC_URL.startsWith("http://"),
    });
  }
  return serverInstance;
}

export class LuminaRpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LuminaRpcError";
  }
}

function requireContract() {
  if (!hasContractConfig()) {
    throw new LuminaRpcError(
      "Lumina contract not configured — set NEXT_PUBLIC_LUMINA_CONTRACT_ID in .env.local",
    );
  }
  return new Contract(LUMINA_CONTRACT_ID);
}

async function waitForReceipt(
  server: rpc.Server,
  hash: string,
  attempts = 12,
  intervalMs = 1500,
): Promise<rpc.Api.GetTransactionResponse> {
  for (let i = 0; i < attempts; i += 1) {
    const result = await server.getTransaction(hash);
    if (result.status === "SUCCESS") return result;
    if (result.status === "FAILED") {
      throw new LuminaRpcError("Transaction failed on-chain");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new LuminaRpcError("Timed out waiting for transaction result");
}

async function invokeContract({
  address,
  networkPassphrase,
  makeOperation,
}: {
  address: string;
  networkPassphrase: string;
  makeOperation: (contract: Contract) => ReturnType<Contract["call"]>;
}) {
  requireContract();
  const server = getRpcServer();
  const source = await server.getAccount(address);
  const transaction = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
    timebounds: {
      minTime: 0,
      maxTime: Math.floor(Date.now() / 1000) + 300,
    },
  })
    .addOperation(makeOperation(requireContract()))
    .build();

  await server.prepareTransaction(transaction);

  const signed = await signTransaction(transaction.toXDR(), { networkPassphrase });
  if (signed.error || !signed.signedTxXdr) {
    throw new LuminaRpcError(signed.error?.message ?? "Freighter rejected the signature");
  }

  const submission = await server.sendTransaction(
    new Transaction(
      xdr.TransactionEnvelope.fromXDR(signed.signedTxXdr, "base64"),
      networkPassphrase,
    ),
  );
  if (submission.status === "ERROR") {
    throw new LuminaRpcError("Transaction submission rejected by the network");
  }
  const receipt = await waitForReceipt(server, submission.hash);
  return { hash: submission.hash, receipt };
}

function decodeReturnValue(receipt: rpc.Api.GetTransactionResponse): string {
  if ("returnValue" in receipt && receipt.returnValue) {
    try {
      const value = scValToNative(receipt.returnValue);
      return typeof value === "bigint" ? value.toString() : String(value ?? "");
    } catch {
      return "";
    }
  }
  return "";
}

export interface RegisterAssetArgs {
  address: string;
  fingerprint: string;
  metadataUri: string;
  licensingFeeStroops: string | bigint;
  networkPassphrase?: string;
}

export async function invokeRegisterAsset(args: RegisterAssetArgs) {
  const { hash, receipt } = await invokeContract({
    address: args.address,
    networkPassphrase: args.networkPassphrase ?? NETWORK_PASSPHRASE,
    makeOperation: (contract) =>
      contract.call(
        "register_asset",
        Address.fromString(args.address).toScVal(),
        xdr.ScVal.scvBytes(hexToUint8Array(args.fingerprint)),
        nativeToScVal(args.metadataUri, { type: "string" }),
        nativeToScVal(BigInt(args.licensingFeeStroops), { type: "i128" }),
      ),
  });
  return { hash, assetId: decodeReturnValue(receipt) };
}

export interface ReleaseMilestoneArgs {
  address: string;
  escrowId: string | bigint;
  payoutStroops: string | bigint;
  networkPassphrase?: string;
}

export async function invokeReleaseMilestone(args: ReleaseMilestoneArgs) {
  return invokeContract({
    address: args.address,
    networkPassphrase: args.networkPassphrase ?? NETWORK_PASSPHRASE,
    makeOperation: (contract) =>
      contract.call(
        "release_milestone",
        nativeToScVal(BigInt(args.escrowId), { type: "u64" }),
        nativeToScVal(BigInt(args.payoutStroops), { type: "i128" }),
      ),
  });
}