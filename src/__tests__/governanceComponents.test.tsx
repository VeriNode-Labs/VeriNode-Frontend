// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as governanceProposalService from '@/src/services/governanceProposalService'
import { useGovernanceStore } from '@/src/store/governanceStore'
import { ProposalList } from '@/src/components/governance/ProposalList'
import { ProposalDetail } from '@/src/components/governance/ProposalDetail'
import { DelegateManager } from '@/src/components/governance/DelegateManager'
import { ProposalCreator } from '@/src/components/governance/ProposalCreator'
import { VoteHistoryTable } from '@/src/components/governance/VoteHistoryTable'
import GovernancePage from '../../app/governance/page'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useGovernanceStore.getState().resetStore()
  // DelegateManager/GovernancePage read delegate data through
  // governanceProposalService's localStorage-backed fetchDelegates(), a
  // separate data source from the Zustand governanceStore used by the other
  // components in this file. Clear it too so every test starts from that
  // service's known INITIAL_DELEGATES seed, regardless of run order.
  if (typeof window !== 'undefined') {
    localStorage.clear()
  }
})

// DelegateManager and GovernancePage (via GovernanceDashboard) read data through
// @tanstack/react-query hooks (useDelegates, useGovernanceMetrics), so they need
// a QueryClientProvider ancestor. Matches the convention already established in
// VotePanel.test.tsx. The other components in this file (ProposalList, etc.) read
// from the Zustand governanceStore directly and don't need this wrapper.
function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('ProposalList Component', () => {
  it('renders proposals with quorum and status badges', () => {
    render(<ProposalList />)

    expect(screen.getByTestId('proposal-list-container')).toBeTruthy()
    expect(screen.getByText('VIP-031: Liquidity Pool Incentive Program Season 3')).toBeTruthy()
    expect(screen.getByText('VIP-032: Quadratic Voting Pilot for Ecosystem Developer Grants')).toBeTruthy()
  })

  it('filters proposals when clicking status tabs', () => {
    render(<ProposalList />)

    const passedTab = screen.getByRole('tab', { name: /Passed/i })
    fireEvent.click(passedTab)

    expect(screen.getByText('VIP-029: Reduce Validator Slashing Penalty from 5% to 3%')).toBeTruthy()
    expect(screen.queryByText('VIP-031: Liquidity Pool Incentive Program Season 3')).toBeNull()
  })

  it('filters proposals by search input query', () => {
    render(<ProposalList />)

    const searchInput = screen.getByRole('searchbox')
    fireEvent.change(searchInput, { target: { value: 'Quadratic' } })

    expect(screen.getByText('VIP-032: Quadratic Voting Pilot for Ecosystem Developer Grants')).toBeTruthy()
    expect(screen.queryByText('VIP-031: Liquidity Pool Incentive Program Season 3')).toBeNull()
  })

  it('calls onSelectProposal callback when a proposal card is clicked', () => {
    const handleSelect = vi.fn()
    render(<ProposalList onSelectProposal={handleSelect} />)

    const card = screen.getByTestId('proposal-card-PROP-001')
    fireEvent.click(card)

    expect(handleSelect).toHaveBeenCalledWith('PROP-001')
    expect(useGovernanceStore.getState().selectedProposalId).toBe('PROP-001')
  })
})

describe('ProposalDetail Component', () => {
  it('renders proposal information, actions, and vote breakdown', () => {
    render(<ProposalDetail proposalId="PROP-001" />)

    expect(screen.getByTestId('proposal-detail-container')).toBeTruthy()
    expect(screen.getByText('VIP-031: Liquidity Pool Incentive Program Season 3')).toBeTruthy()
    expect(screen.getByText(/Proposed Actions & Parameters/i)).toBeTruthy()
    expect(screen.getByText(/transfer_treasury_funds/i)).toBeTruthy()
    expect(screen.getByText(/Current Vote Standing/i)).toBeTruthy()
  })

  it('allows selecting vote choice and submitting vote on active proposal', () => {
    render(<ProposalDetail proposalId="PROP-001" />)

    const againstButton = screen.getByRole('button', { name: /Against/i })
    fireEvent.click(againstButton)

    const submitButton = screen.getByRole('button', { name: /Submit Vote \(AGAINST\)/i })
    expect(submitButton).toBeTruthy()

    fireEvent.click(submitButton)

    expect(screen.getByText(/Vote successfully cast as "AGAINST"/i)).toBeTruthy()
  })

  it('displays quadratic weight reduction preview for quadratic proposals', () => {
    render(<ProposalDetail proposalId="PROP-002" />)

    expect(screen.getAllByText(/Quadratic/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Quadratic formula reduces whale influence/i)).toBeTruthy()
  })

  it('disables voting on closed proposals', () => {
    render(<ProposalDetail proposalId="PROP-003" />) // PROP-003 is 'passed'

    expect(screen.getByText(/Voting is closed for this proposal/i)).toBeTruthy()
  })
})

