# VeriNode-Frontend

Next.js web application for the VeriNode Decentralized Savings Circle (ROSCA) protocol, offering an interface for circle participation, collateral staking, leniency voting, and quadratic governance.

## Key Features

- **Interactive Savings Circles** -- create, join, deposit, and view payout orders for ROSCA groups.
- **Collateral & Governance Hub** -- lock collateral, nominate safety buddies, submit/vote on leniency requests.
- **Quadratic Voting** -- propose and cast quadratic votes for large circle rule changes.
- **Wallet Integration** -- connect via Freighter, Lobstr, or Albedo for authentication, staking, and transactions.

## Tech Stack

Next.js (React) / TypeScript / Tailwind CSS / @stellar/stellar-sdk / Zustand / TanStack React Query

## Quick Start

```bash
git clone https://github.com/VeriNode-Labs/VeriNode-Frontend
cd VeriNode-Frontend
npm run setup:dev
npm run dev
```

## Documentation

**See [FRONTEND.md](FRONTEND.md)** for the complete frontend developer guide, including:

- Project structure and architecture
- Styling guide (Tailwind, theme system, color tokens)
- Component documentation
- State management patterns
- Testing guide (Vitest + Playwright E2E)
- Contributing workflow

## Contributing

Contributions are welcome. Ensure commits are cryptographically signed (GPG or SSH). For major changes, open an issue first. Run `npm run lint` and `npm run test:e2e:wallet` before submitting a pull request.
