'use client';

import React from 'react';
import { useTranslation } from './I18nProvider';
import { getLocaleMeta } from './config';

interface IntlNumberProps {
  /** The numeric value to format. */
  value: number;
  /** Intl.NumberFormat options (e.g. style, currency, maximumFractionDigits). */
  options?: Intl.NumberFormatOptions;
  /** Override the locale used for formatting (defaults to active locale). */
  locale?: string;
  /** Optional accessible label prefix (rendered as visually-hidden sr-only text). */
  label?: string;
  /** Additional className for the wrapper <span>. */
  className?: string;
}

/**
 * Renders a locale-aware formatted number using Intl.NumberFormat.
 *
 * @example
 * // Formats as currency in the active locale
 * <IntlNumber value={1234.56} options={{ style: 'currency', currency: 'USD' }} />
 *
 * // Formats as a percentage
 * <IntlNumber value={0.874} options={{ style: 'percent', maximumFractionDigits: 1 }} />
 */
export function IntlNumber({ value, options, locale: localeProp, label, className }: IntlNumberProps) {
  const { locale } = useTranslation();
  const meta = getLocaleMeta(locale);
  const bcp47 = localeProp ?? meta.bcp47;

  const formatted = new Intl.NumberFormat(bcp47, options).format(value);

  return (
    <span className={className} dir={meta.rtl ? 'rtl' : undefined}>
      {label ? <span className="sr-only">{label} </span> : null}
      {formatted}
    </span>
  );
}
