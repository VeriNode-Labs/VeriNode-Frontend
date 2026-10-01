export interface Metric {
  label: string;
  value: string;
  delta: string;
}

export interface TelemetryDatum {
  ts: number;
  verifier: number;
  node: number;
}

export interface ProofRecord {
  proof_hash: string;
  session_id: string;
  node_id: string;
  signed_at: string;
}

export interface ProofMeta {
  nodeId: string;
  sessionId: string;
  timestamp: number;
  merkleRoot: string;
  anchor: string | null;
}

export interface ProofReceipt {
  merkleRoot: string;
  meta: ProofMeta;
  anchor: string;
}