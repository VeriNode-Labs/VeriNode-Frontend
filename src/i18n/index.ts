/**
 * VeriNode i18n public API.
 *
 * Usage:
 *   import { I18nProvider, useTranslation, LocaleSwitcher, IntlNumber, IntlDate } from '@/src/i18n';
 */

export { I18nProvider } from './I18nProvider';
export { useTranslation } from './I18nProvider';
export { LocaleSwitcher } from './LocaleSwitcher';
export { IntlNumber } from './IntlNumber';
export { IntlDate } from './IntlDate';
export { loadLocale, getCachedLocale, seedLocaleCache, clearLocaleCache } from './loader';
export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isRTL, getLocaleMeta, isSupportedLocale } from './config';
export type { LocaleCode, TParams, UseTranslationResult, TranslationDict } from './types';
export type { LocaleMeta } from './config';
