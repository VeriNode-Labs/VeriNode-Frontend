import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 AA accessibility tests using axe-core.
 *
 * Scans every critical page of the VeriNode dashboard.
 * Fails the build on any critical or serious violations (impact: critical, serious).
 * Moderate and minor violations are logged but do not block CI by default.
 */

const CRITICAL_PAGES = [
  { path: '/', name: 'Home / Submit Stake' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/staking', name: 'Staking Management' },
  { path: '/vesting', name: 'Token Vesting' },
  { path: '/governance', name: 'Governance' },
  { path: '/bridge', name: 'Bridge Explorer' },
  { path: '/validators', name: 'Validators' },
  { path: '/validators/dashboard', name: 'Validator Dashboard' },
  { path: '/validators/exit-queue', name: 'Exit Queue' },
  { path: '/validators/rewards', name: 'Validator Rewards' },
  { path: '/node-sync', name: 'Node Sync' },
  { path: '/operator', name: 'Operator' },
  { path: '/accessibility', name: 'Accessibility Statement' },
];

// WCAG 2.1 AA tags — axe-core supports the full WCAG 2.1 rule set.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const { path, name } of CRITICAL_PAGES) {
  test(`Accessibility audit: ${name} (${path})`, async ({ page }) => {
    // 1. Navigate to the page
    await page.goto(path, { waitUntil: 'networkidle' });

    // 2. Wait for the page to be interactive enough for axe to analyze
    //    (dynamic components that lazy-load on mount may not be ready
    //     until after the initial network idle.)
    await page.waitForTimeout(1500);

    // 3. Run axe-core scan with WCAG 2.1 A/AA rules
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules([
        // Exclude rules that are not applicable to this app:
        // 'html-has-lang' – already set in root layout
        // 'landmark-one-main' – some pages use role="main" wrapper + inner <main>
        // These are informational and should not block CI.
      ])
      .analyze();

    // 4. Filter violations by impact level
    const seriousViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    // 5. Generate a human-readable summary for CI output
    if (seriousViolations.length > 0) {
      const summary = seriousViolations
        .map(
          (v) =>
            `[${v.impact?.toUpperCase()}] ${v.id}: ${v.help} — ${v.nodes.length} occurrence(s)\n` +
            `  ${v.helpUrl}\n` +
            v.nodes
              .slice(0, 5)
              .map((n) => `  • ${n.html.slice(0, 120)}`)
              .join('\n')
        )
        .join('\n\n');

      console.error(
        `\n========== ACCESSIBILITY VIOLATIONS (${name}) ==========\n${summary}\n=============================================\n`
      );
    }

    // 6. Assert no critical or serious violations — this fails the CI build
    expect(
      seriousViolations.length,
      `Accessibility audit failed for "${name}" (${path}) — ${seriousViolations.length} critical/serious violation(s) found. See console output for details.`
    ).toBe(0);

    // 7. Log moderate/minor violations as warnings (non-blocking)
    const minorViolations = results.violations.filter(
      (v) => v.impact === 'moderate' || v.impact === 'minor' || !v.impact
    );
    if (minorViolations.length > 0) {
      console.warn(
        `[WARN] ${name} (${path}): ${minorViolations.length} moderate/minor violation(s) — these do not fail the build.`
      );
    }
  });
}