describe('DelegateManager Component', () => {
  it('renders community delegates and current self-voting status', async () => {
    renderWithQueryClient(<DelegateManager />)

    expect(screen.getByTestId('delegate-manager-container')).toBeTruthy()
    expect(screen.getByText('Self-Voting (No Active Delegation)')).toBeTruthy()

    // useDelegates() resolves asynchronously (React Query), so the delegate
    // directory starts empty on the first render - findByText waits for the
    // fetch to settle instead of asserting against the pre-load DOM.
    // Names come from governanceProposalService's INITIAL_DELEGATES seed -
    // the actual data source DelegateManager reads through useDelegates().
    // NOTE: this is a different dataset from the "Stellar Foundation Guild"
    // etc. delegates in the Zustand governanceStore that ProposalList /
    // ProposalDetail / VoteHistoryTable use - see the architectural finding
    // in the PR description.
    expect(await screen.findByText('Aura Validator Labs')).toBeTruthy()
    expect(screen.getByText('Soroban Whale Node')).toBeTruthy()
  })

  it('searches delegates by name or address', async () => {
    renderWithQueryClient(<DelegateManager />)

    // Wait for the delegate directory to load before filtering it, otherwise
    // the search input filters an empty list and the assertions below are
    // meaningless.
    await screen.findByText('Aura Validator Labs')

    const searchInput = screen.getByLabelText(/Search delegates/i)
    fireEvent.change(searchInput, { target: { value: 'Soroban Whale' } })

    expect(screen.getByText('Soroban Whale Node')).toBeTruthy()
    expect(screen.queryByText('Aura Validator Labs')).toBeNull()
  })

  it('delegates voting power to a delegate and allows revoking', async () => {
    renderWithQueryClient(<DelegateManager />)

    await screen.findByText('Aura Validator Labs')

    // The per-card "Delegate Power" button delegates directly (no confirm
    // step) - it calls handleDelegate() on click and shows the shared
    // txSuccess banner ("Transaction confirmed! Tx Hash: ...").
    const delegateButtons = screen.getAllByRole('button', { name: /Delegate Power/i })
    fireEvent.click(delegateButtons[0])

    expect(await screen.findByText(/Transaction confirmed/i)).toBeTruthy()
    expect(screen.getByText('Revoke Delegation')).toBeTruthy()

    // Revoke - "Revoke Delegation" opens a confirmation modal (restored
    // below; it was previously dead JSX, see the PR description), so
    // revocation itself needs the modal's "Confirm Revocation" click too.
    const revokeButton = screen.getByRole('button', { name: /Revoke Delegation/i })
    fireEvent.click(revokeButton)

    const confirmRevokeButton = screen.getByRole('button', { name: /Confirm Revocation/i })
    fireEvent.click(confirmRevokeButton)

    expect(await screen.findByText(/Transaction confirmed/i)).toBeTruthy()
    expect(screen.getByText('Self-Voting (No Active Delegation)')).toBeTruthy()
  })

  it('allows delegating to a custom address', async () => {
    renderWithQueryClient(<DelegateManager />)

    await screen.findByText('Aura Validator Labs')

    // "Delegate to Custom Address" opens a modal (restored below) containing
    // the labeled address input and its own "Delegate" confirm button.
    fireEvent.click(screen.getByRole('button', { name: /Delegate to Custom Address/i }))

    const customInput = screen.getByLabelText(/Custom delegate address/i)
    fireEvent.change(customInput, { target: { value: 'GBK8551D90901238472910481209381029381' } })

    const delegateCustomBtn = screen.getByRole('button', { name: /^Delegate$/i })
    fireEvent.click(delegateCustomBtn)

    expect(await screen.findByText(/Transaction confirmed/i)).toBeTruthy()
  })

  it('keeps the modal open and shows no false success message when delegation fails', async () => {
    const delegateSpy = vi
      .spyOn(governanceProposalService, 'delegateVotingPower')
      .mockRejectedValueOnce(new Error('Network error: delegation request failed'))

    renderWithQueryClient(<DelegateManager />)

    await screen.findByText('Aura Validator Labs')

    fireEvent.click(screen.getByRole('button', { name: /Delegate to Custom Address/i }))
    fireEvent.change(screen.getByLabelText(/Custom delegate address/i), {
      target: { value: 'GBK8551D90901238472910481209381029381' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Delegate$/i }))

    // DelegateManager's handleDelegate only closes the modal and shows
    // txSuccess on the success path - on a rejection it currently just
    // logs the error, so the modal (and the user's typed address) stays put
    // rather than silently vanishing along with the attempted delegation.
    await vi.waitFor(() => expect(delegateSpy).toHaveBeenCalled())
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByText(/Transaction confirmed/i)).toBeNull()

    delegateSpy.mockRestore()
  })
})

