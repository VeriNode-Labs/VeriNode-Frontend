# VeriNode Frontend Guide

Single reference for the VeriNode frontend application. Covers architecture, styling, components, state management, testing, and contribution workflow.

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Tech Stack](#2-tech-stack)
- [3. Getting Started](#3-getting-started)
- [4. Project Structure](#4-project-structure)
- [5. Styling Guide](#5-styling-guide)
- [6. Component Architecture](#6-component-architecture)
- [7. State Management](#7-state-management)
- [8. Testing](#8-testing)
- [9. Contributing](#9-contributing)

---

## 1. Project Overview

VeriNode is a decentralized Savings Circle (ROSCA) protocol built on Stellar Soroban. The frontend provides an interface for:

- **Interactive Savings Circles** -- create, join, deposit, and view payout orders for Rotating Savings and Credit Association groups.
- **Collateral & Governance Hub** -- lock collateral, nominate safety buddies, submit and vote on leniency requests.
- **Quadratic Voting** -- propose and cast quadratic votes for large circle rule changes.
- **Wallet Integration** -- connect via Freighter, Lobstr, or Albedo for authentication, staking, and transactions.

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + PostCSS |
| State Management | Zustand 5 + TanStack React Query 5 |
| Charts | Chart.js 4 + lightweight-charts 5 |
| Blockchain | @stellar/stellar-sdk 16 |
| Unit Testing | Vitest 3 + Testing Library + MSW + fast-check |
| E2E Testing | Playwright (with axe-core for accessibility) |
| Linting | ESLint 9 (flat config) |
| Build | `next build` with @next/bundle-analyzer |
| Deployment | Istio service mesh (mTLS), Kubernetes |

## 3. Getting Started

### Prerequisites

- Node.js v18 or higher
- npm

### Installation & Local Setup

```bash
# Clone the repository
git clone https://github.com/VeriNode-Labs/VeriNode-Frontend
cd VeriNode-Frontend

# Run the onboarding script
npm run setup:dev

# Start development server
npm run dev
```

The `setup:dev` script verifies your local Node.js version, creates `.env.local` from `.env.example` when needed, installs dependencies with `npm ci` when a lockfile is present, and runs the linter as a smoke check.

#### Setup Flags

```bash
# Preview actions without changing files or installing dependencies
npm run setup:dev -- --dry-run

# Keep existing dependencies and only validate environment/configuration
npm run setup:dev -- --skip-install

# Do not create .env.local from .env.example
npm run setup:dev -- --skip-env
```

## 4. Project Structure

```
verinode-frontend/
├── app/                              # Next.js App Router
│   ├── (auth)/                       #   Auth route group (layout only)
│   ├── (dashboard)/                  #   Dashboard route group (layout only)
│   ├── page.tsx                      #   Home page
│   ├── bridge/                       #   Bridge feature
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── network/                      #   Network features
│   │   ├── page.tsx
│   │   └── dr/page.tsx
│   ├── node-sync/                    #   Node synchronization
│   ├── operator/                     #   Operator features
│   ├── reputation-demo/              #   Reputation chart demo
│   ├── supply-chain/                 #   Supply chain feature
│   ├── validators/                   #   Validator management
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── exit-queue/page.tsx
│   │   ├── rewards/page.tsx
│   │   └── settings/page.tsx
│   ├── vesting/                      #   Vesting features
│   └── wallet/                       #   Wallet features
│       └── preflight/page.tsx
│
├── src/
│   ├── components/                   # UI and feature components
│   │   ├── alerts/                   #   Alert system
│   │   ├── analytics/                #   Analytics widgets
│   │   ├── bridge/                   #   Bridge components
│   │   ├── canvas/                   #   Canvas rendering
│   │   ├── charts/                   #   Chart components
│   │   ├── common/                   #   Shared/common components
│   │   ├── disaster-recovery/        #   DR components
│   │   ├── inspections/              #   Inspection views
│   │   ├── kafka/                    #   Kafka UI components
│   │   ├── layout/                   #   Layout components
│   │   ├── network/                  #   Network components
│   │   ├── nodes/                    #   Node management
│   │   ├── onboarding/               #   Onboarding flow
│   │   ├── operator/                 #   Operator components
│   │   ├── providers/                #   Context providers
│   │   ├── reputation/               #   Reputation chart + stream
│   │   ├── rewards/                  #   Rewards components
│   │   ├── shared/                   #   Cross-feature shared components
│   │   ├── slashing/                 #   Slashing components
│   │   ├── slo/                      #   SLO monitoring UI
│   │   ├── staking/                  #   Staking components
│   │   ├── supplychain/              #   Supply chain components
│   │   ├── sync/                     #   Sync status components
│   │   ├── ui/                       #   Primitives (buttons, inputs, etc.)
│   │   ├── validators/               #   Validator components
│   │   ├── vesting/                  #   Vesting components
│   │   └── wallet/                   #   Wallet components
│   ├── config/                       # Application configuration
│   ├── hooks/                        # Custom React hooks
│   ├── lib/                          # Library utilities
│   ├── services/                     # API services and business logic
│   ├── store/ + stores/              # Zustand state stores
│   ├── styles/                       # Theme and color definitions
│   │   ├── colors.ts                 #   Token palette (4 themes)
│   │   └── themes.ts                 #   Theme definitions + contrast utils
│   ├── types/                        # TypeScript type definitions
│   ├── utils/                        # Utility functions
│   ├── workers/                      # Web workers
│   └── __tests__/                    # Unit tests
│
├── docs/                             # Infrastructure/ops documentation
├── e2e/                              # End-to-end tests
├── deploy/istio/                     # Istio deployment manifests
├── monitoring/                       # Grafana dashboards + alert configs
├── scripts/                          # Dev tooling (git hooks, security audit)
└── public/                           # Static assets
```

## 5. Styling Guide

### Tailwind CSS v4

The project uses Tailwind CSS v4 with PostCSS. The configuration lives in `tailwind.config.ts`:

```typescript
// tailwind.config.ts (excerpt)
import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neutral: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
          300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
          600: '#475569', 700: '#334155', 800: '#1e293b',
          900: '#0f172a', 950: '#020617',
        },
        primary: '#2563eb',
        destructive: '#dc2626',
        success: '#16a34a',
      },
    },
  },
  plugins: [/* CSS custom properties via addBase */],
}
```

### Theme System

Four themes are supported, defined in `src/styles/themes.ts` and driven by the palette in `src/styles/colors.ts`, plus a `system` mode that follows the OS `prefers-color-scheme` setting:

| Theme ID | Description |
|----------|-------------|
| `system` | Follow the OS light/dark preference (default) |
| `light` | Default light mode for office use |
| `dark` | Standard dark mode |
| `hc-dark` | High-contrast palette tuned for dim server rooms |
| `hc-light` | High-contrast palette tuned for bright NOC floors |

Theme switching applies a `data-theme` attribute to `:root`, which activates CSS custom properties injected by the Tailwind plugin. The `ThemeProvider` reads the stored preference (`localStorage`, key `verinode-theme`), falls back to `prefers-color-scheme` when nothing is stored, listens for OS preference changes via `matchMedia`, and exposes `useTheme()` returning `(theme, setTheme, resolvedTheme)`. A pre-hydration script (`public/theme-init.js`) applies the theme before first paint to avoid a flash of the wrong theme.

The `ThemeToggle` button (sun/moon/monitor icons) cycles `system -> light -> dark`; it lives in the dashboard header and on the home page. Lightweight Charts instances re-theme on mode change via `chart.applyOptions()` using the tokens in `src/styles/chartTheme.ts`.

### Color Tokens

All themes share the same token structure. Light/dark values:

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#f8fafc` | `#020617` |
| `foreground` | `#0f172a` | `#f8fafc` |
| `surface` | `#ffffff` | `#0f172a` |
| `border` | `#cbd5e1` | `#475569` |
| `muted` | `#64748b` | `#cbd5e1` |
| `primary` | `#2563eb` | `#60a5fa` |
| `primaryForeground` | `#ffffff` | `#020617` |
| `destructive` | `#dc2626` | `#f87171` |
| `success` | `#16a34a` | `#4ade80` |

High-contrast themes use `#000000`/`#ffffff` boundaries with gold (`#ffd700`) or blue (`#0000ff`) as primary.

### CSS Custom Properties

A Tailwind plugin injects per-theme CSS variables on `:root`:

```css
:root {
  --color-surface: #ffffff;
  --color-border: #cbd5e1;
  --color-muted: #64748b;
}

:root[data-theme="hc-dark"] {
  --color-surface: #111111;
  --color-border: #ffffff;
  --color-muted: #d4d4d4;
}
```

These can be used in arbitrary Tailwind values: `bg-[var(--color-surface)]`.

### Contrast Utilities

`themes.ts` exports helper functions for accessibility checks:

```typescript
import { contrastRatio } from '@/src/styles/themes'

const ratio = contrastRatio('#ffffff', '#2563eb') // ~8.59 (AAA for normal text)
```

### Conventions

- Always use semantic color tokens (`primary`, `destructive`, `success`) rather than raw hex values.
- Use the `neutral` scale for backgrounds, borders, and muted text.
- Dark mode is class-based (`darkMode: 'class'`). Toggle via the `dark` class on `<html>`.
- Accessibility: verify contrast ratios against WCAG AA (4.5:1 normal text, 3:1 large text) using the exported `contrastRatio()` function.

## 6. Component Architecture

### Directory Map

Components are organized by feature domain under `src/components/`:

| Category | Directories | Purpose |
|----------|-------------|---------|
| **UI Primitives** | `ui/`, `common/`, `shared/` | Buttons, inputs, modals, layout primitives |
| **Layout** | `layout/` | App shell, navigation, page layouts |
| **Providers** | `providers/` | Context wrappers (theme, auth, query) |
| **Wallet** | `wallet/` | Wallet connection, account display |
| **Staking** | `staking/` | Stake/unstake flows, balance display |
| **Validators** | `validators/` | Validator dashboard, exit queue, rewards |
| **Reputation** | `reputation/` | Real-time reputation chart with WebSocket stream |
| **Network** | `network/`, `nodes/` | Network topology, node management |
| **Bridge** | `bridge/` | Cross-chain bridge UI |
| **Governance** | `slashing/`, `slo/` | Slashing, SLO monitoring |
| **Operations** | `operator/`, `inspections/`, `disaster-recovery/`, `kafka/`, `analytics/` | Operational dashboards |
| **Data Viz** | `charts/` | Chart components (Chart.js, lightweight-charts) |
| **Sync** | `sync/`, `onboarding/` | Sync status, onboarding flow |

### Common Patterns

**Feature Providers** wrap feature-specific context:

```typescript
// Example: DegradableFeature wraps graceful degradation
<DegradableFeature fallback={<FallbackUI />}>
  <FeatureContent />
</DegradableFeature>
```

**Data-attribute testing** -- components use `data-testid` attributes for E2E test selectors:

```tsx
<div data-testid="wallet-connected">{publicKey}</div>
```

### Reputation Chart -- Performance Architecture

The reputation chart (`src/components/reputation/ReputationChart.tsx`) renders real-time data from a WebSocket stream. It implements a 4-tier optimization to prevent UI freezes during high-frequency events:

#### Problem

Each reputation event originally triggered an immediate `chart.update()` call (3-5 ms). During a 50-node recovery scenario producing 500 events, this caused a 1.5-2.5 second UI freeze.

#### Solution: 4-Tier Optimization

**1. Batched Chart Updates (100 ms buffer)**

Incoming data points are buffered and flushed in a single update per interval:

```typescript
const bufferRef = useRef<ReputationDataPoint[]>([])

const flushBuffer = useCallback(() => {
  if (bufferRef.current.length === 0) return
  const newPoints = bufferRef.current.map(point => ({
    x: point.timestamp,
    y: point.score,
  }))
  const updatedData = [...currentData, ...newPoints]
  chartRef.current.data.datasets[0].data = updatedData
  chartRef.current.update('none') // Single update call
  bufferRef.current = []
}, [])
```

Result: 50 raw updates become ~10 updates per second.

**2. requestAnimationFrame Rendering**

RAF ensures chart updates align with the browser paint cycle:

```typescript
const rafLoop = useCallback(() => {
  if (isDirtyRef.current) {
    flushBuffer()
  }
  rafRef.current = requestAnimationFrame(rafLoop)
}, [flushBuffer])
```

Result: max 60 updates/sec regardless of event rate.

**3. Decimation at High Event Rates**

When event rate exceeds 10/sec, consecutive points are aggregated into 1-second buckets:

```typescript
if (shouldDecimate) {
  const aggregated = new Map<number, { sum: number; count: number }>()
  for (const point of bufferRef.current) {
    const bucket = Math.floor(point.timestamp / granularityMs) * granularityMs
    const existing = aggregated.get(bucket) || { sum: 0, count: 0 }
    aggregated.set(bucket, {
      sum: existing.sum + point.score,
      count: existing.count + 1,
    })
  }
  newPoints = Array.from(aggregated.entries()).map(([ts, { sum, count }]) => ({
    x: ts,
    y: sum / count,
  }))
}
```

Result: 100 points reduce to 2-5 aggregated points.

**4. Performance Metrics Tracking**

Real-time metrics are tracked and displayed on the component:

```typescript
const [metrics, setMetrics] = useState<ChartPerformanceMetrics>({
  updateCount: 0,
  totalUpdateTime: 0,
  maxFrameFreeze: 0,
  droppedFrames: 0,
  averageUpdateTime: 0,
})
```

#### Configuration Options

| Prop | Default | Description |
|------|---------|-------------|
| `batchInterval` | `100` | Buffer flush interval in ms. Lower = more responsive, higher = less CPU. |
| `useRAF` | `true` | Use requestAnimationFrame for rendering. |
| `enableDecimation` | `true` | Aggregate points at high event rates. |
| Decimation threshold | `10/sec` | Event rate above which decimation activates. |

#### Usage

```tsx
import { ReputationChart } from '@/src/components/reputation/ReputationChart'

function Dashboard() {
  return (
    <ReputationChart
      nodeId="node-001"
      simulateEvents={false}
      batchInterval={100}
      enableDecimation={true}
      useRAF={true}
    />
  )
}
```

Visit `/reputation-demo` to interact with the chart and toggle optimization parameters.

#### Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Max single freeze | < 50 ms | ~35 ms |
| Frame budget | 16 ms (60fps) | Met |
| Time per 500 ms window | < 100 ms | ~20 ms |
| Data reduction under load | High | 98% (100 pts -> 2 aggregated) |

### File Structure (Reputation Feature)

```
src/components/reputation/
├── ReputationChart.tsx          # Main chart component
├── chartConfig.ts               # Chart.js configuration
└── tests/
    └── reputationChart.test.ts  # Performance tests

src/hooks/
└── useReputationStream.ts       # WebSocket hook + simulation

src/types/
└── reputation.ts                # Type definitions

app/reputation-demo/
└── page.tsx                     # Demo page with controls
```

## 7. State Management

### Zustand

Application state is managed through Zustand stores in `src/store/` and `src/stores/`. Zustand provides lightweight, hook-based state without boilerplate.

### TanStack React Query

Server state and async data fetching use TanStack React Query. This handles caching, background refetching, and optimistic updates for API calls.

### Combined Pattern

Typical feature flow:

1. React Query fetches/caches server data.
2. Zustand holds UI state (selections, modals, form state).
3. Components consume both via hooks.

## 8. Testing

### Unit Tests (Vitest)

The project uses Vitest with Testing Library, MSW for API mocking, and fast-check for property-based testing.

```bash
# Run all unit tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

Coverage thresholds: 70% statements, 60% branches, 70% functions, 70% lines.

### E2E Tests (Playwright)

End-to-end tests use Playwright with a mock wallet layer to test all wallet-connected flows without a real browser extension.

#### Quick Start

```bash
# Install Playwright browsers (one-time)
npx playwright install chromium

# Run all wallet E2E tests
npm run test:e2e:wallet

# Run all E2E tests
npm run test:e2e
```

#### Running Tests

```bash
# Headed mode (see the browser)
npm run test:e2e:wallet:headed

# Debug mode (step through tests)
npm run test:e2e:wallet:debug

# Run a specific test by name
npx playwright test e2e/wallet-tests/walletFlows.spec.ts -g "should connect wallet"

# Run a specific suite
npx playwright test -g "Authentication Flows"

# List all tests without running
npx playwright test --project=wallet-ci --list

# Verbose output
npx playwright test --project=wallet-ci --reporter=list

# Generate and view HTML report
npx playwright test --project=wallet-ci
npx playwright show-report
```

#### Test Coverage (20 tests, 9 suites)

| Suite | Tests | What It Covers |
|-------|-------|----------------|
| Authentication Flows | 3 | Connect wallet, handle errors, persist state across reload |
| Transaction Signing | 3 | Sign transactions, sign messages, deterministic signatures |
| Staking Operations | 4 | Stake, unstake, balance queries, concurrent operations |
| Node Registration | 1 | Register new node |
| Attestation Submission | 1 | Submit attestation |
| Settings Management | 2 | Update and fetch settings |
| Account Switching | 2 | Switch accounts, clear cached data |
| Error Handling | 3 | Network errors, API errors, timeouts |
| Logout Flow | 1 | Clear session on logout |

Performance: full suite runs in ~45 seconds locally, ~90 seconds in CI with retries. Target: < 2 minutes.

#### Mock Wallet Architecture

The test suite injects a mock implementation of the Freighter wallet API:

```typescript
// Available on window.stellarWeb3 after injection
{
  isConnected: () => Promise<{ isConnected: boolean }>,
  getPublicKey: () => Promise<string>,
  signTransaction: (tx: string) => Promise<{ signedTx: string }>,
  signMessage: (message: string) => Promise<{ signature: string }>,
  getNetwork: () => Promise<'testnet' | 'public'>,
}
```

**Key files:**

| File | Purpose |
|------|---------|
| `e2e/wallet-tests/helpers/mockWallet.ts` | Mock Freighter API implementation |
| `e2e/wallet-tests/fixtures/walletAccounts.ts` | 5 pre-generated Stellar keypairs (Alice, Bob, Charlie, Diana, Eve) |
| `e2e/wallet-tests/fixtures/apiMocks.ts` | Reusable API mock responses |
| `e2e/wallet-tests/walletFlows.spec.ts` | Main test suite |

#### Writing New Tests

```typescript
import { test, expect } from '@playwright/test'
import { injectMockWallet, resetStores, setupAPIMocks } from './helpers/mockWallet'
import { DEFAULT_TEST_ACCOUNT } from './fixtures/walletAccounts'

test.describe('My New Feature', () => {
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page)
    await resetStores(page)
    await injectMockWallet(page, DEFAULT_TEST_ACCOUNT)
  })

  test('should do something', async ({ page }) => {
    await page.goto('/my-feature')
    await expect(page.locator('[data-testid="result"]')).toBeVisible()
  })
})
```

#### Mock Wallet Options

```typescript
interface MockWalletOptions {
  isConnected?: boolean          // Default: true
  network?: 'testnet' | 'public' // Default: 'testnet'
  simulateNetworkError?: boolean  // Default: false
}

await injectMockWallet(page, account, {
  isConnected: false,
  simulateNetworkError: true,
})
```

#### Testing with Multiple Accounts

```typescript
import { TEST_ACCOUNTS } from './fixtures/walletAccounts'

test('should switch accounts', async ({ page }) => {
  const [account1, account2] = TEST_ACCOUNTS
  await injectMockWallet(page, account1)
  await page.goto('/')

  // Simulate account switch via custom event
  await page.evaluate((publicKey) => {
    window.dispatchEvent(
      new CustomEvent('stellar-wallet:accountChange', {
        detail: { publicKey },
      })
    )
  }, account2.publicKey)

  await page.waitForTimeout(500) // Wait for debounce
})
```

#### Mocking Custom API Endpoints

```typescript
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/my-endpoint', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: 'mock data' }),
    })
  })
  await setupAPIMocks(page)
})
```

#### Testing Error Conditions

```typescript
test('should handle error', async ({ page }) => {
  await page.route('**/api/v1/staking/stake', (route) => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Insufficient balance' }),
    })
  })
  await injectMockWallet(page, DEFAULT_TEST_ACCOUNT)
  await page.goto('/staking')
  await expect(page.locator('text=Insufficient balance')).toBeVisible()
})
```

#### Best Practices

1. **Always reset state** -- call `resetStores(page)` in `beforeEach` to clear stores, localStorage, sessionStorage, and cookies.
2. **Wait for async operations** -- use `page.waitForTimeout(500)` for debounced account switches, `expect(...).toBeVisible()` for element readiness, and `page.waitForResponse(...)` for network requests.
3. **Use `data-testid` selectors** -- `page.locator('[data-testid="my-element"]')` is faster and more stable than CSS selectors.
4. **Test isolation** -- each test must be independent; never depend on another test's side effects.
5. **Inject mock before navigation** -- always call `injectMockWallet()` before `page.goto()`.

#### Troubleshooting

| Problem | Fix |
|---------|-----|
| Tests won't start | `npm ci && npx playwright install chromium` |
| Tests timeout | Increase timeout: `test.setTimeout(60000)` or run with `--workers=1` |
| Mock wallet not working | Ensure `injectMockWallet()` is called BEFORE `page.goto()` |
| API mocks not working | Use `**/api/v1/**` glob pattern, not `/api/v1/*` |
| Need to debug | Run with `DEBUG=pw:api` or use `--debug` flag for Playwright Inspector |

#### CI/CD Integration

Tests run automatically in CI via `.github/workflows/test.yml`:

```yaml
e2e-wallet-tests:
  runs-on: ubuntu-latest
  steps:
    - Install Dependencies
    - Install Playwright Browsers
    - Run: npx playwright test --project=wallet-ci
    - Upload Test Results (on failure)
```

CI configuration: retries = 2, workers = 1 (sequential), HTML reporter. Failed tests generate screenshots, videos, and trace files as GitHub Actions artifacts.

#### Generating New Test Accounts

```typescript
import { Keypair } from '@stellar/stellar-sdk'

const keypair = Keypair.random()
const newAccount = {
  displayName: 'NewUser',
  publicKey: keypair.publicKey(),
  secret: keypair.secret(),
}
```

Test accounts are for testing only. Never use in production or with real funds.

#### File Structure (E2E)

```
e2e/wallet-tests/
├── fixtures/
│   ├── walletAccounts.ts      # Test keypairs
│   └── apiMocks.ts            # Reusable mock responses
├── helpers/
│   └── mockWallet.ts          # Mock wallet implementation
├── scripts/
│   ├── generateTestAccounts.js
│   └── generateTestAccounts.ts
├── walletFlows.spec.ts        # Main test suite (20 tests)
├── README.md                  # Developer documentation
├── QUICK_START.md             # 30-second quick start
├── TEST_SUMMARY.md            # Coverage breakdown
└── VERIFICATION_CHECKLIST.md  # Pre-deployment checklist
```

## 9. Contributing

### Workflow

1. **Make changes** to the codebase.
2. **Run lint and tests** to ensure nothing broke:
   ```bash
   npm run lint
   npm run test:e2e:wallet
   ```
3. **Commit** -- all commits must be cryptographically signed (GPG or SSH keys).
4. **Push** to your fork.
5. **Create a pull request** -- CI will automatically run all tests.

For major structural changes, open an issue first to discuss your proposal.

### PR Template

Use the template at `.github/pull_request_template.md` when opening pull requests.

### Running Checks Before Push

```bash
# Full lint
npm run lint

# Unit tests
npm test

# E2E wallet tests
npm run test:e2e:wallet
```
