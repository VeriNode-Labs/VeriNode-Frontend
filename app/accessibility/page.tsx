import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement — VeriNode',
  description:
    'VeriNode is committed to WCAG 2.1 AA accessibility. Learn about our compliance status, known issues, and how to report barriers.',
};

export default function AccessibilityStatementPage() {
  const lastUpdated = '2026-08-24';

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-4 py-12 text-zinc-900 dark:text-zinc-100" aria-label="Accessibility statement">
      <h1 className="mb-2 text-3xl font-bold">Accessibility Statement</h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Last updated: {lastUpdated}
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Commitment                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8" aria-labelledby="sec-commitment">
        <h2 id="sec-commitment" className="mb-3 text-xl font-semibold">Our Commitment</h2>
        <p className="leading-relaxed">
          VeriNode is committed to providing a digital experience that is
          accessible to the widest possible audience, regardless of technology or
          ability. We are actively working to increase the accessibility and
          usability of our dashboard and, in doing so, aim to meet or exceed the{' '}
          <a
            href="https://www.w3.org/TR/WCAG21/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
          >
            Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
          </a>
          .
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Compliance status                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8" aria-labelledby="sec-status">
        <h2 id="sec-status" className="mb-3 text-xl font-semibold">Compliance Status</h2>
        <p className="leading-relaxed">
          The Web Content Accessibility Guidelines (WCAG) define requirements for
          designers and developers to improve accessibility for people with
          disabilities. It defines three levels of conformance: Level A, Level
          AA, and Level AAA.
        </p>
        <p className="mt-3 leading-relaxed">
          <strong>VeriNode is partially conformant with WCAG 2.1 Level AA.</strong>{' '}
          Partially conformant means that some parts of the content do not yet
          fully conform to the accessibility standard.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Measures taken                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8" aria-labelledby="sec-measures">
        <h2 id="sec-measures" className="mb-3 text-xl font-semibold">Measures We Take</h2>
        <ul className="list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            Automated accessibility testing (
            <code className="rounded bg-zinc-200 px-1 text-sm dark:bg-zinc-700">@axe-core/playwright</code>{' '}
            and <code className="rounded bg-zinc-200 px-1 text-sm dark:bg-zinc-700">jest-axe</code>) against WCAG 2.1 A
            and AA rules, integrated into our CI pipeline.
          </li>
          <li>Manual keyboard-navigation audits across all interactive components.</li>
          <li>Color-contrast verification using the WCAG relative-luminance formula.</li>
          <li>
            A screen-reader live region (<code className="rounded bg-zinc-200 px-1 text-sm dark:bg-zinc-700">aria-live</code>) announcing
            transaction statuses, errors, and dynamic content changes.
          </li>
          <li>Visible focus indicators on all interactive elements for keyboard users.</li>
          <li>A skip-to-content link at the top of every page.</li>
          <li>Regular accessibility reviews as part of our design and development process.</li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Known limitations                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8" aria-labelledby="sec-limitations">
        <h2 id="sec-limitations" className="mb-3 text-xl font-semibold">Known Limitations</h2>
        <p className="leading-relaxed">
          Despite our best efforts, some content may not yet be fully adapted to
          the strictest accessibility standards. This may be a result of not
          having found or identified the most appropriate technological solution.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Canvas-rendered charts and topology maps</strong>: Some
            data-visualization components rendered on <code>&lt;canvas&gt;</code>{' '}
            elements lack accessible text alternatives. We are investigating
            aria-label and fallback text solutions.
          </li>
          <li>
            <strong>Third-party Web3 wallet modals</strong>: Wallet-connection
            modals provided by external wallet libraries may not fully comply
            with our accessibility standards.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Feedback                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8" aria-labelledby="sec-feedback">
        <h2 id="sec-feedback" className="mb-3 text-xl font-semibold">Feedback &amp; Contact</h2>
        <p className="leading-relaxed">
          We welcome your feedback on the accessibility of VeriNode. Please let
          us know if you encounter accessibility barriers:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>GitHub Issues:</strong>{' '}
            <a
              href="https://github.com/VeriNode-Labs/VeriNode-Frontend/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:opacity-80"
            >
              Open an accessibility issue
            </a>
          </li>
          <li>
            <strong>Email:</strong>{' '}
            <a href="mailto:accessibility@verinode.io" className="text-primary underline hover:opacity-80">
              accessibility@verinode.io
            </a>
          </li>
        </ul>
        <p className="mt-3 leading-relaxed">
          We aim to respond to accessibility feedback within 5 business days.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Technical specifications                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8" aria-labelledby="sec-tech">
        <h2 id="sec-tech" className="mb-3 text-xl font-semibold">Technical Specifications</h2>
        <p className="leading-relaxed">
          Accessibility of VeriNode relies on the following technologies to work
          with the particular combination of web browser and any assistive
          technologies or plugins installed on your computer:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>HTML</li>
          <li>WAI-ARIA</li>
          <li>CSS</li>
          <li>JavaScript</li>
          <li>React / Next.js</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          These technologies are relied upon for conformance with the
          accessibility standards used.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 7. Assessment approach                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="mb-8" aria-labelledby="sec-assessment">
        <h2 id="sec-assessment" className="mb-3 text-xl font-semibold">Assessment Approach</h2>
        <p className="leading-relaxed">
          VeriNode assessed the accessibility of this application by the
          following approaches:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            <strong>Automated testing:</strong> axe-core (Playwright) and jest-axe
            run in CI on every pull request, failing the build on critical and
            serious WCAG 2.1 A/AA violations.
          </li>
          <li>
            <strong>Manual keyboard audit:</strong> All interactive components
            are manually tested with keyboard-only navigation (Tab, Enter, Space,
            Escape, Arrow keys).
          </li>
          <li>
            <strong>Screen-reader testing:</strong> Tested with NVDA (Windows)
            and VoiceOver (macOS) on representative user flows.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                            */}
      {/* ------------------------------------------------------------------ */}
      <footer className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p>
          This statement was created on {lastUpdated} and is reviewed quarterly.
          For the latest version, visit{' '}
          <a href="/accessibility" className="text-primary underline">
            /accessibility
          </a>
          .
        </p>
      </footer>
    </main>
  );
}