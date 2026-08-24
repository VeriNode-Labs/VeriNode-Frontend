/**
 * Validator Settings Page
 * 
 * Provides access to validator configuration including withdrawal credentials changes
 */

'use client';

import { useState, useEffect } from 'react';
import { WithdrawalChangeWizard } from '@/components/validators/WithdrawalChangeWizard';
import { useWithdrawalChange, useActiveRequestCount } from '@/hooks/useWithdrawalChange';
import { loadGovernanceConfig } from '@/services/governanceService';
import type { GovernanceConfig } from '@/types/withdrawalChange';

export default function ValidatorSettingsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [governanceConfig, setGovernanceConfig] = useState<GovernanceConfig | null>(null);
  const { requests, refreshRequests } = useWithdrawalChange();
  const activeRequestCount = useActiveRequestCount();

  useEffect(() => {
    // Load user's wallet address
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_requestAccounts' })
        .then((accounts) => {
          if (Array.isArray(accounts) && accounts.length > 0) {
            setUserAddress(accounts[0] as string);
          }
        })
        .catch(console.error);
    }

    // Load governance config
    loadGovernanceConfig().then(setGovernanceConfig);

    // Load existing requests
    refreshRequests();
  }, [refreshRequests]);

  const handleWizardComplete = () => {
    setShowWizard(false);
    refreshRequests();
  };

  const handleWizardCancel = () => {
    setShowWizard(false);
  };

  return (
    <main id="main-content" className="validator-settings-page" aria-label="Validator settings">
      <div className="page-header">
        <h1>Validator Settings</h1>
        <p className="page-description">
          Configure validator settings including withdrawal credentials
        </p>
      </div>

      <div className="settings-container">
        {/* Withdrawal Credentials Section */}
        <section className="settings-section">
          <div className="section-header">
            <h2>Withdrawal Credentials</h2>
            <button
              onClick={() => setShowWizard(true)}
              className="btn-primary"
              disabled={!userAddress}
            >
              Change Withdrawal Credentials
            </button>
          </div>

          <div className="section-content">
            <div className="info-box">
              <h3>About Withdrawal Credentials</h3>
              <p>
                Withdrawal credentials determine where validator rewards and principal can be withdrawn.
                Changing from BLS (0x00) to execution layer (0x01) credentials requires multi-signature
                approval for security.
              </p>

              {governanceConfig && (
                <div className="governance-info">
                  <strong>Governance Configuration:</strong>
                  <ul>
                    <li>Required approvals: {governanceConfig.threshold} of {governanceConfig.totalApprovers}</li>
                    <li>Approvers: {governanceConfig.approvers.length}</li>
                    <li>Request expiry: 7 days</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Active Requests */}
            <div className="active-requests">
              <h3>Active Requests ({activeRequestCount})</h3>
              {requests.length === 0 ? (
                <p className="no-requests">No requests yet</p>
              ) : (
                <div className="requests-list">
                  {requests.map((request) => (
                    <div key={request.id} className="request-item">
                      <div className="request-header">
                        <span className="validator-index">
                          Validator #{request.message.validatorIndex}
                        </span>
                        <span className={`status-badge status-${request.state}`}>
                          {request.state.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="request-details">
                        <div className="detail-row">
                          <span className="detail-label">To Address:</span>
                          <span className="detail-value">
                            {request.message.toExecutionAddress}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Signatures:</span>
                          <span className="detail-value">
                            {request.signatures.length} / {request.threshold}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Created:</span>
                          <span className="detail-value">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {request.state !== 'confirmed' && request.state !== 'failed' && (
                          <div className="detail-row">
                            <span className="detail-label">Expires:</span>
                            <span className="detail-value">
                              {new Date(request.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Other Settings Sections can be added here */}
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <div className="modal-overlay">
          <div className="modal-content">
            <WithdrawalChangeWizard
              onComplete={handleWizardComplete}
              onCancel={handleWizardCancel}
              userAddress={userAddress}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .validator-settings-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }

        .page-description {
          color: #666;
          margin: 0;
        }

        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-section {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #007bff;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .btn-primary {
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .section-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .info-box {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .info-box h3 {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
        }

        .info-box p {
          margin: 0 0 1rem 0;
          line-height: 1.6;
          color: #666;
        }

        .governance-info {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #dee2e6;
        }

        .governance-info ul {
          margin: 0.5rem 0 0 0;
          padding-left: 1.5rem;
        }

        .governance-info li {
          margin: 0.25rem 0;
        }

        .active-requests h3 {
          margin: 0 0 1rem 0;
        }

        .no-requests {
          color: #666;
          font-style: italic;
          text-align: center;
          padding: 2rem;
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .request-item {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1rem;
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .validator-index {
          font-weight: 600;
          font-size: 1.125rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-draft {
          background: #e9ecef;
          color: #495057;
        }

        .status-pending_approval {
          background: #fff3cd;
          color: #856404;
        }

        .status-approved {
          background: #d4edda;
          color: #155724;
        }

        .status-broadcast {
          background: #d1ecf1;
          color: #0c5460;
        }

        .status-confirmed {
          background: #d4edda;
          color: #155724;
        }

        .status-failed {
          background: #f8d7da;
          color: #721c24;
        }

        .status-expired {
          background: #e9ecef;
          color: #6c757d;
        }

        .request-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-row {
          display: flex;
          gap: 0.5rem;
        }

        .detail-label {
          font-weight: 500;
          min-width: 100px;
          color: #666;
        }

        .detail-value {
          color: #333;
          word-break: break-all;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
      `}</style>
    </main>
  );
}
