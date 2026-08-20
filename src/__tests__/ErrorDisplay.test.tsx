// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import { ErrorDisplay } from '../components/shared/ErrorDisplay';

describe('ErrorDisplay Component (VeriNode Issue #180)', () => {
  it('returns null when error is null or undefined', () => {
    const { container } = render(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders decoded error details from a raw string error', () => {
    render(<ErrorDisplay error="tx_bad_seq" />);
    expect(screen.getByText('Sequence Number Mismatch')).toBeDefined();
    expect(screen.getByText(/Your account's transaction sequence has moved ahead/i)).toBeDefined();
    expect(screen.getByText('Warning')).toBeDefined();
    expect(screen.getByText(/Refresh your browser or dashboard/i)).toBeDefined();
  });

  it('renders critical error badge for balance underfunded errors', () => {
    render(<ErrorDisplay error="op_underfunded" />);
    expect(screen.getByText('Insufficient Account Balance')).toBeDefined();
    expect(screen.getByText('Critical Error')).toBeDefined();
  });

  it('renders official docs link when available', () => {
    render(<ErrorDisplay error="op_no_trust" />);
    const link = screen.getByRole('link', { name: /Official Documentation/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toContain('trustlines');
  });

  it('calls onDismiss when close button is clicked', () => {
    const handleDismiss = vi.fn();
    render(<ErrorDisplay error="User declined transaction" onDismiss={handleDismiss} />);
    const dismissBtn = screen.getByRole('button', { name: /Dismiss error/i });
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry when retry button is clicked', () => {
    const handleRetry = vi.fn();
    render(<ErrorDisplay error="504 Gateway Timeout" onRetry={handleRetry} />);
    const retryBtn = screen.getByRole('button', { name: /Retry Transaction/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('toggles technical details accordion', () => {
    render(<ErrorDisplay error="ContractError(15)" />);
    expect(screen.queryByText(/Raw Code:/i)).toBeNull();

    const toggleBtn = screen.getByRole('button', { name: /View Technical Details/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Raw Code:/i)).toBeDefined();
    expect(screen.getAllByText(/ContractError\(15\)/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/Raw Code:/i)).toBeNull();
  });

  it('copies error details to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ErrorDisplay error="op_line_full" />);
    const copyBtn = screen.getByRole('button', { name: /Copy Error Details/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/✓ Copied Details/i)).toBeDefined();
  });
});
