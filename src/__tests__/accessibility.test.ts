import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio, meetsAA, parseHex } from '@/src/utils/accessibility';

// ---------------------------------------------------------------------------
// Color contrast tests (WCAG 2.1 AA)
// ---------------------------------------------------------------------------

describe('Color contrast utilities', () => {
  describe('relativeLuminance', () => {
    it('returns 0 for pure black', () => {
      expect(relativeLuminance(0, 0, 0)).toBe(0);
    });

    it('returns 1 for pure white', () => {
      expect(relativeLuminance(255, 255, 255)).toBe(1);
    });

    it('returns correct value for mid-gray per WCAG spec', () => {
      const lum = relativeLuminance(128, 128, 128);
      expect(lum).toBeCloseTo(0.2158, 3);
    });
  });

  describe('parseHex', () => {
    it('parses 6-digit hex', () => {
      expect(parseHex('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('parses hex without hash', () => {
      expect(parseHex('000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns null for invalid hex', () => {
      expect(parseHex('xyz')).toBeNull();
    });
  });

  describe('contrastRatio', () => {
    it('returns 21 for black-on-white', () => {
      const ratio = contrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('is symmetric', () => {
      expect(contrastRatio('#000', '#fff')).toBe(contrastRatio('#fff', '#000'));
    });

    it('returns 1 for same color', () => {
      expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 0);
    });
  });

  describe('meetsAA', () => {
    it('black-on-white passes AA (4.5:1)', () => {
      expect(meetsAA('#000000', '#ffffff')).toBe(true);
    });

    it('dark-gray on black fails AA', () => {
      expect(meetsAA('#222222', '#111111')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Accessibility theme color tests
// ---------------------------------------------------------------------------

describe('Accessibility: Color theme constants', () => {
  it('light theme primary (#2563eb) has AA contrast on white', () => {
    expect(meetsAA('#2563eb', '#ffffff')).toBe(true);
  });

  it('light theme destructive (#dc2626) has AA contrast on white', () => {
    expect(meetsAA('#dc2626', '#ffffff')).toBe(true);
  });

  it('dark theme primary (#60a5fa) has AA contrast on dark (#020617)', () => {
    expect(meetsAA('#60a5fa', '#020617')).toBe(true);
  });

  it('dark theme destructive (#f87171) has AA contrast on dark (#020617)', () => {
    expect(meetsAA('#f87171', '#020617')).toBe(true);
  });
});