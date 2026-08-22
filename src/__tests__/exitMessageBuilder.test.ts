import { describe, expect, it } from 'vitest';
import {
  encodeVoluntaryExitSSZ,
  bytesToHex,
  hexToBytes,
  buildUnsignedExitMessage,
  isValidSignatureHex,
  getVoluntaryExitDomain,
  DOMAIN_VOLUNTARY_EXIT,
  QR_MAX_PAYLOAD_BYTES,
} from '../utils/exitMessageBuilder';

describe('exitMessageBuilder', () => {
  describe('encodeVoluntaryExitSSZ', () => {
    it('produces a 16-byte buffer', () => {
      const result = encodeVoluntaryExitSSZ({ epoch: 100, validatorIndex: 42 });
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBe(16);
    });

    it('encodes epoch in the first 8 bytes as little-endian uint64', () => {
      const result = encodeVoluntaryExitSSZ({ epoch: 1, validatorIndex: 0 });
      const view = new DataView(result.buffer);
      expect(view.getBigUint64(0, true)).toBe(BigInt("1"));
    });

    it('encodes validator_index in bytes 8–15 as little-endian uint64', () => {
      const result = encodeVoluntaryExitSSZ({ epoch: 0, validatorIndex: 999 });
      const view = new DataView(result.buffer);
      expect(view.getBigUint64(8, true)).toBe(BigInt("999"));
    });

    it('encodes epoch=0 and validatorIndex=0 as all-zero bytes', () => {
      const result = encodeVoluntaryExitSSZ({ epoch: 0, validatorIndex: 0 });
      expect(result.every((b) => b === 0)).toBe(true);
    });

    it('handles large validator indices correctly', () => {
      const validatorIndex = 500_000;
      const result = encodeVoluntaryExitSSZ({ epoch: 12345, validatorIndex });
      const view = new DataView(result.buffer);
      expect(view.getBigUint64(8, true)).toBe(BigInt(validatorIndex));
    });
  });

  describe('bytesToHex / hexToBytes roundtrip', () => {
    it('converts bytes to hex string', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0xff, 0xab]);
      expect(bytesToHex(bytes)).toBe('0001ffab');
    });

    it('roundtrips hex → bytes → hex', () => {
      const original = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef]);
      const hex = bytesToHex(original);
      const recovered = hexToBytes(hex);
      expect(Array.from(recovered)).toEqual(Array.from(original));
    });

    it('hexToBytes handles 0x prefix', () => {
      const hex = '0xdeadbeef';
      const bytes = hexToBytes(hex);
      expect(bytesToHex(bytes)).toBe('deadbeef');
    });

    it('hexToBytes throws on odd-length hex string', () => {
      expect(() => hexToBytes('abc')).toThrow();
    });
  });

  describe('buildUnsignedExitMessage', () => {
    it('returns hexBlob, messageHash and sszBytes of correct lengths', async () => {
      const result = await buildUnsignedExitMessage({ epoch: 42, validatorIndex: 100 });
      // 16-byte SSZ → 32-char hex
      expect(result.hexBlob).toHaveLength(32);
      // SHA-256 → 64-char hex
      expect(result.messageHash).toHaveLength(64);
      expect(result.sszBytes.byteLength).toBe(16);
    });

    it('hexBlob matches bytesToHex of sszBytes', async () => {
      const result = await buildUnsignedExitMessage({ epoch: 1, validatorIndex: 2 });
      expect(result.hexBlob).toBe(bytesToHex(result.sszBytes));
    });

    it('produces deterministic output for the same input', async () => {
      const a = await buildUnsignedExitMessage({ epoch: 100, validatorIndex: 9999 });
      const b = await buildUnsignedExitMessage({ epoch: 100, validatorIndex: 9999 });
      expect(a.hexBlob).toBe(b.hexBlob);
      expect(a.messageHash).toBe(b.messageHash);
    });

    it('produces distinct output for different validator indices', async () => {
      const a = await buildUnsignedExitMessage({ epoch: 100, validatorIndex: 1 });
      const b = await buildUnsignedExitMessage({ epoch: 100, validatorIndex: 2 });
      expect(a.hexBlob).not.toBe(b.hexBlob);
      expect(a.messageHash).not.toBe(b.messageHash);
    });
  });

  describe('isValidSignatureHex', () => {
    const validSig = 'a'.repeat(192);
    const validSigWithPrefix = '0x' + 'b'.repeat(192);

    it('accepts a 192-char hex string without prefix', () => {
      expect(isValidSignatureHex(validSig)).toBe(true);
    });

    it('accepts a 194-char hex string with 0x prefix', () => {
      expect(isValidSignatureHex(validSigWithPrefix)).toBe(true);
    });

    it('rejects a signature that is too short', () => {
      expect(isValidSignatureHex('a'.repeat(191))).toBe(false);
    });

    it('rejects a signature that is too long', () => {
      expect(isValidSignatureHex('a'.repeat(193))).toBe(false);
    });

    it('rejects a signature with non-hex characters', () => {
      expect(isValidSignatureHex('z'.repeat(192))).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isValidSignatureHex('')).toBe(false);
    });
  });

  describe('getVoluntaryExitDomain', () => {
    it('returns the correct 4-byte domain', () => {
      const domain = getVoluntaryExitDomain();
      expect(domain).toEqual(new Uint8Array([0x04, 0x00, 0x00, 0x00]));
    });

    it('is consistent with the DOMAIN_VOLUNTARY_EXIT constant', () => {
      expect(DOMAIN_VOLUNTARY_EXIT).toBe('0x04000000');
    });
  });

  describe('QR_MAX_PAYLOAD_BYTES', () => {
    it('is 2953 (Version-40 Medium ECC byte-mode capacity)', () => {
      expect(QR_MAX_PAYLOAD_BYTES).toBe(2_953);
    });
  });
});
