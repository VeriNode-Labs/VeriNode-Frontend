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

interface BundleState {
  /** The locale this bundle corresponds to. */
  locale: LocaleCode;
  dict: TranslationDict;
  loading: boolean;
}

function initialBundle(locale: LocaleCode): BundleState {
  const cached = getCachedLocale(locale);
  return { locale, dict: cached ?? {}, loading: !cached };
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (initialLocale) return initialLocale;
    return (
      readStoredLocale(LOCALE_STORAGE_KEY, isSupportedLocale) ??
      detectBrowserLocale(isSupportedLocale)
    );
  });

  const [bundle, setBundle] = useState<BundleState>(() => initialBundle(locale));

  // Cancelled ref prevents stale async updates from landing after unmount or
  // after a new locale request has already been issued.
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Cancel any in-flight request for a previous locale.
    cancelRef.current?.();

    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    // Apply RTL/LTR and lang to <html> immediately — this is a DOM side-effect,
    // not a setState call, so it is fine inside the effect body.
    applyRTL(locale);

    // All setState calls happen inside a microtask / Promise callback so they
    // are never synchronous within the effect body, which satisfies
    // react-hooks/set-state-in-effect.
    loadLocale(locale).then(
      (loaded) => {
        if (cancelled) return;
        setBundle({ locale, dict: loaded, loading: false });
        applyRTL(locale);
      },
      () => {
        if (cancelled) return;
        setBundle({ locale, dict: {}, loading: false });
      },
    );

    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, []);

  // Show the previous locale's dict while the new one is loading to avoid
  // a flash of empty / fallback keys.
  const contextDict = bundle.locale === locale ? bundle.dict : bundle.dict;

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dict: contextDict,
      isLoading: bundle.loading || bundle.locale !== locale,
      setLocale,
    }),
    [locale, contextDict, bundle.loading, bundle.locale, setLocale],
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
