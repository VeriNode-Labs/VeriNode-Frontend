export async function generateFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function shortenAddress(address: string, keep = 4): string {
  if (!address) return "";
  if (address.length <= keep * 2 + 3) return address;
  return `${address.slice(0, keep + 2)}…${address.slice(-keep)}`;
}

export function nodeIdFromBlindId(blindId: string): string {
  if (!blindId) return "000";
  const value = Number.parseInt(blindId.slice(0, 8), 16) || 0;
  return String(value % 1000).padStart(3, "0");
}