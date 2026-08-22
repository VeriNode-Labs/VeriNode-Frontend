// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  flattenTranslations,
  interpolate,
  getPluralSuffix,
  resolvePluralKey,
  translate,
  readStoredLocale,
  detectBrowserLocale,
} from './utils';
import { isSupportedLocale, isRTL, getLocaleMeta } from './config';
import { seedLocaleCache, clearLocaleCache, loadLocale } from './loader';
import type { LocaleCode, TranslationDict } from './types';

// ---------------------------------------------------------------------------
// flattenTranslations
// ---------------------------------------------------------------------------
describe('flattenTranslations', () => {
  it('flattens nested objects into dot-notation keys', () => {
    const result = flattenTranslations({
      common: { loading: 'Loading…', error: 'Error' },
      nav: { dashboard: 'Dashboard' },
    });
    expect(result).toEqual({
      'common.loading': 'Loading…',
      'common.error': 'Error',
      'nav.dashboard': 'Dashboard',
    });
  });

  it('handles already-flat objects', () => {
    const result = flattenTranslations({ key: 'value' });
    expect(result).toEqual({ key: 'value' });
  });

  it('ignores non-string leaf values', () => {
    const result = flattenTranslations({ a: { b: 42 as unknown as string } });
    expect(result).toEqual({});
  });

  it('handles deeply nested objects', () => {
    const result = flattenTranslations({ a: { b: { c: 'deep' } } });
    expect(result['a.b.c']).toBe('deep');
  });
});

