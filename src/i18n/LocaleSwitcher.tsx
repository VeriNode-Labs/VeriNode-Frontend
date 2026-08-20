'use client';

import React, { useId, useRef, useState } from 'react';
import { useTranslation } from './I18nProvider';
import { SUPPORTED_LOCALES } from './config';
import type { LocaleCode } from './types';

/**
 * Dropdown component that lets users switch the active locale.
 * Preference is persisted to localStorage by I18nProvider.
 *
 * The trigger button shows the flag emoji and label of the current locale.
 * The dropdown lists all supported locales with their flag and native name.
 */
export function LocaleSwitcher() {
  const { locale, setLocale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const currentMeta = SUPPORTED_LOCALES.find((l) => l.code === locale) ?? SUPPORTED_LOCALES[0];

  function handleSelect(code: LocaleCode) {
    setLocale(code);
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div className="relative inline-block" onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={`Language: ${currentMeta.label}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className={[
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
          'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
          'hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1',
        ].join(' ')}
      >
        <span aria-hidden="true" className="text-base leading-none">
          {currentMeta.flag}
        </span>
        <span>{currentMeta.label}</span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop — clicking outside closes the menu */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />

          <ul
            id={listboxId}
            role="listbox"
            aria-label="Select language"
            aria-activedescendant={`locale-option-${locale}`}
            className={[
              'absolute z-50 mt-1 min-w-[160px] rounded-lg border py-1 shadow-lg',
              'border-[var(--border)] bg-[var(--surface)]',
              // For RTL locales the menu opens to the left of the button
              currentMeta.rtl ? 'right-0' : 'left-0',
            ].join(' ')}
          >
            {SUPPORTED_LOCALES.map((meta) => {
              const isSelected = meta.code === locale;
              return (
                <li
                  key={meta.code}
                  id={`locale-option-${meta.code}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(meta.code)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(meta.code);
                    }
                  }}
                  tabIndex={0}
                  className={[
                    'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition',
                    'text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]',
                    isSelected ? 'font-semibold' : 'font-normal',
                  ].join(' ')}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {meta.flag}
                  </span>
                  <span
                    lang={meta.bcp47}
                    dir={meta.rtl ? 'rtl' : 'ltr'}
                  >
                    {meta.label}
                  </span>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      className="ms-auto h-3 w-3 shrink-0"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
