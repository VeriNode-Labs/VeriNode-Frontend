// src/types/errors.ts
export type ErrorCategory = 'balance' | 'auth' | 'network' | 'contract' | 'wallet' | 'generic';
export type ErrorSeverity = 'info' | 'warning' | 'error';

export interface ErrorDefinition {
  category: ErrorCategory;
  severity: ErrorSeverity;
  humanTitle: string;
  humanDescription: string;
  troubleshootingSteps: string[];
  docsUrl?: string;
  // For parameterized errors (e.g., extract amounts, addresses)
  paramMap?: Record<string, string>;
}

export interface DecodedError extends ErrorDefinition {
  rawError: string;
  isUnknown?: boolean;
}
