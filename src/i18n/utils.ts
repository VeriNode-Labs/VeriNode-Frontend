import type { LocaleCode, TranslationDict, TParams } from './types';
import { DEFAULT_LOCALE } from './config';

/**
 * Flatten a nested JSON translation object into a dot-notation dictionary.
 * e.g. { "common": { "loading": "Loading…" } } → { "common.loading": "Loading…" }
 */
export function flattenTranslations(
  obj: Record<string, unknown>,
  prefix = '',
): TranslationDict {
  const result: TranslationDict = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenTranslations(value as Record<string, unknown>, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Interpolate {{param}} placeholders inside a translation string.
 * e.g. interpolate("Hello {{name}}", { name: "Alice" }) → "Hello Alice"
 */
export function interpolate(template: string, params: TParams): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

/**
 * Resolve the CLDR plural suffix for a given count and locale.
 * Returns one of: zero | one | two | few | many | other
 */
export function getPluralSuffix(count: number, locale: LocaleCode): Intl.LDMLPluralRule {
  const pr = new Intl.PluralRules(locale);
  return pr.select(count);
}

/**
 * Pick the best plural variant key from the dictionary.
 * Strategy: try "{baseKey}_{pluralRule}", fall back to "{baseKey}_other",
 * then "{baseKey}" (singular string), and finally the raw key.
 */
export function resolvePluralKey(
  baseKey: string,
  count: number,
  locale: LocaleCode,
  dict: TranslationDict,
): string {
  const rule = getPluralSuffix(count, locale);
  const candidates = [
    `${baseKey}_${rule}`,
    `${baseKey}_other`,
    baseKey,
  ];
  for (const candidate of candidates) {
    if (candidate in dict) return candidate;
  }
  return baseKey;
}

/**
 * Core translate function. Accepts a merged dict (locale + en-US fallback).
 * Emits a console.warn in development when a key is missing.
 */
export function translate(
  key: string,
  params: TParams | undefined,
  dict: TranslationDict,
  locale: LocaleCode,
): string {
  let resolvedKey = key;

  if (params?.count !== undefined) {
    resolvedKey = resolvePluralKey(key, params.count, locale, dict);
  }

  let template = dict[resolvedKey];

  if (template === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] Missing translation key "${key}" for locale "${locale}"`);
    }
    // Return the last segment of the key as a human-readable fallback.
    return key.split('.').pop() ?? key;
  }

  if (params && Object.keys(params).length > 0) {
    template = interpolate(template, params);
  }

  return template;
}

/**
 * Read the persisted locale preference from localStorage.
 * Returns undefined when running server-side or when no preference is stored.
 */
export function readStoredLocale(
  storageKey: string,
  isSupportedFn: (v: string) => v is LocaleCode,
): LocaleCode | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = window.localStorage.getItem(storageKey);
  if (stored && isSupportedFn(stored)) return stored;
  return undefined;
}

/**
 * Detect the browser's preferred locale from navigator.languages.
 * Falls back to DEFAULT_LOCALE when no match is found.
 */
export function detectBrowserLocale(
  isSupportedFn: (v: string) => v is LocaleCode,
): LocaleCode {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  for (const lang of navigator.languages ?? []) {
    // Exact match first (e.g. "zh-CN")
    if (isSupportedFn(lang)) return lang;
    // Language-only match (e.g. "zh" → "zh-CN")
    const prefix = lang.split('-')[0];
    const match = (
      ['en-US', 'zh-CN', 'ja-JP', 'ko-KR', 'ru-RU', 'ar-SA', 'es-ES', 'fr-FR', 'de-DE'] as LocaleCode[]
    ).find((l) => l.startsWith(prefix));
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
