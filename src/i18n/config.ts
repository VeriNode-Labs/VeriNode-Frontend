import type { LocaleCode } from './types';

export interface LocaleMeta {
  code: LocaleCode;
  label: string;
  /** BCP 47 language tag passed to Intl APIs. */
  bcp47: string;
  /** Unicode flag emoji (U+1F1E6..U+1F1FF regional indicators). */
  flag: string;
  /** true for right-to-left scripts. */
  rtl: boolean;
}

/** Ordered list of all supported locales. */
export const SUPPORTED_LOCALES: readonly LocaleMeta[] = [
  { code: 'en-US', label: 'English', bcp47: 'en-US', flag: '🇺🇸', rtl: false },
  { code: 'zh-CN', label: '中文', bcp47: 'zh-CN', flag: '🇨🇳', rtl: false },
  { code: 'ja-JP', label: '日本語', bcp47: 'ja-JP', flag: '🇯🇵', rtl: false },
  { code: 'ko-KR', label: '한국어', bcp47: 'ko-KR', flag: '🇰🇷', rtl: false },
  { code: 'ru-RU', label: 'Русский', bcp47: 'ru-RU', flag: '🇷🇺', rtl: false },
  { code: 'ar-SA', label: 'العربية', bcp47: 'ar-SA', flag: '🇸🇦', rtl: true },
  { code: 'es-ES', label: 'Español', bcp47: 'es-ES', flag: '🇪🇸', rtl: false },
  { code: 'fr-FR', label: 'Français', bcp47: 'fr-FR', flag: '🇫🇷', rtl: false },
  { code: 'de-DE', label: 'Deutsch', bcp47: 'de-DE', flag: '🇩🇪', rtl: false },
] as const;

export const DEFAULT_LOCALE: LocaleCode = 'en-US';
export const LOCALE_STORAGE_KEY = 'verinode-locale';

/** Set of locale codes that use RTL text direction. */
export const RTL_LOCALES = new Set<LocaleCode>(
  SUPPORTED_LOCALES.filter((l) => l.rtl).map((l) => l.code),
);

export function isRTL(locale: LocaleCode): boolean {
  return RTL_LOCALES.has(locale);
}

export function getLocaleMeta(locale: LocaleCode): LocaleMeta {
  return (
    SUPPORTED_LOCALES.find((l) => l.code === locale) ??
    (SUPPORTED_LOCALES.find((l) => l.code === DEFAULT_LOCALE) as LocaleMeta)
  );
}

/** Validate that a raw string is a known locale code. */
export function isSupportedLocale(value: string): value is LocaleCode {
  return SUPPORTED_LOCALES.some((l) => l.code === value);
}
