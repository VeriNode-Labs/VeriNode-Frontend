/**
 * Accessibility utilities for WCAG 2.1 AA compliance.
 *
 * Shared helpers for ARIA attributes, color contrast, focus management,
 * keyboard navigation, and screen-reader announcements.
 */

// ---------------------------------------------------------------------------
// Focus management
// ---------------------------------------------------------------------------

/** Known focusable selectors (subset of native + tabindex). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])' as const;

/**
 * Trap focus inside `container` until `signal` is aborted.
 * Used for modals, dialogs, slide-outs, etc.
 */
export function trapFocus(container: HTMLElement, signal: AbortSignal): void {
  const initialFocus = document.activeElement as HTMLElement | null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', onKeyDown, { signal });

  // Auto-focus first focusable element on mount
  const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  if (first) first.focus();

  signal.addEventListener('abort', () => {
    initialFocus?.focus();
  });
}

/**
 * Moves focus to `element` with a visible outline (helpful for skip-links
 * that point to non-focusable containers).
 */
export function focusWithIndicator(element: HTMLElement): void {
  element.setAttribute('tabindex', '-1');
  element.focus();
  // Remove tabindex after blur so the element isn't stuck in tab order.
  element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true });
}

// ---------------------------------------------------------------------------
// Screen-reader live-region helpers
// ---------------------------------------------------------------------------

export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Announces a message to screen readers by updating the globally mounted
 * live region. Returns a cleanup function.
 */
let announceImpl: ((text: string, priority: AnnouncementPriority) => void) | null = null;

export function setAnnounceHandler(handler: (text: string, priority: AnnouncementPriority) => void): void {
  announceImpl = handler;
}

export function announce(text: string, priority: AnnouncementPriority = 'polite'): void {
  announceImpl?.(text, priority);
}

// ---------------------------------------------------------------------------
// Color contrast
// ---------------------------------------------------------------------------

/**
 * Calculate relative luminance per WCAG 2.1 definition.
 * Returns a value between 0 (darkest) and 1 (lightest).
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.04045 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Parse a hex color string (with or without #) into { r, g, b }.
 */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * WCAG 2.1 contrast ratio between two hex colors.
 */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);
  if (!c1 || !c2) return null;
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns true when the contrast ratio meets WCAG AA for normal text
 * (ratio >= 4.5:1).
 */
export function meetsAA(hex1: string, hex2: string): boolean {
  const ratio = contrastRatio(hex1, hex2);
  return ratio !== null && ratio >= 4.5;
}

/**
 * Returns true when the contrast ratio meets WCAG AA for large text
 * (ratio >= 3:1).
 */
export function meetsAALarge(hex1: string, hex2: string): boolean {
  const ratio = contrastRatio(hex1, hex2);
  return ratio !== null && ratio >= 3;
}

// ---------------------------------------------------------------------------
// Keyboard navigation helpers
// ---------------------------------------------------------------------------

/**
 * Returns key codes from a KeyboardEvent that are safe to use for
 * custom keyboard shortcuts.
 */
export function isActivationKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return e.key === 'Enter' || e.key === ' ';
}

/**
 * Prevents default scroll behaviour on spacebar for interactive elements.
 */
export function preventScrollOnSpace(e: React.KeyboardEvent): void {
  if (e.key === ' ') {
    e.preventDefault();
  }
}