// ---------------------------------------------------------------------------
// interpolate
// ---------------------------------------------------------------------------
describe('interpolate', () => {
  it('replaces {{param}} placeholders', () => {
    expect(interpolate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('replaces multiple distinct placeholders', () => {
    expect(interpolate('{{a}} and {{b}}', { a: 'foo', b: 'bar' })).toBe('foo and bar');
  });

  it('leaves unknown placeholders unchanged', () => {
    expect(interpolate('{{unknown}}', {})).toBe('{{unknown}}');
  });

  it('converts numeric params to string', () => {
    expect(interpolate('Count: {{count}}', { count: 5 })).toBe('Count: 5');
  });
});

// ---------------------------------------------------------------------------
// getPluralSuffix
// ---------------------------------------------------------------------------
describe('getPluralSuffix', () => {
  it('returns "one" for 1 in en-US', () => {
    expect(getPluralSuffix(1, 'en-US')).toBe('one');
  });

  it('returns "other" for 2 in en-US', () => {
    expect(getPluralSuffix(2, 'en-US')).toBe('other');
  });

  it('returns "few" for 3 in ru-RU', () => {
    // Russian: 3 → "few"
    expect(getPluralSuffix(3, 'ru-RU')).toBe('few');
  });

  it('returns "many" for 5 in ru-RU', () => {
    expect(getPluralSuffix(5, 'ru-RU')).toBe('many');
  });
});

// ---------------------------------------------------------------------------
// resolvePluralKey
// ---------------------------------------------------------------------------
describe('resolvePluralKey', () => {
  const dict: TranslationDict = {
    'validators.count_one': '{{count}} validator',
    'validators.count_other': '{{count}} validators',
  };

  it('picks _one for count=1 in en-US', () => {
    expect(resolvePluralKey('validators.count', 1, 'en-US', dict)).toBe('validators.count_one');
  });

  it('picks _other for count=5 in en-US', () => {
    expect(resolvePluralKey('validators.count', 5, 'en-US', dict)).toBe('validators.count_other');
  });

  it('falls back to _other when specific rule is absent', () => {
    const sparseDict: TranslationDict = { 'key_other': 'other' };
    expect(resolvePluralKey('key', 1, 'en-US', sparseDict)).toBe('key_other');
  });
});

// ---------------------------------------------------------------------------
// translate
// ---------------------------------------------------------------------------
describe('translate', () => {
  const dict: TranslationDict = {
    'common.loading': 'Loading…',
    'validators.count_one': '{{count}} validator',
    'validators.count_other': '{{count}} validators',
  };

  it('returns translated string for existing key', () => {
    expect(translate('common.loading', undefined, dict, 'en-US')).toBe('Loading…');
  });

  it('interpolates params', () => {
    expect(translate('validators.count', { count: 1 }, dict, 'en-US')).toBe('1 validator');
    expect(translate('validators.count', { count: 3 }, dict, 'en-US')).toBe('3 validators');
  });

  it('returns last key segment as fallback for missing keys', () => {
    const result = translate('missing.key', undefined, {}, 'en-US');
    expect(result).toBe('key');
  });

  it('warns in development for missing keys', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    translate('missing.key', undefined, {}, 'en-US');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('missing.key'));
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// isSupportedLocale
// ---------------------------------------------------------------------------
describe('isSupportedLocale', () => {
  it('accepts all supported locale codes', () => {
    const codes: LocaleCode[] = ['en-US', 'zh-CN', 'ja-JP', 'ko-KR', 'ru-RU', 'ar-SA', 'es-ES', 'fr-FR', 'de-DE'];
    for (const code of codes) {
      expect(isSupportedLocale(code)).toBe(true);
    }
  });

  it('rejects unknown strings', () => {
    expect(isSupportedLocale('xx-XX')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRTL
// ---------------------------------------------------------------------------
describe('isRTL', () => {
  it('returns true only for ar-SA', () => {
    expect(isRTL('ar-SA')).toBe(true);
  });

  it('returns false for LTR locales', () => {
    const ltrLocales: LocaleCode[] = ['en-US', 'zh-CN', 'ja-JP', 'ko-KR', 'ru-RU', 'es-ES', 'fr-FR', 'de-DE'];
    for (const locale of ltrLocales) {
      expect(isRTL(locale)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// getLocaleMeta
// ---------------------------------------------------------------------------
describe('getLocaleMeta', () => {
  it('returns correct meta for en-US', () => {
    const meta = getLocaleMeta('en-US');
    expect(meta.code).toBe('en-US');
    expect(meta.rtl).toBe(false);
    expect(meta.flag).toBe('🇺🇸');
  });

  it('returns correct meta for ar-SA', () => {
    const meta = getLocaleMeta('ar-SA');
    expect(meta.rtl).toBe(true);
    expect(meta.bcp47).toBe('ar-SA');
  });
});

// ---------------------------------------------------------------------------
// readStoredLocale
// ---------------------------------------------------------------------------
describe('readStoredLocale', () => {
  const KEY = 'verinode-locale';

  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('returns stored locale when valid', () => {
    window.localStorage.setItem(KEY, 'fr-FR');
    expect(readStoredLocale(KEY, isSupportedLocale)).toBe('fr-FR');
  });

  it('returns undefined when stored value is not a supported locale', () => {
    window.localStorage.setItem(KEY, 'xx-XX');
    expect(readStoredLocale(KEY, isSupportedLocale)).toBeUndefined();
  });

  it('returns undefined when nothing is stored', () => {
    expect(readStoredLocale(KEY, isSupportedLocale)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// detectBrowserLocale
// ---------------------------------------------------------------------------
describe('detectBrowserLocale', () => {
  it('returns DEFAULT_LOCALE when navigator.languages is empty', () => {
    vi.stubGlobal('navigator', { languages: [] });
    const result = detectBrowserLocale(isSupportedLocale);
    expect(result).toBe('en-US');
    vi.unstubAllGlobals();
  });

  it('matches an exact locale code', () => {
    vi.stubGlobal('navigator', { languages: ['de-DE'] });
    expect(detectBrowserLocale(isSupportedLocale)).toBe('de-DE');
    vi.unstubAllGlobals();
  });

  it('matches by language prefix', () => {
    vi.stubGlobal('navigator', { languages: ['ja'] });
    expect(detectBrowserLocale(isSupportedLocale)).toBe('ja-JP');
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// loadLocale (via cache seeding)
// ---------------------------------------------------------------------------
describe('loadLocale', () => {
  beforeEach(() => clearLocaleCache());
  afterEach(() => clearLocaleCache());

  it('returns seeded dict without a network round-trip', async () => {
    const dict: TranslationDict = { 'common.loading': 'Loading…' };
    seedLocaleCache('en-US', dict);
    const result = await loadLocale('en-US');
    expect(result).toStrictEqual(dict);
  });

  it('second call returns same reference from cache', async () => {
    const dict: TranslationDict = { 'common.error': 'Error' };
    seedLocaleCache('de-DE', dict);
    const first = await loadLocale('de-DE');
    const second = await loadLocale('de-DE');
    expect(first).toBe(second);
  });
});
