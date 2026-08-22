import type { LocaleCode, TranslationDict } from './types';
import { DEFAULT_LOCALE } from './config';
import { flattenTranslations } from './utils';

/** In-memory cache: locale → flattened dict. */
const cache = new Map<LocaleCode, TranslationDict>();

/**
 * Dynamically import a locale JSON bundle and flatten it.
 * Results are memoised; subsequent calls for the same locale are synchronous.
 */
export async function loadLocale(locale: LocaleCode): Promise<TranslationDict> {
  const cached = cache.get(locale);
  if (cached) return cached;

  let raw: Record<string, unknown>;

  try {
    // Dynamic import resolved by bundler at build time — each locale file
    // becomes its own chunk (<= 8 KB gzipped for ~400 keys of ASCII/CJK text).
    const mod = await importLocale(locale);
    raw = (mod.default ?? mod) as Record<string, unknown>;
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] Failed to load locale "${locale}", falling back to "${DEFAULT_LOCALE}"`);
    }
    // Recursion-safe: only fall back if we're not already loading the default.
    if (locale !== DEFAULT_LOCALE) {
      return loadLocale(DEFAULT_LOCALE);
    }
    raw = {};
  }

  const dict = flattenTranslations(raw);
  cache.set(locale, dict);
  return dict;
}

/**
 * Retrieve a locale dict synchronously from cache.
 * Returns undefined if the locale has not been loaded yet.
 */
export function getCachedLocale(locale: LocaleCode): TranslationDict | undefined {
  return cache.get(locale);
}

/**
 * Pre-warm the cache with a dict (used for SSR / testing).
 */
export function seedLocaleCache(locale: LocaleCode, dict: TranslationDict): void {
  cache.set(locale, dict);
}

/**
 * Clear the entire locale cache (test utility).
 */
export function clearLocaleCache(): void {
  cache.clear();
}

// ---------------------------------------------------------------------------
// Isolated dynamic-import switch — keeps webpack/turbopack chunk splitting
// working; string template literals in dynamic import() break static analysis.
// ---------------------------------------------------------------------------
async function importLocale(locale: LocaleCode): Promise<{ default?: Record<string, unknown> }> {
  switch (locale) {
    case 'en-US':
      return import('./locales/en-US.json');
    case 'zh-CN':
      return import('./locales/zh-CN.json');
    case 'ja-JP':
      return import('./locales/ja-JP.json');
    case 'ko-KR':
      return import('./locales/ko-KR.json');
    case 'ru-RU':
      return import('./locales/ru-RU.json');
    case 'ar-SA':
      return import('./locales/ar-SA.json');
    case 'es-ES':
      return import('./locales/es-ES.json');
    case 'fr-FR':
      return import('./locales/fr-FR.json');
    case 'de-DE':
      return import('./locales/de-DE.json');
    default: {
      const _exhaustive: never = locale;
      throw new Error(`[i18n] Unknown locale: ${String(_exhaustive)}`);
    }
  }
}
