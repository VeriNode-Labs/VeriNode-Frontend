// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VotePanel } from '../VotePanel';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { Proposal } from '@/src/types/governance';

// Mock useWallet
vi.mock('@/src/hooks/useWallet', () => ({
  useWallet: () => ({
    activeAccount: { publicKey: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F' },
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    walletType: 'freighter',
    providers: {},
    pendingAccountSwitch: false,
  }),
}));

afterEach(() => {
  cleanup();
});

const mockProposal: Proposal = {
  id: 'PROP-048',
  title: 'Adjust Validator Slashing Penalties',
  description: '### Summary\nProposal description details.',
  proposer: 'GBZXN7575BRDXVO6DHXRTPDGQ4VGL7ZJQU7TLNX4XQGNYV5OQ5R7P37F',
  status: 'active',
  type: 'quadratic',
  category: 'Parameters',
  forVotes: 1420,
  againstVotes: 310,
  abstainVotes: 65,
  forTokens: 485000,
  againstTokens: 96100,
  abstainTokens: 4225,
  totalVoters: 184,
  quorumPercentage: 4.0,
  currentQuorumPercentage: 5.85,
  quorumReached: true,
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 86400000).toISOString(),
  deposit: 500,
  actions: [],
  simulation: {
    success: true,
    gasEstimateGwei: 48500,
    gasEstimateUsd: 0.12,
    stateDiffs: [],
    logs: [],
    executionTimeMs: 40,
  },
  topVoters: [],
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('Governance UI Components', () => {
  describe('VotePanel', () => {
    it('renders vote choices and power calculation correctly', () => {
      renderWithQueryClient(<VotePanel proposal={mockProposal} />);

      expect(screen.getByText(/Cast Your Vote/i)).toBeDefined();
      expect(screen.getByText(/Vote FOR/i)).toBeDefined();
      expect(screen.getByText(/Vote AGAINST/i)).toBeDefined();
      expect(screen.getByText(/ABSTAIN/i)).toBeDefined();
      expect(screen.getByText(/Quadratic Formula/i)).toBeDefined();
    });

    it('selects voting choice and enables submit button', () => {
      renderWithQueryClient(<VotePanel proposal={mockProposal} />);

      const forBtn = screen.getByText(/Vote FOR/i);
      fireEvent.click(forBtn);

      const submitBtn = screen.getByRole('button', { name: /Submit Vote FOR/i });
      expect(submitBtn).toBeDefined();

      // Open confirmation modal
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Confirm Your Vote/i)).toBeDefined();
    });

    it('renders closed status message when proposal is not active', () => {
      const closedProposal: Proposal = {
        ...mockProposal,
        status: 'executed',
      };

      renderWithQueryClient(<VotePanel proposal={closedProposal} />);
      expect(screen.getByText(/Voting for this proposal is currently/i)).toBeDefined();
      expect(screen.getByText(/EXECUTED/i)).toBeDefined();
    });
  });

  describe('MarkdownRenderer', () => {
    it('renders headers, bold, code, alerts, and lists safely', () => {
      const markdown = `# Title
### Section 1
This is **bold** text and \`code\`.
> [!NOTE]
> Important note context.
- Bullet item 1
- Bullet item 2
`;
      render(<MarkdownRenderer content={markdown} />);
      expect(screen.getByText('Title')).toBeDefined();
      expect(screen.getByText('Section 1')).toBeDefined();
      expect(screen.getByText('bold')).toBeDefined();
      expect(screen.getByText('code')).toBeDefined();
      expect(screen.getByText(/Important note context/i)).toBeDefined();
      expect(screen.getByText('Bullet item 1')).toBeDefined();
      expect(screen.getByText('Bullet item 2')).toBeDefined();
    });
  });
});
