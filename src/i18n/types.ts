/**
 * Supported locale codes for VeriNode i18n.
 * ar-SA is RTL; all others are LTR.
 */
export type LocaleCode =
  | 'en-US'
  | 'zh-CN'
  | 'ja-JP'
  | 'ko-KR'
  | 'ru-RU'
  | 'ar-SA'
  | 'es-ES'
  | 'fr-FR'
  | 'de-DE';

/** Flat key-value translation dictionary after flattening nested JSON. */
export type TranslationDict = Record<string, string>;

/**
 * Optional interpolation parameters for t().
 * Numeric `count` triggers CLDR plural selection when plural variants exist.
 */
export interface TParams {
  count?: number;
  [key: string]: string | number | boolean | undefined;
}

/** Return type of useTranslation(). */
export interface UseTranslationResult {
  /** Translate a dot-notation key, interpolating {{param}} placeholders. */
  t: (key: string, params?: TParams) => string;
  /** Currently active locale. */
  locale: LocaleCode;
  /** Programmatically switch locale; persists to localStorage. */
  setLocale: (locale: LocaleCode) => void;
  /** true while the locale bundle is being fetched for the first time. */
  isLoading: boolean;
}
