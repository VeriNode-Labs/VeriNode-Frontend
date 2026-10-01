mod analytics;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Meta {
    node_id: String,
    session_id: String,
    timestamp: u64,
    merkle_root: String,
    anchor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProofReceipt {
    merkle_root: String,
    meta: Meta,
    anchor: String,
}

/// Balanced SHA-256 Merkle root over a telemetry batch.
#[tauri::command]
fn sha256_merkle_root(entries: Vec<String>) -> Result<String, String> {
    analytics::sha256_merkle_root(&entries)
}

/// Ed25519 detached signature verification over a canonical message.
#[tauri::command]
fn verify_signature(
    message: String,
    hex_public_key: String,
    hex_signature: String,
) -> Result<bool, String> {
    analytics::verify_signature(&message, &hex_public_key, &hex_signature)
}

/// Bind a Merkle root to a workflow-proof `Meta` by computing the SHA-256
/// digest of its canonical serialization and storing it as `meta.anchor`.
#[tauri::command]
fn anchor_workflow_proof(
    merkle_root: String,
    node_id: String,
    session_id: String,
    timestamp: u64,
) -> Result<ProofReceipt, String> {
    let mut meta = Meta {
        node_id,
        session_id,
        timestamp,
        merkle_root: merkle_root.clone(),
        anchor: None,
    };
    let canonical = format!(
        "VLP1|{}|{}|{}|{}",
        meta.node_id, meta.session_id, meta.timestamp, meta.merkle_root
    );
    let anchor = analytics::sha256_hex(&canonical);
    meta.anchor = Some(anchor.clone());
    Ok(ProofReceipt {
        merkle_root,
        meta,
        anchor,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sha256_merkle_root,
            verify_signature,
            anchor_workflow_proof
        ])
        .run(tauri::generate_context!())
        .expect("error while running verinode-desktop");
}