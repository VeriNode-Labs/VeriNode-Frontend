'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LocaleCode, TranslationDict, TParams, UseTranslationResult } from './types';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isRTL, isSupportedLocale } from './config';
import { loadLocale, getCachedLocale } from './loader';
import { translate, readStoredLocale, detectBrowserLocale } from './utils';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface I18nContextValue {
  locale: LocaleCode;
  dict: TranslationDict;
  isLoading: boolean;
  setLocale: (locale: LocaleCode) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dict: {},
  isLoading: true,
  setLocale: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface I18nProviderProps {
  children: React.ReactNode;
  /**
   * Optional initial locale override (e.g. injected server-side from
   * Accept-Language header). When omitted the provider auto-detects from
   * localStorage → navigator.languages → DEFAULT_LOCALE.
   */
  initialLocale?: LocaleCode;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (initialLocale) return initialLocale;
    // Prefer persisted preference, then browser language, then default.
    return (
      readStoredLocale(LOCALE_STORAGE_KEY, isSupportedLocale) ??
      detectBrowserLocale(isSupportedLocale)
    );
  });

  const [dict, setDict] = useState<TranslationDict>(
    () => getCachedLocale(locale) ?? {},
  );

  const [isLoading, setIsLoading] = useState<boolean>(
    () => !getCachedLocale(locale),
  );

  // Track the latest requested locale to avoid stale async updates.
  const requestedLocaleRef = useRef<LocaleCode>(locale);

  useEffect(() => {
    requestedLocaleRef.current = locale;
    const cached = getCachedLocale(locale);
    if (cached) {
      setDict(cached);
      setIsLoading(false);
      applyRTL(locale);
      return;
    }

    setIsLoading(true);

    loadLocale(locale).then(
      (loaded) => {
        if (requestedLocaleRef.current !== locale) return; // locale switched while loading
        setDict(loaded);
        setIsLoading(false);
        applyRTL(locale);
      },
      () => {
        // loadLocale already handles fallback internally; this guard is for
        // unexpected rejections so the promise chain is always settled.
        if (requestedLocaleRef.current !== locale) return;
        setIsLoading(false);
      },
    );
  }, [locale]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dict, isLoading, setLocale }),
    [locale, dict, isLoading, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ---------------------------------------------------------------------------
// RTL helper — sets dir on <html> and updates lang attribute
// ---------------------------------------------------------------------------

function applyRTL(locale: LocaleCode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('lang', locale);
  root.setAttribute('dir', isRTL(locale) ? 'rtl' : 'ltr');
}

// ---------------------------------------------------------------------------
// useTranslation hook
// ---------------------------------------------------------------------------

/**
 * Returns a `t()` function for the currently active locale, plus helpers to
 * inspect and change the locale.
 *
 * @example
 * const { t, locale, setLocale } = useTranslation();
 * t('common.loading')               // → "Loading…"
 * t('validators.count', { count: 3 }) // → "3 validators"
 */
export function useTranslation(): UseTranslationResult {
  const { locale, dict, isLoading, setLocale } = useContext(I18nContext);

  const t = useCallback(
    (key: string, params?: TParams): string => {
      return translate(key, params, dict, locale);
    },
    [dict, locale],
  );

  return { t, locale, setLocale, isLoading };
}
