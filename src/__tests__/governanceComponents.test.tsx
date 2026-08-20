// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
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
})

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
  it('renders community delegates and current self-voting status', () => {
    render(<DelegateManager />)

    expect(screen.getByTestId('delegate-manager-container')).toBeTruthy()
    expect(screen.getByText('Self-Voting Mode')).toBeTruthy()
    expect(screen.getByText('Stellar Foundation Guild')).toBeTruthy()
    expect(screen.getByText('VeriNode Core Devs DAO')).toBeTruthy()
  })

  it('searches delegates by name or address', () => {
    render(<DelegateManager />)

    const searchInput = screen.getByLabelText(/Search delegates/i)
    fireEvent.change(searchInput, { target: { value: 'Orbit Validator' } })

    expect(screen.getByText('Orbit Validator Alliance')).toBeTruthy()
    expect(screen.queryByText('Stellar Foundation Guild')).toBeNull()
  })

  it('delegates voting power to a delegate and allows revoking', () => {
    render(<DelegateManager />)

    const delegateButtons = screen.getAllByRole('button', { name: /Delegate Power/i })
    fireEvent.click(delegateButtons[0])

    expect(screen.getByText(/Successfully delegated/i)).toBeTruthy()
    expect(screen.getByText('Revoke Delegation')).toBeTruthy()

    // Revoke
    const revokeButton = screen.getByRole('button', { name: /Revoke Delegation/i })
    fireEvent.click(revokeButton)

    expect(screen.getByText(/Successfully revoked delegation/i)).toBeTruthy()
    expect(screen.getByText('Self-Voting Mode')).toBeTruthy()
  })

  it('allows delegating to a custom address', () => {
    render(<DelegateManager />)

    const customInput = screen.getByLabelText(/Custom delegate address/i)
    fireEvent.change(customInput, { target: { value: 'GBK8551D90901238472910481209381029381' } })

    const delegateCustomBtn = screen.getByRole('button', { name: /^Delegate$/i })
    fireEvent.click(delegateCustomBtn)

    expect(screen.getByText(/Successfully delegated/i)).toBeTruthy()
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
    render(<GovernancePage />)

    expect(screen.getByText('Governance Voting Dashboard')).toBeTruthy()
    expect(screen.getByText('Total Proposals')).toBeTruthy()
    expect(screen.getByText('Active Proposals')).toBeTruthy()
    expect(screen.getByText('Your Voting Power')).toBeTruthy()

    // Switch to Delegate Hub
    const delegateTab = screen.getByRole('button', { name: /Delegate Hub/i })
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
