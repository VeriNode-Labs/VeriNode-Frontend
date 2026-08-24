'use client';

import { useEffect, useRef } from 'react';
import { setAnnounceHandler, type AnnouncementPriority } from '@/src/utils/accessibility';

/**
 * ScreenReaderAnnouncements mounts two visually-hidden live-region elements
 * for polite and assertive announcements. Any component in the tree can call
 * `announce()` from the accessibility utils to push a message.
 */
export function ScreenReaderAnnouncements() {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnnounceHandler((text: string, priority: AnnouncementPriority) => {
      const region = priority === 'assertive' ? assertiveRef.current : politeRef.current;
      if (!region) return;

      // aria-live regions fire on text mutation — we toggle between two
      // messages so identical strings still trigger a re-announcement.
      region.textContent = '';
      // Force a microtask to ensure DOM is updated
      requestAnimationFrame(() => {
        region.textContent = text;
      });
    });
  }, []);

  return (
    <>
      {/* Polite announcements (user isn't interrupted) */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="sr-polite"
      />
      {/* Assertive announcements (interrupts current announcement) */}
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="sr-assertive"
      />
    </>
  );
}