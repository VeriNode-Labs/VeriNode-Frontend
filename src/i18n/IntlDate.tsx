'use client';

import React from 'react';
import { useTranslation } from './I18nProvider';
import { getLocaleMeta } from './config';

interface IntlDateProps {
  /** Date value — accepts Date object, ISO string, or Unix timestamp (ms). */
  value: Date | string | number;
  /** Intl.DateTimeFormat options. Defaults to a medium-length date+time. */
  options?: Intl.DateTimeFormatOptions;
  /** Override the locale used for formatting (defaults to active locale). */
  locale?: string;
  /** Optional accessible label (rendered as sr-only text). */
  label?: string;
  /** Additional className for the wrapper <time> element. */
  className?: string;
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Renders a locale-aware formatted date/time using Intl.DateTimeFormat.
 * Wraps the output in a semantic <time> element with a machine-readable
 * `datetime` attribute for accessibility and SEO.
 *
 * @example
 * // Renders date+time in the active locale
 * <IntlDate value={new Date()} />
 *
 * // Date only
 * <IntlDate value="2025-01-01" options={{ year: 'numeric', month: 'long', day: 'numeric' }} />
 */
export function IntlDate({ value, options, locale: localeProp, label, className }: IntlDateProps) {
  const { locale } = useTranslation();
  const meta = getLocaleMeta(locale);
  const bcp47 = localeProp ?? meta.bcp47;

  const date = value instanceof Date ? value : new Date(value);
  const formatted = new Intl.DateTimeFormat(bcp47, options ?? DEFAULT_DATE_OPTIONS).format(date);

  // ISO string for the <time datetime="…"> attribute.
  const isoString = Number.isNaN(date.getTime()) ? '' : date.toISOString();

  return (
    <time
      dateTime={isoString}
      className={className}
      dir={meta.rtl ? 'rtl' : undefined}
    >
      {label ? <span className="sr-only">{label} </span> : null}
      {formatted}
    </time>
  );
}
