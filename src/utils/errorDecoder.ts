/**
 * Human-Readable Error Decoder for Stellar Horizon & Soroban RPC Node Exceptions
 * VeriNode Protocol - Issue #180
 */

export type ErrorCategory = 'balance' | 'auth' | 'network' | 'contract' | 'wallet';
export type ErrorSeverity = 'info' | 'warning' | 'error';

export interface ErrorDefinition {
  pattern: RegExp | string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  humanTitle: string;
  humanDescription: string | ((matches: RegExpMatchArray, rawText: string) => string);
  troubleshootingSteps: string[];
  docsUrl?: string;
}

export interface DecodedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  humanTitle: string;
  humanDescription: string;
  troubleshootingSteps: string[];
  docsUrl?: string;
  rawCode: string;
  rawMessage: string;
  isRecognized: boolean;
  timestamp: number;
}

/**
 * Single source of truth error catalog mapping low-level codes to human guidance.
 */
export const ERROR_CATALOG: ErrorDefinition[] = [
  // ─── Transaction Level Codes (tx_*) ─────────────────────────────────────────
  {
    pattern: /tx_bad_seq/i,
    category: 'auth',
    severity: 'warning',
    humanTitle: 'Sequence Number Mismatch',
    humanDescription:
      "Your account's transaction sequence has moved ahead of the submitted transaction. This frequently happens if another transaction was processed simultaneously.",
    troubleshootingSteps: [
      'Refresh your browser or dashboard to re-sync your account sequence number.',
      'Ensure you do not have another pending transaction submitted from this wallet.',
      'Re-submit the transaction.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/fundamentals/transactions/operations-and-transactions#sequence-number',
  },
  {
    pattern: /tx_underfunded|op_underfunded|tx_insufficient_balance/i,
    category: 'balance',
    severity: 'error',
    humanTitle: 'Insufficient Account Balance',
    humanDescription:
      'The source account does not possess sufficient balance (or available reserve) to satisfy the operation amount plus minimum reserve requirements.',
    troubleshootingSteps: [
      'Check your wallet balance and ensure you have enough XLM to meet the base reserve (minimum 1 XLM + 0.5 XLM per trustline/entry).',
      'Deposit additional XLM or token assets into your account.',
      'Reduce the transaction amount and try again.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#minimum-account-balance',
  },
  {
    pattern: /tx_insufficient_fee/i,
    category: 'balance',
    severity: 'warning',
    humanTitle: 'Transaction Fee Too Low',
    humanDescription:
      'The transaction fee offered is below the current network surge fee minimum required for ledger inclusion.',
    troubleshootingSteps: [
      'Increase the maximum fee in your wallet or transaction settings (e.g. 10,000 stroops / 0.001 XLM).',
      'Wait a few seconds for network surge congestion to subside and re-submit.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/fundamentals/fees-metering',
  },
  {
    pattern: /tx_too_early/i,
    category: 'network',
    severity: 'warning',
    humanTitle: 'Transaction Submitted Too Early',
    humanDescription:
      'The transaction has a time-bounds minimum ledger timestamp that is in the future relative to the network ledger time.',
    troubleshootingSteps: [
      'Check your system clock to ensure accurate time synchronization.',
      'Wait for the transaction validity time window to begin, then re-submit.',
    ],
  },
  {
    pattern: /tx_too_late/i,
    category: 'network',
    severity: 'warning',
    humanTitle: 'Transaction Expired',
    humanDescription:
      'The transaction reached the network after its maximum time-bounds expiration timestamp had already elapsed.',
    troubleshootingSteps: [
      'Re-sign and submit a fresh transaction with an updated expiration window.',
      'Ensure your internet connection is stable so transactions submit promptly after signing.',
    ],
  },
  {
    pattern: /tx_missing_operation/i,
    category: 'contract',
    severity: 'error',
    humanTitle: 'Empty Transaction Payload',
    humanDescription: 'The submitted transaction container contained zero operations.',
    troubleshootingSteps: [
      'Ensure the action is properly configured before submitting.',
      'Contact support if this occurred via automated UI flows.',
    ],
  },
  {
    pattern: /tx_bad_auth_extra/i,
    category: 'auth',
    severity: 'error',
    humanTitle: 'Unnecessary Extra Signatures',
    humanDescription: 'The transaction contained redundant signatures that do not correspond to any valid signer on the account.',
    troubleshootingSteps: ['Clear cached transaction signatures in your wallet and re-sign.'],
  },
  {
    pattern: /tx_bad_auth|op_bad_auth|op_not_authorized/i,
    category: 'auth',
    severity: 'error',
    humanTitle: 'Unauthorized Signer / Bad Signature',
    humanDescription:
      'The signature attached to this transaction is invalid or does not have sufficient signing weight for the source account or contract.',
    troubleshootingSteps: [
      'Ensure you are connected with the correct wallet keypair that owns or is authorized on this account.',
      'For multisig accounts, ensure all required co-signers have signed the envelope.',
      'Re-connect your wallet and sign the transaction again.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#multisig',
  },
  {
    pattern: /tx_no_source_account/i,
    category: 'auth',
    severity: 'error',
    humanTitle: 'Account Not Found on Network',
    humanDescription:
      'The source account does not exist on the Stellar ledger. New accounts must be created and funded with at least 1 XLM before they can transact.',
    troubleshootingSteps: [
      'If using Testnet, use the Stellar Friendbot to fund your test account address.',
      'If on Mainnet, send at least 1 XLM from an existing account or exchange to initialize this wallet address.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#creating-an-account',
  },
  {
    pattern: /tx_internal_error/i,
    category: 'network',
    severity: 'error',
    humanTitle: 'Stellar Node Internal Error',
    humanDescription: 'The Stellar Core node encountered an internal failure processing the transaction envelope.',
    troubleshootingSteps: [
      'Wait a few moments and try submitting to an alternate RPC / Horizon node.',
      'Check Stellar network status for scheduled maintenance or outages.',
    ],
  },

  // ─── Operation Level Codes (op_*) ───────────────────────────────────────────
  {
    pattern: /op_no_trust/i,
    category: 'balance',
    severity: 'warning',
    humanTitle: 'Missing Asset Trustline',
    humanDescription:
      'The destination account has not established a trustline for the asset being transferred or staked.',
    troubleshootingSteps: [
      'Open your wallet and add a trustline for the asset code and issuing address.',
      'Ensure the receiving wallet has sufficient XLM reserve (0.5 XLM) to maintain the trustline.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets#trustlines',
  },
  {
    pattern: /op_line_full/i,
    category: 'balance',
    severity: 'warning',
    humanTitle: 'Asset Trustline Limit Exceeded',
    humanDescription: 'The destination trustline limit would be exceeded by this transaction amount.',
    troubleshootingSteps: ['Increase the asset trustline limit in your wallet settings or transfer a smaller amount.'],
  },
  {
    pattern: /op_no_issuer/i,
    category: 'contract',
    severity: 'error',
    humanTitle: 'Asset Issuer Does Not Exist',
    humanDescription: 'The specified asset issuer account does not exist on the ledger.',
    troubleshootingSteps: ['Verify the asset code and issuer address match official protocol contracts.'],
  },
  {
    pattern: /op_low_reserve/i,
    category: 'balance',
    severity: 'error',
    humanTitle: 'Balance Below Minimum Reserve',
    humanDescription: 'This operation would drop the account balance below the network minimum base reserve requirement.',
    troubleshootingSteps: [
      'Leave at least 1 XLM + 0.5 XLM per subentry as available reserve in your wallet.',
      'Deposit more XLM to cover subentry reserves.',
    ],
  },
  {
    pattern: /op_already_exists/i,
    category: 'contract',
    severity: 'info',
    humanTitle: 'Entity Already Exists',
    humanDescription: 'The entity, trustline, or claimable balance you attempted to create already exists on the ledger.',
    troubleshootingSteps: ['Check your existing account balances or state records.'],
  },
  {
    pattern: /op_does_not_exist/i,
    category: 'contract',
    severity: 'warning',
    humanTitle: 'Entity Not Found',
    humanDescription: 'The target offer, entry, or claimable balance does not exist on-chain or has already been consumed.',
    troubleshootingSteps: ['Refresh the page to sync current active on-chain entities.'],
  },

  // ─── Soroban Host & Contract Level Codes ────────────────────────────────────
  {
    pattern: /HostError.*ValueUnknown|ValueUnknown|ContractError\(4\)|PaymentNotFound/i,
    category: 'contract',
    severity: 'warning',
    humanTitle: 'Contract Storage Entry Not Found',
    humanDescription:
      'The requested smart contract storage key or instance entry was not found. This may indicate an uninitialized record or expired temporary state.',
    troubleshootingSteps: [
      'Verify that the staking position or round identifier is valid.',
      'If the contract state has expired TTL, trigger an instance restore or extension.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/smart-contracts/state-archival',
  },
  {
    pattern: /HostError.*StorageTtlExpired|StorageTtlExpired|InstanceExpired/i,
    category: 'contract',
    severity: 'warning',
    humanTitle: 'Smart Contract State Expired (State Archival)',
    humanDescription:
      'The contract data entry has passed its Time-To-Live (TTL) threshold and is temporarily archived by Soroban state archival.',
    troubleshootingSteps: [
      'Invoke a restoration operation to restore the contract data entry from archive.',
      'Extend the TTL of the contract instance.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/smart-contracts/state-archival',
  },
  {
    pattern: /HostError.*BudgetExceeded|BudgetExceeded|CpuLimitExceeded|MemLimitExceeded/i,
    category: 'contract',
    severity: 'error',
    humanTitle: 'Soroban Resource Budget Exceeded',
    humanDescription:
      'The smart contract execution exceeded the maximum CPU instructions or memory limits allocated for transaction simulation.',
    troubleshootingSteps: [
      'Reduce the batch size or input length in your transaction.',
      'Check if the contract logic has entered an intensive iteration loop.',
    ],
  },
  {
    pattern: /HostError.*ArithmeticOverflow|ArithmeticOverflow/i,
    category: 'contract',
    severity: 'error',
    humanTitle: 'Mathematical Arithmetic Overflow',
    humanDescription: 'The contract encountered an arithmetic overflow or underflow during balance computation.',
    troubleshootingSteps: [
      'Verify the input amount decimals and bounds.',
      'Ensure amounts do not exceed max 128-bit integer capacity.',
    ],
  },
  {
    pattern: /DuplicateSettlementRef|ContractError\(17\)/i,
    category: 'contract',
    severity: 'error',
    humanTitle: 'Duplicate Settlement Reference',
    humanDescription: 'This settlement reference has already been anchored on-chain for another transaction record.',
    troubleshootingSteps: [
      'Ensure you generate a unique settlement identifier for each transaction.',
      'Check whether this payment was already recorded.',
    ],
  },
  {
    pattern: /ContractPaused|ContractError\(12\)/i,
    category: 'contract',
    severity: 'warning',
    humanTitle: 'Smart Contract Paused',
    humanDescription: 'The smart contract is currently paused by administrators for protocol maintenance or security.',
    troubleshootingSteps: [
      'Wait for the protocol maintenance window to conclude.',
      'Check official announcements for resumption schedule.',
    ],
  },
  {
    pattern: /ContractError\((\d+)\)/i,
    category: 'contract',
    severity: 'error',
    humanTitle: 'Smart Contract Execution Reverted',
    humanDescription: (matches) =>
      `The Soroban smart contract explicitly reverted the transaction with ContractError code #${matches[1]}.`,
    troubleshootingSteps: [
      'Check the contract documentation for the specific error code mapping.',
      'Ensure all business logic preconditions are satisfied before calling.',
    ],
    docsUrl: 'https://developers.stellar.org/docs/learn/smart-contracts/errors',
  },

  // ─── Wallet & User Interaction Codes ────────────────────────────────────────
  {
    pattern: /User (?:declined|rejected)|Transaction rejected by user|User cancelled/i,
    category: 'wallet',
    severity: 'info',
    humanTitle: 'Signature Request Cancelled',
    humanDescription: 'You declined or closed the transaction approval popup in your wallet extension.',
    troubleshootingSteps: [
      'When ready, click Submit again and approve the prompt in your wallet extension.',
    ],
  },
  {
    pattern: /Wallet not connected|No wallet found|Freighter not installed/i,
    category: 'wallet',
    severity: 'warning',
    humanTitle: 'Wallet Extension Not Connected',
    humanDescription: 'No active Web3 Stellar wallet extension was detected or authorized.',
    troubleshootingSteps: [
      'Install Freighter, Lobstr, or xBull extension in your browser.',
      'Unlock your wallet extension and connect to this dashboard.',
    ],
    docsUrl: 'https://www.freighter.app/',
  },

  // ─── Network & RPC Errors ───────────────────────────────────────────────────
  {
    pattern: /504 Gateway Timeout|timeout|ECONNABORTED|ETIMEDOUT/i,
    category: 'network',
    severity: 'warning',
    humanTitle: 'RPC Node Gateway Timeout',
    humanDescription: 'The Soroban RPC node did not respond within the expected timeout duration.',
    troubleshootingSteps: [
      'Check your internet connectivity.',
      'The network may be experiencing temporary traffic spikes; please retry in a few seconds.',
    ],
  },
  {
    pattern: /429 Too Many Requests|Rate limit exceeded|rate_limit/i,
    category: 'network',
    severity: 'warning',
    humanTitle: 'RPC Rate Limit Exceeded',
    humanDescription: 'Too many requests were sent to the RPC endpoint in a short interval.',
    troubleshootingSteps: [
      'Pause for a few moments before retrying.',
      'Avoid rapid repeated clicks on transaction buttons.',
    ],
  },
  {
    pattern: /Failed to fetch|NetworkError|ECONNREFUSED/i,
    category: 'network',
    severity: 'error',
    humanTitle: 'Network Connection Lost',
    humanDescription: 'Unable to reach the Stellar RPC server. The endpoint may be offline or blocked by your network.',
    troubleshootingSteps: [
      'Check your internet connection and VPN settings.',
      'Verify if the RPC endpoint status is operational.',
    ],
  },
];

/**
 * Normalizes any raw error structure (string, Error instance, JSON-RPC response, Horizon payload)
 * into a searchable code and message string.
 */
export function extractErrorMessage(rawError: unknown): { code: string; message: string; fullText: string } {
  if (!rawError) {
    return { code: 'unknown', message: 'No error details provided', fullText: '' };
  }

  if (typeof rawError === 'string') {
    return { code: rawError.slice(0, 40), message: rawError, fullText: rawError };
  }

  let code = 'unknown';
  let message = 'An unexpected error occurred';
  const parts: string[] = [];

  if (typeof rawError === 'object' && rawError !== null) {
    const obj = rawError as Record<string, unknown>;

    if (typeof obj['code'] === 'string' || typeof obj['code'] === 'number') {
      code = String(obj['code']);
      parts.push(code);
    }
    if (typeof obj['name'] === 'string') {
      parts.push(obj['name']);
    }
    if (typeof obj['message'] === 'string') {
      message = obj['message'];
      parts.push(message);
    }

    // Horizon specific payload structure
    const response = obj['response'];
    if (typeof response === 'object' && response !== null) {
      const data = (response as Record<string, unknown>)['data'];
      if (typeof data === 'object' && data !== null) {
        const extras = (data as Record<string, unknown>)['extras'];
        if (typeof extras === 'object' && extras !== null) {
          const rc = (extras as Record<string, unknown>)['result_codes'];
          if (typeof rc === 'object' && rc !== null) {
            const rcObj = rc as Record<string, unknown>;
            if (rcObj['transaction']) parts.push(`tx:${String(rcObj['transaction'])}`);
            if (Array.isArray(rcObj['operations'])) {
              parts.push(...(rcObj['operations'] as unknown[]).map((op) => `op:${String(op)}`));
            }
          }
        }
      }
    }

    // Soroban RPC JSON-RPC response structure
    const errField = obj['error'];
    if (typeof errField === 'object' && errField !== null) {
      const errObj = errField as Record<string, unknown>;
      if (typeof errObj['message'] === 'string') {
        parts.push(errObj['message']);
      }
      if (errObj['data'] !== undefined) {
        parts.push(typeof errObj['data'] === 'string' ? errObj['data'] : JSON.stringify(errObj['data']));
      }
    }

    // Stringified fallback
    try {
      parts.push(JSON.stringify(rawError));
    } catch {
      // ignore circular json errors
    }
  }

  const fullText = parts.join(' ');
  return { code, message, fullText };
}

/**
 * Decodes any raw transaction error against the catalog in < 0.1ms.
 */
export function decodeTransactionError(rawError: unknown): DecodedError {
  const { code, message, fullText } = extractErrorMessage(rawError);
  const now = Date.now();

  for (const def of ERROR_CATALOG) {
    let matched = false;
    let matches: RegExpMatchArray | null = null;

    if (typeof def.pattern === 'string') {
      matched = fullText.toLowerCase().includes(def.pattern.toLowerCase());
    } else if (def.pattern instanceof RegExp) {
      matches = fullText.match(def.pattern);
      matched = matches !== null;
    }

    if (matched) {
      const description =
        typeof def.humanDescription === 'function'
          ? def.humanDescription(matches || ([''] as unknown as RegExpMatchArray), fullText)
          : def.humanDescription;

      return {
        category: def.category,
        severity: def.severity,
        humanTitle: def.humanTitle,
        humanDescription: description,
        troubleshootingSteps: [...def.troubleshootingSteps],
        docsUrl: def.docsUrl,
        rawCode: code,
        rawMessage: message,
        isRecognized: true,
        timestamp: now,
      };
    }
  }

  // Fallback for uncatalogued errors
  return {
    category: 'contract',
    severity: 'error',
    humanTitle: 'Unrecognized Transaction Error',
    humanDescription:
      message && message !== 'No error details provided'
        ? message
        : 'The transaction failed with an uncatalogued error response from the network.',
    troubleshootingSteps: [
      'Copy the technical error details below and check your account status.',
      'Ensure your wallet is connected and has sufficient gas balance.',
      'Contact protocol support with the copied error details.',
    ],
    rawCode: code,
    rawMessage: message,
    isRecognized: false,
    timestamp: now,
  };
}
