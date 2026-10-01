use sha2::{Digest, Sha256};

fn sha256(bytes: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher.finalize().into()
}

fn hex_encode(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

pub fn sha256_hex(input: &str) -> String {
    hex_encode(&sha256(input.as_bytes()))
}

/// Balanced SHA-256 Merkle root over telemetry entries. Odd levels complete by
/// duplicating the trailing node; an empty input signals an invalid proof set.
pub fn sha256_merkle_root(entries: &[String]) -> Result<String, String> {
    if entries.is_empty() {
        return Err("cannot compute merkle root over empty entries".to_string());
    }

    let mut level: Vec<[u8; 32]> = entries
        .iter()
        .map(|entry| sha256(entry.as_bytes()))
        .collect();

    while level.len() > 1 {
        if level.len() % 2 == 1 {
            let last = *level.last().expect("level is non-empty");
            level.push(last);
        }
        let per_pair = |pair: &[[u8; 32]]| {
            let mut hasher = Sha256::new();
            hasher.update(pair[0]);
            hasher.update(pair[1]);
            hasher.finalize().into()
        };
        level = level.chunks_exact(2).map(per_pair).collect();
    }

    Ok(hex_encode(&level[0]))
}

fn hex_decode(input: &str) -> Result<Vec<u8>, String> {
    if input.len() % 2 != 0 {
        return Err("hex string must have an even length".to_string());
    }
    input
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let hi = (pair[0] as char).to_digit(16).ok_or_else(|| "invalid hex".to_string())?;
            let lo = (pair[1] as char).to_digit(16).ok_or_else(|| "invalid hex".to_string())?;
            Ok((hi * 16 + lo) as u8)
        })
        .collect()
}

/// Ed25519 detached signature verification over a canonical message.
pub fn verify_signature(
    message: &str,
    hex_public_key: &str,
    hex_signature: &str,
) -> Result<bool, String> {
    use ed25519_dalek::{Signature, VerifyingKey};

    let public_key_bytes: [u8; 32] = hex_decode(hex_public_key)?
        .try_into()
        .map_err(|_| "public key must decode to 32 bytes".to_string())?;
    let signature_bytes: [u8; 64] = hex_decode(hex_signature)?
        .try_into()
        .map_err(|_| "signature must decode to 64 bytes".to_string())?;

    let verifying_key =
        VerifyingKey::from_bytes(&public_key_bytes).map_err(|err| err.to_string())?;
    let signature = Signature::from_bytes(&signature_bytes);
    Ok(verifying_key.verify_strict(message.as_bytes(), &signature).is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merkle_root_is_deterministic() {
        let a = sha256_merkle_root(&["one".into(), "two".into()]).unwrap();
        let b = sha256_merkle_root(&["one".into(), "two".into()]).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn merkle_root_completes_odd_levels() {
        let single = sha256_merkle_root(&["one".into()]).unwrap();
        assert_eq!(single, sha256_hex("one"));

        let odd = sha256_merkle_root(&["one".into(), "two".into(), "three".into()]).unwrap();
        let dup = sha256_merkle_root(&[
            "one".into(),
            "two".into(),
            "three".into(),
            "three".into(),
        ])
        .unwrap();
        assert_eq!(odd, dup);
    }

    #[test]
    fn merkle_root_rejects_empty() {
        assert!(sha256_merkle_root(&[]).is_err());
    }

    #[test]
    fn verify_signature_round_trip() {
        use ed25519_dalek::{Signer, SigningKey};

        let signing = SigningKey::from_bytes(&[7u8; 32]);
        let message = "cpu:0.42|sess_abc";
        let signature = signing.sign(message.as_bytes());

        let pub_hex = hex_encode(&signing.verifying_key().to_bytes());
        let sig_hex = hex_encode(&signature.to_bytes());

        assert!(verify_signature(message, &pub_hex, &sig_hex).unwrap());
        assert!(!verify_signature("tampered", &pub_hex, &sig_hex).unwrap());
    }
}