describe('ProposalCreator Component', () => {
  it('renders creation form and allows adding on-chain parameter actions', () => {
    render(<ProposalCreator />)

    expect(screen.getByTestId('proposal-creator-container')).toBeTruthy()
    expect(screen.getByText(/Proposal Deposit Requirement/i)).toBeTruthy()

    const addActionBtn = screen.getByRole('button', { name: /\+ Add Action/i })
    fireEvent.click(addActionBtn)

    expect(screen.getByText('Action #1')).toBeTruthy()

    const removeActionBtn = screen.getByRole('button', { name: /✕ Remove/i })
    fireEvent.click(removeActionBtn)

    expect(screen.queryByText('Action #1')).toBeNull()
  })

  it('validates required fields and creates a new proposal', () => {
    const handleCreated = vi.fn()
    render(<ProposalCreator onProposalCreated={handleCreated} />)

    const titleInput = screen.getByLabelText(/Proposal title/i)
    const descInput = screen.getByLabelText(/Proposal description/i)

    fireEvent.change(titleInput, { target: { value: 'VIP-050: Enhanced Bridge Rate Limiter' } })
    fireEvent.change(descInput, {
      target: {
        value: 'This proposal configures higher security margins and multi-tier volume checks for bridge operations.',
      },
    })

    const submitBtn = screen.getByRole('button', { name: /Submit Proposal/i })
    fireEvent.click(submitBtn)

    expect(screen.getByText(/successfully created and submitted/i)).toBeTruthy()
    expect(handleCreated).toHaveBeenCalled()
  })
})

describe('VoteHistoryTable Component', () => {
  it('renders past vote records with choice badges and gas costs', () => {
    render(<VoteHistoryTable />)

    expect(screen.getByTestId('vote-history-table-container')).toBeTruthy()
    expect(screen.getByText(/VIP-029: Reduce Validator Slashing Penalty from 5% to 3%/i)).toBeTruthy()
    expect(screen.getByText('0.0021 XLM')).toBeTruthy()
  })

  it('handles CSV export download', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test')
    const revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<VoteHistoryTable />)

    const exportBtn = screen.getByTestId('export-csv-button')
    fireEvent.click(exportBtn)

    expect(createObjectURLMock).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})

describe('GovernancePage Integration', () => {
  it('renders top metrics bar and switches between tabs', () => {
    renderWithQueryClient(<GovernancePage />)

    expect(screen.getByText('Governance Voting Dashboard')).toBeTruthy()
    expect(screen.getByText('Total VRN Locked')).toBeTruthy()
    expect(screen.getByText('Active Proposals')).toBeTruthy()
    expect(screen.getByText('Your Voting Power')).toBeTruthy()

    // Switch to Delegate Voting Power tab
    const delegateTab = screen.getByRole('button', { name: /Delegate Voting Power/i })
    fireEvent.click(delegateTab)
    expect(screen.getByTestId('delegate-manager-container')).toBeTruthy()

    // Switch to Create Proposal
    const createTab = screen.getByRole('button', { name: /Create Proposal/i })
    fireEvent.click(createTab)
    expect(screen.getByTestId('proposal-creator-container')).toBeTruthy()

    // Switch to Vote History
    const historyTab = screen.getByRole('button', { name: /My Vote History/i })
    fireEvent.click(historyTab)
    expect(screen.getByTestId('vote-history-table-container')).toBeTruthy()
  })
})
