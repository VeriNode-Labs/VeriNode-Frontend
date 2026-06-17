const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const SESSION_STORAGE_KEY = 'verinode_encryption_key';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getSubtle(): SubtleCrypto {
  return crypto.subtle;
}

export async function deriveEncryptionKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const pinBuffer = new TextEncoder().encode(pin);
  const keyMaterial = await getSubtle().importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return getSubtle().deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function initializeEncryption(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveEncryptionKey(pin, salt);
  const exportedRaw = await getSubtle().exportKey('raw', key);
  const exportedBytes = new Uint8Array(exportedRaw);
  const combined = new Uint8Array(SALT_LENGTH + exportedBytes.length);
  combined.set(salt, 0);
  combined.set(exportedBytes, SALT_LENGTH);
  sessionStorage.setItem(SESSION_STORAGE_KEY, arrayBufferToBase64(combined.buffer));
}

export function hasEncryptionKey(): boolean {
  return sessionStorage.getItem(SESSION_STORAGE_KEY) !== null;
}

export function clearEncryptionKey(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

async function loadEncryptionKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) {
    throw new Error('Encryption key not initialized. Call initializeEncryption first.');
  }
  const combined = new Uint8Array(base64ToArrayBuffer(stored));
  const rawKey = combined.slice(SALT_LENGTH);
  return getSubtle().importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await loadEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await getSubtle().encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    data
  );
  const ivArray = new Uint8Array(iv);
  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(IV_LENGTH + encryptedArray.length);
  combined.set(ivArray, 0);
  combined.set(encryptedArray, IV_LENGTH);
  return combined.buffer as ArrayBuffer;
}

export async function decrypt(data: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await loadEncryptionKey();
  const combined = new Uint8Array(data);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  return getSubtle().decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );
}
